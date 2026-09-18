/**
 * Shared, presentation-safe helpers for Mass exports.
 *
 * Songs are laid out as a complete, balanced reading surface: one song is
 * always one slide, using columns only when the lyric density needs them.
 */

export const MASS_MOMENT_ORDER: Record<string, number> = {
  ENTRADA: 1,
  ATO_PENITENCIAL: 2,
  GLORIA: 3,
  SALMO_RESPONSORIAL: 4,
  ACLAMACAO_EVANGELHO: 5,
  OFERENDAS: 6,
  SANTO: 7,
  PAI_NOSSO: 8,
  SAUDACAO_PAZ: 9,
  CORDEIRO_DEUS: 10,
  COMUNHAO: 11,
  ACAO_GRACAS: 12,
  FINAL: 13,
  OUTRO: 99,
};

export const MASS_MOMENT_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  ATO_PENITENCIAL: 'Ato Penitencial',
  GLORIA: 'Glória',
  SALMO_RESPONSORIAL: 'Salmo Responsorial',
  ACLAMACAO_EVANGELHO: 'Aclamação ao Evangelho',
  OFERENDAS: 'Ofertório',
  SANTO: 'Santo',
  PAI_NOSSO: 'Pai Nosso',
  SAUDACAO_PAZ: 'Saudação da Paz',
  CORDEIRO_DEUS: 'Cordeiro de Deus',
  COMUNHAO: 'Comunhão',
  ACAO_GRACAS: 'Ação de Graças',
  FINAL: 'Final',
  OUTRO: 'Outro',
};

