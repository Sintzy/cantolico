'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/user-avatar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'REVIEWER' | 'ADMIN';
  createdAt: string;
  profileImage?: string;
  totalSongs?: number;
  totalSubmissions?: number;
}

interface UsersResponse {
  users: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const ROLE_COLORS = {
  USER: 'bg-blue-100 text-blue-800 border-blue-200',
  REVIEWER: 'bg-orange-100 text-orange-800 border-orange-200',
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200'
};

const ROLE_ICONS = {
  USER: <UserCheck className="h-3 w-3" />,
  REVIEWER: <Shield className="h-3 w-3" />,
  ADMIN: <Crown className="h-3 w-3" />
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

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchUsers();
  }, [session, status, router, currentPage, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        role: roleFilter === 'all' ? '' : roleFilter
      });

      const response = await fetch(`/api/admin/users?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar utilizadores');
      }
      
      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'REVIEWER' | 'ADMIN') => {
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

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Erro ao carregar utilizadores</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchUsers} variant="outline">
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
        <Button onClick={fetchUsers} variant="outline" size="sm">
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
            <div className="flex flex-col md:flex-row gap-4">
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
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={handleRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as roles</SelectItem>
                    <SelectItem value="USER">Utilizador</SelectItem>
                    <SelectItem value="REVIEWER">Revisor</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
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
          </CardTitle>
          <CardDescription>
            Lista de todos os utilizadores registados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <UserAvatar 
                    user={{
                      name: user.name,
                      image: user.profileImage
                    }} 
                    size={48} 
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge className={`text-xs ${ROLE_COLORS[user.role]}`}>
                        <span className="flex items-center gap-1">
                          {ROLE_ICONS[user.role]}
                          {user.role}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
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
                </div>

                <div className="flex items-center gap-2">
                  {user.id !== session?.user.id?.toString() && (
                    <>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: 'USER' | 'REVIEWER' | 'ADMIN') => 
                          handleRoleChange(user.id, newRole)
                        }
                        disabled={changingRole === user.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">Utilizador</SelectItem>
                          <SelectItem value="REVIEWER">Revisor</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                      </Select>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                            Detalhes
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
                                <label className="text-sm font-medium text-gray-500">Registado</label>
                                <p className="text-sm">{new Date(user.createdAt).toLocaleDateString('pt-PT')}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Contribuições</label>
                                <p className="text-sm">{user.totalSongs || 0} músicas publicadas</p>
                              </div>
                            </div>
                            
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
                                  <Spinner className="h-4 w-4 mr-2" />
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
                      >
                        <Mail className="h-4 w-4" />
                      </Button>

                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingUser === user.id}
                      >
                        {deletingUser === user.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  
                  {changingRole === user.id && (
                    <Spinner className="h-4 w-4" />
                  )}
                  
                  {user.id === session?.user.id?.toString() && (
                    <Badge variant="outline" className="text-xs">
                      Você
                    </Badge>
                  )}
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
    </div>
  );
}
