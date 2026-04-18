# Media Component Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `FileViewer`, `FileManager`, and `SubmissionFileViewer` with a unified `src/components/media/` system of focused primitives and three context-specific components.

**Architecture:** Shared primitives (`AudioPlayer`, `PdfPreview`, `FileCard`) are composed into `MediaViewer` (read-only, `/musics/[id]`), `MediaUploader` (in-memory upload, `/musics/create`), and `MediaManager` (admin CRUD with explicit save, `/admin/review/[id]`). Old components are deleted after call sites are migrated.

**Tech Stack:** Next.js 16 App Router, React, Tailwind v4, shadcn/ui (Button, Card, Badge, Input, Label, Dialog), lucide-react, sonner (toast), `@/types/song-files` (FileType, FileUploadData, formatFileSize).

---

## File Map

| Action | Path |
|---|---|
| Create | `src/components/media/primitives/FileCard.tsx` |
| Create | `src/components/media/primitives/PdfPreview.tsx` |
| Create | `src/components/media/primitives/AudioPlayer.tsx` |
| Create | `src/components/media/MediaViewer.tsx` |
| Create | `src/components/media/MediaUploader.tsx` |
| Create | `src/components/media/MediaManager.tsx` |
| Create | `src/components/media/index.ts` |
| Modify | `src/app/musics/[id]/page.tsx` |
| Modify | `src/app/musics/create/page.tsx` |
| Modify | `src/app/admin/review/[id]/page.tsx` |
| Delete | `src/components/FileViewer.tsx` |
| Delete | `src/components/FileManager.tsx` |
| Delete | `src/components/SubmissionFileViewer.tsx` |

---

## Task 1: FileCard primitive

**Files:**
- Create: `src/components/media/primitives/FileCard.tsx`

- [ ] **Step 1: Create FileCard**

```tsx
// src/components/media/primitives/FileCard.tsx
'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Music } from 'lucide-react';
import { FileType, formatFileSize } from '@/types/song-files';

interface FileCardProps {
  fileName: string;
  fileType: FileType;
  fileSize?: number;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function FileCard({ fileName, fileType, fileSize, description, actions, children }: FileCardProps) {
  const isPdf = fileType === FileType.PDF;
  return (
    <Card className="overflow-hidden border border-stone-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
            {isPdf
              ? <FileText className="w-5 h-5 text-red-600" />
              : <Music className="w-5 h-5 text-blue-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-900 truncate text-sm">
              {description?.trim() || fileName}
            </p>
            {description?.trim() && (
              <p className="text-xs text-stone-500 truncate">{fileName}</p>
            )}
            {fileSize != null && (
              <p className="text-xs text-stone-400 mt-0.5">{formatFileSize(fileSize)}</p>
            )}
            {children}
          </div>
          {actions && <div className="shrink-0 flex flex-col gap-1.5">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/primitives/FileCard.tsx
git commit -m "feat: add FileCard primitive"
```

---

## Task 2: PdfPreview primitive

**Files:**
- Create: `src/components/media/primitives/PdfPreview.tsx`

- [ ] **Step 1: Create PdfPreview**

```tsx
// src/components/media/primitives/PdfPreview.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface PdfPreviewProps {
  url: string;
  fileName: string;
}

export function PdfPreview({ url, fileName }: PdfPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(v => !v)}
          className="gap-1.5 text-stone-700 border-stone-200"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Fechar' : 'Ver partitura'}
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-stone-700 border-stone-200">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-stone-700 border-stone-200">
          <a href={url} download={fileName}>
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </Button>
      </div>
      {open && (
        <iframe
          src={url}
          className="w-full h-[600px] rounded-lg border border-stone-200"
          title={`Preview de ${fileName}`}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/primitives/PdfPreview.tsx
git commit -m "feat: add PdfPreview primitive"
```

---

## Task 3: AudioPlayer primitive

**Files:**
- Create: `src/components/media/primitives/AudioPlayer.tsx`

- [ ] **Step 1: Create AudioPlayer**

