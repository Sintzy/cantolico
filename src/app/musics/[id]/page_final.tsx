'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import MarkdownIt from 'markdown-it';
import chords from 'markdown-it-chords';
import { processChordHtml } from '@/lib/chord-processor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import YouTube from 'react-youtube';
import { 
  ChevronDown, 
  Guitar, 
  Download, 
  Play, 
  User, 
  Calendar,
  Tag,
  Clock,
  Music,
  FileText,
  Youtube,
  Volume2,
  Settings,
  Eye
} from 'lucide-react';
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

  const getYoutubeId = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      return u.searchParams.get('v') || '';
    } catch {
      return url.split('v=')[1] || '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="large" />
              <p className="text-muted-foreground">A carregar música...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Music className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Música não encontrada</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { title, mainInstrument, tags, moments, currentVersion } = song;

  return (
    <div className="min-h-screen bg-background">
      {/* Header moderno */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                {title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {currentVersion?.createdBy?.name || 'Desconhecido'}
                </div>
                <div className="flex items-center gap-1">
                  <Guitar className="h-4 w-4" />
                  {mainInstrument}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <StarButton 
                songId={id as string} 
                className="h-10"
              />
              <AddToPlaylistButton 
                songId={id as string}
                className="h-10"
              />
              {pdfUrl && (
                <Button variant="outline" className="h-10" asChild>
                  <a href={`/musics/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sidebar esquerda - Informações e controlos */}
          <div className="xl:col-span-1 space-y-6">
            {/* Controlos de transposição */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Transposição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setTransposition(transposition - 1)}
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-sm font-medium">
                      {transposition >= 0 ? `+${transposition}` : transposition}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setTransposition(transposition + 1)}
                  >
                    +
                  </Button>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-8">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {showChords ? 'Com acordes' : 'Sem acordes'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Visualização</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowChords(true)}>
                      <Guitar className="h-4 w-4 mr-2" />
                      Com acordes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowChords(false)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Sem acordes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            {/* Momentos litúrgicos */}
            {moments.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Momentos Litúrgicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {moments.map((moment, index) => (
                      <div
                        key={`moment-${index}`}
                        className="px-3 py-2 bg-muted rounded-md text-sm"
                      >
                        {moment.replaceAll('_', ' ')}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {tags?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={`tag-${index}`} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Conteúdo principal - Tabs */}
          <div className="xl:col-span-3">
            <Tabs defaultValue="lyrics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="lyrics" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Letra</span>
                </TabsTrigger>
                {currentVersion?.youtubeLink && (
                  <TabsTrigger value="youtube" className="flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    <span className="hidden sm:inline">YouTube</span>
                  </TabsTrigger>
                )}
                {audioUrl && (
                  <TabsTrigger value="audio" className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Áudio</span>
                  </TabsTrigger>
                )}
                {pdfUrl && (
                  <TabsTrigger value="pdf" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab de Letra */}
              <TabsContent value="lyrics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Letra da Música
                    </CardTitle>
                    <CardDescription>
                      {showChords ? 'Visualizando com acordes' : 'Visualizando apenas letra'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentVersion?.sourceText ? (
                      // Sistema de duas colunas para telas grandes
                      rightColumn ? (
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
                        <div className="music-content-container">
                          <div dangerouslySetInnerHTML={{ __html: leftColumn || renderedHtml }} />
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Letra não disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab de YouTube */}
              {currentVersion?.youtubeLink && (
                <TabsContent value="youtube" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Youtube className="h-5 w-5" />
                        Vídeo YouTube
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video">
                        <YouTube 
                          videoId={getYoutubeId(currentVersion.youtubeLink)} 
                          className="w-full h-full"
                          iframeClassName="w-full h-full rounded-md"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab de Áudio */}
              {audioUrl && (
                <TabsContent value="audio" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5" />
                        Áudio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <audio controls className="w-full">
                        <source src={audioUrl} type="audio/mpeg" />
                        O seu navegador não suporta o elemento de áudio.
                      </audio>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab de PDF */}
              {pdfUrl && (
                <TabsContent value="pdf" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        PDF Correspondente
                      </CardTitle>
                      <CardDescription>
                        <a 
                          href={pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Fazer download do PDF
                        </a>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <iframe
                        src={pdfUrl}
                        className="w-full h-[600px] border rounded-md"
                        title="Pré-visualização do PDF"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
        
        {/* Footer com ID */}
        <Separator className="my-8" />
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ID da música: {song.id}
          </p>
        </div>
      </div>
    </div>
  );
}
