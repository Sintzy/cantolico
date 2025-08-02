/**
 * Structured Data (JSON-LD) helpers for SEO
 */

import { SITE_CONFIG, SITE_IMAGES } from './site-images';

export interface StructuredDataConfig {
  type: 'website' | 'song' | 'organization';
  title?: string;
  description?: string;
  url?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  content?: string;
}

export function generateStructuredData(config: StructuredDataConfig) {
  const baseUrl = 'https://cantolico.pt';
  
  const commonData = {
    '@context': 'https://schema.org',
    inLanguage: 'pt-PT',
  };

  switch (config.type) {
    case 'website':
      return {
        ...commonData,
        '@type': 'WebSite',
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        url: baseUrl,
        publisher: {
          '@type': 'Organization',
          name: SITE_CONFIG.name,
          url: baseUrl,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/musics?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    case 'song':
      return {
        ...commonData,
        '@type': 'MusicComposition',
        name: config.title,
        description: config.description,
        url: config.url,
        author: {
          '@type': 'Person',
          name: config.author || SITE_CONFIG.name,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_CONFIG.name,
          url: baseUrl,
        },
        genre: 'Religious Music',
        about: 'Catholic Hymn',
        keywords: config.keywords?.join(', '),
        ...(config.datePublished && { datePublished: config.datePublished }),
        ...(config.dateModified && { dateModified: config.dateModified }),
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_CONFIG.name,
          url: baseUrl,
        },
      };

    case 'organization':
      return {
        ...commonData,
        '@type': 'Organization',
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        url: baseUrl,
        logo: SITE_IMAGES.androidChrome512,
        sameAs: [
          // Add social media links here if available
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: ['pt-PT'],
        },
      };

    default:
      return null;
  }
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQ structured data
 */
export function generateFAQData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
