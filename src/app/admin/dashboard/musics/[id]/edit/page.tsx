'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Music, Edit3, Tag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { LiturgicalMoment, Instrument, SongType } from '@/lib/constants';

interface SongData {
  id: string;
  title: string;
  slug: string;
  type: SongType;
  mainInstrument: Instrument;
  moments: LiturgicalMoment[];
  tags: string[];
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
  [LiturgicalMoment.TERCO_MISTERIO]: 'Terço/Mistério'
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(true);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [newTag, setNewTag] = useState('');
  const [form, setForm] = useState<EditForm>({
    title: '',
    type: SongType.ACORDES,
    mainInstrument: Instrument.GUITARRA,
    moments: [],
    tags: [],
    lyricsPlain: '',
    sourceText: '',
    keyOriginal: '',
    mediaUrl: '',
    spotifyLink: '',
    youtubeLink: ''
  });

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
        setSongData(data);
        
        // Preencher formulário com dados atuais
        setForm({
          title: data.title,
          type: data.type,
          mainInstrument: data.mainInstrument,
          moments: Array.isArray(data.moments) ? data.moments : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          tags: form.tags,
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pb-8 pt-12 md:pb-12 md:pt-16 relative z-10">
            {/* Navigation */}
            <div className="mb-8">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/dashboard/musics">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar à Gestão de Músicas
                </Link>
              </Button>
            </div>

            {/* Header */}
            <div className="text-center lg:text-left">
              <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                <div className="-mx-0.5 flex justify-center lg:justify-start -space-x-2 py-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Music className="text-white text-xs w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Edit3 className="text-white text-xs w-3 h-3" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
                Editar Música
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl">
                Edita todos os campos da música: título, acordes, letra, momentos litúrgicos e muito mais
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Informações Básicas */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-900">
                    Título da Música *
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Ave Maria"
                    required
                    className="h-11"
                  />
                </div>

                {/* Tipo e Instrumento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">
                      Tipo de Música *
                    </Label>
                    <Select value={form.type} onValueChange={(value: SongType) => setForm({ ...form, type: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SongType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {songTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-900">
                      Instrumento Principal *
                    </Label>
                    <Select value={form.mainInstrument} onValueChange={(value: Instrument) => setForm({ ...form, mainInstrument: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Instrument).map((instrument) => (
                          <SelectItem key={instrument} value={instrument}>
                            {instrumentLabels[instrument]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tom Original */}
                <div className="space-y-2">
                  <Label htmlFor="keyOriginal" className="text-sm font-medium text-gray-900">
                    Tom Original
                  </Label>
                  <Input
                    id="keyOriginal"
                    value={form.keyOriginal}
                    onChange={(e) => setForm({ ...form, keyOriginal: e.target.value })}
                    placeholder="Ex: C, Am, F#m"
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Momentos Litúrgicos */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Momentos Litúrgicos *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(LiturgicalMoment).map((moment) => (
                    <div key={moment} className="flex items-center space-x-2">
                      <Checkbox
                        id={moment}
                        checked={form.moments.includes(moment)}
                        onCheckedChange={() => handleMomentToggle(moment)}
                      />
                      <Label
                        htmlFor={moment}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {liturgicalMomentLabels[moment]}
                      </Label>
                    </div>
                  ))}
                </div>
                {form.moments.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">Seleciona pelo menos um momento litúrgico</p>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Adicionar nova tag..."
                    className="h-11"
                    onKeyPress={(e) => {
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
                
                {Array.isArray(form.tags) && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conteúdo Musical */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Conteúdo Musical</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Acordes */}
                <div className="space-y-2">
                  <Label htmlFor="sourceText" className="text-sm font-medium text-gray-900">
                    Acordes e Cifras
                  </Label>
                  <Textarea
                    id="sourceText"
                    value={form.sourceText}
                    onChange={(e) => setForm({ ...form, sourceText: e.target.value })}
                    placeholder="Insere os acordes usando a notação de cifras: [C] [Am] [F] [G]..."
                    className="min-h-48 font-mono text-sm"
                  />
                </div>

                {/* Letra */}
                <div className="space-y-2">
                  <Label htmlFor="lyricsPlain" className="text-sm font-medium text-gray-900">
                    Letra da Música
                  </Label>
                  <Textarea
                    id="lyricsPlain"
                    value={form.lyricsPlain}
                    onChange={(e) => setForm({ ...form, lyricsPlain: e.target.value })}
                    placeholder="Insere a letra da música..."
                    className="min-h-48"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Links Multimídia */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Links Multimídia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl" className="text-sm font-medium text-gray-900">
                      URL de Áudio/Vídeo
                    </Label>
                    <Input
                      id="mediaUrl"
                      value={form.mediaUrl}
                      onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                      placeholder="https://..."
                      type="url"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spotifyLink" className="text-sm font-medium text-gray-900">
                      Link do Spotify
                    </Label>
                    <Input
                      id="spotifyLink"
                      value={form.spotifyLink}
                      onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })}
                      placeholder="https://open.spotify.com/..."
                      type="url"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtubeLink" className="text-sm font-medium text-gray-900">
                      Link do YouTube
                    </Label>
                    <Input
                      id="youtubeLink"
                      value={form.youtubeLink}
                      onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })}
                      placeholder="https://youtube.com/..."
                      type="url"
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Botões de Ação */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={!form.title.trim() || form.moments.length === 0 || isLoading}
                size="lg"
                className="flex-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Alterações
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
