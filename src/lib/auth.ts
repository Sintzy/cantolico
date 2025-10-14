import { SupabaseAdapter } from "@/lib/supabase-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { logAuthAction } from "@/lib/user-action-logger";
import { createSecurityLog, createSecurityAlert } from "@/lib/logging-middleware";
import { trackLoginAttempt, isIPBlocked, getFailedAttemptsCount } from "@/lib/login-monitor";
import { triggerAdminLoginEvent } from "@/lib/realtime-alerts";
import { sendWelcomeEmail, sendLoginAlert } from "@/lib/email";
import { getClientIP } from "@/lib/utils";
import { logGeneral, logErrors } from "@/lib/logs";

// Função para obter localização do IP
async function getLocationFromIP(ip: string): Promise<string> {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || !ip) {
    return 'Localização Local/VPN';
  }
  
  // Lista de serviços de geolocalização como fallback
  const geoServices = [
    {
      name: 'ip-api',
      url: `http://ip-api.com/json/${ip}?fields=country,regionName,city,status`,
      parse: (data: any) => {
        if (data.status === 'success') {
          return `${data.city || 'Cidade Desconhecida'}, ${data.regionName || 'Região'}, ${data.country || 'País'}`;
        }
        return null;
      }
    },
    {
      name: 'ipapi',
      url: `https://ipapi.co/${ip}/json/`,
      parse: (data: any) => {
        if (data.city && data.region && data.country_name) {
          return `${data.city}, ${data.region}, ${data.country_name}`;
        }
        return null;
      }
    },
    {
      name: 'ipgeolocation',
      url: `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`,
      parse: (data: any) => {
        if (data.city && data.state_prov && data.country_name) {
          return `${data.city}, ${data.state_prov}, ${data.country_name}`;
        }
        return null;
      }
    }
  ];

  // Tentar cada serviço sequencialmente
  for (const service of geoServices) {
    try {
      // Criar timeout manual para o fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
      
      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cantolico-App/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`⚠️ [GEOLOCATION] ${service.name} retornou status ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      const location = service.parse(data);
      if (location) {
        return location;
      }
    } catch (error) {
      console.error(`❌ [GEOLOCATION] Erro no ${service.name}:`, error);
      continue;
    }
  }

  // Se todos os serviços falharam, verificar se é IP privado
  if (isPrivateIP(ip)) {
    return 'Rede Local/Privada';
  }

  console.warn(`⚠️ [GEOLOCATION] Todos os serviços falharam para IP: ${ip}`);
  return 'Localização Indisponível';
}

// Função para verificar se é IP privado
function isPrivateIP(ip: string): boolean {
  if (!ip) return false;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  // 10.x.x.x
  if (parts[0] === 10) return true;
  
  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
}

export const authOptions: AuthOptions = {
  adapter: SupabaseAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {

        
        // Obter IP do cliente usando a nova função utilitária
        const ip = getClientIP(req?.headers) || 'unknown';
        const userAgent = req?.headers?.['user-agent'] || 'unknown';
        

        
        if (!credentials?.email || !credentials?.password) {

          
          // Rastrear tentativa falhada
          await trackLoginAttempt({
            email: credentials?.email || 'unknown',
            ip: ip as string,
            success: false,
            timestamp: new Date(),
            userAgent: userAgent as string
          });
          
          await logGeneral('WARN', 'Tentativa de login com credenciais incompletas', 'Email ou password em falta para login email/password', {
            action: 'login_incomplete_credentials',
            loginMethod: 'email_password',
            ipAddress: ip,
            userAgent: userAgent
          });
          return null;
        }

        // Verificar se IP está bloqueado
        if (await isIPBlocked(ip as string)) {

          
          await createSecurityAlert('BLOCKED_IP_ATTEMPT', 'Tentativa de login de IP bloqueado', {
            email: credentials.email,
            ip,
            userAgent
          }, 4);
          
          return null;
        }

        // Verificar número de tentativas falhadas recentes
        const failedCount = await getFailedAttemptsCount(credentials.email, ip as string);
        if (failedCount >= 3) {

        }

        try {

          
          // Primeiro buscar o utilizador
          const { data: user, error: userError } = await (supabase as any)
            .from('User')
            .select('*')
            .eq('email', credentials.email)
            .single();



          if (userError || !user) {

            
            // Rastrear tentativa falhada
            await trackLoginAttempt({
              email: credentials.email,
              ip: ip as string,
              success: false,
              timestamp: new Date(),
              userAgent: userAgent as string
            });
            
            await logGeneral('WARN', 'Tentativa de login com email não registado', 'Email não existe na base de dados', {
              email: credentials.email,
              action: 'login_email_not_found',
              ip
            });
            return null;
          }

          // Depois buscar dados de moderação separadamente
          const { data: userModeration, error: moderationError } = await (supabase as any)
            .from('UserModeration')
            .select('*')
            .eq('userId', user.id)
            .single();

          // Verificar se o utilizador está banido ou suspenso
          if (userModeration && (userModeration.status === 'BANNED' || userModeration.status === 'SUSPENDED')) {

            
            // Verificar se a suspensão expirou
            if (userModeration.status === 'SUSPENDED' && userModeration.expiresAt && new Date(userModeration.expiresAt) < new Date()) {

              // Suspensão expirou, reativar utilizador
              await (supabase as any)
                .from('UserModeration')
                .update({ status: 'ACTIVE' })
                .eq('userId', user.id);
            } else {

              await logGeneral('WARN', 'Tentativa de login de utilizador moderado', `Utilizador ${userModeration.status.toLowerCase()} a tentar login`, {
                userId: user.id,
                email: credentials.email,
                moderationStatus: userModeration.status,
                moderationReason: userModeration.reason,
                action: 'login_moderated_user'
              });
              throw new Error(`Conta ${userModeration.status === 'BANNED' ? 'banida' : 'suspensa'}. Motivo: ${userModeration.reason || 'Não especificado'}. Consulte o seu email para mais informações.`);
            }
          }


          
          if (!user.passwordHash) {
            await logGeneral('WARN', 'Tentativa de login com credenciais em conta OAuth', 'Utilizador sem password hash', {
              userId: user.id,
              email: credentials.email,
              action: 'login_oauth_account_with_credentials'
            });
            return null;
          }

          const passwordMatch = bcrypt.compareSync(credentials.password, user.passwordHash);

          if (!passwordMatch) {
            // Rastrear tentativa falhada
            await trackLoginAttempt({
              email: credentials.email,
              ip: ip as string,
              success: false,
              timestamp: new Date(),
              userAgent: userAgent as string
            });
            
            await logGeneral('WARN', 'Tentativa de login com password incorreta', 'Password não confere', {
              userId: user.id,
              email: credentials.email,
              action: 'login_wrong_password',
              ip
            });
            return null;
          }

          // Rastrear tentativa bem-sucedida
          await trackLoginAttempt({
            email: credentials.email,
            ip: ip as string,
            success: true,
            timestamp: new Date(),
            userAgent: userAgent as string
          });

          if(user.role === "ADMIN" || user.role === "REVIEWER") {
            await logGeneral('INFO', 'Tentativa de login com role privilegiada', 'Utilizador com role ADMIN ou REVIEWER a tentar login', {
              userId: user.id,
              email: user.email,
              action: 'login_privileged_role'
            });

            // Criar alerta de segurança para login de admin
            await createSecurityAlert('ADMIN_LOGIN', 'Login de administrador detectado', {
              userId: user.id,
              email: user.email,
              role: user.role,
              provider: 'credentials',
              ip: ip || 'unknown',
              userAgent: userAgent || 'unknown'
            }, user.role === 'ADMIN' ? 4 : 3);

            // Disparar alerta em tempo real com informações do contexto
            await triggerAdminLoginEvent(
              user.email,
              ip as string,
              userAgent as string,
              undefined // Localização será buscada na função triggerAdminLoginEvent
            );
          }

          await logGeneral('SUCCESS', 'Login realizado com sucesso', 'Utilizador autenticado via email/password', {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            loginMethod: 'email_password',
            isAdmin: user.role === 'ADMIN',
            isReviewer: user.role === 'REVIEWER',
            ipAddress: ip,
            userAgent: userAgent,
            action: 'login_success',
            entity: 'user_session'
          });

          // Enviar email de alerta de login
          try {
            const location = await getLocationFromIP(ip as string);
            await sendLoginAlert(
              user.name || 'Utilizador',
              user.email,
              ip as string,
              userAgent as string,
              location,
              user.role === 'ADMIN' || user.role === 'REVIEWER'
            );
          } catch (emailError) {
            console.error('❌ Erro ao enviar email de alerta de login:', emailError);
            // Não falhar o login se o email falhar
          }

          const userResult = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            emailVerified: user.emailVerified,
          };

          return userResult;
        } catch (error) {
          console.error('❌ [AUTH] Erro durante processo de login:', error);
          await logErrors('ERROR', 'Erro durante processo de login', 'Erro interno na autenticação', {
            email: credentials.email,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            action: 'login_error'
          });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/login',
    newUser: '/', // Redirect para home após registo OAuth
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    
    async session({ session, token }) {
      try {
        if (token?.sub) {
          const { data: user, error } = await (supabase as any)
            .from('User')
            .select('*')
            .eq('id', Number(token.sub))
            .single();
          
          if (token?.picture) {
            session.user.image = token.picture;
          }
          
          if (user && session.user) {
            (session.user as any).id = (user as any).id;
            (session.user as any).role = (user as any).role;
            (session.user as any).emailVerified = (user as any).emailVerified !== null;
          }
        } else {
        }
        
        return session;
      } catch (error) {
        console.error('❌ [SESSION] Erro no callback de sessão:', error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = String(user.id);
        token.role = user.role;
        token.picture = user.image;
        token.emailVerified = user.emailVerified !== null;
      }
      
      return token;
    },
    async signIn({ user, account, profile }) {
      // Allow all sign-ins for credentials and OAuth
      if (account?.provider === 'credentials') {
        return true;
      }
      
      if (account?.provider === 'google') {
        try {
          // Validar dados básicos do Google
          if (!user.email) {
            await logErrors('ERROR', 'OAuth Google sem email', 
              'Google OAuth retornou utilizador sem email', {
              userId: user.id,
              name: user.name,
              action: 'oauth_no_email_error'
            });
            return false;
          }

          // Check if user already exists
          const { data: existingUser, error: fetchError } = await (supabase as any)
            .from('User')
            .select('*')
            .eq('email', user.email!)
            .single();

          // Se houve erro na busca (diferente de "não encontrado")
          if (fetchError && fetchError.code !== 'PGRST116') {
            await logErrors('ERROR', 'Erro ao buscar utilizador OAuth', 
              'Erro na base de dados durante OAuth', {
              email: user.email,
              error: fetchError.message,
              action: 'oauth_db_fetch_error'
            });
            return false;
          }

          if (existingUser) {
            // Check moderation status separately
            const { data: userModeration } = await (supabase as any)
              .from('UserModeration')
              .select('*')
              .eq('userId', existingUser.id)
              .single();

            if (userModeration && 
                (userModeration.status === 'BANNED' || 
                 userModeration.status === 'SUSPENDED')) {
              
              // Check if suspension expired
              if (userModeration.status === 'SUSPENDED' && 
                  userModeration.expiresAt && 
                  new Date(userModeration.expiresAt) < new Date()) {
                // Reactivate user
                await (supabase as any)
                  .from('UserModeration')
                  .update({ status: 'ACTIVE' })
                  .eq('userId', existingUser.id);
              } else {
                // User is still banned/suspended
                await logGeneral('WARN', 'Tentativa de login OAuth de utilizador moderado', 
                  `Utilizador ${userModeration.status.toLowerCase()} a tentar login via Google`, {
                  userId: existingUser.id,
                  email: user.email,
                  moderationStatus: userModeration.status,
                  moderationReason: userModeration.reason,
                  action: 'oauth_login_moderated_user'
                });
                return false;
              }
            }

            // Update user info from Google if needed AND sempre garantir emailVerified para OAuth
            const updateData: any = {
              name: user.name,
              image: user.image,
              emailVerified: new Date().toISOString() // SEMPRE verificado para OAuth
            };

            await (supabase as any)
              .from('User')
              .update(updateData)
              .eq('id', existingUser.id);

            console.log(`✅ [OAUTH] Email auto-verificado para ${user.email}`);

            await logGeneral('SUCCESS', 'Login OAuth realizado com sucesso', 
              'Utilizador existente autenticado via Google OAuth', {
              userId: existingUser.id,
              email: user.email,
              name: user.name,
              role: existingUser.role,
              loginMethod: 'oauth_google',
              isAdmin: existingUser.role === 'ADMIN',
              isReviewer: existingUser.role === 'REVIEWER',
              provider: 'google',
              action: 'oauth_login_success',
              entity: 'user_session'
            });

            // Enviar email de alerta de login OAuth
            try {
              const location = await getLocationFromIP('unknown'); // IP não disponível em OAuth
              await sendLoginAlert(
                existingUser.name || 'Utilizador',
                existingUser.email,
                'unknown',
                'Google OAuth Provider',
                location,
                existingUser.role === 'ADMIN' || existingUser.role === 'REVIEWER'
              );
            } catch (emailError) {
              console.error('❌ Erro ao enviar email de alerta OAuth:', emailError);
              // Não falhar o login se o email falhar
            }

            // Log de segurança adicional para roles privilegiadas via OAuth
            if (existingUser.role === 'ADMIN' || existingUser.role === 'REVIEWER') {
              await createSecurityAlert('ADMIN_OAUTH_LOGIN', 'Login OAuth de administrador', {
                userId: existingUser.id,
                email: user.email,
                role: existingUser.role,
                provider: 'google',
                ip: '127.0.0.1', // IP padrão para OAuth (não disponível)
                userAgent: 'Google OAuth Provider'
              }, 3);

              // Trigger admin login alert
              await triggerAdminLoginEvent(
                user.email || '',
                '127.0.0.1', // IP padrão para OAuth 
                'Google OAuth Provider', 
                `Admin OAuth login - User ID: ${existingUser.id}, Role: ${existingUser.role}`
              );
            }
          } else {
            // New user via Google OAuth - será criado pelo adapter automaticamente
            console.log(`✅ [OAUTH] Novo utilizador será criado: ${user.email}`);
            
            await logGeneral('INFO', 'Novo utilizador criado via OAuth', 
              'Nova conta criada através do Google OAuth', {
              email: user.email,
              name: user.name,
              registrationMethod: 'oauth_google',
              provider: 'google',
              action: 'oauth_new_user',
              entity: 'user'
            });

            // O email de boas-vindas será enviado pelo adapter após criação
          }
          
          return true;
        } catch (error) {
          await logErrors('ERROR', 'Erro durante OAuth sign-in', 
            'Erro interno durante autenticação Google', {
            email: user.email,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            action: 'oauth_sign_in_error'
          });
          return false;
        }
      }
      
      return true;
    }
  },
};
