import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  LITURGICAL_MOMENT_LABELS, 
  LITURGICAL_MOMENT_ORDER,
  formatMassDate,
  formatMassTime,
  LiturgicalMoment 
} from '@/types/mass';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ExportItem {
  moment: string;
  momentLabel: string;
  songs: {
    title: string;
    author: string | null;
    lyrics: string;
    lyricsWithChords: string;
    chords: string[];
    capo: number | null;
    transpose: number;
    note: string | null;
  }[];
}

// GET - Export mass data for PDF/PowerPoint generation
export const GET = async (request: NextRequest, context: RouteParams) => {
  try {
    const { id: massId } = await context.params;
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full'; // 'full', 'lyrics', 'chords', 'ppt'

    // Fetch mass with all data
    const { data: mass, error } = await supabase
      .from('Mass')
      .select(`
        id,
        name,
        description,
        date,
        parish,
        celebrant,
        celebration,
        liturgicalColor,
        visibility,
        userId,
        User!Mass_userId_fkey (
          name
        ),
        MassItem (
          id,
          moment,
          order,
          note,
          transpose,
          Song!MassItem_songId_fkey (
            id,
            title,
            author,
            capo,
            SongVersion!SongVersion_songId_fkey (
              sourceText,
              lyricsPlain,
              keyOriginal
            )
          )
        )
      `)
      .eq('id', massId)
      .single();

    if (error || !mass) {
      return NextResponse.json(
        { error: 'Missa não encontrada' },
        { status: 404 }
      );
    }

    // Check access
    const isOwner = session?.user?.id === mass.userId;
    const isAdmin = session?.user?.role === 'ADMIN';

    if (mass.visibility === 'PRIVATE' && !isOwner && !isAdmin) {
      const { data: membership } = await supabase
        .from('MassMember')
        .select('status')
        .eq('massId', massId)
        .eq('userEmail', session?.user?.email || '')
        .single();

      if (membership?.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Não tens permissão para exportar esta missa' },
          { status: 403 }
        );
      }
    }

    // Sort items by moment order, then by item order
    const sortedItems = (mass.MassItem || []).sort((a: any, b: any) => {
      const orderA = LITURGICAL_MOMENT_ORDER[a.moment as LiturgicalMoment] || 99;
      const orderB = LITURGICAL_MOMENT_ORDER[b.moment as LiturgicalMoment] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.order - b.order;
    });

    // Group items by moment
    const groupedItems: Record<string, any[]> = {};
    for (const item of sortedItems) {
      if (!groupedItems[item.moment]) {
        groupedItems[item.moment] = [];
      }
      groupedItems[item.moment].push(item);
    }

    // Format export data
    const exportData: ExportItem[] = [];
    
    for (const [moment, items] of Object.entries(groupedItems)) {
      const momentData: ExportItem = {
        moment,
        momentLabel: LITURGICAL_MOMENT_LABELS[moment as LiturgicalMoment] || moment,
        songs: []
      };

      for (const item of items) {
        const song = item.Song;
        if (!song) continue;

        const version = song.SongVersion?.[0];
        const sourceText = version?.sourceText || '';
        const lyricsPlain = version?.lyricsPlain || '';

        // Extract chords from source text
        const chordRegex = /\[([A-Ga-g][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)*[^\]]*)\]/g;
        const chords: string[] = [];
        let match;
        while ((match = chordRegex.exec(sourceText)) !== null) {
          if (!chords.includes(match[1])) {
            chords.push(match[1]);
          }
        }

        momentData.songs.push({
          title: song.title,
          author: song.author,
          lyrics: lyricsPlain,
          lyricsWithChords: sourceText,
          chords,
          capo: song.capo,
          transpose: item.transpose || 0,
          note: item.note
        });
      }

      if (momentData.songs.length > 0) {
        exportData.push(momentData);
      }
    }

    // Build response based on format
    const response = {
      mass: {
        id: mass.id,
        name: mass.name,
        description: mass.description,
        date: mass.date,
        dateFormatted: formatMassDate(mass.date),
        timeFormatted: formatMassTime(mass.date),
        parish: mass.parish,
        celebrant: mass.celebrant,
        celebration: mass.celebration,
        liturgicalColor: mass.liturgicalColor,
        createdBy: ((mass.User as any)?.name || (Array.isArray(mass.User) ? (mass.User[0] as any)?.name : undefined)) || 'Utilizador'
      },
      format,
      items: exportData,
      // Statistics
      stats: {
        totalSongs: exportData.reduce((acc, item) => acc + item.songs.length, 0),
        totalMoments: exportData.length,
        uniqueChords: [...new Set(exportData.flatMap(item => 
          item.songs.flatMap(song => song.chords)
        ))]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error exporting mass:', error);
    return NextResponse.json(
      { error: 'Failed to export mass' },
      { status: 500 }
    );
  }
};