const CHORD_TOKEN = /\[(?:[A-G](?:#|b)?(?:maj|min|m|sus|dim|aug|add)?\d*(?:\/[A-G](?:#|b)?)?|N\.?C\.?)\]/gi;
const UNFINISHED_CHORD_LINE = /^\s*\[(?:[A-G](?:#|b)?(?:maj|min|m|sus|dim|aug|add)?\d*(?:\/[A-G](?:#|b)?)?|N\.?C\.?)\s*$/gim;
const MARKDOWN_MARKERS = /\*\*|__|~~/g;

export function getMassMomentLabel(moment: string): string {
  return MASS_MOMENT_LABELS[moment] || moment.replaceAll('_', ' ').toLowerCase();
}

export function stripSongMarkup(value: string): string {
  return value
    .replace(/^\s*#mic#\s*\r?\n?/i, '')
    .replace(CHORD_TOKEN, '')
    .replace(UNFINISHED_CHORD_LINE, '')
    .replace(MARKDOWN_MARKERS, '')
    .replace(/\r\n?/g, '\n');
}

export function normaliseLyricLine(value: string): string {
  return value
    .replace(CHORD_TOKEN, '')
    .replace(UNFINISHED_CHORD_LINE, '')
    .replace(MARKDOWN_MARKERS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-wraps a line before pagination so no line needs a tiny font. */
export function wrapLyricLine(value: string, maxCharacters = 48): string[] {
  const line = normaliseLyricLine(value);
  if (!line) return [];

  const words = line.split(' ');
  const wrapped: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxCharacters) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) wrapped.push(current);
  return wrapped;
}

/**
 * Builds projector pages from paragraphs. Paragraphs stay together whenever
 * possible; a long paragraph is continued in a predictable 5-line rhythm.
 */
export function createLyricPages(value: string, maxLinesPerSlide = 5): string[][] {
  const paragraphs = stripSongMarkup(value)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph
      .split('\n')
      .flatMap(line => wrapLyricLine(line))
      .filter(Boolean))
    .filter(paragraph => paragraph.length > 0);

  const pages: string[][] = [];
  let page: string[] = [];

  const commit = () => {
    if (page.length > 0) pages.push(page);
    page = [];
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLinesPerSlide) {
      commit();
      for (let index = 0; index < paragraph.length; index += maxLinesPerSlide) {
        const chunk = paragraph.slice(index, index + maxLinesPerSlide);
        if (index + maxLinesPerSlide < paragraph.length) {
          pages.push(chunk);
        } else {
          // Keep the last continuation open: a short following verse can share
          // it without forcing the congregation through a one-line slide.
          page = chunk;
        }
      }
      continue;
    }

    if (page.length + paragraph.length > maxLinesPerSlide) commit();
    page.push(...paragraph);
  }

  commit();
  return pages;
}

export function getProjectionFontSize(lines: string[]): number {
  const longestLine = Math.max(0, ...lines.map(line => line.length));
  if (lines.length <= 2 && longestLine <= 36) return 44;
  if (lines.length <= 3 && longestLine <= 45) return 40;
  if (longestLine > 46) return 30;
  if (lines.length >= 5) return 32;
  return 36;
}

export interface SongSlideLayout {
  columns: string[][];
  fontSize: number;
}

const SONG_SLIDE_CONTENT_WIDTH = 11.95;
const SONG_SLIDE_GUTTER = 0.42;
const SONG_SLIDE_CONTENT_HEIGHT_POINTS = 5.28 * 72;
const FONT_SIZES = [36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10] as const;

function buildSongSlideLines(value: string, maxCharacters: number): string[] {
  const paragraphs = stripSongMarkup(value)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph
      .split('\n')
      .flatMap(line => wrapLyricLine(line, maxCharacters))
      .filter(Boolean))
    .filter(paragraph => paragraph.length > 0);

  return paragraphs.flatMap((paragraph, index) => (
    index === 0 ? paragraph : ['', ...paragraph]
  ));
}

function distributeSongLines(lines: string[], columnCount: number): string[][] {
  const perColumn = Math.ceil(lines.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) => lines
    .slice(index * perColumn, (index + 1) * perColumn)
    .filter((line, lineIndex, column) => line || (lineIndex > 0 && lineIndex < column.length - 1)));
}

function getColumnWidth(columnCount: number): number {
  return (SONG_SLIDE_CONTENT_WIDTH - SONG_SLIDE_GUTTER * (columnCount - 1)) / columnCount;
}

function getCharactersPerLine(columnWidth: number, fontSize: number): number {
  // Arial's average glyph width is roughly half the font size. The safety
  // margin prevents PowerPoint from adding an unexpected extra line.
  return Math.max(12, Math.floor((columnWidth * 72) / (fontSize * 0.52)));
}

function getLineHeight(fontSize: number): number {
  return fontSize * 1.18 + (fontSize >= 20 ? 4 : 1);
}

/**
 * Fits a complete song on one projection slide using the actual column width,
 * wrapped-line count and available height — not only its original line count.
 */
export function createSongSlideLayout(value: string): SongSlideLayout {
  const candidates: SongSlideLayout[] = [];

  for (const columnCount of [1, 2, 3]) {
    const columnWidth = getColumnWidth(columnCount);
    for (const fontSize of FONT_SIZES) {
      const lines = buildSongSlideLines(value, getCharactersPerLine(columnWidth, fontSize));
      const linesPerColumn = Math.ceil(lines.length / columnCount);
      if (linesPerColumn * getLineHeight(fontSize) <= SONG_SLIDE_CONTENT_HEIGHT_POINTS) {
        candidates.push({ columns: distributeSongLines(lines, columnCount), fontSize });
        break;
      }
    }
  }

  // Prefer fewer columns only when they stay comfortably readable. If a song
  // needs a denser layout, a larger font in another column is the better read.
  for (const minimumFontSize of [22, 18, 12]) {
    const readable = candidates
      .filter(candidate => candidate.fontSize >= minimumFontSize)
      .sort((a, b) => a.columns.length - b.columns.length || b.fontSize - a.fontSize);
    if (readable[0]) return readable[0];
  }

  const fallbackColumns = 3;
  const fallbackWidth = getColumnWidth(fallbackColumns);
  const fallbackFontSize = 10;
  const fallbackLines = buildSongSlideLines(value, getCharactersPerLine(fallbackWidth, fallbackFontSize));
  return { columns: distributeSongLines(fallbackLines, fallbackColumns), fontSize: fallbackFontSize };
}

export function sanitiseExportFilename(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Missa';
}
