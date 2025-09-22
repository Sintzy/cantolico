"use client";
import { useSession } from "next-auth/react";

export function UserInfo() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>A carregar sessão...</p>;
  if (!session) return <p>Não estás autenticado.</p>;

  return (
    <div>
      <p>Bem-vindo, {session.user.name} ({session.user.email})</p>
    </div>
  );
}
