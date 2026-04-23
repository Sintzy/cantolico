"use client";
import "../../../../public/styles/chords.css";
import ChordDiagrams from '@/components/ChordDiagrams';
import { extractChords } from '@/lib/chord-processor';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Guitar, ChevronDown, ChevronRight, FileText, Music, Youtube, Download, ArrowLeft, Church, X } from 'lucide-react';
import YouTube from 'react-youtube';
import * as React from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { Pencil } from 'lucide-react';
import { Spinner, type SpinnerProps } from '@/components/ui/shadcn-io/spinner';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { LiturgicalMoment, getInstrumentLabel, getLiturgicalMomentLabel } from '@/lib/constants';
import { FileType } from '@/types/song-files';
import { trackEvent } from '@/lib/umami';

// Small badge with hover/click notice for BETA warning
function BetaBadgeWithNotice() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Badge className="bg-stone-100 text-stone-600 cursor-pointer" onClick={() => setOpen(v => !v)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        BETA
      </Badge>
      {open && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 mt-2 w-64 border border-gray-200 shadow rounded p-3 text-sm text-gray-700"
          style={{ backgroundColor: 'rgba(255,255,255,0.98)', zIndex: 9999 }}
        >
          <a className="underline font-bold">Aviso:</a> Esta função está em desenvolvimento, pode conter erros ou imprecisões. Use com cuidado e reporte quaisquer problemas.
        </div>
      )}
    </div>
  );
}

type SongData = {
  id: string;
  title: string;
  tags: string[];
  moments: string[];
  mainInstrument: string;
  type: 'ACORDES' | 'PARTITURA';
  author?: string | null;
  capo?: number | null;
  currentVersion: {
    sourceText: string | null;
    sourcePdfKey: string | null;
    mediaUrl?: string | null;
    youtubeLink?: string | null;
    spotifyLink?: string | null;
    createdBy: { name: string | null } | null;
  };
};

// Helper function para converter chaves do enum para valores bonitos
const getMomentDisplayName = (momentKey: string): string => {
  return getLiturgicalMomentLabel(momentKey);
};

