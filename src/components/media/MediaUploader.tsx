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

async function validatePDF(file: File): Promise<boolean> {
  if (!file.name.toLowerCase().endsWith('.pdf')) return false;
  if (file.type !== 'application/pdf' && file.type !== '') return false;
  const buf = await file.slice(0, 5).arrayBuffer();
  return String.fromCharCode(...new Uint8Array(buf)) === '%PDF-';
}

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
    return (
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); setDragType(type); }}
        onDragLeave={() => { setIsDragging(false); setDragType(null); }}
        onDrop={e => handleDrop(e, type)}
        onClick={() => !atMax && (isPdf ? pdfInputRef : audioInputRef).current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${active
            ? isPdf ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
            : isPdf ? 'border-stone-200 hover:border-red-300 hover:bg-red-50/30' : 'border-stone-200 hover:border-blue-300 hover:bg-blue-50/30'
          }
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
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-stone-900 flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-red-50 shrink-0"><FileText className="w-4 h-4 text-red-600" /></div>
            <span className="truncate">Partituras (PDFs)</span>
          </h3>
          <Button size="sm" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={pdfs.length >= maxPdfs} className="gap-1.5 shrink-0">
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

      {!onlyPdf && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-stone-900 flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-50 shrink-0"><Music className="w-4 h-4 text-blue-600" /></div>
              <span className="truncate">Áudios</span>
            </h3>
            <Button size="sm" variant="outline" onClick={() => audioInputRef.current?.click()} disabled={audios.length >= maxAudios} className="gap-1.5 shrink-0">
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
