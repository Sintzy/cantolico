'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

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
            style={{ background: `linear-gradient(to right, hsl(350 84% 53%) ${(currentTime / (duration || 1)) * 100}%, #e7e5e4 ${(currentTime / (duration || 1)) * 100}%)` }}
          />
          <div className="flex justify-between text-[11px] text-stone-400">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { setIsMuted(v => !v); if (audioRef.current) audioRef.current.muted = !isMuted; }}
          className="h-8 w-8 text-stone-500"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" asChild className="h-8 w-8 text-stone-500">
          <a href={url} download={fileName}><Download className="w-4 h-4" /></a>
        </Button>
      </div>
    </div>
  );
}
