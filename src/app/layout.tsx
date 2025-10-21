import "./globals.css";
import "./globals-blur.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner"
import Footer from "@/components/Footer";
import { CacheProvider } from "@/components/providers/CacheProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import JsonLd from "@/components/JsonLd";
import { generateHomeSEO } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = generateHomeSEO();

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1343808891223374"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className + " flex flex-col min-h-screen"}>
        <JsonLd />
        <CacheProvider>
          <AuthSessionProvider>
            <Navbar />
            <EmailVerificationBanner />
            <main className="flex-1">
              {children}
            </main>
            <Toaster />
            <Footer />
          </AuthSessionProvider>
        </CacheProvider>
      </body>
    </html>
  );
}