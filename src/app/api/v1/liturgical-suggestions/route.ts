import { NextRequest, NextResponse } from 'next/server';
import { getStoredLiturgicalSuggestions } from '@/lib/liturgical-calendar-store';
import { partnerApiData, partnerApiError, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';

function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

function todayInLisbon() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  const access = await withPartnerApiAuth(request);
  if (access.error) return access.error;

  const requestedDate = request.nextUrl.searchParams.get('date');
  if (requestedDate !== null && !validDate(requestedDate)) {
    return partnerApiError('invalid_request', '`date` deve usar o formato YYYY-MM-DD.', 422);
  }

  const date = requestedDate || todayInLisbon();
  try {
    const data = await getStoredLiturgicalSuggestions(date);
    if (!data) {
      return partnerApiError('not_found', 'Ainda não existem sugestões preparadas para esta data.', 404);
    }
    return partnerApiData({ ...data, format_version: 3 }, { headers: partnerApiHeaders(access.auth) });
  } catch (error) {
    console.error('[PARTNER_API_LITURGICAL_SUGGESTIONS]', error);
    return partnerApiError('internal_error', 'Não foi possível consultar as sugestões litúrgicas.', 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
