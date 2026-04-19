'use client';

import { useState, useEffect } from 'react';
import { Bell, FileText, AlertCircle, AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { trackEvent } from '@/lib/umami';

interface PopupBanner {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR';
  position: 'POPUP';
  priority: number;
}

const STORAGE_KEY = 'dismissedPopups';

const getPopupStyles = (type: PopupBanner['type']) => {
  switch (type) {
    case 'ANNOUNCEMENT': return { icon: Bell,          accent: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'   };
    case 'ALERT':        return { icon: AlertCircle,   accent: 'text-red-600',    badge: 'bg-red-100 text-red-700'     };
    case 'CHANGELOG':    return { icon: FileText,      accent: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' };
    case 'WARNING':      return { icon: AlertTriangle, accent: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
    case 'REQUEST':      return { icon: HelpCircle,    accent: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' };
    case 'SUCCESS':      return { icon: CheckCircle,   accent: 'text-green-600',  badge: 'bg-green-100 text-green-700'  };
    default:             return { icon: Info,          accent: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700'   };
  }
};

const typeLabels: Record<PopupBanner['type'], string> = {
  ANNOUNCEMENT: 'Anúncio',
  ALERT: 'Alerta',
  CHANGELOG: 'Novidades',
  WARNING: 'Aviso',
  REQUEST: 'Pedido',
  INFO: 'Informação',
  SUCCESS: 'Sucesso',
  ERROR: 'Erro',
};

function parseMessage(message: string): (string | React.ReactNode)[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = linkRegex.exec(message)) !== null) {
    if (match.index > lastIndex) parts.push(message.substring(lastIndex, match.index));
    const [, text, url] = match;
    const isExternal = url.startsWith('http');
    parts.push(
      isExternal
        ? <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:opacity-75">{text}</a>
        : <Link key={key++} href={url} className="underline font-semibold hover:opacity-75">{text}</Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < message.length) parts.push(message.substring(lastIndex));
  return parts;
}

export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<PopupBanner | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const scheduleFetch = () => {
      const dismissed = new Set<string>(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      );

      fetch('/api/banners/active?page=ALL')
        .then(r => r.ok ? r.json() : [])
        .then((banners: PopupBanner[]) => {
          const candidate = banners
            .filter(b => b.position === 'POPUP' && !dismissed.has(b.id))
            .sort((a, b) => b.priority - a.priority)[0];

          if (candidate) {
            setPopup(candidate);
            setOpen(true);
            trackEvent('popup_shown', { popupId: candidate.id, type: candidate.type });
          }
        })
        .catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(scheduleFetch, { timeout: 2000 });
    } else {
      const t = setTimeout(scheduleFetch, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = (permanent: boolean) => {
    if (!popup) return;
    if (permanent) {
      const dismissed = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
      dismissed.add(popup.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
    }
    trackEvent('popup_dismissed', { popupId: popup.id, permanent });
    setOpen(false);
  };

  if (!popup) return null;

  const styles = getPopupStyles(popup.type);
  const Icon = styles.icon;

  return (
    <Dialog open={open} onOpenChange={() => dismiss(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-lg ${styles.badge}`}>
              <Icon className={`h-5 w-5 ${styles.accent}`} />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
              {typeLabels[popup.type]}
            </span>
          </div>
          <DialogTitle className="text-lg font-semibold leading-snug">{popup.title}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {parseMessage(popup.message)}
        </p>

        <div className="flex items-center justify-between pt-2 gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs h-8 px-3"
            onClick={() => dismiss(true)}
          >
            Não mostrar novamente
          </Button>
          <Button size="sm" onClick={() => dismiss(false)} className="h-8">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
