import { NextRequest, NextResponse } from 'next/server';
import { getStoredLiturgicalSuggestions, syncLiturgicalCalendar } from '@/lib/liturgical-calendar-store';

export const revalidate = 3600;

function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

export async function GET(request: NextRequest) {
  const requestedDate = request.nextUrl.searchParams.get('date');
  const date = validDate(requestedDate) ? requestedDate! : new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });

  try {
    let data = await getStoredLiturgicalSuggestions(date);
    if (!data) {
      await syncLiturgicalCalendar();
      data = await getStoredLiturgicalSuggestions(date);
    }
    if (!data) return NextResponse.json({ error: 'A celebração ainda está a ser sincronizada.' }, { status: 503 });

    const response = NextResponse.json({ ...data, formatVersion: 3 });
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return response;
  } catch (error) {
    console.error('Erro ao carregar sugestões litúrgicas persistidas:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as sugestões litúrgicas neste momento.' }, { status: 503 });
  }
}
