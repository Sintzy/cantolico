import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Playlists Católicas - Repertórios Selecionados",
  description: "Descubra playlists católicas organizadas por momentos litúrgicos, festividades e celebrações. Repertórios completos para missas, adoração e eventos especiais.",
  keywords: [
    "playlists catolicas", "playlists católicas",
    "repertorio catolico", "repertório católico", 
    "musicas missa", "músicas missa",
    "cancioneiro organizado", "seleção canticos",
    "playlist liturgica", "playlist litúrgica",
    "repertorio eucaristia", "musicas adoracao",
    "canticos organizados", "cânticos organizados"
  ],
  canonical: "/playlists",
  type: "website",
  section: "Playlists"
});

export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
