"use client";

import "easymde/dist/easymde.min.css";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ChordGuideButton } from "@/components/ChordGuidePopup";
import "../../../../../public/styles/chords.css";
import { SpellCheck } from "lucide-react";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });
const mdParser = new MarkdownIt({ breaks: true }).use(chords);

// Função avançada para gerar preview com suporte completo a todos os formatos
const generatePreview = (markdownText: string): string => {
  if (!markdownText) return '';
  
  // Detecta o formato original
  const originalFormat = detectChordFormat(markdownText);
  
  // Debug temporário
  console.log('🔍 Debug formato no review:', {
    text: markdownText.slice(0, 100) + '...',
    format: originalFormat,
    hasIntro: /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdownText),
    hasMic: markdownText.includes('#mic#')
  });
  
  let processedHtml: string;
  let wrapperClass: string;
  
  if (originalFormat === 'inline') {
    // Verifica se tem seções de intro/ponte junto com inline (formato misto)
    if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdownText)) {
      // Formato misto: processa tudo usando processMixedChords
      console.log('📝 Processando formato misto no review');
      processedHtml = processMixedChords(markdownText);
      wrapperClass = 'chord-container-inline';
    } else {
      // Formato inline puro - usa processamento simples
      console.log('📝 Processando formato inline puro no review');
      processedHtml = processSimpleInline(markdownText);
      wrapperClass = 'chord-container-inline';
    }
  } else {
    // Formato above (acordes acima da letra)
    console.log('📝 Processando formato above no review');
    processedHtml = processChords(markdownText, 'above');
    wrapperClass = 'chord-container-above';
  }
  
  return `<div class="${wrapperClass}">${processedHtml}</div>`;
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
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
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
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Atualiza o preview quando o markdown muda
  useEffect(() => {
    setPreview(generatePreview(markdown));
  }, [markdown]);

  useEffect(() => {
    if (!submissionId) return;

    fetch(`/api/admin/submission/${submissionId}`)
      .then((res) => res.json())
      .then((data) => {
        setSubmission(data);
        setTitle(data.title || "");
        setMarkdown(data.tempText || "");
        setSpotifyLink(data.spotifyLink || "");
        setYoutubeLink(data.youtubeLink || "");
        setPdfPreviewUrl(data.tempPdfUrl || null);
        setMp3PreviewUrl(data.mediaUrl || null);
        setInstrument(data.mainInstrument || "ORGAO");
        setMoments(data.moment || []);  // Changed from 'moments' to 'moment' to match schema
        setTags((data.tags || []).join(", "));
        setLoading(false);
      });
  }, [submissionId]);

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

  if (loading) return <div className="p-6 text-center"><Spinner size="medium"/>A carregar submissão...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Rever Submissão</h1>

      <div>
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Editor Markdown</Label>
            <ChordGuideButton />
          </div>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm mb-2">Formatos de acordes suportados:</h4>
            <ul className="text-xs space-y-1">
              <li><strong>Inline:</strong> <code>#mic#</code> seguido de <code>[C]Deus est[Am]á aqui</code></li>
              <li><strong>Acima da letra:</strong> <code>[C] [Am] [F]</code> numa linha e <code>Deus está aqui</code> na seguinte</li>
              <li><strong>Intro/Ponte:</strong> <code>Intro:</code> seguido de <code>[A] [G] [C]</code> na linha seguinte</li>
              <li><strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música!</li>
            </ul>
          </div>
          <SimpleMDE value={markdown} onChange={setMarkdown} />
        </div>
        <div>
          <Label>Preview</Label>
          <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border text-xs">
            <strong>Formato detectado:</strong> {detectChordFormat(markdown)}
            {detectChordFormat(markdown) === 'inline' && markdown.includes('#mic#') && (
              <span className="ml-2 text-green-600">✓ Tag #mic# encontrada</span>
            )}
            {/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(markdown) && (
              <span className="ml-2 text-blue-600">✓ Seções de intro/ponte detectadas</span>
            )}
          </div>
          <div
            className="prose border rounded-md p-4 bg-white dark:bg-neutral-900 overflow-auto max-h-[500px] font-mono text-sm"
            style={{ lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>

      {pdfPreviewUrl && (
        <div>
          <Label>Preview PDF</Label>
          <iframe src={pdfPreviewUrl} className="w-full h-[500px] border rounded" />
          <Button variant="destructive" className="mt-2" onClick={() => setPdfPreviewUrl(null)}>
            Remover PDF
          </Button>
        </div>
      )}

      <div>
        <Label>Upload novo PDF (opcional)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setNewPdf(e.target.files?.[0] || null)} />
      </div>

      {mp3PreviewUrl && (
        <div>
          <Label>Preview MP3</Label>
          <audio controls className="w-full mt-2">
            <source src={mp3PreviewUrl} type="audio/mpeg" />
            O seu browser não suporta áudio.
          </audio>
          <Button variant="destructive" className="mt-2" onClick={() => setMp3PreviewUrl(null)}>
            Remover MP3
          </Button>
        </div>
      )}

      <div>
        <Label>Upload novo MP3 (opcional)</Label>
        <Input type="file" accept="audio/mpeg" onChange={(e) => setNewMp3(e.target.files?.[0] || null)} />
      </div>

      <div>
        <Label>Instrumento Principal</Label>
        <Select value={instrument} onValueChange={setInstrument}>
          <SelectTrigger className="w-full">
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
        <Label>Momentos Litúrgicos</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {allMoments.map((moment) => (
            <button
              key={moment}
              type="button"
              className={`px-3 py-1 rounded-full border text-sm transition-colors duration-200 ${
                moments.includes(moment)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
              onClick={() => toggleMoment(moment)}
            >
              {moment.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Tags (separadas por vírgula)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div>
        <Label>Spotify Link</Label>
        <Input value={spotifyLink} onChange={(e) => setSpotifyLink(e.target.value)} />
      </div>

      <div>
        <Label>YouTube Link</Label>
        <Input value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} />
      </div>

      <div className="flex gap-4 pt-6">
        <Button onClick={handleApprove} className="bg-green-600 text-white">Aprovar Música</Button>
        <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>Rejeitar Música</Button>
      </div>

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
  );
}