import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin | Músicas",
  description: "Administrar músicas, versões e conteúdo no Cantólico.",
  path: "/admin/dashboard/musics",
  index: false,
});

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
