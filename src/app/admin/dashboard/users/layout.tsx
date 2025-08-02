import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestão de Utilizadores",
  description: "Administrar utilizadores, roles e permissões no Cantólico!",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
