import BannerDisplay from '@/components/BannerDisplay';
import HomePageClient from './HomePageClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildMetadata, buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Cantólico | Biblioteca de Cânticos Católicos',
  description: 'Plataforma gratuita para descobrir, organizar e partilhar cânticos católicos em português.',
  path: '/',
  type: 'website',
});

export default async function HomePage() {
  const session = await getServerSession(authOptions);
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
        <HomePageClient hasUser={!!session?.user} />
      </main>
    </>
  );
}