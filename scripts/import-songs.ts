import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

async function importSongs() {
  try {
    console.log('🎵 IMPORTAÇÃO DE MÚSICAS CANTÓLICO');
    console.log('=' .repeat(50));

    // Verificar se existe utilizador com ID 0 ou encontrar um admin
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

    // Carregar músicas do JSON
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

        // Verificar se já existe uma submission com o mesmo título
        const existingSubmission = await prisma.songSubmission.findFirst({
          where: { title: song.title }
        });

        if (existingSubmission) {
          console.log(`⏭️  [${index + 1}/${songs.length}] Pulando "${song.title}" - já existe`);
          skipped++;
          continue;
        }

        // Criar a submission
        await prisma.songSubmission.create({
          data: {
            title: song.title,
            moment: mappedMoments as any, // Temporário até regenerar Prisma client
            type: 'ACORDES', // Assumir que todas são acordes
            mainInstrument: 'GUITARRA', // Assumir guitarra como padrão
            tags: song.tags || [],
            submitterId: submitterId,
            tempSourceType: 'MARKDOWN',
            tempText: song.lyrics,
            // Ignorar PDF (tempPdfKey fica null)
            // Ignorar áudio (mediaUrl fica null)
            // Links opcionais ficam null
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

  } catch (error) {
    console.error('💥 Erro fatal durante importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar importação
importSongs();
