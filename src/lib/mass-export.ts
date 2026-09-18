/**
 * Shared, presentation-safe helpers for Mass exports.
 *
 * The important rule here is that a projector should never have to trade
 * readability for completeness. Long verses are continued on a new slide
 * instead of silently shrinking the type.
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
const MARKDOWN_MARKERS = /\*\*|__|~~/g;

export function getMassMomentLabel(moment: string): string {
  return MASS_MOMENT_LABELS[moment] || moment.replaceAll('_', ' ').toLowerCase();
}

export function stripSongMarkup(value: string): string {
  return value
    .replace(/^\s*#mic#\s*\r?\n?/i, '')
    .replace(CHORD_TOKEN, '')
    .replace(MARKDOWN_MARKERS, '')
    .replace(/\r\n?/g, '\n');
}

export function normaliseLyricLine(value: string): string {
  return value
    .replace(CHORD_TOKEN, '')
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

export function sanitiseExportFilename(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Missa';
}
