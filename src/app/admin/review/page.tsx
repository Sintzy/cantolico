"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import UserHoverCard from "@/components/UserHoverCard";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Music,
  User,
  Calendar,
  Eye,
  Zap,
  Loader2,
  AlertTriangle,
  Ban,
  Shield,
  History,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  MoreHorizontal,
  Download,
  CheckSquare,
  Square,
  Settings,
  SortAsc,
  SortDesc,
  Users,
  Tag,
  Guitar
} from "lucide-react";

type Submission = {
  id: string;
  title: string;
  type: string;
  mainInstrument: string;
  tags: string[];
  moment: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt?: string;
  submitter: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    createdAt: string;
    image: string | null;
    bio?: string;
    moderationHistory?: {
      id: number;
      status: "ACTIVE" | "WARNING" | "SUSPENDED" | "BANNED";
      type: "WARNING" | "SUSPENSION" | "BAN" | null;
      reason: string | null;
      moderatorNote: string | null;
      moderatedAt: string;
      expiresAt: string | null;
      moderatedBy?: {
        name: string | null;
      };
    }[];
    currentModeration?: {
      id: number;
      status: "ACTIVE" | "WARNING" | "SUSPENDED" | "BANNED";
      type: "WARNING" | "SUSPENSION" | "BAN" | null;
      reason: string | null;
      moderatorNote: string | null;
      moderatedAt: string;
      expiresAt: string | null;
      moderatedBy?: {
        name: string | null;
      };
    };
  };
};

