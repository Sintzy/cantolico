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
import { Analytics } from "@vercel/analytics/next"

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
      <head />
      <body className={inter.className + " flex flex-col min-h-screen"}>
        <JsonLd />
        <CacheProvider>
          <AuthSessionProvider>
            <Navbar />
            <EmailVerificationBanner />
            <main className="flex-1">
              {children}
              <Analytics />
            </main>
            <Toaster />
            <Footer />
          </AuthSessionProvider>
        </CacheProvider>
      </body>
    </html>
  );
}