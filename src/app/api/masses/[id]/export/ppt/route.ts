import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { getClerkSession } from '@/lib/api-middleware';
import { transposeText } from '@/lib/chord-processor';
import { findMembershipByEmail } from '@/lib/mass-collaboration';
import { premiumRequiredResponse, userCanUseFeature } from '@/lib/premium';
import {
  createSongSlideLayout,
  getMassMomentLabel,
  MASS_MOMENT_ORDER,
  sanitiseExportFilename,
  stripSongMarkup,
} from '@/lib/mass-export';

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const FONT = 'Arial';

type ThemeName = 'dark' | 'light';

interface PresentationTheme {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  decoration: string;
}

const THEMES: Record<ThemeName, PresentationTheme> = {
  dark: {
    background: '101924', foreground: 'F8F5EE', muted: 'AEB9C5',
    accent: 'D8B26A', decoration: '233448',
  },
  light: {
    background: 'FAF7F1', foreground: '1E2A36', muted: '687582',
    accent: 'A6463A', decoration: 'E9E0D3',
  },
};

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function cleanChordText(value: string): string {
  return value
    .replace(/^\s*#mic#\s*\r?\n?/i, '')
    .replace(/\*\*|__|~~/g, '')
    .replace(/\[([^\]]+)\]/g, '$1 ')
    .replace(/\r\n?/g, '\n');
}

