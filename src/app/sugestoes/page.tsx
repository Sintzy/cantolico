import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import SuggestionsPageClient from './page.client';

export const metadata: Metadata = buildMetadata({
  title: 'Sugestões para a Missa',
  description: 'Encontre sugestões de cânticos para cada momento da Missa, orientadas pelo calendário litúrgico português.',
  path: '/sugestoes',
});

export default function SuggestionsPage() {
  return <SuggestionsPageClient />;
}
