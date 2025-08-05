'use client';

import { useEffect, useState, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import chords from 'markdown-it-chords';
import { processChordHtml } from '@/lib/chord-processor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import YouTube from 'react-youtube';
import { ChevronDown, Guitar } from 'lucide-react';
import "../../../../public/styles/chords.css";

const mdParser = new MarkdownIt({ breaks: true }).use(chords);

type SongData = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  moments: string[];
  mainInstrument: string;
  currentVersion: {
    sourceText: string | null;
    sourcePdfKey: string | null;
    mediaUrl?: string | null;
    youtubeLink?: string | null;
    spotifyLink?: string | null;
    createdBy: { name: string | null } | null;
  };
};

type Props = {
  songData: SongData;
};

function transposeChord(chord: string, interval: number): string {
  // Array completo de semitons (usando sustenidos como padrão)
  const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Mapeamento de bemóis para sustenidos para normalização
  const flatToSharp: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };

  // Regex melhorada para capturar acordes complexos
  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  let [_, root, suffix] = match;

  // Normalizar bemóis para sustenidos
  root = flatToSharp[root] || root;

  const index = semitones.indexOf(root);
  if (index === -1) return chord;

  // Calcular nova posição com wraparound
  const newIndex = (index + interval + semitones.length) % semitones.length;
  const transposed = semitones[newIndex];

  return transposed + suffix;
}

function transposeChords(text: string, interval: number): string {
  return text.replace(/\[([^\]]+)\]/g, (match, chord) => {
    return `[${transposeChord(chord, interval)}]`;
  });
}

