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

import { Instrument, LiturgicalMoment, SongType } from "@/lib/constants";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Music, FileText, Upload, Youtube, ChevronRight, ChevronLeft, Info, Clock, User, Upload as UploadIcon } from "lucide-react";
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
          toast.error("A sua conta está suspensa. Não pode criar músicas.", {
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

  // Validação de cada passo
  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return form.title.trim() && form.type && form.instrument;
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
      <main className="min-h-screen">
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Acesso Necessário</CardTitle>
                <CardDescription>
                  Precisas de estar autenticado para criar uma música
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push("/login")} size="lg" className="w-full">
                  Ir para Login
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">A verificar permissões...</p>
          </div>
        </div>
      )}
      
      {/* Conteúdo principal - só mostra após verificação */}
      {!isCheckingModeration && (
        <>
          {/* Hero Section com estilo da landing page */}
          <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute left-1/2 top-0 -translate-x-1/2">
                <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px]" />
              </div>
            </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pb-8 pt-12 md:pb-12 md:pt-16 relative z-10">
            <div className="text-center space-y-4">
              <div className="mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
                <div className="-mx-0.5 flex justify-center -space-x-2 py-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Music className="text-white text-xs w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <FileText className="text-white text-xs w-3 h-3" />
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Plus className="text-white text-xs w-3 h-3" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1] leading-tight">
                Submeter Nova Música
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Partilha um novo cântico com a comunidade através de 4 passos simples
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Indicator */}
      <section className="bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? "bg-gray-900 border-gray-900 text-white"
                          : isActive
                          ? "bg-white border-gray-900 text-gray-900"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${isActive || isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                        Passo {step.number}
                      </div>
                      <div className={`text-xs ${isActive || isCompleted ? "text-gray-600" : "text-gray-400"}`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${isCompleted ? "bg-gray-900" : "bg-gray-300"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Passo 1: Informações Básicas */}
      {currentStep === 1 && (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Informações Básicas</h2>
              <p className="text-gray-600">Título, tipo e instrumento principal da música</p>
            </div>

            <Card className="max-w-3xl mx-auto border-0 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Dados da Música
                </CardTitle>
                <CardDescription>
                  Preenche as informações essenciais sobre a música
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-medium">
                    Título *
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Nome da música"
                    className="h-12"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-base font-medium">
                      Tipo *
                    </Label>
                    <select
                      id="type"
                      className="w-full h-12 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as SongType })}
                    >
                      <option value="">Selecionar...</option>
                      {Object.values(SongType).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrument" className="text-base font-medium">
                      Instrumento Principal *
                    </Label>
                    <select
                      id="instrument"
                      className="w-full h-12 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNext}
                    disabled={!isStepComplete(1)}
                    className="flex items-center gap-2 px-8"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Passo 2: Momentos e Tags */}
      {currentStep === 2 && (
        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Momentos Litúrgicos e Tags</h2>
              <p className="text-gray-600">Escolhe os momentos da celebração onde a música é adequada</p>
            </div>

            <Card className="max-w-4xl mx-auto border-0 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Categorização da Música
                </CardTitle>
                <CardDescription>
                  Seleciona os momentos litúrgicos apropriados e adiciona tags opcionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Momentos Litúrgicos *
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(LiturgicalMoment).map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={form.moments.includes(m) ? "default" : "outline"}
                        onClick={() => toggleMoment(m)}
                        size="sm"
                        className={`h-10 ${
                          form.moments.includes(m) 
                            ? "bg-gray-900 hover:bg-gray-800 text-white border-gray-900" 
                            : "hover:bg-gray-100"
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
                  <Label htmlFor="tags" className="text-base font-medium">
                    Tags (opcional)
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="tags"
                      placeholder="Nova tag"
                      value={form.tagsInput}
                      onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      className="h-12"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline" className="h-12 px-6">
                      <Plus className="w-4 h-4 mr-2" /> 
                      Adicionar
                    </Button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {form.tags.map((tag, tagIndex) => (
                        <Badge 
                          key={`create-tag-${tagIndex}`} 
                          onClick={() => handleRemoveTag(tag)} 
                          className="cursor-pointer px-3 py-1 hover:bg-destructive hover:text-destructive-foreground"
                          variant="secondary"
                        >
                          {tag} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex items-center gap-2 px-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isStepComplete(2)}
                    className="flex items-center gap-2 px-8"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Passo 3: Letra e Acordes */}
      {currentStep === 3 && (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Letra e Acordes</h2>
              <p className="text-gray-600">Escreve a letra da música com os acordes em formato Markdown</p>
            </div>

            <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Conteúdo Musical
                </CardTitle>
                <CardDescription>
                  Usa o editor Markdown para escrever a letra com acordes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="markdown" className="text-base font-medium">
                        Editor Markdown *
                      </Label>
                      <ChordGuideButton />
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        <a href="/guide" className="hover:underline text-primary">
                          Aprende a usar o sistema Markdown
                        </a>
                      </p>
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Formatos suportados:</h4>
                        <ul className="text-xs space-y-1">
                          <li><strong>Inline:</strong> <code className="bg-muted px-1 rounded">#mic#</code> seguido de <code className="bg-muted px-1 rounded">[C]Deus est[Am]á aqui</code></li>
                          <li><strong>Acima:</strong> <code className="bg-muted px-1 rounded">[C] [Am] [F]</code> numa linha e <code className="bg-muted px-1 rounded">Deus está aqui</code> na seguinte</li>
                          <li><strong>Intro/Ponte:</strong> <code className="bg-muted px-1 rounded">Intro:</code> seguido de <code className="bg-muted px-1 rounded">[A] [G] [C]</code></li>
                        </ul>
                      </Card>
                    </div>

                    <SimpleMDE
                      value={form.markdown}
                      onChange={(val) => setForm({ ...form, markdown: val })}
                      getMdeInstance={(instance) => (editorRef.current = instance)}
                      options={simpleMDEOptions}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium">Preview</Label>
                    <Card className="p-4 overflow-auto max-h-[500px]">
                      <div
                        className="font-mono text-sm"
                        style={{ lineHeight: '1.8' }}
                        dangerouslySetInnerHTML={{ __html: preview }}
                      />
                    </Card>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex items-center gap-2 px-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isStepComplete(3)}
                    className="flex items-center gap-2 px-8"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Passo 4: Finalização */}
      {currentStep === 4 && (
        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Anexos e Finalização</h2>
              <p className="text-gray-600">Adiciona ficheiros opcionais e submete a música</p>
            </div>

            <div className="space-y-6">
              {/* Anexos */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon className="h-5 w-5" />
                    Anexos Opcionais
                  </CardTitle>
                  <CardDescription>
                    Adiciona ficheiros PDF, MP3 e links externos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="pdf" className="text-base font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF (opcional)
                      </Label>
                      <Input 
                        id="pdf"
                        type="file" 
                        accept="application/pdf" 
                        onChange={(e) => setForm({ ...form, pdfFile: e.target.files?.[0] || null })}
                        className="h-12"
                      />
                      {form.pdfFile && (
                        <p className="text-sm text-muted-foreground">
                          Ficheiro: {form.pdfFile.name}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mp3" className="text-base font-medium flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        MP3 (opcional)
                      </Label>
                      <Input 
                        id="mp3"
                        type="file" 
                        accept="audio/mpeg" 
                        onChange={(e) => setForm({ ...form, mp3File: e.target.files?.[0] || null })}
                        className="h-12"
                      />
                      {form.mp3File && (
                        <p className="text-sm text-muted-foreground">
                          Ficheiro: {form.mp3File.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="youtube" className="text-base font-medium flex items-center gap-2">
                        <Youtube className="w-4 h-4" />
                        Link do YouTube (opcional)
                      </Label>
                      <Input 
                        id="youtube"
                        type="url" 
                        value={form.youtubeLink} 
                        onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        className="h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="spotify" className="text-base font-medium flex items-center gap-2">
                        <FaSpotify className="w-4 h-4" />
                        Link do Spotify (opcional)
                      </Label>
                      <Input 
                        id="spotify"
                        type="url" 
                        value={form.spotifyLink} 
                        onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })}
                        placeholder="https://open.spotify.com/track/..."
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/95">
                <CardHeader>
                  <CardTitle>Resumo da Música</CardTitle>
                  <CardDescription>
                    Revê os dados antes de submeter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Título:</span>
                        <span className="text-muted-foreground">{form.title || "Não definido"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tipo:</span>
                        <span className="text-muted-foreground">{form.type || "Não definido"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Instrumento:</span>
                        <span className="text-muted-foreground">{form.instrument || "Não definido"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Momentos:</span>
                        <span className="text-muted-foreground">{form.moments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tags:</span>
                        <span className="text-muted-foreground">{form.tags.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Letra:</span>
                        <span className="text-muted-foreground">{form.markdown.trim() ? "Definida" : "Não definida"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Captcha */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-white/95">
                <CardHeader>
                  <CardTitle>Verificação de Segurança</CardTitle>
                  <CardDescription>
                    Complete a verificação antes de submeter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TurnstileCaptcha
                    onSuccess={(token: string) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </CardContent>
              </Card>

              {/* Botões de navegação */}
              <div className="flex justify-between">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="flex items-center gap-2 px-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isStepComplete(4) || isSubmitting}
                  className="flex items-center gap-2 px-8"
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
        </section>
      )}
      </>
    )}

    </main>
  );
}
