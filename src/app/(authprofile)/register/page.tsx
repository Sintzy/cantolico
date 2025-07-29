import { RegisterForm } from "@/components/forms/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar Conta",
  description: "Cria uma conta para submeter os teus cânticos católicos e contribuir para a comunidade.",
};

export default function RegisterPage() {
  return (
    <main className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Criar Conta</h1>
      <RegisterForm />
    </main>
  );
}
