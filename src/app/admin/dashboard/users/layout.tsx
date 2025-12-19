import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin | Utilizadores",
  description: "Administrar utilizadores, roles e permissões no Cantólico.",
  path: "/admin/dashboard/users",
  index: false,
});

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
