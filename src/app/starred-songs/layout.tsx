import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Músicas Favoritas - Cantólico',
  description: 'As tuas músicas favoritas no Cantólico',
};

export default function StarredSongsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}