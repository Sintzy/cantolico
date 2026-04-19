"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMemo } from "react";

export function useSession() {
  const { user, isLoaded, isSignedIn } = useUser();

  const session = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user) return null;
    return {
      user: {
        id: (user.publicMetadata?.supabaseUserId as number) || 0,
        name: user.fullName || null,
        email: user.primaryEmailAddress?.emailAddress || null,
        image: user.imageUrl || null,
        role: (user.publicMetadata?.role as string) || "USER",
        emailVerified: user.primaryEmailAddress?.verification?.status === "verified",
      },
    };
  }, [user, isLoaded, isSignedIn]);

  if (!isLoaded) return { data: null, status: "loading" as const };
  if (!isSignedIn || !user) return { data: null, status: "unauthenticated" as const };
  return { data: session, status: "authenticated" as const };
}

export type SessionData = ReturnType<typeof useSession>["data"];

/**
 * Função de signOut compatível com NextAuth
 */
export function useSignOut() {
  const { signOut } = useClerk();
  return {
    signOut: (options?: { callbackUrl?: string; redirect?: boolean }) => {
      signOut({ redirectUrl: options?.callbackUrl || "/" });
    }
  };
}

// Export para compatibilidade com código que importa signOut diretamente
export function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  // Esta função será chamada em componentes client
  // Mas precisa do hook, então vamos usar window.location
  const redirectUrl = options?.callbackUrl || "/";
  window.location.href = `/sign-out?redirect_url=${encodeURIComponent(redirectUrl)}`;
}
