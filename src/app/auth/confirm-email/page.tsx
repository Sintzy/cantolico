'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Componente principal que usa useSearchParams
function ConfirmEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'already-verified' | 'missing-token' | 'invalid-token' | 'user-not-found' | 'update-failed'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();

  useEffect(() => {
    try {
      const statusParam = searchParams.get('status');
      
      // Se há um status parameter, processar diretamente
      if (statusParam) {
        handleStatusFromParams(statusParam);
        return;
      }
      
      // Se não há status mas há token, redirecionar para a API para processar
      const token = searchParams.get('token');
      if (token) {
        // Verificar se o token tem formato válido antes de redirecionar
        if (token.length < 10) {
          setStatus('invalid-token');
          setMessage('Token de verificação inválido.');
          return;
        }
        
        // Redirecionar para a API que processará e retornará com status
        window.location.href = `/api/auth/confirm-email?token=${encodeURIComponent(token)}`;
        return;
      }
      
      // Se não há nem status nem token, erro
      setStatus('missing-token');
      setMessage('Token de verificação não fornecido.');
    } catch (error) {
      console.error('Erro ao processar parâmetros de confirmação:', error);
      setStatus('error');
      setMessage('Erro ao processar os parâmetros de verificação.');
    }
  }, [searchParams]);

  const handleStatusFromParams = async (statusParam: string) => {
    try {
      switch (statusParam) {
        case 'success':
          setStatus('success');
          setMessage('Email verificado com sucesso! A tua conta está agora ativa.');
          // Atualizar sessão se o usuário está logado
          if (session && update) {
            try {
              await update();
            } catch (updateError) {
              console.error('Erro ao atualizar sessão:', updateError);
              // Continuar mesmo se a atualização falhar
            }
          }
          // Redirecionar após 3 segundos
          setTimeout(() => {
            try {
              if (session) {
                router.push('/');
              } else {
                router.push('/login?message=email-verified');
              }
            } catch (routerError) {
              console.error('Erro ao redirecionar:', routerError);
              // Fallback para redirecionamento manual
              window.location.href = session ? '/' : '/login?message=email-verified';
            }
          }, 3000);
          break;
        
      case 'already-verified':
        setStatus('already-verified');
        setMessage('O teu email já foi verificado anteriormente.');
        break;
        
      case 'expired':
        setStatus('expired');
        setMessage('O link de verificação expirou. Solicita um novo link de verificação.');
        break;
        
      case 'invalid-token':
        setStatus('invalid-token');
        setMessage('Token de verificação inválido ou não encontrado.');
        break;
        
      case 'missing-token':
        setStatus('missing-token');
        setMessage('Token de verificação não fornecido.');
        break;
        
      case 'user-not-found':
        setStatus('user-not-found');
        setMessage('Utilizador não encontrado para este token de verificação.');
        break;
        
      case 'update-failed':
        setStatus('update-failed');
        setMessage('Erro interno ao verificar o email. Tenta novamente mais tarde.');
        break;
        
        case 'error':
        default:
          setStatus('error');
          setMessage('Ocorreu um erro durante a verificação do email. Tenta novamente mais tarde.');
          break;
      }
    } catch (error) {
      console.error('Erro ao processar status:', error);
      setStatus('error');
      setMessage('Erro interno ao processar a verificação.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
      case 'already-verified':
        return '✅';
      case 'expired':
        return '⏰';
      case 'invalid-token':
      case 'missing-token':
      case 'user-not-found':
        return '❌';
      case 'update-failed':
      case 'error':
        return '⚠️';
      case 'loading':
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
      case 'already-verified':
        return 'text-green-600';
      case 'expired':
        return 'text-yellow-600';
      case 'invalid-token':
      case 'missing-token':
      case 'user-not-found':
      case 'update-failed':
      case 'error':
        return 'text-red-600';
      case 'loading':
      default:
        return 'text-blue-600';
    }
  };

  const showResendOption = () => {
    return ['expired', 'invalid-token', 'update-failed', 'error'].includes(status);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Verificação de Email
          </h1>
          
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">A verificar o teu email...</p>
            </div>
          )}
          
          {(status === 'success' || status === 'already-verified') && (
            <div className="space-y-4">
              <div className={`text-6xl mb-4 ${getStatusColor()}`}>
                {getStatusIcon()}
              </div>
              <h2 className="text-xl font-semibold text-green-800">
                {status === 'already-verified' ? 'Email já verificado!' : 'Email verificado com sucesso!'}
              </h2>
              <p className="text-gray-600">{message}</p>
              {status === 'success' && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    🎉 A tua conta está agora totalmente ativa! Podes:
                  </p>
                  <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
                    <li>Criar e editar músicas</li>
                    <li>Dar estrelas às tuas músicas favoritas</li>
                    <li>Criar playlists personalizadas</li>
                    <li>Editar o teu perfil</li>
                  </ul>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Serás redirecionado automaticamente em alguns segundos...
              </p>
            </div>
          )}
          
          {['error', 'expired', 'invalid-token', 'missing-token', 'user-not-found', 'update-failed'].includes(status) && (
            <div className="space-y-4">
              <div className={`text-6xl mb-4 ${getStatusColor()}`}>
                {getStatusIcon()}
              </div>
              <h2 className="text-xl font-semibold text-red-800">
                {status === 'expired' ? 'Link Expirado' : 
                 status === 'missing-token' ? 'Token em Falta' :
                 status === 'invalid-token' ? 'Token Inválido' :
                 status === 'user-not-found' ? 'Utilizador não Encontrado' :
                 status === 'update-failed' ? 'Erro de Atualização' :
                 'Erro na Verificação'}
              </h2>
              <p className="text-gray-600">{message}</p>
              
              <div className="mt-6 space-y-3">
                
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    Ir para o Login
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-center"
                  >
                    Criar Nova Conta
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de loading para Suspense
function ConfirmEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Verificação de Email
          </h1>
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600"><span className="sr-only">A carregar...</span><span aria-hidden data-nosnippet>A carregar...</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal exportado com Suspense
export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailLoading />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}