import { SupabaseAdapter } from "@/lib/supabase-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { trackLoginAttempt, isIPBlocked, getFailedAttemptsCount } from "@/lib/login-monitor";
import { sendWelcomeEmail, sendLoginAlert } from "@/lib/email";
import { getClientIP } from "@/lib/utils";
import {
  logLoginSuccess,
  logLoginFailure,
  logLoginBlocked,
  logUserRegistered,
} from "@/lib/logging-helpers";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/types/logging";

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
        logger.warn(`Geolocation service ${service.name} returned error status`, {
          category: LogCategory.SYSTEM,
          network: {
            ip_address: ip,
            user_agent: 'Cantolico-App/1.0',
          },
          details: {
            service: service.name,
            status: response.status,
            endpoint: service.url,
          },
        });
        continue;
      }
      
      const data = await response.json();
      
      const location = service.parse(data);
      if (location) {
        return location;
      }
    } catch (error) {
      logger.error(`Geolocation service ${service.name} failed`, {
        category: LogCategory.SYSTEM,
        error: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        },
        network: {
          ip_address: ip,
        },
        details: {
          service: service.name,
          endpoint: service.url,
        },
      });
      continue;
    }
  }

  // Se todos os serviços falharam, verificar se é IP privado
  if (isPrivateIP(ip)) {
    return 'Rede Local/Privada';
  }

  logger.warn('All geolocation services failed', {
    category: LogCategory.SYSTEM,
    network: {
      ip_address: ip,
    },
  });
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
          
          logLoginFailure({
            user: { user_email: credentials?.email || 'unknown' },
            network: { ip_address: ip, user_agent: userAgent },
            provider: 'credentials',
            success: false,
            failure_reason: 'Incomplete credentials',
          });
          return null;
        }

        // Verificar se IP está bloqueado
        if (await isIPBlocked(ip as string)) {

          
          logLoginBlocked({
            user: { user_email: credentials.email },
            network: { ip_address: ip, user_agent: userAgent },
            provider: 'credentials',
            success: false,
            failure_reason: 'IP blocked due to multiple failed attempts',
          });
          
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
            
            logLoginFailure({
              user: { user_email: credentials.email },
              network: { ip_address: ip, user_agent: userAgent },
              provider: 'credentials',
              success: false,
              failure_reason: 'Email not found in database',
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

              logLoginBlocked({
                user: { 
                  user_id: user.id,
                  user_email: credentials.email,
                  user_role: user.role,
                },
                network: { ip_address: ip, user_agent: userAgent },
                provider: 'credentials',
                success: false,
                failure_reason: `User ${userModeration.status.toLowerCase()}: ${userModeration.reason || 'Not specified'}`,
              });
              throw new Error(`Conta ${userModeration.status === 'BANNED' ? 'banida' : 'suspensa'}. Motivo: ${userModeration.reason || 'Não especificado'}. Consulte o seu email para mais informações.`);
            }
          }


          
          if (!user.passwordHash) {
            logLoginFailure({
              user: { user_id: user.id, user_email: credentials.email },
              network: { ip_address: ip, user_agent: userAgent },
              provider: 'credentials',
              success: false,
              failure_reason: 'OAuth account attempted credentials login (no password hash)',
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
            
            logLoginFailure({
              user: { user_id: user.id, user_email: credentials.email },
              network: { ip_address: ip, user_agent: userAgent },
              provider: 'credentials',
              success: false,
              failure_reason: 'Incorrect password',
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
            logger.info('Privileged user login', {
              category: LogCategory.USER,
              user: {
                user_id: user.id,
                user_email: user.email,
                user_role: user.role,
              },
              network: { ip_address: ip, user_agent: userAgent },
              tags: ['privileged', 'admin', 'reviewer'],
            });
          }

          // Log successful credentials login
          logLoginSuccess({
            user: {
              user_id: user.id,
              user_email: user.email,
              user_name: user.name || undefined,
              user_role: user.role,
            },
            network: { ip_address: ip, user_agent: userAgent },
            provider: 'credentials',
            success: true,
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
            logger.error('Failed to send login alert email', {
              category: LogCategory.EMAIL,
              user: { user_email: user.email },
              error: {
                error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
                error_type: emailError instanceof Error ? emailError.constructor.name : 'Unknown',
              },
            });
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
          logger.error('Error during login process', {
            category: LogCategory.USER,
            user: { user_email: credentials.email },
            network: { ip_address: ip, user_agent: userAgent },
            error: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
              stack_trace: error instanceof Error ? error.stack : undefined,
            },
          });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 5 * 60, // 5 minutos - atualiza mais frequentemente para sincronizar mudanças de role
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
        }
        
        return session;
      } catch (error) {
        logger.error('Error in session callback', {
          category: LogCategory.USER,
          error: {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          },
        });
        return session;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Dados do login inicial
        token.sub = String(user.id);
        token.role = user.role;
        token.picture = user.image;
        token.emailVerified = user.emailVerified !== null;
      } else if (token?.sub) {
        // Buscar dados atualizados da BD durante atualizações do token
        try {
          const { data: currentUser, error } = await (supabase as any)
            .from('User')
            .select('role, emailVerified, image')
            .eq('id', Number(token.sub))
            .single();
            
          if (!error && currentUser) {
            token.role = currentUser.role;
            token.emailVerified = currentUser.emailVerified !== null;
            token.picture = currentUser.image || token.picture;
          }
        } catch (error) {
          logger.error('Error updating JWT token', {
            category: LogCategory.USER,
            user: { user_id: token.sub },
            error: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
            },
          });
          // Manter token existente em caso de erro
        }
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
            logger.error('Google OAuth returned user without email', {
              category: LogCategory.USER,
              user: { user_name: user.name || undefined },
              tags: ['oauth', 'google', 'validation-error'],
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
            logger.error('Database error during OAuth user fetch', {
              category: LogCategory.DATABASE,
              user: { user_email: user.email },
              error: {
                error_message: fetchError.message,
                error_code: fetchError.code,
              },
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
                logLoginBlocked({
                  user: {
                    user_id: existingUser.id,
                    user_email: user.email,
                    user_role: existingUser.role,
                  },
                  network: { ip_address: 'unknown', user_agent: 'Google OAuth' },
                  provider: 'google',
                  success: false,
                  failure_reason: `User ${userModeration.status.toLowerCase()}: ${userModeration.reason || 'Not specified'}`,
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

            logger.info('Email auto-verified for OAuth user', {
              category: LogCategory.USER,
              user: { user_email: user.email },
            });

            // Log successful OAuth login
            logLoginSuccess({
              user: {
                user_id: existingUser.id,
                user_email: user.email,
                user_name: user.name || undefined,
                user_role: existingUser.role,
              },
              network: { ip_address: 'unknown', user_agent: 'Google OAuth' },
              provider: 'google',
              success: true,
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
              logger.error('Failed to send OAuth login alert email', {
                category: LogCategory.EMAIL,
                user: { user_email: existingUser.email },
                error: {
                  error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
                },
              });
              // Não falhar o login se o email falhar
            }

            // Log apenas para auditoria interna para roles privilegiadas via OAuth
            if (existingUser.role === 'ADMIN' || existingUser.role === 'REVIEWER') {
              logger.info('Privileged user OAuth login', {
                category: LogCategory.USER,
                user: {
                  user_id: existingUser.id,
                  user_email: user.email,
                  user_role: existingUser.role,
                },
                network: { ip_address: 'unknown', user_agent: 'Google OAuth' },
                tags: ['privileged', 'oauth', 'google'],
              });
            }
          } else {
            // New user via Google OAuth - será criado pelo adapter automaticamente
            logger.info('New user will be created via OAuth', {
              category: LogCategory.USER,
              user: { user_email: user.email },
              tags: ['oauth', 'google', 'new-user'],
            });
            
            // Log new user registration via OAuth
            logUserRegistered({
              user: {
                user_email: user.email,
                user_name: user.name || undefined,
              },
              network: { ip_address: 'unknown', user_agent: 'Google OAuth' },
              registration_method: 'oauth_google',
            });

            // O email de boas-vindas será enviado pelo adapter após criação
          }
          
          return true;
        } catch (error) {
          logger.error('Error during OAuth sign-in', {
            category: LogCategory.USER,
            user: { user_email: user.email || undefined },
            error: {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              error_type: error instanceof Error ? error.constructor.name : 'Unknown',
            },
          });
          return false;
        }
      }
      
      return true;
    }
  },
};
