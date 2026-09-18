import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase-admin';
import { partnerApiData, partnerApiError, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';
import { isLikelySongId, normalizeSongIdentifier } from '@/lib/song-identifier';
import { partnerSongSelect, toPartnerSong } from '@/lib/partner-api-songs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const access = withPartnerApiAuth(request);
  if (access.error) return access.error;

  const { id } = await context.params;
  const identifier = normalizeSongIdentifier(id);
  if (!identifier || identifier.length > 200) {
    return partnerApiError('invalid_request', 'O identificador da música não é válido.', 422);
  }

  let song: any = null;
  if (isLikelySongId(identifier)) {
    const { data, error } = await adminSupabase
      .from('Song')
      .select(partnerSongSelect)
      .eq('id', identifier)
      .maybeSingle();
    if (error) {
      console.error('[PARTNER_API_SONG]', error);
      return partnerApiError('internal_error', 'Não foi possível consultar o catálogo.', 500);
    }
    song = data;
  }

  if (!song) {
    const { data, error } = await adminSupabase
      .from('Song')
      .select(partnerSongSelect)
      .eq('slug', identifier)
      .maybeSingle();
    if (error) {
      console.error('[PARTNER_API_SONG]', error);
      return partnerApiError('internal_error', 'Não foi possível consultar o catálogo.', 500);
    }
    song = data;
  }

  if (!song) {
    return partnerApiError('not_found', 'Música não encontrada.', 404);
  }

  return partnerApiData(toPartnerSong(song), { headers: partnerApiHeaders(access.auth) });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
