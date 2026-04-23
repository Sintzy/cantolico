import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { transposeText, detectKey } from '@/lib/chord-processor';
import { parseMomentsFromPostgreSQL } from '@/lib/utils';
import { LiturgicalMoment } from '@/lib/constants';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontkit = require('fontkit');

const getMomentDisplayName = (momentKey: string): string =>
  LiturgicalMoment[momentKey as keyof typeof LiturgicalMoment] || momentKey.replaceAll('_', ' ');

// Chord-only line: optional parens, one or more [Chord] tokens
const CHORD_ONLY_RE = /^(\s*\(?\s*\[[A-G][#b]?[^\]]*\]\s*\)?\s*)+\s*$/;
// Section header alone: Intro, Ponte, Refrão…
const SECTION_ONLY_RE = /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude|Refrão|Estrofe|Verso|Chorus|Verse|Pre-Chorus|Coda|Pré-Refrão)(:?)?\s*$/i;
// Section header followed by chord tokens on the same line: "Intro: [C] [G]"
const SECTION_WITH_CHORDS_RE = /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude|Refrão|Estrofe|Verso|Chorus|Verse|Pre-Chorus|Coda|Pré-Refrão):\s*((\s*\(?\s*\[[A-G][#b]?[^\]]*\]\s*\)?\s*)+)\s*$/i;

const stripChords = (line: string) => line.replace(/\[[A-G][#b]?[^\]]*\]/g, '');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const transposition = parseInt(searchParams.get('transposition') || '0');
    const showChords = searchParams.get('showChords') !== 'false';
    const fontSizeParam = searchParams.get('fontSize') || 'medium';
    const baseFontSize = fontSizeParam === 'small' ? 10 : fontSizeParam === 'large' ? 13 : 11;

    const { data: songData, error: songError } = await supabase
      .from('Song')
      .select('id, title, author, tags, moments, mainInstrument, currentVersionId')
      .or(`id.eq.${id},slug.eq.${id}`)
      .limit(1);

    if (songError || !songData || songData.length === 0) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const song = songData[0];

    const { data: versionData, error: versionError } = await supabase
      .from('SongVersion')
      .select('sourceText, sourceType')
      .eq('id', song.currentVersionId)
      .limit(1);

    if (versionError || !versionData || versionData.length === 0) {
      return NextResponse.json({ error: 'Versão da música não encontrada' }, { status: 404 });
    }

    const version = versionData[0];

    const pdfDoc = await PDFDocument.create();
    try { pdfDoc.registerFontkit(fontkit); } catch {}

    const page = pdfDoc.addPage([595.28, 841.89]);

    let font: any, boldFont: any;
    try {
      const fontBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Regular.ttf'));
      const boldFontBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Bold.ttf'));
      font = await pdfDoc.embedFont(fontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    let logoImage: any;
    try {
      const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'cantolicoemail.png'));
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {}

    const { width } = page.getSize();
    let y = page.getSize().height - 40;

    // Logo
    if (logoImage) {
      const logoSize = 30;
      page.drawImage(logoImage, { x: width / 2 - logoSize / 2, y: y - logoSize, width: logoSize, height: logoSize });
      y -= logoSize + 15;
    } else {
      page.drawText('Cantolico', { x: width / 2 - 30, y, size: 12, font: boldFont, color: rgb(0.2, 0.4, 0.8) });
      y -= 25;
    }

    y -= 10;

    // Title
    const titleFontSize = Math.min(22, Math.max(16, 350 / song.title.length));
    page.drawText(song.title, {
      x: (width - song.title.length * titleFontSize * 0.6) / 2,
      y,
      size: titleFontSize,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 28;

    // Author
    if (song.author) {
      page.drawText(`por ${song.author}`, { x: 60, y, size: 11, font, color: rgb(0.45, 0.45, 0.45) });
      y -= 20;
    }

    // Key
    const originalKey = detectKey(version.sourceText || '');
    let currentKey = originalKey;
    if (transposition !== 0 && originalKey) {
      const keyMap: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
        'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
      };
      const reverseKeyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const orig = keyMap[originalKey];
      if (orig !== undefined) currentKey = reverseKeyMap[(orig + transposition + 12) % 12];
    }

    // Moments + key row
    const momentsArray = parseMomentsFromPostgreSQL(song.moments);
    if ((momentsArray && momentsArray.length > 0) || currentKey) {
      if (momentsArray?.length) {
        page.drawText(momentsArray.map((m: string) => getMomentDisplayName(m)).join(' • '), {
          x: 60, y, size: 10, font, color: rgb(0.5, 0.5, 0.5),
        });
      }
      if (currentKey) {
        const keyText = `Tom: ${currentKey}`;
        page.drawText(keyText, {
          x: width - 60 - keyText.length * 6, y, size: 10, font: boldFont, color: rgb(0.2, 0.5, 0.8),
        });
      }
      y -= 16;
    }

    y -= 14;

    // Source text
    let sourceText = (version.sourceText || '').replace(/^#mic#\s*\n?/, '').trim();
    if (transposition !== 0) sourceText = transposeText(sourceText, transposition);

    // ─── Rendering helpers ────────────────────────────────────────────────────
    const lineHeight = baseFontSize + 3;

    // Word-wrap a plain text string into lines that fit within maxWidth px
    const wrapWords = (text: string, maxWidth: number): string[] => {
      const avgCharWidth = baseFontSize * 0.62;
      if (text.length * avgCharWidth <= maxWidth) return [text];
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length * avgCharWidth <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          // Single word longer than column — force it on its own line
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [text];
    };
    const chordSize = baseFontSize - 1;
    const chordLift = chordSize + 2;

    const drawChordToken = (chord: string, cx: number, cy: number, maxX: number): number => {
      if (cx >= maxX) return cx;
      page.drawText(chord, { x: cx, y: cy, size: chordSize, font: boldFont, color: rgb(0.1, 0.4, 0.7) });
      return cx + chord.length * (chordSize * 0.7) + 12;
    };

    const drawParenToken = (ch: string, cx: number, cy: number, maxX: number): number => {
      if (cx >= maxX) return cx;
      page.drawText(ch, { x: cx, y: cy, size: chordSize, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
      return cx + chordSize * 0.4;
    };

    // Render a string that contains [Chord] tokens at a given Y; returns final X
    const renderChordTokens = (raw: string, startX: number, cy: number, maxX: number): number => {
      let cx = startX;
      let i = 0;
      while (i < raw.length) {
        const ch = raw[i];
        if (ch === ' ' || ch === '\t') { cx += 6; i++; continue; }
        if (ch === '(') { cx = drawParenToken('(', cx, cy, maxX); i++; continue; }
        if (ch === ')') { cx = drawParenToken(')', cx, cy, maxX); i++; continue; }
        if (ch === '[') {
          const close = raw.indexOf(']', i);
          if (close !== -1) {
            cx = drawChordToken(raw.substring(i + 1, close), cx, cy, maxX);
            i = close + 1;
            continue;
          }
        }
        i++;
      }
      return cx;
    };

    const renderLine = (line: string, x: number, currentY: number, colWidth: number): number => {
      const maxX = x + colWidth;

      if (!line.trim()) return currentY - lineHeight / 2;

      // 1. Section header alone — "Intro", "Refrão:", etc.
      if (SECTION_ONLY_RE.test(line.trim())) {
        const label = line.trim().replace(/:?\s*$/, '');
        page.drawText(label, { x, y: currentY, size: baseFontSize + 1, font: boldFont, color: rgb(0.2, 0.3, 0.5) });
        return currentY - lineHeight - 5;
      }

      // 2. Section label + chords on same line — "Intro: [C] [G] [Am]"
      const scMatch = SECTION_WITH_CHORDS_RE.exec(line.trim());
      if (scMatch) {
        const label = scMatch[1] + ':';
        page.drawText(label, { x, y: currentY, size: baseFontSize + 1, font: boldFont, color: rgb(0.2, 0.3, 0.5) });
        if (showChords) {
          const lw = label.length * (baseFontSize + 1) * 0.62 + 10;
          renderChordTokens(scMatch[2], x + lw, currentY, maxX);
        }
        return currentY - lineHeight - 5;
      }

      // 3. Chord-only line (no lyrics)
      if (CHORD_ONLY_RE.test(line.trim())) {
        if (showChords) renderChordTokens(line.trim(), x, currentY, maxX);
        return showChords ? currentY - lineHeight : currentY;
      }

      // 4. Mixed line: chords inline with lyrics
      if (showChords && line.includes('[') && line.includes(']')) {
        let tx = x;
        let i = 0;
        while (i < line.length) {
          const ch = line[i];

          if (ch === '(' && /^\s*\[/.test(line.substring(i + 1))) {
            tx = drawParenToken('(', tx, currentY + chordLift, maxX);
            i++; continue;
          }
          if (ch === ')' && /\]\s*$/.test(line.substring(0, i))) {
            tx = drawParenToken(')', tx, currentY + chordLift, maxX);
            i++; continue;
          }
          if (ch === '[') {
            const close = line.indexOf(']', i);
            if (close !== -1) {
              const chord = line.substring(i + 1, close);
              if (/^[A-G]/.test(chord)) tx = drawChordToken(chord, tx, currentY + chordLift, maxX);
              i = close + 1; continue;
            }
          }

          // Accumulate plain text
          let end = i;
          while (end < line.length) {
            const nc = line[end];
            if (nc === '[') break;
            if (nc === '(' && /^\s*\[/.test(line.substring(end + 1))) break;
            if (nc === ')' && /\]\s*$/.test(line.substring(0, end))) break;
            end++;
          }
          if (end > i) {
            const seg = line.substring(i, end);
            if (seg.trim() && tx + seg.length * (baseFontSize * 0.62) <= maxX) {
              page.drawText(seg, { x: tx, y: currentY, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
              tx += seg.length * (baseFontSize * 0.62);
            }
            i = end; continue;
          }
          i++;
        }
        return currentY - lineHeight - chordLift;
      }

      // 5. Plain text (strip chords if showChords=false) — word-wrapped
      const textLine = (showChords ? line : stripChords(line)).trim();
      if (textLine) {
        const wrapped = wrapWords(textLine, colWidth);
        let cy = currentY;
        for (const wl of wrapped) {
          if (wl.includes('**')) {
            let tx = x;
            for (const part of wl.split(/(\*\*[^*]+\*\*)/)) {
              if (/^\*\*[^*]+\*\*$/.test(part)) {
                const bold = part.replace(/\*\*/g, '');
                page.drawText(bold, { x: tx, y: cy, size: baseFontSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
                tx += bold.length * (baseFontSize * 0.65);
              } else if (part.trim()) {
                page.drawText(part, { x: tx, y: cy, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
                tx += part.length * (baseFontSize * 0.62);
              }
            }
          } else {
            page.drawText(wl, { x, y: cy, size: baseFontSize, font, color: rgb(0.15, 0.15, 0.15) });
          }
          cy -= lineHeight;
        }
        return cy;
      }

      return currentY;
    };

    // ─── Height estimation (column-width aware) ───────────────────────────────
    const estimateHeight = (text: string, colWidth: number): number => {
      let h = 0;
      for (const raw of text.split('\n')) {
        const t = raw.trim();
        if (!t) { h += lineHeight / 2; continue; }
        if (SECTION_ONLY_RE.test(t) || SECTION_WITH_CHORDS_RE.test(t)) { h += lineHeight + 5; continue; }
        if (CHORD_ONLY_RE.test(t)) { h += showChords ? lineHeight : 0; continue; }
        if (showChords && t.includes('[') && t.includes(']')) { h += lineHeight + chordLift; continue; }
        // Plain text — account for word wrapping
        const plain = (showChords ? t : stripChords(t)).trim();
        if (plain) {
          const numLines = wrapWords(plain, colWidth).length;
          h += lineHeight * numLines;
        }
      }
      return h;
    };

    // ─── Multi-column layout ──────────────────────────────────────────────────
    const renderContent = (text: string, startY: number) => {
      const lines = text.split('\n');
      const available = startY - 80;
      const leftMargin = 50;
      const totalWidth = width - 100;

      if (estimateHeight(text, totalWidth) <= available) {
        let cy = startY;
        for (const line of lines) {
          cy = renderLine(line, leftMargin, cy, totalWidth);
          if (cy < 80) break;
        }
        return;
      }

      // Two-column: find split point at an empty line near the midpoint
      const colWidth = (totalWidth - 30) / 2;
      const targetMid = Math.ceil(lines.length / 2);
      let splitAt = targetMid;
      for (let r = 1; r <= 15; r++) {
        if (targetMid - r >= 0 && !lines[targetMid - r]?.trim()) { splitAt = targetMid - r; break; }
        if (targetMid + r < lines.length && !lines[targetMid + r]?.trim()) { splitAt = targetMid + r; break; }
      }

      let ly = startY;
      for (const line of lines.slice(0, splitAt)) {
        ly = renderLine(line, leftMargin, ly, colWidth);
        if (ly < 80) break;
      }
      let ry = startY;
      for (const line of lines.slice(splitAt)) {
        ry = renderLine(line, leftMargin + colWidth + 30, ry, colWidth);
        if (ry < 80) break;
      }
    };

    renderContent(sourceText, y);

    // Footer
    page.drawText('cantolico.pt', { x: width / 2 - 38, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(song.title)} - Cantolico.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
