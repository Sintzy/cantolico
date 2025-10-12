"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface AuthStatusProps {
  type: 'login' | 'register';
}

export function AuthStatus({ type }: AuthStatusProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    if (status === 'loading') {
      setAuthStep('checking');
    } else if (status === 'authenticated' && session) {
      setAuthStep('success');
      
      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else if (status === 'unauthenticated') {
      setAuthStep('idle');
    }
  }, [status, session, router]);

  if (authStep === 'idle') return null;

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-center space-x-3">
          {authStep === 'checking' && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">
                {type === 'login' ? 'A verificar credenciais...' : 'A criar conta...'}
              </span>
            </>
          )}
          
          {authStep === 'success' && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">
                {type === 'login' ? 'Login efetuado com sucesso!' : 'Conta criada com sucesso!'}
              </span>
            </>
          )}
          
          {authStep === 'error' && (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-600">
                Erro na autenticação. Tenta novamente.
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}