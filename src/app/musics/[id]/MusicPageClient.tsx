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
  const semitones = ['C', 'C#', 'D', 'Eb', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  };

  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  let [_, root, suffix] = match;

  // Convert sharp to flat if needed for easier processing
  if (root in sharpToFlat) {
    root = sharpToFlat[root];
  }

  let rootIndex = semitones.indexOf(root);
  if (rootIndex === -1) {
    // Handle flat notes
    const flatToSharp: Record<string, string> = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    };
    if (root in flatToSharp) {
      rootIndex = semitones.indexOf(flatToSharp[root]);
    }
  }

  if (rootIndex === -1) return chord;

  const newRootIndex = (rootIndex + interval + 12) % 12;
  const newRoot = semitones[newRootIndex];

  return newRoot + suffix;
}

function transposeChords(text: string, interval: number): string {
  return text.replace(/\[([^\]]+)\]/g, (match, chord) => {
    return `[${transposeChord(chord, interval)}]`;
  });
}

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
    
    const transposedText = transposeChords(songData.currentVersion.sourceText, transpose);
    const rawHtml = mdParser.render(transposedText);
    return processChordHtml(rawHtml);
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
