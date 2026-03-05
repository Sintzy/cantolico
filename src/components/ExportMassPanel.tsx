import React, { useState, useEffect } from 'react';
import { FileText, Presentation, Download, Loader2, Music, Calendar, Church, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  });

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/masses/${massId}/export`)
      .then(res => res.ok ? res.json() : Promise.reject('Missa não encontrada'))
      .then(data => setExportData(data))
      .catch(() => setExportData(null))
      .finally(() => setIsLoading(false));
  }, [massId]);

  const handleExport = () => {
    setIsExporting(true);
    // Monta a URL de exportação PDF
    const params = new URLSearchParams();
    params.set('format', selectedFormat);
    params.set('includeHeader', options.includeHeader ? '1' : '0');
    params.set('includeNotes', options.includeNotes ? '1' : '0');
    params.set('includeMomentTitles', options.includeMomentTitles ? '1' : '0');
    params.set('pageBreakPerMoment', options.pageBreakPerMoment ? '1' : '0');
    params.set('fontSize', options.fontSize);

    const pdfUrl = `/api/masses/${massId}/export/pdf?${params.toString()}`;
    window.open(pdfUrl, '_blank');
    setTimeout(() => {
      setIsExporting(false);
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!exportData) {
    return <div className="flex items-center justify-center h-[60vh] text-gray-500">Erro ao carregar dados da missa.</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{exportData.mass.name}</h2>
      <p className="text-gray-600 mb-4">{exportData.mass.celebration || ''}</p>

      {/* Mass Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Music className="w-4 h-4" />
              {exportData.stats.totalSongs} músicas
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              {exportData.stats.totalMoments} momentos
            </div>
            {exportData.mass.parish && (
              <div className="flex items-center gap-2 text-gray-600">
                <Church className="w-4 h-4" />
                {exportData.mass.parish}
              </div>
            )}
          </div>
          {exportData.stats.uniqueChords.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Acordes utilizados:</p>
              <div className="flex flex-wrap gap-1">
                {exportData.stats.uniqueChords.slice(0, 15).map((chord, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {chord}
                  </Badge>
                ))}
                {exportData.stats.uniqueChords.length > 15 && (
                  <Badge variant="outline" className="text-xs">
                    +{exportData.stats.uniqueChords.length - 15}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Formato de Exportação</CardTitle>
          <CardDescription>Escolhe o formato que pretendes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedFormat('lyrics')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${selectedFormat === 'lyrics' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <FileText className={`w-6 h-6 mb-2 ${selectedFormat === 'lyrics' ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-900">PDF - Só Letras</p>
              <p className="text-sm text-gray-500">Letras limpas sem acordes</p>
            </button>
            <button
              onClick={() => setSelectedFormat('chords')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${selectedFormat === 'chords' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <FileText className={`w-6 h-6 mb-2 ${selectedFormat === 'chords' ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-900">PDF - Com Acordes</p>
              <p className="text-sm text-gray-500">Letras com cifras</p>
            </button>
            <button
              onClick={() => setSelectedFormat('ppt')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${selectedFormat === 'ppt' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Presentation className={`w-6 h-6 mb-2 ${selectedFormat === 'ppt' ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-900">PowerPoint</p>
              <p className="text-sm text-gray-500">Slides para projeção</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Options */}
      {(selectedFormat === 'lyrics' || selectedFormat === 'chords') && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Opções do PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeHeader"
                checked={options.includeHeader}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeHeader: checked as boolean }))}
              />
              <Label htmlFor="includeHeader">Incluir cabeçalho com informação da missa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMomentTitles"
                checked={options.includeMomentTitles}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMomentTitles: checked as boolean }))}
              />
              <Label htmlFor="includeMomentTitles">Incluir títulos dos momentos litúrgicos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeNotes"
                checked={options.includeNotes}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeNotes: checked as boolean }))}
              />
              <Label htmlFor="includeNotes">Incluir notas das músicas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pageBreakPerMoment"
                checked={options.pageBreakPerMoment}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, pageBreakPerMoment: checked as boolean }))}
              />
              <Label htmlFor="pageBreakPerMoment">Nova página por momento</Label>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Tamanho da letra</Label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={options.fontSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOptions(prev => ({ ...prev, fontSize: size }))}
                  >
                    {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conteúdo a exportar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {exportData.items.map((item, index) => (
              <div key={index}>
                <p className="text-sm font-medium text-blue-600">{item.momentLabel}</p>
                <ul className="ml-4 text-sm text-gray-600">
                  {item.songs.map((song, songIndex) => (
                    <li key={songIndex} className="flex items-center gap-2 py-1">
                      <Check className="w-3 h-3 text-green-500" />
                      {song.title}
                      {song.author && <span className="text-gray-400">- {song.author}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end gap-3">
        {onClose && <Button variant="outline" onClick={onClose}>Fechar</Button>}
        <Button onClick={handleExport} disabled={isExporting} size="lg">
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar {selectedFormat === 'ppt' ? 'PowerPoint' : 'PDF'}
        </Button>
      </div>
    </div>
  );
}
