import { generateSearchSEO } from "@/lib/seo";

export const metadata = generateSearchSEO();

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
