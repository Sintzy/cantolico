import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cânticos Católicos",
  description: "Descobre e pesquisa cânticos católicos para a liturgia no Can♱ólico!",
};

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
