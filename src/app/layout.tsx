import "./globals.css";
import "./globals-blur.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import AuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/Footer";
import { CacheProvider } from "@/components/providers/CacheProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { buildMetadata } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = buildMetadata({
  title: "Cantólico",
  description: "Biblioteca de cânticos católicos com letras, acordes e partituras em português.",
  path: "/",
  type: "website",
});

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
        <Script
          defer
          src="http://100.99.107.118:3005/script.js"
          data-website-id="e097d855-5f02-4611-b188-a4f3d72bafd0"
          strategy="afterInteractive"
        />
        <CacheProvider>
          <AuthSessionProvider>
            <Navbar />
            {/* Spacer for floating navbar */}
            <div className="h-16"></div>
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