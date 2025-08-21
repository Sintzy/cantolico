import { PAGE_METADATA } from "@/lib/metadata";

export const metadata = PAGE_METADATA.createMusic();

export default function CreateMusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
