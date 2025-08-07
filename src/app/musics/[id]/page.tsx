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
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
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

  // Detecta o tipo de formatação dos acordes baseado na tag #mic#
  const detectChordFormat = (text: string): 'inline' | 'separate' => {
    if (!text) return 'separate';
    // Se contém #mic# no início, é markdown-it-chords (inline)
    if (text.trim().startsWith('#mic#')) {
      return 'inline';
    }
    // Caso contrário, é markdown normal (separate)
    return 'separate';
  };

  // Sistema atualizado para processar acordes usando o chord-processor moderno
  const processChords = (text: string): string => {
    // Importa o sistema correto do chord-processor
    const { 
      detectChordFormat, 
      processChords: processAboveChords,
      processMixedChords,
      processSimpleInline
    } = require('@/lib/chord-processor');
    
    // Detecta o formato original
    const originalFormat = detectChordFormat(text);
    
    let processedHtml: string;
    let wrapperClass: string;
    
    if (originalFormat === 'inline') {
      // Verifica se tem seções de intro/ponte junto com inline (formato misto)
      if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(text)) {
        // Formato misto: processa tudo usando processMixedChords
        processedHtml = processMixedChords(text);
        wrapperClass = 'chord-container-inline';
      } else {
        // Formato inline puro - usa processamento simples
        processedHtml = processSimpleInline(text);
        wrapperClass = 'chord-container-inline';
      }
    } else {
      // Formato above (acordes acima da letra)
      processedHtml = processAboveChords(text, 'above');
      wrapperClass = 'chord-container-above';
    }
    
    return `<div class="${wrapperClass}">${processedHtml}</div>`;
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

  const renderedHtml = useMemo(() => {
    if (!song?.currentVersion?.sourceText) return '';
    
    // Remove a tag #mic# do texto para processamento se presente
    let src = song.currentVersion.sourceText.replace(/^#mic#\s*\n?/, '').trim();
  
    if (!showChords) {
      src = strippedMarkdown(src);
    } else {
      // Aplica transposição se necessário
      if (transposition !== 0) {
        src = transposeMarkdownChords(src, transposition);
      }
    }
  
    // Usa o novo sistema de processamento
    if (showChords) {
      return processChords(src);
    } else {
      // Se não mostra acordes, só converte texto simples
      const lines = src.split('\n');
      const textOnly = lines.map(line => {
        if (/^(?:\s*\[[A-G][#b]?[^\]]*\]\s*)+\s*$/.test(line.trim())) {
          return ''; // Remove linhas só com acordes
        }
        return line.trim() ? `<p>${line}</p>` : '<br>';
      }).filter(line => line).join('\n');
      return `<div class="chord-container-above">${textOnly}</div>`;
    }
  }, [song?.currentVersion?.sourceText, showChords, transposition]);
  
  // Função para dividir o conteúdo em duas colunas baseado em mudanças de estrofe
  const splitContentIntoColumns = (htmlContent: string): { leftColumn: string; rightColumn: string } => {
    if (!htmlContent) return { leftColumn: '', rightColumn: '' };
    
    // Remove o wrapper div temporariamente
    const unwrapped = htmlContent.replace(/^<div class="[^"]*">/, '').replace(/<\/div>$/, '');
    
    // Tenta diferentes estratégias de divisão baseadas no formato
    let sections: string[] = [];
    
    // Estratégia 1: Divide por duplas quebras de linha (<br><br>)
    if (unwrapped.includes('<br><br>')) {
      sections = unwrapped.split(/(<br>\s*<br>)/);
      // Remove elementos vazios e reagrupa corretamente
      sections = sections.filter(s => s.trim() && !s.match(/^<br>\s*<br>$/));
    }
    
    // Estratégia 2: Divide por seções intro/ponte se não houver duplas quebras
    if (sections.length <= 2 && unwrapped.includes('intro-section')) {
      sections = unwrapped.split(/(<div class="intro-section[^"]*">.*?<\/div>)/);
      sections = sections.filter(s => s.trim());
    }
    
    // Estratégia 3: Divide por chord-section se for formato above
    if (sections.length <= 2 && unwrapped.includes('chord-section')) {
      const chordSections = unwrapped.match(/<div class="chord-section">.*?<\/div>/g) || [];
      const otherContent = unwrapped.replace(/<div class="chord-section">.*?<\/div>/g, '|||SPLIT|||');
      const otherParts = otherContent.split('|||SPLIT|||').filter(s => s.trim());
      
      // Intercala seções de acordes com outro conteúdo
      sections = [];
      let chordIndex = 0;
      let otherIndex = 0;
      
      const totalElements = chordSections.length + otherParts.length;
      for (let i = 0; i < totalElements; i++) {
        if (unwrapped.indexOf(chordSections[chordIndex] || '') < unwrapped.indexOf(otherParts[otherIndex] || '')) {
          if (chordIndex < chordSections.length) sections.push(chordSections[chordIndex++]);
        } else {
          if (otherIndex < otherParts.length) sections.push(otherParts[otherIndex++]);
        }
      }
    }
    
    // Estratégia 4: Se ainda não há divisões suficientes, divide por parágrafos
    if (sections.length <= 2) {
      sections = unwrapped.split(/(<p>.*?<\/p>|<br>)/);
      sections = sections.filter(s => s.trim() && s !== '<br>');
    }
    
    // Se há poucas seções, não divide
    if (sections.length <= 3) {
      return { leftColumn: htmlContent, rightColumn: '' };
    }
    
    // Divide aproximadamente ao meio, mas tenta manter seções relacionadas juntas
    const midPoint = Math.ceil(sections.length / 2);
    let leftSections = sections.slice(0, midPoint);
    let rightSections = sections.slice(midPoint);
    
    // Ajuste para evitar dividir intro/refrão ao meio
    const lastLeftSection = leftSections[leftSections.length - 1];
    const firstRightSection = rightSections[0];
    
    if (lastLeftSection?.includes('Refrão') && firstRightSection && !firstRightSection.includes('intro-section')) {
      // Move a última seção da esquerda para a direita
      rightSections.unshift(leftSections.pop()!);
    }
    
    // Reconstrói o HTML com os wrappers apropriados
    const wrapperMatch = htmlContent.match(/^<div class="([^"]*)">/);
    const wrapperClass = wrapperMatch ? wrapperMatch[1] : 'chord-container-above';
    
    const leftColumn = `<div class="${wrapperClass}">${leftSections.join('')}</div>`;
    const rightColumn = rightSections.length > 0 ? `<div class="${wrapperClass}">${rightSections.join('')}</div>` : '';
    
    return { leftColumn, rightColumn };
  };

  const { leftColumn, rightColumn } = useMemo(() => {
    return splitContentIntoColumns(renderedHtml);
  }, [renderedHtml]);
  

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
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl text-white font-bold uppercase tracking-wide mb-4">
              {title}
            </h1>
            
            {/* Botões de ação */}
            <div className="flex items-center justify-center gap-3">
              <StarButton 
                songId={id as string} 
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              />
              <AddToPlaylistButton 
                songId={id as string}
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              />
            </div>
          </div>
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

              {/* Conteúdo da música - Sistema de duas colunas para telas grandes */}
              {rightColumn ? (
                // Duas colunas dentro da mesma caixa (apenas em telas grandes)
                <div className="music-content-container">
                  <div className="music-columns-container">
                    <div className="music-column">
                      <div dangerouslySetInnerHTML={{ __html: leftColumn }} />
                    </div>
                    <div className="music-column">
                      <div dangerouslySetInnerHTML={{ __html: rightColumn }} />
                    </div>
                  </div>
                </div>
              ) : (
                // Uma coluna (conteúdo curto ou telas pequenas)
                <div className="music-content-container">
                  <div dangerouslySetInnerHTML={{ __html: leftColumn || renderedHtml }} />
                </div>
              )}
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
      
      {/* ID da música no fundo da página */}
      <div className="w-full text-center py-4">
        <p className="text-xs text-gray-400">
          ID: {song.id}
        </p>
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