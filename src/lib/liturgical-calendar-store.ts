import { createHash } from 'node:crypto';
import { adminSupabase } from '@/lib/supabase-admin';
import {
  type CalendarCelebration,
  type SongSuggestionUsage,
  SNL_CALENDAR_URL,
  buildRotatingSuggestions,
  fetchPartnerCatalog,
  parseSnlCalendar,
} from '@/lib/liturgical-suggestions';

const ALGORITHM_VERSION = 1;
const HISTORY_DAYS = 120;
const FUTURE_DAYS = 400;

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function sourceHash(celebration: CalendarCelebration) {
  return createHash('sha256')
    .update(JSON.stringify({
      title: celebration.title,
      description: celebration.description || '',
      categories: celebration.categories || [],
      color: celebration.color,
      summary: celebration.summary || {},
    }))
    .digest('hex');
}

function toCelebration(row: any): CalendarCelebration {
  return {
    date: row.date,
    title: row.title,
    description: row.description || undefined,
    categories: row.categories || [],
    color: row.color || null,
    summary: row.summary || { readings: [], alternatives: [] },
  };
}

function consolidateCalendarDays(celebrations: CalendarCelebration[]) {
  const celebrationsByDate = new Map<string, CalendarCelebration[]>();
  celebrations.forEach(celebration => {
    const sameDay = celebrationsByDate.get(celebration.date) || [];
    sameDay.push(celebration);
    celebrationsByDate.set(celebration.date, sameDay);
  });

  return [...celebrationsByDate.values()].map(dayCelebrations => {
    const [primary, ...additional] = dayCelebrations;
    if (!additional.length) return primary;

    // SNL occasionally publishes two valid observances for the same civil day
    // (for example, a weekday and its evening celebration). LiturgicalCalendarDay
    // intentionally has one stable record per date, so retain the extra entries
    // as named alternatives instead of losing them or duplicating the upsert key.
    const alternatives = new Set(primary.summary?.alternatives || []);
    additional.forEach(celebration => {
      const detail = [celebration.title, celebration.description].filter(Boolean).join(' — ');
      alternatives.add(detail);
    });

    return {
      ...primary,
      categories: [...new Set(dayCelebrations.flatMap(celebration => celebration.categories || []))],
      color: primary.color || additional.find(celebration => celebration.color)?.color || null,
      summary: {
        ...primary.summary,
        alternatives: [...alternatives],
      },
    };
  });
}

export async function getStoredLiturgicalSuggestions(date: string) {
  const { data: calendarDay, error: calendarError } = await adminSupabase
    .from('LiturgicalCalendarDay')
    .select('id,date,title,description,categories,color,summary,sourceUrl,sourceHash')
    .eq('date', date)
    .maybeSingle();
  if (calendarError) throw calendarError;
  if (!calendarDay) return null;

  const { data: storedSuggestions, error: suggestionsError } = await adminSupabase
    .from('LiturgicalSuggestion')
    .select('moment,songId,position')
    .eq('calendarDayId', calendarDay.id)
    .order('position', { ascending: true });
  if (suggestionsError) throw suggestionsError;

  const songIds = [...new Set((storedSuggestions || []).map((item: any) => item.songId))];
  const { data: songs, error: songsError } = songIds.length
    ? await adminSupabase.from('Song').select('id,title,slug,tags,moments').in('id', songIds)
    : { data: [], error: null };
  if (songsError) throw songsError;

  const songsById = new Map((songs || []).map((song: any) => [song.id, song]));
  const celebration = toCelebration(calendarDay);
  const template = buildRotatingSuggestions(celebration, []);
  const suggestions = template.map(suggestion => ({
    ...suggestion,
    songs: (storedSuggestions || [])
      .filter((item: any) => item.moment === suggestion.key)
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => songsById.get(item.songId))
      .filter(Boolean),
  }));

  return {
    celebration,
    suggestions,
    source: { name: 'Agenda Litúrgica do SNL', url: calendarDay.sourceUrl },
    catalogAvailable: true,
    catalogSource: 'database' as const,
  };
}

