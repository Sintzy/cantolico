'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner, type SpinnerProps } from '@/components/ui/shadcn-io/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  UserX, 
  Crown, 
  Shield,
  AlertCircle,
  Mail,
  Calendar,
  Music,
  ExternalLink,
  Ban,
  History,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/user-avatar';
import { useDebounce, useStableData, useWindowFocus } from '@/hooks/useOptimization';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN';
  createdAt: string;
  image?: string;
  totalSongs?: number;
  totalSubmissions?: number;
  moderation?: {
    id: number;
    status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED';
    type: 'WARNING' | 'SUSPENSION' | 'BAN' | null;
    reason: string | null;
    moderatorNote: string | null;
    moderatedAt: string | null;
    expiresAt: string | null;
    moderatedBy?: {
      name: string | null;
    };
  };
}

interface ModerateUserData {
  type: 'WARNING' | 'SUSPENSION' | 'BAN';
  reason: string;
  moderatorNote?: string;
  duration?: number; // em dias, apenas para suspensão
}

interface UsersResponse {
  users: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const ROLE_COLORS = {
  USER: 'bg-blue-100 text-blue-800 border-blue-200',
  TRUSTED: 'bg-green-100 text-green-800 border-green-200',
  REVIEWER: 'bg-orange-100 text-orange-800 border-orange-200',
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200'
};

const ROLE_ICONS = {
  USER: <UserCheck className="h-3 w-3" />,
  TRUSTED: <Shield className="h-3 w-3" />,
  REVIEWER: <Shield className="h-3 w-3" />,
  ADMIN: <Crown className="h-3 w-3" />
};

const getModerationIcon = (status: string) => {
  const icons = {
    ACTIVE: <CheckCircle className="h-3 w-3 text-green-500" />,
    WARNING: <AlertTriangle className="h-3 w-3 text-yellow-500" />,
    SUSPENDED: <Clock className="h-3 w-3 text-orange-500" />,
    BANNED: <Ban className="h-3 w-3 text-red-500" />
  };
  return icons[status as keyof typeof icons] || <AlertTriangle className="h-3 w-3" />;
};

const getModerationBadge = (status: string) => {
  const badges = {
    ACTIVE: 'Ativo',
    WARNING: 'Advertência',
    SUSPENDED: 'Suspenso',
    BANNED: 'Banido'
  };
  return badges[status as keyof typeof badges] || status;
};

const MODERATION_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
  BANNED: 'bg-red-100 text-red-800 border-red-200'
};

const MODERATION_ICONS = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  WARNING: <AlertTriangle className="h-3 w-3" />,
  SUSPENDED: <X className="h-3 w-3" />,
  BANNED: <Ban className="h-3 w-3" />
};

