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
  ExternalLink,
  File,
  Headphones
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
        <TabsList className="grid w-full grid-cols-2 h-12 p-1">
          <TabsTrigger 
            value="pdfs" 
            disabled={pdfs.length === 0}
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">Partituras</span>
            <Badge variant="secondary" className="ml-1">{pdfs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="audios" 
            disabled={audios.length === 0}
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Music className="w-4 h-4" />
            <span className="font-medium">Áudios</span>
            <Badge variant="secondary" className="ml-1">{audios.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab PDFs */}
        <TabsContent value="pdfs" className="space-y-3 mt-6">
          {pdfs.map((pdf, index) => (
            <Card 
              key={pdf.id} 
              className="group overflow-hidden border-2 hover:border-red-200 hover:shadow-lg transition-all duration-200"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="p-3 rounded-xl bg-linear-to-br from-red-50 to-red-100 group-hover:from-red-100 group-hover:to-red-200 transition-all">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base mb-1 truncate">
                      {getDisplayTitle(pdf, index)}
                    </h4>
                    {getDisplaySubtitle(pdf) && (
                      <p className="text-sm text-muted-foreground truncate">
                        {getDisplaySubtitle(pdf)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                    {pdf.signedUrl && (
                      <>
                        <Button
                          size="lg"
                          variant="outline"
                          asChild
                          className="gap-2 touch-manipulation w-full sm:w-auto"
                        >
                          <a href={pdf.signedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          size="lg"
                          asChild
                          className="gap-2 touch-manipulation w-full sm:w-auto"
                        >
                          <a href={pdf.signedUrl} download={pdf.fileName}>
                            <Download className="w-4 h-4" />
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
        <TabsContent value="audios" className="space-y-3 mt-6">
          {audios.map((audio) => {
            const isCurrentAudio = currentAudio === audio.id;
            const isAudioPlaying = isCurrentAudio && isPlaying;

            return (
              <Card 
                key={audio.id} 
                className={`group overflow-hidden border-2 transition-all duration-200 ${
                  isCurrentAudio 
                    ? 'border-primary shadow-lg bg-primary/5' 
                    : 'hover:border-blue-200 hover:shadow-lg'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Button
                      size="icon"
                      variant={isCurrentAudio ? "default" : "outline"}
                      onClick={() => audio.signedUrl && playAudio(audio.id, audio.signedUrl)}
                      disabled={!audio.signedUrl}
                      className={`shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-xl transition-all touch-manipulation ${
                        isCurrentAudio ? 'shadow-md' : ''
                      }`}
                    >
                      {isAudioPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </Button>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1 truncate">
                        {getDisplayTitle(audio)}
                      </h4>
                      {getDisplaySubtitle(audio) && (
                        <p className="text-sm text-muted-foreground truncate">
                          {getDisplaySubtitle(audio)}
                        </p>
                      )}
                    </div>

                    {audio.signedUrl && (
                      <Button
                        size="lg"
                        variant="outline"
                        asChild
                        className="shrink-0 gap-2 touch-manipulation hidden sm:inline-flex"
                      >
                        <a href={audio.signedUrl} download={audio.fileName}>
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Modern Audio Player (quando algo está a tocar) */}
          {currentAudioFile && (
            <Card className="sticky bottom-2 sm:bottom-4 border-2 border-primary shadow-2xl bg-linear-to-br from-background to-primary/5 backdrop-blur-sm safe-area-pb">
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
                    <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">
                      {currentAudioFile.description}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                      {currentAudioFile.fileName}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6 pt-0">
                {/* Timeline with time display */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer touch-manipulation [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:shadow-md"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--secondary)) ${(currentTime / (duration || 1)) * 100}%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm font-medium">
                    <span className="text-primary">{formatTime(currentTime)}</span>
                    <span className="text-muted-foreground">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={skipBackward}
                      className="h-10 w-10 sm:h-10 sm:w-10 hover:bg-primary/10 touch-manipulation"
                    >
                      <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    
                    <Button
                      size="icon"
                      onClick={() => currentAudioFile.signedUrl && playAudio(currentAudioFile.id, currentAudioFile.signedUrl)}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 touch-manipulation"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={skipForward}
                      className="h-10 w-10 sm:h-10 sm:w-10 hover:bg-primary/10 touch-manipulation"
                    >
                      <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>

                  {/* Volume Control - hidden on mobile */}
                  <div className="hidden sm:flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      className="h-10 w-10 hover:bg-primary/10 touch-manipulation"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="relative w-24">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) ${(isMuted ? 0 : volume) * 100}%, hsl(var(--secondary)) ${(isMuted ? 0 : volume) * 100}%)`
                        }}
                      />
                    </div>
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
