"use client";

import "easymde/dist/easymde.min.css";
import "../../../../public/styles/chords.css";
import { v4 as randomUUID } from "uuid";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TurnstileCaptcha } from "@/components/TurnstileCaptcha";

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
import { ChordGuideButton } from "@/components/ChordGuidePopup";

import { Instrument, LiturgicalMoment, SongType } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Music, FileText, Upload, Youtube } from "lucide-react";
import { FaSpotify } from "react-icons/fa";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });
const mdParser = new MarkdownIt({ breaks: true }).use(chords);

export default function CreateNewMusicPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const editorRef = useRef<any>(null);

  const [form, setForm] = useState({
    id: randomUUID(),
    title: "",
    moments: [] as LiturgicalMoment[],
    tags: [] as string[],
    tagsInput: "",
    type: "" as SongType,
    instrument: "" as Instrument,
    markdown: "",
    pdfFile: null as File | null,
    mp3File: null as File | null,
    youtubeLink: "",
    spotifyLink: "",
  });

  const [preview, setPreview] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualiza o preview quando o texto muda
  useEffect(() => {
    if (!form.markdown) {
      setPreview('');
      return;
    }
    
    // Detecta o formato original
    const originalFormat = detectChordFormat(form.markdown);
    
    // Debug temporário
    console.log('🔍 Debug formato:', {
      text: form.markdown,
      format: originalFormat,
      hasIntro: /^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(form.markdown),
      hasMic: form.markdown.includes('#mic#')
    });
    
    let processedHtml: string;
    let wrapperClass: string;
    
    if (originalFormat === 'inline') {
      // Verifica se tem seções de intro/ponte junto com inline (formato misto)
      if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(form.markdown)) {
        // Formato misto: processa tudo usando processMixedChords
        console.log('📝 Processando formato misto');
        processedHtml = processMixedChords(form.markdown);
        wrapperClass = 'chord-container-inline';
      } else {
        // Formato inline puro - usa processamento simples
        console.log('📝 Processando formato inline puro');
        processedHtml = processSimpleInline(form.markdown);
        wrapperClass = 'chord-container-inline';
      }
    } else {
      // Formato above (acordes acima da letra)
      console.log('📝 Processando formato above');
      processedHtml = processChords(form.markdown, 'above');
      wrapperClass = 'chord-container-above';
    }
    
    const wrappedHtml = `<div class="${wrapperClass}">${processedHtml}</div>`;
    setPreview(wrappedHtml);
  }, [form.markdown]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current && editorRef.current.codemirror) {
        editorRef.current.codemirror.refresh();
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleAddTag = () => {
    const trimmed = form.tagsInput.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm({ ...form, tags: [...form.tags, trimmed], tagsInput: "" });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const toggleMoment = (moment: LiturgicalMoment) => {
    setForm((prev) => ({
      ...prev,
      moments: prev.moments.includes(moment)
        ? prev.moments.filter((m) => m !== moment)
        : [...prev.moments, moment],
    }));
  };

  const handleSubmit = async () => {
    // Validações
    if (!form.title.trim()) {
      toast.error("Por favor, insere o título da música");
      return;
    }
    
    if (!form.type) {
      toast.error("Por favor, seleciona o tipo de música");
      return;
    }
    
    if (!form.instrument) {
      toast.error("Por favor, seleciona o instrumento principal");
      return;
    }
    
    if (form.moments.length === 0) {
      toast.error("Por favor, seleciona pelo menos um momento litúrgico");
      return;
    }
    
    if (!form.markdown.trim()) {
      toast.error("Por favor, insere a letra da música em Markdown");
      return;
    }
    
    if (!captchaToken) {
      toast.error("Por favor, complete o captcha antes de submeter");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("id", form.id);
      formData.append("title", form.title);
      formData.append("instrument", form.instrument);
      formData.append("type", form.type);
      formData.append("markdown", form.markdown);
      formData.append("tags", form.tags.join(","));
      formData.append("moments", JSON.stringify(form.moments));
      formData.append("captchaToken", captchaToken);
      if (form.pdfFile) formData.append("pdf", form.pdfFile);
      if (form.mp3File) formData.append("audio", form.mp3File);
      formData.append("youtubeLink", form.youtubeLink);
      formData.append("spotifyLink", form.spotifyLink);

      const res = await fetch("/api/musics/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success("A tua música foi enviada para revisão com sucesso!");
        router.push(`/musics`);
      } else {
        toast.error(data.error || "Erro ao submeter a música");
        setCaptchaToken(null); // Reset captcha on error
      }
    } catch (error) {
      console.error("Erro na submissão:", error);
      toast.error("Erro de conexão ao submeter a música");
      setCaptchaToken(null); // Reset captcha on error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="text-center mt-10">
        <p>Precisas de estar autenticado para criar uma música!</p>
        <br></br>
        <Button onClick={() => router.push("/login")}>Ir para Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 space-y-12">
      <h1 className="text-3xl font-bold border-b-2 border-sky-500 pb-1">Submeter Nova Música</h1>

      <div className="space-y-8">
        <div>
          <Label>Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <Label>Momentos Litúrgicos</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.values(LiturgicalMoment).map((m) => (
              <Button
                key={m}
                type="button"
                variant={form.moments.includes(m) ? "default" : "outline"}
                onClick={() => toggleMoment(m)}
              >
                {m.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Nova tag"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            />
            <Button type="button" onClick={handleAddTag}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {form.tags.map((tag, tagIndex) => (
              <Badge key={`create-tag-${tagIndex}`} onClick={() => handleRemoveTag(tag)} className="cursor-pointer">
                {tag} ✕
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label>Tipo</Label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as SongType })}
            >
              <option value="">Selecionar...</option>
              {Object.values(SongType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Instrumento principal</Label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.instrument}
              onChange={(e) => setForm({ ...form, instrument: e.target.value as Instrument })}
            >
              <option value="">Selecionar...</option>
              {Object.values(Instrument).map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Editor Markdown</Label>
              <ChordGuideButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">
              <a href="/guide" className="hover:underline">Aprende a usar o sistema Markdown</a>
            </p>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm mb-2">Formatos de acordes suportados:</h4>
              <ul className="text-xs space-y-1">
                <li><strong>Inline:</strong> <code>#mic#</code> seguido de <code>[C]Deus est[Am]á aqui</code></li>
                <li><strong>Acima da letra:</strong> <code>[C] [Am] [F]</code> numa linha e <code>Deus está aqui</code> na seguinte</li>
                <li><strong>Intro/Ponte:</strong> <code>Intro:</code> seguido de <code>[A] [G] [C]</code> na linha seguinte</li>
                <li><strong>Formato misto:</strong> Podes combinar inline com intro/ponte na mesma música!</li>
              </ul>
            </div>
            <SimpleMDE
              value={form.markdown}
              onChange={(val) => setForm({ ...form, markdown: val })}
              getMdeInstance={(instance) => (editorRef.current = instance)}
            />
          </div>
          <div>
            <Label>Preview</Label>
            
            <div
              className="prose border rounded-md p-4 bg-white dark:bg-neutral-900 overflow-auto max-h-[500px] font-mono text-sm mt-2"
              style={{ lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label><FileText className="w-4 h-4 inline mr-1" /> PDF (opcional)</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, pdfFile: e.target.files?.[0] || null })} />
          </div>
          <div>
            <Label><Music className="w-4 h-4 inline mr-1" /> MP3 (opcional)</Label>
            <Input type="file" accept="audio/mpeg" onChange={(e) => setForm({ ...form, mp3File: e.target.files?.[0] || null })} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label><Youtube className="w-4 h-4 inline mr-1" /> Link do YouTube (opcional) </Label>
            <Input type="url" value={form.youtubeLink} onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })} />
          </div>
          {/* <div>
            <Label><FaSpotify className="w-4 h-4 inline mr-1" /> Link do Spotify</Label>
            <Input type="url" value={form.spotifyLink} onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })} />
          </div> */}
        </div>

        {/* Cloudflare Turnstile Captcha */}
        <TurnstileCaptcha
          onSuccess={(token: string) => setCaptchaToken(token)}
          onError={() => setCaptchaToken(null)}
          onExpire={() => setCaptchaToken(null)}
        />

        <div className="pt-6">
          <Button 
            onClick={handleSubmit} 
            className="w-full md:w-auto" 
            disabled={!captchaToken || isSubmitting}
          >
            <Upload className="w-4 h-4 mr-2" /> 
            {isSubmitting ? "A submeter..." : "Submeter Música"}
          </Button>
        </div>
      </div>
    </div>
  );
}
