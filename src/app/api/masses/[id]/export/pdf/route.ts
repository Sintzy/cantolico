import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '@/lib/supabase-client';
import * as fs from 'fs';
import * as path from 'path';

const fontkit = require('fontkit');

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

		// PDF setup
		const pdfDoc = await PDFDocument.create();
		pdfDoc.registerFontkit(fontkit);
		let font, boldFont;
		try {
			const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Regular.ttf');
			const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Bold.ttf');
			font = await pdfDoc.embedFont(fs.readFileSync(fontPath));
			boldFont = await pdfDoc.embedFont(fs.readFileSync(boldFontPath));
		} catch {
			font = await pdfDoc.embedFont(StandardFonts.Helvetica);
			boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
		}

		// Layout config
		const pageWidth = 595.28, pageHeight = 841.89;
		const margin = 50;
		const baseFontSize = fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12;
		const chordFontSize = baseFontSize - 1;
		const lineHeight = baseFontSize + 6;

		// Agrupar items por momento
		const itemsByMoment: Record<string, any> = {};
		for (const item of massData.MassItem) {
			if (!itemsByMoment[item.moment]) itemsByMoment[item.moment] = [];
			itemsByMoment[item.moment].push(item);
		}

		// Função para rodapé cinzento central
		const drawFooter = (pg: PDFPage) => {
			pg.drawText('cantolico.pt', {
				x: pageWidth / 2 - 38,
				y: 30,
				size: 9,
				font,
				color: rgb(0.6, 0.6, 0.6)
			});
		};

		// Renderizar cada momento
		let page = pdfDoc.addPage([pageWidth, pageHeight]);
		let y = pageHeight - margin;

		// Header centralizado e padronizado
		if (includeHeader) {
			// Linha 1: data e descrição juntos, centrados, separados por bolinha
			const dateStr = massData.date ? new Date(massData.date).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
			const descStr = massData.celebration || '';
			const headerLine = `${dateStr}${dateStr && descStr ? ' ・ ' : ''}${descStr}`;
			const headerFontSize = baseFontSize - 2;
			const headerTextWidth = boldFont.widthOfTextAtSize(headerLine, headerFontSize);
			page.drawText(headerLine, {
				x: (pageWidth - headerTextWidth) / 2,
				y,
				size: headerFontSize,
				font: boldFont,
				color: rgb(0.3, 0.3, 0.3)
			});
			y -= headerFontSize + 8;
			// Linha 2: nome da missa centrado, maior
			const title = massData.name || '';
			const titleFontSize = baseFontSize + 8;
			const titleTextWidth = boldFont.widthOfTextAtSize(title, titleFontSize);
			page.drawText(title, {
				x: (pageWidth - titleTextWidth) / 2,
				y,
				size: titleFontSize,
				font: boldFont,
				color: rgb(0.1, 0.1, 0.1)
			});
			y -= titleFontSize + 12;
		}

		for (const moment of Object.keys(itemsByMoment)) {
			if (y < margin + 120) {
				drawFooter(page);
				page = pdfDoc.addPage([pageWidth, pageHeight]);
				y = pageHeight - margin;
			}
			// Título do momento centralizado e padronizado
			if (includeMomentTitles) {
				const momentTitle = moment.replaceAll('_', ' ');
				const momentFontSize = baseFontSize + 2;
				const momentTextWidth = boldFont.widthOfTextAtSize(momentTitle, momentFontSize);
				page.drawText(momentTitle, {
					x: (pageWidth - momentTextWidth) / 2,
					y,
					size: momentFontSize,
					font: boldFont,
					color: rgb(0.2, 0.3, 0.5)
				});
				y -= momentFontSize + 6;
			}
			for (const item of itemsByMoment[moment]) {
				const song = item.Song;
				if (!song) continue;
				const version = song.SongVersion?.[0];
				let text = format === 'chords' ? version?.sourceText || '' : version?.lyricsPlain || '';
				if (!text) continue;
				// Título da música centralizado e padronizado
				const songTitle = song.title || '';
				const songFontSize = baseFontSize + 1;
				const songTextWidth = boldFont.widthOfTextAtSize(songTitle, songFontSize);
				page.drawText(songTitle, {
					x: (pageWidth - songTextWidth) / 2,
					y,
					size: songFontSize,
					font: boldFont,
					color: rgb(0.1, 0.1, 0.1)
				});
				y -= songFontSize + 6;
				// Letras alinhadas à esquerda, menos espaçamento
				const lines = text.split('\n');
				const lyricsLeftMargin = margin + 10;
				const lyricsLineHeight = baseFontSize + 1;
				for (let i = 0; i < lines.length; i++) {
					let line = lines[i];
					let lineFont = font;
					let isBold = false;
					if (format === 'chords') {
						if (/\[[A-G][^\]]*\]/.test(line)) {
							const chords = [...line.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
							let chordLine = '';
							let lastIdx = 0;
							for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
								chordLine += ' '.repeat(m.index - lastIdx) + m[1];
								lastIdx = m.index + m[0].length;
							}
							page.drawText(chordLine, {
								x: lyricsLeftMargin,
								y,
								size: chordFontSize,
								font: boldFont,
								color: rgb(0.1, 0.4, 0.7)
							});
							y -= lyricsLineHeight;
							line = line.replace(/\[[^\]]+\]/g, '');
						}
						page.drawText(line, {
							x: lyricsLeftMargin,
							y,
							size: baseFontSize,
							font,
							color: rgb(0.15, 0.15, 0.15)
						});
						y -= lyricsLineHeight;
					} else {
						line = line.replace(/\[[^\]]+\]/g, '');
						const boldParts = line.split(/(\*\*[^*]+\*\*)/);
						let textX = lyricsLeftMargin;
						for (const part of boldParts) {
							isBold = part.match(/^\*\*[^*]+\*\*$/);
							lineFont = isBold ? boldFont : font;
							const partText = isBold ? part.replace(/\*\*/g, '') : part;
							page.drawText(partText, {
								x: textX,
								y,
								size: baseFontSize,
								font: lineFont,
								color: rgb(0.15, 0.15, 0.15)
							});
							textX += lineFont.widthOfTextAtSize(partText, baseFontSize);
						}
						y -= lyricsLineHeight;
					}
				}
				// Atualiza y para próxima música
				y -= 6;
				if (includeNotes && item.note) {
					page.drawText('Nota: ' + item.note, {
						x: pageWidth / 2 - 60,
						y,
						size: baseFontSize - 2,
						font,
						color: rgb(0.5, 0.2, 0.2)
					});
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

		// Rodapé na última página
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