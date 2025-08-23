import { LoginForm } from "@/components/forms/LoginForm";
import { PAGE_METADATA } from "@/lib/metadata";
import Link from "next/link";
import { Music } from "lucide-react";

export const metadata = PAGE_METADATA.login();

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Entrar na conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acede à tua conta para continuares
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Footer Links */}
        <div className="text-center text-sm text-muted-foreground">
          <Link href="/terms" className="text-primary hover:underline underline-offset-4">
            Termos de Serviço
          </Link>
          <span className="mx-2">•</span>
          <Link href="/privacy-policy" className="text-primary hover:underline underline-offset-4">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
