import { RegisterForm } from "@/components/forms/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Criar Conta</h1>
      <RegisterForm />
    </main>
  );
}
