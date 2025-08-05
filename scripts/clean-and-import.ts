import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { detectChordFormat, processMixedChords, processSimpleInline, processChords } from '../src/lib/chord-processor';

const prisma = new PrismaClient();

// Função para processar o markdown das letras usando o sistema de acordes
function processLyrics(lyrics: string): string {
  if (!lyrics) return '';
  
  try {
    // Detecta o formato dos acordes
    const format = detectChordFormat(lyrics);
    
    let processedHtml: string;
    
    if (format === 'inline') {
      // Verifica se tem seções de intro/ponte (formato misto)
      if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(lyrics)) {
        processedHtml = processMixedChords(lyrics);
      } else {
        processedHtml = processSimpleInline(lyrics);
      }
    } else {
      // Formato above (acordes acima da letra)
      processedHtml = processChords(lyrics, 'above');
    }
    
    return processedHtml;
  } catch (error) {
    console.warn('Erro ao processar acordes, usando texto original:', error);
    // Em caso de erro, retorna o texto original com quebras de linha convertidas
    return lyrics.replace(/\n/g, '<br>');
  }
}

// Função para mapear momentos do JSON para o formato do banco
function mapMoments(jsonMoments: string[]): string[] {
  const momentMapping: Record<string, string> = {
    "Inicial": "ENTRADA",
    "Acto Penitencial": "ATO_PENITENCIAL", 
    "Glória": "GLORIA",
    "Salmo Responsorial": "SALMO",
    "Aclamação ao Evangelho": "ACLAMACAO",
    "Apresentação dos dons": "OFERTORIO",
    "Sanctus": "SANTO",
    "Comunhão": "COMUNHAO",
    "Pós Comunhão": "ACAO_DE_GRACAS",
    "Final": "FINAL",
    "Adoração": "ADORACAO",
    "Aspersão": "ASPERSAO",
    "Baptismo": "BAPTISMO",
    "Benção das Alianças": "BENCAO_DAS_ALIANCAS",
    "Cordeiro de Deus": "CORDEIRO_DE_DEUS",
    "Crisma": "CRISMA",
    "Introdução da Palavra": "INTRODUCAO_DA_PALAVRA",
    "Louvor": "LOUVOR",
    "Pai Nosso": "PAI_NOSSO",
    "Reflexão": "REFLEXAO",
    "Terço - Mistério": "TERCO_MISTERIO"
  };

  const mappedMoments: string[] = [];

  jsonMoments.forEach(moment => {
    if (momentMapping[moment]) {
      mappedMoments.push(momentMapping[moment]);
    }
  });

  return mappedMoments;
}

async function cleanAndImportSongs() {
  try {
    console.log('🧹 LIMPEZA E IMPORTAÇÃO DE MÚSICAS CANTÓLICO');
    console.log('=' .repeat(50));

    // 1. LIMPEZA: Remover todas as submissions pendentes
    console.log('🗑️  Removendo submissions pendentes...');
    const deleteResult = await prisma.songSubmission.deleteMany({
      where: { status: 'PENDING' }
    });
    console.log(`✅ ${deleteResult.count} submissions pendentes removidas`);

    // 2. VERIFICAÇÃO: Encontrar submitter
    let submitterId = 0;
    const cantolicoUser = await prisma.user.findUnique({ where: { id: 0 } });
    
    if (!cantolicoUser) {
      console.log('⚠️  Utilizador ID 0 não encontrado, procurando admin...');
      const adminUser = await prisma.user.findFirst({ 
        where: { role: 'ADMIN' },
        orderBy: { id: 'asc' }
      });
      
      if (adminUser) {
        submitterId = adminUser.id;
        console.log(`✅ Usando admin: ${adminUser.name} (ID: ${adminUser.id})`);
      } else {
        throw new Error('❌ Nenhum utilizador admin encontrado!');
      }
    } else {
      console.log(`✅ Utilizador Cantólico encontrado: ${cantolicoUser.name} (ID: 0)`);
    }

    // 3. IMPORTAÇÃO: Carregar músicas do JSON
    console.log('\n📥 INICIANDO IMPORTAÇÃO');
    console.log('-' .repeat(30));
    
    const jsonPath = path.join(__dirname, 'scrapper', 'data', 'all-songs-final-formatted.json');
    const songs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`📊 Total de músicas no JSON: ${songs.length}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const [index, song] of songs.entries()) {
      try {
        // Mapear momentos
        const mappedMoments = mapMoments(song.moments || []);
        
        // Verificar se a música é válida
        if (!song.title || !song.lyrics || mappedMoments.length === 0) {
          console.log(`⏭️  [${index + 1}/${songs.length}] Pulando "${song.title}" - dados insuficientes`);
          skipped++;
          continue;
        }

        // Processar o markdown das letras com o novo sistema de acordes
        const processedHtml = processLyrics(song.lyrics);
        const chordFormat = detectChordFormat(song.lyrics);
        
        // Criar a submission com o HTML processado
        await prisma.songSubmission.create({
          data: {
            title: song.title,
            moment: mappedMoments as any,
            type: 'ACORDES',
            mainInstrument: 'GUITARRA',
            tags: song.tags || [],
            submitterId: submitterId,
            tempSourceType: 'MARKDOWN',
            tempText: song.lyrics,
            parsedPreview: {
              html: processedHtml,
              format: chordFormat,
              processedAt: new Date().toISOString(),
              originalMarkdown: song.lyrics
            },
            status: 'PENDING'
          }
        });

        imported++;
        
        if (imported % 50 === 0) {
          console.log(`✅ [${index + 1}/${songs.length}] Importadas: ${imported} | Puladas: ${skipped} | Erros: ${errors}`);
        }

      } catch (error) {
        console.error(`❌ [${index + 1}/${songs.length}] Erro ao importar "${song.title}":`, error);
        errors++;
      }
    }

    console.log('\n🏁 IMPORTAÇÃO CONCLUÍDA');
    console.log('=' .repeat(50));
    console.log(`✅ Músicas importadas: ${imported}`);
    console.log(`⏭️  Músicas puladas: ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${imported + skipped + errors}/${songs.length}`);
    
    // Estatísticas dos formatos processados
    console.log('\n📈 ESTATÍSTICAS DOS FORMATOS');
    console.log('-' .repeat(30));
    
    const submissions = await prisma.songSubmission.findMany({
      where: { submitterId },
      select: { parsedPreview: true }
    });
    
    let inlineCount = 0;
    let aboveCount = 0;
    let mixedCount = 0;
    
    submissions.forEach(sub => {
      if (sub.parsedPreview && typeof sub.parsedPreview === 'object') {
        const preview = sub.parsedPreview as any;
        if (preview.format === 'inline') {
          if (preview.html?.includes('intro-section')) {
            mixedCount++;
          } else {
            inlineCount++;
          }
        } else if (preview.format === 'above') {
          aboveCount++;
        }
      }
    });
    
    console.log(`🎵 Formato Inline: ${inlineCount}`);
    console.log(`🎼 Formato Above: ${aboveCount}`);
    console.log(`🎭 Formato Misto: ${mixedCount}`);

  } catch (error) {
    console.error('💥 Erro fatal durante operação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar limpeza e importação
cleanAndImportSongs();
