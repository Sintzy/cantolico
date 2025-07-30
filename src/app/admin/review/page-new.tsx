"use client";

import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import UserHoverCard from "@/components/UserHoverCard";
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
  Loader2
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
  };
};

export default function AdminReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/submissions");
      if (res.ok) {
        const data: Submission[] = await res.json();
        setSubmissions(data);
        setFilteredSubmissions(data);
      } else {
        toast.error("Erro ao carregar submissões");
      }
    } catch (error) {
      toast.error("Erro ao carregar submissões");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let filtered = submissions;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (submission) =>
          submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.submitter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.submitter.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((submission) => submission.status === statusFilter);
    }

    setFilteredSubmissions(filtered);
  }, [searchTerm, statusFilter, submissions]);

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

  const handleReject = async (submissionId: string) => {
    const reason = prompt("Motivo da rejeição (opcional):");
    
    setLoadingActions(prev => ({ ...prev, [submissionId]: true }));
    
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Não especificado" }),
      });

      if (res.ok) {
        toast.success("Submissão rejeitada");
        fetchSubmissions();
      } else {
        toast.error("Erro ao rejeitar submissão");
      }
    } catch (error) {
      toast.error("Erro ao rejeitar submissão");
    } finally {
      setLoadingActions(prev => ({ ...prev, [submissionId]: false }));
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.status === "PENDING").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.status === "APPROVED").length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de submissões */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma submissão encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredSubmissions.map((submission) => (
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{submission.type}</Badge>
                  <Badge variant="outline">{submission.mainInstrument}</Badge>
                  {submission.moment.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {m.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>

                {submission.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {submission.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
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
                      onClick={() => handleReject(submission.id)}
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
    </div>
  );
}
