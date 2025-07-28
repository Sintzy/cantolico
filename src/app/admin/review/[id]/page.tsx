"use client";

import "easymde/dist/easymde.min.css";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import chords from "markdown-it-chords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../../../../../public/styles/chords.css";
import { SpellCheck } from "lucide-react";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), { ssr: false });
const mdParser = new MarkdownIt({ breaks: true }).use(chords);

const allInstruments = ["ORGAO", "GUITARRA", "PIANO", "CORO", "OUTRO"];
const allMoments = [
  "ENTRADA", "ATO_PENITENCIAL", "GLORIA", "SALMO", "ACLAMACAO", "OFERTORIO",
  "SANTO", "COMUNHAO", "ACAO_DE_GRACAS", "FINAL",
];

export default function ReviewSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [mp3PreviewUrl, setMp3PreviewUrl] = useState<string | null>(null);
  const [newPdf, setNewPdf] = useState<File | null>(null);
  const [newMp3, setNewMp3] = useState<File | null>(null);
  const [instrument, setInstrument] = useState("ORGAO");
  const [moments, setMoments] = useState<string[]>([]);
  const [tags, setTags] = useState<string>("");

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
        setInstrument(data.mainInstrument || "Guitarra");
        setMoments(data.moments || []);
        setTags((data.tags || []).join(", "));
        setLoading(false);
      });
  }, [submissionId]);

  const handleApprove = async () => {
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

    const res = await fetch(`/api/admin/submission/${submissionId}/approve`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      router.push("/admin/review");
    } else {
      alert("Erro ao aprovar.");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Motivo da rejeição:");
    if (!reason) return;

    await fetch(`/api/admin/submission/${submissionId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    router.push("/admin/review");
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

      <div>
        <Label>Editor Markdown</Label>
        <SimpleMDE value={markdown}  onChange={setMarkdown} />
      </div>

      <div>
        <Label>Preview</Label>
        <div
          className="border rounded-md p-4 bg-white text-sm overflow-auto prose dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: mdParser.render(markdown) }}
        />
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
        <Button variant="destructive" onClick={handleReject}>Rejeitar Música</Button>
      </div>
    </div>
  );
}