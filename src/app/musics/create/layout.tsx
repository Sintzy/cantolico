import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submeter Nova Música",
  description: "Submete o teu cântico católico para a comunidade do Cantólico!",
};

export default function CreateMusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
