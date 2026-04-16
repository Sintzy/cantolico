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
          '/missas/',
          '/missas/*',
          '/playlists/',
          '/playlists/explore/',
          '/terms/',
          '/privacy-policy/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/banned/',
          '/logs/',
          '/melhor-alternativa/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/musics/',
          '/musics/*',
          '/missas/',
          '/missas/*',
          '/playlists/',
          '/playlists/explore/',
        ],
        disallow: ['/admin/', '/api/', '/auth/'],
      }
    ],
    sitemap: 'https://cantolico.pt/sitemap.xml',
    host: 'https://cantolico.pt',
  }
}
