import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import * as fs from 'fs';
import * as path from 'path';

const fontkit = require('fontkit');

const MOMENT_ORDER: Record<string, number> = {
  ENTRADA: 1, ATO_PENITENCIAL: 2, GLORIA: 3, SALMO_RESPONSORIAL: 4,
  ACLAMACAO_EVANGELHO: 5, OFERENDAS: 6, SANTO: 7, PAI_NOSSO: 8,
  SAUDACAO_PAZ: 9, CORDEIRO_DEUS: 10, COMUNHAO: 11, ACAO_GRACAS: 12,
  FINAL: 13, OUTRO: 99,
};

const MOMENT_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada', ATO_PENITENCIAL: 'Ato Penitencial', GLORIA: 'Glória',
  SALMO_RESPONSORIAL: 'Salmo Responsorial', ACLAMACAO_EVANGELHO: 'Aclamação ao Evangelho',
  OFERENDAS: 'Ofertório', SANTO: 'Santo', PAI_NOSSO: 'Pai Nosso',
  SAUDACAO_PAZ: 'Saudação da Paz', CORDEIRO_DEUS: 'Cordeiro de Deus',
  COMUNHAO: 'Comunhão', ACAO_GRACAS: 'Ação de Graças', FINAL: 'Final', OUTRO: 'Outro',
};

function stripChords(text: string): string {
  return text.replace(/\[[^\]]+\]/g, '').replace(/^#mic#\s*\n?/, '');
}

