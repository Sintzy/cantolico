import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { parsePositiveInteger, partnerApiError, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';
import { createSongSchema, partnerSongSelect, titleToApiSlug, toPartnerSong } from '@/lib/partner-api-songs';

function validationError(error: { issues: Array<{ path: PropertyKey[]; message: string; code: string }> }) {
  return partnerApiError(
    'invalid_request',
    'O corpo do pedido não é válido.',
    422,
    error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message, code: issue.code })),
  );
}

async function getApiActorId() {
  const configuredId = Number.parseInt(process.env.CANTOLICO_API_ACTOR_USER_ID || '', 10);
  if (!Number.isInteger(configuredId) || configuredId < 1) return null;

  const { data: actor, error } = await adminSupabase
    .from('User')
    .select('id, role')
    .eq('id', configuredId)
    .maybeSingle();

  if (error || !actor || actor.role !== 'ADMIN') return null;
  return actor.id;
}

async function uniqueSlug(title: string, requestedSlug?: string) {
  const base = requestedSlug || titleToApiSlug(title);
  if (!base) return null;

  if (requestedSlug) {
    const { data, error } = await adminSupabase.from('Song').select('id').eq('slug', base).maybeSingle();
    if (error) throw error;
    return data ? undefined : base;
  }

  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    const { data, error } = await adminSupabase.from('Song').select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }

  throw new Error('Não foi possível gerar uma slug única.');
}

async function auditApiMutation(actorId: number, apiKeyName: string, action: string, entityId: string, metadata: Record<string, unknown>) {
  const { error } = await adminSupabase.from('AuditLog').insert({
    userId: actorId,
    action,
    entity: 'Song',
    entityId,
    metadata: { api_key_name: apiKeyName, ...metadata },
  });

  if (error) console.error('[PARTNER_API_AUDIT]', error);
}

export async function GET(request: NextRequest) {
  const access = withPartnerApiAuth(request, 'songs:write');
  if (access.error) return access.error;

  const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1, 10_000);
  const perPage = parsePositiveInteger(request.nextUrl.searchParams.get('per_page'), 25, 100);
  if (!page || !perPage) {
    return partnerApiError('invalid_request', '`page` e `per_page` devem ser inteiros positivos (per_page até 100).', 422);
  }

  const start = (page - 1) * perPage;
  const { data, count, error } = await adminSupabase
    .from('Song')
    .select(partnerSongSelect, { count: 'exact' })
    .order('updatedAt', { ascending: false })
    .range(start, start + perPage - 1);

  if (error) {
    console.error('[PARTNER_API_ADMIN_SONGS]', error);
    return partnerApiError('internal_error', 'Não foi possível consultar as músicas.', 500);
  }

  const total = count || 0;
  return NextResponse.json(
    {
      data: (data || []).map(toPartnerSong),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    },
    { headers: partnerApiHeaders(access.auth) },
  );
}

export async function POST(request: NextRequest) {
  const access = withPartnerApiAuth(request, 'songs:write');
  if (access.error) return access.error;

  const actorId = await getApiActorId();
  if (!actorId) {
    return partnerApiError('api_misconfigured', 'CANTOLICO_API_ACTOR_USER_ID deve indicar uma conta ADMIN válida.', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return partnerApiError('invalid_request', 'O corpo deve ser JSON válido.', 400);
  }

  const parsed = createSongSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  if (input.type === 'ACORDES' && !input.version?.source_text?.trim()) {
    return partnerApiError('invalid_request', 'Músicas de acordes exigem `version.source_text`.', 422);
  }

  let slug: string | null | undefined;
  try {
    slug = await uniqueSlug(input.title, input.slug);
  } catch (error) {
    console.error('[PARTNER_API_SONG_SLUG]', error);
    return partnerApiError('internal_error', 'Não foi possível gerar a slug da música.', 500);
  }
  if (!slug) {
    return partnerApiError('invalid_request', 'A slug já existe ou não pôde ser gerada.', 409);
  }

  const songId = randomUUID();
  const { data: song, error: songError } = await adminSupabase
    .from('Song')
    .insert({
      id: songId,
      title: input.title,
      slug,
      author: input.author || null,
      type: input.type,
      mainInstrument: input.main_instrument,
      moments: input.moments,
      tags: input.tags,
      capo: input.capo || null,
    })
    .select('id')
    .single();

  if (songError || !song) {
    console.error('[PARTNER_API_SONG_CREATE]', songError);
    return partnerApiError('internal_error', 'Não foi possível criar a música.', 500);
  }

  const version = input.version || {};
  const versionId = randomUUID();
  const { error: versionError } = await adminSupabase.from('SongVersion').insert({
    id: versionId,
    songId: song.id,
    versionNumber: 1,
    sourceType: input.type === 'ACORDES' ? 'MARKDOWN' : 'PDF',
    sourceText: version.source_text || '',
    lyricsPlain: version.lyrics || version.source_text || '',
    renderedHtml: '',
    keyOriginal: version.key_original || null,
    mediaUrl: version.media_url || null,
    spotifyLink: version.spotify_url || null,
    youtubeLink: version.youtube_url || null,
    createdById: actorId,
  });

  if (versionError) {
    console.error('[PARTNER_API_SONG_VERSION_CREATE]', versionError);
    await adminSupabase.from('Song').delete().eq('id', song.id);
    return partnerApiError('internal_error', 'Não foi possível criar a versão da música.', 500);
  }

  const { error: currentVersionError } = await adminSupabase
    .from('Song')
    .update({ currentVersionId: versionId })
    .eq('id', song.id);
  if (currentVersionError) {
    console.error('[PARTNER_API_SONG_VERSION_LINK]', currentVersionError);
    return partnerApiError('internal_error', 'Não foi possível publicar a versão da música.', 500);
  }

  const { data: createdSong, error: readError } = await adminSupabase
    .from('Song')
    .select(partnerSongSelect)
    .eq('id', song.id)
    .single();
  if (readError || !createdSong) {
    console.error('[PARTNER_API_SONG_CREATE_READ]', readError);
    return partnerApiError('internal_error', 'A música foi criada, mas não foi possível lê-la.', 500);
  }

  await auditApiMutation(actorId, access.auth.name, 'song.created_via_api', song.id, { title: input.title, slug });
  return NextResponse.json(
    { data: toPartnerSong(createdSong) },
    {
      status: 201,
      headers: { ...partnerApiHeaders(access.auth), Location: `/api/v1/songs/${song.id}` },
    },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } });
}
