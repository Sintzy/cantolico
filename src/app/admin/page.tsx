import { getAuthenticatedUser } from "@/lib/clerk-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "REVIEWER")) {
    return redirect("/sign-in");
  }

  if (user.role === "ADMIN") {
    return redirect("/admin/dashboard");
  }

  return redirect("/admin/review");
}
