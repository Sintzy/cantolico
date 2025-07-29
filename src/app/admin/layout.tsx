import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração",
  description: "Painel de administração do Can♱ólico! - Gerir utilizadores, músicas e submissões.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
