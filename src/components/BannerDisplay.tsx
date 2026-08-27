'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, Bell, FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { trackEvent } from '@/lib/umami';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR';
  position: 'TOP' | 'BOTTOM';
  priority: number;
}

interface BannerDisplayProps {
  page: 'HOME' | 'MUSICS' | 'ADMIN' | 'LITURGIA' | 'ALL';
}

// Função para processar markdown links [texto](url)
const parseMessageWithLinks = (message: string, bannerId: string, page: BannerDisplayProps['page']) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(message)) !== null) {
    // Adicionar texto antes do link
    if (match.index > lastIndex) {
      parts.push(message.substring(lastIndex, match.index));
    }

    const [, linkText, linkUrl] = match;
    const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://');

    // Adicionar link como elemento React
    if (isExternal) {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('banner_link_clicked', { bannerId, page, target: 'external' })}
          className="underline font-semibold hover:opacity-80 transition-opacity"
        >
          {linkText}
        </a>
      );
    } else {
      parts.push(
        <Link
          key={`link-${match.index}`}
          href={linkUrl}
          onClick={() => trackEvent('banner_link_clicked', { bannerId, page, target: 'internal' })}
          className="underline font-semibold hover:opacity-80 transition-opacity"
        >
          {linkText}
        </Link>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante
  if (lastIndex < message.length) {
    parts.push(message.substring(lastIndex));
  }

  return parts.length === 0 ? message : parts;
};

const getBannerStyles = (type: Banner['type']) => {
  switch (type) {
    case 'ANNOUNCEMENT':
      return {
        bg: 'bg-card border-blue-200 dark:border-blue-300/25',
        text: 'text-card-foreground',
        icon: Bell,
        iconColor: 'text-blue-600 dark:text-blue-300'
      };
    case 'ALERT':
      return {
        bg: 'bg-card border-red-200 dark:border-red-300/25',
        text: 'text-card-foreground',
        icon: AlertCircle,
        iconColor: 'text-red-600 dark:text-red-300'
      };
    case 'CHANGELOG':
      return {
        bg: 'bg-card border-purple-200 dark:border-purple-300/25',
        text: 'text-card-foreground',
        icon: FileText,
        iconColor: 'text-purple-600 dark:text-purple-300'
      };
    case 'WARNING':
      return {
        bg: 'bg-card border-yellow-200 dark:border-yellow-300/25',
        text: 'text-card-foreground',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600 dark:text-yellow-300'
      };
    case 'REQUEST':
      return {
        bg: 'bg-card border-orange-200 dark:border-orange-300/25',
        text: 'text-card-foreground',
        icon: HelpCircle,
        iconColor: 'text-orange-600 dark:text-orange-300'
      };
    case 'INFO':
      return {
        bg: 'bg-card border-gray-200 dark:border-white/15',
        text: 'text-card-foreground',
        icon: Info,
        iconColor: 'text-gray-600 dark:text-stone-300'
      };
    case 'SUCCESS':
      return {
        bg: 'bg-card border-green-200 dark:border-green-300/25',
        text: 'text-card-foreground',
        icon: CheckCircle,
        iconColor: 'text-green-600 dark:text-green-300'
      };
    case 'ERROR':
      return {
        bg: 'bg-card border-red-200 dark:border-red-300/25',
        text: 'text-card-foreground',
        icon: AlertCircle,
        iconColor: 'text-red-600 dark:text-red-300'
      };
    default:
      return {
        bg: 'bg-card border-gray-200 dark:border-white/15',
        text: 'text-card-foreground',
        icon: Info,
        iconColor: 'text-gray-600 dark:text-stone-300'
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
        trackEvent('banner_loaded', { page, count: Array.isArray(data) ? data.length : 0 });
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

  const dismissBanner = (banner: Banner) => {
    const bannerId = banner.id;
    const newDismissed = new Set([...dismissedBanners, bannerId]);
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify([...newDismissed]));
    trackEvent('banner_dismissed', { bannerId: banner.id, page, type: banner.type, position: banner.position });
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{parseMessageWithLinks(banner.message, banner.id, page)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${styles.text} hover:bg-black/10 dark:hover:bg-white/10 shrink-0`}
                onClick={() => dismissBanner(banner)}
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
        <div className="w-full relative z-[40]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
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
