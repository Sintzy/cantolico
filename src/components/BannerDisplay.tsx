'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, Bell, FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR';
  position: 'TOP' | 'BOTTOM';
  priority: number;
}

interface BannerDisplayProps {
  page: 'HOME' | 'MUSICS' | 'ADMIN' | 'ALL';
}

const getBannerStyles = (type: Banner['type']) => {
  switch (type) {
    case 'ANNOUNCEMENT':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        icon: Bell,
        iconColor: 'text-blue-600'
      };
    case 'ALERT':
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: AlertCircle,
        iconColor: 'text-red-600'
      };
    case 'CHANGELOG':
      return {
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-800',
        icon: FileText,
        iconColor: 'text-purple-600'
      };
    case 'WARNING':
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600'
      };
    case 'REQUEST':
      return {
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-800',
        icon: HelpCircle,
        iconColor: 'text-orange-600'
      };
    case 'INFO':
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: Info,
        iconColor: 'text-gray-600'
      };
    case 'SUCCESS':
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        icon: CheckCircle,
        iconColor: 'text-green-600'
      };
    case 'ERROR':
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: AlertCircle,
        iconColor: 'text-red-600'
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: Info,
        iconColor: 'text-gray-600'
      };
  }
};

export default function BannerDisplay({ page }: BannerDisplayProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  useEffect(() => {
    const scheduleFetch = () => {
      // Recuperar banners dispensados do localStorage
      const dismissed = typeof window !== 'undefined' ? localStorage.getItem('dismissedBanners') : null;
      if (dismissed) {
        setDismissedBanners(new Set(JSON.parse(dismissed)));
      }
      fetchBanners();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // Defer banner fetch to idle to avoid blocking LCP
      (window as any).requestIdleCallback(scheduleFetch, { timeout: 2000 });
    } else {
      const timeout = setTimeout(scheduleFetch, 300);
      return () => clearTimeout(timeout);
    }
  }, [page]);

  const fetchBanners = async () => {
    try {
      const response = await fetch(`/api/banners/active?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      } else {
        console.error('Erro ao carregar banners: resposta não OK');
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      // Silenciar erro de banners para não atrapalhar a experiência do usuário
      // Toast apenas em desenvolvimento ou se necessário debug
      if (process.env.NODE_ENV === 'development') {
        toast.error('Erro ao carregar banners do sistema');
      }
    }
  };

  const dismissBanner = (bannerId: string) => {
    const newDismissed = new Set([...dismissedBanners, bannerId]);
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify([...newDismissed]));
  };

  const activeBanners = banners.filter(banner => !dismissedBanners.has(banner.id));

  if (activeBanners.length === 0) return null;

  const topBanners = activeBanners.filter(banner => banner.position === 'TOP');
  const bottomBanners = activeBanners.filter(banner => banner.position === 'BOTTOM');

  const renderBanners = (bannerList: Banner[]) => (
    <div className="space-y-2">
      {bannerList.map((banner) => {
        const styles = getBannerStyles(banner.type);
        const IconComponent = styles.icon;

        return (
          <div
            key={banner.id}
            className={`border rounded-lg p-4 ${styles.bg} ${styles.text} shadow-sm animate-in slide-in-from-top duration-300`}
          >
            <div className="flex items-start gap-3">
              <IconComponent className={`h-5 w-5 mt-0.5 ${styles.iconColor} shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{banner.title}</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{banner.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${styles.text} hover:bg-black/10 shrink-0`}
                onClick={() => dismissBanner(banner.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Banners do topo */}
      {topBanners.length > 0 && (
        <div className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {renderBanners(topBanners)}
          </div>
        </div>
      )}

      {/* Banners do fundo - renderizados via portal ou posição fixa */}
      {bottomBanners.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          {renderBanners(bottomBanners)}
        </div>
      )}
    </>
  );
}
