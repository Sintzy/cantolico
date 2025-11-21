'use client';

import "easymde/dist/easymde.min.css";
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
import { 
  processChordHtml, 
  detectChordFormat, 
  processChords,
  processMixedChords,
  processSimpleInline,
  ChordFormat 
} from "@/lib/chord-processor";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { parseTagsFromPostgreSQL, formatTagsForPostgreSQL } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChordGuideButton } from "@/components/ChordGuidePopup";
import { ArrowLeft, Save, Music, Edit3, Tag, Clock, Settings, Eye, Search as SearchIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { LiturgicalMoment, Instrument, SongType } from '@/lib/constants';

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });

// Estilos CSS para acordes - copiados do arquivo chords.css
const chordsCSS = `
.chord-container-inline .chord,
.chord-container-inline .above-chord,
.chord-container-inline .intro-chord {
  position: relative;
  display: inline-block;
  margin-right: 4px;
}

.chord-container-inline .chord .inner,
.chord-container-inline .above-chord .inner,
.chord-container-inline .intro-chord .inner {
  color: #1e293b !important;
  background: transparent !important;
  font-family: monospace !important;
  font-weight: bold !important;
  font-style: italic !important;
  display: inline-block !important;
  white-space: nowrap !important;
  padding: 0 !important;
}

.chord-container-above .above-chord {
  position: relative;
  display: inline-block;
  margin-right: 8px;
  vertical-align: top;
}

.chord-container-above .above-chord .inner {
  color: #1e293b !important;
  background: transparent !important;
  font-family: monospace !important;
  font-weight: bold !important;
  font-style: italic !important;
  display: block !important;
  white-space: nowrap !important;
  padding: 0 !important;
  margin-bottom: 2px !important;
}
`;

// Função para gerar preview do markdown com background branco
const generatePreview = (markdownText: string): string => {
  if (!markdownText) return '';
  
  const originalFormat = detectChordFormat(markdownText);
  let processedHtml: string;
  let wrapperClass: string;
  
  if (originalFormat === 'inline') {
    if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdownText)) {
      processedHtml = processMixedChords(markdownText);
      wrapperClass = 'chord-container-inline';
    } else {
      processedHtml = processSimpleInline(markdownText);
      wrapperClass = 'chord-container-inline';
    }
  } else {
    processedHtml = processChords(markdownText, 'above');
    wrapperClass = 'chord-container-above';
  }
  
  return `<div class="${wrapperClass}" style="color: #000; background: #fff;">${processedHtml}</div>`;
};

const allInstruments = ["ORGAO", "GUITARRA", "PIANO", "CORO", "OUTRO"];
const allMoments = [
  "ENTRADA", "ATO_PENITENCIAL", "GLORIA", "SALMO", "ACLAMACAO", "OFERTORIO",
  "SANTO", "COMUNHAO", "ACAO_DE_GRACAS", "FINAL", "ADORACAO", "ASPERSAO",
  "BAPTISMO", "BENCAO_DAS_ALIANCAS", "CORDEIRO_DE_DEUS", "CRISMA",
  "INTRODUCAO_DA_PALAVRA", "LOUVOR", "PAI_NOSSO", "REFLEXAO", "TERCO_MISTERIO", "OUTROS",
];

interface SongData {
  id: string;
  title: string;
  slug: string;
  type: SongType;
  mainInstrument: Instrument;
  moments: LiturgicalMoment[];
  tags: string[];
  author?: string | null;
  currentVersion?: {
    id: string;
    lyricsPlain: string;
    sourceText: string;
    keyOriginal?: string;
    mediaUrl?: string;
    spotifyLink?: string;
    youtubeLink?: string;
  };
}

interface EditForm {
  title: string;
  type: SongType;
  mainInstrument: Instrument;
  moments: LiturgicalMoment[];
  tags: string[];
  author: string;
  lyricsPlain: string;
  sourceText: string;
  keyOriginal: string;
  mediaUrl: string;
  spotifyLink: string;
  youtubeLink: string;
}

