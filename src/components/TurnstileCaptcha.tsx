'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { trackEvent } from '@/lib/umami';

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
        onSuccess={(token) => {
          trackEvent('turnstile_success');
          onSuccess(token);
        }}
        onError={() => {
          trackEvent('turnstile_error');
          onError?.();
        }}
        onExpire={() => {
          trackEvent('turnstile_expired');
          onExpire?.();
        }}
      />
    </div>
  );
}
