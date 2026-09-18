import { z } from 'zod';
import { LITURGICAL_MOMENTS } from '@/types/mass';

export const SONG_TYPES = ['ACORDES', 'PARTITURA'] as const;
export const SONG_INSTRUMENTS = ['ORGAO', 'GUITARRA', 'PIANO', 'CORO', 'OUTRO'] as const;

const optionalUrl = z.string().url().max(2_000).nullable().optional();

export const songVersionSchema = z.object({
  source_text: z.string().max(200_000).optional(),
  lyrics: z.string().max(200_000).optional(),
  key_original: z.string().trim().max(20).nullable().optional(),
  media_url: optionalUrl,
  spotify_url: optionalUrl,
  youtube_url: optionalUrl,
}).strict();

const songFields = {
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  author: z.string().trim().max(200).nullable().optional(),
  type: z.enum(SONG_TYPES),
  main_instrument: z.enum(SONG_INSTRUMENTS),
  moments: z.array(z.enum(LITURGICAL_MOMENTS)).min(1).max(LITURGICAL_MOMENTS.length),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  capo: z.number().int().min(0).max(12).nullable().optional(),
  version: songVersionSchema.optional(),
};

export const createSongSchema = z.object(songFields).strict();
export const updateSongSchema = z.object({
  title: songFields.title.optional(),
  slug: songFields.slug,
  author: songFields.author,
  type: songFields.type.optional(),
  main_instrument: songFields.main_instrument.optional(),
  moments: songFields.moments.optional(),
  tags: songFields.tags.optional(),
  capo: songFields.capo,
  version: songVersionSchema,
}).strict().refine(input => Object.keys(input).length > 0, 'Indica pelo menos um campo para alterar.');

export function titleToApiSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toPartnerSong(song: any) {
  const version = Array.isArray(song.SongVersion) ? song.SongVersion[0] || null : song.SongVersion || null;
  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    author: song.author,
    type: song.type,
    main_instrument: song.mainInstrument,
    moments: song.moments || [],
    tags: song.tags || [],
    capo: song.capo,
    created_at: song.createdAt,
    updated_at: song.updatedAt,
    version: version
      ? {
          number: version.versionNumber,
          source_type: version.sourceType,
          source_text: version.sourceText,
          lyrics: version.lyricsPlain,
          key_original: version.keyOriginal,
          media_url: version.mediaUrl,
          spotify_url: version.spotifyLink,
          youtube_url: version.youtubeLink,
          approved_at: version.approvedAt,
          created_at: version.createdAt,
        }
      : null,
  };
}

export const partnerSongSelect = `
  id,
  slug,
  title,
  author,
  type,
  mainInstrument,
  moments,
  tags,
  capo,
  createdAt,
  updatedAt,
  SongVersion!Song_currentVersionId_fkey (
    id,
    versionNumber,
    sourceType,
    sourceText,
    lyricsPlain,
    keyOriginal,
    mediaUrl,
    spotifyLink,
    youtubeLink,
    approvedAt,
    createdAt
  )
`;
