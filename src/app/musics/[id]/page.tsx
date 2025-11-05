'use client';
import "../../../../public/styles/chords.css";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Guitar, ChevronDown, FileText, Music, Youtube, Download, ArrowLeft } from 'lucide-react';
import YouTube from 'react-youtube';
import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner, type SpinnerProps } from '@/components/ui/shadcn-io/spinner';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import { LiturgicalMoment } from '@/lib/constants';

type SongData = {
  id: string;
  title: string;
  tags: string[];
  moments: string[];
  mainInstrument: string;
  author?: string | null;
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
  return LiturgicalMoment[momentKey as keyof typeof LiturgicalMoment] || momentKey.replaceAll('_', ' ');
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
  const router = useRouter();
  const [song, setSong] = React.useState<SongData | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [transposition, setTransposition] = React.useState<number>(0);
  const [showChords, setShowChords] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState(true);

  // Função para voltar preservando o estado da página
  const handleBackToList = React.useCallback(() => {
    // Marca que estamos retornando da página individual
    sessionStorage.setItem('returningFromSong', 'true');
    router.push('/musics');
  }, [router]);

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
        console.error('erro ao procurar a música:', err);
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
    </div>
  );

  if (!song) {
  return <div className="p-6 text-muted-foreground text-center"><Spinner variant="circle" size={32} className="text-black" />A carregar música...</div>;
  }

  const { title, mainInstrument, tags, moments, currentVersion, author } = song;


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
      {/* Structured Data for SEO */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicComposition",
            "name": title,
            "composer": {
              "@type": "Person", 
              "name": author || currentVersion?.createdBy?.name || "Autor desconhecido"
            },
            "musicalKey": mainInstrument,
            "genre": "Sacred Music",
            "keywords": [
              title.toLowerCase(),
              `${title.toLowerCase()} letra`, 
              `${title.toLowerCase()} acordes`,
              "canticos catolicos",
              "musica liturgica",
              ...tags.map(t => t.toLowerCase()),
              ...moments.map(m => getMomentDisplayName(m).toLowerCase())
            ].join(", "),
            "inLanguage": "pt-PT",
            "audience": {
              "@type": "Audience",
              "audienceType": "Catholics"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Cantólico - Cânticos Católicos",
              "url": "https://cantolico.pt"
            },
            "datePublished": new Date().toISOString(),
            "description": `${title} - Cântico católico com letra e acordes para ${moments.map(m => getMomentDisplayName(m).toLowerCase()).join(', ')}`,
            "url": `https://cantolico.pt/musics/${id}`,
            ...(currentVersion?.youtubeLink && {
              "video": {
                "@type": "VideoObject",
                "name": title,
                "embedUrl": currentVersion.youtubeLink,
                "uploadDate": new Date().toISOString()
              }
            })
          })
        }}
      />
      
      <div className="relative w-full min-h-screen bg-white">
      {/* Hero Section with blurred background and overlay */}
      <div className="relative h-64 md:h-80 w-full flex items-center justify-center overflow-hidden">
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 border border-white/30 shadow backdrop-blur-sm"
            onClick={handleBackToList}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Lista
          </Button>
        </div>
        
        <div className="absolute inset-0">
          <img src="/banner.jpg" alt="Banner" className="w-full h-full object-cover object-center scale-110 blur-sm brightness-75" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg tracking-tight text-center mb-2 md:mb-4">
            {title}
          </h1>
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {moments.map((m: string, i: number) => (
              <Badge key={i} className="bg-white/80 text-blue-900 font-semibold px-3 py-1 text-xs shadow-sm">
                {getMomentDisplayName(m)}
              </Badge>
            ))}
          </div>
          <div className="flex gap-3 justify-center mt-2">
            <StarButton songId={id as string} className="bg-white/20 hover:bg-white/40 text-white border-white/30 shadow" />
            <AddToPlaylistButton songId={id as string} className="bg-white/20 hover:bg-white/40 text-white border-white/30 shadow" />
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 border-white/30 shadow"
              onClick={() => {
                const pdfUrl = `/api/musics/${id}/pdf?transposition=${transposition}`;
                window.open(pdfUrl, '_blank');
              }}
            >
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            {pdfUrl && (
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 border-white/30 shadow">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-1" /> PDF Original</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/90 backdrop-blur border-t border-blue-100 flex justify-around py-2 shadow-lg">
        <StarButton songId={id as string} className="text-blue-700" />
        <AddToPlaylistButton songId={id as string} className="text-blue-700" />
        <Button 
          variant="ghost" 
          className="text-blue-700"
          onClick={() => {
            const pdfUrl = `/api/musics/${id}/pdf?transposition=${transposition}`;
            window.open(pdfUrl, '_blank');
          }}
        >
          <FileText className="h-5 w-5" />
        </Button>
        {pdfUrl && (
          <Button asChild variant="ghost" className="text-blue-700">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"><Download className="h-5 w-5" /></a>
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-14 flex flex-col md:flex-row gap-10 md:gap-16">
        {/* Sidebar Controls */}
        <aside className="w-full md:w-80 flex-shrink-0 space-y-8 md:sticky md:top-24">
          {/* Transpose Controls */}
          <div className="bg-white/80 rounded-xl shadow p-5 flex flex-col gap-3 border border-blue-100">
            <SidebarTitle>Transpor Tom</SidebarTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => setTransposition(transposition - 1)}>-</Button>
              <span className="text-lg font-bold flex-1 text-center select-none">
                {transposition >= 0 ? `+${transposition}` : transposition}
              </span>
              <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => setTransposition(transposition + 1)}>+</Button>
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
                <DropdownMenuItem onClick={() => setShowChords(true)}>
                  Com acordes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowChords(false)}>
                  Sem acordes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Botão PDF com transposição */}
            <Button 
              className="w-full mt-2" 
              variant="outline"
              onClick={() => {
                const pdfUrl = `/api/musics/${id}/pdf?transposition=${transposition}`;
                window.open(pdfUrl, '_blank');
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </div>

          {/* Song Info */}
          <div className="bg-white/80 rounded-xl shadow p-5 border border-blue-100 space-y-3">
            <SidebarTitle>Informações</SidebarTitle>
            <div className="flex items-center gap-2 text-sm text-blue-900/80">
              <FileText className="h-4 w-4 mr-1" />
              <span className="font-medium">Enviado por:</span> {currentVersion?.createdBy?.name || 'Desconhecido'}
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-900/80">
              <Music className="h-4 w-4 mr-1" />
              <span className="font-medium">Instrumento:</span> {mainInstrument}
            </div>
            {author && (
              <div className="flex items-center gap-2 text-sm text-blue-900/80">
                <FileText className="h-4 w-4 mr-1" />
                <span className="font-medium">Autor:</span> {author}
              </div>
            )}
          </div>

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="bg-white/80 rounded-xl shadow p-5 border border-blue-100">
              <SidebarTitle>Tags</SidebarTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t, tagIndex) => (
                  <Badge key={tagIndex} className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Banner de Anúncios removido */}

          {/* Download PDF */}
          {pdfUrl && (
            <div className="bg-white/80 rounded-xl shadow p-5 border border-blue-100">
              <SidebarTitle>PDF</SidebarTitle>
              <Button asChild className="w-full" variant="outline">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </a>
              </Button>
            </div>
          )}
        </aside>

        {/* Main Song Content */}
        <main className="flex-1 min-w-0 space-y-10">
          {/* Lyrics Section */}
          {currentVersion?.sourceText && (
            <section className="bg-white/90 rounded-2xl shadow-lg p-6 md:p-10 border border-blue-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                <SectionTitle>Letra</SectionTitle>
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  {moments.map((m, i) => (
                    <Badge key={i} className="bg-blue-50 text-blue-700 font-semibold px-3 py-1 text-xs">
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

          {/* Banner de Anúncios Mobile removido */}

          {/* YouTube Section */}
          {currentVersion?.youtubeLink && (
            <section className="bg-white/90 rounded-2xl shadow-lg p-6 md:p-10 border border-blue-100">
              <SectionTitle>YouTube</SectionTitle>
              <div className="aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden shadow">
                <YouTube videoId={getYoutubeId(currentVersion.youtubeLink)} className="w-full h-full" />
              </div>
              <a href={currentVersion.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-700 mt-2 text-sm hover:underline"><Youtube className="h-4 w-4" /> Abrir no YouTube</a>
            </section>
          )}

          {/* Audio Section */}
          {audioUrl && (
            <section className="bg-white/90 rounded-2xl shadow-lg p-6 md:p-10 border border-blue-100">
              <SectionTitle>Áudio</SectionTitle>
              <div className="flex flex-col items-center gap-2">
                <audio controls className="w-full max-w-lg">
                  <source src={audioUrl} type="audio/mpeg" />
                  O seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            </section>
          )}

          {/* PDF Section */}
          {pdfUrl && (
            <section className="bg-white/90 rounded-2xl shadow-lg p-6 md:p-10 border border-blue-100">
              <SectionTitle>Partitura PDF</SectionTitle>
              <div className="flex flex-col gap-2">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-700 text-sm hover:underline"><Download className="h-4 w-4" /> Baixar PDF</a>
                <iframe src={pdfUrl} className="w-full h-[400px] md:h-[500px] border rounded-lg" title="Pré-visualização do PDF" />
              </div>
            </section>
          )}

          {/* Banner Horizontal Final removido */}

          {/* Song ID at the bottom */}
          <div className="w-full text-center pt-6">
            <p className="text-xs text-gray-400">ID: {song.id}</p>
          </div>
        </main>
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