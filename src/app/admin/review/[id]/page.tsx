"use client";

import "easymde/dist/easymde.min.css";
import { useEffect, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
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
  Music,
  FileText,
  Settings,
  Shield,
  Eye,
  Download
} from "lucide-react";
import "../../../../../public/styles/chords.css";

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
  "INTRODUCAO_DA_PALAVRA", "LOUVOR", "PAI_NOSSO", "REFLEXAO", "TERCO_MISTERIO",
];

export default function ReviewSubmissionPage() {
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
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [mp3PreviewUrl, setMp3PreviewUrl] = useState<string | null>(null);
  const [newPdf, setNewPdf] = useState<File | null>(null);
  const [newMp3, setNewMp3] = useState<File | null>(null);
  const [instrument, setInstrument] = useState("ORGAO");
  const [moments, setMoments] = useState<string[]>([]);
  const [tags, setTags] = useState<string>("");

  // Estados para modais de ações
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationNote, setModerationNote] = useState("");
  const [banDuration, setBanDuration] = useState("7");

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
        setMarkdown(data.tempText || "");
        setSpotifyLink(data.spotifyLink || "");
        setYoutubeLink(data.youtubeLink || "");
        setPdfPreviewUrl(data.tempPdfUrl || null);
        setMp3PreviewUrl(data.mediaUrl || null);
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

  const handleApprove = async () => {
    // Validações
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    
    if (!markdown.trim()) {
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
    formData.append("markdown", markdown);
    formData.append("spotifyLink", spotifyLink);
    formData.append("youtubeLink", youtubeLink);
    formData.append("instrument", instrument);
    formData.append("moments", JSON.stringify(moments));
    formData.append("tags", tags);
    if (newPdf) formData.append("pdf", newPdf);
    if (newMp3) formData.append("mp3", newMp3);

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

  // Loading ou não autorizado
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="large" />
          <p className="text-gray-600">A carregar submissão...</p>
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
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rever Submissão</h1>
              <p className="text-gray-600 mt-1">ID: {submissionId}</p>
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
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-gray-900">{submission.submitter?.name || "Nome não disponível"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-gray-900">{submission.submitter?.email || "Email não disponível"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Cargo</Label>
                <Badge variant="outline">{submission.submitter?.role || "USER"}</Badge>
              </div>
            </div>
            
            {/* Ações de Moderação */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
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
            </div>
          </CardContent>
        </Card>

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
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome da música..."
                    className="bg-white"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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

            {/* Editor e Preview lado a lado */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Editor de Letra e Acordes</CardTitle>
                    <ChordGuideButton />
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
                      options={{
                        spellChecker: false,
                        placeholder: "Escreva a letra da música com acordes...",
                        toolbar: ["bold", "italic", "|", "unordered-list", "ordered-list", "|", "preview", "guide"],
                      }}
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
          </TabsContent>

          <TabsContent value="preview">
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
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* PDF Section */}
            <Card>
              <CardHeader>
                <CardTitle>Partitura (PDF)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pdfPreviewUrl && (
                  <div>
                    <Label>Preview PDF Atual</Label>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe 
                        src={pdfPreviewUrl} 
                        className="w-full h-[500px]" 
                        title="Preview PDF"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(pdfPreviewUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descarregar PDF
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setPdfPreviewUrl(null)}
                      >
                        Remover PDF
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Substituir PDF (opcional)</Label>
                  <Input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setNewPdf(e.target.files?.[0] || null)}
                    className="bg-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* MP3 Section */}
            <Card>
              <CardHeader>
                <CardTitle>Áudio (MP3)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mp3PreviewUrl && (
                  <div>
                    <Label>Preview Áudio Atual</Label>
                    <div className="bg-white border rounded-lg p-4">
                      <audio controls className="w-full">
                        <source src={mp3PreviewUrl} type="audio/mpeg" />
                        O seu browser não suporta áudio.
                      </audio>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="mt-2"
                      onClick={() => setMp3PreviewUrl(null)}
                    >
                      Remover MP3
                    </Button>
                  </div>
                )}

                <div>
                  <Label>Substituir MP3 (opcional)</Label>
                  <Input 
                    type="file" 
                    accept="audio/mpeg" 
                    onChange={(e) => setNewMp3(e.target.files?.[0] || null)}
                    className="bg-white"
                  />
                </div>
              </CardContent>
            </Card>
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
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Aprovar Música
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => setShowRejectDialog(true)}
                className="flex-1"
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