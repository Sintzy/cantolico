import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import pptxgen from 'pptxgenjs';

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
  const verses = cleaned.split(/\n{2,}/);
  return verses.map(v => v.trim()).filter(v => v.length > 0);
}

// Returns lines without chord brackets, preserving lyric lines
function extractLyricLines(text: string): string[] {
  const clean = stripChords(text);
  return clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'lyrics';
    const includeHeader = searchParams.get('includeHeader') !== '0';
    const includeNotes = searchParams.get('includeNotes') !== '0';
    const includeMomentTitles = searchParams.get('includeMomentTitles') !== '0';
    const oneVersePerSlide = searchParams.get('oneVersePerSlide') !== '0';
    const theme = searchParams.get('theme') || 'dark';

    const isDark = theme === 'dark';

    // Theme colors
    const BG = isDark ? '0d0d1a' : 'ffffff';
    const TEXT_PRIMARY = isDark ? 'f5f0e8' : '1c1917';
    const TEXT_SECONDARY = isDark ? 'a8a29e' : '78716c';
    const ACCENT = 'c0392b'; // rose-700 equivalent
    const MOMENT_COLOR = isDark ? 'd4c5b0' : '44403c';
    const CHORD_COLOR = isDark ? 'f59e0b' : 'b45309'; // amber

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

    const pptx = new pptxgen();
    pptx.author = 'Cantólico';
    pptx.company = 'Cantólico';
    pptx.title = massData.name;
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

    const W = 13.33;
    const H = 7.5;

    const addBackground = (slide: pptxgen.Slide) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: H,
        fill: { color: BG },
        line: { color: BG },
      });
    };

    const addCross = (slide: pptxgen.Slide, x: number, y: number, size = 0.14, color = ACCENT) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: x + size * 0.4, y, w: size * 0.2, h: size,
        fill: { color }, line: { color },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x, y: y + size * 0.2, w: size, h: size * 0.2,
        fill: { color }, line: { color },
      });
    };

    const addFooter = (slide: pptxgen.Slide, songTitle?: string) => {
      if (songTitle) {
        slide.addText(songTitle, {
          x: 0.6, y: H - 0.42, w: W - 1.5, h: 0.3,
          fontSize: 8.5,
          color: isDark ? '4a4560' : 'c4bfbb',
          fontFace: 'Helvetica',
          italic: true,
          align: 'left',
          valign: 'middle',
        });
      }
      slide.addText('cantolico.pt ✝', {
        x: W - 1.6, y: H - 0.42, w: 1.4, h: 0.3,
        fontSize: 8.5,
        color: isDark ? '3a3550' : 'd6d3d1',
        fontFace: 'Helvetica',
        align: 'right',
        valign: 'middle',
      });
    };

    // ── Cover slide ──────────────────────────────────────────────────
    if (includeHeader) {
      const cover = pptx.addSlide();
      addBackground(cover);

      // Decorative top accent line
      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.06,
        fill: { color: ACCENT }, line: { color: ACCENT },
      });

      // Cross symbol
      addCross(cover, W / 2 - 0.07, 1.6, 0.18, ACCENT);

      // Mass name
      cover.addText(massData.name, {
        x: 1.0, y: 2.1, w: W - 2.0, h: 1.4,
        fontSize: 40,
        bold: true,
        color: TEXT_PRIMARY,
        fontFace: 'Helvetica',
        align: 'center',
        valign: 'middle',
      });

      const metaLines: string[] = [];
      if (massData.celebration) metaLines.push(massData.celebration);
      if (massData.date) {
        metaLines.push(new Date(massData.date).toLocaleDateString('pt-PT', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }));
      }
      if (massData.parish) metaLines.push(massData.parish);

      if (metaLines.length > 0) {
        cover.addText(metaLines.join('  ·  '), {
          x: 1.0, y: 3.6, w: W - 2.0, h: 0.6,
          fontSize: 15,
          color: TEXT_SECONDARY,
          fontFace: 'Helvetica',
          align: 'center',
          valign: 'middle',
        });
      }

      // Divider line
      cover.addShape(pptx.ShapeType.rect, {
        x: W / 2 - 0.8, y: 4.5, w: 1.6, h: 0.02,
        fill: { color: isDark ? '3a3550' : 'd6d3d1' }, line: { color: isDark ? '3a3550' : 'd6d3d1' },
      });

      cover.addText('Qui bene cantat, bis orat', {
        x: 1.0, y: 4.7, w: W - 2.0, h: 0.4,
        fontSize: 11,
        color: isDark ? '4a4560' : 'b0a89e',
        fontFace: 'Helvetica',
        italic: true,
        align: 'center',
      });

      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: H - 0.06, w: W, h: 0.06,
        fill: { color: ACCENT }, line: { color: ACCENT },
      });
    }

    // ── Sort and group items ─────────────────────────────────────────
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

    // ── Moment + song slides ─────────────────────────────────────────
    for (const moment of Object.keys(byMoment)) {
      const momentLabel = MOMENT_LABELS[moment] || moment.replace(/_/g, ' ');

      // Moment title slide
      if (includeMomentTitles) {
        const ms = pptx.addSlide();
        addBackground(ms);
        ms.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: W, h: 0.06,
          fill: { color: ACCENT }, line: { color: ACCENT },
        });
        addCross(ms, W / 2 - 0.07, H / 2 - 0.55, 0.14, ACCENT);
        ms.addText(momentLabel, {
          x: 1.0, y: H / 2 - 0.2, w: W - 2.0, h: 0.8,
          fontSize: 32,
          bold: true,
          color: MOMENT_COLOR,
          fontFace: 'Helvetica',
          align: 'center',
          valign: 'middle',
          charSpacing: 2,
        });
        ms.addShape(pptx.ShapeType.rect, {
          x: W / 2 - 0.8, y: H / 2 + 0.65, w: 1.6, h: 0.02,
          fill: { color: isDark ? '3a3550' : 'd6d3d1' }, line: { color: isDark ? '3a3550' : 'd6d3d1' },
        });
        addFooter(ms);
      }

      for (const item of byMoment[moment]) {
        const song = item.Song;
        if (!song) continue;
        const version = song.SongVersion?.[0];
        const rawText = format === 'chords'
          ? (version?.sourceText || version?.lyricsPlain || '')
          : (version?.lyricsPlain || version?.sourceText || '');
        if (!rawText) continue;

        // Song title slide
        const titleSlide = pptx.addSlide();
        addBackground(titleSlide);
        titleSlide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: W, h: 0.06,
          fill: { color: ACCENT }, line: { color: ACCENT },
        });

        const songMeta: string[] = [];
        if (song.author) songMeta.push(song.author);
        if (song.capo && song.capo > 0) songMeta.push(`Capo ${song.capo}`);

        addCross(titleSlide, W / 2 - 0.07, H / 2 - 0.7, 0.14, ACCENT);
        titleSlide.addText(song.title, {
          x: 1.0, y: H / 2 - 0.25, w: W - 2.0, h: 0.9,
          fontSize: 36,
          bold: true,
          color: TEXT_PRIMARY,
          fontFace: 'Helvetica',
          align: 'center',
          valign: 'middle',
        });
        if (songMeta.length > 0) {
          titleSlide.addText(songMeta.join('  ·  '), {
            x: 1.0, y: H / 2 + 0.7, w: W - 2.0, h: 0.4,
            fontSize: 12,
            color: TEXT_SECONDARY,
            fontFace: 'Helvetica',
            align: 'center',
          });
        }
        addFooter(titleSlide, momentLabel);

        // Lyric slides
        if (oneVersePerSlide) {
          const verses = splitVerses(format === 'chords' ? rawText : stripChords(rawText));
          for (const verse of verses) {
            const lyricSlide = pptx.addSlide();
            addBackground(lyricSlide);

            lyricSlide.addText(song.title, {
              x: 0.6, y: 0.25, w: W - 1.2, h: 0.45,
              fontSize: 13,
              bold: true,
              color: isDark ? '5a5580' : 'c4bfbb',
              fontFace: 'Helvetica',
              align: 'left',
            });

            // Accent top-left dash
            lyricSlide.addShape(pptx.ShapeType.rect, {
              x: 0.6, y: 0.72, w: 0.3, h: 0.025,
              fill: { color: ACCENT }, line: { color: ACCENT },
            });

            const lines = verse.split('\n');
            const FONT_SIZE = 24;
            const LINE_H = 0.44;
            const totalH = lines.length * LINE_H;
            const startY = Math.max(1.0, (H - totalH) / 2 - 0.2);

            if (format === 'chords') {
              // Render chord lines in amber and lyric lines in primary
              let y = startY;
              for (const line of lines) {
                const isChordLine = /^\s*(?:\[[A-G][^\]]*\]\s*)+\s*$/.test(line);
                if (isChordLine) {
                  const chordDisplay = line.replace(/\[([^\]]+)\]/g, '$1 ').trim();
                  lyricSlide.addText(chordDisplay, {
                    x: 0.7, y, w: W - 1.4, h: LINE_H * 0.7,
                    fontSize: 14,
                    bold: true,
                    color: CHORD_COLOR,
                    fontFace: 'Helvetica',
                    align: 'center',
                  });
                  y += LINE_H * 0.7;
                } else {
                  const lyricLine = line.replace(/\[[^\]]+\]/g, '');
                  lyricSlide.addText(lyricLine, {
                    x: 0.7, y, w: W - 1.4, h: LINE_H,
                    fontSize: FONT_SIZE,
                    color: TEXT_PRIMARY,
                    fontFace: 'Helvetica',
                    align: 'center',
                  });
                  y += LINE_H;
                }
              }
            } else {
              lyricSlide.addText(verse, {
                x: 0.7, y: startY, w: W - 1.4, h: totalH + 0.3,
                fontSize: FONT_SIZE,
                color: TEXT_PRIMARY,
                fontFace: 'Helvetica',
                align: 'center',
                valign: 'middle',
                paraSpaceAfter: 2,
              });
            }

            addFooter(lyricSlide, song.title);
          }
        } else {
          // All lyrics on one slide (scrollable not great for ppt, but preserves compact view)
          const lyricSlide = pptx.addSlide();
          addBackground(lyricSlide);
          lyricSlide.addText(song.title, {
            x: 0.6, y: 0.25, w: W - 1.2, h: 0.45,
            fontSize: 13, bold: true,
            color: isDark ? '5a5580' : 'c4bfbb',
            fontFace: 'Helvetica', align: 'left',
          });
          const lines = extractLyricLines(rawText);
          const fontSize = lines.length > 20 ? 12 : lines.length > 12 ? 15 : 18;
          lyricSlide.addText(lines.join('\n'), {
            x: 0.7, y: 0.9, w: W - 1.4, h: H - 1.5,
            fontSize, color: TEXT_PRIMARY, fontFace: 'Helvetica',
            align: 'center', valign: 'top',
          });
          addFooter(lyricSlide, song.title);
        }

        // Note slide
        if (includeNotes && item.note) {
          const noteSlide = pptx.addSlide();
          addBackground(noteSlide);
          noteSlide.addText('Nota', {
            x: 0.6, y: 0.3, w: 2, h: 0.4,
            fontSize: 11, color: ACCENT, fontFace: 'Helvetica', bold: true,
          });
          noteSlide.addText(item.note, {
            x: 0.7, y: 1.0, w: W - 1.4, h: H - 2.0,
            fontSize: 20, color: TEXT_PRIMARY, fontFace: 'Helvetica',
            align: 'center', valign: 'middle',
          });
          addFooter(noteSlide, song.title);
        }
      }
    }

    const pptxBytes = await pptx.write({ outputType: 'arraybuffer' });
    return new NextResponse(Buffer.from(pptxBytes as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(massData.name)} - Missa.pptx"`,
      },
    });
  } catch (err) {
    console.error('Erro ao exportar PPTX:', err);
    return NextResponse.json({ error: 'Erro ao exportar PPTX' }, { status: 500 });
  }
}
