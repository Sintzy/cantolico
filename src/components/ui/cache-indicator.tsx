"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Database, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CacheIndicatorProps {
  isFromCache?: boolean;
  isLoading?: boolean;
  lastUpdated?: Date;
  className?: string;
  variant?: 'badge' | 'text' | 'icon';
}

export function CacheIndicator({
  isFromCache = false,
  isLoading = false,
  lastUpdated,
  className,
  variant = 'badge'
}: CacheIndicatorProps) {
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora mesmo';
    if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours}h`;
    
    return date.toLocaleDateString('pt-PT');
  };

  if (isLoading) {
    if (variant === 'icon') {
      return <Database className={cn('h-4 w-4 animate-pulse text-muted-foreground', className)} />;
    }
    
    if (variant === 'text') {
      return <span className={cn('text-sm text-muted-foreground', className)}>Carregando...</span>;
    }
    
    return (
      <Badge variant="secondary" className={cn('animate-pulse', className)}>
        <Database className="h-3 w-3 mr-1" />
        Carregando
      </Badge>
    );
  }

  if (variant === 'icon') {
    return isFromCache ? 
      <Clock className={cn('h-4 w-4 text-green-600', className)} /> :
      <Wifi className={cn('h-4 w-4 text-blue-600', className)} />;
  }

  if (variant === 'text') {
    return (
      <span className={cn('text-sm', isFromCache ? 'text-green-600' : 'text-blue-600', className)}>
        {isFromCache ? 'Cache' : 'Ao vivo'}
        {lastUpdated && ` • ${getTimeAgo(lastUpdated)}`}
      </span>
    );
  }

  return (
    <Badge 
      variant={isFromCache ? 'default' : 'secondary'} 
      className={cn(
        isFromCache ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200',
        className
      )}
    >
      {isFromCache ? (
        <Clock className="h-3 w-3 mr-1" />
      ) : (
        <Wifi className="h-3 w-3 mr-1" />
      )}
      {isFromCache ? 'Cache' : 'Ao vivo'}
      {lastUpdated && (
        <span className="ml-1 opacity-75">
          • {getTimeAgo(lastUpdated)}
        </span>
      )}
    </Badge>
  );
}

interface DataFreshnessProps {
  cacheKey: string;
  className?: string;
}

export function DataFreshness({ cacheKey, className }: DataFreshnessProps) {
  // Esta seria integrada com o sistema de cache para mostrar quando os dados foram atualizados
  const [cacheInfo, setCacheInfo] = React.useState<{ timestamp?: number; isFromCache: boolean }>({
    isFromCache: false
  });

  React.useEffect(() => {
    // Verificar se os dados estão em cache
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`cache_data_${cacheKey}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          setCacheInfo({
            timestamp: parsedCache.timestamp,
            isFromCache: true
          });
        }
      } catch (error) {
        console.warn('Erro ao verificar cache:', error);
      }
    }
  }, [cacheKey]);

  const lastUpdated = cacheInfo.timestamp ? new Date(cacheInfo.timestamp) : undefined;

  return (
    <CacheIndicator
      isFromCache={cacheInfo.isFromCache}
      lastUpdated={lastUpdated}
      variant="text"
      className={className}
    />
  );
}