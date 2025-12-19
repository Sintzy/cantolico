import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Músicas Favoritas',
  description: 'As tuas músicas favoritas no Cantólico.',
  path: '/starred-songs',
  index: false,
});

export default function StarredSongsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}