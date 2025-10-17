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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Cantólico - Cânticos Católicos com Letras e Acordes",
    template: `%s | Cantólico`
  },
  description: "Biblioteca de cânticos católicos com letras, acordes e partituras. Encontra e partilha música litúrgica para a celebração eucarística.",
  keywords: [
    // Cânticos principais
    "cânticos católicos", "canticos catolicos", "cancioneiro católico", "cancioneiro catolico",
    "música católica", "musica catolica", "música liturgica", "musica liturgica",
    "letras cânticos católicos", "letras canticos catolicos", "acordes cânticos",
    
    // Cânticos específicos populares
    "Deus está aqui", "Deus esta aqui", "deus esta aqui cantico", "deus está aqui letra",
    "Aleluia", "aleluia cantico", "Gloria a Deus", "gloria a deus cantico",
    "Santo", "santo cantico", "Cordeiro de Deus", "cordeiro de deus cantico",
    "Ave Maria", "ave maria cantico", "Salve Rainha", "salve rainha cantico",
    
    // Competidores
    "musicristo", "musicristo canticos", "vitamina c canticos", "vitaminac",
    "melhor que musicristo", "alternativa musicristo", "melhor site canticos",
    
    // Termos gerais
    "cânticos missa", "canticos missa", "música igreja", "musica igreja",
    "partituras católicas", "partituras catolicas", "acordes igreja",
    "liturgia", "cancioneiro", "hinário", "hinario católico", "hinario catolico",
    
    // Eventos religiosos
    "cânticos natal", "canticos natal", "cânticos páscoa", "canticos pascoa",
    "cânticos quaresma", "canticos quaresma", "cânticos domingo",
    
    // Variações
    "cantolico", "cantólico", "cantolico.pt", "site cânticos grátis",
    "cânticos pdf", "canticos pdf", "cifras católicas", "cifras catolicas"
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
    description: "Biblioteca de cânticos católicos com letras, acordes e partituras. Encontra e partilha música litúrgica para a celebração eucarística.",
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
    description: "Biblioteca de cânticos católicos com letras, acordes e partituras.",
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
        {/* Ezoic Privacy Scripts - MUST load first for compliance */}
        <script src="https://cmp.gatekeeperconsent.com/min.js" data-cfasync="false"></script>
        <script src="https://the.gatekeeperconsent.com/cmp.min.js" data-cfasync="false"></script>
        
        {/* Ezoic Header Script - Main ad system initialization */}
        <script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.ezstandalone = window.ezstandalone || {};
              ezstandalone.cmd = ezstandalone.cmd || [];
            `
          }}
        />
        
        {/* Other scripts */}
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["WebSite", "MusicGroup", "Organization"],
              "name": "Cantólico - Cânticos Católicos",
              "alternateName": ["Cantolico", "Cantólico!", "Canticos Catolicos", "Cânticos Católicos Online"],
              "description": "A maior biblioteca de cânticos católicos online com letras, acordes e partituras grátis. Melhor que MusiCristo e VitaminaC.",
              "url": "https://cantolico.pt",
              "sameAs": [
                "https://instagram.com/cantolico",
                "https://github.com/sintzy/cantolico"
              ],
              "potentialAction": [
                {
                  "@type": "SearchAction",
                  "target": "https://cantolico.pt/musics?search={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              ],
              "publisher": {
                "@type": "Organization",
                "name": "Cantólico - Cânticos Católicos",
                "url": "https://cantolico.pt",
                "logo": "https://cantolico.pt/cantolicoemail.png"
              },
              "mainEntity": {
                "@type": "ItemList",
                "name": "Cânticos Católicos",
                "description": "Biblioteca completa de cânticos católicos com letras, acordes e partituras",
                "numberOfItems": "1000+"
              },
              "audience": {
                "@type": "Audience",
                "audienceType": ["Catholics", "Musicians", "Church Musicians", "Liturgy Teams", "Catolicos", "Musicos Igreja"]
              },
              "keywords": "cânticos católicos, canticos catolicos, música católica, letras cânticos, acordes igreja, partituras católicas, cancioneiro católico, liturgia, missa, Deus está aqui, Ave Maria, Santo, Gloria, Aleluia, musicristo alternativa, vitamina c alternativa"
            })
          }}
        />
      </head>
      <body className={inter.className + " flex flex-col min-h-screen"}>
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
