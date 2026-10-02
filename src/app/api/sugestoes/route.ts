import { NextRequest, NextResponse } from 'next/server';
import { SNL_CALENDAR_URL, buildSuggestions, fetchPartnerCatalog, fetchPublicCatalog, inferLiturgicalColor, parseSnlCalendar, summariseCelebration } from '@/lib/liturgical-suggestions';

export const revalidate = 21600;

function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

export async function GET(request: NextRequest) {
  const requestedDate = request.nextUrl.searchParams.get('date');
  const date = validDate(requestedDate) ? requestedDate! : new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });

  try {
    const calendarResponse = await fetch(SNL_CALENDAR_URL, { next: { revalidate: 21600 } });

    if (!calendarResponse.ok) throw new Error(`SNL respondeu com ${calendarResponse.status}`);
    let catalogSongs: Array<Record<string, unknown>> = [];
    let catalogSource: 'partner-api' | 'public-fallback' | 'unavailable' = 'unavailable';

    try {
      catalogSongs = await fetchPartnerCatalog();
      catalogSource = catalogSongs.length ? 'partner-api' : 'unavailable';
    } catch (partnerError) {
      console.warn('API pública autenticada indisponível para sugestões; a usar catálogo público.', partnerError);
    }

    if (!catalogSongs.length) {
      try {
        catalogSongs = await fetchPublicCatalog();
        catalogSource = catalogSongs.length ? 'public-fallback' : 'unavailable';
      } catch (catalogError) {
        console.error('Catálogo público indisponível para sugestões:', catalogError);
        catalogSource = 'unavailable';
      }
    }

    const celebration = parseSnlCalendar(await calendarResponse.text()).find(event => event.date === date) || {
      date,
      title: 'Celebração do dia',
      categories: [],
      color: inferLiturgicalColor(),
      summary: summariseCelebration(),
    };
    const response = NextResponse.json({
      celebration,
      suggestions: buildSuggestions(celebration, catalogSongs),
      catalogAvailable: catalogSource !== 'unavailable',
      catalogSource,
      formatVersion: 2,
      source: { name: 'Agenda Litúrgica do SNL', url: SNL_CALENDAR_URL },
    });
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return response;
  } catch (error) {
    console.error('Erro ao gerar sugestões litúrgicas:', error);
    return NextResponse.json({ error: 'Não foi possível consultar o calendário litúrgico neste momento.' }, { status: 503 });
  }
}
