import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://hsccsaenntsvagbkhfwe.supabase.co/functions/v1/missas-api';

function numberParam(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Server-side proxy for HorariosMissas. The partner key intentionally never
 * reaches the browser; this route only exposes the public church information.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.HORARIOS_MISSAS_API_KEY;
  if (!apiKey) {
    return jsonError('A integração com HoráriosMissas ainda não está configurada.', 503);
  }

  const mode = request.nextUrl.searchParams.get('mode');
  const target = new URL(API_URL);

  if (mode === 'near') {
    const lat = numberParam(request.nextUrl.searchParams.get('lat'), -90, 90);
    const lng = numberParam(request.nextUrl.searchParams.get('lng'), -180, 180);
    if (lat === null || lng === null) return jsonError('Localização inválida.', 400);

    target.pathname += '/perto';
    target.searchParams.set('lat', String(lat));
    target.searchParams.set('lng', String(lng));
    target.searchParams.set('raio', '15');
    target.searchParams.set('limite', '6');
  } else if (mode === 'locality') {
    const locality = request.nextUrl.searchParams.get('q')?.trim() || '';
    if (locality.length < 2 || locality.length > 80) {
      return jsonError('Indica uma localidade com 2 a 80 caracteres.', 400);
    }

    target.pathname += '/localidade';
    target.searchParams.set('q', locality);
    target.searchParams.set('limite', '6');
  } else {
    return jsonError('Pesquisa inválida.', 400);
  }

  try {
    const response = await fetch(target, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('HoráriosMissas respondeu com erro:', response.status);
      if (response.status === 401 || response.status === 403) {
        return jsonError('A chave da integração com HoráriosMissas não foi aceite. Confirma a chave configurada.', 503);
      }
      return jsonError('Não foi possível consultar os horários de missa.', 502);
    }

    const payload = await response.json();
    const result = NextResponse.json(payload);
    result.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
    return result;
  } catch (error) {
    console.error('Erro ao consultar HoráriosMissas:', error);
    return jsonError('Não foi possível contactar os horários de missa.', 502);
  }
}