```tsx
// src/components/media/primitives/AudioPlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  fileName: string;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function AudioPlayer({ url, fileName, isActive, onActivate, onDeactivate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isActive && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); onDeactivate(); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [onDeactivate]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      onActivate();
      audio.play();
      setIsPlaying(true);
    }
  };

  const seek = (t: number) => {
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2 mt-2">
      <audio ref={audioRef} src={url} className="hidden" />
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant={isActive ? 'default' : 'outline'}
          onClick={toggle}
          className="h-9 w-9 rounded-lg shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={e => seek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-stone-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-700"
            style={{ background: `linear-gradient(to right, hsl(350 84% 53%) ${(currentTime/(duration||1))*100}%, #e7e5e4 ${(currentTime/(duration||1))*100}%)` }}
          />
          <div className="flex justify-between text-[11px] text-stone-400">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => { setIsMuted(v => !v); if (audioRef.current) audioRef.current.muted = !isMuted; }} className="h-8 w-8 text-stone-500">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" asChild className="h-8 w-8 text-stone-500">
          <a href={url} download={fileName}><Download className="w-4 h-4" /></a>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/primitives/AudioPlayer.tsx
git commit -m "feat: add AudioPlayer primitive"
```

---

## Task 4: MediaViewer

**Files:**
- Create: `src/components/media/MediaViewer.tsx`

This replaces `FileViewer`. It receives files already with signed URLs (no fetch), groups by type, uses tabs, renders `PdfPreview` for PDFs and `AudioPlayer` for audios.

- [ ] **Step 1: Create MediaViewer**

```tsx
// src/components/media/MediaViewer.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Music } from 'lucide-react';
import { FileType } from '@/types/song-files';
import { FileCard } from './primitives/FileCard';
import { PdfPreview } from './primitives/PdfPreview';
import { AudioPlayer } from './primitives/AudioPlayer';

interface MediaFile {
  id: string;
  fileType: FileType;
  fileName: string;
  description: string;
  fileSize?: number;
  signedUrl?: string;
}

interface MediaViewerProps {
  files: MediaFile[];
}

