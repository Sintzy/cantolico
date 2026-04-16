import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Iniciar Sessão",
  description: "Entra na tua conta Cantólico para gerir cânticos e playlists.",
  path: "/sign-in",
  index: false,
});

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — decorative, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[420px] shrink-0 flex-col justify-between border-r border-stone-100 bg-stone-50 px-12 py-16">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={Icons.SITE_IMAGES.logo} alt="Cantólico" width={28} height={28} />
          <span className="text-base font-semibold text-stone-900 tracking-tight">
            Can<span className="text-rose-700">♱</span>ólico!
          </span>
        </Link>

        <div>
          <p className="font-display text-[2.6rem] leading-[1.1] text-stone-900">
            A música que<br />
            eleva a <em className="italic text-rose-700">alma.</em>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-stone-500 max-w-[280px]">
            Biblioteca colaborativa de cânticos católicos em português. Playlists, partituras e acordes — tudo num só lugar.
          </p>
        </div>

        <p className="text-xs font-medium text-stone-400 flex items-center gap-2">
          <span className="text-rose-700">✝</span>
          Qui bene cantat, bis orat
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-10 flex items-center gap-2.5">
          <Image src={Icons.SITE_IMAGES.logo} alt="Cantólico" width={24} height={24} />
          <span className="text-base font-semibold text-stone-900 tracking-tight">
            Can<span className="text-rose-700">♱</span>ólico!
          </span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-rose-700 text-sm">✝</span>
              <span className="h-px w-6 bg-stone-300" />
              <span className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Bem-vindo de volta</span>
            </div>
            <h1 className="font-display text-3xl text-stone-900">Entrar na conta</h1>
            <p className="mt-2 text-sm text-stone-500">
              Acede para continuares a explorar os cânticos.
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent p-0 w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                header: "hidden",
                formButtonPrimary:
                  "bg-stone-900 hover:bg-rose-700 transition-colors duration-200 text-white font-medium rounded-lg",
                socialButtonsBlockButton:
                  "border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg transition-colors",
                formFieldInput:
                  "border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400",
                formFieldLabel: "text-stone-700 text-sm font-medium",
                footerActionLink: "text-rose-700 hover:text-rose-800 font-medium",
                dividerLine: "bg-stone-200",
                dividerText: "text-stone-400 text-xs",
                identityPreviewText: "text-stone-700",
                formResendCodeLink: "text-rose-700",
              }
            }}
          />

          <p className="mt-8 text-center text-xs text-stone-400 space-x-1">
            <Link href="/terms" className="hover:text-stone-600 transition-colors">Termos de Serviço</Link>
            <span>·</span>
            <Link href="/privacy-policy" className="hover:text-stone-600 transition-colors">Privacidade</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
