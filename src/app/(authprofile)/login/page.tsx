import { LoginForm } from "@/components/forms/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra na tua conta para submeter e gerir os teus cânticos católicos.",
};

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <LoginForm />
    </main>
  );
}
