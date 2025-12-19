import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Playlists",
  description: "Explora playlists católicas organizadas por momentos litúrgicos e celebrações.",
  path: "/playlists",
  type: "website",
});

export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
