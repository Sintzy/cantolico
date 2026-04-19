'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useClerkSession';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    loadNews();
  }, [session, status]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/news');
      if (!res.ok) throw new Error('Erro ao carregar notícias');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Erro ao carregar notícias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          content,
          coverImageUrl,
          isPublished,
          publishedAt: publishedAt || null
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao criar notícia');
      }

      toast.success('Notícia criada com sucesso');
      setTitle('');
      setSummary('');
      setContent('');
      setCoverImageUrl('');
      setPublishedAt('');
      setIsPublished(true);
      await loadNews();
    } catch (err) {
      toast.error('Erro ao criar notícia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notícias do Cantólico</h1>
        <p className="text-slate-600">Cria e gere notícias simples para a landing page.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar notícia</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="news-title">Título</Label>
              <Input id="news-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-summary">Resumo</Label>
              <Textarea id="news-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-content">Conteúdo</Label>
              <Textarea id="news-content" value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-cover">Imagem (URL)</Label>
              <Input id="news-cover" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <span className="text-sm text-slate-700">Publicar</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-date">Data de publicação</Label>
              <Input id="news-date" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </div>

            <div>
              <Button type="submit" disabled={saving}>
                {saving ? 'A criar...' : 'Criar notícia'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas notícias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-600">A carregar...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-600">Sem notícias ainda.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-200 rounded-lg p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.isPublished ? 'Publicado' : 'Rascunho'}</p>
                  </div>
                  <div className="text-xs text-slate-500">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-PT') : 'Sem data'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
