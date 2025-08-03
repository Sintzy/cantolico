'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import removeAccents from 'remove-accents';
import Link from 'next/link';
import { Search, Filter, Tags, ArrowDownAZ, Music } from 'lucide-react';

const allMoments = [
  'ENTRADA',
  'ATO_PENITENCIAL',
  'GLORIA',
  'SALMO',
  'ACLAMACAO',
  'OFERTORIO',
  'SANTO',
  'COMUNHAO',
  'ACAO_DE_GRACAS',
  'FINAL',
  'ADORACAO',
  'ASPERSAO',
  'BAPTISMO',
  'BENCAO_DAS_ALIANCAS',
  'CORDEIRO_DE_DEUS',
  'CRISMA',
  'INTRODUCAO_DA_PALAVRA',
  'LOUVOR',
  'PAI_NOSSO',
  'REFLEXAO',
  'TERCO_MISTERIO',
];

type Song = {
  id: string;
  title: string;
  slug: string;
  moments: string[];
  tags: string[];
  mainInstrument: string;
};

export default function MusicsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);

  useEffect(() => {
    const fetchSongs = async () => {
      const res = await fetch('/api/musics/getmusics');
      const data = await res.json();
      setSongs(data);
    };
    fetchSongs();
  }, []);

  useEffect(() => {
    const filtered = songs
      .filter((song) => {
        const titleMatch = removeAccents(song.title.toLowerCase()).includes(
          removeAccents(searchTerm.toLowerCase())
        );
        const momentMatch = selectedMoment
          ? song.moments.includes(selectedMoment)
          : true;
        const tagMatch = tagFilter
          ? song.tags.some((tag) =>
              removeAccents(tag.toLowerCase()).includes(
                removeAccents(tagFilter.toLowerCase())
              )
            )
          : true;
        return titleMatch && momentMatch && tagMatch;
      })
      .sort((a, b) =>
        sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      );

    setFilteredSongs(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedMoment, tagFilter, sortOrder, songs]);

  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Music className="text-blue-600" /> Músicas
        </h1>
        <p className="text-muted-foreground mt-1">
          Explora o nosso cancioneiro com filtros e pesquisa avançada.
        </p>
      </div>

      {/* Filtros */}
      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <Label className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Pesquisar título
          </Label>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex: Deus está aqui"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Momento litúrgico
          </Label>
          <Select
            onValueChange={(v) => setSelectedMoment(v === 'ALL' ? null : v)}
            value={selectedMoment ?? 'ALL'}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {allMoments.map((moment) => (
                <SelectItem key={moment} value={moment}>
                  {moment.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Tags className="h-4 w-4" /> Tags
          </Label>
          <Input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Ex: mariana"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <ArrowDownAZ className="h-4 w-4" /> Ordem
          </Label>
          <Select
            onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}
            value={sortOrder}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A → Z</SelectItem>
              <SelectItem value="desc">Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {paginatedSongs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma música encontrada.
        </p>
      ) : (
        <>
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-3">
            {paginatedSongs.map((song) => (
              <Card
                key={song.id}
                className="hover:shadow-md transition-all border border-gray-200"
              >
                <CardContent className="p-4 space-y-3">
                  <Link
                    href={`/musics/${song.slug || song.id}`}
                    className="font-semibold text-lg hover:underline"
                  >
                    {song.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {song.mainInstrument}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {song.moments.map((moment, momentIndex) => (
                      <Badge key={`${song.id}-moment-${momentIndex}`} variant="outline">
                        {moment.replaceAll('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {song.tags.map((tag, tagIndex) => (
                      <Badge key={`${song.id}-tag-${tagIndex}`} className="bg-blue-100 text-blue-800">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  size="sm"
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Seguinte
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
