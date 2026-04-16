import React, { useState, useEffect } from 'react';
import { FileText, Presentation, Download, Loader2, Music, Calendar, Church, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export type ExportFormat = 'lyrics' | 'chords' | 'ppt';

export interface ExportData {
  mass: {
    id: string;
    name: string;
    description: string | null;
    date: string | null;
    dateFormatted: string;
    timeFormatted: string;
    parish: string | null;
    celebrant: string | null;
    celebration: string | null;
    liturgicalColor: string | null;
    createdBy: string;
  };
  format: string;
  items: {
    moment: string;
    momentLabel: string;
    songs: {
      title: string;
      author: string | null;
      lyrics: string;
      lyricsWithChords: string;
      chords: string[];
      capo: number | null;
      transpose: number;
      note: string | null;
    }[];
  }[];
  stats: {
    totalSongs: number;
    totalMoments: number;
    uniqueChords: string[];
  };
}

interface ExportMassPanelProps {
  massId: string;
  initialFormat?: ExportFormat;
  onClose?: () => void;
}

const FORMAT_OPTIONS: { id: ExportFormat; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'lyrics',
    label: 'PDF — Letras',
    sub: 'Texto limpo sem acordes',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'chords',
    label: 'PDF — Com Acordes',
    sub: 'Letras com cifras',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'ppt',
    label: 'PowerPoint',
    sub: 'Slides para projeção',
    icon: <Presentation className="h-5 w-5" />,
  },
];

