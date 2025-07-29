import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestão de Músicas",
  description: "Administrar músicas, versões e conteúdo no Can♱ólico!",
};

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
