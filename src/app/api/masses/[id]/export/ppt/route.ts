// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import pptxgen from 'pptxgenjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format') || 'lyrics';
		const includeHeader = searchParams.get('includeHeader') === '1';
		const includeNotes = searchParams.get('includeNotes') === '1';
		const includeMomentTitles = searchParams.get('includeMomentTitles') === '1';

		// Buscar dados da missa
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

		// Criar apresentação
		const pptx = new pptxgen();
		pptx.author = 'Cantolico';
		pptx.company = 'Cantolico';
		pptx.title = massData.name;

		// Header slide
		if (includeHeader) {
			const slide = pptx.addSlide();
			slide.addText(massData.name, { x: 0.5, y: 1, fontSize: 32, bold: true, color: '003366' });
			if (massData.celebration) slide.addText(massData.celebration, { x: 0.5, y: 2, fontSize: 20, color: '444444' });
			if (massData.date) slide.addText(new Date(massData.date).toLocaleDateString(), { x: 0.5, y: 2.7, fontSize: 18, color: '888888' });
		}

		// Slides por momento
		const itemsByMoment = {};
		for (const item of massData.MassItem) {
			if (!itemsByMoment[item.moment]) itemsByMoment[item.moment] = [];
			itemsByMoment[item.moment].push(item);
		}
		for (const moment of Object.keys(itemsByMoment)) {
			if (includeMomentTitles) {
				const slide = pptx.addSlide();
				slide.addText(moment.replaceAll('_', ' '), { x: 0.5, y: 0.5, fontSize: 28, bold: true, color: '003366' });
			}
			for (const item of itemsByMoment[moment]) {
				const song = item.Song;
				if (!song) continue;
				const version = song.SongVersion?.[0];
				let text = format === 'chords' ? version?.sourceText || '' : version?.lyricsPlain || '';
				if (!text) continue;
				const slide = pptx.addSlide();
				slide.addText(song.title, { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '003366' });
				const lines = text.split('\n');
				let y = 1.2;
				for (let i = 0; i < lines.length; i++) {
					let line = lines[i];
					if (format === 'chords' && /\[[A-G][^\]]*\]/.test(line)) {
						// Extrai acordes
						const chords = [...line.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
						let chordLine = '';
						let lastIdx = 0;
						for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
							chordLine += ' '.repeat(m.index - lastIdx) + m[1];
							lastIdx = m.index + m[0].length;
						}
						slide.addText(chordLine, { x: 0.7, y, fontSize: 16, bold: true, color: '0077cc' });
						y += 0.3;
						line = line.replace(/\[[^\]]+\]/g, '');
					}
					slide.addText(line, { x: 0.7, y, fontSize: 18, color: '222222' });
					y += 0.32;
				}
				if (includeNotes && item.note) {
					slide.addText('Nota: ' + item.note, { x: 1, y, fontSize: 14, color: 'cc2222' });
					y += 0.25;
				}
			}
		}

		// Gerar PPTX
		const pptxBytes = await pptx.write('arraybuffer');
		return new NextResponse(Buffer.from(pptxBytes), {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'Content-Disposition': `inline; filename="${encodeURIComponent(massData.name)} - Missa.pptx"`,
			},
		});
	} catch (error) {
		console.error('Erro ao exportar PPTX da missa:', error);
		return NextResponse.json({ error: 'Erro ao exportar PPTX da missa' }, { status: 500 });
	}
}