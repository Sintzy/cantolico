'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { findSongBySlug } from '@/lib/slugs';
import { Loader2, Guitar, ChevronDown, FileText, Music, Youtube, Download } from 'lucide-react';
import YouTube from 'react-youtube';
import * as React from "react";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { extractChords } from '@/lib/chord-processor';
import StarButton from '@/components/StarButton';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';

// Componente de loading
const LoadingSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="max-w-6xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8 text-center">
        <div className="h-8 bg-gray-300 rounded w-3/4 mx-auto mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto mb-4 animate-pulse"></div>
        <div className="h-6 bg-gray-300 rounded w-1/4 mx-auto animate-pulse"></div>
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="h-4 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
        </div>
        <div className="lg:col-span-1">
          <div className="h-32 bg-gray-300 rounded w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

interface SongData {
  id: string;
  title: string;
  slug?: string;
  tags?: string[];
  moments?: string[];
  mainInstrument?: string;
  currentVersion?: {
    sourceText?: string;
    sourcePdfKey?: string;
    mediaUrl?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    createdBy?: {
      name?: string;
    };
  };
}

export default function MusicPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [song, setSong] = useState<SongData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uniqueChords, setUniqueChords] = useState<string[]>([]);

  // Buscar dados da música
  useEffect(() => {
    async function fetchSong() {
      if (!id) return;
      
      setLoading(true);
      
      try {
        // Primeiro tentar por ID
        let { data: songData } = await supabase
          .from('Song')
          .select(`
            id,
            title,
            slug,
            tags,
            moments,
            mainInstrument,
            currentVersion:SongVersion!Song_currentVersionId_fkey(
              sourceText,
              sourcePdfKey,
              mediaUrl,
              youtubeLink,
              spotifyLink,
              createdBy:User!SongVersion_createdById_fkey(name)
            )
          `)
          .eq('id', id)
          .single();

        // Se não encontrou por ID, tentar por slug
        if (!songData) {
          const songBySlug = await findSongBySlug(id);
          if (songBySlug) {
            songData = songBySlug;
          }
        }

        if (!songData) {
          notFound();
          return;
        }

        setSong(songData as any);

        // Extrair acordes únicos se houver texto
        if ((songData as any).currentVersion?.sourceText) {
          const chords = extractChords((songData as any).currentVersion.sourceText);
          setUniqueChords(chords);
        }
      } catch (error) {
        console.error('Erro ao carregar música:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!song) {
    notFound();
    return null;
  }

  const renderTextWithChords = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => (
      <div key={lineIndex} className="mb-1">
        <div className="text-gray-800 leading-relaxed font-mono whitespace-pre-wrap">
          {line || '\u00A0'}
        </div>
      </div>
    ));
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const youtubeVideoId = song.currentVersion?.youtubeLink 
    ? getYouTubeVideoId(song.currentVersion.youtubeLink)
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            {song.title}
          </h1>
          
          {song.currentVersion?.createdBy?.name && (
            <p className="text-lg text-gray-600 mb-4">
              Criado por: {song.currentVersion.createdBy.name}
            </p>
          )}

          {/* Tags */}
          {song.tags && song.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {song.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Momentos */}
          {song.moments && song.moments.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {song.moments.map((moment, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50">
                  {moment}
                </Badge>
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-center gap-4 mb-6">
            <StarButton songId={song.id} />
            <AddToPlaylistButton songId={song.id} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo principal - Letra */}
          <div className="lg:col-span-2">
            {song.currentVersion?.sourceText ? (
              <div className="space-y-6">
                {/* Acordes únicos */}
                {uniqueChords.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Guitar className="h-5 w-5" />
                      Acordes ({uniqueChords.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueChords.slice(0, 12).map((chord, index) => (
                        <div key={index} className="text-sm bg-blue-50 px-2 py-1 rounded">
                          {chord}
                        </div>
                      ))}
                      {uniqueChords.length > 12 && (
                        <span className="text-sm text-gray-500">
                          +{uniqueChords.length - 12} acordes
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Letra */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="text-base leading-loose">
                    {renderTextWithChords(song.currentVersion.sourceText)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Letra não disponível para esta música.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Links e recursos */}
          <div className="lg:col-span-1 space-y-6">
            {/* YouTube Video */}
            {youtubeVideoId && (
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  Vídeo
                </h3>
                <div className="aspect-video">
                  <YouTube
                    videoId={youtubeVideoId}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 0,
                      },
                    }}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Links */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-semibold mb-3">Links</h3>
              <div className="space-y-2">
                {song.currentVersion?.youtubeLink && (
                  <a
                    href={song.currentVersion.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </a>
                )}
                
                {song.currentVersion?.spotifyLink && (
                  <a
                    href={song.currentVersion.spotifyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Music className="h-4 w-4" />
                    Spotify
                  </a>
                )}

                {song.currentVersion?.sourcePdfKey && (
                  <a
                    href={song.currentVersion.sourcePdfKey}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                )}
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-semibold mb-3">Informações</h3>
              <div className="space-y-2 text-sm">
                {song.mainInstrument && (
                  <div>
                    <strong>Instrumento Principal:</strong> {song.mainInstrument}
                  </div>
                )}
                {uniqueChords.length > 0 && (
                  <div>
                    <strong>Total de Acordes:</strong> {uniqueChords.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}