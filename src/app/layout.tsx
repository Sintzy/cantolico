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
    template: "Can♱ólico! | %s"
  },
  description: "Submete, edita e encontra cânticos católicos!",
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
