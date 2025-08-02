import { type MetadataRoute } from 'next'
import { SITE_IMAGES, SITE_CONFIG } from '@/lib/site-images'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.name,
    short_name: SITE_CONFIG.shortName,
    description: SITE_CONFIG.description,
    start_url: SITE_CONFIG.startUrl,
    display: SITE_CONFIG.display,
    background_color: SITE_CONFIG.backgroundColor,
    theme_color: SITE_CONFIG.themeColor,
    orientation: SITE_CONFIG.orientation,
    scope: SITE_CONFIG.scope,
    icons: [
      {
        src: SITE_IMAGES.androidChrome192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: SITE_IMAGES.androidChrome512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: SITE_IMAGES.appleTouchIcon,
        sizes: '180x180',
        type: 'image/png'
      }
    ],
    categories: ['music', 'education', 'lifestyle'],
    lang: 'pt-PT',
    dir: 'ltr'
  }
}
