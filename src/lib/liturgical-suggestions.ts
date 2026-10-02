import { parseMomentsFromPostgreSQL, parseTagsFromPostgreSQL } from '@/lib/utils';

export const SNL_CALENDAR_URL = 'https://www.liturgia.pt/agenda/agenda.ics';
export const PUBLIC_CATALOG_URL = 'https://cantolico.pt/api/musics/search?limit=500';

export type LiturgicalColor = 'VERDE' | 'ROXO' | 'BRANCO' | 'VERMELHO' | 'ROSA' | null;

export interface CalendarCelebration {
  date: string;
  title: string;
  description?: string;
  categories?: string[];
  color: LiturgicalColor;
  summary?: CelebrationSummary;
}

export interface CelebrationSummary {
  name?: string;
  rank?: string;
  rite?: string;
  readings: LiturgicalReading[];
  alternatives: string[];
}

export interface LiturgicalReading {
  kind: 'FIRST_READING' | 'SECOND_READING' | 'PSALM' | 'GOSPEL';
  reference: string;
  alternative?: string;
}

export interface SuggestionSong {
  id: string;
  title: string;
  slug: string | null;
  tags: string[];
  moments: string[];
}

const COLOR_WORDS: Array<[LiturgicalColor, string[]]> = [
  ['VERMELHO', ['vermelho']],
  ['ROXO', ['roxo', 'violeta']],
  ['ROSA', ['rosa']],
  ['BRANCO', ['branco']],
  ['VERDE', ['verde']],
];

const MOMENTS = [
  ['ENTRADA', 'Entrada', 'Reunir a assembleia e abrir a celebração.'],
  ['ATO_PENITENCIAL', 'Ato penitencial', 'Um canto breve de súplica e reconciliação.'],
  ['ACLAMACAO_EVANGELHO', 'Aclamação ao Evangelho', 'Aclamação breve antes do Evangelho.'],
  ['OFERENDAS', 'Ofertório', 'Para a preparação dos dons.'],
  ['SANTO', 'Santo', 'Canto do Ordinário da Missa.'],
  ['CORDEIRO_DEUS', 'Cordeiro de Deus', 'Canto do Ordinário da Missa.'],
  ['COMUNHAO', 'Comunhão', 'Para acompanhar a procissão de comunhão.'],
  ['FINAL', 'Final', 'Envio da comunidade em missão.'],
] as const;

// The catalogue contains both the original form names and the newer mass-export
// names. Suggestions use one canonical key, so songs remain discoverable while
// the library is gradually normalized.
const MOMENT_ALIASES: Record<string, string> = {
  ACLAMACAO: 'ACLAMACAO_EVANGELHO',
  ACLAMACAO_EVANGELHO: 'ACLAMACAO_EVANGELHO',
  OFERTORIO: 'OFERENDAS',
  OFERENDAS: 'OFERENDAS',
  CORDEIRO_DE_DEUS: 'CORDEIRO_DEUS',
  CORDEIRO_DEUS: 'CORDEIRO_DEUS',
};

function normalizeMoments(moments: string[]) {
  return moments.map(moment => MOMENT_ALIASES[moment] || moment);
}

function unfoldIcs(ics: string) {
  return ics.replace(/\r?\n[ \t]/g, '');
}

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function field(event: string, name: string) {
  const match = event.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'mi'));
  return match ? unescapeIcs(match[1]) : undefined;
}

function toIsoDate(value?: string) {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/[–—]/g, '–').trim();
}

