"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import UserHoverCard from "@/components/UserHoverCard";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Music,
  User,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Calendar,
  Tag
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
  submitter: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    image: string | null;
    createdAt: string;
  };
};

export default function AdminReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [instrumentFilter, setInstrumentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [submissionToReject, setSubmissionToReject] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [jumpToPage, setJumpToPage] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSubmissions = async (params?: { 
    page?: number; 
    q?: string; 
    status?: string;
    instrument?: string;
    dateFilter?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
  }) => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/submissions", window.location.origin);
      url.searchParams.set("page", String(params?.page ?? page));
      url.searchParams.set("limit", String(params?.limit ?? itemsPerPage));
      url.searchParams.set("sortBy", params?.sortBy ?? sortBy);
      url.searchParams.set("sortOrder", params?.sortOrder ?? sortOrder);
      
      if (params?.q !== undefined) url.searchParams.set("q", params.q);
      else if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      
      if (params?.status !== undefined && params.status !== "all") {
        url.searchParams.set("status", params.status);
      } else if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }

      if (params?.instrument !== undefined && params.instrument !== "all") {
        url.searchParams.set("instrument", params.instrument);
      } else if (instrumentFilter !== "all") {
        url.searchParams.set("instrument", instrumentFilter);
      }

      if (params?.dateFilter !== undefined && params.dateFilter !== "all") {
        url.searchParams.set("dateFilter", params.dateFilter);
      } else if (dateFilter !== "all") {
        url.searchParams.set("dateFilter", dateFilter);
      }
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const fetchedSubmissions = Array.isArray(data.submissions) ? data.submissions : [];
        setSubmissions(fetchedSubmissions);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || data.total || 0);
        
        // Atualizar estatísticas se disponíveis
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        console.error("Erro ao carregar submissões, status:", res.status);
        toast.error("Erro ao carregar submissões");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Erro ao carregar submissões");
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar estatísticas globais
  const fetchStats = async () => {
    try {
      const url = new URL("/api/admin/submissions", window.location.origin);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "1000"); // Buscar todas para calcular stats
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const allSubmissions = Array.isArray(data.submissions) ? data.submissions : [];
        
        const calculatedStats = {
          pending: allSubmissions.filter((s: Submission) => s.status === "PENDING").length,
          approved: allSubmissions.filter((s: Submission) => s.status === "APPROVED").length,
          rejected: allSubmissions.filter((s: Submission) => s.status === "REJECTED").length,
          total: allSubmissions.length
        };
        
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  // Buscar estatísticas ao carregar a página
  useEffect(() => {
    fetchStats();
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch when filters change
  useEffect(() => {
    fetchSubmissions({
      page,
      q: debouncedSearch,
      status: statusFilter,
      instrument: instrumentFilter,
      dateFilter: dateFilter,
      sortBy: sortBy,
      sortOrder: sortOrder,
      limit: itemsPerPage
    });
  }, [debouncedSearch, page, statusFilter, instrumentFilter, dateFilter, sortBy, sortOrder, itemsPerPage]);

  const handleApprove = async (submissionId: string) => {
    setLoadingActions(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/approve`, {
        method: "POST",
      });
      
      if (res.ok) {
        toast.success("Submissão aprovada com sucesso!");
        fetchSubmissions();
        fetchStats();
      } else {
        toast.error("Erro ao aprovar submissão");
      }
    } catch (error) {
      toast.error("Erro ao aprovar submissão");
    } finally {
      setLoadingActions(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!submissionToReject) return;
    
    try {
      const res = await fetch(`/api/admin/submission/${submissionToReject}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      });

      if (res.ok) {
        toast.success("Submissão rejeitada com sucesso");
        fetchSubmissions();
        fetchStats();
        setShowRejectDialog(false);
        setSubmissionToReject(null);
      } else {
        toast.error("Erro ao rejeitar submissão");
      }
    } catch (error) {
      toast.error("Erro ao rejeitar submissão");
    }
  };

  const openRejectDialog = (submissionId: string) => {
    setSubmissionToReject(submissionId);
    setShowRejectDialog(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setInstrumentFilter("all");
    setDateFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const goToPage = (pageNumber: number) => {
    setPage(Math.max(1, Math.min(totalPages, pageNumber)));
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setJumpToPage("");
    }
  };

  const handleJumpInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rever Submissões</h1>
          <p className="text-muted-foreground">Gerir e rever submissões de músicas</p>
        </div>
        <Button onClick={() => { fetchSubmissions(); fetchStats(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Submissões totais
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.pending / stats.total) * 100).toFixed(1)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.approved / stats.total) * 100).toFixed(1)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.rejected / stats.total) * 100).toFixed(1)}%` : '0%'} do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar submissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="APPROVED">Aprovada</SelectItem>
              <SelectItem value="REJECTED">Rejeitada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={instrumentFilter} onValueChange={(value) => { setInstrumentFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Instrumento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos instrumentos</SelectItem>
              <SelectItem value="Violão">Violão</SelectItem>
              <SelectItem value="Piano">Piano</SelectItem>
              <SelectItem value="Guitarra">Guitarra</SelectItem>
              <SelectItem value="Órgão">Órgão</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(value) => { setDateFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as datas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Data de criação</SelectItem>
              <SelectItem value="title">Título</SelectItem>
              <SelectItem value="submitter.name">Autor</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => { setSortOrder(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Ordem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">
                <div className="flex items-center">
                  <ArrowDown className="w-4 h-4 mr-2" />
                  Decrescente
                </div>
              </SelectItem>
              <SelectItem value="asc">
                <div className="flex items-center">
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Crescente
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Mostrando {submissions.length === 0 ? 0 : ((page - 1) * itemsPerPage) + 1} a {Math.min(page * itemsPerPage, totalItems)} de {totalItems} submissões
          </span>
          <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>A carregar submissões...</span>
        </div>
      )}

      {/* Submissions Grid */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{submission.title}</CardTitle>
                  {getStatusBadge(submission.status)}
                </div>
                <CardDescription>
                  {formatDistanceToNow(new Date(submission.createdAt), { 
                    addSuffix: true, 
                    locale: pt 
                  })}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{submission.mainInstrument}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {submission.submitter.name || submission.submitter.email}
                  </span>
                </div>

                {submission.tags && submission.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {submission.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {submission.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{submission.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex gap-2">
                <Link href={`/admin/review/${submission.id}`} passHref>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    Rever
                  </Button>
                </Link>
                
                {submission.status === "PENDING" && (
                  <>
                    <Button 
                      onClick={() => handleApprove(submission.id)}
                      disabled={loadingActions[submission.id]}
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loadingActions[submission.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button 
                      onClick={() => openRejectDialog(submission.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && submissions.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma submissão encontrada</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "Tente ajustar os filtros de pesquisa"
              : "Não há submissões para rever no momento"
            }
          </p>
        </div>
      )}

      {/* Enhanced Pagination */}
      {!loading && totalPages > 0 && (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-muted/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">
            {submissions.length === 0 ? (
              "Nenhuma submissão encontrada"
            ) : (
              <>
                Mostrando <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> a{" "}
                <span className="font-medium">{Math.min(page * itemsPerPage, totalItems)}</span> de{" "}
                <span className="font-medium">{totalItems}</span> submissões
              </>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Jump to page */}
              <div className="flex items-center gap-2 text-sm">
                <span>Ir para página:</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpToPage}
                  onChange={(e) => setJumpToPage(e.target.value)}
                  onKeyPress={handleJumpInputKeyPress}
                  className="w-16 h-8 text-center"
                  placeholder={String(page)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleJumpToPage}
                  disabled={!jumpToPage || isNaN(parseInt(jumpToPage))}
                >
                  Ir
                </Button>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={page === 1}
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  {/* Show page numbers with smart logic */}
                  {(() => {
                    const getPageNumbers = () => {
                      const delta = 2;
                      const range = [];
                      const rangeWithDots = [];

                      for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
                        range.push(i);
                      }

                      if (page - delta > 2) {
                        rangeWithDots.push(1, '...');
                      } else {
                        rangeWithDots.push(1);
                      }

                      rangeWithDots.push(...range);

                      if (page + delta < totalPages - 1) {
                        rangeWithDots.push('...', totalPages);
                      } else if (totalPages > 1) {
                        rangeWithDots.push(totalPages);
                      }

                      return rangeWithDots;
                    };

                    return getPageNumbers().map((pageNum, index) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(Number(pageNum))}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    });
                  })()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={page === totalPages}
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Dialog */}
      <ConfirmationDialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setSubmissionToReject(null);
        }}
        onConfirm={handleReject}
        title="Rejeitar Submissão"
        description="Tem a certeza que pretende rejeitar esta submissão? Forneça um motivo para o utilizador."
        confirmText="Rejeitar"
        cancelText="Cancelar"
        requireReason={true}
        reasonPlaceholder="Explique o motivo da rejeição..."
        reasonLabel="Motivo da Rejeição"
      />
    </div>
  );
}