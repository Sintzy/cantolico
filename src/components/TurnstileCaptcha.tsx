'use client';

import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileCaptchaProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export function TurnstileCaptcha({ 
  onSuccess, 
  onError, 
  onExpire, 
  className = "" 
}: TurnstileCaptchaProps) {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    console.warn('NEXT_PUBLIC_TURNSTILE_SITE_KEY não configurado');
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    </div>
  );
}
