import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Documentação",
  description: "Guias e informações para usar o Cantólico.",
  path: "/docs",
  type: "article",
});

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
