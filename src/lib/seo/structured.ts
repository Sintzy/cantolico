import { absoluteUrl, SITE_NAME } from "./base";

interface BreadcrumbItem {
  name: string;
  path: string;
}

export const buildWebsiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: absoluteUrl("/"),
});

export const buildOrganizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: absoluteUrl("/"),
  logo: absoluteUrl("/cantolicoemail.png"),
});

export const buildBreadcrumbJsonLd = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const buildSongJsonLd = ({
  title,
  slug,
  author,
  moments,
  tags,
}: {
  title: string;
  slug: string;
  author?: string;
  moments?: string[];
  tags?: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "MusicComposition",
  name: title,
  creator: author || "Tradicional",
  url: absoluteUrl(`/musics/${slug}`),
  inLanguage: "pt-PT",
  genre: ["Música Católica", "Liturgia"],
  keywords: [...(moments || []), ...(tags || [])].join(", "),
});

export const buildPlaylistJsonLd = ({
  name,
  id,
  description,
}: {
  name: string;
  id: string;
  description?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  description,
  url: absoluteUrl(`/playlists/${id}`),
});
