import { SupabaseAdapter } from "@/lib/supabase-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import { logGeneral, logErrors } from "@/lib/logs";
import { createSecurityLog, createSecurityAlert } from "@/lib/logging-middleware";
import { trackLoginAttempt, isIPBlocked, getFailedAttemptsCount } from "@/lib/login-monitor";
import { triggerAdminLoginEvent } from "@/lib/realtime-alerts";

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
        console.log('🔍 [AUTH] Iniciando processo de autorização:', { email: credentials?.email });
        
        // Obter IP do cliente
        const ip = req?.headers?.['x-forwarded-for'] || 
                   req?.headers?.['x-real-ip'] || 
                   'unknown';
        const userAgent = req?.headers?.['user-agent'] || 'unknown';
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [AUTH] Credenciais incompletas');
          
          // Rastrear tentativa falhada
          await trackLoginAttempt({
            email: credentials?.email || 'unknown',
            ip: ip as string,
            success: false,
            timestamp: new Date(),
            userAgent: userAgent as string
          });
          
          await logGeneral('WARN', 'Tentativa de login com credenciais incompletas', 'Email ou password em falta', {
            action: 'login_incomplete_credentials',
            ip
          });
          return null;
        }

        // Verificar se IP está bloqueado
        if (await isIPBlocked(ip as string)) {
          console.log('🚫 [AUTH] IP bloqueado temporariamente');
          
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
          console.log(`⚠️ [AUTH] Múltiplas tentativas falhadas detectadas: ${failedCount}`);
        }

        try {
          console.log('🔍 [AUTH] Buscando utilizador na base de dados:', credentials.email);
          
          // Primeiro buscar o utilizador
          const { data: user, error: userError } = await (supabase as any)
            .from('User')
            .select('*')
            .eq('email', credentials.email)
            .single();

          console.log('🔍 [AUTH] Resultado da consulta do utilizador:', { user: user ? 'found' : 'not found', error: userError?.message });

          if (userError || !user) {
            console.log('❌ [AUTH] Utilizador não encontrado');
            
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

          console.log('🔍 [AUTH] Resultado da consulta de moderação:', { 
            moderation: userModeration ? 'found' : 'not found', 
            error: moderationError?.message 
          });

          console.log('🔍 [AUTH] Utilizador encontrado, verificando moderação');

          // Verificar se o utilizador está banido ou suspenso
          if (userModeration && (userModeration.status === 'BANNED' || userModeration.status === 'SUSPENDED')) {
            console.log('⚠️ [AUTH] Utilizador com status de moderação:', userModeration.status);
            
            // Verificar se a suspensão expirou
            if (userModeration.status === 'SUSPENDED' && userModeration.expiresAt && new Date(userModeration.expiresAt) < new Date()) {
              console.log('✅ [AUTH] Suspensão expirou, reativando utilizador');
              // Suspensão expirou, reativar utilizador
              await (supabase as any)
                .from('UserModeration')
                .update({ status: 'ACTIVE' })
                .eq('userId', user.id);
            } else {
              console.log('❌ [AUTH] Utilizador ainda está moderado');
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

          console.log('🔍 [AUTH] Verificando password');
          
          if (!user.passwordHash) {
            console.log('❌ [AUTH] Utilizador não tem password hash (possivelmente OAuth)');
            await logGeneral('WARN', 'Tentativa de login com credenciais em conta OAuth', 'Utilizador sem password hash', {
              userId: user.id,
              email: credentials.email,
              action: 'login_oauth_account_with_credentials'
            });
            return null;
          }

          const passwordMatch = bcrypt.compareSync(credentials.password, user.passwordHash);
          console.log('🔍 [AUTH] Password match:', passwordMatch);

          if (!passwordMatch) {
            console.log('❌ [AUTH] Password incorreta');
            
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

          console.log('✅ [AUTH] Password correta, autenticação bem-sucedida');

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
              ip: 'unknown' // será capturado pelo middleware
            }, user.role === 'ADMIN' ? 4 : 3);

            // Disparar alerta em tempo real com informações do contexto
            await triggerAdminLoginEvent(
              user.email,
              'unknown', // IP será capturado pelo middleware  
              'unknown', // User Agent será capturado pelo middleware
              undefined // Localização opcional
            );
          }

          await logGeneral('SUCCESS', 'Login realizado com sucesso', 'Utilizador autenticado', {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            action: 'login_success'
          });

          const userResult = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          };

          console.log('✅ [AUTH] Retornando utilizador:', { id: userResult.id, email: userResult.email });
          
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
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    
    async session({ session, token }) {
      try {
        if (token?.sub) {
          const { data: user } = await (supabase as any)
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
            
            // Log de criação de sessão para roles privilegiadas
            if (user.role === 'ADMIN' || user.role === 'REVIEWER') {
              await createSecurityLog('SESSION_CREATED', 'Sessão criada para utilizador privilegiado', {
                userId: user.id,
                email: user.email,
                role: user.role,
                sessionId: token.jti || 'unknown'
              }, user);
            }
          }
        }
        return session;
      } catch (error) {
        console.error('Erro no callback de sessão:', error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = String(user.id);
        token.role = user.role;
        token.picture = user.image; 
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      console.log('🔍 [AUTH] SignIn callback chamado:', { 
        provider: account?.provider, 
        userId: user?.id, 
        email: user?.email 
      });
      
      // Allow all sign-ins for credentials and OAuth
      if (account?.provider === 'credentials') {
        console.log('✅ [AUTH] Autenticação por credenciais aprovada');
        return true;
      }
      
      if (account?.provider === 'google') {
        try {
          // Check if user already exists
          const { data: existingUser } = await (supabase as any)
            .from('User')
            .select('*')
            .eq('email', user.email!)
            .single();

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

            // Update user info from Google if needed
            if (existingUser.name !== user.name || existingUser.image !== user.image) {
              await (supabase as any)
                .from('User')
                .update({
                  name: user.name,
                  image: user.image,
                  emailVerified: existingUser.emailVerified || new Date().toISOString()
                })
                .eq('id', existingUser.id);
            }

            await logGeneral('SUCCESS', 'Login OAuth realizado com sucesso', 
              'Utilizador existente autenticado via Google', {
              userId: existingUser.id,
              email: user.email,
              name: user.name,
              action: 'oauth_login_success'
            });

            // Log de segurança adicional para roles privilegiadas via OAuth
            if (existingUser.role === 'ADMIN' || existingUser.role === 'REVIEWER') {
              await createSecurityAlert('ADMIN_OAUTH_LOGIN', 'Login OAuth de administrador', {
                userId: existingUser.id,
                email: user.email,
                role: existingUser.role,
                provider: 'google'
              }, 3);

              // Trigger admin login alert
              await triggerAdminLoginEvent(
                'OAuth Login', 
                'Unknown IP', 
                'Google OAuth Provider', 
                JSON.stringify({
                  userId: existingUser.id,
                  email: user.email,
                  role: existingUser.role,
                  provider: 'google',
                  timestamp: new Date().toISOString()
                })
              );
            }
          } else {
            // New user via Google OAuth
            await logGeneral('INFO', 'Novo utilizador criado via OAuth', 
              'Nova conta criada através do Google', {
              email: user.email,
              name: user.name,
              action: 'oauth_new_user'
            });
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
