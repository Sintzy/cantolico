import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner"
import Footer from "@/components/Footer";
import AdminNotificationWrapper from "@/components/AdminNotificationWrapper";
import { SITE_IMAGES, SITE_CONFIG } from "@/lib/site-images";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.name,
    template: `%s | ${SITE_CONFIG.name}`
  },
  description: SITE_CONFIG.description,
  keywords: ["cânticos", "católicos", "liturgia", "música", "igreja", "cancioneiro", "acordes", "partituras", "missa", "oração"],
  authors: [{ name: SITE_CONFIG.name }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  
  // Favicon e ícones
  icons: {
    icon: [
      { url: SITE_IMAGES.favicon16, sizes: "16x16", type: "image/png" },
      { url: SITE_IMAGES.favicon32, sizes: "32x32", type: "image/png" },
      { url: SITE_IMAGES.faviconIco, type: "image/x-icon" }
    ],
    apple: [
      { url: SITE_IMAGES.appleTouchIcon, sizes: "180x180", type: "image/png" }
    ],
    other: [
      { rel: "android-chrome", url: SITE_IMAGES.androidChrome192, sizes: "192x192" },
      { rel: "android-chrome", url: SITE_IMAGES.androidChrome512, sizes: "512x512" }
    ]
  },

  // Manifest PWA
  manifest: "/manifest.json",
  
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
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    type: "website",
    locale: "pt_PT",
    url: "https://cantolico.pt",
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_IMAGES.ogImage,
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.description,
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    creator: "@cantolico",
    images: [SITE_IMAGES.twitterImage],
  },
  alternates: {
    canonical: "https://cantolico.pt",
  },
};

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.themeColor,
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Cantólico!",
              "description": "Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.",
              "url": "https://cantolico.pt",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://cantolico.pt/musics?search={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Cantólico!",
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
          <AdminNotificationWrapper />
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
