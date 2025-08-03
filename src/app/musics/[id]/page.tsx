'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import MarkdownIt from 'markdown-it';
import chords from 'markdown-it-chords';
import { processChordHtml } from '@/lib/chord-processor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
function transposeChord(chord: string, interval: number): string {
  const semitones = ['C', 'C#', 'D', 'Eb', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  };

  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  let [_, root, suffix] = match;

  // Converter sustenido para bemol, se necessário
  root = sharpToFlat[root] || root;

  const index = semitones.indexOf(root);
  if (index === -1) return chord;

  const newIndex = (index + interval + semitones.length) % semitones.length;
  const transposed = semitones[newIndex];

  return transposed + suffix;
}

function transposeMarkdownChords(text: string, interval: number): string {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, interval)}]`);
}

export default function SongPage() {
  const { id } = useParams();
  const [song, setSong] = useState<SongData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transposition, setTransposition] = useState<number>(0);
  const [showChords, setShowChords] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/musics/${id}`);
        const data = await res.json();

        if (!data || data.error) {
          console.error('Erro ao carregar música:', data.error || 'Dados inválidos');
          return;
        }

        setSong(data);

        if (data.currentVersion?.sourcePdfKey) {
          const { data: signedPdfUrlData, error: pdfError } = await supabase
            .storage
            .from('songs')
            .createSignedUrl(data.currentVersion.sourcePdfKey, 60 * 60);

          if (!pdfError) setPdfUrl(signedPdfUrlData?.signedUrl || null);
        }

        if (data.currentVersion?.mediaUrl) {
          const { data: signedAudioUrlData, error: audioError } = await supabase
            .storage
            .from('songs')
            .createSignedUrl(data.currentVersion.mediaUrl, 60 * 60);

          if (!audioError) setAudioUrl(signedAudioUrlData?.signedUrl || null);
        }
      } catch (err) {
        console.error('Erro ao buscar música:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [id]);

  const strippedMarkdown = (md: string) => md.replace(/\[[^\]]*\]/g, '');

  const renderedHtml = useMemo(() => {
    if (!song?.currentVersion?.sourceText) return '';
    let src = song.currentVersion.sourceText;
  
    if (!showChords) {
      src = strippedMarkdown(src);
    } else if (transposition !== 0) {
      src = transposeMarkdownChords(src, transposition);
    }
  
    const rawHtml = mdParser.render(src);
    return processChordHtml(rawHtml);
  }, [song?.currentVersion?.sourceText, showChords, transposition]);
  

  if (loading) return <div className="p-6 text-center"><Spinner size="medium"/>A carregar música...</div>;

  if (!song) {
    return <div className="p-6 text-muted-foreground text-center"><Spinner size="medium" />A carregar música...</div>;
  }

  const { title, mainInstrument, tags, moments, currentVersion } = song;


  const getYoutubeId = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      return u.searchParams.get('v') || '';
    } catch {
      return url.split('v=')[1] || '';
    }
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div
        className="relative h-72 bg-cover bg-center"
        style={{ backgroundImage: "url('/banner.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl text-white font-bold uppercase tracking-wide text-center">
            {title}
          </h1>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16 flex flex-col md:flex-row gap-12">
        {/* Coluna esquerda (controlos) */}
        <aside className="w-full md:w-72 space-y-10">
          {/* Controlos de transposição */}
          <div className="space-y-3">
            <SidebarTitle>Controlos de transposição</SidebarTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-8"
                onClick={() => setTransposition(transposition - 1)}
              >
                -
              </Button>
              <span className="text-sm font-medium flex-1 text-center">
                {transposition >= 0 ? `+${transposition}` : transposition}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="w-8"
                onClick={() => setTransposition(transposition + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Momentos */}
          <div className="space-y-3">
            <SidebarTitle>Momentos</SidebarTitle>
            <div className="space-y-2">
              {moments.map((m, momentIndex) => (
                <div
                  key={`music-${id}-moment-${momentIndex}`}
                  className="border rounded px-3 py-2 text-sm flex justify-between items-center"
                >
                  <span>{m.replaceAll('_', ' ')}</span>
                  <span className="text-muted-foreground">›</span>
                </div>
              ))}
            </div>
          </div>

          {/* Informações */}
          <section className="space-y-3">
            <SidebarTitle>Informações da música</SidebarTitle>

            <p className="text-sm">
              <strong>Autor(a):</strong> {currentVersion?.createdBy?.name || 'Desconhecido'}
            </p>
            <p className="text-sm">
              <strong>Instrumento principal:</strong> {mainInstrument}
            </p>
          </section>

          {/* Tags */}
          {tags?.length > 0 && (
            <section className="space-y-2">
              <SidebarTitle>Tags</SidebarTitle>
              <div className="flex flex-wrap gap-1">
                {tags.map((t, tagIndex) => (
                  <Badge key={`music-${id}-tag-${tagIndex}`} className="bg-blue-100 text-blue-800">
                    {t}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Download rápido */}
          {pdfUrl && (
            <div className="space-y-3">
              <SidebarTitle>Download</SidebarTitle>
              <Button className="w-full" asChild>
                <a href={`/musics/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <Guitar className="h-4 w-4 mr-2" /> Download PDF com Acordes
                </a>
              </Button>
            </div>
          )}
        </aside>

        {/* Coluna direita (letra e conteúdo principal) */}
        <div className="flex-1 space-y-10 leading-relaxed">
          {/* Letra */}
          {currentVersion?.sourceText && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle>Letra</SectionTitle>

                {/* Opções (Com / Sem acordes) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-8">
                      <Guitar className="h-4 w-4" />
                      {showChords ? 'Com acordes' : 'Sem acordes'}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Opções</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowChords(false)}>
                      Sem acordes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowChords(true)}>
                      Com acordes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className="bg-white rounded-md border p-6 overflow-auto font-mono text-sm leading-relaxed"
                style={{ lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </section>
          )}

          {/* YouTube */}
          {currentVersion?.youtubeLink && (
            <section className="space-y-4">
              <SectionTitle>YouTube</SectionTitle>
              <YouTube videoId={getYoutubeId(currentVersion.youtubeLink)} />
            </section>
          )}

          {/* Áudio */}
          {audioUrl && (
          <section className="space-y-4">
              <SectionTitle>Áudio</SectionTitle>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                O seu navegador não suporta o elemento de áudio.
              </audio>
            </section>
          )}

          {/* PDF */}
          {pdfUrl && (
            <section className="space-y-4">
              <SectionTitle>PDF Correspondente</SectionTitle>
                <p>
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-gray-500 hover:underline"
                >
                  Fazer download do PDF
                </a>
                </p>

              <iframe
                src={pdfUrl}
                className="w-full h-[500px] border rounded"
                title="Pré-visualização do PDF"
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Pequenos componentes para títulos com “linha azul” ----------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold tracking-wide">
      <span className="border-b-2 border-sky-500 pb-1">{children}</span>
    </h2>
  );
}

function SidebarTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="uppercase text-sm tracking-widest text-muted-foreground font-semibold">
      <span className="border-b-2 border-sky-500 pb-1">{children}</span>
    </h3>
  );
}