function splitVerses(text: string): string[] {
  const cleaned = text.replace(/^#mic#\s*\n?/, '').trim();
  return cleaned.split(/\n{2,}/).map(v => v.trim()).filter(v => v.length > 0);
}

function extractLyricLines(text: string): string[] {
  return stripChords(text).split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'lyrics';
    const includeHeader = searchParams.get('includeHeader') === '1';
    const includeNotes = searchParams.get('includeNotes') === '1';
    const includeMomentTitles = searchParams.get('includeMomentTitles') === '1';
    const pageBreakPerMoment = searchParams.get('pageBreakPerMoment') === '1';
    const fontSize = searchParams.get('fontSize') || 'medium';
    const oneVersePerSlide = searchParams.get('oneVersePerSlide') !== '0';

    const { data: massData, error } = await supabase
      .from('Mass')
      .select(`
        id, name, description, date, parish, celebrant, celebration, liturgicalColor,
        MassItem (
          id, moment, order, note, transpose,
          Song!MassItem_songId_fkey (
            id, title, author, capo,
            SongVersion!SongVersion_songId_fkey (sourceText, lyricsPlain, keyOriginal)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !massData) {
      return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    let font: any, boldFont: any;
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Regular.ttf');
      const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Bold.ttf');
      font = await pdfDoc.embedFont(fs.readFileSync(fontPath));
      boldFont = await pdfDoc.embedFont(fs.readFileSync(boldFontPath));
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    // ── Presentation format (16:9 slides, always light) ─────────────
    if (format === 'presentation') {
      const W = 960, H = 540;

      // Light-only palette
      const WHITE    = rgb(1, 1, 1);
      const TEXT_PRI = rgb(28/255, 25/255, 23/255);    // stone-900
      const TEXT_SEC = rgb(120/255, 113/255, 108/255);  // stone-500
      const TEXT_MUT = rgb(168/255, 162/255, 158/255);  // stone-400
      const ACCENT   = rgb(192/255, 57/255, 43/255);    // rose-700
      const SUBTLE   = rgb(214/255, 211/255, 209/255);  // stone-300

      let logoImage: any = null;
      try {
        logoImage = await pdfDoc.embedPng(fs.readFileSync(path.join(process.cwd(), 'public', 'cantolicoemail.png')));
      } catch { /* logo not found */ }

      const addSlide = () => {
        const p = pdfDoc.addPage([W, H]);
        p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
        return p;
      };

      const accentBars = (p: PDFPage) => {
        p.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: ACCENT });
        p.drawRectangle({ x: 0, y: 0, width: W, height: 4, color: ACCENT });
      };

      // Small logo badge in a corner — sleek, unobtrusive
      const logoBadge = (p: PDFPage, corner: 'top-right' | 'bottom-right') => {
        const s = 20; // logo size
        const m = 16; // margin from edges
        const bOff = 10; // offset from bar
        const lx = corner === 'top-right' ? W - m - s : W - m - s;
        const ly = corner === 'top-right' ? H - 4 - bOff - s : 4 + bOff;
        const cx = lx + s / 2, cy = ly + s / 2;

        p.drawCircle({ x: cx, y: cy, size: s / 2 + 3, color: WHITE, borderColor: SUBTLE, borderWidth: 1 });
        if (logoImage) {
          p.drawImage(logoImage, { x: lx, y: ly, width: s, height: s });
        }

        const brand = 'Cant\u00f3lico';
        const bw = font.widthOfTextAtSize(brand, 8);
        p.drawText(brand, { x: lx - bw - 5, y: cy - 4, size: 8, font, color: TEXT_MUT });
      };

      const drawCross = (p: PDFPage, cx: number, cy: number, sz: number) => {
        p.drawRectangle({ x: cx - sz * 0.1, y: cy - sz * 0.5, width: sz * 0.2, height: sz, color: ACCENT });
        p.drawRectangle({ x: cx - sz * 0.5, y: cy + sz * 0.1, width: sz, height: sz * 0.2, color: ACCENT });
      };

      // Draw one lyric line with **bold** support, returns the x endpoint
      const drawLyricLine = (p: PDFPage, line: string, x: number, y: number, sz: number, color: any) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/);
        let cx = x;
        for (const part of parts) {
          if (!part) continue;
          const isBold = /^\*\*[^*]+\*\*$/.test(part);
          const text = isBold ? part.replace(/\*\*/g, '') : part;
          if (!text) continue;
          p.drawText(text, { x: cx, y, size: sz, font: isBold ? boldFont : font, color });
          cx += (isBold ? boldFont : font).widthOfTextAtSize(text, sz);
        }
      };

      const measureLine = (line: string, sz: number): number => {
        const parts = line.split(/(\*\*[^*]+\*\*)/);
        let w = 0;
        for (const part of parts) {
          if (!part) continue;
          const isBold = /^\*\*[^*]+\*\*$/.test(part);
          const text = isBold ? part.replace(/\*\*/g, '') : part;
          if (!text) continue;
          w += (isBold ? boldFont : font).widthOfTextAtSize(text, sz);
        }
        return w;
      };

      // Find the largest font size where all lines fit in the available area
      const pickLyricSize = (lines: string[], maxW: number, maxH: number): number => {
        for (const sz of [26, 22, 19, 16, 13, 11]) {
          const lh = sz + 10;
          if (lines.length * lh > maxH) continue;
          if (lines.every(l => measureLine(l, sz) <= maxW)) return sz;
        }
        return 11;
      };

      // ── Cover slide ────────────────────────────────────────────────
      if (includeHeader) {
        const cover = addSlide();
        accentBars(cover);
        logoBadge(cover, 'top-right');

        // Mass title — centred, auto-sized
        let nameSize = 40;
        let nameLines = wrapText(massData.name, boldFont, nameSize, 820);
        if (nameLines.length > 2) { nameSize = 32; nameLines = wrapText(massData.name, boldFont, nameSize, 820); }

        const nameLH = nameSize + 14;
        // Vertical centre: content block sits around y=300 area
        const nameTopY = H / 2 + 70 + ((nameLines.length - 1) * nameLH) / 2;

        for (let i = 0; i < nameLines.length; i++) {
          const lw = boldFont.widthOfTextAtSize(nameLines[i], nameSize);
          cover.drawText(nameLines[i], {
            x: W / 2 - lw / 2,
            y: nameTopY - i * nameLH,
            size: nameSize, font: boldFont, color: TEXT_PRI,
          });
        }

        // Thin underline below title
        const underY = nameTopY - nameLines.length * nameLH - 4;
        cover.drawRectangle({ x: W / 2 - 52, y: underY, width: 104, height: 1, color: SUBTLE });

        // Meta lines
        const metaParts: string[] = [];
        if (massData.celebration) metaParts.push(massData.celebration);
        if (massData.date) {
          metaParts.push(new Date(massData.date).toLocaleDateString('pt-PT', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          }));
        }
        if (massData.parish) metaParts.push(massData.parish);

        let metaY = underY - 26;
        for (const part of metaParts) {
          const metaText = part;
          const mw = font.widthOfTextAtSize(metaText, 13);
          if (mw <= 860) {
            cover.drawText(metaText, { x: W / 2 - mw / 2, y: metaY, size: 13, font, color: TEXT_SEC });
          } else {
            // Long meta: wrap into two lines
            const wrapped = wrapText(metaText, font, 12, 840);
            for (const wl of wrapped) {
              const wlw = font.widthOfTextAtSize(wl, 12);
              cover.drawText(wl, { x: W / 2 - wlw / 2, y: metaY, size: 12, font, color: TEXT_SEC });
              metaY -= 19;
            }
            continue;
          }
          metaY -= 22;
        }

        // Bottom quote
        const quote = 'Qui bene cantat, bis orat';
        const qw = font.widthOfTextAtSize(quote, 10);
        cover.drawText(quote, { x: W / 2 - qw / 2, y: 68, size: 10, font, color: TEXT_MUT });
      }

      // ── Sort and group items ───────────────────────────────────────
      const sorted = [...(massData.MassItem || [])].sort((a: any, b: any) => {
        const oA = MOMENT_ORDER[a.moment] ?? 99;
        const oB = MOMENT_ORDER[b.moment] ?? 99;
        return oA !== oB ? oA - oB : (a.order ?? 0) - (b.order ?? 0);
      });

      const byMoment: Record<string, any[]> = {};
      for (const item of sorted) {
        if (!byMoment[item.moment]) byMoment[item.moment] = [];
        byMoment[item.moment].push(item);
      }

      const moments = Object.keys(byMoment);

      // Lyric area geometry (right portion of slide)
      const LYRIC_X    = 210; // lyrics start here (right column)
      const LYRIC_RMAX = 920; // right edge
      const LYRIC_W    = LYRIC_RMAX - LYRIC_X;
      const LYRIC_TOP  = H - 72;
      const LYRIC_BOT  = 40;
      const LYRIC_H    = LYRIC_TOP - LYRIC_BOT;
      const LYRIC_MID  = LYRIC_BOT + LYRIC_H / 2;

      for (let mIdx = 0; mIdx < moments.length; mIdx++) {
        const moment = moments[mIdx];
        const momentLabel = MOMENT_LABELS[moment] || moment.replace(/_/g, ' ');

        // ── Interlude slide between moments (not before the first) ──
        if (mIdx > 0 && includeMomentTitles) {
          const ms = addSlide();
          // Subtle horizontal rules instead of bold bars
          ms.drawRectangle({ x: 0, y: H - 2, width: W, height: 2, color: SUBTLE });
          ms.drawRectangle({ x: 0, y: 0, width: W, height: 2, color: SUBTLE });

          // Logo badge bottom-right
          logoBadge(ms, 'bottom-right');

          // Cross above title
          drawCross(ms, W / 2, H / 2 + 60, 22);

          // Mass title
          const mtLines = wrapText(massData.name, boldFont, 28, 760);
          const mtLH = 42;
          const mtTopY = H / 2 + 12 + ((mtLines.length - 1) * mtLH) / 2;
          for (let i = 0; i < mtLines.length; i++) {
            const lw = boldFont.widthOfTextAtSize(mtLines[i], 28);
            ms.drawText(mtLines[i], { x: W / 2 - lw / 2, y: mtTopY - i * mtLH, size: 28, font: boldFont, color: TEXT_PRI });
          }

          // Thin divider
          const divY = H / 2 - 18 - mtLines.length * mtLH / 2;
          ms.drawRectangle({ x: W / 2 - 40, y: divY, width: 80, height: 1, color: SUBTLE });

          // Mass info
          const infoParts: string[] = [];
          if (massData.celebration) infoParts.push(massData.celebration);
          if (massData.date) {
            infoParts.push(new Date(massData.date).toLocaleDateString('pt-PT', {
              day: '2-digit', month: 'long', year: 'numeric',
            }));
          }
          if (massData.parish) infoParts.push(massData.parish);

          const infoText = infoParts.join('  \u00b7  ');
          if (infoText) {
            const iw = font.widthOfTextAtSize(infoText, 12);
            const ix = iw <= 880 ? W / 2 - iw / 2 : 40;
            ms.drawText(infoText.slice(0, 100), { x: ix, y: divY - 24, size: 12, font, color: TEXT_MUT });
          }
        }

        // ── Songs in this moment ──────────────────────────────────
        for (const item of byMoment[moment]) {
          const song = item.Song;
          if (!song) continue;
          const version = song.SongVersion?.[0];
          const rawText = version?.lyricsPlain || version?.sourceText || '';
          if (!rawText) continue;

          const cleanText = stripChords(rawText);

          // Render one or more lyric slides for a block of lines
          const renderLyricSlides = (lines: string[], slideNumber?: number, totalSlides?: number) => {
            const sz = pickLyricSize(lines, LYRIC_W, LYRIC_H);
            const lh = sz + 10;
            const linesPerSlide = Math.max(1, Math.floor(LYRIC_H / lh));

            // Split into chunks if needed
            const chunks: string[][] = [];
            for (let i = 0; i < lines.length; i += linesPerSlide) {
              chunks.push(lines.slice(i, i + linesPerSlide));
            }

            chunks.forEach((chunk, chunkIdx) => {
              const ls = addSlide();

              // Thin left accent bar
              ls.drawRectangle({ x: 0, y: 34, width: 3, height: H - 70, color: ACCENT, opacity: 0.55 });

              // Song title label top-left
              const label = chunkIdx > 0 ? `${song.title} (cont.)` : song.title;
              ls.drawText(label, { x: 20, y: H - 38, size: 10, font: boldFont, color: TEXT_MUT });

              // Moment label top-right (small, accent)
              const mlw = font.widthOfTextAtSize(momentLabel, 8);
              ls.drawText(momentLabel, { x: W - mlw - 20, y: H - 38, size: 8, font, color: ACCENT });

              // Verse / slide counter (if multiple)
              if (totalSlides && totalSlides > 1) {
                const vsLabel = `${slideNumber} / ${totalSlides}`;
                const vslw = font.widthOfTextAtSize(vsLabel, 8);
                ls.drawText(vsLabel, { x: W - vslw - 20, y: 20, size: 8, font, color: TEXT_MUT });
              } else if (chunks.length > 1) {
                const pg = `${chunkIdx + 1} / ${chunks.length}`;
                const pgw = font.widthOfTextAtSize(pg, 8);
                ls.drawText(pg, { x: W - pgw - 20, y: 20, size: 8, font, color: TEXT_MUT });
              }

              // Vertical-centre the lyrics block
              const blockH = chunk.length * lh;
              const startY = LYRIC_MID + blockH / 2 - sz * 0.2;

              for (let i = 0; i < chunk.length; i++) {
                drawLyricLine(ls, chunk[i], LYRIC_X, startY - i * lh, sz, TEXT_PRI);
              }
            });
          };

          if (oneVersePerSlide) {
            const verses = splitVerses(cleanText);
            verses.forEach((verse, vi) => {
              const lines = verse.split('\n').filter(l => l.trim().length > 0);
              renderLyricSlides(lines, vi + 1, verses.length);
            });
          } else {
            const lines = extractLyricLines(rawText);
            renderLyricSlides(lines);
          }

          // Note slide
          if (includeNotes && item.note) {
            const ns = addSlide();
            ns.drawRectangle({ x: 0, y: 34, width: 3, height: H - 70, color: ACCENT, opacity: 0.55 });
            ns.drawText('NOTA', { x: 20, y: H - 38, size: 10, font: boldFont, color: ACCENT });

            const noteLines = wrapText(item.note, font, 20, 840);
            const noteLH = 32;
            let ny = H / 2 + (noteLines.length * noteLH) / 2;
            for (const nl of noteLines) {
              const nlw = font.widthOfTextAtSize(nl, 20);
              ns.drawText(nl, { x: W / 2 - nlw / 2, y: ny, size: 20, font, color: TEXT_PRI });
              ny -= noteLH;
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(massData.name)} - Apresentacao.pdf"`,
        },
      });
    }

    // ── Portrait PDF (lyrics / chords) ───────────────────────────────
    const pageWidth = 595.28, pageHeight = 841.89;
    const margin = 50;
    const baseFontSize = fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12;
    const chordFontSize = baseFontSize - 1;
    const lineHeight = baseFontSize + 6;

    const itemsByMoment: Record<string, any> = {};
    for (const item of massData.MassItem) {
      if (!itemsByMoment[item.moment]) itemsByMoment[item.moment] = [];
      itemsByMoment[item.moment].push(item);
    }

    const drawFooter = (pg: PDFPage) => {
      pg.drawText('cantolico.pt', {
        x: pageWidth / 2 - 38, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6),
      });
    };

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    if (includeHeader) {
      const dateStr = massData.date
        ? new Date(massData.date).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const descStr = massData.celebration || '';
      const headerLine = `${dateStr}${dateStr && descStr ? ' \u00b7 ' : ''}${descStr}`;
      const headerFontSize = baseFontSize - 2;
      const headerTextWidth = boldFont.widthOfTextAtSize(headerLine, headerFontSize);
      page.drawText(headerLine, { x: (pageWidth - headerTextWidth) / 2, y, size: headerFontSize, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
      y -= headerFontSize + 8;
      const titleFontSize = baseFontSize + 8;
      const titleTextWidth = boldFont.widthOfTextAtSize(massData.name, titleFontSize);
      page.drawText(massData.name, { x: (pageWidth - titleTextWidth) / 2, y, size: titleFontSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= titleFontSize + 12;
    }

    for (const moment of Object.keys(itemsByMoment)) {
      if (y < margin + 120) {
        drawFooter(page);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      if (includeMomentTitles) {
        const momentTitle = moment.replaceAll('_', ' ');
        const momentFontSize = baseFontSize + 2;
        const momentTextWidth = boldFont.widthOfTextAtSize(momentTitle, momentFontSize);
        page.drawText(momentTitle, { x: (pageWidth - momentTextWidth) / 2, y, size: momentFontSize, font: boldFont, color: rgb(0.2, 0.3, 0.5) });
        y -= momentFontSize + 6;
      }
      for (const item of itemsByMoment[moment]) {
        const song = item.Song;
        if (!song) continue;
        const version = song.SongVersion?.[0];
        let text = format === 'chords' ? version?.sourceText || '' : version?.lyricsPlain || '';
        if (!text) continue;

        const songFontSize = baseFontSize + 1;
        const songTextWidth = boldFont.widthOfTextAtSize(song.title, songFontSize);
        page.drawText(song.title, { x: (pageWidth - songTextWidth) / 2, y, size: songFontSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        y -= songFontSize + 6;

        const lines = text.split('\n');
        const lyricsLeftMargin = margin + 10;
        const lyricsLineHeight = baseFontSize + 1;
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          let lineFont = font;
          let isBold = false;
          if (format === 'chords') {
            if (/\[[A-G][^\]]*\]/.test(line)) {
              let chordLine = '';
              let lastIdx = 0;
              for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
                chordLine += ' '.repeat(m.index - lastIdx) + m[1];
                lastIdx = m.index + m[0].length;
              }
              page.drawText(chordLine, { x: lyricsLeftMargin, y, size: chordFontSize, font: boldFont, color: rgb(0.1, 0.4, 0.7) });
              y -= lyricsLineHeight;
              line = line.replace(/\[[^\]]+\]/g, '');
            }
            page.drawText(line, { x: lyricsLeftMargin, y, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
            y -= lyricsLineHeight;
          } else {
            line = line.replace(/\[[^\]]+\]/g, '');
            const boldParts = line.split(/(\*\*[^*]+\*\*)/);
            let textX = lyricsLeftMargin;
            for (const part of boldParts) {
              isBold = !!part.match(/^\*\*[^*]+\*\*$/);
              lineFont = isBold ? boldFont : font;
              const partText = isBold ? part.replace(/\*\*/g, '') : part;
              page.drawText(partText, { x: textX, y, size: baseFontSize, font: lineFont, color: rgb(0.15, 0.15, 0.15) });
              textX += lineFont.widthOfTextAtSize(partText, baseFontSize);
            }
            y -= lyricsLineHeight;
          }
        }
        y -= 6;
        if (includeNotes && item.note) {
          page.drawText('Nota: ' + item.note, { x: pageWidth / 2 - 60, y, size: baseFontSize - 2, font, color: rgb(0.5, 0.2, 0.2) });
          y -= lineHeight;
        }
        y -= 8;
      }
      if (pageBreakPerMoment) {
        drawFooter(page);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    drawFooter(page);
    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(massData.name)} - Missa.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao exportar PDF da missa:', error);
    return NextResponse.json({ error: 'Erro ao exportar PDF da missa' }, { status: 500 });
  }
}
