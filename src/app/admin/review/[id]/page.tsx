"use client";

import "easymde/dist/easymde.min.css";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
import { 
  processChordHtml, 
  detectChordFormat, 
  processChords,
  processMixedChords,
  processSimpleInline,
  ChordFormat 
} from "@/lib/chord-processor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner, type SpinnerProps } from "@/components/ui/shadcn-io/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ChordGuideButton } from "@/components/ChordGuidePopup";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Ban, 
  User, 
  Calendar, 
  Clock,
  Music,
  FileText,
  Settings,
  Shield,
  Eye,
  Download,
  Search as SearchIcon
} from "lucide-react";
import "../../../../../public/styles/chords.css";
import { FileManager } from '@/components/FileManager';
import { SubmissionFileViewer } from '@/components/SubmissionFileViewer';
import { FileType, FileUploadData } from '@/types/song-files';

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });

// Função para gerar preview do markdown com background branco
const generatePreview = (markdownText: string): string => {
  if (!markdownText) return '';
  
  const originalFormat = detectChordFormat(markdownText);
  let processedHtml: string;
  let wrapperClass: string;
  
  if (originalFormat === 'inline') {
    if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdownText)) {
      processedHtml = processMixedChords(markdownText);
      wrapperClass = 'chord-container-inline';
    } else {
      processedHtml = processSimpleInline(markdownText);
      wrapperClass = 'chord-container-inline';
    }
  } else {
    processedHtml = processChords(markdownText, 'above');
    wrapperClass = 'chord-container-above';
  }
  
  return `<div class="${wrapperClass}" style="color: #000; background: #fff;">${processedHtml}</div>`;
};

const allInstruments = ["ORGAO", "GUITARRA", "PIANO", "CORO", "OUTRO"];
const allMoments = [
  "ENTRADA", "ATO_PENITENCIAL", "GLORIA", "SALMO", "ACLAMACAO", "OFERTORIO",
  "SANTO", "COMUNHAO", "ACAO_DE_GRACAS", "FINAL", "ADORACAO", "ASPERSAO",
  "BAPTISMO", "BENCAO_DAS_ALIANCAS", "CORDEIRO_DE_DEUS", "CRISMA",
  "INTRODUCAO_DA_PALAVRA", "LOUVOR", "PAI_NOSSO", "REFLEXAO", "TERCO_MISTERIO", "OUTROS",
];

