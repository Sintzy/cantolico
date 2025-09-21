'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Users, Music, FileText, Eye, CheckCircle } from 'lucide-react';

interface AlertData {
  id: string;
  severity: number;
  title: string;
  alert_type: string;
  created_at: string;
}

interface DashboardStats {
  role: 'ADMIN' | 'REVIEWER';
  alerts: {
    unacknowledged: number;
    critical: number;
    high: number;
    recent: AlertData[];
  };
  pendingMusic?: number;
  recentBans?: number;
  criticalLogs24h?: number;
  activeUsersToday?: number;
  pendingReviews?: number;
  reviewsThisMonth?: number;
}

interface AdminNotificationPopupProps {
  stats: DashboardStats;
  isLoading: boolean;
  onAcknowledge: (type: 'all' | 'specific', alertIds?: string[]) => Promise<any>;
  onClose: () => void;
}

export default function AdminNotificationPopup({ 
  stats, 
  isLoading, 
  onAcknowledge, 
  onClose 
}: AdminNotificationPopupProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const handleAcknowledgeAll = async () => {
    try {
      setIsAcknowledging(true);
      await onAcknowledge('all');
    } catch (error) {
      console.error('Erro ao reconhecer alertas:', error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const getSeverityColor = (severity: number): string => {
    if (severity >= 8) return 'text-red-600';
    if (severity >= 6) return 'text-orange-600';
    if (severity >= 4) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getSeverityBg = (severity: number): string => {
    if (severity >= 8) return 'bg-red-50 border-red-200';
    if (severity >= 6) return 'bg-orange-50 border-orange-200';
    if (severity >= 4) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  const isAdmin = stats.role === 'ADMIN';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Dashboard {isAdmin ? 'Administrador' : 'Reviewer'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alertas de Segurança */}
          {stats.alerts.unacknowledged > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">
                    Alertas de Segurança
                  </h3>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {stats.alerts.unacknowledged} não reconhecidos
                  </span>
                </div>
                <button
                  onClick={handleAcknowledgeAll}
                  disabled={isAcknowledging}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isAcknowledging ? 'Reconhecendo...' : 'Reconhecer Todos'}
                </button>
              </div>

              <div className="text-sm text-red-700 mb-3">
                <p>Críticos: {stats.alerts.critical} | Altos: {stats.alerts.high}</p>
              </div>

              {/* Alertas Recentes */}
              {stats.alerts.recent && stats.alerts.recent.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Alertas Recentes:</h4>
                  {stats.alerts.recent.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded border text-sm ${getSeverityBg(alert.severity)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.title}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">
                        Tipo: {alert.alert_type} | Severidade: {alert.severity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Estatísticas do Admin */}
          {isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.pendingMusic !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Music className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{stats.pendingMusic}</div>
                  <div className="text-sm text-blue-700">Músicas Pendentes</div>
                </div>
              )}

              {stats.recentBans !== undefined && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-900">{stats.recentBans}</div>
                  <div className="text-sm text-red-700">Banimentos (24h)</div>
                </div>
              )}

              {stats.criticalLogs24h !== undefined && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <FileText className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-900">{stats.criticalLogs24h}</div>
                  <div className="text-sm text-yellow-700">Logs Críticos (24h)</div>
                </div>
              )}

              {stats.activeUsersToday !== undefined && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Eye className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">{stats.activeUsersToday}</div>
                  <div className="text-sm text-green-700">Usuários Ativos</div>
                </div>
              )}
            </div>
          )}

          {/* Estatísticas do Reviewer */}
          {!isAdmin && (
            <div className="grid grid-cols-2 gap-4">
              {stats.pendingReviews !== undefined && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <FileText className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-900">{stats.pendingReviews}</div>
                  <div className="text-sm text-orange-700">Revisões Pendentes</div>
                </div>
              )}

              {stats.reviewsThisMonth !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{stats.reviewsThisMonth}</div>
                  <div className="text-sm text-blue-700">Revisões Este Mês</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}