'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmailVerificationBannerProps {
  className?: string;
}

export default function EmailVerificationBanner({ className = '' }: EmailVerificationBannerProps) {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isOAuthAccount, setIsOAuthAccount] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user?.id) {
      // Verificar se o email está verificado
      checkEmailVerificationStatus();
    } else {
      setIsVisible(false);
    }
  }, [session, status]);

  const checkEmailVerificationStatus = async () => {
    try {
      const response = await fetch('/api/user/email-verification-status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const isVerified = data.emailVerified;
        setEmailVerified(isVerified);
        setIsVisible(!isVerified && !!session?.user);
        
        // Verificar se é conta OAuth quando não está verificada
        if (!isVerified && session?.user) {
          checkIfOAuthAccount();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de email:', error);
      // Em caso de erro, assumir que não está verificado se há sessão
      setEmailVerified(false);
      setIsVisible(!!session?.user);
    }
  };

  const checkIfOAuthAccount = async () => {
    if (!session?.user?.id) {
      setIsOAuthAccount(false);
      return;
    }
    
    try {
      // Verificar se tem conta OAuth através da API
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        // Verificar se tem provider Google
        setIsOAuthAccount(userData.hasGoogle || false);
      } else {
        setIsOAuthAccount(false);
      }
    } catch (error) {
      console.error('Erro ao verificar OAuth:', error);
      setIsOAuthAccount(false);
    }
  };

  const forceVerifyOAuth = async () => {
    setIsResending(true);
    setResendMessage('');
    
    try {
      const response = await fetch('/api/user/force-verify-oauth', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResendMessage('✅ Email verificado com sucesso!');
        setEmailVerified(true);
        setIsVisible(false);
        // Recarregar página após 2 segundos
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResendMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao forçar verificação:', error);
      setResendMessage('❌ Erro ao verificar email');
    } finally {
      setIsResending(false);
    }
  };

  const handleResendEmail = async () => {
    if (!session?.user?.email) return;
    
    setIsResending(true);
    setResendMessage('');
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          setResendMessage(`⏰ ${errorData.error || 'Aguarda alguns minutos antes de solicitar novo email'}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResendMessage('✅ Email de verificação reenviado com sucesso!');
      } else {
        setResendMessage(`❌ ${data.error || 'Erro ao reenviar email'}`);
      }
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      setResendMessage('❌ Erro interno. Tenta novamente mais tarde.');
    } finally {
      setIsResending(false);
      
      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        setResendMessage('');
      }, 5000);
    }
  };



  if (!isVisible || status === 'loading') {
    return null;
  }

  return (
    <div className="w-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Verifica o teu email para ativar a conta
              </h3>
              <p className="text-sm leading-relaxed mb-3">
                A tua conta ainda não está totalmente ativa. Para poderes criar músicas, 
                dar estrelas, criar playlists e editar o teu perfil, precisas de verificar 
                o teu endereço de email.
                {isOAuthAccount && (
                  <>
                    <br />
                    <span className="text-xs text-yellow-700 mt-1 block">
                      💡 <strong>Conta Google?</strong> Clica em "Verificar conta Google" para ativar automaticamente.
                    </span>
                  </>
                )}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  size="sm"
                  className="inline-flex items-center bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300 disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      A reenviar...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Reenviar email
                    </>
                  )}
                </Button>

                {/* Botão especial para contas OAuth - só aparece se for conta Google */}
                {isOAuthAccount && (
                  <Button
                    onClick={forceVerifyOAuth}
                    disabled={isResending}
                    size="sm"
                    className="inline-flex items-center bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Verificar conta Google
                      </>
                    )}
                  </Button>
                )}
                
                {resendMessage && (
                  <span className="text-xs self-center font-medium">
                    {resendMessage}
                  </span>
                )}
              </div>
              
              {session?.user?.email && (
                <p className="text-xs text-yellow-700">
                  Email enviado para: <strong className="font-medium">{session.user.email}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}