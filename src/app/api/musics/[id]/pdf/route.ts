import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '@/lib/supabase-client';
import { transposeText, detectChordFormat, processAboveChords, extractChords, detectKey } from '@/lib/chord-processor';
import { parseMomentsFromPostgreSQL } from '@/lib/utils';
import * as fs from 'fs';
import * as path from 'path';

// Import fontkit dinamicamente
const fontkit = require('fontkit');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const transposition = parseInt(searchParams.get('transposition') || '0');

    console.log('Buscando música com ID:', id);
    
    // Primeira query: buscar a música
    const { data: songData, error: songError } = await supabase
      .from('Song')
      .select(`
        id,
        title,
        author,
        tags,
        moments,
        mainInstrument,
        currentVersionId
      `)
      .or(`id.eq.${id},slug.eq.${id}`)
      .limit(1);

    if (songError || !songData || songData.length === 0) {
      console.log('Song error:', songError);
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    const song = songData[0];
    console.log('Música encontrada:', song.title, 'currentVersionId:', song.currentVersionId);

    // Segunda query: buscar a versão atual
    const { data: versionData, error: versionError } = await supabase
      .from('SongVersion')
      .select('sourceText, sourceType')
      .eq('id', song.currentVersionId)
      .limit(1);

    if (versionError || !versionData || versionData.length === 0) {
      console.log('Version error:', versionError);
      return NextResponse.json({ error: 'Versão da música não encontrada' }, { status: 404 });
    }

    const version = versionData[0];
    console.log('Versão encontrada, sourceText length:', version.sourceText?.length);

    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    
    // Registrar fontkit para suporte a fontes personalizadas
    try {
      pdfDoc.registerFontkit(fontkit);
      console.log('Fontkit registrado com sucesso');
    } catch (error) {
      console.log('Erro ao registrar fontkit:', error);
    }
    
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    // Carregar fontes personalizadas Montserrat
    let font, boldFont, lightFont;
    
    try {
      // Tentar carregar Montserrat da pasta public
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Regular.ttf');
      const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-Bold.ttf');
      
      console.log('Tentando carregar fontes de:', fontPath);
      
      const fontBytes = fs.readFileSync(fontPath);
      const boldFontBytes = fs.readFileSync(boldFontPath);
      
      font = await pdfDoc.embedFont(fontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
      
      font = await pdfDoc.embedFont(fontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
      lightFont = font;
      
      console.log('Fontes Montserrat carregadas com sucesso');
    } catch (fontError) {
      console.log('Erro ao carregar Montserrat, usando fontes padrão:', fontError);
      // Fallback para fontes padrão
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      lightFont = font;
    }
    
    // Carregar logo do Cantólico
    let logoImage;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'cantolicoemail.png');
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
      console.log('Logo carregado com sucesso');
    } catch (logoError) {
      console.log('Logo não encontrado, usando texto:', logoError);
    }
    
    const { width, height } = page.getSize();
    let y = height - 40; // Movido mais para cima (era height - 50)

    // Logo Cantólico no topo - pequeno e centrado
    if (logoImage) {
      const logoSize = 30; // Logo quadrado pequeno
      page.drawImage(logoImage, {
        x: width / 2 - logoSize / 2,
        y: y - logoSize,
        width: logoSize,
        height: logoSize,
      });
      y -= logoSize + 15;
    } else {
      // Fallback para texto
      page.drawText('Cantolico', {
        x: width / 2 - 30,
        y: y,
        size: 12,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.8),
      });
      y -= 25;
    }

    y -= 10; // Espaço adicional antes do título

    // Título da música - sempre centrado
    const titleFontSize = Math.min(22, Math.max(16, 350 / song.title.length));
    const titleWidth = song.title.length * titleFontSize * 0.6; // Estimativa da largura do texto
    const titleX = (width - titleWidth) / 2; // Centrado horizontalmente
    
    page.drawText(song.title, {
      x: titleX,
      y: y,
      size: titleFontSize,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1), // Preto mais suave
    });

    y -= 30; // Ligeiramente mais espaço após o título

    // Autor - tipografia mais refinada
    if (song.author) {
      page.drawText(`por ${song.author}`, {
        x: 60,
        y: y,
        size: 12,
        font: font, // Fonte regular mais moderna
        color: rgb(0.4, 0.4, 0.4), // Cinza mais elegante
      });
      y -= 20;
    }

    // Detectar tom da música antes da transposição
    const originalKey = detectKey(version.sourceText || '');
    let currentKey = originalKey;
    
    // Se há transposição, calcular o novo tom
    if (transposition !== 0 && originalKey) {
      const keyMap: { [key: string]: number } = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
        'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
      };
      const reverseKeyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      
      const originalSemitone = keyMap[originalKey];
      if (originalSemitone !== undefined) {
        const newSemitone = (originalSemitone + transposition + 12) % 12;
        currentKey = reverseKeyMap[newSemitone];
      }
    }

    // Layout com momentos à esquerda e tom à direita
    const momentsArray = parseMomentsFromPostgreSQL(song.moments);
    const hasMoments = momentsArray && momentsArray.length > 0;
    const hasKey = currentKey !== null;
    
    if (hasMoments || hasKey) {
      const momentsY = y;
      
      // Momentos à esquerda
      if (hasMoments) {
        const moments = momentsArray.map((m: string) => m.replace('_', ' ')).join(' • ');
        page.drawText(`${moments}`, {
          x: 60,
          y: momentsY,
          size: 10,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      // Tom à direita
      if (hasKey) {
        const keyText = transposition !== 0 ? `Tom: ${currentKey}` : `Tom: ${currentKey}`;
        const keyTextWidth = keyText.length * 6; // Estimativa da largura
        
        page.drawText(keyText, {
          x: width - 60 - keyTextWidth,
          y: momentsY,
          size: 10,
          font: boldFont,
          color: rgb(0.2, 0.5, 0.8),
        });
      }
      
      y -= 16;
    }

    y -= 15;

    // Processar texto da música
    let sourceText = version.sourceText || '';
    console.log('Texto original (primeiros 200 chars):', sourceText.substring(0, 200));
    
    sourceText = sourceText.replace(/^#mic#\s*\n?/, '').trim();
    console.log('Texto após remoção do #mic# (primeiros 200 chars):', sourceText.substring(0, 200));
    
    // Aplicar transposição
    if (transposition !== 0) {
      sourceText = transposeText(sourceText, transposition);
      console.log('Transposição aplicada:', transposition);
    }

    // Detectar formato e processar acordes
    const chordFormat = detectChordFormat(sourceText);
    console.log('Formato detectado:', chordFormat);

    // Função para calcular altura necessária para o conteúdo
    const calculateContentHeight = (text: string): number => {
      const lines = text.split('\n');
      const lineHeight = 14;
      let totalHeight = 0;
      
      for (const line of lines) {
        if (!line.trim()) {
          totalHeight += lineHeight / 2;
        } else if (line.includes('[') && line.includes(']') && line.trim() !== line.match(/^(\s*\[[A-G][#b]?[^\]]*\]\s*)+$/)?.[0]) {
          // Linha com acordes inline precisa de espaço extra
          totalHeight += lineHeight + 4;
        } else {
          totalHeight += lineHeight;
          // Seções precisam de espaço extra
          if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude|Refrão|Estrofe|Verso):?\s*$/i.test(line.trim())) {
            totalHeight += 4;
          }
        }
      }
      
      return totalHeight;
    };

    // Função para renderizar uma linha individual
    const renderLine = (line: string, x: number, currentY: number, columnWidth: number): number => {
      const fontSize = 11;
      const lineHeight = 14;
      const chordFontSize = 10;
      
      if (!line.trim()) {
        return currentY - lineHeight / 2;
      }

      // Verificar se é linha de seção (Intro, Ponte, etc.)
      const isIntroLine = /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude|Refrão|Estrofe|Verso):?\s*$/i.test(line.trim());
      
      // Verificar se é linha só com acordes
      const isChordOnlyLine = /^(\s*\[[A-G][#b]?[^\]]*\]\s*)+\s*$/.test(line.trim());
      
      if (isIntroLine) {
        // Renderizar título da seção em negrito e cor moderna
        page.drawText(line.trim(), {
          x: x,
          y: currentY,
          size: fontSize + 2,
          font: boldFont,
          color: rgb(0.2, 0.3, 0.5),
        });
        console.log('Renderizada seção:', line.trim());
        return currentY - lineHeight - 4;
        
      } else if (isChordOnlyLine) {
        // Renderizar linha de acordes com cor azul moderna
        const chordMatches = line.match(/\[([A-G][#b]?[^\]]*)\]/g) || [];
        let chordX = x;
        
        console.log('Acordes encontrados:', chordMatches);
        
        for (const chordMatch of chordMatches) {
          const cleanChord = chordMatch.replace(/[\[\]]/g, '');
          // Verificar se o acorde cabe na coluna
          if (chordX + cleanChord.length * 7.5 <= x + columnWidth) {
            page.drawText(cleanChord, {
              x: chordX,
              y: currentY,
              size: chordFontSize,
              font: boldFont,
              color: rgb(0.1, 0.4, 0.7),
            });
            chordX += cleanChord.length * 7.5 + 22;
          }
        }
        return currentY - lineHeight;
        
      } else {
        // Renderizar letra (pode ter acordes inline)
        if (line.includes('[') && line.includes(']')) {
          // Linha com acordes inline
          const parts = line.split(/(\[[A-G][#b]?[^\]]*\])/);
          let textX = x;
          let hasText = false;
          
          for (const part of parts) {
            if (part.match(/^\[[A-G][#b]?[^\]]*\]$/)) {
              // É um acorde
              const cleanChord = part.replace(/[\[\]]/g, '');
              if (textX + cleanChord.length * 6.5 <= x + columnWidth) {
                page.drawText(cleanChord, {
                  x: textX,
                  y: currentY + 9,
                  size: chordFontSize,
                  font: boldFont,
                  color: rgb(0.1, 0.4, 0.7),
                });
                textX += cleanChord.length * 6.5 + 6;
              }
            } else if (part.trim()) {
              // É texto - processar formatação **bold**
              if (part.includes('**')) {
                const textParts = part.split(/(\*\*[^*]+\*\*)/);
                
                for (const textPart of textParts) {
                  if (textPart.match(/^\*\*[^*]+\*\*$/)) {
                    // Texto em bold
                    const boldText = textPart.replace(/\*\*/g, '');
                    if (textX + boldText.length * 7 <= x + columnWidth) {
                      page.drawText(boldText, {
                        x: textX,
                        y: currentY,
                        size: fontSize,
                        font: boldFont,
                        color: rgb(0.1, 0.1, 0.1),
                      });
                      textX += boldText.length * 7;
                    }
                  } else if (textPart.trim()) {
                    // Texto normal
                    if (textX + textPart.length * 6.5 <= x + columnWidth) {
                      page.drawText(textPart, {
                        x: textX,
                        y: currentY,
                        size: fontSize,
                        font: font,
                        color: rgb(0.15, 0.15, 0.15),
                      });
                      textX += textPart.length * 6.5;
                    }
                  }
                }
              } else {
                // Texto simples sem formatação
                if (textX + part.length * 6.5 <= x + columnWidth) {
                  page.drawText(part, {
                    x: textX,
                    y: currentY,
                    size: fontSize,
                    font: font,
                    color: rgb(0.15, 0.15, 0.15),
                  });
                  textX += part.length * 6.5;
                }
              }
              hasText = true;
            }
          }
          
          if (hasText) {
            return currentY - lineHeight - 4;
          }
          
        } else {
          // Linha simples de texto
          const textLine = line.trim();
          if (textLine) {
            // Verificar se contém formatação **bold**
            if (textLine.includes('**')) {
              const parts = textLine.split(/(\*\*[^*]+\*\*)/);
              let textX = x;
              
              for (const part of parts) {
                if (part.match(/^\*\*[^*]+\*\*$/)) {
                  // É texto em bold
                  const boldText = part.replace(/\*\*/g, '');
                  if (textX + boldText.length * 7 <= x + columnWidth) {
                    page.drawText(boldText, {
                      x: textX,
                      y: currentY,
                      size: fontSize,
                      font: boldFont,
                      color: rgb(0.1, 0.1, 0.1),
                    });
                    textX += boldText.length * 7;
                  }
                } else if (part.trim()) {
                  // É texto normal
                  if (textX + part.length * 6.5 <= x + columnWidth) {
                    page.drawText(part, {
                      x: textX,
                      y: currentY,
                      size: fontSize,
                      font: font,
                      color: rgb(0.15, 0.15, 0.15),
                    });
                    textX += part.length * 6.5;
                  }
                }
              }
            } else {
              // Texto simples sem formatação - verificar se cabe na coluna
              if (textLine.length * 6.5 <= columnWidth) {
                page.drawText(textLine, {
                  x: x,
                  y: currentY,
                  size: fontSize,
                  font: font,
                  color: rgb(0.15, 0.15, 0.15),
                });
              }
            }
            console.log('Renderizada letra:', textLine.substring(0, 50));
            return currentY - lineHeight;
          }
        }
      }
      
      return currentY;
    };

    // Função para renderizar conteúdo em múltiplas colunas
    const renderMusicContent = (text: string, startY: number): number => {
      const lines = text.split('\n');
      const availableHeight = startY - 80; // Espaço até o rodapé
      const contentHeight = calculateContentHeight(text);
      
      console.log(`Renderizando ${lines.length} linhas de música`);
      console.log(`Altura disponível: ${availableHeight}, Altura do conteúdo: ${contentHeight}`);
      
      const leftMargin = 50;
      const rightMargin = width - 50;
      const totalWidth = rightMargin - leftMargin;
      
      // Se o conteúdo cabe em uma coluna, usar layout tradicional
      if (contentHeight <= availableHeight) {
        let currentY = startY;
        
        for (const line of lines) {
          currentY = renderLine(line, leftMargin, currentY, totalWidth);
          if (currentY < 80) break;
        }
        
        return currentY;
      }
      
      // Conteúdo muito longo - usar duas colunas
      const columnWidth = (totalWidth - 30) / 2; // 30px de espaço entre colunas
      const leftColumnX = leftMargin;
      const rightColumnX = leftMargin + columnWidth + 30;
      
      // Dividir linhas entre as duas colunas
      const midPoint = Math.ceil(lines.length / 2);
      const leftColumnLines = lines.slice(0, midPoint);
      const rightColumnLines = lines.slice(midPoint);
      
      // Renderizar coluna esquerda
      let leftY = startY;
      for (const line of leftColumnLines) {
        leftY = renderLine(line, leftColumnX, leftY, columnWidth);
        if (leftY < 80) break;
      }
      
      // Renderizar coluna direita
      let rightY = startY;
      for (const line of rightColumnLines) {
        rightY = renderLine(line, rightColumnX, rightY, columnWidth);
        if (rightY < 80) break;
      }
      
      return Math.min(leftY, rightY);
    };

    // Renderizar o conteúdo da música
    renderMusicContent(sourceText, y);

    // Rodapé moderno
    page.drawText('cantolico.pt', {
      x: width / 2 - 38,
      y: 30,
      size: 9,
      font: font,
      color: rgb(0.6, 0.6, 0.6), // Cinza mais moderno
    });

    // Gerar PDF
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