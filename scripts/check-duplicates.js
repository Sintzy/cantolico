const fs = require('fs');
const path = require('path');

// Carregar JSON das músicas
const jsonPath = path.join(__dirname, 'scrapper', 'data', 'all-songs-final-formatted.json');
const songs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('🔍 ANÁLISE DE DUPLICADOS');
console.log('='.repeat(50));

// Verificar títulos duplicados
const titleCounts = {};
const tagCounts = {};
const allTags = new Set();

songs.forEach((song, index) => {
  // Contar títulos
  const title = song.title;
  titleCounts[title] = (titleCounts[title] || 0) + 1;
  
  // Contar tags
  if (song.tags && Array.isArray(song.tags)) {
    song.tags.forEach(tag => {
      allTags.add(tag);
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  }
});

// Mostrar títulos duplicados
const duplicateTitles = Object.entries(titleCounts).filter(([title, count]) => count > 1);
if (duplicateTitles.length > 0) {
  console.log('📋 TÍTULOS DUPLICADOS:');
  duplicateTitles.forEach(([title, count]) => {
    console.log(`  • "${title}": ${count} ocorrências`);
  });
  console.log();
}

// Mostrar tags mais comuns
console.log('🏷️  TAGS MAIS COMUNS:');
const sortedTags = Object.entries(tagCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

sortedTags.forEach(([tag, count]) => {
  console.log(`  • "${tag}": ${count} músicas`);
});

console.log();
console.log(`📊 Total de títulos únicos: ${Object.keys(titleCounts).length}`);
console.log(`📊 Total de tags únicas: ${allTags.size}`);
console.log(`📊 Total de músicas: ${songs.length}`);
