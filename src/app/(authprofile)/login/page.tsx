import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <LoginForm />
    </main>
  );
}
