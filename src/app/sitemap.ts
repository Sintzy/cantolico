import { MetadataRoute } from 'next'
import { adminSupabase } from '@/lib/supabase-admin'
import { SITE_URL } from '@/lib/seo'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/musics`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${base}/playlists`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/playlists/explore`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/musics/create`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ]

  try {
    const [{ data: songs }, { data: masses }] = await Promise.all([
      adminSupabase
        .from('Song')
        .select('slug, updatedAt, createdAt')
        .not('slug', 'is', null)
        .order('createdAt', { ascending: false }),
      adminSupabase
        .from('Mass')
        .select('id, updatedAt, createdAt')
        .eq('visibility', 'PUBLIC')
        .order('createdAt', { ascending: false }),
    ])

    const now = Date.now()
    const DAY_7 = 7 * 24 * 60 * 60 * 1000
    const DAY_30 = 30 * 24 * 60 * 60 * 1000

    const musicPages: MetadataRoute.Sitemap = (songs || []).map((song, index) => {
      const age = now - new Date(song.createdAt).getTime()
      let priority = Math.max(0.7, 0.9 - index * 0.005)
      if (age < DAY_7) priority = Math.min(0.99, priority + 0.25)
      else if (age < DAY_30) priority = Math.min(0.95, priority + 0.15)
      return {
        url: `${base}/musics/${song.slug}`,
        lastModified: new Date(song.updatedAt),
        changeFrequency: age < DAY_7 ? 'daily' : age < DAY_30 ? 'weekly' : 'monthly',
        priority: Math.round(priority * 100) / 100,
      }
    })

    const massPages: MetadataRoute.Sitemap = (masses || []).map(mass => ({
      url: `${base}/missas/${mass.id}`,
      lastModified: new Date(mass.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...musicPages, ...massPages]
  } catch {
    return staticPages
  }
}