export default function ExportMassPanel({ massId, initialFormat = 'lyrics', onClose }: ExportMassPanelProps) {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initialFormat);
  const [options, setOptions] = useState({
    includeHeader: true,
    includeNotes: true,
    includeMomentTitles: true,
    pageBreakPerMoment: false,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    pptTheme: 'dark' as 'dark' | 'light',
    pptOneVersePerSlide: true,
  });

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/masses/${massId}/export`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setExportData(data))
      .catch(() => setExportData(null))
      .finally(() => setIsLoading(false));
  }, [massId]);

  const handleExport = () => {
    setIsExporting(true);
    const params = new URLSearchParams();
    params.set('format', selectedFormat);
    params.set('includeHeader', options.includeHeader ? '1' : '0');
    params.set('includeNotes', options.includeNotes ? '1' : '0');
    params.set('includeMomentTitles', options.includeMomentTitles ? '1' : '0');
    params.set('pageBreakPerMoment', options.pageBreakPerMoment ? '1' : '0');
    params.set('fontSize', options.fontSize);

    if (selectedFormat === 'ppt') {
      params.set('theme', options.pptTheme);
      params.set('oneVersePerSlide', options.pptOneVersePerSlide ? '1' : '0');
    }

    const endpoint = selectedFormat === 'ppt' ? 'ppt' : 'pdf';
    window.open(`/api/masses/${massId}/export/${endpoint}?${params.toString()}`, '_blank');
    setTimeout(() => setIsExporting(false), 1200);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!exportData) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500 text-sm">
        Erro ao carregar dados da missa.
      </div>
    );
  }

  const isPdf = selectedFormat === 'lyrics' || selectedFormat === 'chords';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-stone-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-rose-700 text-xs">✝</span>
              <span className="h-px w-4 bg-stone-200" />
              <span className="text-xs font-medium tracking-widest text-stone-400 uppercase">Exportar</span>
            </div>
            <h2 className="font-display text-2xl text-stone-900 leading-tight">{exportData.mass.name}</h2>
            {exportData.mass.celebration && (
              <p className="text-sm text-stone-500 mt-0.5">{exportData.mass.celebration}</p>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors mt-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5" />
            {exportData.stats.totalSongs} músicas
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {exportData.stats.totalMoments} momentos
          </span>
          {exportData.mass.parish && (
            <span className="flex items-center gap-1.5">
              <Church className="h-3.5 w-3.5" />
              {exportData.mass.parish}
            </span>
          )}
        </div>

        {exportData.stats.uniqueChords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {exportData.stats.uniqueChords.slice(0, 12).map((chord, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-stone-100 text-stone-600 font-mono">
                {chord}
              </span>
            ))}
            {exportData.stats.uniqueChords.length > 12 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-stone-100 text-stone-400">
                +{exportData.stats.uniqueChords.length - 12}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 space-y-6">
        {/* Format selector */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-3">Formato</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedFormat(opt.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  selectedFormat === opt.id
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${selectedFormat === opt.id ? 'text-stone-300' : 'text-stone-400'}`}>
                  {opt.icon}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${selectedFormat === opt.id ? 'text-white' : 'text-stone-900'}`}>
                    {opt.label}
                  </span>
                  <span className={`block text-xs mt-0.5 ${selectedFormat === opt.id ? 'text-stone-400' : 'text-stone-500'}`}>
                    {opt.sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* PDF options */}
        {isPdf && (
          <div>
            <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-3">Opções do PDF</p>
            <div className="bg-stone-50 rounded-xl border border-stone-100 divide-y divide-stone-100">
              {[
                { id: 'includeHeader', label: 'Cabeçalho com informação da missa', key: 'includeHeader' as const },
                { id: 'includeMomentTitles', label: 'Títulos dos momentos litúrgicos', key: 'includeMomentTitles' as const },
                { id: 'includeNotes', label: 'Notas das músicas', key: 'includeNotes' as const },
                { id: 'pageBreakPerMoment', label: 'Nova página por momento', key: 'pageBreakPerMoment' as const },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-100/50 transition-colors">
                  <Checkbox
                    id={opt.id}
                    checked={options[opt.key]}
                    onCheckedChange={(v) => setOptions(p => ({ ...p, [opt.key]: v as boolean }))}
                    className="border-stone-300"
                  />
                  <span className="text-sm text-stone-700">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-3">
              <p className="text-xs text-stone-500 mb-2">Tamanho da letra</p>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setOptions(p => ({ ...p, fontSize: size }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      options.fontSize === size
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PPT options */}
        {selectedFormat === 'ppt' && (
          <div>
            <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-3">Opções dos Slides</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-stone-500 mb-2">Tema visual</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOptions(p => ({ ...p, pptTheme: 'dark' }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      options.pptTheme === 'dark'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-stone-800 border border-stone-600 inline-block" />
                    Escuro
                  </button>
                  <button
                    onClick={() => setOptions(p => ({ ...p, pptTheme: 'light' }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      options.pptTheme === 'light'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white border border-stone-300 inline-block" />
                    Claro
                  </button>
                </div>
              </div>

              <div className="bg-stone-50 rounded-xl border border-stone-100 divide-y divide-stone-100">
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-100/50 transition-colors">
                  <Checkbox
                    id="pptOneVersePerSlide"
                    checked={options.pptOneVersePerSlide}
                    onCheckedChange={(v) => setOptions(p => ({ ...p, pptOneVersePerSlide: v as boolean }))}
                    className="border-stone-300"
                  />
                  <span>
                    <span className="block text-sm text-stone-700">Um verso por slide</span>
                    <span className="block text-xs text-stone-400 mt-0.5">Ideal para projeção em missa</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-100/50 transition-colors">
                  <Checkbox
                    id="pptIncludeHeader"
                    checked={options.includeHeader}
                    onCheckedChange={(v) => setOptions(p => ({ ...p, includeHeader: v as boolean }))}
                    className="border-stone-300"
                  />
                  <span className="text-sm text-stone-700">Slide de capa da missa</span>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-100/50 transition-colors">
                  <Checkbox
                    id="pptMomentTitles"
                    checked={options.includeMomentTitles}
                    onCheckedChange={(v) => setOptions(p => ({ ...p, includeMomentTitles: v as boolean }))}
                    className="border-stone-300"
                  />
                  <span className="text-sm text-stone-700">Slides de momentos litúrgicos</span>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-100/50 transition-colors">
                  <Checkbox
                    id="pptNotes"
                    checked={options.includeNotes}
                    onCheckedChange={(v) => setOptions(p => ({ ...p, includeNotes: v as boolean }))}
                    className="border-stone-300"
                  />
                  <span className="text-sm text-stone-700">Notas das músicas</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Content preview */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-3">Conteúdo</p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {exportData.items.map((item, i) => (
              <div key={i} className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">{item.momentLabel}</p>
                <ul className="space-y-1">
                  {item.songs.map((song, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-stone-700">
                      <Check className="h-3 w-3 text-stone-400 shrink-0" />
                      <span className="truncate">{song.title}</span>
                      {song.author && (
                        <span className="text-stone-400 text-xs shrink-0">— {song.author}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-4 border-t border-stone-100 shrink-0">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-stone-900 hover:bg-rose-700 text-white transition-colors duration-200 h-11"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'A exportar...' : `Exportar ${selectedFormat === 'ppt' ? 'PowerPoint' : 'PDF'}`}
        </Button>
      </div>
    </div>
  );
}