// Detecta o tipo de formatação dos acordes
const detectChordFormat = (text: string): 'inline' | 'separate' => {
  // Se encontrar acordes seguidos de texto na mesma linha (ex: [C]Palavra), é inline
  if (/\[[A-G][#b]?[^\]]*\][a-zA-ZÀ-ÿ]/.test(text)) {
    return 'inline';
  }
  // Se encontrar linhas só com acordes seguidas de linhas com texto, é separate
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1].trim();
    
    // Linha atual só tem acordes e espaços
    const isChordOnlyLine = /^(?:\s*\[[A-G][#b]?[^\]]*\]\s*)+$/.test(currentLine);
    // Próxima linha tem texto mas não começa com acorde
    const isTextLine = nextLine && /\S/.test(nextLine) && !/^\s*\[/.test(nextLine);
    
    if (isChordOnlyLine && isTextLine) {
      return 'separate';
    }
  }
  
  return 'inline';
};

// Processa acordes em linha separada para formato inline
const convertSeparateToInline = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    
    // Verifica se é uma linha só com acordes
    const isChordOnlyLine = /^(?:\s*\[[A-G][#b]?[^\]]*\]\s*)+$/.test(currentLine);
    const isTextLine = nextLine && /\S/.test(nextLine) && !/^\s*\[/.test(nextLine);
    
    if (isChordOnlyLine && isTextLine) {
      // Extrai os acordes da linha atual
      const chords = currentLine.match(/\[[A-G][#b]?[^\]]*\]/g) || [];
      const textWords = nextLine.split(/\s+/).filter(word => word.length > 0);
      
      // Distribui os acordes pelas palavras com menos espaçamento
      let convertedLine = '';
      const maxLength = Math.max(chords.length, textWords.length);
      
      for (let j = 0; j < maxLength; j++) {
        if (j < chords.length) {
          convertedLine += chords[j];
        }
        if (j < textWords.length) {
          convertedLine += textWords[j];
          // Adiciona apenas um espaço simples entre palavras
          if (j < textWords.length - 1) {
            convertedLine += ' ';
          }
        }
      }
      
      result.push(convertedLine);
      i++; // Pula a próxima linha pois já foi processada
    } else {
      result.push(lines[i]); // Mantém a linha original com espaços
    }
  }
  
  return result.join('\n');
};

function getKeyOptions(): { label: string; value: number }[] {
  const keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  return keys.map((key, index) => ({
    label: key,
    value: index,
  }));
}

export function MusicPageClient({ songData }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [selectedKey, setSelectedKey] = useState(0);

  const keyOptions = getKeyOptions();

  useEffect(() => {
    if (songData.currentVersion?.sourcePdfKey) {
      const fetchPdfUrl = async () => {
        const { data } = await supabase.storage
          .from('songs')
          .createSignedUrl(songData.currentVersion.sourcePdfKey!, 3600);
        
        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        }
      };

      fetchPdfUrl();
    }
  }, [songData.currentVersion?.sourcePdfKey]);

  const transposedContent = useMemo(() => {
    if (!songData.currentVersion?.sourceText) return '';
    
    // Detecta o formato original ANTES de qualquer processamento
    const originalFormat = detectChordFormat(songData.currentVersion.sourceText);
    
    let text = songData.currentVersion.sourceText;
    
    // Detecta e converte formato se necessário
    const chordFormat = detectChordFormat(text);
    if (chordFormat === 'separate') {
      text = convertSeparateToInline(text);
    }
    
    // Aplica transposição
    const transposedText = transposeChords(text, transpose);
    const rawHtml = mdParser.render(transposedText);
    const processedHtml = processChordHtml(rawHtml);
    
    // Usa o formato original para determinar a classe CSS
    const wrapperClass = originalFormat === 'inline' ? 'chord-container-inline' : 'chord-container-separate';
    
    return `<div class="${wrapperClass}">${processedHtml}</div>`;
  }, [songData.currentVersion?.sourceText, transpose]);

  const handleKeyChange = (keyIndex: number) => {
    const interval = keyIndex - selectedKey;
    setTranspose(prev => prev + interval);
    setSelectedKey(keyIndex);
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regexes = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const regex of regexes) {
      const match = url.match(regex);
      if (match) return match[1];
    }
    return null;
  };

  const youtubeVideoId = songData.currentVersion?.youtubeLink 
    ? extractYouTubeVideoId(songData.currentVersion.youtubeLink)
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header da música */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{songData.title}</h1>
        
        {/* Tags e momentos */}
        <div className="flex flex-wrap gap-2 mb-4">
          {songData.tags.map((tag, index) => (
            <Badge key={index} variant="secondary">
              {tag}
            </Badge>
          ))}
          {songData.moments.map((moment, index) => (
            <Badge key={index} variant="outline">
              {moment}
            </Badge>
          ))}
        </div>

        {/* Instrumento principal */}
        {songData.mainInstrument && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Guitar className="w-4 h-4" />
            <span>Instrumento principal: {songData.mainInstrument}</span>
          </div>
        )}

        {/* Autor */}
        {songData.currentVersion?.createdBy?.name && (
          <p className="text-sm text-muted-foreground">
            Submetido por: {songData.currentVersion.createdBy.name}
          </p>
        )}
      </div>

      {/* Controles de transposição */}
      {songData.currentVersion?.sourceText && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">Tom:</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-20">
                  {keyOptions[selectedKey].label}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Escolher Tom</DropdownMenuLabel>
                {keyOptions.map((key) => (
                  <DropdownMenuItem
                    key={key.value}
                    onClick={() => handleKeyChange(key.value)}
                    className={selectedKey === key.value ? 'bg-accent' : ''}
                  >
                    {key.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newTranspose = transpose - 1;
                  setTranspose(newTranspose);
                  const newKeyIndex = (selectedKey - 1 + 12) % 12;
                  setSelectedKey(newKeyIndex);
                }}
              >
                ♭
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newTranspose = transpose + 1;
                  setTranspose(newTranspose);
                  const newKeyIndex = (selectedKey + 1) % 12;
                  setSelectedKey(newKeyIndex);
                }}
              >
                ♯
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTranspose(0);
                  setSelectedKey(0);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Texto da música */}
        {songData.currentVersion?.sourceText && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Letra e Acordes</h2>
            <div 
              className="markdown-content p-4 bg-card rounded-lg border font-mono text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: transposedContent }}
            />
          </div>
        )}

        {/* PDF */}
        {pdfUrl && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Partitura</h2>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-96"
                title={`Partitura de ${songData.title}`}
              />
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  Abrir PDF
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/musics/${songData.id}/pdf`} target="_blank">
                  Download
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mídia */}
      {(youtubeVideoId || songData.currentVersion?.spotifyLink) && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">Mídia</h2>
          
          {/* YouTube */}
          {youtubeVideoId && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Vídeo</h3>
              <div className="aspect-video">
                <YouTube
                  videoId={youtubeVideoId}
                  className="w-full h-full"
                  iframeClassName="w-full h-full rounded-lg"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Spotify */}
          {songData.currentVersion?.spotifyLink && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Áudio</h3>
              <iframe
                src={songData.currentVersion.spotifyLink.replace('spotify.com', 'open.spotify.com/embed')}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