const liturgicalMomentLabels: Record<LiturgicalMoment, string> = {
  [LiturgicalMoment.ENTRADA]: 'Entrada',
  [LiturgicalMoment.ATO_PENITENCIAL]: 'Ato Penitencial',
  [LiturgicalMoment.GLORIA]: 'Glória',
  [LiturgicalMoment.SALMO]: 'Salmo',
  [LiturgicalMoment.ACLAMACAO]: 'Aclamação',
  [LiturgicalMoment.OFERTORIO]: 'Ofertório',
  [LiturgicalMoment.SANTO]: 'Santo',
  [LiturgicalMoment.COMUNHAO]: 'Comunhão',
  [LiturgicalMoment.ACAO_DE_GRACAS]: 'Ação de Graças',
  [LiturgicalMoment.FINAL]: 'Final',
  [LiturgicalMoment.ADORACAO]: 'Adoração',
  [LiturgicalMoment.ASPERSAO]: 'Aspersão',
  [LiturgicalMoment.BAPTISMO]: 'Batismo',
  [LiturgicalMoment.BENCAO_DAS_ALIANCAS]: 'Bênção das Alianças',
  [LiturgicalMoment.CORDEIRO_DE_DEUS]: 'Cordeiro de Deus',
  [LiturgicalMoment.CRISMA]: 'Crisma',
  [LiturgicalMoment.INTRODUCAO_DA_PALAVRA]: 'Introdução da Palavra',
  [LiturgicalMoment.LOUVOR]: 'Louvor',
  [LiturgicalMoment.PAI_NOSSO]: 'Pai Nosso',
  [LiturgicalMoment.REFLEXAO]: 'Reflexão',
  [LiturgicalMoment.TERCO_MISTERIO]: 'Terço/Mistério',
  [LiturgicalMoment.OUTROS]: 'Outros'
};

const instrumentLabels: Record<Instrument, string> = {
  [Instrument.ORGAO]: 'Órgão',
  [Instrument.GUITARRA]: 'Guitarra',
  [Instrument.PIANO]: 'Piano',
  [Instrument.CORO]: 'Coro',
  [Instrument.OUTRO]: 'Outro'
};

const songTypeLabels: Record<SongType, string> = {
  [SongType.ACORDES]: 'Acordes',
  [SongType.PARTITURA]: 'Partitura'
};