export default function UsersManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [moderateDialogOpen, setModerateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [moderateData, setModerateData] = useState<ModerateUserData>({
    type: 'WARNING',
    reason: '',
    moderatorNote: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use optimization hooks
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  
  // Create a stable cache key for the current search params
  const cacheKey = `users-${currentPage}-${debouncedSearchTerm}-${roleFilter}-${statusFilter}`;
  
  // Define the fetch function for useStableData
  const fetchUsersData = useCallback(async (): Promise<UsersResponse> => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '10',
      search: debouncedSearchTerm,
      role: roleFilter === 'all' ? '' : roleFilter,
      status: statusFilter === 'all' ? '' : statusFilter
    });

    const response = await fetch(`/api/admin/users?${params}`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar utilizadores');
    }
    
    return response.json();
  }, [currentPage, debouncedSearchTerm, roleFilter, statusFilter]);

  const { data: cachedData, loading: dataLoading, error: dataError, refresh: refreshData } = useStableData<UsersResponse>(
    fetchUsersData,
    [currentPage, debouncedSearchTerm, roleFilter, statusFilter],
    cacheKey
  );
  
  // Get window focus state but don't use it for auto-refresh
  const isWindowFocused = useWindowFocus();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    // Update local state when cached data changes
    if (cachedData) {
      setUsers(cachedData.users);
      setTotalPages(cachedData.totalPages);
      setTotalCount(cachedData.totalCount);
      setLoading(false);
      setError(null);
    }
    
    // Set loading and error states from the data hook
    if (dataLoading && !cachedData) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    
    if (dataError) {
      setError(dataError);
    }
  }, [session, status, cachedData, dataLoading, dataError]);

  const fetchUsers = async (forceFetch = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      if (forceFetch) {
        refreshData(); // This will trigger a fresh fetch
      }
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    refreshData(); // Use the refresh function from useStableData
    setIsRefreshing(false);
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN') => {
    try {
      setChangingRole(userId);
      
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar role do utilizador');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast.success(`Role alterada para ${newRole} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      toast.error('Erro ao alterar role do utilizador');
    } finally {
      setChangingRole(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem a certeza que pretende eliminar o utilizador "${userName}"? Esta ação é irreversível.`)) {
      return;
    }

    try {
      setDeletingUser(userId);
      
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao eliminar utilizador');
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId));

      toast.success(`Utilizador "${userName}" foi eliminado com sucesso!`);
    } catch (error) {
      console.error('Erro ao eliminar utilizador:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao eliminar utilizador');
    } finally {
      setDeletingUser(null);
    }
  };

  const fetchModerationHistory = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/moderation-history`);
      if (response.ok) {
        const data = await response.json();
        setModerationHistory(data.history);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleModerateUser = async () => {
    if (!selectedUser) return;

    console.log('Sending moderation data:', {
      action: moderateData.type,
      reason: moderateData.reason,
      moderatorNote: moderateData.moderatorNote,
      duration: moderateData.duration,
    });

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: moderateData.type,  // Mudança aqui: era 'type', agora é 'action'
          reason: moderateData.reason,
          moderatorNote: moderateData.moderatorNote,
          duration: moderateData.duration,
        }),
      });

      if (!response.ok) throw new Error('Erro ao aplicar moderação');

      toast.success('Moderação aplicada com sucesso');
      setModerateDialogOpen(false);
      await fetchUsers(); // Recarregar dados
      setModerateData({ type: 'WARNING', reason: '', moderatorNote: '' });
    } catch (error) {
      console.error('Erro ao moderar utilizador:', error);
      toast.error('Erro ao aplicar moderação');
    }
  };

  const handleRemoveModeration = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao remover moderação');

      toast.success('Moderação removida com sucesso');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao remover moderação:', error);
      toast.error('Erro ao remover moderação');
    }
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    const subject = encodeURIComponent(`Cancioneiro - Contacto da Administração`);
    const body = encodeURIComponent(`Olá ${userName},\n\nEsta mensagem é da administração do Cancioneiro.\n\n\n\nCumprimentos,\nEquipa Cancioneiro`);
    const mailtoLink = `mailto:${userEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Utilizadores</h1>
            <p className="text-gray-600">A carregar...</p>
          </div>
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (loading && !cachedData) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Utilizadores</h1>
            <p className="text-gray-600">A carregar utilizadores...</p>
          </div>
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Erro ao carregar utilizadores</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={() => fetchUsers(true)} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Utilizadores</h1>
          <p className="text-gray-600">
            Gerir roles e permissões dos utilizadores ({totalCount} total)
          </p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          variant="outline" 
          size="sm"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Spinner variant="circle" size={16} className="text-black mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pesquisar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full lg:w-48">
                <Select value={roleFilter} onValueChange={handleRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as roles</SelectItem>
                    <SelectItem value="USER">Utilizador</SelectItem>
                    <SelectItem value="TRUSTED">Confiável</SelectItem>
                    <SelectItem value="REVIEWER">Revisor</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full lg:w-48">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status moderação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="WARNING">Advertido</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                    <SelectItem value="BANNED">Banido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utilizadores
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner variant="circle" size={16} className="text-black" />
                A atualizar...
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Lista de todos os utilizadores registados
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {/* Loading overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
                <Spinner variant="circle" size={20} className="text-black" />
                <span>A atualizar dados...</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <UserAvatar 
                      user={{
                        name: user.name,
                        image: user.image
                      }} 
                      size={48} 
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{user.name}</h3>
                        <Badge className={`text-xs ${ROLE_COLORS[user.role]}`}>
                          <span className="flex items-center gap-1">
                            {ROLE_ICONS[user.role]}
                            {user.role}
                          </span>
                        </Badge>
                        {user.moderation && user.moderation.status !== 'ACTIVE' && (
                          <Badge className={`text-xs ${MODERATION_COLORS[user.moderation.status]}`}>
                            <span className="flex items-center gap-1">
                              {MODERATION_ICONS[user.moderation.status]}
                              {user.moderation.status}
                            </span>
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1 font-mono text-blue-600">
                          ID: #{user.id}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                          {user.totalSongs && (
                            <span className="flex items-center gap-1">
                              <Music className="h-3 w-3" />
                              {user.totalSongs} músicas
                            </span>
                          )}
                        </div>
                      </div>

                      {user.moderation && user.moderation.status !== 'ACTIVE' && user.moderation.reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <p className="text-red-800 font-medium">Motivo: {user.moderation.reason}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs">
                            {user.moderation.moderatedBy && (
                              <span className="text-red-600">
                                Por: {user.moderation.moderatedBy.name}
                              </span>
                            )}
                            {user.moderation.moderatedAt && (
                              <span className="text-red-600">
                                Em: {new Date(user.moderation.moderatedAt).toLocaleDateString('pt-PT')}
                              </span>
                            )}
                            {user.moderation.expiresAt && (
                              <span className="text-red-600">
                                Expira: {new Date(user.moderation.expiresAt).toLocaleDateString('pt-PT')}
                              </span>
                            )}
                          </div>
                          {user.moderation.moderatorNote && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-blue-800 text-xs font-medium">Nota do Admin:</p>
                              <p className="text-blue-700 text-xs font-mono">{user.moderation.moderatorNote}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações - Stack vertical no mobile */}
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2 flex-shrink-0">
                    {user.id !== session?.user.id?.toString() && (
                      <>
                        <div className="w-full lg:w-32">
                          <Select
                            value={user.role}
                            onValueChange={(newRole: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN') => 
                              handleRoleChange(user.id, newRole)
                            }
                            disabled={changingRole === user.id}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">Utilizador</SelectItem>
                              <SelectItem value="TRUSTED">Confiável</SelectItem>
                              <SelectItem value="REVIEWER">Revisor</SelectItem>
                              <SelectItem value="ADMIN">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Botão de Moderação ou Remover Moderação */}
                        {user.moderation && user.moderation.status !== 'ACTIVE' ? (
                          <Button
                            onClick={() => handleRemoveModeration(user.id)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300 hover:bg-green-50 w-full lg:w-auto"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="lg:hidden">Remover Moderação</span>
                            <span className="hidden lg:inline">Remover</span>
                          </Button>
                        ) : (
                          <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                            <Dialog open={moderateDialogOpen && selectedUser?.id === user.id} onOpenChange={setModerateDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => setSelectedUser(user)}
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50 w-full lg:w-auto"
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  Moderar
                                </Button>
                              </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Moderar Utilizador</DialogTitle>
                                <DialogDescription>
                                  Aplicar moderação a {selectedUser?.name}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Tipo de Moderação</Label>
                                  <Select 
                                    value={moderateData.type} 
                                    onValueChange={(value: 'WARNING' | 'SUSPENSION' | 'BAN') => 
                                      setModerateData(prev => ({ ...prev, type: value }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="WARNING">
                                        <div className="flex items-center gap-2">
                                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                          Advertência
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="SUSPENSION">
                                        <div className="flex items-center gap-2">
                                          <X className="h-4 w-4 text-orange-500" />
                                          Suspensão
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="BAN">
                                        <div className="flex items-center gap-2">
                                          <Ban className="h-4 w-4 text-red-500" />
                                          Banimento
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {moderateData.type === 'SUSPENSION' && (
                                  <div className="space-y-2">
                                    <Label>Duração (dias)</Label>
                                    <Input
                                      type="number"
                                      value={moderateData.duration || ''}
                                      onChange={(e) => setModerateData(prev => ({ 
                                        ...prev, 
                                        duration: parseInt(e.target.value) || undefined 
                                      }))}
                                      placeholder="Número de dias"
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label>Motivo (visível ao utilizador)</Label>
                                  <Textarea
                                    value={moderateData.reason}
                                    onChange={(e) => setModerateData(prev => ({ 
                                      ...prev, 
                                      reason: e.target.value 
                                    }))}
                                    placeholder="Descreva o motivo da moderação..."
                                    rows={3}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Nota interna (apenas para admins)</Label>
                                  <Textarea
                                    value={moderateData.moderatorNote || ''}
                                    onChange={(e) => setModerateData(prev => ({ 
                                      ...prev, 
                                      moderatorNote: e.target.value 
                                    }))}
                                    placeholder="Nota interna sobre a moderação..."
                                    rows={2}
                                  />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setModerateDialogOpen(false);
                                    setModerateData({ type: 'WARNING', reason: '', moderatorNote: '' });
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleModerateUser}
                                  disabled={!moderateData.reason.trim()}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Aplicar Moderação
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              fetchModerationHistory(parseInt(user.id));
                              setHistoryDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 w-full lg:w-auto"
                          >
                            <History className="h-4 w-4 mr-1" />
                            Histórico
                          </Button>
                          </div>
                        )}

                        {/* Botões de ação compactos */}
                        <div className="flex gap-1 w-full lg:w-auto">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                                <Eye className="h-4 w-4 lg:mr-0" />
                                <span className="lg:hidden ml-1">Detalhes</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Users className="h-5 w-5" />
                                  {user.name}
                                </DialogTitle>
                                <DialogDescription>
                                  Informações detalhadas do utilizador
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">ID</label>
                                    <p className="text-sm font-mono text-blue-600">#{user.id}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-sm">{user.email}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Role</label>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-xs ${ROLE_COLORS[user.role]}`}>
                                        <span className="flex items-center gap-1">
                                          {ROLE_ICONS[user.role]}
                                          {user.role}
                                        </span>
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <div className="flex items-center gap-2">
                                      {user.moderation && user.moderation.status !== 'ACTIVE' ? (
                                        <Badge className={`text-xs ${MODERATION_COLORS[user.moderation.status]}`}>
                                          <span className="flex items-center gap-1">
                                            {MODERATION_ICONS[user.moderation.status]}
                                            {user.moderation.status}
                                          </span>
                                        </Badge>
                                      ) : (
                                        <Badge className={`text-xs ${MODERATION_COLORS.ACTIVE}`}>
                                          <span className="flex items-center gap-1">
                                            {MODERATION_ICONS.ACTIVE}
                                            ACTIVE
                                          </span>
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Registado</label>
                                    <p className="text-sm">{new Date(user.createdAt).toLocaleDateString('pt-PT')}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Contribuições</label>
                                    <p className="text-sm">{user.totalSongs || 0} músicas publicadas</p>
                                  </div>
                                </div>

                                {/* Informações de Moderação se existir */}
                                {user.moderation && user.moderation.status !== 'ACTIVE' && (
                                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-semibold text-red-800 mb-2">Moderação Ativa</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-red-600 font-medium">Tipo:</span>
                                        <span className="ml-2">{user.moderation.type}</span>
                                      </div>
                                      {user.moderation.moderatedAt && (
                                        <div>
                                          <span className="text-red-600 font-medium">Data:</span>
                                          <span className="ml-2">{new Date(user.moderation.moderatedAt).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                      )}
                                      {user.moderation.expiresAt && (
                                        <div>
                                          <span className="text-red-600 font-medium">Expira:</span>
                                          <span className="ml-2">{new Date(user.moderation.expiresAt).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                      )}
                                      {user.moderation.moderatedBy && (
                                        <div>
                                          <span className="text-red-600 font-medium">Por:</span>
                                          <span className="ml-2">{user.moderation.moderatedBy.name}</span>
                                        </div>
                                      )}
                                    </div>
                                    {user.moderation.reason && (
                                      <div className="mt-2">
                                        <span className="text-red-600 font-medium">Motivo:</span>
                                        <p className="mt-1 p-2 bg-red-100 rounded text-red-800">{user.moderation.reason}</p>
                                      </div>
                                    )}
                                    {user.moderation.moderatorNote && (
                                      <div className="mt-2">
                                        <span className="text-red-600 font-medium">Nota do Admin:</span>
                                        <p className="mt-1 p-2 bg-blue-100 rounded text-blue-800 font-mono text-xs">{user.moderation.moderatorNote}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex gap-2 pt-4 border-t">
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/users/${user.id}`} target="_blank">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Ver Perfil Público
                                    </Link>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSendEmail(user.email, user.name)}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar Email
                                  </Button>
                                  <Button 
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    disabled={deletingUser === user.id}
                                  >
                                    {deletingUser === user.id ? (
                                      <Spinner variant="circle" size={16} className="text-black mr-2" />
                                    ) : (
                                      <Ban className="h-4 w-4 mr-2" />
                                    )}
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(user.email, user.name)}
                            className="flex-1 lg:flex-none"
                          >
                            <Mail className="h-4 w-4 lg:mr-0" />
                            <span className="lg:hidden ml-1">Email</span>
                          </Button>

                          <Button 
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={deletingUser === user.id}
                            className="flex-1 lg:flex-none"
                          >
                            {deletingUser === user.id ? (
                              <Spinner variant="circle" size={16} className="text-black" />
                            ) : (
                              <>
                                <Ban className="h-4 w-4 lg:mr-0" />
                                <span className="lg:hidden ml-1">Eliminar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {changingRole === user.id && (
                      <Spinner variant="circle" size={16} className="text-black" />
                    )}
                    
                    {user.id === session?.user.id?.toString() && (
                      <Badge variant="outline" className="text-xs">
                        Você
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-8">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">
                  Nenhum utilizador encontrado
                </h3>
                <p className="text-gray-500">
                  Tente ajustar os filtros de pesquisa
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages} ({totalCount} utilizadores)
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Histórico de Moderação */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Moderação - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Histórico completo de ações de moderação para este utilizador
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {moderationHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nenhum histórico de moderação encontrado.
              </p>
            ) : (
              moderationHistory.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getModerationIcon(item.status)}
                      <span className="font-medium">{getModerationBadge(item.status)}</span>
                      {item.type && (
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(item.moderatedAt).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {item.reason && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Motivo:</span>
                      <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                    </div>
                  )}
                  
                  {item.moderatorNote && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Nota do Moderador:</span>
                      <p className="text-sm text-gray-600 mt-1">{item.moderatorNote}</p>
                    </div>
                  )}
                  
                  {item.expiresAt && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Expira em:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(item.expiresAt).toLocaleDateString('pt-PT', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Por: {item.moderatedBy?.name || 'Sistema'}</span>
                    {item.moderatedBy?.email && (
                      <span>({item.moderatedBy.email})</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
