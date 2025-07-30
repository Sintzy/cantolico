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
    default: "Cantólico!",
    template: "%s | Cantólico!"
  },
  description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
  keywords: ["cânticos", "católicos", "liturgia", "música", "igreja", "cancioneiro", "acordes", "partituras", "missa", "oração"],
  authors: [{ name: "Can♱ólico!" }],
  creator: "Cantólico!",
  publisher: "Cantólico!",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code-here', // Substituir pelo código real
  },
  openGraph: {
    title: "Cantólico!",
    description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
    type: "website",
    locale: "pt_PT",
    url: "https://cantolico.pt",
    siteName: "Can♱ólico!",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cantólico!",
    description: "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
    creator: "@cantolico",
  },
  alternates: {
    canonical: "https://cantolico.pt",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (

    <html lang="pt">
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Can♱ólico!",
              "description": "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
              "url": "https://cantolico.pt",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://cantolico.pt/musics?search={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Can♱ólico!",
                "url": "https://cantolico.pt"
              }
            })
          }}
        />
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
