'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, Music, Clock, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import BannerDisplay from '@/components/BannerDisplay';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalSongs: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  usersByRole: { role: string; count: number }[];
  songsByType: { type: string; count: number }[];
  submissionsByMonth: { month: string; count: number }[];
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'submission_created':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'submission_approved':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'submission_rejected':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'song_created':
      return <Music className="h-4 w-4 text-purple-500" />;
    case 'user_registered':
      return <Users className="h-4 w-4 text-blue-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'submission_created':
      return 'bg-blue-50 border-blue-200';
    case 'submission_approved':
      return 'bg-green-50 border-green-200';
    case 'submission_rejected':
      return 'bg-red-50 border-red-200';
    case 'song_created':
      return 'bg-purple-50 border-purple-200';
    case 'user_registered':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    // Só carregar stats na primeira vez
    if (!stats) {
      fetchStats();
    }
  }, [session, status]); // Removido router e stats das dependências para evitar reloads

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }
      
      const data = await response.json();
      setStats(data);
      toast.success('Estatísticas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao carregar estatísticas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-xl font-semibold">Erro ao carregar dashboard</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchStats} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Não foi possível carregar os dados</p>
      </div>
    );
  }

  return (
    <>
      {/* Banners para área administrativa */}
      <BannerDisplay page="ADMIN" />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-gray-600">Bem-vindo, {session?.user?.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Button onClick={fetchStats} variant="outline" size="sm" className="w-full sm:w-auto">
            Atualizar
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/dashboard/users">Gestão Utilizadores</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/dashboard/musics">Gestão Músicas</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/dashboard/playlists">Gestão Playlists</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/dashboard/banners">Gestão Banners</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilizadores</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% desde o mês passado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Músicas</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% desde o mês passado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissões Pendentes</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissões</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Submissions by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submissões por Mês</CardTitle>
            <CardDescription>Evolução das submissões ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.submissionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Utilizadores por Role</CardTitle>
            <CardDescription>Distribuição de papéis dos utilizadores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.usersByRole}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, percent }) => `${role} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                  fontSize={12}
                >
                  {stats.usersByRole.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Songs by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Músicas por Tipo</CardTitle>
            <CardDescription>Distribuição das músicas por categoria litúrgica</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.songsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                      <p className="text-xs text-gray-500">Por {activity.user}</p>
                      <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funções mais utilizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Button asChild className="h-16 flex-col text-center p-4">
              <Link href="/admin/review">
                <svg className="h-5 w-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Revisar Submissões</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col text-center p-4">
              <Link href="/admin/dashboard/users">
                <svg className="h-5 w-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-sm">Gestão Utilizadores</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col text-center p-4">
              <Link href="/admin/dashboard/musics">
                <svg className="h-5 w-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
                </svg>
                <span className="text-sm">Gestão Músicas</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col text-center p-4">
              <Link href="/admin/dashboard/playlists">
                <svg className="h-5 w-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
                </svg>
                <span className="text-sm">Gestão Playlists</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col text-center p-4">
              <Link href="/admin/dashboard/banners">
                <svg className="h-5 w-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="text-sm">Gestão Banners</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
