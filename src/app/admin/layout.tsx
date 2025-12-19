import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Área administrativa do Cantólico.",
  path: "/admin",
  index: false,
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
