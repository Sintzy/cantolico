'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileType } from '@/types/song-files';
import { 
  FileText, 
  Music, 
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ExternalLink
} from 'lucide-react';
import { formatFileSize } from '@/types/song-files';

interface SongFile {
  id: string;
  fileType: FileType;
  fileName: string;
  description: string;
  fileSize?: number;
  signedUrl?: string;
}

interface FileViewerProps {
  files: SongFile[];
}

export function FileViewer({ files }: FileViewerProps) {
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pdfs = files.filter(f => f.fileType === FileType.PDF);
  const audios = files.filter(f => f.fileType === FileType.AUDIO);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playAudio = (fileId: string, url: string) => {
    if (currentAudio === fileId && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentAudio(fileId);
      setCurrentTime(0);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        audioRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    handleSeek(newTime);
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    handleSeek(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentAudioFile = () => {
    return audios.find(a => a.id === currentAudio);
  };

  const currentAudioFile = getCurrentAudioFile();

  const getDisplayTitle = (file: SongFile, index?: number) => {
    const desc = (file.description || '').trim();
    if (desc) return desc;
    return typeof index === 'number' ? `Ficheiro ${index + 1}` : file.fileName;
  };

  const getDisplaySubtitle = (file: SongFile) => {
    const desc = (file.description || '').trim();
    // Se existe descrição, escondemos nome original e tamanho: o user quer ver só o que escreveu.
    if (desc) return null;
    if (!file.fileName && !file.fileSize) return null;
    return `${file.fileName}${file.fileSize ? ` • ${formatFileSize(file.fileSize)}` : ''}`;
  };

  if (pdfs.length === 0 && audios.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={pdfs.length > 0 ? 'pdfs' : 'audios'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdfs" disabled={pdfs.length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            Partituras ({pdfs.length})
          </TabsTrigger>
          <TabsTrigger value="audios" disabled={audios.length === 0}>
            <Music className="w-4 h-4 mr-2" />
            Áudios ({audios.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab PDFs */}
        <TabsContent value="pdfs" className="space-y-3 mt-4">
          {pdfs.map((pdf, index) => (
            <Card key={pdf.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-red-50">
                    <FileText className="w-6 h-6 text-red-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">{getDisplayTitle(pdf, index)}</h4>
                    {getDisplaySubtitle(pdf) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplaySubtitle(pdf)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {pdf.signedUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={pdf.signedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          asChild
                        >
                          <a href={pdf.signedUrl} download={pdf.fileName}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab Áudios */}
        <TabsContent value="audios" className="space-y-3 mt-4">
          {audios.map((audio) => {
            const isCurrentAudio = currentAudio === audio.id;
            const isAudioPlaying = isCurrentAudio && isPlaying;

            return (
              <Card key={audio.id} className={`overflow-hidden transition-colors ${isCurrentAudio ? 'border-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant={isCurrentAudio ? "default" : "outline"}
                      onClick={() => audio.signedUrl && playAudio(audio.id, audio.signedUrl)}
                      disabled={!audio.signedUrl}
                      className="shrink-0"
                    >
                      {isAudioPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{getDisplayTitle(audio)}</h4>
                      {getDisplaySubtitle(audio) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getDisplaySubtitle(audio)}
                        </p>
                      )}
                    </div>

                    {audio.signedUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="shrink-0"
                      >
                        <a href={audio.signedUrl} download={audio.fileName}>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Player de Áudio (quando algo está a tocar) */}
          {currentAudioFile && (
            <Card className="sticky bottom-4 border-2 border-primary shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  {currentAudioFile.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timeline */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={skipBackward}
                      className="h-8 w-8"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="icon"
                      onClick={() => currentAudioFile.signedUrl && playAudio(currentAudioFile.id, currentAudioFile.signedUrl)}
                      className="h-10 w-10"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={skipForward}
                      className="h-8 w-8"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      className="h-8 w-8"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
