/**
 * Utilitário para processar acordes em diferentes formatos
 */

// Mapeamento de transposição de acordes
const CHORD_MAP: { [key: string]: number } = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const REVERSE_CHORD_MAP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export type ChordFormat = 'inline' | 'above' | 'intro';

/**
 * Processa formatação básica de Markdown (bold, italic, underline)
 */
export function processMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  return text
    // Bold: **texto** ou __texto__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic: *texto* ou _texto_ (evitando conflito com acordes e bold)
    .replace(/(?<!\*)\*([^*\[\]]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_\[\]]+?)_(?!_)/g, '<em>$1</em>')
    // Underline: ~~texto~~
    .replace(/~~(.*?)~~/g, '<u>$1</u>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Detecta o formato dos acordes no texto de forma inteligente
 */
export function detectChordFormat(text: string): ChordFormat {
  // Se contém #mic# em qualquer lugar, é sempre inline (mesmo com intro/ponte)
  if (text.includes('#mic#')) {
    return 'inline';
  }
  
  // Se contém seções de intro/ponte sem #mic#, usa above
  if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(text)) {
    return 'above';
  }
  
  // Se a primeira linha não vazia contém apenas acordes, é above
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (/^(\s*\[[A-G][#b]?[^\]]*\]\s*)+$/.test(firstLine)) {
      return 'above';
    }
  }
  
  return 'inline';
}

/**
 * Extrai todos os acordes de um texto
 */
export function extractChords(text: string): string[] {
  const chordRegex = /\[([A-G][#b]?[^\]]*)\]/g;
  const chords: string[] = [];
  let match;
  
  while ((match = chordRegex.exec(text)) !== null) {
    if (!chords.includes(match[1])) {
      chords.push(match[1]);
    }
  }
  
  return chords;
}

/**
 * Detecta o tom da música baseado no primeiro acorde ou padrão mais comum
 */
export function detectKey(text: string): string | null {
  const chords = extractChords(text);
  
  if (chords.length === 0) return null;
  
  // Pega o primeiro acorde como base para detectar o tom
  const firstChord = chords[0];
  const chordRegex = /^([A-G][#b]?)/;
  const match = firstChord.match(chordRegex);
  
  if (match) {
    return match[1]; // Retorna apenas a nota base (ex: C, D#, Bb)
  }
  
  return null;
}

/**
 * Transpõe um acorde individual
 */
export function transposeChord(chord: string, semitones: number): string {
  // Regex para capturar a nota base e modificadores
  const chordRegex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(chordRegex);
  
  if (!match) return chord;
  
  const [, baseNote, modifiers] = match;
  const currentSemitone = CHORD_MAP[baseNote];
  
  if (currentSemitone === undefined) return chord;
  
  const newSemitone = (currentSemitone + semitones + 12) % 12;
  const newBaseNote = REVERSE_CHORD_MAP[newSemitone];
  
  return newBaseNote + modifiers;
}

/**
 * Transpõe todos os acordes em um texto
 */
export function transposeText(text: string, semitones: number): string {
  if (semitones === 0) return text;
  
  return text.replace(/\[([A-G][#b]?[^\]]*)\]/g, (match, chord) => {
    return `[${transposeChord(chord, semitones)}]`;
  });
}

/**
 * Processa acordes no formato inline (markdown-it-chords)
 */
export function processInlineChords(html: string): string {
  if (!html) return html;
  
  // Remove os colchetes dos acordes e adiciona atributos de dados
  return html.replace(/<span class="chord"[^>]*><span class="inner">([^<]+)<\/span><\/span>/g, (match, chordText) => {
    const chordLength = chordText.trim().length;
    const cleanChord = chordText.replace(/[\[\]]/g, '');
    return match
      .replace(chordText, cleanChord)
      .replace('<span class="chord"', `<span class="chord" data-chord-length="${chordLength}"`);
  });
}

/**
 * Processa acordes no formato above (linha acima da letra) e intro/ponte
 */
export function processAboveChords(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Verifica se é uma linha só com acordes
    const isChordOnlyLine = /^(\s*\[[A-G][#b]?[^\]]*\]\s*)+\s*$/.test(currentLine.trim());
    const isTextLine = nextLine.trim() && !/^\s*\[/.test(nextLine.trim());
    
    // Verifica se é uma linha de intro/ponte (contém palavras como Intro, Ponte, etc. com ou sem dois pontos)
    const isIntroLine = /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/i.test(currentLine.trim());
    
    if (isIntroLine && i + 1 < lines.length) {
      const chordLine = lines[i + 1];
      if (/^(\s*\[[A-G][#b]?[^\]]*\]\s*)+\s*$/.test(chordLine.trim())) {
        // Processa linha de intro/ponte
        const chordHtml = chordLine.replace(/\[([A-G][#b]?[^\]]*)\]/g, (match, chord) => {
          return `<span class="chord intro-chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
        });
        result.push(`<div class="intro-section">`);
        result.push(`<div class="intro-label">${processMarkdownFormatting(currentLine.trim())}</div>`);
        result.push(`<div class="intro-line">${chordHtml}</div>`);
        result.push(`</div>`);
        i++; // Pula a próxima linha pois já foi processada
      } else {
        result.push(`<p>${processMarkdownFormatting(currentLine)}</p>`);
      }
    } else if (isChordOnlyLine && isTextLine) {
      // Processa linha de acordes normais acima da letra
      const chordHtml = currentLine.replace(/\[([A-G][#b]?[^\]]*)\]/g, (match, chord) => {
        return `<span class="chord above-chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
      });
      
      result.push(`<div class="chord-section">`);
      result.push(`<div class="chord-line">${chordHtml}</div>`);
      result.push(`<div class="text-line">${processMarkdownFormatting(nextLine.trim())}</div>`);
      result.push(`</div>`);
      
      i++; // Pula a próxima linha pois já foi processada
    } else if (isChordOnlyLine && !isTextLine && !isIntroLine) {
      // Acordes isolados sem contexto (assume intro)
      const chordHtml = currentLine.replace(/\[([A-G][#b]?[^\]]*)\]/g, (match, chord) => {
        return `<span class="chord intro-chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
      });
      result.push(`<div class="intro-line standalone">${chordHtml}</div>`);
    } else {
      // Linha normal de texto
      if (currentLine.trim()) {
        result.push(`<p>${processMarkdownFormatting(currentLine)}</p>`);
      } else {
        result.push('<br>');
      }
    }
  }
  
  return result.join('\n');
}

/**
 * Processa HTML gerado pelo markdown-it-chords
 */
export function processChordHtml(html: string): string {
  return processInlineChords(html);
}

/**
 * Função principal para processar acordes baseado no formato - suporta formato misto
 */
export function processChords(text: string, format: ChordFormat): string {
  // Se for inline, mas contém seções de intro/ponte, processa como misto
  if (format === 'inline' && /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):\s*$/im.test(text)) {
    return processMixedChords(text);
  }
  
  switch (format) {
    case 'inline':
      // Remove a tag #mic# se presente
      const cleanText = text.replace(/^#mic#\s*\n?/, '').trim();
      return cleanText;
    case 'above':
      return processAboveChords(text);
    default:
      return text;
  }
}

/**
 * Processa acordes em formato misto (inline + intro/ponte)
 */
export function processMixedChords(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    
    // Pula qualquer linha que contenha apenas #mic# (com ou sem espaços)
    if (currentLine.trim() === '#mic#' || currentLine.trim() === '') {
      continue;
    }
    
    // Verifica se é uma linha de intro/ponte (com ou sem dois pontos)
    const isIntroLine = /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/i.test(currentLine.trim());
    
    if (isIntroLine && i + 1 < lines.length) {
      const chordLine = lines[i + 1];
      // Verifica se a próxima linha tem apenas acordes (formato intro/ponte)
      if (/^(\s*\[[A-G][#b]?[^\]]*\]\s*)+\s*$/.test(chordLine.trim())) {
        // Processa linha de intro/ponte
        const chordHtml = chordLine.replace(/\[([A-G][#b]?[^\]]*)\]/g, (match, chord) => {
          return `<span class="chord intro-chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
        });
        result.push(`<div class="intro-section mixed">`);
        result.push(`<div class="intro-label">${processMarkdownFormatting(currentLine.trim())}</div>`);
        result.push(`<div class="intro-line">${chordHtml}</div>`);
        result.push(`</div>`);
        i++; // Pula a próxima linha pois já foi processada
        continue;
      }
    }
    
    // Processa linha normal (pode ter acordes inline)
    if (currentLine.trim()) {
      if (/\[[A-G][#b]?[^\]]*\]/.test(currentLine)) {
        // Linha com acordes inline - processa acordes e markdown separadamente
        let processedLine = currentLine;
        
        // Primeiro extrai acordes para preservá-los
        const chordMatches: { match: string; chord: string; index: number }[] = [];
        const chordRegex = /\[([A-G][#b]?[^\]]*)\]/g;
        let match;
        while ((match = chordRegex.exec(currentLine)) !== null) {
          chordMatches.push({
            match: match[0],
            chord: match[1],
            index: match.index
          });
        }
        
        // Remove acordes temporariamente
        let textWithoutChords = currentLine;
        chordMatches.reverse().forEach(({ match, index }) => {
          textWithoutChords = textWithoutChords.slice(0, index) + '|||CHORD|||' + textWithoutChords.slice(index + match.length);
        });
        
        // Aplica formatação markdown ao texto sem acordes
        textWithoutChords = processMarkdownFormatting(textWithoutChords);
        
        // Reinsere acordes processados
        let chordIndex = 0;
        processedLine = textWithoutChords.replace(/\|\|\|CHORD\|\|\|/g, () => {
          const { chord } = chordMatches[chordMatches.length - 1 - chordIndex];
          chordIndex++;
          return `<span class="chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
        });
        
        result.push(`<p>${processedLine}</p>`);
      } else {
        // Linha de texto normal
        result.push(`<p>${processMarkdownFormatting(currentLine)}</p>`);
      }
    }
  }
  
  return result.join('\n');
}

/**
 * Processa acordes inline simples (sem markdown-it)
 */
export function processSimpleInline(text: string): string {
  // Remove #mic# se presente e limpa linhas vazias
  const lines = text.split('\n')
    .filter(line => line.trim() !== '#mic#') // Remove linhas com apenas #mic#
    .filter(line => line.trim() !== ''); // Remove linhas vazias
  
  const result: string[] = [];
  
  for (const line of lines) {
    if (/\[[A-G][#b]?[^\]]*\]/.test(line)) {
      // Linha com acordes - processa acordes e markdown separadamente
      let processedLine = line;
      
      // Primeiro extrai acordes para preservá-los
      const chordMatches: { match: string; chord: string; index: number }[] = [];
      const chordRegex = /\[([A-G][#b]?[^\]]*)\]/g;
      let match;
      while ((match = chordRegex.exec(line)) !== null) {
        chordMatches.push({
          match: match[0],
          chord: match[1],
          index: match.index
        });
      }
      
      // Remove acordes temporariamente
      let textWithoutChords = line;
      chordMatches.reverse().forEach(({ match, index }) => {
        textWithoutChords = textWithoutChords.slice(0, index) + '|||CHORD|||' + textWithoutChords.slice(index + match.length);
      });
      
      // Aplica formatação markdown ao texto sem acordes
      textWithoutChords = processMarkdownFormatting(textWithoutChords);
      
      // Reinsere acordes processados
      let chordIndex = 0;
      processedLine = textWithoutChords.replace(/\|\|\|CHORD\|\|\|/g, () => {
        const { chord } = chordMatches[chordMatches.length - 1 - chordIndex];
        chordIndex++;
        return `<span class="chord" data-chord-length="${chord.length}"><span class="inner">${chord}</span></span>`;
      });
      
      result.push(`<p>${processedLine}</p>`);
    } else {
      // Linha normal
      result.push(`<p>${processMarkdownFormatting(line)}</p>`);
    }
  }
  
  return result.join('\n');
}
