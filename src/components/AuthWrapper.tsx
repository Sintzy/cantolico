"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get('error');
    const callbackUrl = searchParams.get('callbackUrl');
    
    if (error) {
      let errorMessage = '';
      
      switch (error) {
        case 'Configuration':
          errorMessage = 'Erro de configuração do sistema. Tenta novamente.';
          break;
        case 'AccessDenied':
          errorMessage = 'Acesso negado. Verifica as tuas permissões.';
          break;
        case 'Verification':
          errorMessage = 'Token de verificação inválido ou expirado.';
          break;
        case 'OAuthSignin':
          errorMessage = 'Erro no início de sessão com Google. Tenta novamente.';
          break;
        case 'OAuthCallback':
          errorMessage = 'Erro na resposta do Google. Tenta novamente.';
          break;
        case 'OAuthCreateAccount':
          errorMessage = 'Erro ao criar conta com Google. Tenta novamente ou usa email/palavra-passe.';
          break;
        case 'EmailCreateAccount':
          errorMessage = 'Erro ao criar conta com email. Verifica os dados.';
          break;
        case 'Callback':
          errorMessage = 'Erro na autenticação. Tenta novamente.';
          break;
        case 'OAuthAccountNotLinked':
          errorMessage = 'Esta conta Google não está ligada. Faz login com email/palavra-passe primeiro ou cria uma nova conta.';
          break;
        case 'EmailSignin':
          errorMessage = 'Erro ao enviar email de verificação.';
          break;
        case 'CredentialsSignin':
          errorMessage = 'Email ou palavra-passe incorretos.';
          break;
        case 'SessionRequired':
          errorMessage = 'É necessário fazer login para aceder a esta página.';
          break;
        default:
          errorMessage = `Erro de autenticação: ${error}`;
      }
      
      toast.error(errorMessage);
      
      // Limpar o erro da URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      if (callbackUrl) {
        newUrl.searchParams.delete('callbackUrl');
      }
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  return <>{children}</>;
}