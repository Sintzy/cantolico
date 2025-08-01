import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autenticação",
  description: "Entra ou cria conta no Cantólico! para partilhar cânticos católicos.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
