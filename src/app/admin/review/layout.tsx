import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin | Revisão",
  description: "Revisar e aprovar submissões de cânticos católicos.",
  path: "/admin/review",
  index: false,
});

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
