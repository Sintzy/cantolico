"use client";

import "easymde/dist/easymde.min.css";
import "../../../../public/styles/chords.css";
import { v4 as randomUUID } from "uuid";
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TurnstileCaptcha } from "@/components/TurnstileCaptcha";

import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
// Importação dinâmica será usada no preview para garantir consistência com a página de visualização
import { ChordGuideButton } from "@/components/ChordGuidePopup";
import BannerDisplay from "@/components/BannerDisplay";

import { Instrument, LiturgicalMoment, SongType } from "@/lib/constants";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Music, FileText, Upload, Youtube, ChevronRight, ChevronLeft, Info, Clock, User, Upload as UploadIcon, Eye, Check, AlertCircle, Search, Filter } from "lucide-react";
import { FaSpotify } from "react-icons/fa";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });
const mdParser = new MarkdownIt({ breaks: true }).use(chords);


export default function CreateNewMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingModeration, setIsCheckingModeration] = useState(true);
  const [moderationStatus, setModerationStatus] = useState<any>(null);

  // Verificar status de moderação no carregamento
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Verificar se o utilizador pode criar músicas
    fetch("/api/user/moderation-status")
      .then(res => res.json())
      .then(data => {
        setModerationStatus(data);
        
        if (data.status === "BANNED") {
          router.push("/banned");
          return;
        }
        
        if (data.status === "SUSPENDED") {
          toast.error("A tua conta está suspensa. Não podes criar músicas.", {
            description: data.reason ? `Motivo: ${data.reason}` : undefined
          });
          router.push("/");
          return;
        }
        
        setIsCheckingModeration(false);
      })
      .catch(() => {
        setIsCheckingModeration(false);
      });
  }, [session, status, router]);

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

  const [form, setForm] = useState({
    id: randomUUID(),
    title: "",
    author: "",
    moments: [] as LiturgicalMoment[],
    tags: [] as string[],
    tagsInput: "",
    type: "ACORDES" as SongType, // Sempre definido como ACORDES
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
  // Preview avançado igual ao sistema de visualização (/musics/[id])
  useEffect(() => {
    if (!form.markdown) {
      setPreview('');
      return;
    }
    // Importa dinamicamente o chord-processor igual à página de visualização
    const {
      detectChordFormat,
      processChords: processAboveChords,
      processMixedChords,
      processSimpleInline
    } = require('@/lib/chord-processor');

    // Remove a tag #mic# do texto para processamento se presente
    let src = form.markdown.replace(/^#mic#\s*\n?/, '').trim();

    // Detecta o formato original
    const originalFormat = detectChordFormat(form.markdown);
    let processedHtml = '';
    let wrapperClass = '';

    if (originalFormat === 'inline') {
      if (/^(Intro|Ponte|Solo|Bridge|Instrumental|Interlude):?\s*$/im.test(form.markdown)) {
        processedHtml = processMixedChords(form.markdown);
        wrapperClass = 'chord-container-inline';
      } else {
        processedHtml = processSimpleInline(src);
        wrapperClass = 'chord-container-inline';
      }
    } else {
      processedHtml = processAboveChords(src, 'above');
      wrapperClass = 'chord-container-above';
    }

    if (processedHtml.trim().startsWith(`<div class=\"${wrapperClass}`)) {
      setPreview(processedHtml);
    } else {
      setPreview(`<div class=\"${wrapperClass}\">${processedHtml}</div>`);
    }
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
    if (!trimmed) return;
    
    // Dividir por vírgula e processar múltiplas tags
    const newTags = trimmed
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !form.tags.includes(tag));
    
    if (newTags.length > 0) {
      setForm({ ...form, tags: [...form.tags, ...newTags], tagsInput: "" });
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

  // Validação de cada passo
  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return form.title.trim() && form.instrument; // Removido form.type pois é sempre ACORDES
      case 2:
        return form.moments.length > 0;
      case 3:
        return form.markdown.trim();
      case 4:
        return captchaToken;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && isStepComplete(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
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
      formData.append("author", form.author);
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
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error("Erro na submissão:", error);
      toast.error("Erro de conexão ao submeter a música");
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-white">
        <section className="py-12 sm:py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <Card className="max-w-md mx-auto border border-border shadow-sm bg-card">
              <CardHeader className="text-center border-b border-border">
                <CardTitle className="text-xl sm:text-2xl">Acesso Necessário</CardTitle>
                <CardDescription>
                  Precisas de estar autenticado para criares uma música
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Button onClick={() => router.push("/login")} size="lg" className="w-full">
                  Fazer Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  const steps = [
    { number: 1, title: "Informações Básicas", icon: Info },
    { number: 2, title: "Momentos e Tags", icon: Clock },
    { number: 3, title: "Letra e Acordes", icon: FileText },
    { number: 4, title: "Finalização", icon: UploadIcon }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Loading state enquanto verifica moderação */}
      {isCheckingModeration && (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm sm:text-base text-muted-foreground">A verificar permissões...</p>
          </div>
        </div>
      )}
      
      {/* Conteúdo principal - só mostra após verificação */}
      {!isCheckingModeration && (
        <>
          {/* Banners */}
          <BannerDisplay page="MUSICS" />
          
          {/* Hero Section com estilo da landing page */}
          <section className="relative bg-white">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute left-1/2 top-0 -translate-x-1/2">
                <div className="h-60 w-60 rounded-full bg-gradient-to-br from-blue-50 via-white to-purple-50" />
              </div>
            </div>
            
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 relative z-10">
              <div className="text-center mb-6 sm:mb-8 md:mb-12">
                {/* Decorative border */}
                <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                  <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Music className="text-white text-xs w-3 h-3" />
                    </div>
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <FileText className="text-white text-xs w-3 h-3" />
                    </div>
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Upload className="text-white text-xs w-3 h-3" />
                    </div>
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
                  Criar Nova Música
                </h1>
                <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
                  Adiciona uma nova música ao catálogo. Preenche os campos obrigatórios e submete para revisão.
                </p>
                
                {/* Progress */}
                <div className="flex items-center justify-center space-x-2 pt-8 overflow-x-auto">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.number;
                    const isCompleted = currentStep > step.number;
                    
                    return (
                      <div key={step.number} className="flex items-center flex-shrink-0">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isCompleted
                                ? "border-primary bg-primary text-primary-foreground"
                                : isActive
                                ? "border-primary bg-background text-primary"
                                : "border-muted-foreground/25 bg-background text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-sm font-medium hidden sm:block ${
                            isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {step.title}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`mx-2 sm:mx-4 h-px w-4 sm:w-8 ${
                            isCompleted ? "bg-primary" : "bg-muted-foreground/25"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

      {/* Passo 1: Informações Básicas */}
      {currentStep === 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Informações Básicas</h2>
              <p className="text-muted-foreground">
                Título, tipo e instrumento principal da música
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dados da Música</CardTitle>
                <CardDescription>
                  Preenche as informações essenciais sobre a música
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Nome da música"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Autor (opcional)</Label>
                  <Input
                    id="author"
                    value={form.author || ''}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Nome do autor/compositor"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se souber quem compôs esta música, pode adicionar o nome aqui
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground flex items-center">
                      ACORDES (Fixo)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Todas as músicas são do tipo acordes por padrão
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instrument">Instrumento Principal *</Label>
                    <Select
                      value={form.instrument}
                      onValueChange={(value) => setForm({ ...form, instrument: value as Instrument })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar instrumento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Instrument).map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete(1)}
                  className="flex items-center gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Passo 2: Momentos Litúrgicos e Tags */}
      {currentStep === 2 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Momentos Litúrgicos e Tags</h2>
              <p className="text-muted-foreground">
                Escolhe os momentos da celebração onde a música é adequada
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Categorização da Música</CardTitle>
                <CardDescription>
                  Seleciona os momentos litúrgicos apropriados e adiciona tags opcionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Momentos Litúrgicos *</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(LiturgicalMoment).map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={form.moments.includes(m) ? "default" : "outline"}
                        onClick={() => toggleMoment(m)}
                        size="sm"
                        className={`transition-all duration-200 ${
                          form.moments.includes(m) 
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary shadow-md" 
                            : "hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }`}
                      >
                        {m.replaceAll("_", " ")}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {form.moments.length > 0 
                      ? `${form.moments.length} momento(s) selecionado(s)`
                      : "Seleciona pelo menos um momento litúrgico"
                    }
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label htmlFor="tags">Tags (opcional)</Label>
                  <div className="flex gap-3">
                    <Input
                      id="tags"
                      placeholder="Digite tags separadas por vírgula (ex: louvor, adoração, comunhão)"
                      value={form.tagsInput}
                      onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddTag} 
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" /> 
                      Adicionar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    💡 Dica: Pode escrever várias tags separadas por vírgula e clicar "Adicionar" uma só vez
                  </p>
                  {form.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {form.tags.map((tag, tagIndex) => (
                        <Badge 
                          key={`create-tag-${tagIndex}`} 
                          onClick={() => handleRemoveTag(tag)} 
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          variant="secondary"
                        >
                          {tag} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete(2)}
                  className="flex items-center gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Passo 3: Letra e Acordes */}
      {currentStep === 3 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Letra e Acordes</h2>
              <p className="text-muted-foreground">
                Escreve a letra da música com os acordes em formato Markdown
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conteúdo Musical</CardTitle>
                <CardDescription>
                  Usa o editor Markdown para escrever a letra com acordes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="markdown">Editor Markdown *</Label>
                      <ChordGuideButton />
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-3">
                      <Card className="p-3 bg-muted/50">
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          🎵 Formatos suportados:
                        </h4>
                        <ul className="text-xs space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-primary">Acordes:</span> 
                            <div>
                              <code className="bg-background px-1.5 py-0.5 rounded text-xs border">[C][Am][F][G]</code> numa linha e <code className="bg-background px-1.5 py-0.5 rounded text-xs border">Canto Aleluia ao senhor</code> na seguinte
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-primary">Intro/Bridge:</span>
                            <div>
                              <code className="bg-background px-1.5 py-0.5 rounded text-xs border">Intro:</code> seguido de <code className="bg-background px-1.5 py-0.5 rounded text-xs border">[A][Em][G][C]</code> na linha seguinte
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-semibold text-primary">Exemplo:</span>
                            <div>
                              <code className="bg-background px-1.5 py-0.5 rounded text-xs border">[D][A][F][G]</code> numa linha, <code className="bg-background px-1.5 py-0.5 rounded text-xs border">Aleluia sim ao senhor</code> na próxima
                            </div>
                          </li>
                        </ul>
                        <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20">
                          <p className="text-xs text-primary font-medium">💡 Dica: Usa o preview em tempo real para ver como fica o resultado!</p>
                        </div>
                      </Card>
                    </div>

                    <div className="border border-border rounded-md overflow-hidden">
                      <SimpleMDE
                        value={form.markdown}
                        onChange={(val) => setForm({ ...form, markdown: val })}
                        getMdeInstance={(instance) => (editorRef.current = instance)}
                        options={simpleMDEOptions}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      Preview em Tempo Real
                    </Label>
                    <Card className="p-4 overflow-auto max-h-[500px]">
                      {form.markdown.trim() ? (
                        <div
                          className="font-mono text-sm"
                          style={{ lineHeight: '1.8' }}
                          dangerouslySetInnerHTML={{ __html: preview }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                          <Music className="w-12 h-12 mb-3 opacity-50" />
                          <p className="text-sm">O preview aparecerá aqui conforme escreves</p>
                          <p className="text-xs mt-1">Começa a escrever no editor para ver o resultado</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete(3)}
                  className="flex items-center gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Passo 4: Finalização */}
      {currentStep === 4 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Anexos e Finalização</h2>
              <p className="text-muted-foreground">
                Adiciona ficheiros opcionais e submete a música
              </p>
            </div>

            <div className="space-y-6">
              {/* Anexos */}
              <Card className="border border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UploadIcon className="h-5 w-5 text-primary" />
                    Anexos Opcionais
                  </CardTitle>
                  <CardDescription>
                    Adiciona ficheiros PDF, MP3 e links externos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-6">
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="pdf" className="text-base font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        PDF (opcional)
                      </Label>
                      <Input 
                        id="pdf"
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => setForm({ ...form, pdfFile: e.target.files?.[0] || null })}
                        className="h-10 sm:h-12 border-dashed border-2 hover:border-primary/50 transition-colors"
                      />
                      {form.pdfFile && (
                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs sm:text-sm">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="truncate">{form.pdfFile.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="mp3" className="text-base font-medium flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary" />
                        MP3 (opcional)
                      </Label>
                      <Input 
                        id="mp3"
                        type="file" 
                        accept="audio/mpeg" 
                        onChange={(e) => setForm({ ...form, mp3File: e.target.files?.[0] || null })}
                        className="h-10 sm:h-12 border-dashed border-2 hover:border-primary/50 transition-colors"
                      />
                      {form.mp3File && (
                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs sm:text-sm">
                          <Music className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="truncate">{form.mp3File.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="youtube" className="text-base font-medium flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-primary" />
                        Link do YouTube (opcional)
                      </Label>
                      <Input 
                        id="youtube"
                        type="url" 
                        value={form.youtubeLink} 
                        onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        className="h-10 sm:h-12"
                      />
                      {form.youtubeLink && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          ✓ Link válido adicionado
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="spotify" className="text-base font-medium flex items-center gap-2">
                        <FaSpotify className="w-4 h-4 text-primary" />
                        Link do Spotify (opcional)
                      </Label>
                      <Input 
                        id="spotify"
                        type="url" 
                        value={form.spotifyLink} 
                        onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })}
                        placeholder="https://open.spotify.com/track/..."
                        className="h-10 sm:h-12"
                      />
                      {form.spotifyLink && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          ✓ Link válido adicionado
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card className="border border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-lg">Resumo da Música</CardTitle>
                  <CardDescription>
                    Revê os dados antes de submeter
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2 text-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Título:
                        </span>
                        <span className="text-foreground text-right max-w-[60%] break-words font-medium">
                          {form.title || "❌ Não definido"}
                        </span>
                      </div>
                      {form.author && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-muted-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Autor:
                          </span>
                          <span className="text-foreground text-right max-w-[60%] break-words">
                            {form.author}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Instrumento:
                        </span>
                        <span className="text-foreground text-right">
                          {form.instrument || "❌ Não definido"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Momentos:
                        </span>
                        <span className="text-foreground text-right flex items-center gap-1">
                          {form.moments.length > 0 ? (
                            <>
                              <span className="text-primary">✓</span>
                              {form.moments.length} selecionado{form.moments.length > 1 ? 's' : ''}
                            </>
                          ) : (
                            "❌ Nenhum selecionado"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground">Tags:</span>
                        <span className="text-foreground text-right flex items-center gap-1">
                          {form.tags.length > 0 ? (
                            <>
                              <span className="text-primary">✓</span>
                              {form.tags.length} adicionada{form.tags.length > 1 ? 's' : ''}
                            </>
                          ) : (
                            "📝 Opcional"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground">Letra:</span>
                        <span className="text-foreground text-right flex items-center gap-1">
                          {form.markdown.trim() ? (
                            <>
                              <span className="text-primary">✓</span>
                              Definida
                            </>
                          ) : (
                            "❌ Não definida"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-medium text-muted-foreground">Anexos:</span>
                        <span className="text-foreground text-right flex items-center gap-1">
                          {(form.pdfFile || form.mp3File || form.youtubeLink || form.spotifyLink) ? (
                            <>
                              <span className="text-primary">✓</span>
                              Adicionados
                            </>
                          ) : (
                            "📎 Opcional"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mostrar resumo dos momentos selecionados */}
                  {form.moments.length > 0 && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Momentos Litúrgicos Selecionados:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {form.moments.map((moment) => (
                          <Badge key={moment} variant="secondary" className="text-xs">
                            {moment.replaceAll("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar tags se existirem */}
                  {form.tags.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                      <h4 className="font-medium text-sm mb-2">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {form.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Captcha */}
              <Card className="border border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-lg">Verificação de Segurança</CardTitle>
                  <CardDescription>
                    Complete a verificação antes de submeter
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <TurnstileCaptcha
                    onSuccess={(token: string) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </CardContent>
              </Card>

              {/* Botões de navegação */}
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="flex items-center gap-2 px-6 sm:px-8 w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  Anterior
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isStepComplete(4) || isSubmitting}
                  className="flex items-center gap-2 px-6 sm:px-8 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      A submeter...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> 
                      Submeter Música
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    )}

    </main>
  );
}
