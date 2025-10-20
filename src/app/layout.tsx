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
import { SITE_IMAGES, SITE_CONFIG } from "@/lib/site-images";
import JsonLd from "@/components/JsonLd";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Cantólico - Cânticos Católicos com Letras e Acordes",
    template: `%s | Cantólico`
  },
  description: "Biblioteca completa de cânticos católicos com letras, acordes e partituras gratuitas. Colecção de música litúrgica para missa, celebrações e liturgia católica.",
  keywords: [
    // Pesquisas principais (alta prioridade)
    "lista canticos catolicos", "lista cânticos católicos", "canticos catolicos online",
    "cânticos católicos gratis", "canticos catolicos gratis", "biblioteca canticos catolicos",
    "cancioneiro catolico online", "cancioneiro católico online", "hinario catolico online",
    
    // Pesquisas funcionais
    "letras canticos catolicos", "letras cânticos católicos", "acordes canticos catolicos", 
    "acordes cânticos católicos", "partituras canticos catolicos", "partituras cânticos católicos",
    "cifras canticos igreja", "cifras cânticos igreja", "musicas catolicas online",
    
    // Cânticos específicos populares (SEO long-tail)
    "deus esta aqui letra", "deus esta aqui acordes", "aleluia cantico letra",
    "gloria a deus nas alturas letra", "santo cantico letra", "cordeiro de deus letra",
    "ave maria cantico letra", "salve rainha letra", "vem espirito santo letra",
    
    // Contexto litúrgico
    "canticos missa online", "cânticos missa online", "musica liturgica online",
    "música litúrgica online", "canticos entrada missa", "canticos comunhao",
    "canticos ofertorio", "canticos final missa", "liturgia canticos",
    
    // Eventos religiosos
    "canticos natal portugueses", "cânticos natal portugueses", "canticos pascoa",
    "canticos quaresma", "canticos domingo ramos", "canticos pentecostes",
    
    // Termos marca e locais
    "cantolico", "cantólico", "cantolico.pt", "cantolico portugal",
    "canticos catolicos portugal", "cânticos católicos portugal", "hinario portugal"
  ],
  authors: [{ name: "Cantólico - Cânticos Católicos" }],
  creator: "Cantólico - A maior biblioteca de cânticos católicos",
  publisher: "Cantólico - Cânticos Católicos Online",
  
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
    title: "Cantólico - Cânticos Católicos com Letras e Acordes",
    description: "Biblioteca completa de cânticos católicos com letras, acordes e partituras gratuitas. Colecção de música litúrgica para celebrações católicas.",
    type: "website",
    locale: "pt_PT",
    url: "https://cantolico.pt",
    siteName: "Cantólico",
    images: [
      {
        url: SITE_IMAGES.ogImage,
        width: 1200,
        height: 630,
        alt: "Cantólico - Cânticos católicos com letras, acordes e partituras",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cantólico - Cânticos Católicos",
    description: "Biblioteca completa de cânticos católicos com letras, acordes e partituras gratuitas.",
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
        {/* Scripts */}
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        {/* Google AdSense Script */}
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
