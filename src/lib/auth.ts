import type { AuthOptions } from 'next-auth';
import { getAuthenticatedUser } from '@/lib/clerk-auth';

export type LegacySessionUser = {
  id: number;
  clerkUserId?: string;
  role?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
};

export type LegacySession = {
  user?: LegacySessionUser;
};

export const authOptions: AuthOptions = {
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session }) {
      return session;
    },
  },
};

export async function getClerkCompatibleSession(): Promise<LegacySession | null> {
  const user = await getAuthenticatedUser();

  if (!user) return null;

  return {
    user: {
      id: user.supabaseUserId,
      clerkUserId: user.clerkUserId,
      role: user.role,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  };
}
