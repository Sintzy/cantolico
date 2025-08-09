import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logGeneral, logErrors } from "@/lib/logs";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          await logGeneral('WARN', 'Tentativa de login com credenciais incompletas', 'Email ou password em falta', {
            action: 'login_incomplete_credentials'
          });
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              moderation: true
            }
          });

          if (!user) {
            await logGeneral('WARN', 'Tentativa de login com email não registado', 'Email não existe na base de dados', {
              email: credentials.email,
              action: 'login_email_not_found'
            });
            return null;
          }

          // Verificar se o utilizador está banido ou suspenso
          if (user.moderation && (user.moderation.status === 'BANNED' || user.moderation.status === 'SUSPENDED')) {
            // Verificar se a suspensão expirou
            if (user.moderation.status === 'SUSPENDED' && user.moderation.expiresAt && user.moderation.expiresAt < new Date()) {
              // Suspensão expirou, reativar utilizador
              await prisma.userModeration.update({
                where: { userId: user.id },
                data: { status: 'ACTIVE' }
              });
            } else {
              await logGeneral('WARN', 'Tentativa de login de utilizador moderado', `Utilizador ${user.moderation.status.toLowerCase()} a tentar login`, {
                userId: user.id,
                email: credentials.email,
                moderationStatus: user.moderation.status,
                moderationReason: user.moderation.reason,
                action: 'login_moderated_user'
              });
              throw new Error(`Conta ${user.moderation.status === 'BANNED' ? 'banida' : 'suspensa'}. Motivo: ${user.moderation.reason || 'Não especificado'}. Consulte o seu email para mais informações.`);
            }
          }

          if (!user.passwordHash || !bcrypt.compareSync(credentials.password, user.passwordHash)) {
            await logGeneral('WARN', 'Tentativa de login com password incorreta', 'Password não confere', {
              userId: user.id,
              email: credentials.email,
              action: 'login_wrong_password'
            });
            return null;
          }

          if(user.role === "ADMIN" || user.role === "REVIEWER") {
            await logGeneral('INFO', 'Tentativa de login com role privilegiada', 'Utilizador com role ADMIN ou REVIEWER a tentar login', {
              userId: user.id,
              email: user.email,
              action: 'login_privileged_role'
            });
          }

          await logGeneral('SUCCESS', 'Login realizado com sucesso', 'Utilizador autenticado', {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            action: 'login_success'
          });

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
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
  callbacks: {
    
    async session({ session, token }) {
      if (token?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: Number(token.sub) },
        });
        if (token?.picture) {
          session.user.image = token.picture; // <- adiciona imagem
        }
        if (user && session.user) {
          session.user.id = user.id;
          session.user.role = user.role;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = String(user.id);
        token.role = user.role;
        token.picture = user.image; 
      }
      return token;
    },
  },
};