export async function syncLiturgicalCalendar() {
  // Cloudflare protects the SNL calendar from anonymous Undici requests. A
  // descriptive user agent keeps this scheduled import identifiable and lets
  // the same public .ics URL work from the Vercel runtime.
  const response = await fetch(SNL_CALENDAR_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.1',
      'User-Agent': 'Cantolico Liturgical Calendar Sync/1.0 (+https://cantolico.pt)',
    },
  });
  if (!response.ok) throw new Error(`SNL respondeu com ${response.status} ${response.statusText}`.trim());

  const from = localDate(-HISTORY_DAYS);
  const until = localDate(FUTURE_DAYS);
  const celebrations = consolidateCalendarDays(parseSnlCalendar(await response.text()));
  if (!celebrations.length) throw new Error('O calendário SNL não devolveu celebrações para o período pedido.');

  const rows = celebrations.map(celebration => ({
    date: celebration.date,
    title: celebration.title,
    description: celebration.description || null,
    categories: celebration.categories || [],
    color: celebration.color,
    summary: celebration.summary || { readings: [], alternatives: [] },
    sourceHash: sourceHash(celebration),
    sourceUrl: SNL_CALENDAR_URL,
    syncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  // The source is first consolidated above, then keyed once more at the exact
  // database conflict key. This makes the bulk upsert safe even if an upstream
  // feed changes its event format and produces repeated dates.
  const rowsByDate = new Map(rows.map(row => [row.date, row]));
  const calendarRows = [...rowsByDate.values()];
  const { error: calendarUpsertError } = await adminSupabase
    .from('LiturgicalCalendarDay')
    .upsert(calendarRows, { onConflict: 'date' });
  if (calendarUpsertError) throw calendarUpsertError;

  const { data: calendarDays, error: calendarDaysError } = await adminSupabase
    .from('LiturgicalCalendarDay')
    .select('id,date,title,description,categories,color,summary,sourceHash')
    .gte('date', from)
    .lte('date', until)
    .order('date', { ascending: true });
  if (calendarDaysError) throw calendarDaysError;

  const { data: existing, error: existingError } = await adminSupabase
    .from('LiturgicalSuggestion')
    .select('calendarDayId,celebrationDate,moment,songId,calendarHash,algorithmVersion')
    .gte('celebrationDate', from)
    .lte('celebrationDate', until);
  if (existingError) throw existingError;

  const existingByDay = new Map<string, any[]>();
  for (const suggestion of existing || []) {
    const entries = existingByDay.get(suggestion.calendarDayId) || [];
    entries.push(suggestion);
    existingByDay.set(suggestion.calendarDayId, entries);
  }
  const daysToGenerate = (calendarDays || []).filter((day: any) => {
    const suggestions = existingByDay.get(day.id) || [];
    return !suggestions.length || suggestions.some(item => item.calendarHash !== day.sourceHash || item.algorithmVersion !== ALGORITHM_VERSION);
  });

  if (!daysToGenerate.length) return { calendarDays: calendarRows.length, generatedDays: 0, generatedSuggestions: 0 };

  let songs: Array<Record<string, unknown>> = [];
  try {
    songs = await fetchPartnerCatalog();
  } catch (partnerError) {
    // The scheduled result remains reliable if a newly-created partner key has
    // not yet been added to the deployment environment.
    console.warn('API pública autenticada indisponível no sincronizador; a usar catálogo interno.', partnerError);
    const { data, error } = await adminSupabase
      .from('Song')
      .select('id,title,slug,tags,moments')
      .order('title', { ascending: true });
    if (error) throw error;
    songs = (data || []) as Array<Record<string, unknown>>;
  }

  // Rebuild the short history in chronological order below. This lets a newly
  // generated day account for persisted choices before it without double-counting
  // them on subsequent synchronizations.
  const usageHistory: SongSuggestionUsage[] = [];
  const rowsToInsert: any[] = [];
  const daysToReplace = new Set(daysToGenerate.map((day: any) => day.id));

  for (const day of calendarDays || []) {
    const previous = existingByDay.get(day.id) || [];
    if (!daysToReplace.has(day.id)) {
      previous.forEach(item => usageHistory.push({ songId: item.songId, moment: item.moment, celebrationDate: item.celebrationDate }));
      continue;
    }

    const celebration = toCelebration(day);
    const suggestions = buildRotatingSuggestions(celebration, songs, usageHistory);
    suggestions.forEach(suggestion => suggestion.songs.forEach((song, index) => {
      rowsToInsert.push({
        calendarDayId: day.id,
        celebrationDate: day.date,
        moment: suggestion.key,
        songId: song.id,
        position: index + 1,
        score: 3 - index,
        calendarHash: day.sourceHash,
        algorithmVersion: ALGORITHM_VERSION,
      });
      usageHistory.push({ songId: song.id, moment: suggestion.key, celebrationDate: day.date });
    }));
  }

  const { error: deleteError } = await adminSupabase
    .from('LiturgicalSuggestion')
    .delete()
    .in('calendarDayId', [...daysToReplace]);
  if (deleteError) throw deleteError;
  if (rowsToInsert.length) {
    const { error: insertError } = await adminSupabase.from('LiturgicalSuggestion').insert(rowsToInsert);
    if (insertError) throw insertError;
  }

  return { calendarDays: calendarRows.length, generatedDays: daysToGenerate.length, generatedSuggestions: rowsToInsert.length };
}
