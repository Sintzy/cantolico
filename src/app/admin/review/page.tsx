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
  Info
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

  const fetchSubmissions = async (params?: { page?: number; q?: string; status?: string }) => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/submissions", window.location.origin);
      url.searchParams.set("page", String(params?.page ?? page));
      url.searchParams.set("limit", "20");
      if (params?.q !== undefined) url.searchParams.set("q", params.q);
      else if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      if (params?.status !== undefined) url.searchParams.set("status", params.status);
      else if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error("Erro ao carregar submissões");
      }
    } catch (error) {
      toast.error("Erro ao carregar submissões");
    } finally {
      setLoading(false);
    }
  };

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

  // Fetch on debounced search, page, or status change
  useEffect(() => {
    fetchSubmissions({ page, q: debouncedSearch, status: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, statusFilter]);

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revisão de Submissões</h1>
          <p className="text-muted-foreground">
            Gerir e revisar submissões de músicas dos utilizadores
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título, autor ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
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

        {/* Estatísticas */}
        {/* Paginação e estatísticas */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div className="grid gap-4 md:grid-cols-3 flex-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Página</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{page} / {totalPages}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Submissões nesta página</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissions.length}</div>
              </CardContent>
            </Card>
          </div>
          {/* Controles de paginação */}
          <div className="flex gap-2 items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de submissões paginada */}
      <div className="space-y-4">
        {safeSubmissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma submissão encontrada</p>
            </CardContent>
          </Card>
        ) : (
          safeSubmissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{submission.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Submetida {formatDistanceToNow(new Date(submission.createdAt), { 
                        addSuffix: true, 
                        locale: pt 
                      })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(submission.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
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
                  <Badge variant="outline">{submission.type}</Badge>
                  <Badge variant="outline">{submission.mainInstrument}</Badge>
                  {submission.moment.map((m, momentIndex) => (
                    <Badge key={`${submission.id}-moment-${momentIndex}`} variant="outline" className="text-xs">
                      {m.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>

                {submission.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {submission.tags.map((tag, tagIndex) => (
                      <Badge key={`${submission.id}-tag-${tagIndex}`} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>

              {submission.status === "PENDING" && (
                <>
                  <Separator />
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href={`/admin/review/${submission.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar
                      </Link>
                    </Button>
                    <Button
                      onClick={() => handleInstantApprove(submission.id)}
                      disabled={loadingActions[submission.id]}
                      size="sm"
                      className="flex-1"
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
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </CardFooter>
                </>
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
        title="Rejeitar Submissão"
        description="Tem a certeza que pretende rejeitar esta submissão? Forneça um motivo detalhado para o utilizador."
        confirmText="Rejeitar"
        cancelText="Cancelar"
        requireReason={true}
        reasonPlaceholder="Explique o motivo da rejeição (ex: qualidade do áudio, letra incorreta, etc.)..."
        reasonLabel="Motivo da Rejeição"
      />
    </div>
  );
}
