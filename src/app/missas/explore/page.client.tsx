'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Music, 
  Globe, 
  Calendar,
  Church,
  ArrowLeft,
  Search,
  Copy,
  Users
} from 'lucide-react';
import { 
  Mass, 
  formatMassDate,
  formatMassTime,
  getColorHex,
  LiturgicalColor
} from '@/types/mass';

interface ExploreMassesClientProps {
  initialMasses: Mass[];
}

export default function ExploreMassesClient({ initialMasses }: ExploreMassesClientProps) {
  const router = useRouter();
  const [masses] = useState<Mass[]>(initialMasses);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDuplicate = async (massId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/masses/${massId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const newMass = await response.json();
        toast.success('Missa duplicada para a tua conta!');
        router.push(`/missas/${newMass.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao duplicar missa');
      }
    } catch (error) {
      console.error('Error duplicating mass:', error);
      toast.error('Erro ao duplicar missa');
    }
  };

  // Filter masses by search query
  const filteredMasses = masses.filter(mass => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mass.name.toLowerCase().includes(query) ||
      mass.celebration?.toLowerCase().includes(query) ||
      mass.parish?.toLowerCase().includes(query)
    );
  });

  // Group by date
  const upcomingMasses = filteredMasses.filter(m => m.date && new Date(m.date) >= new Date());
  const pastMasses = filteredMasses.filter(m => !m.date || new Date(m.date) < new Date());

  const MassCard = ({ mass }: { mass: Mass }) => (
    <Card 
      className="group hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden"
      onClick={() => router.push(`/missas/${mass.id}`)}
    >
      {mass.liturgicalColor && (
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: getColorHex(mass.liturgicalColor as LiturgicalColor) }}
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-stone-900 truncate">
              {mass.name}
            </CardTitle>
            {mass.celebration && (
              <CardDescription className="mt-1 truncate text-stone-500">
                {mass.celebration}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleDuplicate(mass.id, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="w-4 h-4 mr-1" />
            Usar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Music className="w-3 h-3" />
            {mass._count?.items || 0} músicas
          </Badge>
          {mass.user && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              {mass.user.name || 'Utilizador'}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1.5 text-sm text-stone-500">
          {mass.date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>{formatMassDate(mass.date)}</span>
              {formatMassTime(mass.date) && (
                <span className="text-stone-400">• {formatMassTime(mass.date)}</span>
              )}
            </div>
          )}
          {mass.parish && (
            <div className="flex items-center gap-2">
              <Church className="w-4 h-4 text-stone-400" />
              <span className="truncate">{mass.parish}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white -mt-16">
      <div className="bg-white border-b border-stone-100 pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/missas" className="flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Link>
                </Button>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl text-stone-900 flex items-center gap-3">
                <Globe className="w-6 h-6 text-rose-700" />
                Explorar Missas
                <Badge className="bg-stone-100 text-stone-600 border border-stone-200 text-xs font-sans">BETA</Badge>
              </h1>
              <p className="text-stone-500 mt-1">
                Descobre missas organizadas pela comunidade e usa como base (Sistema em beta)
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Pesquisar missas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredMasses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Church className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">
              {searchQuery ? 'Nenhuma missa encontrada' : 'Ainda não há missas públicas'}
            </h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? 'Tenta pesquisar com outros termos'
                : 'Sê o primeiro a partilhar uma missa pública com a comunidade!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* All */}
            <section>
              <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Church className="w-5 h-5 text-rose-700" />
                Todas as Missas
                <Badge variant="secondary">{filteredMasses.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMasses.map((mass) => (
                  <MassCard key={mass.id} mass={mass} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