export default function AdminReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  // Garante que submissions é sempre array
  const safeSubmissions: Submission[] = Array.isArray(submissions) ? submissions : [];
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [submissionToReject, setSubmissionToReject] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Novos estados para filtros avançados
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [instrumentFilter, setInstrumentFilter] = useState<string>("all");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [moderationFilter, setModerationFilter] = useState<string>("all");
  
  // Estados para ordenação
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Estados para seleção múltipla
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Estados para estatísticas
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  // Função para buscar estatísticas globais
  const fetchGlobalStats = async () => {
    try {
      // Primeiro tenta buscar estatísticas da API principal
      const url = new URL("/api/admin/submissions", window.location.origin);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "1"); // Limite baixo para economizar
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        
        // Se a API retornar estatísticas, usa elas
        if (data.stats && data.stats.total > 0) {
          setStats(data.stats);
          return;
        }
        
        // Senão, busca todas as submissões para calcular
        const allUrl = new URL("/api/admin/submissions", window.location.origin);
        allUrl.searchParams.set("page", "1");
        allUrl.searchParams.set("limit", "1000");
        
        const allRes = await fetch(allUrl.toString());
        if (allRes.ok) {
          const allData = await allRes.json();
          const allSubmissions = Array.isArray(allData.submissions) ? allData.submissions : [];
          
          const globalStats = {
            pending: allSubmissions.filter((s: Submission) => s.status === "PENDING").length,
            approved: allSubmissions.filter((s: Submission) => s.status === "APPROVED").length,
            rejected: allSubmissions.filter((s: Submission) => s.status === "REJECTED").length,
            total: allSubmissions.length
          };
          
          setStats(globalStats);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas globais:", error);
      // Em caso de erro, mantém as estatísticas atuais ou define como 0
      setStats(prev => prev.total > 0 ? prev : { pending: 0, approved: 0, rejected: 0, total: 0 });
    }
  };

  const fetchSubmissions = async (params?: { 
    page?: number; 
    q?: string; 
    status?: string;
    type?: string;
    instrument?: string;
    userRole?: string;
    dateFilter?: string;
    moderationFilter?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/submissions", window.location.origin);
      url.searchParams.set("page", String(params?.page ?? page));
      url.searchParams.set("limit", "20");
      
      if (params?.q !== undefined) url.searchParams.set("q", params.q);
      else if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      
      if (params?.status !== undefined && params.status !== "all") url.searchParams.set("status", params.status);
      else if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      
      if (params?.type !== undefined && params.type !== "all") url.searchParams.set("type", params.type);
      else if (typeFilter !== "all") url.searchParams.set("type", typeFilter);
      
      if (params?.instrument !== undefined && params.instrument !== "all") url.searchParams.set("instrument", params.instrument);
      else if (instrumentFilter !== "all") url.searchParams.set("instrument", instrumentFilter);
      
      if (params?.userRole !== undefined && params.userRole !== "all") url.searchParams.set("userRole", params.userRole);
      else if (userRoleFilter !== "all") url.searchParams.set("userRole", userRoleFilter);
      
      if (params?.dateFilter !== undefined && params.dateFilter !== "all") url.searchParams.set("dateFilter", params.dateFilter);
      else if (dateFilter !== "all") url.searchParams.set("dateFilter", dateFilter);
      
      if (params?.moderationFilter !== undefined && params.moderationFilter !== "all") url.searchParams.set("moderationFilter", params.moderationFilter);
      else if (moderationFilter !== "all") url.searchParams.set("moderationFilter", moderationFilter);
      
      // Parâmetros de ordenação
      url.searchParams.set("sortBy", params?.sortBy ?? sortBy);
      url.searchParams.set("sortOrder", params?.sortOrder ?? sortOrder);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const fetchedSubmissions = Array.isArray(data.submissions) ? data.submissions : [];
        setSubmissions(fetchedSubmissions);
        setTotalPages(data.totalPages || 1);
        setTotalSubmissions(data.totalSubmissions || fetchedSubmissions.length);
      } else {
        toast.error("Erro ao carregar submissões");
      }
    } catch (error) {
      toast.error("Erro ao carregar submissões");
    } finally {
      setLoading(false);
    }
  };

  // Fetch inicial das estatísticas globais
  useEffect(() => {
    fetchGlobalStats();
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch on debounced search, page, or any filter change
  useEffect(() => {
    fetchSubmissions({ 
      page, 
      q: debouncedSearch, 
      status: statusFilter,
      type: typeFilter,
      instrument: instrumentFilter,
      userRole: userRoleFilter,
      dateFilter: dateFilter,
      moderationFilter: moderationFilter,
      sortBy,
      sortOrder
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, statusFilter, typeFilter, instrumentFilter, userRoleFilter, dateFilter, moderationFilter, sortBy, sortOrder]);

  const handleInstantApprove = async (submissionId: string) => {
    setLoadingActions(prev => ({ ...prev, [submissionId]: true }));
    
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/instant-approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Música aprovada instantaneamente!");
        fetchSubmissions(); // Recarregar lista
        fetchGlobalStats(); // Atualizar estatísticas
      } else {
        toast.error(data.error || "Erro ao aprovar música");
      }
    } catch (error) {
      toast.error("Erro ao aprovar música");
    } finally {
      setLoadingActions(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!submissionToReject) return;
    
    // Se for uma ação em lote
    if (submissionToReject === "bulk") {
      await handleBulkReject(rejectionReason);
      return;
    }
    
    setLoadingActions(prev => ({ ...prev, [submissionToReject]: true }));
    
    try {
      const res = await fetch(`/api/admin/submission/${submissionToReject}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Submissão rejeitada com sucesso");
        fetchSubmissions();
        fetchGlobalStats(); // Atualizar estatísticas
      } else {
        toast.error(data.error || "Erro ao rejeitar submissão");
        throw new Error(data.error || "Erro ao rejeitar submissão");
      }
    } catch (error) {
      console.error("Erro ao rejeitar submissão:", error);
      throw error; // Para que o dialog possa lidar com o erro
    } finally {
      setLoadingActions(prev => ({ ...prev, [submissionToReject]: false }));
      setSubmissionToReject(null);
    }
  };

  // Funções para seleção múltipla
  const toggleSubmissionSelection = (submissionId: string) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(submissionId)) {
      newSelected.delete(submissionId);
    } else {
      newSelected.add(submissionId);
    }
    setSelectedSubmissions(newSelected);
  };

  const selectAllSubmissions = () => {
    const pendingSubmissions = safeSubmissions
      .filter(s => s.status === "PENDING")
      .map(s => s.id);
    setSelectedSubmissions(new Set(pendingSubmissions));
  };

  const clearSelection = () => {
    setSelectedSubmissions(new Set());
  };

  // Ações em lote
  const handleBulkApprove = async () => {
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedSubmissions).map(id =>
        fetch(`/api/admin/submission/${id}/instant-approve`, { method: "POST" })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      if (successful > 0) {
        toast.success(`${successful} submissões aprovadas com sucesso`);
      }
      if (failed > 0) {
        toast.error(`${failed} submissões falharam na aprovação`);
      }
      
      clearSelection();
      fetchSubmissions();
      fetchGlobalStats(); // Atualizar estatísticas
    } catch (error) {
      toast.error("Erro nas ações em lote");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedSubmissions).map(id =>
        fetch(`/api/admin/submission/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason: reason.trim() }),
        })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      if (successful > 0) {
        toast.success(`${successful} submissões rejeitadas com sucesso`);
      }
      if (failed > 0) {
        toast.error(`${failed} submissões falharam na rejeição`);
      }
      
      clearSelection();
      fetchSubmissions();
      fetchGlobalStats(); // Atualizar estatísticas
    } catch (error) {
      toast.error("Erro nas ações em lote");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Função para resetar filtros
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setInstrumentFilter("all");
    setUserRoleFilter("all");
    setDateFilter("all");
    setModerationFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  // Função para alterar ordenação
  const handleSortChange = (newSortBy: string) => {
    // Handle special sorting options with built-in direction
    if (newSortBy === "title_desc") {
      setSortBy("title");
      setSortOrder("desc");
    } else if (newSortBy === "createdAt_asc") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else {
      // For regular options, if same field is selected, toggle order
      if (sortBy === newSortBy) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(newSortBy);
        // Set default order based on field type
        if (newSortBy === "title") {
          setSortOrder("asc"); // A-Z by default
        } else if (newSortBy === "createdAt") {
          setSortOrder("desc"); // Most recent by default
        } else {
          setSortOrder("desc");
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="text-red-600 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: "bg-red-100 text-red-800",
      REVIEWER: "bg-blue-100 text-blue-800",
      TRUSTED: "bg-green-100 text-green-800",
      USER: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[role as keyof typeof colors] || colors.USER}>
        {role}
      </Badge>
    );
  };

  const getModerationBadge = (status: string) => {
    const colors = {
      ACTIVE: "bg-green-100 text-green-800",
      WARNING: "bg-yellow-100 text-yellow-800",
      SUSPENDED: "bg-orange-100 text-orange-800",
      BANNED: "bg-red-100 text-red-800",
    };
    
    const icons = {
      ACTIVE: <Shield className="w-3 h-3 mr-1" />,
      WARNING: <AlertTriangle className="w-3 h-3 mr-1" />,
      SUSPENDED: <XCircle className="w-3 h-3 mr-1" />,
      BANNED: <Ban className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || colors.ACTIVE}>
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const UserModerationDialog = ({ submission }: { submission: Submission }) => {
    const { submitter } = submission;
    
    // Garante que moderationHistory é sempre array
    const moderationHistory = Array.isArray(submitter.moderationHistory) ? submitter.moderationHistory : [];
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="ml-2">
            <History className="w-4 h-4 mr-1" />
            Histórico
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Histórico de Moderação - {submitter.name}
            </DialogTitle>
            <DialogDescription>
              ID do Utilizador: #{submitter.id} | Email: {submitter.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Status Atual */}
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">Status Atual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="mt-1">{getRoleBadge(submitter.role)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status de Moderação</label>
                  <div className="mt-1">
                    {submitter.currentModeration && submitter.currentModeration.status
                      ? getModerationBadge(submitter.currentModeration.status)
                      : getModerationBadge("ACTIVE")
                    }
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Membro desde</label>
                  <p className="text-sm mt-1">{new Date(submitter.createdAt).toLocaleDateString('pt-PT')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ID do Utilizador</label>
                  <p className="text-sm mt-1 font-mono">#{submitter.id}</p>
                </div>
              </div>
              {/* Moderação Atual */}
              {submitter.currentModeration && submitter.currentModeration.status && submitter.currentModeration.status !== 'ACTIVE' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800">Moderação Ativa</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="text-xs font-medium text-red-600">Tipo</label>
                          <p className="text-sm text-red-800">{submitter.currentModeration?.type || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-red-600">Aplicada em</label>
                          <p className="text-sm text-red-800">
                            {submitter.currentModeration?.moderatedAt ? new Date(submitter.currentModeration.moderatedAt).toLocaleDateString('pt-PT') : '-'}
                          </p>
                        </div>
                        {submitter.currentModeration?.expiresAt && (
                          <div>
                            <label className="text-xs font-medium text-red-600">Expira em</label>
                            <p className="text-sm text-red-800">
                              {new Date(submitter.currentModeration.expiresAt).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                        )}
                        {submitter.currentModeration?.moderatedBy && (
                          <div>
                            <label className="text-xs font-medium text-red-600">Moderado por</label>
                            <p className="text-sm text-red-800">{submitter.currentModeration.moderatedBy?.name || '-'}</p>
                          </div>
                        )}
                      </div>
                      {submitter.currentModeration?.reason && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-red-600">Motivo</label>
                          <p className="text-sm text-red-800 bg-red-100 p-2 rounded mt-1">
                            {submitter.currentModeration.reason}
                          </p>
                        </div>
                      )}
                      {submitter.currentModeration?.moderatorNote && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-red-600">Nota do Moderador</label>
                          <p className="text-sm text-red-700 bg-red-100 p-2 rounded mt-1 font-mono">
                            {submitter.currentModeration.moderatorNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Histórico de Moderações */}
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">Histórico de Moderações</h3>
              {moderationHistory.length > 0 ? (
                <div className="space-y-3">
                  {moderationHistory.map((moderation, index) => (
                    <div 
                      key={moderation.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getModerationBadge(moderation.status)}
                            <span className="text-sm text-gray-500">
                              #{moderation.id}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(moderation.moderatedAt).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Tipo</label>
                          <p className="text-sm">{moderation.type || 'N/A'}</p>
                        </div>
                        {moderation.expiresAt && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">Expiração</label>
                            <p className="text-sm">
                              {new Date(moderation.expiresAt).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                        )}
                        {moderation.moderatedBy && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">Moderado por</label>
                            <p className="text-sm">{moderation.moderatedBy.name || 'Sistema'}</p>
                          </div>
                        )}
                      </div>
                      {moderation.reason && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-gray-500">Motivo</label>
                          <p className="text-sm bg-gray-100 p-2 rounded mt-1">
                            {moderation.reason}
                          </p>
                        </div>
                      )}
                      {moderation.moderatorNote && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-500">Nota do Moderador</label>
                          <p className="text-sm bg-blue-50 p-2 rounded mt-1 font-mono text-blue-800">
                            {moderation.moderatorNote}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum histórico de moderação encontrado</p>
                  <p className="text-sm">Este utilizador nunca foi moderado</p>
                </div>
              )}
            </div>
            {/* Estatísticas */}
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">Estatísticas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {moderationHistory.length}
                  </div>
                  <div className="text-sm text-blue-600">Total Moderações</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {moderationHistory.filter(m => m.type === 'WARNING').length}
                  </div>
                  <div className="text-sm text-yellow-600">Advertências</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {moderationHistory.filter(m => m.type === 'SUSPENSION').length}
                  </div>
                  <div className="text-sm text-orange-600">Suspensões</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {moderationHistory.filter(m => m.type === 'BAN').length}
                  </div>
                  <div className="text-sm text-red-600">Banimentos</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">A carregar submissões...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revisão de Submissões</h1>
            <p className="text-muted-foreground">
              Gerir e revisar submissões de músicas dos utilizadores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              fetchSubmissions();
              fetchGlobalStats();
            }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Settings className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">submissões no total</p>
              {stats.total === 0 && (
                <p className="text-xs text-yellow-600 mt-1">Carregando...</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
              <p className="text-xs text-muted-foreground">aguardam revisão</p>
              {stats.total > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% do total
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
              <p className="text-xs text-muted-foreground">já publicadas</p>
              {stats.total > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% do total
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
              <p className="text-xs text-muted-foreground">não aprovadas</p>
              {stats.total > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% do total
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filtros Avançados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros e Ordenação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Linha 1: Pesquisa e Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por título, autor ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="APPROVED">Aprovadas</SelectItem>
                  <SelectItem value="REJECTED">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2: Tipo e Instrumento */}
            <div className="grid gap-4 md:grid-cols-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <Music className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="HINO">Hino</SelectItem>
                  <SelectItem value="CANTICO">Cântico</SelectItem>
                  <SelectItem value="SALMO">Salmo</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                <SelectTrigger>
                  <Guitar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por instrumento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os instrumentos</SelectItem>
                  <SelectItem value="VIOLAO">Violão</SelectItem>
                  <SelectItem value="GUITARRA">Guitarra</SelectItem>
                  <SelectItem value="PIANO">Piano</SelectItem>
                  <SelectItem value="UKULELE">Ukulele</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 3: Role do Utilizador e Data */}
            <div className="grid gap-4 md:grid-cols-2">
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger>
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por role do utilizador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  <SelectItem value="USER">Utilizador</SelectItem>
                  <SelectItem value="TRUSTED">Utilizador Confiável</SelectItem>
                  <SelectItem value="REVIEWER">Revisor</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last90days">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 4: Status de Moderação e Ordenação */}
            <div className="grid gap-4 md:grid-cols-2">
              <Select value={moderationFilter} onValueChange={setModerationFilter}>
                <SelectTrigger>
                  <Shield className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por moderação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ACTIVE">Utilizadores Ativos</SelectItem>
                  <SelectItem value="WARNING">Com Advertência</SelectItem>
                  <SelectItem value="SUSPENDED">Suspensos</SelectItem>
                  <SelectItem value="BANNED">Banidos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select 
                  value={
                    sortBy === "title" && sortOrder === "desc" ? "title_desc" :
                    sortBy === "createdAt" && sortOrder === "asc" ? "createdAt_asc" :
                    sortBy
                  } 
                  onValueChange={(value) => handleSortChange(value)}
                >
                  <SelectTrigger className="flex-1">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Título (A-Z)</SelectItem>
                    <SelectItem value="title_desc">Título (Z-A)</SelectItem>
                    <SelectItem value="createdAt">Data (Mais Recente)</SelectItem>
                    <SelectItem value="createdAt_asc">Data (Mais Antiga)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="submitter.role">Role do Utilizador</SelectItem>
                    <SelectItem value="type">Tipo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações em Lote */}
        {selectedSubmissions.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Ações em Lote ({selectedSubmissions.size} selecionadas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkActionLoading}
                  size="sm"
                >
                  {bulkActionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Aprovar Selecionadas
                </Button>
                <Button
                  variant="destructive"
                  disabled={bulkActionLoading}
                  size="sm"
                  onClick={() => {
                    // Implementar diálogo personalizado para bulk reject
                    setShowRejectDialog(true);
                    setSubmissionToReject("bulk");
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar Selecionadas
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  size="sm"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Limpar Seleção
                </Button>
                <Button
                  variant="outline"
                  onClick={selectAllSubmissions}
                  size="sm"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Selecionar Todas (Pendentes)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paginação e Informações */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} • {totalSubmissions} submissões no total • {submissions.length} nesta página
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Página</span>
              <Input
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={(e) => setPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="w-20 text-center"
              />
              <span className="text-sm">de {totalPages}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de submissões */}
      <div className="space-y-4">
        {safeSubmissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma submissão encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não foram encontradas submissões com os filtros aplicados.
              </p>
              <Button onClick={resetFilters} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          safeSubmissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {submission.status === "PENDING" && (
                      <Checkbox
                        checked={selectedSubmissions.has(submission.id)}
                        onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        {submission.title}
                        <Badge variant="outline" className="text-xs">
                          #{submission.id.slice(-6)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Submetida {formatDistanceToNow(new Date(submission.createdAt), { 
                            addSuffix: true, 
                            locale: pt 
                          })}
                        </span>
                        {submission.reviewedAt && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            Revista {formatDistanceToNow(new Date(submission.reviewedAt), { 
                              addSuffix: true, 
                              locale: pt 
                            })}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(submission.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <UserHoverCard user={{
                    ...submission.submitter,
                    name: submission.submitter.name || "Utilizador",
                    image: submission.submitter.image || ""
                  }} />
                  {getRoleBadge(submission.submitter.role)}
                  {submission.submitter.currentModeration && submission.submitter.currentModeration.status !== 'ACTIVE' && (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {submission.submitter.currentModeration.status}
                    </Badge>
                  )}
                  <UserModerationDialog submission={submission} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {submission.type}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Guitar className="w-3 h-3" />
                    {submission.mainInstrument}
                  </Badge>
                  {submission.moment.map((m, momentIndex) => (
                    <Badge key={`${submission.id}-moment-${momentIndex}`} variant="outline" className="text-xs">
                      {m.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>

                {submission.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {submission.tags.slice(0, 5).map((tag, tagIndex) => (
                      <Badge key={`${submission.id}-tag-${tagIndex}`} variant="secondary" className="text-xs flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </Badge>
                    ))}
                    {submission.tags.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{submission.tags.length - 5} mais
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>

              {submission.status === "PENDING" && (
                <>
                  <Separator />
                  <CardFooter className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1 min-w-[120px]"
                    >
                      <Link href={`/admin/review/${submission.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar Detalhes
                      </Link>
                    </Button>
                    <Button
                      onClick={() => handleInstantApprove(submission.id)}
                      disabled={loadingActions[submission.id]}
                      size="sm"
                      className="flex-1 min-w-[140px]"
                    >
                      {loadingActions[submission.id] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Aprovação Rápida
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSubmissionToReject(submission.id);
                        setShowRejectDialog(true);
                      }}
                      disabled={loadingActions[submission.id]}
                      size="sm"
                      className="min-w-[100px]"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </CardFooter>
                </>
              )}

              {submission.status !== "PENDING" && (
                <CardFooter className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <Link href={`/admin/review/${submission.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialog de confirmação para rejeitar submissão */}
      <ConfirmationDialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setSubmissionToReject(null);
        }}
        onConfirm={handleReject}
        title={submissionToReject === "bulk" ? "Rejeitar Submissões Selecionadas" : "Rejeitar Submissão"}
        description={
          submissionToReject === "bulk" 
            ? "Tem a certeza que pretende rejeitar todas as submissões selecionadas? Forneça um motivo detalhado."
            : "Tem a certeza que pretende rejeitar esta submissão? Forneça um motivo detalhado para o utilizador."
        }
        confirmText="Rejeitar"
        cancelText="Cancelar"
        requireReason={true}
        reasonPlaceholder={
          submissionToReject === "bulk"
            ? "Explique o motivo da rejeição em lote (ex: critérios de qualidade não atendidos, etc.)..."
            : "Explique o motivo da rejeição (ex: qualidade do áudio, letra incorreta, etc.)..."
        }
        reasonLabel={submissionToReject === "bulk" ? "Motivo da Rejeição em Lote" : "Motivo da Rejeição"}
      />
    </div>
  );
}
