import { PAGE_METADATA } from "@/lib/metadata";

export const metadata = PAGE_METADATA.playlists();

export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