export function summariseCelebration(description?: string, color?: LiturgicalColor): CelebrationSummary {
  if (!description) return { readings: [], alternatives: [] };

  // The SNL ICS includes local-calendar alternatives after an asterisk. They are
  // useful source data, but not the main celebration a parish needs to scan.
  const sections = description.split(/\s+\*\s+/).map(cleanText).filter(Boolean);
  const primary = sections[0];
  const readingsStart = primary.search(/\bL\s*1\s*:/i);
  const header = readingsStart >= 0 ? primary.slice(0, readingsStart).replace(/[.;\s]+$/, '') : primary;
  const readingsText = readingsStart >= 0 ? primary.slice(readingsStart) : '';
  const parts = header.split(/\s+–\s+/).map(cleanText).filter(Boolean);
  const meta = parts.slice(1).join(' – ');
  const rankMatch = meta.match(/\b(MO|MF|S|F)\b/i)?.[1]?.toUpperCase();
  const rankLabels: Record<string, string> = {
    S: 'Solenidade',
    F: 'Festa',
    MO: 'Memória obrigatória',
    MF: 'Memória facultativa',
  };
  const colorWords = color === 'BRANCO' ? 'branco' : color === 'VERMELHO' ? 'vermelho' : color === 'ROXO' ? 'roxo|violeta' : color === 'ROSA' ? 'rosa' : color === 'VERDE' ? 'verde' : '';
  const riteWithoutRank = meta.replace(/\b(MO|MF|S|F)\b/gi, '');
  const rite = cleanText(
    (colorWords ? riteWithoutRank.replace(new RegExp(`\\b(${colorWords})\\b`, 'gi'), '') : riteWithoutRank)
      .replace(/^[–\s]+/, ''),
  );

  const markerPattern = /(?:^|;\s*|\s+)(L\s*1|L\s*2|Sl|Ev)\b\s*:?\s*/gi;
  const markers = [...readingsText.matchAll(markerPattern)];
  const segments = markers.map((marker, index) => {
    const nextMarker = markers[index + 1];
    const label = marker[1].replace(/\s/g, '').toUpperCase();
    const start = (marker.index || 0) + marker[0].length;
    const end = nextMarker?.index || readingsText.length;
    return { label, reference: cleanText(readingsText.slice(start, end).replace(/^;\s*/, '')) };
  });

  const firstReading = segments.find(segment => segment.label === 'L1')?.reference;
  const secondReading = segments.find(segment => segment.label === 'L2')?.reference;
  const psalms = segments.filter(segment => segment.label === 'SL').map(segment => segment.reference);
  const gospel = segments.find(segment => segment.label === 'EV')?.reference;
  const firstPsalm = psalms.shift();
  const [primaryPsalm, firstReadingAlternative] = firstPsalm?.split(/\s+ou\s+/i).map(cleanText) || [];
  const readings: LiturgicalReading[] = [];
  if (firstReading) readings.push({ kind: 'FIRST_READING', reference: firstReading, alternative: firstReadingAlternative });
  if (secondReading) readings.push({ kind: 'SECOND_READING', reference: secondReading });
  const psalmReferences = [primaryPsalm, ...psalms].filter(Boolean);
  if (psalmReferences.length) readings.push({ kind: 'PSALM', reference: psalmReferences.join(' ou ') });
  if (gospel) readings.push({ kind: 'GOSPEL', reference: gospel });

  return {
    name: parts[0],
    rank: rankMatch ? rankLabels[rankMatch] : undefined,
    rite: rite || undefined,
    readings,
    alternatives: sections.slice(1),
  };
}

export function inferLiturgicalColor(...values: Array<string | undefined>): LiturgicalColor {
  const content = values.filter(Boolean).join(' ').toLocaleLowerCase('pt-PT');
  for (const [color, words] of COLOR_WORDS) {
    if (words.some(word => content.includes(word))) return color;
  }
  if (/advento|quaresma/.test(content)) return 'ROXO';
  if (/pentecostes|domingo de ramos|paixão do senhor/.test(content)) return 'VERMELHO';
  if (/natal|epifania|páscoa|pascoa|ressurreição|ressurreicao/.test(content)) return 'BRANCO';
  return null;
}

export function parseSnlCalendar(ics: string): CalendarCelebration[] {
  return unfoldIcs(ics)
    .split('BEGIN:VEVENT')
    .slice(1)
    .map((event): CalendarCelebration | null => {
      const date = toIsoDate(field(event, 'DTSTART'));
      const title = field(event, 'SUMMARY');
      const description = field(event, 'DESCRIPTION');
      const categories = (field(event, 'CATEGORIES') || '').split(',').map(unescapeIcs).filter(Boolean);
      if (!date || !title) return null;
      const color = inferLiturgicalColor(title, description, categories.join(' '));
      return { date, title, description, categories, color, summary: summariseCelebration(description, color) };
    })
    .filter((event): event is CalendarCelebration => event !== null);
}