export function MediaViewer({ files }: MediaViewerProps) {
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const pdfs = files.filter(f => f.fileType === FileType.PDF);
  const audios = files.filter(f => f.fileType === FileType.AUDIO);

  if (pdfs.length === 0 && audios.length === 0) return null;

  return (
    <Tabs defaultValue={pdfs.length > 0 ? 'pdfs' : 'audios'} className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-11">
        <TabsTrigger value="pdfs" disabled={pdfs.length === 0} className="gap-2">
          <FileText className="w-4 h-4" />
          Partituras
          <Badge variant="secondary">{pdfs.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="audios" disabled={audios.length === 0} className="gap-2">
          <Music className="w-4 h-4" />
          Áudios
          <Badge variant="secondary">{audios.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pdfs" className="space-y-3 mt-4">
        {pdfs.map(f => (
          <FileCard key={f.id} fileName={f.fileName} fileType={f.fileType} fileSize={f.fileSize} description={f.description}>
            {f.signedUrl && <PdfPreview url={f.signedUrl} fileName={f.fileName} />}
          </FileCard>
        ))}
      </TabsContent>

      <TabsContent value="audios" className="space-y-3 mt-4">
        {audios.map(f => (
          <FileCard key={f.id} fileName={f.fileName} fileType={f.fileType} fileSize={f.fileSize} description={f.description}>
            {f.signedUrl && (
              <AudioPlayer
                url={f.signedUrl}
                fileName={f.fileName}
                isActive={activeAudio === f.id}
                onActivate={() => setActiveAudio(f.id)}
                onDeactivate={() => setActiveAudio(null)}
              />
            )}
          </FileCard>
        ))}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/MediaViewer.tsx
git commit -m "feat: add MediaViewer component"
```

---

## Task 5: MediaUploader

**Files:**
- Create: `src/components/media/MediaUploader.tsx`

This is `FileManager` in create-only mode. Drag-and-drop, magic-byte validation, in-memory state, `onChange` callback. The `edit` mode code from `FileManager` is removed entirely.

- [ ] **Step 1: Create MediaUploader**

```tsx
// src/components/media/MediaUploader.tsx
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileType, FileUploadData, formatFileSize } from '@/types/song-files';
import { FileText, Music, Upload, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploaderProps {
  onChange: (files: FileUploadData[]) => void;
  onlyPdf?: boolean;
  maxPdfs?: number;
  maxAudios?: number;
}

// Validate PDF via magic bytes (%PDF-)
async function validatePDF(file: File): Promise<boolean> {
  if (!file.name.toLowerCase().endsWith('.pdf')) return false;
  if (file.type !== 'application/pdf' && file.type !== '') return false;
  const buf = await file.slice(0, 5).arrayBuffer();
  return String.fromCharCode(...new Uint8Array(buf)) === '%PDF-';
}

// Validate audio via magic bytes (MP3/ID3, WAV, OGG, M4A)
async function validateAudio(file: File): Promise<boolean> {
  const ext = file.name.toLowerCase();
  if (!['.mp3', '.wav', '.ogg', '.m4a', '.aac'].some(e => ext.endsWith(e))) return false;
  const buf = await file.slice(0, 12).arrayBuffer();
  const b = new Uint8Array(buf);
  return (
    (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || // ID3
    (b[0] === 0xFF && (b[1] === 0xFB || b[1] === 0xF3 || b[1] === 0xF2)) || // MPEG
    (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) || // WAV
    (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) || // OGG
    (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)    // M4A
  );
}

export function MediaUploader({ onChange, onlyPdf = false, maxPdfs = 20, maxAudios = 20 }: MediaUploaderProps) {
  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<FileType | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const pdfs = files.filter(f => f.fileType === FileType.PDF);
  const audios = files.filter(f => f.fileType === FileType.AUDIO);

  const addFiles = (updated: FileUploadData[]) => {
    setFiles(updated);
    onChange(updated);
  };

  const handleSelect = async (selected: File[], type: FileType) => {
    const currentCount = type === FileType.PDF ? pdfs.length : audios.length;
    const max = type === FileType.PDF ? maxPdfs : maxAudios;
    const maxSizeMb = type === FileType.PDF ? 50 : 20;

    const valid: FileUploadData[] = [];
    for (const file of selected) {
      if (currentCount + valid.length >= max) {
        toast.error(`Máximo de ${max} ${type === FileType.PDF ? 'PDFs' : 'áudios'}`);
        break;
      }
      const ok = type === FileType.PDF ? await validatePDF(file) : await validateAudio(file);
      if (!ok) { toast.error(`${file.name}: ficheiro inválido`); continue; }
      if (file.size > maxSizeMb * 1024 * 1024) { toast.error(`${file.name}: máximo ${maxSizeMb}MB`); continue; }
      valid.push({ file, fileType: type, description: '', fileName: file.name, fileSize: file.size });
    }
    if (valid.length) addFiles([...files, ...valid]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    if (e.target.files) handleSelect(Array.from(e.target.files), type);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    setIsDragging(false);
    setDragType(null);
    if (e.dataTransfer.files) handleSelect(Array.from(e.dataTransfer.files), type);
  };

  const updateDesc = (index: number, description: string) => {
    const updated = files.map((f, i) => i === index ? { ...f, description } : f);
    addFiles(updated);
  };

  const togglePrincipal = (index: number) => {
    const updated = files.map((f, i) => ({ ...f, isMainPdf: i === index ? !f.isMainPdf : false }));
    addFiles(updated);
  };

  const remove = (index: number) => {
    addFiles(files.filter((_, i) => i !== index));
  };

  const dropZone = (type: FileType) => {
    const isPdf = type === FileType.PDF;
    const active = isDragging && dragType === type;
    const atMax = isPdf ? pdfs.length >= maxPdfs : audios.length >= maxAudios;
    const color = isPdf ? 'red' : 'blue';
    return (
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); setDragType(type); }}
        onDragLeave={() => { setIsDragging(false); setDragType(null); }}
        onDrop={e => handleDrop(e, type)}
        onClick={() => !atMax && (isPdf ? pdfInputRef : audioInputRef).current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${active ? `border-${color}-500 bg-${color}-50` : `border-stone-200 hover:border-${color}-300 hover:bg-${color}-50/30`}
          ${atMax ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isPdf
          ? <FileText className={`w-8 h-8 mx-auto mb-2 ${active ? 'text-red-600' : 'text-red-400'}`} />
          : <Music className={`w-8 h-8 mx-auto mb-2 ${active ? 'text-blue-600' : 'text-blue-400'}`} />
        }
        <p className="text-sm font-medium text-stone-700">
          {active ? 'Solte aqui' : `Arraste ${isPdf ? 'PDFs' : 'áudios'} ou clique`}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {isPdf ? 'PDF • máx 50MB' : 'MP3/WAV/OGG • máx 20MB'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* PDFs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50"><FileText className="w-4 h-4 text-red-600" /></div>
            Partituras (PDFs)
          </h3>
          <Button size="sm" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={pdfs.length >= maxPdfs} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />Adicionar
          </Button>
        </div>
        {dropZone(FileType.PDF)}
        {pdfs.map((f, i) => {
          const globalIdx = files.indexOf(f);
          return (
            <Card key={i} className="border border-stone-200">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-50 shrink-0"><FileText className="w-4 h-4 text-red-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{f.fileName}</p>
                    <p className="text-xs text-stone-400">{formatFileSize(f.fileSize || 0)}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => togglePrincipal(globalIdx)} className={`h-8 w-8 ${f.isMainPdf ? 'text-rose-700' : 'text-stone-400'}`} title={f.isMainPdf ? 'Principal' : 'Marcar como principal'}>
                    <Star className={`w-4 h-4 ${f.isMainPdf ? 'fill-current' : ''}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(globalIdx)} className="h-8 w-8 text-stone-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone-500">Descrição <span className="text-red-500">*</span></Label>
                  <Input
                    value={f.description}
                    onChange={e => updateDesc(globalIdx, e.target.value)}
                    placeholder="Ex: Versão coral, arranjo simplificado..."
                    className={`h-8 text-sm ${!f.description.trim() ? 'border-amber-300 bg-amber-50/40' : ''}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Audios */}
      {!onlyPdf && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50"><Music className="w-4 h-4 text-blue-600" /></div>
              Áudios
            </h3>
            <Button size="sm" variant="outline" onClick={() => audioInputRef.current?.click()} disabled={audios.length >= maxAudios} className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />Adicionar
            </Button>
          </div>
          {dropZone(FileType.AUDIO)}
          {audios.map((f, i) => {
            const globalIdx = files.indexOf(f);
            return (
              <Card key={i} className="border border-stone-200">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 shrink-0"><Music className="w-4 h-4 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{f.fileName}</p>
                      <p className="text-xs text-stone-400">{formatFileSize(f.fileSize || 0)}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(globalIdx)} className="h-8 w-8 text-stone-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-stone-500">Descrição <span className="text-red-500">*</span></Label>
                    <Input
                      value={f.description}
                      onChange={e => updateDesc(globalIdx, e.target.value)}
                      placeholder="Ex: Versão instrumental, demo..."
                      className={`h-8 text-sm ${!f.description.trim() ? 'border-amber-300 bg-amber-50/40' : ''}`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <input ref={pdfInputRef} type="file" multiple accept="application/pdf" className="hidden" onChange={e => handleInputChange(e, FileType.PDF)} />
      <input ref={audioInputRef} type="file" multiple accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac" className="hidden" onChange={e => handleInputChange(e, FileType.AUDIO)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/MediaUploader.tsx
git commit -m "feat: add MediaUploader component"
```

---

## Task 6: MediaManager

**Files:**
- Create: `src/components/media/MediaManager.tsx`

This replaces `SubmissionFileViewer`. Key changes vs the original:
- Autosave on blur removed; replaced with a single "Guardar alterações" button that sends one PATCH with all changed files.
- Upload (POST) and delete (DELETE) remain per-file with instant effect.
- `onDescriptionChange` callback is called after save for compatibility with the approve flow.

- [ ] **Step 1: Create MediaManager**

```tsx
// src/components/media/MediaManager.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

// Tracks unsaved edits separately from server state
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
        // Initialise drafts with server values
        const initial: Record<string, FileDraft> = {};
        loaded.forEach(f => {
          initial[f.id] = { fileName: f.fileName || '', description: f.description || '' };
        });
        setDrafts(initial);
        // Notify parent of initial descriptions
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
      // Commit drafts to server state
      setFiles(prev => prev.map(f => {
        const d = drafts[f.id];
        return d ? { ...f, fileName: d.fileName, description: d.description } : f;
      }));
      // Notify parent
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

          {/* PDF inline viewer */}
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

          {/* Audio player */}
          {!isPdf && file.signedUrl && (
            <audio controls className="w-full h-9" src={file.signedUrl} />
          )}

          {/* Editable fields */}
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
      {/* Toolbar */}
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

      {/* PDFs */}
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

      {/* Audios */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/media/MediaManager.tsx
git commit -m "feat: add MediaManager component"
```

---

## Task 7: index.ts and migrate call sites

**Files:**
- Create: `src/components/media/index.ts`
- Modify: `src/app/musics/[id]/page.tsx`
- Modify: `src/app/musics/create/page.tsx`
- Modify: `src/app/admin/review/[id]/page.tsx`

- [ ] **Step 1: Create index.ts**

```ts
// src/components/media/index.ts
export { MediaViewer } from './MediaViewer';
export { MediaUploader } from './MediaUploader';
export { MediaManager } from './MediaManager';
export { FileCard } from './primitives/FileCard';
export { PdfPreview } from './primitives/PdfPreview';
export { AudioPlayer } from './primitives/AudioPlayer';
```

- [ ] **Step 2: Migrate musics/[id]/page.tsx**

In `src/app/musics/[id]/page.tsx`:

Replace the unused import on line 22:
```tsx
// REMOVE:
import { FileViewer } from '@/components/FileViewer';

// ADD:
import { MediaViewer } from '@/components/media';
```

The page already has its own inline PDF/audio rendering using `files` state — the `FileViewer` import was unused. No other changes needed in this file.

- [ ] **Step 3: Migrate musics/create/page.tsx**

In `src/app/musics/create/page.tsx`, replace the FileManager import and usage:

```tsx
// REMOVE:
import { FileManager } from "@/components/FileManager";

// ADD:
import { MediaUploader } from "@/components/media";
```

Find the `<FileManager` JSX usage and replace with `<MediaUploader`. The props interface is identical (`onChange`, `onlyPdf`):

```tsx
// REMOVE:
<FileManager onChange={...} onlyPdf={...} />

// ADD:
<MediaUploader onChange={...} onlyPdf={...} />
```

- [ ] **Step 4: Migrate admin/review/[id]/page.tsx**

In `src/app/admin/review/[id]/page.tsx`:

```tsx
// REMOVE:
import { SubmissionFileViewer } from '@/components/SubmissionFileViewer';

// ADD:
import { MediaManager } from '@/components/media';
```

Find the `<SubmissionFileViewer` JSX and replace:

```tsx
// REMOVE:
<SubmissionFileViewer
  submissionId={submissionId}
  onDescriptionChange={handleFileDescriptionChange}
/>

// ADD:
<MediaManager
  submissionId={submissionId}
  onDescriptionChange={handleFileDescriptionChange}
/>
```

Also remove the unused import of `FileManager` from that file if present.

- [ ] **Step 5: Commit**

```bash
git add src/components/media/index.ts \
        src/app/musics/[id]/page.tsx \
        src/app/musics/create/page.tsx \
        src/app/admin/review/[id]/page.tsx
git commit -m "feat: migrate call sites to new media components"
```

---

## Task 8: Delete old components

**Files:**
- Delete: `src/components/FileViewer.tsx`
- Delete: `src/components/FileManager.tsx`
- Delete: `src/components/SubmissionFileViewer.tsx`

- [ ] **Step 1: Delete old files and verify no remaining imports**

```bash
rm src/components/FileViewer.tsx
rm src/components/FileManager.tsx
rm src/components/SubmissionFileViewer.tsx
```

```bash
# Verify no remaining imports of old components
grep -r "FileViewer\|FileManager\|SubmissionFileViewer" src/ --include="*.tsx" --include="*.ts"
```

Expected output: no matches (empty).

If any matches remain, update those imports to use the new components from `@/components/media`.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors related to missing imports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete old FileViewer, FileManager, SubmissionFileViewer"
```

---

## Verification

After all tasks:

1. Visit `/musics/[id]` — verify no console errors, FileViewer import gone
2. Visit `/musics/create` — add a PDF and an audio, verify they appear in the list with description fields
3. Visit `/admin/review/[id]` — verify files load, edit a description, click "Guardar alterações", verify toast success
4. Run `pnpm typecheck` — zero errors
