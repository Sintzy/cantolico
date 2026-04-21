'use client';

import 'easymde/dist/easymde.min.css';
import { v4 as randomUUID } from 'uuid';
import { useMemo, useState, useEffect } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Zap, Music2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileManager } from '@/components/FileManager';
import MarkdownEditor from '@/components/MarkdownEditor';
import type { FileUploadData } from '@/types/song-files';
import { Instrument, InstrumentLabels, LiturgicalMoment, LiturgicalMomentLabels, SongType } from '@/lib/constants';

export default function FastCreatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: 'Escreve a letra com acordes (Markdown)...',
    toolbar: ['bold', 'italic', '|', 'unordered-list', 'ordered-list', '|', 'preview', 'guide'] as const,
  }), []);

  const [form, setForm] = useState({
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
    const newTags = trimmed.split(',').map((t) => t.trim()).filter((t) => t && !form.tags.includes(t));
    if (newTags.length > 0) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, ...newTags], tagsInput: '' }));
    }
  };

  const removeTag = (tag: string) => setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Insere o título da música'); return; }
    if (form.moments.length === 0) { toast.error('Seleciona pelo menos um momento litúrgico'); return; }
    if (form.type === SongType.ACORDES && !form.markdown.trim()) { toast.error('Insere a letra/acordes'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('author', form.author.trim());
      formData.append('instrument', form.instrument);
      formData.append('type', form.type);
      formData.append('capo', String(form.capo));
      formData.append('markdown', form.markdown);
      formData.append('tags', form.tags.join(','));
      formData.append('moments', JSON.stringify(form.moments));
      formData.append('youtubeLink', form.youtubeLink.trim());
      formData.append('spotifyLink', form.spotifyLink.trim());

      const validFiles = files.filter((f) => f.description?.trim().length > 0);
      formData.append('files', JSON.stringify(
        validFiles.map((f) => ({
          fileType: f.fileType,
          fileName: f.file.name,
          description: f.description.trim(),
          fileSize: f.file.size,
        }))
      ));
      validFiles.forEach((f, i) => formData.append(`file_${i}`, f.file));

      const res = await fetch('/api/admin/fastcreate', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao criar música');

      toast.success('Música criada e publicada com sucesso!');
      router.push(`/musics/${data.slug}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar música');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card><CardContent className="py-10 text-center text-muted-foreground">A carregar...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Publicação Rápida
          </h1>
          <p className="text-muted-foreground text-sm">A música é publicada diretamente sem passar por revisão.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Dados principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Dados principais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Bendito Sejas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="Autor (opcional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as SongType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SongType.ACORDES}>Acordes</SelectItem>
                  <SelectItem value={SongType.PARTITURA}>Partitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instrumento</Label>
              <Select value={form.instrument} onValueChange={(v) => setForm((p) => ({ ...p, instrument: v as Instrument }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(Instrument).map((inst) => (
                    <SelectItem key={inst} value={inst}>{InstrumentLabels[inst]}</SelectItem>
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
                onChange={(e) => setForm((p) => ({ ...p, capo: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Momentos litúrgicos *</Label>
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
                onChange={(e) => setForm((p) => ({ ...p, tagsInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTags(); } }}
                placeholder="Ex: adoração, páscoa (separadas por vírgula)"
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
                onChange={(e) => setForm((p) => ({ ...p, youtubeLink: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify">Spotify</Label>
              <Input
                id="spotify"
                value={form.spotifyLink}
                onChange={(e) => setForm((p) => ({ ...p, spotifyLink: e.target.value }))}
                placeholder="https://open.spotify.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Letra e acordes */}
      {form.type === SongType.ACORDES && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Music2 className="h-4 w-4" />
              Letra e acordes
            </CardTitle>
            <CardDescription>Obrigatório para o tipo Acordes.</CardDescription>
          </CardHeader>
          <CardContent>
            <MarkdownEditor
              id="fastcreate-source"
              value={form.markdown}
              onChange={(value) => setForm((p) => ({ ...p, markdown: value }))}
              options={simpleMDEOptions}
            />
          </CardContent>
        </Card>
      )}

      {/* Ficheiros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficheiros (PDF e MP3)</CardTitle>
          <CardDescription>Cada ficheiro deve ter uma descrição para ser incluído.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileManager mode="create" onChange={setFiles} />
        </CardContent>
      </Card>

      {/* Publicar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              A música será publicada imediatamente e estará disponível no site.
            </p>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-32">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A publicar...</>
                : <><Zap className="h-4 w-4 mr-2" /> Publicar música</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