export default function ReviewSubmissionPage() {
  // O objeto options precisa ser estável para evitar perder o foco no SimpleMDE
  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: "Escreva a letra da música com acordes...",
    toolbar: [
      "bold",
      "italic",
      "|",
      "unordered-list",
      "ordered-list",
      "|",
      "preview",
      "guide"
    ] as const,
  }), []);
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const submissionId = params.id as string;

  // Estados para proteção e dados
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  
  // Estados do formulário
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [newPdf, setNewPdf] = useState<File | null>(null);
  const [newMp3, setNewMp3] = useState<File | null>(null);
  const [instrument, setInstrument] = useState("ORGAO");
  const [moments, setMoments] = useState<string[]>([]);
  const [tags, setTags] = useState<string>("");
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});

  // Estados para modais de ações
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showModerationHistory, setShowModerationHistory] = useState(false);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationNote, setModerationNote] = useState("");
  const [banDuration, setBanDuration] = useState("7");

  // Helper function para calcular duração
  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Verificação de autorização
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = session.user?.role;
    if (userRole !== "ADMIN" && userRole !== "REVIEWER") {
      toast.error("Acesso negado. Apenas administradores e revisores podem aceder a esta página.");
      router.push("/");
      return;
    }

    setAuthorized(true);
  }, [session, status, router]);

  // Atualiza o preview quando o markdown muda
  useEffect(() => {
    setPreview(generatePreview(markdown));
  }, [markdown]);

  // Carregar dados da submissão
  useEffect(() => {
    if (!submissionId || !authorized) return;

    fetch(`/api/admin/submission/${submissionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) {
          toast.error("Submissão não encontrada");
          router.push("/admin/review");
          return;
        }
        
        setSubmission(data);
        setTitle(data.title || "");
        setAuthor(data.author || "");
        setMarkdown(data.tempText || "");
        setSpotifyLink(data.spotifyLink || "");
        setYoutubeLink(data.youtubeLink || "");
        setInstrument(data.mainInstrument || "ORGAO");
        setMoments(data.moment || []);
        setTags((data.tags || []).join(", "));
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao carregar submissão:", error);
        toast.error("Erro ao carregar submissão");
        router.push("/admin/review");
      });
  }, [submissionId, authorized, router]);

  const [approving, setApproving] = useState(false);

  const handleFileDescriptionChange = (fileId: string, description: string) => {
    setFileDescriptions(prev => ({
      ...prev,
      [fileId]: description
    }));
  };

  const handleApprove = async () => {
    // Validações
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    
    // Para ACORDES, a letra é obrigatória. Para PARTITURA, não precisa.
    if (submission?.type === "ACORDES" && !markdown.trim()) {
      toast.error("Letra da música é obrigatória");
      return;
    }
    
    if (!instrument) {
      toast.error("Instrumento principal é obrigatório");
      return;
    }
    
    if (moments.length === 0) {
      toast.error("Pelo menos um momento litúrgico deve ser selecionado");
      return;
    }
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    // Apenas adicionar markdown se for ACORDES (para PARTITURA não é necessário)
    if (submission?.type === "ACORDES") {
      formData.append("markdown", markdown);
    }
    formData.append("spotifyLink", spotifyLink);
    formData.append("youtubeLink", youtubeLink);
    formData.append("instrument", instrument);
    formData.append("moments", JSON.stringify(moments));
    formData.append("tags", `{${tags}}`);
    formData.append("fileDescriptions", JSON.stringify(fileDescriptions));
    if (newPdf) formData.append("pdf", newPdf);
    if (newMp3) formData.append("mp3", newMp3);

    setApproving(true);
    try {
      const res = await fetch(`/api/admin/submission/${submissionId}/approve`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Submissão aprovada com sucesso!");
        router.push("/admin/review");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erro ao aprovar submissão");
      }
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro de conexão ao aprovar submissão");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Motivo da rejeição é obrigatório");
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/submission/${submissionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro interno do servidor');
      }

      toast.success("Submissão rejeitada com sucesso");
      router.push("/admin/review");
    } catch (error) {
      console.error("Erro ao rejeitar submissão:", error);
      toast.error(`Erro ao rejeitar: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
      throw error; // Para que o dialog possa lidar com o erro
    }
  };

  const toggleMoment = (moment: string) => {
    setMoments((prev) =>
      prev.includes(moment) ? prev.filter((m) => m !== moment) : [...prev, moment]
    );
  };

  const handleWarnUser = async () => {
    if (!moderationReason.trim()) {
      toast.error("Motivo da advertência é obrigatório");
      return;
    }

    console.log('Sending moderation data:', {
      action: "WARN",
      reason: moderationReason,
      moderatorNote: moderationNote,
    });

    try {
      const response = await fetch(`/api/admin/users/${submission.submitterId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "WARN",
          reason: moderationReason,
          moderatorNote: moderationNote,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro interno do servidor');
      }

      toast.success("Utilizador advertido com sucesso");
      setShowWarnDialog(false);
      setModerationReason("");
      setModerationNote("");
    } catch (error) {
      console.error("Erro ao advertir utilizador:", error);
      toast.error(`Erro ao advertir: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    }
  };

  const handleBanUser = async () => {
    if (!moderationReason.trim()) {
      toast.error("Motivo do banimento é obrigatório");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${submission.submitterId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BAN",
          reason: moderationReason,
          moderatorNote: moderationNote,
          duration: parseInt(banDuration),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro interno do servidor');
      }

      toast.success("Utilizador banido com sucesso");
      setShowBanDialog(false);
      setModerationReason("");
      setModerationNote("");
      setBanDuration("7");
    } catch (error) {
      console.error("Erro ao banir utilizador:", error);
      toast.error(`Erro ao banir: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    }
  };

  const fetchModerationHistory = async () => {
    if (!submission?.submitterId) return;
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/users/${submission.submitterId}/moderation-history`);
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }
      
      const data = await response.json();
      setModerationHistory(data.history || []);
      setShowModerationHistory(true);
    } catch (error) {
      console.error("Erro ao buscar histórico de moderação:", error);
      toast.error("Erro ao carregar histórico de moderação");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Loading ou não autorizado
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner variant="circle" size={48} className="text-black" />
          <p className="text-gray-600"><span className="sr-only">A carregar submissão...</span><span aria-hidden data-nosnippet>A carregar submissão...</span></p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas administradores e revisores podem aceder a esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle>Submissão não encontrada</CardTitle>
            <CardDescription>
              A submissão que procura não existe ou foi removida.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rever Submissão</h1>
              <p className="text-gray-600 mt-1 text-sm">ID: {submissionId}</p>
            </div>
            <Badge variant={submission.status === "PENDING" ? "outline" : "secondary"}>
              {submission.status}
            </Badge>
          </div>
        </div>

        {/* Informações do Submissor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Submissor
            </CardTitle>
          </CardHeader>
          <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nome</Label>
                    <p className="text-gray-900 wrap-break-word">{submission.submitter?.name || "Nome não disponível"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-gray-900 break-all">{submission.submitter?.email || "Email não disponível"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Cargo</Label>
                    <Badge variant="outline">{submission.submitter?.role || "USER"}</Badge>
                  </div>
                </div>            {/* Ações de Moderação */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
              <Dialog open={showWarnDialog} onOpenChange={setShowWarnDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-600 hover:bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Advertir Utilizador
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Advertir Utilizador</DialogTitle>
                    <DialogDescription>
                      Esta ação irá enviar uma advertência ao utilizador. Explique o motivo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Motivo da Advertência</Label>
                      <Textarea
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Explique o motivo da advertência..."
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Nota do Moderador (opcional)</Label>
                      <Textarea
                        value={moderationNote}
                        onChange={(e) => setModerationNote(e.target.value)}
                        placeholder="Nota interna para outros moderadores..."
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowWarnDialog(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleWarnUser}>
                      Advertir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                    <Ban className="h-4 w-4 mr-2" />
                    Banir Utilizador
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Banir Utilizador</DialogTitle>
                    <DialogDescription>
                      Esta ação irá banir temporariamente o utilizador. Esta ação é reversível.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Motivo do Banimento</Label>
                      <Textarea
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Explique o motivo do banimento..."
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Duração (dias)</Label>
                      <Select value={banDuration} onValueChange={setBanDuration}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 dia</SelectItem>
                          <SelectItem value="3">3 dias</SelectItem>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="14">14 dias</SelectItem>
                          <SelectItem value="30">30 dias</SelectItem>
                          <SelectItem value="90">90 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nota do Moderador (opcional)</Label>
                      <Textarea
                        value={moderationNote}
                        onChange={(e) => setModerationNote(e.target.value)}
                        placeholder="Nota interna para outros moderadores..."
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBanDialog(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleBanUser}>
                      Banir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Botão para ver histórico de moderação */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchModerationHistory}
                disabled={loadingHistory}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {loadingHistory ? (
                  <Spinner variant="circle" size={16} className="text-blue-600 mr-2" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Histórico de Moderação
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Histórico de Moderação */}
        <Dialog open={showModerationHistory} onOpenChange={setShowModerationHistory}>
          <DialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Moderação - {submission?.submitter?.name}
              </DialogTitle>
              <DialogDescription>
                Todas as ações de moderação aplicadas a este utilizador
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {moderationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">Nenhuma moderação encontrada</p>
                  <p className="text-gray-500 text-sm">Este utilizador não possui histórico de moderações</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {moderationHistory.map((entry, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                entry.type === 'WARNING' ? 'default' : 
                                entry.type === 'SUSPENSION' ? 'secondary' : 
                                'destructive'
                              }
                            >
                              {entry.type === 'WARNING' ? 'Advertência' : 
                               entry.type === 'SUSPENSION' ? 'Suspensão' : 
                               'Banimento'}
                            </Badge>
                            {entry.expiresAt && (
                              <Badge variant="outline">
                                {(() => {
                                  const days = calculateDuration(entry.moderatedAt, entry.expiresAt);
                                  return `${days} dia${days > 1 ? 's' : ''}`;
                                })()}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(entry.moderatedAt).toLocaleString('pt-PT')}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Motivo:</Label>
                            <p className="text-sm text-gray-900 mt-1">{entry.reason}</p>
                          </div>
                          
                          {entry.moderatorNote && (
                            <div>
                              <Label className="text-sm font-medium text-gray-600">Nota do Moderador:</Label>
                              <p className="text-sm text-gray-700 mt-1 italic">{entry.moderatorNote}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
                            <span>
                              <User className="h-4 w-4 inline mr-1" />
                              Moderador: {entry.moderatedBy?.name || 'Sistema'}
                            </span>
                            {entry.expiresAt && (
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Expira: {new Date(entry.expiresAt).toLocaleString('pt-PT')}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModerationHistory(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conteúdo Principal */}
        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Mídia
              {submission?.filesMetadata?.files?.length > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                  📎 {submission.filesMetadata.files.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">Título</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nome da música..."
                      className="bg-white flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">Autor (opcional)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Nome do autor/compositor..."
                      className="bg-white flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se souber quem compôs esta música, pode adicionar o nome aqui
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Instrumento Principal</Label>
                    <Select value={instrument} onValueChange={setInstrument}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Escolher instrumento" />
                      </SelectTrigger>
                      <SelectContent>
                        {allInstruments.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tradicional, alegre, contemplativa..."
                      className="bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label>Momentos Litúrgicos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allMoments.map((moment) => (
                      <button
                        key={moment}
                        type="button"
                        className={`px-3 py-1 rounded-full border text-sm transition-colors duration-200 ${
                          moments.includes(moment)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                        onClick={() => toggleMoment(moment)}
                      >
                        {moment.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Spotify Link</Label>
                    <Input
                      value={spotifyLink}
                      onChange={(e) => setSpotifyLink(e.target.value)}
                      placeholder="https://open.spotify.com/..."
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label>YouTube Link</Label>
                    <Input
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="https://www.youtube.com/..."
                      className="bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor e Preview lado a lado - Apenas para ACORDES */}
            {submission?.type === "ACORDES" ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 justify-between w-full">
                      <CardTitle>Editor de Letra e Acordes</CardTitle>
                      <div className="flex items-center gap-2">
                        <ChordGuideButton />
                        {title && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100"
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(title)}`, '_blank')}
                            title="Pesquisar no Google"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" style={{marginRight: 4}}><g><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C33.962 32.833 29.418 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.803 0 5.377.99 7.409 2.627l6.162-6.162C34.583 6.162 29.583 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c9.941 0 18-8.059 18-18 0-1.209-.13-2.385-.389-3.517z"/><path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c2.803 0 5.377.99 7.409 2.627l6.162-6.162C34.583 6.162 29.583 4 24 4c-7.732 0-14.41 4.388-17.694 10.691z"/><path fill="#FBBC05" d="M24 44c5.363 0 10.29-1.843 14.143-4.995l-6.518-5.348C29.418 36 24 36 24 36c-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44z"/><path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.273-4.418 5.917-11.303 5.917-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44c5.363 0 10.29-1.843 14.143-4.995l-6.518-5.348C29.418 36 24 36 24 36c-5.408 0-9.947-3.155-11.293-7.417l-6.563 5.062C9.568 39.612 16.246 44 24 44c9.941 0 18-8.059 18-18 0-1.209-.13-2.385-.389-3.517z"/></g></svg>
                            Google
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Edite a letra da música com acordes usando markdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-blue-900">Formatos de acordes suportados:</h4>
                    <ul className="text-xs space-y-1 text-blue-800">
                      <li><strong>Inline:</strong> <code>#mic#</code> seguido de <code>[C]Deus est[Am]á aqui</code></li>
                      <li><strong>Acima da letra:</strong> <code>[C] [Am] [F]</code> numa linha e <code>Deus está aqui</code> na seguinte</li>
                      <li><strong>Intro/Ponte:</strong> <code>Intro:</code> seguido de <code>[A] [G] [C]</code> na linha seguinte</li>
                      <li><strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música!</li>
                    </ul>
                  </div>
                  <div className="mb-2 p-2 bg-gray-50 border rounded-md text-xs">
                    <strong>Formato detectado:</strong> {detectChordFormat(markdown)}
                    {detectChordFormat(markdown) === 'inline' && markdown.includes('#mic#') && (
                      <span className="ml-2 text-green-600">✓ Tag #mic# encontrada</span>
                    )}
                    {/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdown) && (
                      <span className="ml-2 text-blue-600">✓ Seções de intro/ponte detectadas</span>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <SimpleMDE
                      value={markdown}
                      onChange={setMarkdown}
                      options={simpleMDEOptions}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Preview da Música</CardTitle>
                  <CardDescription>
                    Visualização de como a música será apresentada aos utilizadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">{title || "Título da Música"}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {moments.map(moment => (
                          <Badge key={moment} variant="outline">
                            {moment.replaceAll("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div
                      className="prose max-w-none font-mono text-sm leading-relaxed"
                      style={{ 
                        lineHeight: '1.8',
                        color: '#000',
                        background: '#fff'
                      }}
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            ) : (
            /* Para PARTITURA - apenas mostrar a aba de mídia */
            <Card>
              <CardHeader>
                <CardTitle>Tipo: Partitura</CardTitle>
                <CardDescription>
                  Esta música é do tipo Partitura. Os ficheiros PDFs devem ser configurados na aba "Mídia".
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Configure a partitura principal e os ficheiros adicionais na aba "Mídia" abaixo.
                </p>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="preview">
            {submission?.type === "ACORDES" ? (
            <Card>
              <CardHeader>
                <CardTitle>Preview da Música</CardTitle>
                <CardDescription>
                  Visualização de como a música será apresentada aos utilizadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{title || "Título da Música"}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {moments.map(moment => (
                        <Badge key={moment} variant="outline">
                          {moment.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div
                    className="prose max-w-none font-mono text-sm leading-relaxed"
                    style={{ 
                      lineHeight: '1.8',
                      color: '#000',
                      background: '#fff'
                    }}
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                </div>
              </CardContent>
            </Card>
            ) : (
            <Card>
              <CardHeader>
                <CardTitle>Tipo: Partitura</CardTitle>
                <CardDescription>
                  Para partituras, o preview mostra a partitura PDF principal.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  A partitura será exibida na aba "Mídia"
                </p>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* Novo Sistema de Visualização de Ficheiros da Submissão */}
            <SubmissionFileViewer 
              submissionId={submissionId}
              onDescriptionChange={handleFileDescriptionChange}
            />

            <Separator className="my-6" />
          </TabsContent>
        </Tabs>

        {/* Ações Finais */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleApprove} 
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                size="lg"
                disabled={approving}
              >
                {approving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Aprovar Música
                  </>
                )}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => setShowRejectDialog(true)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Rejeitar Música
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Rejeição */}
        <ConfirmationDialog
          isOpen={showRejectDialog}
          onClose={() => setShowRejectDialog(false)}
          onConfirm={handleReject}
          title="Rejeitar Música"
          description="Tem a certeza que pretende rejeitar esta submissão? Forneça um motivo para o utilizador."
          confirmText="Rejeitar"
          cancelText="Cancelar"
          requireReason={true}
          reasonPlaceholder="Explique o motivo da rejeição..."
          reasonLabel="Motivo da Rejeição"
        />
      </div>
    </div>
  );
}