import { PAGE_METADATA } from "@/lib/metadata";

export const metadata = PAGE_METADATA.admin();

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
