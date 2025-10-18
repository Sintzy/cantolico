'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner, type SpinnerProps } from '@/components/ui/shadcn-io/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useStableData, useWindowFocus } from '@/hooks/useOptimization';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR';
  position: 'TOP' | 'BOTTOM';
  pages: ('HOME' | 'MUSICS' | 'ADMIN' | 'ALL')[];
  isActive: boolean;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface BannerFormData {
  title: string;
  message: string;
  type: Banner['type'];
  position: Banner['position'];
  pages: Banner['pages'];
  priority: number;
  startDate: string;
  endDate: string;
}

const initialFormData: BannerFormData = {
  title: '',
  message: '',
  type: 'ANNOUNCEMENT',
  position: 'TOP',
  pages: ['ALL'],
  priority: 0,
  startDate: '',
  endDate: ''
};

const bannerTypeLabels = {
  ANNOUNCEMENT: 'Anúncio',
  ALERT: 'Alerta',
  CHANGELOG: 'Changelog',
  WARNING: 'Aviso',
  REQUEST: 'Pedido',
  INFO: 'Informação',
  SUCCESS: 'Sucesso',
  ERROR: 'Erro'
};

const bannerPageLabels = {
  HOME: 'Página Principal',
  MUSICS: 'Páginas de Músicas',
  ADMIN: 'Área Administrativa',
  ALL: 'Todas as Páginas'
};

