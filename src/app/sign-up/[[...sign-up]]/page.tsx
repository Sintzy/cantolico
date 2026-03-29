import { SignUp } from "@clerk/nextjs";
import { Music } from "lucide-react";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Criar Conta",
  description: "Cria a tua conta Cantólico para guardar favoritos e playlists.",
  path: "/sign-up",
  index: false,
});

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-80 w-80 rounded-full bg-linear-to-tr from-rose-500/20 to-amber-500/20 blur-[120px]" />
        </div>
        <div className="absolute bottom-0 left-0">
          <div className="h-60 w-60 rounded-full bg-linear-to-tr from-amber-500/20 to-orange-500/20 blur-[100px]" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1]">
              <div className="-mx-0.5 flex justify-center py-2">
                <div className="w-12 h-12 bg-linear-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Music className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] leading-tight">
              Criar conta
            </h2>
            <p className="mt-4 text-sm text-gray-700">
              Junta-te à comunidade Cantólico e contribui para a música litúrgica
            </p>
          </div>

          {/* Clerk SignUp Component */}
          <div className="flex justify-center">
            <SignUp
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
                  card: "shadow-xl bg-white/80 backdrop-blur-sm border-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "border border-gray-200 hover:bg-gray-50",
                  footerActionLink: "text-amber-600 hover:text-amber-700",
                }
              }}
            />
          </div>

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
