'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Music, Download, Check, Trash2, Loader2, AlertCircle, Save, Upload, ExternalLink } from 'lucide-react';
import { formatFileSize } from '@/types/song-files';
import { toast } from 'sonner';

interface ManagedFile {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'AUDIO';
  fileSize: number;
  signedUrl: string | null;
  uploadedAt: string;
  storageKey: string;
  description?: string;
  isPrincipal?: boolean;
  storageFileName?: string;
}

interface FileDraft {
  fileName: string;
  description: string;
}

interface MediaManagerProps {
  submissionId: string;
  onDescriptionChange?: (storageFileName: string, description: string, originalFileName: string) => void;
}

export function MediaManager({ submissionId, onDescriptionChange }: MediaManagerProps) {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FileDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageKey = (f: ManagedFile) =>
    f.storageFileName || f.storageKey.split('/').pop() || f.fileName;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/submission/${submissionId}/files`);
        if (!res.ok) throw new Error('Erro ao carregar');
        const data = await res.json();
        const loaded: ManagedFile[] = data.files || [];
        setFiles(loaded);
        const initial: Record<string, FileDraft> = {};
        loaded.forEach(f => {
          initial[f.id] = { fileName: f.fileName || '', description: f.description || '' };
        });
        setDrafts(initial);
        if (onDescriptionChange) {
          loaded.forEach(f => {
            if (f.description) onDescriptionChange(storageKey(f), f.description, f.fileName);
          });
        }
      } catch {
        toast.error('Erro ao carregar ficheiros');
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const isDirty = files.some(f => {
    const d = drafts[f.id];
    return d && (d.fileName !== (f.fileName || '') || d.description !== (f.description || ''));
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = files.filter(f => {
        const d = drafts[f.id];
        return d && (d.fileName !== (f.fileName || '') || d.description !== (f.description || ''));
      });
      await Promise.all(
        changed.map(f => {
          const d = drafts[f.id];
          return fetch(`/api/admin/submission/${submissionId}/files/metadata`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: storageKey(f), fileName: d.fileName, description: d.description }),
          }).then(r => { if (!r.ok) throw new Error(`Erro ao guardar ${f.fileName}`); });
        })
      );
      setFiles(prev => prev.map(f => {
        const d = drafts[f.id];
        return d ? { ...f, fileName: d.fileName, description: d.description } : f;
      }));
      if (onDescriptionChange) {
        changed.forEach(f => {
          const d = drafts[f.id];
          if (d) onDescriptionChange(storageKey(f), d.description, d.fileName);
        });
      }
      toast.success('Alterações guardadas');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrincipal = async (file: ManagedFile) => {
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/files/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: storageKey(file), isPrincipal: true }),
      });
      if (!res.ok) throw new Error();
      setFiles(prev => prev.map(f => ({ ...f, isPrincipal: f.id === file.id })));
      toast.success('Ficheiro principal atualizado');
    } catch {
      toast.error('Erro ao definir como principal');
    }
  };

  const handleDelete = async (file: ManagedFile) => {
    setDeletingId(file.id);
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/files/${file.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setDrafts(prev => { const n = { ...prev }; delete n[file.id]; return n; });
      toast.success('Ficheiro removido');
    } catch {
      toast.error('Erro ao remover ficheiro');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (selected: FileList) => {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(selected).forEach(f => fd.append('files', f));
      const res = await fetch(`/api/admin/submission/${submissionId}/files`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newFiles: ManagedFile[] = data.files || [];
      setFiles(prev => [...prev, ...newFiles]);
      setDrafts(prev => {
        const n = { ...prev };
        newFiles.forEach(f => { n[f.id] = { fileName: f.fileName || '', description: f.description || '' }; });
        return n;
      });
      toast.success('Ficheiros adicionados');
    } catch {
      toast.error('Erro ao adicionar ficheiros');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
  );

  if (files.length === 0) return (
    <Card className="border border-stone-200">
      <CardContent className="flex flex-col items-center py-10 text-center">
        <AlertCircle className="w-10 h-10 text-stone-300 mb-3" />
        <p className="text-stone-600 font-medium">Nenhum ficheiro</p>
        <p className="text-stone-400 text-sm mt-1">Esta submissão não tem ficheiros anexados</p>
        <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" />Adicionar ficheiros
        </Button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.mp3,.wav,.ogg,.m4a" className="hidden" onChange={e => e.target.files && handleUpload(e.target.files)} />
      </CardContent>
    </Card>
  );

  const pdfs = files.filter(f => f.fileType === 'PDF');
  const audios = files.filter(f => f.fileType === 'AUDIO');

  const renderFile = (file: ManagedFile) => {
    const isPdf = file.fileType === 'PDF';
    const d = drafts[file.id] || { fileName: file.fileName || '', description: file.description || '' };
    const setDraft = (patch: Partial<FileDraft>) =>
      setDrafts(prev => ({ ...prev, [file.id]: { ...d, ...patch } }));

    return (
      <Card key={file.id} className="border border-stone-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
              {isPdf
                ? <FileText className="w-5 h-5 text-red-600" />
                : <Music className="w-5 h-5 text-blue-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400">{formatFileSize(file.fileSize)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {isPdf && (
                <Button size="sm" variant={file.isPrincipal ? 'default' : 'outline'} onClick={() => handleSetPrincipal(file)} disabled={file.isPrincipal} className="h-8 text-xs">
                  {file.isPrincipal ? <><Check className="w-3 h-3 mr-1" />Principal</> : 'Tornar principal'}
                </Button>
              )}
              {isPdf && file.signedUrl && (
                <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                  <a href={file.signedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                </Button>
              )}
              {file.signedUrl && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400" asChild>
                  <a href={file.signedUrl} download={file.fileName}><Download className="w-3.5 h-3.5" /></a>
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-red-600" onClick={() => handleDelete(file)} disabled={deletingId === file.id}>
                {deletingId === file.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {isPdf && file.signedUrl && (
            <div>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-500 px-2" onClick={() => setViewingPdf(viewingPdf === file.signedUrl ? null : file.signedUrl!)}>
                {viewingPdf === file.signedUrl ? 'Fechar PDF' : 'Ver PDF'}
              </Button>
              {viewingPdf === file.signedUrl && (
                <iframe src={file.signedUrl} className="w-full h-[500px] rounded border border-stone-200 mt-2" title={file.fileName} />
              )}
            </div>
          )}

          {!isPdf && file.signedUrl && (
            <audio controls className="w-full h-9" src={file.signedUrl} />
          )}

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-stone-500">Nome</Label>
              <Input value={d.fileName} onChange={e => setDraft({ fileName: e.target.value })} placeholder="Nome do ficheiro..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-500">Descrição</Label>
              <Input value={d.description} onChange={e => setDraft({ description: e.target.value })} placeholder="Ex: Versão simplificada..." className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Adicionar ficheiros
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || saving} className="gap-1.5 bg-rose-700 hover:bg-rose-800 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar alterações
        </Button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.mp3,.wav,.ogg,.m4a" className="hidden" onChange={e => e.target.files && handleUpload(e.target.files)} />
      </div>

      {pdfs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-stone-700">Partituras</span>
            <Badge variant="secondary" className="text-xs">{pdfs.length}</Badge>
          </div>
          {pdfs.map(renderFile)}
        </div>
      )}

      {audios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-stone-700">Áudios</span>
            <Badge variant="secondary" className="text-xs">{audios.length}</Badge>
          </div>
          {audios.map(renderFile)}
        </div>
      )}
    </div>
  );
}
