import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return redirect("/login");
  }

  return (
    <main>
      <h1>Área de Administração</h1>
      <p>Bem-vindo, {session.user.name}!</p>
    </main>
  );
}