function normaliseForProjection(value: string, withChords: boolean): string {
  return withChords ? cleanChordText(value) : stripSongMarkup(value);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getClerkSession();
    if (!session) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const includeHeader = searchParams.get('includeHeader') !== '0';
    const includeNotes = searchParams.get('includeNotes') !== '0';
    const includeMomentTitles = searchParams.get('includeMomentTitles') !== '0';
    const themeName: ThemeName = searchParams.get('theme') === 'light' ? 'light' : 'dark';
    const withChords = searchParams.get('format') === 'chords';

    const { data: massData, error } = await supabase
      .from('Mass')
      .select(`
        id, name, date, parish, celebration, visibility, userId,
        MassItem (
          id, moment, order, note, transpose,
          Song!MassItem_songId_fkey (
            id, title, author, capo,
            SongVersion!SongVersion_songId_fkey (sourceText, lyricsPlain)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !massData) {
      return NextResponse.json({ error: 'Missa não encontrada' }, { status: 404 });
    }

    const isOwner = session.user.id === massData.userId;
    const isAdmin = session.user.role === 'ADMIN';
    if (massData.visibility === 'PRIVATE' && !isOwner && !isAdmin) {
      const { data: memberships, error: membershipError } = await supabase
        .from('MassMember')
        .select('userEmail, status')
        .eq('massId', id);
      const membership = membershipError ? null : findMembershipByEmail(memberships, session.user.email);
      if (membership?.status !== 'ACCEPTED') {
        return NextResponse.json({ error: 'Não tens permissão para exportar esta missa' }, { status: 403 });
      }
    }

    // The UI has always presented PowerPoint as Premium. Enforce that promise
    // on the route too, so a direct URL cannot bypass it.
    const canExport = await userCanUseFeature(session.user.id, 'export_ppt');
    if (!canExport) {
      return premiumRequiredResponse('export_ppt', 'Exportar apresentações PowerPoint faz parte do Premium.');
    }

    const theme = THEMES[themeName];
    const pptx = new pptxgen();
    pptx.author = 'Cantólico';
    pptx.company = 'Cantólico';
    pptx.subject = 'Apresentação para projeção litúrgica';
    pptx.title = massData.name;
    pptx.defineLayout({ name: 'CANTOLICO_WIDE', width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
    pptx.layout = 'CANTOLICO_WIDE';

    const addBackground = (slide: pptxgen.Slide) => {
      slide.background = { color: theme.background };
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.13, h: SLIDE_HEIGHT,
        fill: { color: theme.accent }, line: { color: theme.accent },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 10.9, y: -1.15, w: 3.4, h: 3.4,
        fill: { color: theme.decoration, transparency: 35 },
        line: { color: theme.decoration, transparency: 100 },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: -1.25, y: 6.5, w: 2.2, h: 2.2,
        fill: { color: theme.decoration, transparency: 45 },
        line: { color: theme.decoration, transparency: 100 },
      });
    };

    const addChrome = (slide: pptxgen.Slide, momentLabel: string, pageLabel?: string) => {
      addBackground(slide);
      slide.addText('CANTÓLICO', {
        x: 0.55, y: 0.34, w: 1.35, h: 0.18,
        fontFace: FONT, fontSize: 7.5, bold: true, charSpacing: 1.7,
        color: theme.accent, margin: 0,
      });
      slide.addText(momentLabel.toUpperCase(), {
        x: 0.55, y: 6.94, w: 6.6, h: 0.18,
        fontFace: FONT, fontSize: 7.5, bold: true, charSpacing: 1.1,
        color: theme.muted, margin: 0,
      });
      if (pageLabel) {
        slide.addText(pageLabel, {
          x: 11.6, y: 6.94, w: 1.15, h: 0.18,
          fontFace: FONT, fontSize: 7.5, align: 'right', color: theme.muted, margin: 0,
        });
      }
    };

    const addCover = () => {
      const slide = pptx.addSlide();
      addBackground(slide);
      slide.addText('CELEBRAÇÃO', {
        x: 0.8, y: 1.12, w: 3.2, h: 0.23,
        fontFace: FONT, fontSize: 10, bold: true, charSpacing: 2.2,
        color: theme.accent, margin: 0,
      });

      const titleLines = String(massData.name).split(/\s+/).reduce((lines: string[], word: string) => {
        const last = lines.at(-1) || '';
        if (last && `${last} ${word}`.length > 30) lines.push(word);
        else if (last) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
        return lines;
      }, []);
      const titleSize = titleLines.length > 2 ? 29 : titleLines.length > 1 ? 36 : 42;
      slide.addText(titleLines.join('\n'), {
        x: 0.8, y: 1.56, w: 10.9, h: 2.4,
        fontFace: FONT, fontSize: titleSize, bold: true, color: theme.foreground, margin: 0,
      });

      const metadata = [massData.celebration, formatDate(massData.date), massData.parish].filter(Boolean);
      if (metadata.length > 0) {
        slide.addShape(pptx.ShapeType.line, {
          x: 0.82, y: 4.4, w: 1.25, h: 0,
          line: { color: theme.accent, width: 1.2 },
        });
        slide.addText(metadata.join('\n'), {
          x: 0.8, y: 4.68, w: 7.8, h: 1.1,
          fontFace: FONT, fontSize: 15, color: theme.muted, margin: 0,
        });
      }
      slide.addText('Preparado para projeção', {
        x: 0.8, y: 6.72, w: 3.2, h: 0.2,
        fontFace: FONT, fontSize: 8.5, color: theme.muted, italic: true, margin: 0,
      });
    };

    const addMomentSlide = (momentLabel: string, index: number) => {
      const slide = pptx.addSlide();
      addChrome(slide, momentLabel);
      slide.addText(String(index).padStart(2, '0'), {
        x: 0.75, y: 1.28, w: 2.5, h: 1.55,
        fontFace: FONT, fontSize: 76, bold: true, color: theme.decoration, margin: 0,
      });
      slide.addText('MOMENTO DA CELEBRAÇÃO', {
        x: 0.84, y: 3.2, w: 4.5, h: 0.22,
        fontFace: FONT, fontSize: 10, bold: true, charSpacing: 1.8,
        color: theme.accent, margin: 0,
      });
      slide.addText(momentLabel, {
        x: 0.8, y: 3.67, w: 10.5, h: 0.9,
        fontFace: FONT, fontSize: 35, bold: true, color: theme.foreground, margin: 0,
      });
    };

    const sortedItems = [...(massData.MassItem || [])].sort((a: any, b: any) => {
      const momentDifference = (MASS_MOMENT_ORDER[a.moment] ?? 99) - (MASS_MOMENT_ORDER[b.moment] ?? 99);
      return momentDifference || ((a.order ?? 0) - (b.order ?? 0));
    });
    const itemsByMoment = sortedItems.reduce<Record<string, any[]>>((groups, item: any) => {
      (groups[item.moment] ||= []).push(item);
      return groups;
    }, {});

    if (includeHeader) addCover();

    let momentIndex = 0;
    for (const [moment, items] of Object.entries(itemsByMoment)) {
      momentIndex += 1;
      const momentLabel = getMassMomentLabel(moment);
      if (includeMomentTitles) addMomentSlide(momentLabel, momentIndex);

      for (const item of items) {
        const song = item.Song;
        const version = song?.SongVersion?.[0];
        if (!song || !version) continue;

        const originalText = withChords
          ? (version.sourceText || version.lyricsPlain || '')
          : (version.lyricsPlain || version.sourceText || '');
        const transposedText = withChords && item.transpose
          ? transposeText(originalText, item.transpose)
          : originalText;
        const layout = createSongSlideLayout(normaliseForProjection(transposedText, withChords));
        if (layout.columns.every(column => column.length === 0)) continue;

        const slide = pptx.addSlide();
        addChrome(slide, momentLabel);
        slide.addText(song.title, {
          x: 0.8, y: 0.82, w: 9.8, h: 0.35,
          fontFace: FONT, fontSize: 15, bold: true, color: theme.foreground, margin: 0,
        });
        const songMeta = [song.author, song.capo ? `Capo ${song.capo}` : null]
          .filter(Boolean)
          .join('  ·  ');
        if (songMeta) {
          slide.addText(songMeta, {
            x: 0.8, y: 1.22, w: 8.5, h: 0.2,
            fontFace: FONT, fontSize: 9.5, color: theme.muted, margin: 0,
          });
        }
        slide.addShape(pptx.ShapeType.line, {
          x: 0.8, y: 1.57, w: 1.05, h: 0,
          line: { color: theme.accent, width: 1.5 },
        });

        const contentX = 0.8;
        const contentWidth = 11.75;
        const gutter = 0.32;
        const columnWidth = (contentWidth - gutter * (layout.columns.length - 1)) / layout.columns.length;
        layout.columns.forEach((column, columnIndex) => {
          slide.addText(column.join('\n'), {
            x: contentX + columnIndex * (columnWidth + gutter), y: 1.86, w: columnWidth, h: 4.72,
            fontFace: FONT, fontSize: layout.fontSize, color: theme.foreground,
            align: 'left', valign: 'middle', paraSpaceAfter: layout.fontSize >= 20 ? 8 : 4, margin: 0,
          });
        });

        if (includeNotes && item.note) {
          slide.addNotes(`Nota para ${song.title}:\n${item.note}`);
        }
      }
    }

    const pptxBytes = await pptx.write({ outputType: 'arraybuffer' });
    const filename = `${sanitiseExportFilename(massData.name)} - Missa.pptx`;
    return new NextResponse(Buffer.from(pptxBytes as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('Erro ao exportar PPTX:', error);
    return NextResponse.json({ error: 'Erro ao exportar PowerPoint' }, { status: 500 });
  }
}
