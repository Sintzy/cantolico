import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin | Dashboard",
  description: "Dashboard de administração do Cantólico.",
  path: "/admin/dashboard",
  index: false,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
