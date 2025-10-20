'use client';

import { useEffect, useState } from 'react';

interface AdSenseWrapperProps {
  children: React.ReactNode;
}

export default function AdSenseWrapper({ children }: AdSenseWrapperProps) {
  const [isAdSenseReady, setIsAdSenseReady] = useState(false);

  useEffect(() => {
    const checkAdSense = () => {
      if (typeof window !== 'undefined') {
        // Verificar se o script do AdSense foi carregado
        const script = document.querySelector('script[src*="adsbygoogle.js"]');
        if (script || window.adsbygoogle) {
          setIsAdSenseReady(true);
        } else {
          // Se não foi carregado, tentar novamente em 100ms
          setTimeout(checkAdSense, 100);
        }
      }
    };

    // Iniciar verificação após um pequeno delay
    const timer = setTimeout(checkAdSense, 50);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isAdSenseReady) {
    return null; // Não renderizar até o AdSense estar pronto
  }

  return <>{children}</>;
}