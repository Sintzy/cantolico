import { PAGE_METADATA } from "@/lib/metadata";

export const metadata = PAGE_METADATA.musics();

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