export default function EditMusicPage() {
  // O objeto options precisa ser estável para evitar perder o foco no SimpleMDE
  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: "Escreva a letra da música com acordes...",
    toolbar: [
      "bold",
      "italic",
      "|",
      "unordered-list",
      "ordered-list",
      "|",
      "preview",
      "guide"
    ] as const,
  }), []);

  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(true);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [newTag, setNewTag] = useState('');
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState<EditForm>({
    title: '',
    type: SongType.ACORDES,
    mainInstrument: Instrument.GUITARRA,
    moments: [],
    tags: [],
    author: '',
    lyricsPlain: '',
    sourceText: '',
    keyOriginal: '',
    mediaUrl: '',
    spotifyLink: '',
    youtubeLink: ''
  });

  // Atualiza o preview quando o sourceText muda
  useEffect(() => {
    setPreview(generatePreview(form.sourceText));
  }, [form.sourceText]);

  // Verificar autenticação
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Carregar dados da música
  useEffect(() => {
    if (!songId) return;

    const fetchSongData = async () => {
      try {
        const response = await fetch(`/api/admin/music/${songId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Música não encontrada');
            router.push('/admin/dashboard/musics');
            return;
          }
          throw new Error('Erro ao carregar música');
        }

        const data: SongData = await response.json();
        const parsedTags = parseTagsFromPostgreSQL(data.tags || []);
        
        setSongData(data);
        
        // Preencher formulário com dados atuais
        setForm({
          title: data.title,
          type: data.type,
          mainInstrument: data.mainInstrument,
          moments: Array.isArray(data.moments) ? data.moments : [],
          tags: parsedTags,
          author: data.author || '',
          lyricsPlain: data.currentVersion?.lyricsPlain || '',
          sourceText: data.currentVersion?.sourceText || '',
          keyOriginal: data.currentVersion?.keyOriginal || '',
          mediaUrl: data.currentVersion?.mediaUrl || '',
          spotifyLink: data.currentVersion?.spotifyLink || '',
          youtubeLink: data.currentVersion?.youtubeLink || ''
        });
      } catch (error) {
        console.error('Error fetching song:', error);
        toast.error('Erro ao carregar dados da música');
        router.push('/admin/dashboard/musics');
      } finally {
        setIsLoadingSong(false);
      }
    };

    fetchSongData();
  }, [songId, router]);

  const handleSubmit = async () => {
    if (!songData) return;

    if (!form.title.trim()) {
      toast.error('Por favor, insere o título da música');
      return;
    }

    if (form.moments.length === 0) {
      toast.error('Por favor, seleciona pelo menos um momento litúrgico');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/music/${songId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          mainInstrument: form.mainInstrument,
          moments: form.moments,
          tags: formatTagsForPostgreSQL(form.tags),
          author: form.author.trim() || null,
          lyricsPlain: form.lyricsPlain.trim(),
          sourceText: form.sourceText.trim(),
          keyOriginal: form.keyOriginal.trim(),
          mediaUrl: form.mediaUrl.trim(),
          spotifyLink: form.spotifyLink.trim(),
          youtubeLink: form.youtubeLink.trim()
        }),
      });

      if (response.ok) {
        toast.success('Música atualizada com sucesso!');
        router.push('/admin/dashboard/musics');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar música');
      }
    } catch (error) {
      console.error('Error updating song:', error);
      toast.error('Erro de conexão ao atualizar música');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMomentToggle = (moment: LiturgicalMoment) => {
    setForm(prev => ({
      ...prev,
      moments: prev.moments.includes(moment)
        ? prev.moments.filter(m => m !== moment)
        : [...prev.moments, moment]
    }));
  };

  const toggleMoment = (moment: string) => {
    const momentEnum = moment as LiturgicalMoment;
    setForm(prev => ({
      ...prev,
      moments: prev.moments.includes(momentEnum)
        ? prev.moments.filter(m => m !== momentEnum)
        : [...prev.moments, momentEnum]
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const tagToAdd = newTag.trim().toLowerCase();
    const currentTags = Array.isArray(form.tags) ? form.tags : [];
    
    if (currentTags.includes(tagToAdd)) {
      toast.error('Esta tag já foi adicionada');
      return;
    }

    setForm(prev => ({
      ...prev,
      tags: [...currentTags, tagToAdd]
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: Array.isArray(prev.tags) ? prev.tags.filter(tag => tag !== tagToRemove) : []
    }));
  };

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
    return null;
  }

  if (isLoadingSong) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 shadow-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Carregando Música</h3>
            <p className="text-gray-700">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: chordsCSS }} />
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Música</h1>
              <p className="text-gray-600 mt-1">ID: {songId}</p>
            </div>
            <Badge variant="outline">EDITANDO</Badge>
          </div>
        </div>

        {/* Informações do Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Informações do Editor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-gray-900">{session?.user?.name || "Nome não disponível"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-gray-900">{session?.user?.email || "Email não disponível"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Cargo</Label>
                <Badge variant="outline">{session?.user?.role || "USER"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo Principal */}
        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Mídia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">Título</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Nome da música..."
                      className="bg-white flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Autor (opcional)
                  </Label>
                  <Input
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Nome do autor do cântico..."
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se deixado em branco, o campo autor não será exibido nas informações do cântico
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as SongType })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Escolher tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SongType).map((type) => (
                          <SelectItem key={type} value={type}>{songTypeLabels[type]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Instrumento Principal</Label>
                    <Select value={form.mainInstrument} onValueChange={(value) => setForm({ ...form, mainInstrument: value as Instrument })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Escolher instrumento" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Instrument).map((i) => (
                          <SelectItem key={i} value={i}>{instrumentLabels[i]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tom Original</Label>
                    <Input
                      value={form.keyOriginal}
                      onChange={(e) => setForm({ ...form, keyOriginal: e.target.value })}
                      placeholder="Ex: C, Am, F#m"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Tags carregadas: {form.tags.length > 0 ? form.tags.join(', ') : 'Nenhuma tag encontrada'}
                  </p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Adicionar nova tag..."
                      className="bg-white flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      Adicionar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                    {form.tags.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Nenhuma tag adicionada</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Momentos Litúrgicos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allMoments.map((moment) => (
                      <button
                        key={moment}
                        type="button"
                        className={`px-3 py-1 rounded-full border text-sm transition-colors duration-200 ${
                          form.moments.includes(moment as LiturgicalMoment)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                        onClick={() => toggleMoment(moment)}
                      >
                        {moment.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Spotify Link</Label>
                    <Input
                      value={form.spotifyLink}
                      onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })}
                      placeholder="https://open.spotify.com/..."
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label>YouTube Link</Label>
                    <Input
                      value={form.youtubeLink}
                      onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })}
                      placeholder="https://www.youtube.com/..."
                      className="bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor e Preview lado a lado */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 justify-between w-full">
                      <CardTitle>Editor de Letra e Acordes</CardTitle>
                      <div className="flex items-center gap-2">
                        <ChordGuideButton />
                        {form.title && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100"
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(form.title)}`, '_blank')}
                            title="Pesquisar no Google"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" style={{marginRight: 4}}><g><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C33.962 32.833 29.418 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.803 0 5.377.99 7.409 2.627l6.162-6.162C34.583 6.162 29.583 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c9.941 0 18-8.059 18-18 0-1.209-.13-2.385-.389-3.517z"/><path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c2.803 0 5.377.99 7.409 2.627l6.162-6.162C34.583 6.162 29.583 4 24 4c-7.732 0-14.41 4.388-17.694 10.691z"/><path fill="#FBBC05" d="M24 44c5.363 0 10.29-1.843 14.143-4.995l-6.518-5.348C29.418 36 24 36 24 36c-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44z"/><path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.273-4.418 5.917-11.303 5.917-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44c5.363 0 10.29-1.843 14.143-4.995l-6.518-5.348C29.418 36 24 36 24 36c-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44c9.941 0 18-8.059 18-18 0-1.209-.13-2.385-.389-3.517z"/></g></svg>
                            Google
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Edite a letra da música com acordes usando markdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-blue-900">Formatos de acordes suportados:</h4>
                    <ul className="text-xs space-y-1 text-blue-800">
                      <li><strong>Inline:</strong> <code>#mic#</code> seguido de <code>[C]Deus est[Am]á aqui</code></li>
                      <li><strong>Acima da letra:</strong> <code>[C] [Am] [F]</code> numa linha e <code>Deus está aqui</code> na seguinte</li>
                      <li><strong>Intro/Ponte:</strong> <code>Intro:</code> seguido de <code>[A] [G] [C]</code> na linha seguinte</li>
                      <li><strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música!</li>
                    </ul>
                  </div>
                  <div className="mb-2 p-2 bg-gray-50 border rounded-md text-xs">
                    <strong>Formato detectado:</strong> {detectChordFormat(form.sourceText)}
                    {detectChordFormat(form.sourceText) === 'inline' && form.sourceText.includes('#mic#') && (
                      <span className="ml-2 text-green-600">✓ Tag #mic# encontrada</span>
                    )}
                    {/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(form.sourceText) && (
                      <span className="ml-2 text-blue-600">✓ Seções de intro/ponte detectadas</span>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <SimpleMDE
                      value={form.sourceText}
                      onChange={(value) => setForm({ ...form, sourceText: value })}
                      options={simpleMDEOptions}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Preview da Música</CardTitle>
                  <CardDescription>
                    Visualização de como a música será apresentada aos utilizadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">{form.title || "Título da Música"}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.moments.map(moment => (
                          <Badge key={moment} variant="outline">
                            {moment.replaceAll("_", " ")}
                          </Badge>
                        ))}
                        {form.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="ml-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div
                      className="prose max-w-none font-mono text-sm leading-relaxed"
                      style={{ 
                        lineHeight: '1.8',
                        color: '#000',
                        background: '#fff'
                      }}
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview da Música</CardTitle>
                <CardDescription>
                  Visualização de como a música será apresentada aos utilizadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{form.title || "Título da Música"}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.moments.map(moment => (
                        <Badge key={moment} variant="outline">
                          {moment.replaceAll("_", " ")}
                        </Badge>
                      ))}
                      {form.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="ml-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div
                    className="prose max-w-none font-mono text-sm leading-relaxed"
                    style={{ 
                      lineHeight: '1.8',
                      color: '#000',
                      background: '#fff'
                    }}
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* URL Sections */}
            <Card>
              <CardHeader>
                <CardTitle>URLs de Mídia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL de Mídia/Áudio</Label>
                  <Input
                    value={form.mediaUrl}
                    onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                    placeholder="URL de áudio/vídeo..."
                    className="bg-white"
                  />
                  {form.mediaUrl && (
                    <div className="mt-2 p-4 bg-gray-50 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">Preview do Áudio:</div>
                      <audio controls className="w-full">
                        <source src={form.mediaUrl} type="audio/mpeg" />
                        O teu browser não suporta áudio.
                      </audio>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ações Finais */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                size="lg"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Cancelar
              </Button>
              
              <Button 
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                size="lg"
                disabled={isLoading || !form.title.trim() || form.moments.length === 0}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Guardar Alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
