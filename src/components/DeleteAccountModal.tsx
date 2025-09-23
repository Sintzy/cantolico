'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
  isAdminAction?: boolean;
  onSuccess?: () => void;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  isAdminAction = false,
  onSuccess
}: DeleteAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Aviso inicial, 2: Confirmação final
  const router = useRouter();

  const expectedConfirmText = isAdminAction ? 'ELIMINAR CONTA' : 'ELIMINAR A MINHA CONTA';

  const handleClose = () => {
    if (!isLoading) {
      setStep(1);
      setReason('');
      setConfirmText('');
      setError('');
      onClose();
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== expectedConfirmText) {
      setError(`Tens de escrever exatamente: "${expectedConfirmText}"`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: isAdminAction ? targetUserId : undefined,
          reason: reason.trim() || undefined,
          adminAction: isAdminAction
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao eliminar conta');
      }

      console.log('✅ Conta eliminada com sucesso:', data);

      // Se é auto-eliminação, fazer logout e redirecionar
      if (!isAdminAction) {
        await signOut({ redirect: false });
        router.push('/register?message=account-deleted');
      } else {
        // Se é ação de admin, chamar callback de sucesso
        onSuccess?.();
      }

      handleClose();

    } catch (error) {
      console.error('❌ Erro ao eliminar conta:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background com blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {step === 1 && (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="text-4xl mr-4">⚠️</div>
              <div>
                <h2 className="text-xl font-bold text-red-600">
                  {isAdminAction ? 'Eliminar Conta de Utilizador' : 'Eliminar a Minha Conta'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {isAdminAction ? 
                    `Estás prestes a eliminar a conta de: ${targetUserName}` :
                    'Esta ação é irreversível e permanente'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">⚠️ ATENÇÃO: Esta ação não pode ser desfeita</h3>
                <p className="text-red-700 text-sm">
                  {isAdminAction ? 
                    'Vais eliminar permanentemente a conta deste utilizador e todos os seus dados associados.' :
                    'Vais eliminar permanentemente a tua conta e todos os dados associados.'
                  }
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📋 O que será eliminado:</h3>
                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                  <li>Dados pessoais e informações do perfil</li>
                  <li>Todas as playlists criadas</li>
                  <li>Lista de músicas favoritas (estrelas)</li>
                  <li>Músicas pendentes de aprovação</li>
                  <li>Músicas rejeitadas</li>
                  <li>Sessões activas e tokens de autenticação</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ O que será preservado:</h3>
                <ul className="text-green-700 text-sm space-y-1 list-disc list-inside">
                  <li><strong>Músicas aprovadas</strong> permanecerão no site</li>
                  <li>As músicas serão anonimizadas (sem referência ao autor)</li>
                  <li>Outros utilizadores continuarão a poder aceder às músicas</li>
                  <li>Comentários e interações com as músicas mantêm-se</li>
                </ul>
              </div>

              {isAdminAction && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">👨‍💼 Razão da eliminação (opcional):</h3>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descreve a razão para esta eliminação administrativa..."
                    className="w-full p-3 border border-yellow-300 rounded-lg text-sm"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-yellow-600 mt-1">
                    Esta informação será registada nos logs do sistema
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="text-4xl mr-4">🔥</div>
              <div>
                <h2 className="text-xl font-bold text-red-600">Confirmação Final</h2>
                <p className="text-gray-600 text-sm">
                  Última oportunidade para cancelar
                </p>
              </div>
            </div>

            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold mb-3">
                Para confirmar que és tu e não um robô, escreve exactamente o seguinte texto:
              </p>
              <code className="bg-red-200 px-2 py-1 rounded text-red-900 font-bold">
                {expectedConfirmText}
              </code>
              
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Escreve: ${expectedConfirmText}`}
                className="w-full mt-3 p-3 border-2 border-red-300 rounded-lg font-mono"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">❌ {error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading || confirmText !== expectedConfirmText}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    A eliminar...
                  </>
                ) : (
                  'ELIMINAR CONTA DEFINITIVAMENTE'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}