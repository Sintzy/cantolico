import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminSupabase } from '@/lib/supabase-admin';
import {
  parsePositiveInteger,
  partnerApiError,
  partnerApiHeaders,
  withPartnerApiAuth,
} from '@/lib/partner-api';
import { LITURGICAL_MOMENTS } from '@/types/mass';

const songTypes = ['ACORDES', 'PARTITURA'] as const;
const instruments = ['ORGAO', 'GUITARRA', 'PIANO', 'CORO', 'OUTRO'] as const;

const songListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  moment: z.enum(LITURGICAL_MOMENTS).optional(),
  type: z.enum(songTypes).optional(),
  instrument: z.enum(instruments).optional(),
});

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function toSongSummary(song: any) {
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
  };
}

export async function GET(request: NextRequest) {
  const access = withPartnerApiAuth(request);
  if (access.error) return access.error;

  const { searchParams } = request.nextUrl;
  const page = parsePositiveInteger(searchParams.get('page'), 1, 10_000);
  const perPage = parsePositiveInteger(searchParams.get('per_page'), 25, 100);

  if (!page || !perPage) {
    return partnerApiError(
      'invalid_request',
      '`page` e `per_page` devem ser inteiros positivos (per_page até 100).',
      422,
    );
  }

  const queryInput = {
    q: searchParams.get('q') || undefined,
    moment: searchParams.get('moment') || undefined,
    type: searchParams.get('type') || undefined,
    instrument: searchParams.get('instrument') || undefined,
  };
  const parsedQuery = songListQuerySchema.safeParse(queryInput);
  if (!parsedQuery.success) {
    return partnerApiError(
      'invalid_request',
      'Um ou mais filtros não são válidos.',
      422,
      parsedQuery.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }

  const { q, moment, type, instrument } = parsedQuery.data;
  let query = adminSupabase
    .from('Song')
    .select('id,slug,title,author,type,mainInstrument,moments,tags,capo,createdAt,updatedAt', { count: 'exact' })
    .order('title', { ascending: true });

  if (q) query = query.ilike('title', `%${escapeLike(q)}%`);
  if (moment) query = query.contains('moments', [moment]);
  if (type) query = query.eq('type', type);
  if (instrument) query = query.eq('mainInstrument', instrument);

  const start = (page - 1) * perPage;
  const { data: songs, count, error } = await query.range(start, start + perPage - 1);
  if (error) {
    console.error('[PARTNER_API_SONGS]', error);
    return partnerApiError('internal_error', 'Não foi possível consultar o catálogo.', 500);
  }

  const total = count || 0;
  return NextResponse.json(
    {
      data: (songs || []).map(toSongSummary),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    },
    { headers: partnerApiHeaders(access.auth) },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
