'use client';

import { useEffect, useRef, useState } from 'react';
import { ADSENSE_CONFIG, AD_FORMATS } from '@/lib/adsense-config';

interface GoogleAdBannerProps {
  slot: keyof typeof ADSENSE_CONFIG.SLOTS;
  adFormat?: keyof typeof AD_FORMATS; // Mantido para compatibilidade mas não usado
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  responsive?: 'mobile' | 'desktop' | 'all';
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdBanner({
  slot,
  adFormat = 'AUTO',
  fullWidthResponsive = true,
  className = '',
  style = { display: 'block' },
  responsive = 'all'
}: GoogleAdBannerProps) {
  const [isClient, setIsClient] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  const adSlot = ADSENSE_CONFIG.SLOTS[slot];
  const format = AD_FORMATS[adFormat];

  // Determinar tipo do anúncio para cores diferentes
  const adType = 
    slot.includes('SIDEBAR') ? 'sidebar' :
    slot.includes('MOBILE') ? 'mobile' :
    'horizontal';

  // Effect para marcar que estamos no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect para carregar anúncios reais em produção
  useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && isClient && !adLoaded && adRef.current) {
      const loadRealAd = async () => {
        try {
          // Verificar se o container tem largura suficiente
          const containerWidth = adRef.current?.offsetWidth || 0;
          if (containerWidth === 0) {
            console.warn('GoogleAd: Container width is 0, skipping ad load to prevent adsbygoogle error');
            return;
          }
          
          // Pequeno delay para garantir que DOM está pronto
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const insElement = adRef.current?.querySelector('.adsbygoogle');
          if (insElement && !insElement.hasAttribute('data-adsbygoogle-status')) {
            // Inicializar adsbygoogle se necessário
            window.adsbygoogle = window.adsbygoogle || [];
            (window.adsbygoogle as any[]).push({});
            setAdLoaded(true);
          }
        } catch (error) {
          console.error('Erro ao carregar anúncio real:', error);
        }
      };

      loadRealAd();
    }
  }, [isClient, adLoaded]);

  // Responsive classes
  const responsiveClass = 
    responsive === 'mobile' ? 'md:hidden' :
    responsive === 'desktop' ? 'hidden md:block' :
    '';

  // Não renderizar no servidor 
  if (!isClient) {
    return null;
  }

  // Em produção: carregar anúncios reais
  // Em desenvolvimento: mostrar placeholders
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // PRODUÇÃO: Anúncios reais do Google AdSense
    return (
      <div 
        ref={adRef}
        className={`google-ad-banner google-ad-responsive ${responsiveClass} ${className}`}
        style={{ 
          minHeight: style?.minHeight || '250px',
          minWidth: '300px', // Largura mínima para evitar availableWidth=0
          width: '100%',
          display: 'block'
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            ...style
          }}
          data-ad-client={ADSENSE_CONFIG.CLIENT_ID}
          data-ad-slot={adSlot}
          // Removido data-ad-format para evitar conflito entre métodos automático e manual
          // Usar apenas data-full-width-responsive para responsividade automática
          data-full-width-responsive={fullWidthResponsive.toString()}
        />
      </div>
    );
  }

  // DESENVOLVIMENTO: Placeholder colorido
  return (
    <div 
      className={`google-ad-banner google-ad-responsive ${responsiveClass} ${className}`}
      style={{ 
        minHeight: style?.minHeight || '250px',
        width: '100%',
        display: 'block',
        position: 'relative'
      }}
    >
      {/* Placeholder colorido sempre visível */}
      <div 
        className="ad-placeholder" 
        data-type={adType}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          width: '100%',
          height: '100%',
          minHeight: style?.minHeight || '250px'
        }}
      >
        <div className="text-center p-4">
          <div className="text-sm font-bold mb-1">
            📢 PLACEHOLDER DE ANÚNCIO
          </div>
          <div className="text-xs mb-2 font-mono">
            {slot}
          </div>
          <div className="text-xs mb-1">
            Slot: {adSlot}
          </div>
          <div className="text-xs opacity-75">
            {adFormat} • {responsive === 'all' ? 'Todos dispositivos' : responsive}
          </div>
          <div className="text-xs mt-2 px-2 py-1 bg-black bg-opacity-10 rounded">
            MODO PLACEHOLDER
          </div>
        </div>
      </div>
    </div>
  );
}