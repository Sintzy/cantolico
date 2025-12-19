import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Submeter Música",
  description: "Submete um novo cântico para a comunidade Cantólico.",
  path: "/musics/create",
  index: false,
});

export default function CreateMusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
