import BannerDisplay from '@/components/BannerDisplay';
import HomePageClient from './HomePageClient';
import { buildMetadata, buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Cantólico | Biblioteca de Cânticos Católicos',
  description: 'Plataforma gratuita para descobrir, organizar e partilhar cânticos católicos da lingua portuguesa.',
  path: '/',
  type: 'website',
});

export default function HomePage() {
  const websiteStructuredData = buildWebsiteJsonLd();
  const organizationStructuredData = buildOrganizationJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
      />
      <BannerDisplay page="HOME" />
      <main className="min-h-screen">
        <HomePageClient />
      </main>
    </>
  );
}