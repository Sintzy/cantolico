import { RegisterForm } from "@/components/forms/RegisterForm";
import { Metadata } from "next";
import Link from "next/link";
import { Music } from "lucide-react";

export const metadata: Metadata = {
  title: "Criar Conta - Cantólico",
  description: "Cria uma conta para submeter os teus cânticos católicos e contribuir para a comunidade.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Criar conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Junte-se à comunidade Cantólico
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white shadow-sm border rounded-lg p-6 space-y-6">
          <RegisterForm />
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Já tem conta?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div>
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Entrar na conta existente
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-700 underline underline-offset-4">
            Termos de Serviço
          </Link>
          <span className="mx-2">•</span>
          <Link href="/privacy-policy" className="hover:text-gray-700 underline underline-offset-4">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