const getBannerTypeColor = (type: Banner['type']) => {
  switch (type) {
    case 'ANNOUNCEMENT': return 'bg-blue-100 text-blue-800';
    case 'ALERT': return 'bg-red-100 text-red-800';
    case 'CHANGELOG': return 'bg-purple-100 text-purple-800';
    case 'WARNING': return 'bg-yellow-100 text-yellow-800';
    case 'REQUEST': return 'bg-orange-100 text-orange-800';
    case 'INFO': return 'bg-gray-100 text-gray-800';
    case 'SUCCESS': return 'bg-green-100 text-green-800';
    case 'ERROR': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function BannerManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Define the fetch function for useStableData
  const fetchBannersData = useCallback(async (): Promise<Banner[]> => {
    const response = await fetch('/api/admin/banners');
    if (!response.ok) {
      throw new Error('Erro ao carregar banners');
    }
    const data = await response.json();
    // Normaliza o payload para sempre ter createdBy
    return (Array.isArray(data) ? data : []).map((b: any) => ({
      ...b,
      createdBy: b?.createdBy ?? b?.user ?? null,
    }));
  }, []);

  const { data: cachedData, loading: dataLoading, error: dataError, refresh: refreshData } = useStableData<Banner[]>(
    fetchBannersData,
    [],
    'banners'
  );
  
  // Get window focus state but don't use it for auto-refresh
  const isWindowFocused = useWindowFocus();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    // Update local state when cached data changes
    if (cachedData) {
      setBanners(cachedData);
      setLoading(false);
    }
    
    // Set loading state from the data hook
    if (dataLoading && !cachedData) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [session, status, cachedData, dataLoading]);

  const fetchBanners = async (forceFetch = false) => {
    try {
      setIsRefreshing(true);
      
      if (forceFetch) {
        refreshData(); // This will trigger a fresh fetch
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      toast.error('Erro ao carregar banners');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    refreshData(); // Use the refresh function from useStableData
    setIsRefreshing(false);
  };

  const openCreateDialog = () => {
    setEditingBanner(null);
    setFormData(initialFormData);
    setShowDialog(true);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      message: banner.message,
      type: banner.type,
      position: banner.position,
      pages: banner.pages,
      priority: banner.priority,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        isActive: editingBanner?.isActive ?? true
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingBanner ? 'Banner atualizado!' : 'Banner criado!');
        setShowDialog(false);
        refreshData(); // Use refreshData instead of fetchBanners
      } else {
        toast.error('Erro ao salvar banner');
      }
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      toast.error('Erro ao salvar banner');
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerStatus = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          isActive: !banner.isActive
        })
      });

      if (response.ok) {
        toast.success(`Banner ${!banner.isActive ? 'ativado' : 'desativado'}!`);
        refreshData();
      } else {
        toast.error('Erro ao alterar status do banner');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do banner');
    }
  };

  const deleteBanner = async (banner: Banner) => {
    if (!confirm(`Tem certeza que deseja remover o banner "${banner.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Banner removido!');
        refreshData();
      } else {
        toast.error('Erro ao remover banner');
      }
    } catch (error) {
      console.error('Erro ao remover banner:', error);
      toast.error('Erro ao remover banner');
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Banners</h1>
            <p className="text-gray-600">A carregar...</p>
          </div>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (loading && !cachedData) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Banners</h1>
            <p className="text-gray-600">A carregar banners...</p>
          </div>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Banners</h1>
          <p className="text-gray-600">Gerir alertas e anúncios do site</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleManualRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial"
          >
            {isRefreshing ? (
              <Spinner variant="circle" size={16} className="text-black mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button onClick={openCreateDialog} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-2" />
            Novo Banner
          </Button>
        </div>
      </div>

      {/* Banners List */}
      <div className="relative">
        {/* Loading overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
              <Spinner variant="circle" size={20} className="text-black" />
              <span>A atualizar dados...</span>
            </div>
          </div>
        )}
        
        <div className="grid gap-6">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">Nenhum banner encontrado</p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro banner
              </Button>
            </CardContent>
          </Card>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id} className={!banner.isActive ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{banner.title}</CardTitle>
                      <Badge className={getBannerTypeColor(banner.type)}>
                        {bannerTypeLabels[banner.type]}
                      </Badge>
                      {!banner.isActive && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      {banner.priority > 0 && (
                        <Badge variant="outline">
                          Prioridade {banner.priority}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {banner.message.length > 100 
                        ? `${banner.message.substring(0, 100)}...` 
                        : banner.message
                      }
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleBannerStatus(banner)}
                    >
                      {banner.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(banner)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBanner(banner)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Posição:</span>
                    <div className="flex items-center gap-1 mt-1">
                      {banner.position === 'TOP' ? (
                        <>
                          <ArrowUp className="h-4 w-4" />
                          Topo
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4" />
                          Fundo
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Páginas:</span>
                    <div className="mt-1">
                      {banner.pages.map(page => bannerPageLabels[page]).join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Criado por:</span>
                    <div className="mt-1">{banner.createdBy?.name || banner.createdBy?.email || 'Desconhecido'}</div>
                  </div>
                  <div>
                    <span className="font-medium">Data:</span>
                    <div className="mt-1">
                      {new Date(banner.createdAt).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
                {(banner.startDate || banner.endDate) && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {banner.startDate && (
                      <span>Desde {new Date(banner.startDate).toLocaleDateString('pt-PT')}</span>
                    )}
                    {banner.startDate && banner.endDate && <span>•</span>}
                    {banner.endDate && (
                      <span>Até {new Date(banner.endDate).toLocaleDateString('pt-PT')}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? 'Editar Banner' : 'Novo Banner'}
            </DialogTitle>
            <DialogDescription>
              {editingBanner 
                ? 'Altere as informações do banner abaixo.' 
                : 'Preencha as informações para criar um novo banner.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Nova funcionalidade"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Banner['type']) => {
                    console.log('Selected banner type:', value);
                    setFormData({ ...formData, type: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona o tipo de banner" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(bannerTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                placeholder="Descreva o banner aqui..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: Banner['position']) => {
                    console.log('Selected banner position:', value);
                    setFormData({ ...formData, position: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOP">Topo da página</SelectItem>
                    <SelectItem value="BOTTOM">Fundo da página</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Páginas (selecione múltiplas com Ctrl/Cmd)</Label>
              <select
                multiple
                className="w-full p-2 border rounded-md"
                value={formData.pages}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value) as Banner['pages'];
                  setFormData({ ...formData, pages: values });
                }}
              >
                {Object.entries(bannerPageLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de início (opcional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data de fim (opcional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner variant="circle" size={16} className="text-black mr-2" />
                    Salvando...
                  </>
                ) : (
                  editingBanner ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
