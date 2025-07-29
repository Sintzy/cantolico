import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner"
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Can♱ólico!",
    template: "%s | Can♱ólico!"
  },
  description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
  keywords: ["cânticos", "católicos", "liturgia", "música", "igreja", "cancioneiro", "acordes", "partituras"],
  authors: [{ name: "Can♱ólico!" }],
  openGraph: {
    title: "Can♱ólico!",
    description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
    type: "website",
    locale: "pt_PT",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (

    <html lang="pt">
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      </head>
      <body className={inter.className + " flex flex-col min-h-screen"}>
        <AuthSessionProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Toaster />
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
