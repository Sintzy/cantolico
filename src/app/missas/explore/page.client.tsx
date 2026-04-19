'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

  const MassCard = ({ mass }: { mass: Mass }) => (
    <div
      className="group rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden"
      onClick={() => router.push(`/missas/${mass.id}`)}
    >
      {mass.liturgicalColor && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: getColorHex(mass.liturgicalColor as LiturgicalColor) }}
        />
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-stone-900 truncate">
              {mass.name}
            </p>
            {mass.celebration && (
              <p className="mt-1 truncate text-sm text-stone-500">
                {mass.celebration}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleDuplicate(mass.id, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity border-stone-200 text-stone-700 hover:bg-stone-100 text-xs"
          >
            <Copy className="w-4 h-4 mr-1" />
            Usar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Music className="w-3 h-3" />
            {mass._count?.items || 0} músicas
          </Badge>
          {mass.user && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs border-stone-200 text-stone-500">
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
      </div>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen bg-white">
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Link href="/missas" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Missas
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Organização Litúrgica</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight mb-6">
            Missas Públicas
          </h1>

          {/* Search */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Pesquisar missas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {filteredMasses.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-stone-200">
            <Church className="h-10 w-10 mx-auto mb-3 text-stone-200" />
            <p className="text-base font-semibold text-stone-900 mb-1">Nenhuma missa pública</p>
            <p className="text-sm text-stone-500">Ainda não existem missas públicas disponíveis.</p>
          </div>
        ) : (
          <div className="space-y-8">
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
