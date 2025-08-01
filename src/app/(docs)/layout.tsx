import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação",
  description: "Guias e informações sobre como usar o Cantólico! - Cancioneiro católico colaborativo.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
