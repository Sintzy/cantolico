'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AlertData {
  id: string;
  severity: number;
  title: string;
  alert_type: string;
  created_at: string;
}

interface DashboardStats {
  role: 'ADMIN' | 'REVIEWER';
  alerts: {
    unacknowledged: number;
    critical: number;
    high: number;
    recent: AlertData[];
  };
  pendingMusic?: number;
  recentBans?: number;
  criticalLogs24h?: number;
  activeUsersToday?: number;
  pendingReviews?: number;
  reviewsThisMonth?: number;
}

export function useAdminNotifications() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [lastDismissalTime, setLastDismissalTime] = useState<number | null>(null);

  const fetchStats = async () => {
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        // Mostrar popup se houver alertas não reconhecidos ou informações importantes
        const hasUnacknowledgedAlerts = data.alerts.unacknowledged > 0;
        const hasPendingWork = data.role === 'ADMIN' 
          ? (data.pendingMusic > 0 || data.recentBans > 0 || data.criticalLogs24h > 0)
          : (data.pendingReviews > 0);
        
        // Verificar se deve mostrar popup baseado no tempo da última dismissão
        const shouldShow = hasUnacknowledgedAlerts || hasPendingWork;
        const currentTime = Date.now();
        
        // Não mostrar se foi dispensado nos últimos 30 minutos, a menos que haja novos alertas críticos
        const recentlyDismissed = lastDismissalTime && (currentTime - lastDismissalTime) < 30 * 60 * 1000;
        
        if (shouldShow && (!recentlyDismissed || hasUnacknowledgedAlerts)) {
          setShouldShowPopup(true);
        } else if (!shouldShow) {
          setShouldShowPopup(false);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlerts = async (type: 'all' | 'specific', alertIds?: string[]) => {
    try {
      const response = await fetch('/api/dashboard/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, alertIds })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Atualizar stats
        if (stats) {
          const newUnacknowledged = type === 'all' ? 0 : stats.alerts.unacknowledged - (alertIds?.length || 0);
          setStats({
            ...stats,
            alerts: {
              ...stats.alerts,
              unacknowledged: newUnacknowledged
            }
          });

          // Fechar popup se não houver mais alertas críticos
          if (newUnacknowledged === 0) {
            const hasPendingWork = stats.role === 'ADMIN' 
              ? (stats.pendingMusic! > 0 || stats.recentBans! > 0 || stats.criticalLogs24h! > 0)
              : (stats.pendingReviews! > 0);
            
            if (!hasPendingWork) {
              setShouldShowPopup(false);
            }
          }
        }

        return result;
      }
    } catch (error) {
      console.error('Erro ao reconhecer alertas:', error);
      throw error;
    }
  };

  const hidePopup = () => {
    setShouldShowPopup(false);
  };

  const dismissPopup = () => {
    setShouldShowPopup(false);
    const currentTime = Date.now();
    setLastDismissalTime(currentTime);
    localStorage.setItem('admin-notification-dismissal', currentTime.toString());
  };

  // Buscar stats quando sessão carrega
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Carrega tempo da última dismissão do localStorage
      const storedDismissal = localStorage.getItem('admin-notification-dismissal');
      if (storedDismissal) {
        setLastDismissalTime(parseInt(storedDismissal));
      }
      
      fetchStats();
    }
  }, [session, status]);

  // Verificar periodicamente se há novos alertas (a cada 5 minutos)
  useEffect(() => {
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return;
    }

    const interval = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [session]);

  return {
    stats,
    isLoading,
    shouldShowPopup,
    acknowledgeAlerts,
    hidePopup,
    dismissPopup,
    refetchStats: fetchStats
  };
}