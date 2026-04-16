import "./globals.css";
import "./globals-blur.css";
import type { Metadata, Viewport } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import Script from "next/script";
import AuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/Footer";
import { CacheProvider } from "@/components/providers/CacheProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { buildMetadata } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";

const instrumentSerif = Instrument_Serif({ subsets: ["latin"], variable: "--font-cormorant", weight: "400", style: ["normal","italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${instrumentSerif.variable} ${dmSans.variable}`}>
      <head />
      <body className={`${dmSans.className} flex flex-col min-h-screen antialiased`}>
        <Script
          defer
          src="https://truenas-scale.fold-pence.ts.net:8443/script.js"
          data-website-id="91110ae1-32f4-4053-906d-7d063d24d07e"
          strategy="afterInteractive"
        />
        <CacheProvider>
          <AuthSessionProvider>
            <Navbar />
            <div className="h-16" />
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