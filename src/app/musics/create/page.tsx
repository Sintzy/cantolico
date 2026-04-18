"use client";

import "easymde/dist/easymde.min.css";
import "../../../../public/styles/chords.css";
import { v4 as randomUUID } from "uuid";
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/hooks/useClerkSession";
import { useRouter } from "next/navigation";
import { TurnstileCaptcha } from "@/components/TurnstileCaptcha";
import { FileManager } from "@/components/FileManager";
import MarkdownEditor from "@/components/MarkdownEditor";
import { FileUploadData } from "@/types/song-files";

import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
import { ChordGuideButton } from "@/components/ChordGuidePopup";
import BannerDisplay from "@/components/BannerDisplay";

import { Instrument, InstrumentLabels, LiturgicalMoment, LiturgicalMomentLabels, SongType } from "@/lib/constants";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Music, FileText, Upload, Youtube, ChevronRight, ChevronLeft, Info, Clock, Eye, AlertCircle } from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import Link from "next/link";
import { trackEvent } from "@/lib/umami";

const mdParser = new MarkdownIt({ breaks: true }).use(chords);

export default function CreateNewMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingModeration, setIsCheckingModeration] = useState(true);
  const [moderationStatus, setModerationStatus] = useState<any>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetch("/api/user/moderation-status")
      .then(res => res.json())
      .then(data => {
        setModerationStatus(data);
        if (data.status === "BANNED") { router.push("/banned"); return; }
        if (data.status === "SUSPENDED") {
          toast.error("A tua conta está suspensa. Não podes criar músicas.", {
            description: data.reason ? `Motivo: ${data.reason}` : undefined
          });
          router.push("/");
          return;
        }
        setIsCheckingModeration(false);
      })
      .catch(() => { setIsCheckingModeration(false); });
  }, [session, status, router]);

  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: "Escreve a letra da música com acordes...",
    toolbar: ["bold", "italic", "|", "unordered-list", "ordered-list", "|", "preview", "guide"] as const,
  }), []);

  const [form, setForm] = useState({
    id: randomUUID(),
    title: "",
    author: "",
    moments: [] as LiturgicalMoment[],
    tags: [] as string[],
    tagsInput: "",
    type: SongType.ACORDES,
    instrument: "" as Instrument,
    capo: 0,
    markdown: "",
    youtubeLink: "",
    spotifyLink: "",
  });

  const [files, setFiles] = useState<FileUploadData[]>([]);
  const [preview, setPreview] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!form.markdown) { setPreview(''); return; }
    const { detectChordFormat, processChords: processAboveChords, processMixedChords, processSimpleInline } = require('@/lib/chord-processor');
    let src = form.markdown.replace(/^#mic#\s*\n?/, '').trim();
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
    if (processedHtml.trim().startsWith(`<div class="${wrapperClass}`)) {
      setPreview(processedHtml);
    } else {
      setPreview(`<div class="${wrapperClass}">${processedHtml}</div>`);
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
    const newTags = trimmed.split(',').map(tag => tag.trim()).filter(tag => tag && !form.tags.includes(tag));
    if (newTags.length > 0) setForm({ ...form, tags: [...form.tags, ...newTags], tagsInput: "" });
  };

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const toggleMoment = (moment: LiturgicalMoment) => {
    setForm((prev) => ({
      ...prev,
      moments: prev.moments.includes(moment) ? prev.moments.filter((m) => m !== moment) : [...prev.moments, moment],
    }));
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1: return form.title.trim() && form.type && form.instrument;
      case 2: return form.moments.length > 0;
      case 3:
        if (form.type === SongType.ACORDES) return form.markdown.trim().length > 0;
        return files.length > 0;
      case 4: return captchaToken;
      default: return false;
    }
  };

  const handleNext = () => { if (currentStep < 4 && isStepComplete(currentStep)) setCurrentStep(currentStep + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const handleSubmit = async () => {
    trackEvent("song_create_submit_attempt", { source: "public_create_page", type: form.type });
    if (!form.title.trim()) { toast.error("Por favor, insere o título da música"); return; }
    if (!form.type) { toast.error("Por favor, seleciona o tipo de música"); return; }
    if (!form.instrument) { toast.error("Por favor, seleciona o instrumento principal"); return; }
    if (form.moments.length === 0) { toast.error("Por favor, seleciona pelo menos um momento litúrgico"); return; }
    if (form.type === SongType.ACORDES && !form.markdown.trim()) { toast.error("Por favor, insere a letra da música em Markdown"); return; }
    if (form.type === SongType.PARTITURA && files.length === 0) { toast.error("Por favor, carrega pelo menos um ficheiro PDF para a partitura"); return; }
    if (!captchaToken) { toast.error("Por favor, complete o captcha antes de submeter"); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("id", form.id);
      formData.append("title", form.title);
      formData.append("author", form.author);
      formData.append("instrument", form.instrument);
      formData.append("type", form.type);
      formData.append("capo", form.capo.toString());
      formData.append("markdown", form.markdown);
      formData.append("tags", form.tags.join(","));
      formData.append("moments", JSON.stringify(form.moments));
      formData.append("captchaToken", captchaToken);
      formData.append("youtubeLink", form.youtubeLink);
      formData.append("spotifyLink", form.spotifyLink);
      const validFiles = files.filter(f => f.description && f.description.trim().length > 0);
      if (validFiles.length > 0) {
        formData.append("files", JSON.stringify(validFiles.map(f => ({ fileType: f.fileType, fileName: f.file.name, description: f.description.trim(), fileSize: f.file.size }))));
        validFiles.forEach((fileData, index) => formData.append(`file_${index}`, fileData.file));
      } else {
        formData.append("files", JSON.stringify([]));
      }
      const res = await fetch("/api/musics/create", { method: "POST", body: formData });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Resposta não-JSON recebida:", text);
        throw new Error("Resposta inválida do servidor");
      }
      const data = await res.json();
      if (data.success) {
        trackEvent("song_create_submit_success", { source: "public_create_page", type: form.type });
        toast.success("A tua música foi enviada para revisão com sucesso!");
        router.push(`/musics`);
      } else {
        trackEvent("song_create_submit_failed", { source: "public_create_page", type: form.type, reason: data.error || "request_failed" });
        toast.error(data.error || "Erro ao submeter a música");
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error("Erro na submissão:", error);
      trackEvent("song_create_submit_failed", { source: "public_create_page", type: form.type, reason: "network_error" });
      toast.error(error instanceof Error ? error.message : "Erro de conexão ao submeter a música");
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-white">
        <div className="border-b border-stone-100 bg-white pt-20 pb-8">
          <div className="mx-auto max-w-screen-xl px-5">
            <h1 className="font-display text-4xl text-stone-900">Criar Nova Música</h1>
          </div>
        </div>
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <p className="text-stone-500 mb-6">Precisas de estar autenticado para criares uma música.</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
          >
            Fazer Login
          </button>
        </div>
      </main>
    );
  }

  const steps = [
    { number: 1, title: "Informações Básicas", icon: Info },
    { number: 2, title: "Momentos e Tags", icon: Clock },
    { number: 3, title: "Letra e Acordes", icon: FileText },
    { number: 4, title: "Anexos e Finalização", icon: Upload }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Loading state */}
      {isCheckingModeration && (
        <div className="min-h-screen flex items-center justify-center bg-white pt-20">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto" />
            <p className="text-sm text-stone-500">A verificar permissões...</p>
          </div>
        </div>
      )}

      {!isCheckingModeration && (
        <>
          <BannerDisplay page="MUSICS" />

          {/* Page header */}
          <div className="border-b border-stone-100 bg-white pt-20 pb-8">
            <div className="mx-auto max-w-screen-xl px-5">
              <Link href="/musics" className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-4 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-stone-400 uppercase mb-3">
                <span className="text-rose-700">✝</span>
                <span>Nova Música</span>
              </div>
              <h1 className="font-display text-4xl text-stone-900">Criar Nova Música</h1>
              <p className="mt-2 text-sm text-stone-500 max-w-xl">Preenche os campos obrigatórios e submete para revisão.</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="border-b border-stone-100 bg-white">
            <div className="mx-auto max-w-screen-xl px-5 py-4">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  return (
                    <div key={step.number} className="flex items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted ? "border-stone-900 bg-stone-900 text-white" :
                          isActive ? "border-rose-700 bg-white text-rose-700" :
                          "border-stone-200 bg-white text-stone-400"
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className={`text-sm font-medium hidden sm:block ${
                          isActive || isCompleted ? "text-stone-900" : "text-stone-400"
                        }`}>{step.title}</span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`mx-2 sm:mx-3 h-px w-4 sm:w-8 shrink-0 ${isCompleted ? "bg-stone-900" : "bg-stone-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="mx-auto max-w-screen-xl px-5 py-8">

            {/* Passo 1: Informações Básicas */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 tracking-tight">Informações Básicas</h2>
                  <p className="text-sm text-stone-500 mt-0.5">Título, tipo e instrumento principal da música</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">Dados da Música</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Preenche as informações essenciais sobre a música</p>
                  </div>
                  <div className="p-5 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-stone-700">Título *</Label>
                      <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome da música" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-sm font-medium text-stone-700">Autor (opcional)</Label>
                      <Input id="author" value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Nome do autor/compositor" />
                      <p className="text-xs text-stone-500">Se souber quem compôs esta música, pode adicionar o nome aqui</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-medium text-stone-700">Tipo de Música *</Label>
                        <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as SongType })}>
                          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SongType.ACORDES}>Acordes (com letra e acordes)</SelectItem>
                            <SelectItem value={SongType.PARTITURA}>Partitura (apenas PDF)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-stone-500">
                          {form.type === SongType.ACORDES ? "Escreve a letra com acordes em Markdown" : "Faz upload de ficheiros PDF com a partitura"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instrument" className="text-sm font-medium text-stone-700">Instrumento Principal *</Label>
                        <Select value={form.instrument} onValueChange={(value) => setForm({ ...form, instrument: value as Instrument })}>
                          <SelectTrigger><SelectValue placeholder="Selecionar instrumento..." /></SelectTrigger>
                          <SelectContent>
                            {Object.values(Instrument).map((i) => (
                              <SelectItem key={i} value={i}>{InstrumentLabels[i]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.instrument === Instrument.GUITARRA && (
                        <div className="space-y-2">
                          <Label htmlFor="capo" className="text-sm font-medium text-stone-700">Capo (Traste)</Label>
                          <Select value={form.capo.toString()} onValueChange={(value) => setForm({ ...form, capo: parseInt(value) })}>
                            <SelectTrigger><SelectValue placeholder="Sem capo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sem capo</SelectItem>
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                                <SelectItem key={n} value={n.toString()}>{n}ª casa</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-stone-500">Indica em qual traste o capo deve ser colocado</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-stone-100 bg-stone-50/30 px-5 py-4 flex justify-end">
                    <button
                      onClick={handleNext}
                      disabled={!isStepComplete(1)}
                      className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 2: Momentos Litúrgicos e Tags */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 tracking-tight">Momentos Litúrgicos e Tags</h2>
                  <p className="text-sm text-stone-500 mt-0.5">Escolhe os momentos da celebração onde a música é adequada</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">Categorização da Música</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Seleciona os momentos litúrgicos apropriados e adiciona tags opcionais</p>
                  </div>
                  <div className="p-5 space-y-6">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-stone-700">Momentos Litúrgicos *</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(LiturgicalMoment).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => toggleMoment(m)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                              form.moments.includes(m)
                                ? "border-stone-900 bg-stone-900 text-white"
                                : "border-stone-200 text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                            }`}
                          >
                            {LiturgicalMomentLabels[m]}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-stone-500">
                        {form.moments.length > 0
                          ? `${form.moments.length} momento(s) selecionado(s)`
                          : "Seleciona pelo menos um momento litúrgico"}
                      </p>
                    </div>

                    <div className="border-t border-stone-100" />

                    <div className="space-y-4">
                      <Label htmlFor="tags" className="text-sm font-medium text-stone-700">Tags (opcional)</Label>
                      <div className="flex gap-3">
                        <Input
                          id="tags"
                          placeholder="Digite tags separadas por vírgula (ex: louvor, adoração, comunhão)"
                          value={form.tagsInput}
                          onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </button>
                      </div>
                      <p className="text-sm text-stone-500">Pode escrever várias tags separadas por vírgula e clicar "Adicionar" uma só vez</p>
                      {form.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {form.tags.map((tag, tagIndex) => (
                            <span
                              key={`create-tag-${tagIndex}`}
                              onClick={() => handleRemoveTag(tag)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                            >
                              {tag} ✕
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-stone-100 bg-stone-50/30 px-5 py-4 flex justify-between">
                    <button
                      onClick={handlePrevious}
                      className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!isStepComplete(2)}
                      className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 3: Letra e Acordes / Partitura */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
                    {form.type === SongType.ACORDES ? "Letra e Acordes" : "Ficheiros e Partitura"}
                  </h2>
                  <p className="text-sm text-stone-500 mt-0.5">
                    {form.type === SongType.ACORDES
                      ? "Escreve a letra da música com os acordes em formato Markdown"
                      : "Carrega os ficheiros PDF com a partitura"}
                  </p>
                </div>

                {form.type === SongType.ACORDES ? (
                  <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                    <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                      <h3 className="text-sm font-semibold text-stone-900">Conteúdo Musical</h3>
                      <p className="text-xs text-stone-500 mt-0.5">Usa o editor Markdown para escrever a letra com acordes</p>
                    </div>
                    <div className="p-5 space-y-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="markdown" className="text-sm font-medium text-stone-700">Editor Markdown *</Label>
                            <ChordGuideButton />
                          </div>
                          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 space-y-2">
                            <p className="font-medium text-stone-700">Formatos suportados:</p>
                            <ul className="space-y-1.5">
                              <li className="flex items-start gap-2">
                                <span className="font-semibold text-rose-700 shrink-0">Acordes:</span>
                                <span><code className="bg-white px-1.5 py-0.5 rounded border border-stone-200">[C][Am][F][G]</code> numa linha e a letra na seguinte</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-semibold text-rose-700 shrink-0">Intro/Bridge:</span>
                                <span><code className="bg-white px-1.5 py-0.5 rounded border border-stone-200">Intro:</code> seguido de <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200">[A][Em][G][C]</code></span>
                              </li>
                            </ul>
                            <p className="text-stone-500">Usa o preview em tempo real para ver como fica o resultado.</p>
                          </div>
                          <div className="border border-stone-200 rounded-lg overflow-hidden">
                            <MarkdownEditor
                              id="markdown"
                              value={form.markdown}
                              onChange={(val) => setForm({ ...form, markdown: val })}
                              getMdeInstance={(instance) => (editorRef.current = instance)}
                              options={simpleMDEOptions}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-stone-400" />
                            Preview em Tempo Real
                          </Label>
                          <div className="rounded-xl border border-stone-200 bg-white overflow-auto max-h-[500px] p-4">
                            {form.markdown.trim() ? (
                              <div className="font-mono text-sm" style={{ lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: preview }} />
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center text-stone-400">
                                <Music className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-sm">O preview aparecerá aqui conforme escreves</p>
                                <p className="text-xs mt-1">Começa a escrever no editor para ver o resultado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-stone-100 bg-stone-50/30 px-5 py-4 flex justify-between">
                      <button
                        onClick={handlePrevious}
                        className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!isStepComplete(3)}
                        className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                    <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                      <h3 className="text-sm font-semibold text-stone-900">Partitura e Áudio</h3>
                      <p className="text-xs text-stone-500 mt-0.5">Carrega os ficheiros PDF com a partitura e ficheiros MP3 com o áudio.</p>
                    </div>
                    <div className="p-5">
                      <FileManager mode="create" maxPdfs={20} maxAudios={20} onChange={(updatedFiles) => setFiles(updatedFiles)} />
                    </div>
                    <div className="border-t border-stone-100 bg-stone-50/30 px-5 py-4 flex justify-between">
                      <button
                        onClick={handlePrevious}
                        className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!isStepComplete(3)}
                        className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Passo 4: Anexos e Finalização */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 tracking-tight">Anexos e Finalização</h2>
                  <p className="text-sm text-stone-500 mt-0.5">
                    {form.type === SongType.ACORDES
                      ? "Anexos são opcionais em músicas de acordes. Depois completa os links e submete."
                      : "Adiciona ficheiros opcionais e submete a música"}
                  </p>
                </div>

                {form.type === SongType.ACORDES && (
                  <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                    <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                      <h3 className="text-sm font-semibold text-stone-900">Anexos (opcional)</h3>
                      <p className="text-xs text-stone-500 mt-0.5">Podes adicionar PDFs (partituras) e MP3s (áudio) também em músicas de acordes.</p>
                    </div>
                    <div className="p-5">
                      <FileManager mode="create" maxPdfs={20} maxAudios={20} onChange={(updatedFiles) => setFiles(updatedFiles)} />
                    </div>
                  </div>
                )}

                {/* Links Externos */}
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">Links Externos</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Adiciona links do YouTube e Spotify (opcional)</p>
                  </div>
                  <div className="p-5">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="youtube" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-stone-400" />
                          Link do YouTube (opcional)
                        </Label>
                        <Input
                          id="youtube"
                          type="url"
                          value={form.youtubeLink}
                          onChange={(e) => setForm({ ...form, youtubeLink: e.target.value })}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        {form.youtubeLink && <p className="text-xs text-rose-700">✓ Link válido adicionado</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spotify" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                          <FaSpotify className="w-4 h-4 text-stone-400" />
                          Link do Spotify (opcional)
                        </Label>
                        <Input
                          id="spotify"
                          type="url"
                          value={form.spotifyLink}
                          onChange={(e) => setForm({ ...form, spotifyLink: e.target.value })}
                          placeholder="https://open.spotify.com/track/..."
                        />
                        {form.spotifyLink && <p className="text-xs text-rose-700">✓ Link válido adicionado</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">Resumo da Música</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Revê os dados antes de submeter</p>
                  </div>
                  <div className="p-5">
                    <div className="grid gap-6 md:grid-cols-2 text-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500 flex items-center gap-2"><FileText className="w-4 h-4" />Título:</span>
                          <span className="text-stone-900 text-right max-w-[60%] font-medium">{form.title || "❌ Não definido"}</span>
                        </div>
                        {form.author && (
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-medium text-stone-500">Autor:</span>
                            <span className="text-stone-900 text-right max-w-[60%]">{form.author}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500 flex items-center gap-2"><Music className="w-4 h-4" />Instrumento:</span>
                          <span className="text-stone-900 text-right">{form.instrument || "❌ Não definido"}</span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500 flex items-center gap-2"><Clock className="w-4 h-4" />Momentos:</span>
                          <span className="text-stone-900 text-right flex items-center gap-1">
                            {form.moments.length > 0 ? (
                              <><span className="text-rose-700">✓</span>{form.moments.length} selecionado{form.moments.length > 1 ? 's' : ''}</>
                            ) : "❌ Nenhum selecionado"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500">Tags:</span>
                          <span className="text-stone-900 text-right flex items-center gap-1">
                            {form.tags.length > 0 ? (
                              <><span className="text-rose-700">✓</span>{form.tags.length} adicionada{form.tags.length > 1 ? 's' : ''}</>
                            ) : "📝 Opcional"}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500">Letra:</span>
                          <span className="text-stone-900 text-right flex items-center gap-1">
                            {form.markdown.trim() ? <><span className="text-rose-700">✓</span>Definida</> : "❌ Não definida"}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium text-stone-500">Anexos:</span>
                          <span className="text-stone-900 text-right flex items-center gap-1">
                            {(files.length > 0 || form.youtubeLink || form.spotifyLink) ? (
                              <><span className="text-rose-700">✓</span>Adicionados ({files.length} ficheiros)</>
                            ) : "📎 Opcional"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {form.moments.length > 0 && (
                      <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-stone-700">
                          <Clock className="w-4 h-4 text-stone-400" />
                          Momentos Litúrgicos Selecionados:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {form.moments.map((moment) => (
                            <span key={moment} className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                              {LiturgicalMomentLabels[moment]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.tags.length > 0 && (
                      <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <h4 className="font-medium text-sm mb-2 text-stone-700">Tags:</h4>
                        <div className="flex flex-wrap gap-2">
                          {form.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Captcha */}
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">Verificação de Segurança</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Complete a verificação antes de submeter</p>
                  </div>
                  <div className="p-5">
                    <TurnstileCaptcha
                      onSuccess={(token: string) => setCaptchaToken(token)}
                      onError={() => setCaptchaToken(null)}
                      onExpire={() => setCaptchaToken(null)}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <button
                    onClick={handlePrevious}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors w-full sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isStepComplete(4) || isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />A submeter...</>
                    ) : (
                      <><Upload className="w-4 h-4" />Submeter Música</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
