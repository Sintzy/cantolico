import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Músicas",
  description: "Explora cânticos católicos com letras e acordes organizados por momentos litúrgicos.",
  path: "/musics",
  type: "website",
});

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
