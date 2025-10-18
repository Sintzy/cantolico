import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/', 
          '/api/', 
          '/auth/',
          '/banned/',
          '/logs/',
          '/*.pdf$',
          '/melhor-alternativa/'
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/musics/',
          '/musics/*',
          '/playlists/',
          '/playlists/explore/',
          '/terms/',
          '/privacy-policy/'
        ],
        disallow: [
          '/admin/', 
          '/api/', 
          '/auth/',
          '/banned/',
          '/logs/',
          '/melhor-alternativa/'
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/musics/',
          '/musics/*',
          '/playlists/',
          '/playlists/explore/'
        ],
        disallow: ['/admin/', '/api/', '/auth/'],
        crawlDelay: 2,
      }
    ],
    sitemap: 'https://cantolico.pt/sitemap.xml',
    host: 'https://cantolico.pt',
  }
}
