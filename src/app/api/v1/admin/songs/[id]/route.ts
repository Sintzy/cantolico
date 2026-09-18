import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { partnerApiData, partnerApiError, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';
import { partnerSongSelect, titleToApiSlug, toPartnerSong, updateSongSchema } from '@/lib/partner-api-songs';

type RouteContext = { params: Promise<{ id: string }> };

async function getApiActorId() {
  const configuredId = Number.parseInt(process.env.CANTOLICO_API_ACTOR_USER_ID || '', 10);
  if (!Number.isInteger(configuredId) || configuredId < 1) return null;
  const { data: actor, error } = await adminSupabase.from('User').select('id, role').eq('id', configuredId).maybeSingle();
  return !error && actor?.role === 'ADMIN' ? actor.id : null;
}

async function uniqueSlug(title: string, excludeId: string, requestedSlug?: string) {
  const base = requestedSlug || titleToApiSlug(title);
  if (!base) return null;
  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const candidate = requestedSlug ? base : suffix === 0 ? base : `${base}-${suffix}`;
    const { data, error } = await adminSupabase.from('Song').select('id').eq('slug', candidate).neq('id', excludeId).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    if (requestedSlug) return undefined;
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = withPartnerApiAuth(request, 'songs:write');
  if (access.error) return access.error;
  const actorId = await getApiActorId();
  if (!actorId) return partnerApiError('api_misconfigured', 'CANTOLICO_API_ACTOR_USER_ID deve indicar uma conta ADMIN válida.', 503);

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return partnerApiError('invalid_request', 'O corpo deve ser JSON válido.', 400);
  }

  const parsed = updateSongSchema.safeParse(body);
  if (!parsed.success) {
    return partnerApiError('invalid_request', 'O corpo do pedido não é válido.', 422, parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message, code: issue.code })));
  }
  const input = parsed.data;

  const { data: existing, error: existingError } = await adminSupabase.from('Song').select('id, title, currentVersionId').eq('id', id).maybeSingle();
  if (existingError) {
    console.error('[PARTNER_API_SONG_READ]', existingError);
    return partnerApiError('internal_error', 'Não foi possível consultar a música.', 500);
  }
  if (!existing) return partnerApiError('not_found', 'Música não encontrada.', 404);

  let slug: string | null | undefined;
  if (input.slug !== undefined || input.title !== undefined) {
    try {
      slug = await uniqueSlug(input.title || existing.title, id, input.slug);
    } catch (error) {
      console.error('[PARTNER_API_SONG_SLUG]', error);
      return partnerApiError('internal_error', 'Não foi possível gerar a slug da música.', 500);
    }
    if (!slug) return partnerApiError('invalid_request', 'A slug já existe ou não pôde ser gerada.', 409);
  }

  const songUpdate: Record<string, unknown> = {};
  if (input.title !== undefined) songUpdate.title = input.title;
  if (slug !== undefined) songUpdate.slug = slug;
  if (input.author !== undefined) songUpdate.author = input.author || null;
  if (input.type !== undefined) songUpdate.type = input.type;
  if (input.main_instrument !== undefined) songUpdate.mainInstrument = input.main_instrument;
  if (input.moments !== undefined) songUpdate.moments = input.moments;
  if (input.tags !== undefined) songUpdate.tags = input.tags;
  if (input.capo !== undefined) songUpdate.capo = input.capo || null;

  if (Object.keys(songUpdate).length > 0) {
    const { error } = await adminSupabase.from('Song').update(songUpdate).eq('id', id);
    if (error) {
      console.error('[PARTNER_API_SONG_UPDATE]', error);
      return partnerApiError('internal_error', 'Não foi possível atualizar a música.', 500);
    }
  }

  if (input.version) {
    if (!existing.currentVersionId) return partnerApiError('internal_error', 'A música não tem uma versão atual para atualizar.', 500);

    const versionUpdate: Record<string, unknown> = {};
    if (input.version.source_text !== undefined) versionUpdate.sourceText = input.version.source_text;
    if (input.version.lyrics !== undefined) versionUpdate.lyricsPlain = input.version.lyrics;
    if (input.version.key_original !== undefined) versionUpdate.keyOriginal = input.version.key_original || null;
    if (input.version.media_url !== undefined) versionUpdate.mediaUrl = input.version.media_url || null;
    if (input.version.spotify_url !== undefined) versionUpdate.spotifyLink = input.version.spotify_url || null;
    if (input.version.youtube_url !== undefined) versionUpdate.youtubeLink = input.version.youtube_url || null;

    if (Object.keys(versionUpdate).length > 0) {
      const { error } = await adminSupabase.from('SongVersion').update(versionUpdate).eq('id', existing.currentVersionId);
      if (error) {
        console.error('[PARTNER_API_SONG_VERSION_UPDATE]', error);
        return partnerApiError('internal_error', 'Não foi possível atualizar a versão da música.', 500);
      }
    }
  }

  const { data: updated, error: updatedError } = await adminSupabase.from('Song').select(partnerSongSelect).eq('id', id).single();
  if (updatedError || !updated) {
    console.error('[PARTNER_API_SONG_UPDATE_READ]', updatedError);
    return partnerApiError('internal_error', 'A música foi atualizada, mas não foi possível lê-la.', 500);
  }

  await auditApiMutation(actorId, access.auth.name, 'song.updated_via_api', id, { fields: Object.keys(input) });
  return partnerApiData(toPartnerSong(updated), { headers: partnerApiHeaders(access.auth) });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = withPartnerApiAuth(request, 'songs:delete');
  if (access.error) return access.error;
  const actorId = await getApiActorId();
  if (!actorId) return partnerApiError('api_misconfigured', 'CANTOLICO_API_ACTOR_USER_ID deve indicar uma conta ADMIN válida.', 503);

  if (request.nextUrl.searchParams.get('confirm') !== 'true') {
    return partnerApiError('invalid_request', 'Para eliminar, usa `?confirm=true`.', 422);
  }

  const { id } = await context.params;
  const { data: song, error: songError } = await adminSupabase.from('Song').select('id, currentVersionId').eq('id', id).maybeSingle();
  if (songError) return partnerApiError('internal_error', 'Não foi possível consultar a música.', 500);
  if (!song) return partnerApiError('not_found', 'Música não encontrada.', 404);

  const [playlistItems, massItems, templateItems] = await Promise.all([
    adminSupabase.from('PlaylistItem').select('id', { count: 'exact', head: true }).eq('songId', id),
    adminSupabase.from('MassItem').select('id', { count: 'exact', head: true }).eq('songId', id),
    adminSupabase.from('MassTemplateItem').select('id', { count: 'exact', head: true }).eq('songId', id),
  ]);
  if (playlistItems.error || massItems.error || templateItems.error) return partnerApiError('internal_error', 'Não foi possível verificar referências da música.', 500);

  const references = {
    playlist_items: playlistItems.count || 0,
    mass_items: massItems.count || 0,
    mass_template_items: templateItems.count || 0,
  };
  const force = request.nextUrl.searchParams.get('force') === 'true';
  if (!force && (references.playlist_items > 0 || references.mass_items > 0 || references.mass_template_items > 0)) {
    return partnerApiError('invalid_request', 'A música ainda é usada em playlists, missas ou modelos. Confirma também com `force=true` para remover essas referências.', 409, references);
  }

  if (force) {
    const [playlistDelete, massDelete, templateDelete] = await Promise.all([
      adminSupabase.from('PlaylistItem').delete().eq('songId', id),
      adminSupabase.from('MassItem').delete().eq('songId', id),
      adminSupabase.from('MassTemplateItem').delete().eq('songId', id),
    ]);
    if (playlistDelete.error || massDelete.error || templateDelete.error) return partnerApiError('internal_error', 'Não foi possível remover as referências da música.', 500);
  }

  const { data: versions, error: versionsError } = await adminSupabase.from('SongVersion').select('id, SongFile(fileKey)').eq('songId', id);
  if (versionsError) return partnerApiError('internal_error', 'Não foi possível consultar os ficheiros da música.', 500);
  const fileKeys = (versions || []).flatMap((version: any) => (version.SongFile || []).map((file: any) => file.fileKey)).filter(Boolean);
  if (fileKeys.length > 0) {
    const { error } = await adminSupabase.storage.from('songs').remove(fileKeys);
    if (error) return partnerApiError('internal_error', 'Não foi possível remover os ficheiros da música.', 500);
  }

  const operations = await Promise.all([
    adminSupabase.from('Favorite').delete().eq('songId', id),
    adminSupabase.from('Star').delete().eq('songId', id),
    (versions || []).length > 0
      ? adminSupabase.from('SongFile').delete().in('songVersionId', (versions || []).map(version => version.id))
      : Promise.resolve({ error: null }),
  ]);
  if (operations.some(result => result.error)) return partnerApiError('internal_error', 'Não foi possível remover dados associados à música.', 500);

  const { error: unlinkError } = await adminSupabase.from('Song').update({ currentVersionId: null }).eq('id', id);
  if (unlinkError) return partnerApiError('internal_error', 'Não foi possível preparar a eliminação da música.', 500);
  const { error: versionDeleteError } = await adminSupabase.from('SongVersion').delete().eq('songId', id);
  if (versionDeleteError) return partnerApiError('internal_error', 'Não foi possível remover as versões da música.', 500);
  const { error: songDeleteError } = await adminSupabase.from('Song').delete().eq('id', id);
  if (songDeleteError) return partnerApiError('internal_error', 'Não foi possível remover a música.', 500);

  await auditApiMutation(actorId, access.auth.name, 'song.deleted_via_api', id, { references, forced: force });
  return new NextResponse(null, { status: 204, headers: partnerApiHeaders(access.auth) });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'PATCH, DELETE, OPTIONS' } });
}
