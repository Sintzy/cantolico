import { Metadata } from "next";

export const SITE_NAME = "Cantólico";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cantolico.pt").replace(/\/$/, "");
export const DEFAULT_LOCALE = "pt_PT";
export const DEFAULT_OG_IMAGE = "/cantolicoemail.png";
export const DEFAULT_ICON = "/favicon.ico";
export const DEFAULT_APPLE_ICON = "/cantolicoemail.png";

export type SeoType = "website" | "article" | "profile" | "music.song";

export interface BuildMetadataOptions {
  title?: string;
  description: string;
  path?: string;
  type?: SeoType;
  index?: boolean;
  image?: string;
}

export const absoluteUrl = (path = "/") => {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatTitle = (title?: string) => {
  if (!title) return SITE_NAME;
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
};

export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const {
    title,
    description,
    path = "/",
    type = "website",
    index = true,
    image = DEFAULT_OG_IMAGE,
  } = options;

  const fullTitle = formatTitle(title);
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image);
  const icon = absoluteUrl(DEFAULT_ICON);
  const appleIcon = absoluteUrl(DEFAULT_APPLE_ICON);

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon,
      shortcut: icon,
      apple: appleIcon,
    },
  };
}
