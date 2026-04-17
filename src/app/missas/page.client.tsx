'use client';

import React, { useState } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Music,
  Lock,
  Globe,
  Eye,
  Calendar,
  Church,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Mass,
  MassVisibility,
  getMassVisibilityLabel,
  formatMassDate,
  formatMassTime,
  getColorHex,
  LiturgicalColor
} from '@/types/mass';
import { trackEvent } from '@/lib/umami';

interface MassesClientProps {
  initialMasses: Mass[];
}

export default function MassesPageClient({ initialMasses }: MassesClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [masses, setMasses] = useState<Mass[]>(initialMasses);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  React.useEffect(() => {
    trackEvent('masses_list_view', { initialCount: initialMasses.length });
  }, []);

  const getVisibilityIcon = (visibility: MassVisibility) => {
    switch (visibility) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4" />;
      case 'PRIVATE':
        return <Lock className="w-4 h-4" />;
      case 'NOT_LISTED':
        return <Eye className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const handleDelete = async (massId: string) => {
    if (!confirm('Tens a certeza que queres apagar esta missa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setDeletingId(massId);
    try {
      const response = await fetch(`/api/masses/${massId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        trackEvent('mass_deleted_success', { source: 'masses_list' });
        setMasses(prev => prev.filter(m => m.id !== massId));
        toast.success('Missa apagada com sucesso');
      } else {
        trackEvent('mass_deleted_failed', { source: 'masses_list' });
        toast.error('Erro ao apagar missa');
      }
    } catch (error) {
      console.error('Error deleting mass:', error);
      trackEvent('mass_deleted_failed', { source: 'masses_list', reason: 'network_error' });
      toast.error('Erro ao apagar missa');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (massId: string) => {
    try {
      const response = await fetch(`/api/masses/${massId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const newMass = await response.json();
        trackEvent('mass_duplicated_success', { source: 'masses_list' });
        toast.success('Missa duplicada com sucesso');
        router.push(`/missas/${newMass.id}`);
      } else {
        trackEvent('mass_duplicated_failed', { source: 'masses_list' });
        toast.error('Erro ao duplicar missa');
      }
    } catch (error) {
      console.error('Error duplicating mass:', error);
      trackEvent('mass_duplicated_failed', { source: 'masses_list', reason: 'network_error' });
      toast.error('Erro ao duplicar missa');
    }
  };

  // Filter masses
  const filteredMasses = masses.filter(mass => {
    const matchesSearch = !searchTerm ||
      mass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mass.parish && mass.parish.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mass.celebration && mass.celebration.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesVisibility = filterVisibility === 'ALL' || mass.visibility === filterVisibility;

    return matchesSearch && matchesVisibility;
  });

  // Separate upcoming and past masses
  const now = new Date();
  const upcomingMasses = filteredMasses.filter(m => m.date && new Date(m.date) >= now);
  const pastMasses = filteredMasses.filter(m => !m.date || new Date(m.date) < now);

  const clearFilters = () => {
    trackEvent('masses_filters_cleared');
    setSearchTerm('');
    setFilterVisibility('ALL');
    setIsMobileFiltersOpen(false);
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      {/* Visibility */}
      <div className="space-y-2">
        <Label className="text-stone-700 text-sm font-medium">Visibilidade</Label>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PUBLIC">Públicas</SelectItem>
            <SelectItem value="PRIVATE">Privadas</SelectItem>
            <SelectItem value="NOT_LISTED">Não Listadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {(searchTerm || filterVisibility !== 'ALL') && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );

  const MassCard = ({ mass }: { mass: Mass }) => (
    <div className="group rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all duration-200">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="shrink-0">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: mass.liturgicalColor
                  ? `${getColorHex(mass.liturgicalColor as LiturgicalColor)}20`
                  : 'rgb(var(--primary) / 0.1)',
                borderColor: mass.liturgicalColor
                  ? getColorHex(mass.liturgicalColor as LiturgicalColor)
                  : undefined
              }}
            >
              <Church
                className="h-5 w-5 sm:h-6 sm:w-6"
                style={{
                  color: mass.liturgicalColor
                    ? getColorHex(mass.liturgicalColor as LiturgicalColor)
                    : 'hsl(var(--primary))'
                }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-stone-900 group-hover:text-rose-700 transition-colors leading-tight">
                  <Link
                    href={`/missas/${mass.id}`}
                    className="hover:underline"
                    onClick={() => trackEvent('mass_opened', { source: 'masses_list' })}
                  >
                    {mass.name}
                  </Link>
                </h3>
                {mass.celebration && (
                  <p className="text-xs sm:text-sm text-stone-500 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-700/60 rounded-full"></span>
                    {mass.celebration}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/missas/${mass.id}/edit`)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(mass.id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(mass.id)}
                      disabled={deletingId === mass.id}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                >
                  <Link href={`/missas/${mass.id}`} onClick={() => trackEvent('mass_opened', { source: 'masses_list' })}>
                    <span className="hidden sm:inline">Ver Missa</span>
                    <span className="sm:hidden">Ver</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  {getVisibilityIcon(mass.visibility)}
                  {getMassVisibilityLabel(mass.visibility)}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Music className="w-3 h-3" />
                  {mass._count?.items || 0} músicas
                </Badge>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                {mass.date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatMassDate(mass.date)}</span>
                    {formatMassTime(mass.date) && (
                      <span className="text-stone-500/60">• {formatMassTime(mass.date)}</span>
                    )}
                  </div>
                )}
                {mass.parish && (
                  <div className="flex items-center gap-1.5">
                    <Church className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">{mass.parish}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Organização Litúrgica</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
                As Minhas Missas
              </h1>
              <Badge className="bg-stone-100 text-stone-600 border border-stone-200 text-xs mt-2">BETA</Badge>
            </div>
            <div className="flex gap-2 pb-1">
              <Button asChild variant="outline" size="sm" className="border-stone-200 text-stone-700 hover:bg-stone-100">
                <Link href="/missas/explore"><Globe className="h-4 w-4 mr-2" />Explorar</Link>
              </Button>
              <Button asChild size="sm" className="bg-stone-900 hover:bg-rose-700 transition-colors text-white">
                <Link href="/missas/create"><Plus className="h-4 w-4 mr-2" />Nova Missa</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {/* Mobile Search Bar */}
        <div className="lg:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar missa..."
              className="pl-10 h-10 w-full border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-100">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
                {filterVisibility !== 'ALL' && (
                  <Badge variant="secondary" className="ml-auto">1</Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </DialogTitle>
              </DialogHeader>
              <div className="mt-6">
                {renderFilterContent()}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar missa..."
                  className="pl-10 h-10 w-full border-stone-200 bg-white rounded-lg text-stone-900 placeholder:text-stone-400"
                />
              </div>

              {/* Filter Panel */}
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                  <p className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-stone-400" />Filtros
                  </p>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {renderFilterContent()}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-500">
                <span className="font-medium text-stone-900">{filteredMasses.length}</span>
                {' '}missa{filteredMasses.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filteredMasses.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-stone-200">
                <Church className="h-10 w-10 mx-auto mb-3 text-stone-200" />
                <p className="text-base font-semibold text-stone-900 mb-1">
                  {masses.length === 0 ? 'Nenhuma missa criada' : 'Nenhuma missa encontrada'}
                </p>
                <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">
                  {masses.length === 0
                    ? 'Cria a tua primeira missa para começar a organizar os cânticos para cada momento litúrgico.'
                    : 'Tenta ajustar os filtros ou procurar por outros termos.'
                  }
                </p>
                {masses.length === 0 && (
                  <Button asChild>
                    <Link href="/missas/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar primeira missa
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* All Masses */}
                <section>
                  <h2 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-rose-700" />
                    As Minhas Missas
                    <Badge variant="secondary">{filteredMasses.length}</Badge>
                  </h2>
                  <div className="space-y-3">
                    {filteredMasses.map((mass) => (
                      <MassCard key={mass.id} mass={mass} />
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