function normalise(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function fallbackMomentsFor(title: string) {
  const value = normalise(title);
  const moments = new Set<string>();

  if (/\bsanto\b|hossana/.test(value)) moments.add('SANTO');
  if (/cordeiro|agnus/.test(value)) moments.add('CORDEIRO_DEUS');
  if (/kyrie|piedade/.test(value)) moments.add('ATO_PENITENCIAL');
  if (/gloria/.test(value)) moments.add('GLORIA');
  if (/aleluia/.test(value)) moments.add('ACLAMACAO_EVANGELHO');
  if (/salmo|palavra/.test(value)) moments.add('SALMO_RESPONSORIAL');
  if (/pao|corpo|comei|comunh/.test(value)) moments.add('COMUNHAO');
  if (/vinho|oferta|dons|grao|consagr/.test(value)) moments.add('OFERENDAS');
  if (/vem|caminh|igreja reunida|deus esta aqui|cantai|hino|forca/.test(value)) moments.add('ENTRADA');
  if (/caminh|envia|missao|esperanca|luz|maravilhas|cantarei/.test(value)) moments.add('FINAL');

  // The public search endpoint deliberately returns compact results. Songs
  // without an obvious title signal remain useful for these general moments.
  if (!moments.size) ['ENTRADA', 'OFERENDAS', 'COMUNHAO', 'FINAL'].forEach(moment => moments.add(moment));
  return [...moments];
}

export async function fetchPublicCatalog() {
  const response = await fetch(PUBLIC_CATALOG_URL, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Catálogo público respondeu com ${response.status}`);

  const payload: unknown = await response.json();
  const songs = payload && typeof payload === 'object' && Array.isArray((payload as { songs?: unknown }).songs)
    ? (payload as { songs: unknown[] }).songs
    : [];

  return songs.flatMap(song => {
    if (!song || typeof song !== 'object') return [];
    const candidate = song as { id?: unknown; title?: unknown; slug?: unknown };
    if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return [];
    return [{
      id: candidate.id,
      title: candidate.title,
      slug: typeof candidate.slug === 'string' ? candidate.slug : null,
      tags: [],
      moments: fallbackMomentsFor(candidate.title),
    }];
  });
}

function themesFor(celebration: CalendarCelebration) {
  const source = normalise(`${celebration.title} ${celebration.description || ''} ${(celebration.categories || []).join(' ')}`);
  const themes = new Set<string>();
  const matchingThemes: Array<[RegExp, string[]]> = [
    [/advento|anunciacao/, ['advento', 'espera', 'vem senhor', 'maria']],
    [/natal|epifania/, ['natal', 'luz', 'encarnacao', 'jesus']],
    [/quaresma|cinzas|paixao/, ['quaresma', 'conversao', 'cruz', 'perdao']],
    [/pascoa|ressurreicao/, ['pascoa', 'ressurreicao', 'aleluia', 'vida']],
    [/pentecostes|espirito santo/, ['espirito santo', 'fogo', 'vento']],
    [/maria|imaculada|assuncao/, ['maria', 'mae', 'magnificat']],
    [/santissimo sacramento|corpo de deus|eucarist/, ['eucaristia', 'pao', 'corpo de cristo']],
    [/cristo rei/, ['rei', 'reino', 'senhor']],
  ];
  matchingThemes.forEach(([pattern, words]) => { if (pattern.test(source)) words.forEach(word => themes.add(word)); });
  return [...themes];
}

export function buildSuggestions(celebration: CalendarCelebration, songs: Array<Record<string, unknown>>) {
  const themes = themesFor(celebration);
  const preparedSongs: SuggestionSong[] = songs.map(song => ({
    id: String(song.id),
    title: String(song.title),
    slug: typeof song.slug === 'string' ? song.slug : null,
    tags: parseTagsFromPostgreSQL((song.tags || []) as string[]),
    moments: normalizeMoments(parseMomentsFromPostgreSQL((song.moments || []) as string[])),
  }));

  return MOMENTS
    .map(([key, label, guidance]) => {
      const candidates = preparedSongs
        .filter(song => song.moments.includes(key))
        .map(song => {
          const text = normalise(`${song.title} ${song.tags.join(' ')}`);
          const themeMatches = themes.filter(theme => text.includes(normalise(theme))).length;
          return { ...song, score: themeMatches * 100 + song.tags.length };
        })
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'pt-PT'))
        .slice(0, 3)
        .map(({ score: _score, ...song }) => song);
      return { key, label, guidance, songs: candidates };
    });
}