function transposeChord(chord: string, interval: number): string {
  // Array completo de semitons (usando sustenidos como padrão)
  const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  
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
  const router = useRouter();
  const handleBackToList = () => {
    router.push('/musics');
  };
  const { id } = useParams();
  const searchParams = useSearchParams();
  const massId = searchParams.get('massId');
  const [nextMusicUrl, setNextMusicUrl] = React.useState<string | null>(null);
  const [nextMusicTitle, setNextMusicTitle] = React.useState<string | null>(null);
  const [massName, setMassName] = React.useState<string | null>(null);
  const [currentMomentLabel, setCurrentMomentLabel] = React.useState<string | null>(null);
  const { data: session } = useSession();
  const [song, setSong] = React.useState<SongData | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [transposition, setTransposition] = React.useState<number>(0);
  const [showChords, setShowChords] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState(true);
  const [diagramInstrument, setDiagramInstrument] = React.useState<'guitar'|'ukulele'|'piano'>('guitar');
  const [selectedPdfIndex, setSelectedPdfIndex] = React.useState(0);
  const [files, setFiles] = React.useState<Array<{
    id: string;
    fileName: string;
    url: string;
    fileType?: string;
    description?: string;
    signedUrl?: string;
  }>>([]);

  const exitMassMode = () => {
    router.replace(`/musics/${id}`, { scroll: false });
  };

  const openGeneratedPdf = (source: string) => {
    trackEvent('song_pdf_generated', { source, transposition });
    const generatedPdfUrl = `/api/musics/${id}/pdf?transposition=${transposition}`;
    window.open(generatedPdfUrl, '_blank');
  };

  const openOriginalPdf = (source: string) => {
    if (!pdfUrl) return;
    trackEvent('song_pdf_original_opened', { source });
    window.open(pdfUrl, '_blank');
  };

  const changeTransposition = (delta: number, source: string) => {
    const nextValue = transposition + delta;
    trackEvent('song_transposition_changed', { source, value: nextValue });
    setTransposition(nextValue);
  };

  const changeChordsVisibility = (visible: boolean, source: string) => {
    trackEvent('song_chords_visibility_changed', { source, visible });
    setShowChords(visible);
  };

  const changeDiagramInstrument = (instrument: 'guitar' | 'ukulele' | 'piano', source: string) => {
    trackEvent('song_diagram_instrument_changed', { source, instrument });
    setDiagramInstrument(instrument);
  };

  React.useEffect(() => {
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
          trackEvent('song_page_view', { songId: data.id, songType: data.type || 'unknown' });

          // Redirect to slug-based URL if accessing by ID
          if (data.slug && data.slug !== id) {
            router.replace(`/musics/${data.slug}`, { scroll: false });
            return;
          }

          // Buscar ficheiros do novo sistema (endpoint público)
          try {
            const filesRes = await fetch(`/api/musics/${id}/files`);
            if (filesRes.ok) {
              const filesData = await filesRes.json();
              if (filesData.success && filesData.files) {
                // Filtrar ficheiros de metadados e ficheiros ocultos
                const validFiles = filesData.files.filter((f: { fileName: string }) =>
                  !f.fileName.startsWith('.') &&
                  !f.fileName.endsWith('.json') &&
                  f.fileName !== '.metadata.json'
                );
                setFiles(validFiles);
              }
            }
          } catch (err) {
            console.error('Erro ao carregar ficheiros:', err);
          }

          // Sistema antigo (manter por enquanto para compatibilidade)
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

          // Se veio de uma missa, busca contexto e próxima música
          if (massId) {
            try {
              const massRes = await fetch(`/api/masses/${massId}`);
              if (massRes.ok) {
                const massData = await massRes.json();
                setMassName(massData.name || null);

                const massItems: any[] = massData.items || [];
                let found = false;
                for (const item of massItems) {
                  if (found) {
                    const slug = item.song?.slug || item.songId;
                    setNextMusicUrl(`/musics/${slug}?massId=${massId}`);
                    setNextMusicTitle(item.song?.title || null);
                    break;
                  }
                  if (
                    item.song?.slug === data.slug ||
                    item.song?.id === data.id ||
                    item.songId === data.id
                  ) {
                    found = true;
                    setCurrentMomentLabel(getLiturgicalMomentLabel(item.moment));
                  }
                }
              }
            } catch (err) {
              // ignora erro
            }
          }
        } catch (err) {
          console.error('erro ao procurar a música:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchSong();
    }, [id, massId]);

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

  const renderedHtml = React.useMemo(() => {
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

  const { leftColumn, rightColumn } = React.useMemo(() => {
    return splitContentIntoColumns(renderedHtml);
  }, [renderedHtml]);
  

  if (loading) return (
    <div className="flex items-center justify-center h-[300px]">
      <Spinner variant="circle" size={48} className="text-black" />
      <span className="sr-only">A carregar música...</span>
      {/* Visible text removed — only spinner shown */}
    </div>
  );

  if (!song) {
  return <div className="p-6 text-muted-foreground text-center"><Spinner variant="circle" size={32} className="text-black" /><span className="sr-only">A carregar música...</span></div>;
  }

  const { title, mainInstrument, tags, moments, currentVersion, author } = song;
  const isAdmin = session?.user?.role === 'ADMIN';
  const adminEditUrl = song?.id ? `/admin/dashboard/musics/${song.id}/edit` : null;


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
    <>
      <div className="relative w-full min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Músicas
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <StarButton songId={id as string} />
              <AddToPlaylistButton songId={id as string} />
              {song?.type !== 'PARTITURA' && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openGeneratedPdf('hero_desktop')}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
              )}
              {pdfUrl && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openOriginalPdf('hero_desktop')}>
                  <Download className="h-3.5 w-3.5" /> Original
                </Button>
              )}
              {isAdmin && adminEditUrl && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={adminEditUrl} target="_blank" rel="noopener noreferrer">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Cântico</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-stone-900 leading-tight mb-4">
            {title}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {moments.map((m: string, i: number) => (
              <Badge key={i} className="bg-stone-100 text-stone-600 font-medium px-2.5 py-0.5 text-xs">
                {getMomentDisplayName(m)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Mass Mode Banner */}
      {massId && massName && (
        <div className="sticky top-16 z-40 border-b border-rose-100 bg-rose-50/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Church className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span className="text-sm font-medium text-rose-800 truncate">{massName}</span>
              {currentMomentLabel && (
                <>
                  <span className="text-rose-300 hidden sm:inline">·</span>
                  <span className="text-xs text-rose-600 truncate hidden sm:inline">{currentMomentLabel}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {nextMusicUrl && (
                <Link
                  href={nextMusicUrl}
                  onClick={() => trackEvent('mass_next_song_clicked')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-md px-2.5 py-1 transition-colors"
                >
                  <span className="hidden sm:inline">{nextMusicTitle || 'Próxima'}</span>
                  <span className="sm:hidden">Próxima</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
              <button
                onClick={exitMassMode}
                className="text-rose-300 hover:text-rose-500 transition-colors p-0.5"
                aria-label="Sair do modo missa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar (mobile/tablet) - mais espaçoso e tocável */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg safe-area-pb">
        <div className="flex justify-around items-center py-2 px-2">
          <StarButton songId={id as string} className="text-stone-700 p-3 touch-manipulation" />
          <AddToPlaylistButton songId={id as string} className="text-stone-700 p-3 touch-manipulation" />
          {song?.type !== 'PARTITURA' && (
            <Button
              variant="ghost"
              className="text-stone-700 p-3 touch-manipulation"
              onClick={() => openGeneratedPdf('hero_mobile')}
            >
              <FileText className="h-5 w-5" />
            </Button>
          )}
          {pdfUrl && (
            <Button variant="ghost" className="text-stone-700 p-3 touch-manipulation" onClick={() => openOriginalPdf('hero_mobile')}>
              <Download className="h-5 w-5" />
            </Button>
          )}
          {isAdmin && adminEditUrl && (
            <Button
              asChild
              variant="ghost"
              className="text-stone-700 p-3 touch-manipulation"
            >
              <a href={adminEditUrl} target="_blank" rel="noopener noreferrer">
                <Pencil className="h-5 w-5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - padding inferior para não sobrepor floating bar em mobile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-8 md:py-14 pb-20 sm:pb-8 flex flex-col gap-6 sm:gap-8 md:gap-10">
        {/* Mobile/Tablet: Information and Controls BEFORE Lyrics - Only for ACORDES */}
        {song?.type === 'ACORDES' && (
        <div className="lg:hidden space-y-6">
          {/* Transpose Controls - Only for ACORDES type */}
          {song?.type === 'ACORDES' && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3">
              <SidebarTitle>Transpor Tom</SidebarTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => changeTransposition(-1, 'mobile_sidebar')}>-</Button>
                <span className="text-lg font-bold flex-1 text-center select-none">
                  {transposition >= 0 ? `+${transposition}` : transposition}
                </span>
                <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => changeTransposition(1, 'mobile_sidebar')}>+</Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 mt-2 w-full">
                    <Guitar className="h-4 w-4" />
                    {showChords ? 'Com acordes' : 'Sem acordes'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>Visualização</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => changeChordsVisibility(true, 'mobile_sidebar')}>
                    Com acordes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeChordsVisibility(false, 'mobile_sidebar')}>
                    Sem acordes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Botão PDF com transposição — apenas para ACORDES (bloco pai já garante isso) */}
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => openGeneratedPdf('mobile_sidebar')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          )}

          {/* Song Info */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
            <SidebarTitle>Informações</SidebarTitle>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <FileText className="h-4 w-4 mr-1" />
              <span className="font-medium">Enviado por:</span> {currentVersion?.createdBy?.name || 'Desconhecido'}
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Music className="h-4 w-4 mr-1" />
              <span className="font-medium">Instrumento:</span> {getInstrumentLabel(mainInstrument)}
            </div>
            {song?.capo && song.capo > 0 && (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Guitar className="h-4 w-4 mr-1" />
                <span className="font-medium">Capo:</span> <Badge className="bg-amber-100 text-amber-800 font-semibold">{song.capo}ª casa</Badge>
              </div>
            )}
            {author && (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <FileText className="h-4 w-4 mr-1" />
                <span className="font-medium">Autor:</span> {author}
              </div>
            )}
          </div>

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <SidebarTitle>Tags</SidebarTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t, tagIndex) => (
                  <Badge key={tagIndex} className="bg-stone-100 text-stone-600 font-medium px-3 py-1 text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Separate Chords box - Only for ACORDES type */}
          {currentVersion?.sourceText && song?.type === 'ACORDES' && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="flex items-center justify-between">
                  <SidebarTitle>Acordes</SidebarTitle>
                  {/* Beta badge with hover/click notice */}
                  <BetaBadgeWithNotice />
                </div>
                <div className="mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full justify-between" variant="outline">
                      {diagramInstrument === 'guitar' ? 'Guitarra' : diagramInstrument === 'ukulele' ? 'Ukulele' : 'Piano'}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('guitar', 'mobile_diagrams')}>Guitarra</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('ukulele', 'mobile_diagrams')}>Ukulele</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('piano', 'mobile_diagrams')}>Piano</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="mt-4">
                  {/* Pass transposed text so diagrams follow the transposition control */}
                  <ChordDiagrams text={(showChords ? transposeMarkdownChords(currentVersion.sourceText || '', transposition) : currentVersion.sourceText) || ''} size={120} instrument={diagramInstrument} />
                </div>
              </div>
            </div>
          )}

          {/* Download PDF */}
          {pdfUrl && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <SidebarTitle>PDF</SidebarTitle>
              <Button asChild className="w-full" variant="outline">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </a>
              </Button>
            </div>
          )}
        </div>
        )}

        {/* Desktop Layout para ACORDES: Sidebar + Main lado a lado */}
        {song?.type === 'ACORDES' && (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Desktop: Sidebar Controls - Only for ACORDES type */}
        <aside className="hidden lg:flex lg:flex-col lg:w-80 shrink-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Transpose Controls - Only for ACORDES type */}
          {song?.type === 'ACORDES' && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3">
              <SidebarTitle>Transpor Tom</SidebarTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => changeTransposition(-1, 'desktop_sidebar')}>-</Button>
                <span className="text-lg font-bold flex-1 text-center select-none">
                  {transposition >= 0 ? `+${transposition}` : transposition}
                </span>
                <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => changeTransposition(1, 'desktop_sidebar')}>+</Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 mt-2 w-full">
                    <Guitar className="h-4 w-4" />
                    {showChords ? 'Com acordes' : 'Sem acordes'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>Visualização</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => changeChordsVisibility(true, 'desktop_sidebar')}>
                    Com acordes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeChordsVisibility(false, 'desktop_sidebar')}>
                    Sem acordes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Botão PDF com transposição — apenas para ACORDES (bloco pai já garante isso) */}
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => openGeneratedPdf('desktop_sidebar')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          )}

          {/* Song Info */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
            <SidebarTitle>Informações</SidebarTitle>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <FileText className="h-4 w-4 mr-1" />
              <span className="font-medium">Enviado por:</span> {currentVersion?.createdBy?.name || 'Desconhecido'}
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Music className="h-4 w-4 mr-1" />
              <span className="font-medium">Instrumento:</span> {getInstrumentLabel(mainInstrument)}
            </div>
            {song?.capo && song.capo > 0 && (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Guitar className="h-4 w-4 mr-1" />
                <span className="font-medium">Capo:</span> <Badge className="bg-amber-100 text-amber-800 font-semibold">{song.capo}ª casa</Badge>
              </div>
            )}
            {author && (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <FileText className="h-4 w-4 mr-1" />
                <span className="font-medium">Autor:</span> {author}
              </div>
            )}
          </div>

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <SidebarTitle>Tags</SidebarTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t, tagIndex) => (
                  <Badge key={tagIndex} className="bg-stone-100 text-stone-600 font-medium px-3 py-1 text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Separate Chords box - Only for ACORDES type */}
          {currentVersion?.sourceText && song?.type === 'ACORDES' && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
                <div className="flex items-center justify-between">
                  <SidebarTitle>Acordes</SidebarTitle>
                  {/* Beta badge with hover/click notice */}
                  <BetaBadgeWithNotice />
                </div>
                <div className="mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full justify-between" variant="outline">
                      {diagramInstrument === 'guitar' ? 'Guitarra' : diagramInstrument === 'ukulele' ? 'Ukulele' : 'Piano'}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('guitar', 'desktop_diagrams')}>Guitarra</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('ukulele', 'desktop_diagrams')}>Ukulele</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDiagramInstrument('piano', 'desktop_diagrams')}>Piano</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="mt-4">
                  {/* Pass transposed text so diagrams follow the transposition control */}
                  <ChordDiagrams text={(showChords ? transposeMarkdownChords(currentVersion.sourceText || '', transposition) : currentVersion.sourceText) || ''} size={140} instrument={diagramInstrument} />
                </div>
              </div>
            </div>
          )}

          {/* Banner de Anúncios removido */}

          {/* Download PDF */}
          {pdfUrl && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <SidebarTitle>PDF</SidebarTitle>
              <Button asChild className="w-full" variant="outline">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </a>
              </Button>
            </div>
          )}
        </aside>

        {/* Main Song Content para ACORDES */}
        <main className="flex-1 min-w-0 space-y-10">
          {/* Lyrics Section */}
          {currentVersion?.sourceText && (
            <section className="bg-white rounded-2xl p-6 md:p-10 border border-stone-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                <SectionTitle>Letra</SectionTitle>
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  {moments.map((m, i) => (
                    <Badge key={i} className="bg-stone-50 text-stone-600 font-medium px-3 py-1 text-xs">
                      {getMomentDisplayName(m)}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Two columns for large screens, one for small */}
              {rightColumn ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><div dangerouslySetInnerHTML={{ __html: leftColumn }} /></div>
                  <div><div dangerouslySetInnerHTML={{ __html: rightColumn }} /></div>
                </div>
              ) : (
                <div><div dangerouslySetInnerHTML={{ __html: leftColumn || renderedHtml }} /></div>
              )}
            </section>
          )}

          {/* YouTube Section */}
          {currentVersion?.youtubeLink && (
            <section className="bg-white rounded-2xl p-6 md:p-10 border border-stone-200">
              <SectionTitle>YouTube</SectionTitle>
              <div className="aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden shadow">
                <YouTube videoId={getYoutubeId(currentVersion.youtubeLink)} className="w-full h-full" />
              </div>
              <a href={currentVersion.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-rose-700 mt-2 text-sm hover:underline"><Youtube className="h-4 w-4" /> Abrir no YouTube</a>
            </section>
          )}

          {/* Audio Section */}
          {audioUrl && (
            <section className="bg-white rounded-2xl p-6 md:p-10 border border-stone-200">
              <SectionTitle>Áudio</SectionTitle>
              <div className="flex flex-col items-center gap-2">
                <audio controls className="w-full max-w-lg">
                  <source src={audioUrl} type="audio/mpeg" />
                  O seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            </section>
          )}

          {/* Novo Sistema de Ficheiros - Partituras e Áudio */}
          {files.length > 0 && (
            <section className="bg-white rounded-2xl p-6 md:p-10 border border-stone-200">
              {(() => {
                const pdfFiles = files.filter(f => f.fileType === FileType.PDF);
                const audioFiles = files.filter(f => f.fileType === FileType.AUDIO);
                const selectedPdf = pdfFiles[selectedPdfIndex] || pdfFiles[0];

                // Se não houver anexos reais, não renderizamos nada.
                if (pdfFiles.length === 0 && audioFiles.length === 0) return null;

                return (
                  <div className="space-y-8">
                    {/* PDFs (UI igual ao PARTITURA) */}
                    {pdfFiles.length > 0 && (
                      <div className="space-y-4">
                        <SectionTitle>Partituras</SectionTitle>

                        {pdfFiles.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                            {pdfFiles.map((file, index) => (
                              <Button
                                key={file.id}
                                variant={selectedPdfIndex === index ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedPdfIndex(index)}
                                className={`shrink-0 text-xs md:text-sm px-3 md:px-4 py-2 min-h-10 touch-manipulation ${
                                  selectedPdfIndex === index
                                    ? "bg-stone-900 text-white"
                                    : "text-stone-700 border-stone-200 hover:bg-stone-50"
                                }`}
                              >
                                {file.description || `PDF ${index + 1}`}
                              </Button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base md:text-lg font-semibold text-stone-900 truncate">
                            {selectedPdf?.description || 'Partitura'}
                          </h3>
                          {selectedPdf?.signedUrl && (
                            <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs md:text-sm">
                              <a href={selectedPdf.signedUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            </Button>
                          )}
                        </div>

                        {selectedPdf?.signedUrl && (
                          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <iframe
                              src={`${selectedPdf.signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                              className="w-full"
                              style={{
                                height: 'calc(100vh - 280px)',
                                minHeight: '400px',
                                maxHeight: '900px'
                              }}
                              title={selectedPdf.description || 'Partitura'}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Áudios (manter sistema atual) */}
                    {audioFiles.length > 0 && (
                      <div className="space-y-4">
                        <SectionTitle>Áudios</SectionTitle>
                        <div className="space-y-3">
                          {audioFiles.map((file) => (
                            <div key={file.id} className="bg-white rounded-xl border border-stone-200 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-gray-900 truncate flex-1">
                                  {file.description || file.fileName}
                                </p>
                                {file.signedUrl && (
                                  <a
                                    href={file.signedUrl}
                                    download
                                    className="text-gray-500 hover:text-gray-700 shrink-0"
                                    aria-label="Download do áudio"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                              </div>

                              {file.signedUrl && (
                                <audio
                                  controls
                                  preload="metadata"
                                  className="w-full mt-3"
                                >
                                  <source src={file.signedUrl} type="audio/mpeg" />
                                  O seu navegador não suporta o elemento de áudio.
                                </audio>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Song ID */}
          <div className="w-full text-center pt-6">
            <p className="text-xs text-gray-400">ID: {song.id}</p>
          </div>
        </main>
        </div>
        )}

        {/* ========== LAYOUT PARTITURA ========== */}
        {song?.type === 'PARTITURA' && (
          <div className="flex flex-col gap-6">
            {/* Mobile/Tablet: Informações em cards horizontais compactos */}
            <div className="lg:hidden space-y-4">
              {/* Info compacta em linha */}
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Por:</span> {currentVersion?.createdBy?.name || 'Desconhecido'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                      <span className="font-medium">Instr.:</span> {getInstrumentLabel(mainInstrument)}
                    </div>
                    {song?.capo && song.capo > 0 && (
                      <div className="flex items-center gap-1">
                        <Guitar className="h-4 w-4" />
                        <span className="font-medium">Capo:</span> <Badge className="bg-amber-100 text-amber-800 font-semibold text-xs">{song.capo}ª</Badge>
                      </div>
                    )}
                    {author && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Autor:</span> {author}
                      </div>
                    )}
                  </div>
                  {/* Tags inline */}
                  {tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((t, tagIndex) => (
                        <Badge key={tagIndex} className="bg-stone-100 text-stone-600 font-medium px-2 py-0.5 text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Áudios em mobile - player compacto */}
                {files.filter(f => f.fileType === 'AUDIO').length > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 p-4">
                    <h3 className="text-sm font-semibold text-stone-900 mb-3">Áudios</h3>
                    <div className="space-y-3">
                      {files.filter(f => f.fileType === 'AUDIO').map((file) => (
                        <div key={file.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-700 truncate flex-1">
                              {file.description || file.fileName}
                            </p>
                            {file.signedUrl && (
                              <a href={file.signedUrl} download className="text-gray-500 hover:text-gray-700 ml-2">
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {file.signedUrl && (
                            <audio controls className="w-full h-8" preload="metadata">
                              <source src={file.signedUrl} type="audio/mpeg" />
                            </audio>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Layout principal: Sidebar (desktop) + PDF */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Sidebar Esquerda - Só visível em desktop */}
                <aside className="hidden lg:block lg:w-72 xl:w-80 shrink-0 space-y-5">
                  {/* Song Info */}
                  <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
                    <SidebarTitle>Informações</SidebarTitle>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <FileText className="h-4 w-4 mr-1" />
                      <span className="font-medium">Enviado por:</span> {currentVersion?.createdBy?.name || 'Desconhecido'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Music className="h-4 w-4 mr-1" />
                      <span className="font-medium">Instrumento:</span> {getInstrumentLabel(mainInstrument)}
                    </div>
                    {song?.capo && song.capo > 0 && (
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Guitar className="h-4 w-4 mr-1" />
                        <span className="font-medium">Capo:</span> <Badge className="bg-amber-100 text-amber-800 font-semibold">{song.capo}ª casa</Badge>
                      </div>
                    )}
                    {author && (
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <FileText className="h-4 w-4 mr-1" />
                        <span className="font-medium">Autor:</span> {author}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {tags?.length > 0 && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                      <SidebarTitle>Tags</SidebarTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((t, tagIndex) => (
                          <Badge key={tagIndex} className="bg-stone-100 text-stone-600 font-medium px-3 py-1 text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Áudios na Sidebar desktop */}
                  {files.filter(f => f.fileType === 'AUDIO').length > 0 && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                      <SidebarTitle>Áudios</SidebarTitle>
                      <div className="space-y-4 mt-3">
                        {files.filter(f => f.fileType === 'AUDIO').map((file) => (
                          <div key={file.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.description || file.fileName}
                              </p>
                              {file.signedUrl && (
                                <a href={file.signedUrl} download className="text-gray-500 hover:text-gray-700">
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            {file.signedUrl && (
                              <audio controls className="w-full h-10" preload="metadata">
                                <source src={file.signedUrl} type="audio/mpeg" />
                              </audio>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>

                {/* Conteúdo Principal - PDFs com seletor */}
                <main className="flex-1 min-w-0">
                  {(() => {
                    const pdfFiles = files.filter(f => f.fileType === 'PDF');
                    const selectedPdf = pdfFiles[selectedPdfIndex] || pdfFiles[0];

                    if (pdfFiles.length === 0) {
                      return (
                        <div className="bg-amber-50 rounded-2xl shadow-lg p-6 md:p-8 border border-amber-200 text-center">
                          <Music className="h-10 w-10 md:h-12 md:w-12 text-amber-400 mx-auto mb-3 md:mb-4" />
                          <h3 className="text-base md:text-lg font-semibold text-amber-800">Partituras em processamento</h3>
                          <p className="text-amber-700 mt-2 text-sm md:text-base">
                            Os ficheiros desta música estão a ser processados.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <section className="bg-white rounded-2xl p-4 md:p-6 border border-stone-200">
                        {/* Seletor de PDFs - scrollable em mobile */}
                        {pdfFiles.length > 1 && (
                          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                            {pdfFiles.map((file, index) => (
                              <Button
                                key={file.id}
                                variant={selectedPdfIndex === index ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedPdfIndex(index)}
                                className={`shrink-0 text-xs md:text-sm px-3 md:px-4 py-2 min-h-10 touch-manipulation ${
                                  selectedPdfIndex === index 
                                    ? "bg-stone-900 text-white" 
                                    : "text-stone-700 border-stone-200 hover:bg-stone-50"
                                }`}
                              >
                                {file.description || `PDF ${index + 1}`}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Header do PDF selecionado */}
                        <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                          <h2 className="text-base md:text-lg font-semibold text-stone-900 truncate">
                            {selectedPdf?.description || 'Partitura'}
                          </h2>
                          {selectedPdf?.signedUrl && (
                            <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs md:text-sm">
                              <a href={selectedPdf.signedUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* PDF Embebido - otimizado para diferentes ecrãs */}
                        {selectedPdf?.signedUrl && (
                          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <iframe 
                              src={`${selectedPdf.signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                              className="w-full"
                              style={{ 
                                height: 'calc(100vh - 280px)',
                                minHeight: '400px',
                                maxHeight: '900px'
                              }}
                              title={selectedPdf.description || 'Partitura'}
                            />
                          </div>
                        )}
                      </section>
                    );
                  })()}
                </main>
              </div>
            </div>
          )}

        {/* Botão para ir ao topo da página */}
        <ScrollToTopButton />
      </div>
    </div>
    </>
  );
}

// ----------------- Pequenos componentes para títulos com “linha azul” -----------------
// Importação dinâmica para evitar SSR issues
import dynamic from "next/dynamic";
const ScrollToTopButton = dynamic(() => import("@/components/ScrollToTopButton"), { ssr: false });

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold tracking-wide">
      <span className="border-b-2 border-rose-700 pb-1">{children}</span>
    </h2>
  );
}

function SidebarTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="uppercase text-xs tracking-widest text-stone-400 font-semibold">
      <span className="border-b border-stone-200 pb-1">{children}</span>
    </h3>
  );
}