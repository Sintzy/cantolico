import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user && bcrypt.compareSync(credentials.password, user.passwordHash)) {
          return user;
        }

        return null;
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
