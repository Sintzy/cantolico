import { LoginForm } from "@/components/forms/LoginForm";
import { PAGE_METADATA } from "@/lib/metadata";
import Link from "next/link";
import { Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = PAGE_METADATA.login();

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[120px]" />
        </div>
        <div className="absolute bottom-0 right-0">
          <div className="h-60 w-60 rounded-full bg-gradient-to-tl from-purple-500/20 to-pink-500/20 blur-[100px]" />
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
              <div className="-mx-0.5 flex justify-center py-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Music className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
              Entrar na conta
            </h2>
            <p className="mt-4 text-sm text-gray-700">
              Acede à tua conta para continuares a explorar os cânticos
            </p>
          </div>

          {/* Login Form Card */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <LoginForm />
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-center text-sm text-gray-600 space-x-1">
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 transition-colors">
              Termos de Serviço
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 transition-colors">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
