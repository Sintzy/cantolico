const fs = require('fs');
const path = require('path');

// Função para mapear momentos do JSON para o formato do banco
function mapMoments(jsonMoments) {
  const momentMapping = {
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

  const mappedMoments = [];
  const unmappedMoments = [];

  jsonMoments.forEach(moment => {
    if (momentMapping[moment]) {
      mappedMoments.push(momentMapping[moment]);
    } else {
      unmappedMoments.push(moment);
    }
  });

  return { mappedMoments, unmappedMoments };
}

// Carregar JSON das músicas
const jsonPath = path.join(__dirname, 'scrapper', 'data', 'all-songs-final-formatted.json');
const songs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`📊 ANÁLISE DE IMPORTAÇÃO - ${songs.length} músicas`);
console.log('='.repeat(50));

let totalValid = 0;
let totalInvalid = 0;
let unmappedMomentsSet = new Set();
let invalidReasons = {};

songs.forEach((song, index) => {
  const { mappedMoments, unmappedMoments } = mapMoments(song.moments || []);
  
  // Adicionar momentos não mapeados ao conjunto
  unmappedMoments.forEach(moment => unmappedMomentsSet.add(moment));
  
  // Verificar se a música é válida para importação
  let isValid = true;
  let reasons = [];
  
  // Verificar campos obrigatórios
  if (!song.title || song.title.trim() === '') {
    isValid = false;
    reasons.push('Título em falta');
  }
  
  if (!song.lyrics || song.lyrics.trim() === '') {
    isValid = false;
    reasons.push('Letra em falta');
  }
  
  if (mappedMoments.length === 0) {
    isValid = false;
    reasons.push('Nenhum momento mapeado');
  }
  
  if (isValid) {
    totalValid++;
  } else {
    totalInvalid++;
    reasons.forEach(reason => {
      invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
    });
  }
});

console.log(`✅ Músicas válidas para importação: ${totalValid}`);
console.log(`❌ Músicas inválidas: ${totalInvalid}`);
console.log();

if (Object.keys(invalidReasons).length > 0) {
  console.log('📋 RAZÕES DE INVALIDAÇÃO:');
  Object.entries(invalidReasons).forEach(([reason, count]) => {
    console.log(`  • ${reason}: ${count} músicas`);
  });
  console.log();
}

if (unmappedMomentsSet.size > 0) {
  console.log('⚠️  MOMENTOS NÃO MAPEADOS:');
  Array.from(unmappedMomentsSet).sort().forEach(moment => {
    console.log(`  • "${moment}"`);
  });
  console.log();
}

console.log('📝 CAMPOS NECESSÁRIOS PARA IMPORTAÇÃO:');
console.log('  ✅ title (disponível)');
console.log('  ✅ moment (mapeamento criado)');
console.log('  ⚠️  type (assumir: ACORDES)');
console.log('  ⚠️  mainInstrument (assumir: GUITARRA)');
console.log('  ✅ tags (disponível)');
console.log('  ⚠️  submitterId (usar: 0 - Cantolico)');
console.log('  ✅ tempSourceType (assumir: MARKDOWN)');
console.log('  ✅ tempText (lyrics disponível)');
console.log();

console.log('🚧 PRÓXIMOS PASSOS:');
console.log('  1. Verificar se utilizador ID 0 "Cantolico" existe');
console.log('  2. Criar script de importação');
console.log('  3. Importar apenas músicas válidas');
console.log('  4. Definir valores padrão para campos em falta');
