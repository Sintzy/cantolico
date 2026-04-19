import { buildMetadata } from "@/lib/seo";
import { getAuthenticatedUser } from "@/lib/clerk-auth";
import { redirect } from "next/navigation";

export const metadata = buildMetadata({
  title: "Admin | Revisão",
  description: "Revisar e aprovar submissões de cânticos católicos.",
  path: "/admin/review",
  index: false,
});

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "REVIEWER")) {
    redirect("/");
  }
  return children;
}
