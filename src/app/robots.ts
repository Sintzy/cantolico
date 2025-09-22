import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/musics/', '/terms/', '/'],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://cantolico.pt/sitemap.xml',
  }
}
