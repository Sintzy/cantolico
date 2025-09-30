import { generateStructuredData } from '@/lib/structured-data';
import { PAGE_METADATA } from '@/lib/metadata';
import BannerDisplay from '@/components/BannerDisplay';
import HomePageClient from './HomePageClient';

export const metadata = PAGE_METADATA.home();

export default function HomePage() {
  const websiteStructuredData = generateStructuredData({ type: 'website' });
  const organizationStructuredData = generateStructuredData({ type: 'organization' });

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