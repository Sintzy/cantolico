'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { useState } from 'react';

interface GoogleSignInButtonProps {
  callbackUrl?: string;
  className?: string;
}

export function GoogleSignInButton({ 
  callbackUrl = '/', 
  className = '' 
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`w-full ${className}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
      ) : (
        <Chrome className="w-4 h-4 mr-2" />
      )}
      {isLoading ? 'A entrar...' : 'Continuar com Google'}
    </Button>
  );
}
