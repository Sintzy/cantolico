'use client';

import 'easymde/dist/easymde.min.css';
import { v4 as randomUUID } from 'uuid';
import { useMemo, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, ShieldCheck, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TurnstileCaptcha } from '@/components/TurnstileCaptcha';
import { FileManager } from '@/components/FileManager';
import MarkdownEditor from '@/components/MarkdownEditor';
import type { FileUploadData } from '@/types/song-files';
import { Instrument, InstrumentLabels, LiturgicalMoment, LiturgicalMomentLabels, SongType } from '@/lib/constants';

export default function AdminCreateMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: 'Escreve a letra com acordes (Markdown)...',
    toolbar: ['bold', 'italic', '|', 'unordered-list', 'ordered-list', '|', 'preview', 'guide'] as const,
  }), []);

  const [form, setForm] = useState({
    id: randomUUID(),
    title: '',
    author: '',
    moments: [] as LiturgicalMoment[],
    tags: [] as string[],
    tagsInput: '',
    type: SongType.ACORDES,
    instrument: Instrument.GUITARRA,
    capo: 0,
    markdown: '',
    youtubeLink: '',
    spotifyLink: '',
  });

  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      router.push('/');
    }
  }, [status, session, router]);

  const toggleMoment = (moment: LiturgicalMoment) => {
    setForm((prev) => ({
      ...prev,
      moments: prev.moments.includes(moment)
        ? prev.moments.filter((m) => m !== moment)
        : [...prev.moments, moment],
    }));
  };

  const addTags = () => {
    const trimmed = form.tagsInput.trim();
    if (!trimmed) return;

    const newTags = trimmed
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag && !form.tags.includes(tag));

    if (newTags.length > 0) {
      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, ...newTags],
        tagsInput: '',
      }));
    }
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('Insere o título da música');
      return false;
    }
    if (!form.instrument) {
      toast.error('Seleciona o instrumento principal');
      return false;
    }
    if (form.moments.length === 0) {
      toast.error('Seleciona pelo menos um momento litúrgico');
      return false;
    }
    if (form.type === SongType.ACORDES && !form.markdown.trim()) {
      toast.error('Insere a letra/acordes em Markdown');
      return false;
    }
    if (form.type === SongType.PARTITURA) {
      const hasPdf = files.some((file) => file.fileType === 'PDF' && file.description?.trim());
      if (!hasPdf) {
        toast.error('Para Partitura, adiciona pelo menos um PDF com descrição');
        return false;
      }
    }
    if (!captchaToken) {
      toast.error('Completa o captcha antes de submeter');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', form.id);
      formData.append('title', form.title.trim());
      formData.append('author', form.author.trim());
      formData.append('instrument', form.instrument);
      formData.append('type', form.type);
      formData.append('capo', String(form.capo));
      formData.append('markdown', form.markdown);
      formData.append('tags', form.tags.join(','));
      formData.append('moments', JSON.stringify(form.moments));
      formData.append('captchaToken', captchaToken!);
      formData.append('youtubeLink', form.youtubeLink.trim());
      formData.append('spotifyLink', form.spotifyLink.trim());

      const validFiles = files.filter((file) => file.description?.trim().length > 0);
      formData.append(
        'files',
        JSON.stringify(
          validFiles.map((file) => ({
            fileType: file.fileType,
            fileName: file.file.name,
            description: file.description.trim(),
            fileSize: file.file.size,
          })),
        ),
      );

      validFiles.forEach((fileData, index) => {
        formData.append(`file_${index}`, fileData.file);
      });

      const response = await fetch('/api/musics/create', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor');
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao criar música');
      }

      toast.success('Música enviada para revisão com sucesso');
      router.push('/admin/dashboard/musics');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar música');
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">A carregar...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Música (Admin)</h1>
          <p className="text-muted-foreground">Página simplificada para criação rápida com upload de PDF/MP3.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dashboard/musics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Dados principais
          </CardTitle>
          <CardDescription>Preenche os campos essenciais e submete numa única página.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Bendito Sejas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="Autor (opcional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as SongType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleciona o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SongType.ACORDES}>Acordes</SelectItem>
                  <SelectItem value={SongType.PARTITURA}>Partitura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Instrumento</Label>
              <Select
                value={form.instrument}
                onValueChange={(value) => setForm((prev) => ({ ...prev, instrument: value as Instrument }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Instrumento principal" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Instrument).map((instrument) => (
                    <SelectItem key={instrument} value={instrument}>
                      {InstrumentLabels[instrument]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capo">Capo</Label>
              <Input
                id="capo"
                type="number"
                min={0}
                max={12}
                value={form.capo}
                onChange={(e) => setForm((prev) => ({ ...prev, capo: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Momentos litúrgicos</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(LiturgicalMoment).map((moment) => {
                const active = form.moments.includes(moment);
                return (
                  <Button
                    key={moment}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMoment(moment)}
                  >
                    {LiturgicalMomentLabels[moment]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={form.tagsInput}
                onChange={(e) => setForm((prev) => ({ ...prev, tagsInput: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTags();
                  }
                }}
                placeholder="Ex: adoração, páscoa, assembleia"
              />
              <Button type="button" variant="outline" onClick={addTags}>Adicionar</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                value={form.youtubeLink}
                onChange={(e) => setForm((prev) => ({ ...prev, youtubeLink: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify">Spotify</Label>
              <Input
                id="spotify"
                value={form.spotifyLink}
                onChange={(e) => setForm((prev) => ({ ...prev, spotifyLink: e.target.value }))}
                placeholder="https://open.spotify.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Letra e acordes
          </CardTitle>
          <CardDescription>Necessário quando o tipo for Acordes.</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            id="admin-create-source"
            value={form.markdown}
            onChange={(value) => setForm((prev) => ({ ...prev, markdown: value }))}
            options={simpleMDEOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ficheiros (PDF e MP3)</CardTitle>
          <CardDescription>
            Upload normal com validação anti-XSS. Cada ficheiro deve ter descrição para ser enviado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileManager mode="create" onChange={setFiles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmação</CardTitle>
          <CardDescription>Captcha obrigatório antes da submissão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TurnstileCaptcha
            onSuccess={(token) => setCaptchaToken(token)}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
          />

          <div className="flex items-center justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSubmitting ? 'A submeter...' : 'Criar música'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
