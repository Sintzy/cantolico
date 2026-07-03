import { Metadata } from "next";
import { cache } from "react";
import { adminSupabase } from "@/lib/supabase-admin";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { getLiturgicalMomentLabel } from "@/lib/constants";

interface MusicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const getSongForLayout = cache(async (id: string) => {
  const { data: songs } = await adminSupabase
    .from('Song')
    .select(`
      id,
      title,
      slug,
      tags,
      moments,
      author,
      createdAt,
      SongVersion!Song_currentVersionId_fkey (
        sourceText
      )
    `)
    .or(`id.eq.${id},slug.eq.${id}`)
    .limit(1);

  return songs?.[0] || null;
});

function stripChordsForSeo(text?: string | null) {
  if (!text) return "";

  return text
    .replace(/^#mic#\s*/i, "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^(?:\s*\[?[A-G][#b]?[^\]\s]*\]?\s*)+$/.test(line))
    .join(" ")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateDescription(text: string, maxLength = 155) {
  if (text.length <= maxLength) return text;

  const trimmed = text.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 80 ? lastSpace : trimmed.length).trim()}...`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const song = await getSongForLayout(id);

    if (!song?.slug) {
      return buildMetadata({
        title: "Música não encontrada",
        description: "Esta música não existe no nosso cancioneiro.",
        path: `/musics/${id}`,
        index: false,
      });
    }

    const moments = Array.isArray(song.moments) ? song.moments : [];
    const momentLabels = moments.map(m => getLiturgicalMomentLabel(m)).filter(Boolean);
    const songVersion = song.SongVersion as { sourceText?: string | null } | { sourceText?: string | null }[] | null;
    const sourceText = Array.isArray(songVersion)
      ? songVersion[0]?.sourceText
      : songVersion?.sourceText;
    const lyricExcerpt = truncateDescription(stripChordsForSeo(sourceText), 120);

    const descParts = [`${song.title} com letra e acordes`];
    if (song.author) descParts.push(`por ${song.author}`);
    if (momentLabels.length) descParts.push(`para ${momentLabels.join(', ')}`);
    descParts.push('em português');

    if (lyricExcerpt) descParts.push(`Letra: ${lyricExcerpt}`);

    return buildMetadata({
      title: `${song.title} | Letra e Acordes`,
      description: descParts.join(' ') + '.',
      path: `/musics/${song.slug}`,
      type: "article",
    });
  } catch {
    return buildMetadata({
      title: "Erro ao carregar música",
      description: "Ocorreu um erro ao carregar esta música.",
      path: `/musics/${id}`,
      index: false,
    });
  }
}

export default async function MusicLayout({ children, params }: MusicLayoutProps) {
  const { id } = await params;
  const song = await getSongForLayout(id);

  const jsonLd = song?.slug
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MusicComposition",
        name: song.title,
        composer: { "@type": "Person", name: song.author || "Tradicional" },
        genre: ["Música Católica", "Liturgia", "Sacred Music"],
        inLanguage: "pt-PT",
        url: absoluteUrl(`/musics/${song.slug}`),
        keywords: [
          song.title,
          `${song.title} letra`,
          `${song.title} acordes`,
          ...(Array.isArray(song.moments) ? song.moments.map(m => getLiturgicalMomentLabel(m)) : []),
          ...(song.tags || []),
          "cânticos católicos",
          "música litúrgica",
        ].join(", "),
        publisher: { "@type": "Organization", name: "Cantólico", url: absoluteUrl("/") },
        datePublished: song.createdAt,
        audience: { "@type": "Audience", audienceType: "Católicos" },
      })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {children}
    </>
  );
}
