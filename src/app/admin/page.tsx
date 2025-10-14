import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
    return redirect("/login");
  }

  // Redirect based on user role
  if (session.user.role === "ADMIN") {
    return redirect("/admin/dashboard");
  } else if (session.user.role === "REVIEWER") {
    return redirect("/admin/review");
  }

  return redirect("/login");
}
