'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
      // Mostrar feedback imediato
      toast.loading('A redirecionar para o Google...', {
        id: 'google-signin'
      });

      const result = await signIn('google', {
        callbackUrl,
        redirect: false, // Não redirecionar automaticamente para ter controlo
      });

      if (result?.error) {
        toast.error('Erro ao entrar com Google. Tenta novamente.', {
          id: 'google-signin'
        });
        console.error('Erro Google Sign-in:', result.error);
      } else if (result?.url) {
        toast.success('Redirecionando...', {
          id: 'google-signin'
        });
        // Redirecionar manualmente
        window.location.href = result.url;
      } else {
        // Fallback - tentar redirect direto
        await signIn('google', {
          callbackUrl,
          redirect: true,
        });
      }
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      toast.error('Erro de conexão. Verifica a tua internet e tenta novamente.', {
        id: 'google-signin'
      });
    } finally {
      // Só reset loading se não houve redirect
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`w-full hover:bg-gray-50 border-gray-200 ${className}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
      ) : (
        <Chrome className="w-4 h-4 mr-2 text-blue-500" />
      )}
      {isLoading ? 'A entrar...' : 'Continuar com Google'}
    </Button>
  );
}
