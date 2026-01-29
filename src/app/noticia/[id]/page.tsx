import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

interface NewsPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { id } = await params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let query = supabase
    .from('News')
    .select('id, title, summary, content, coverImageUrl, publishedAt')
    .eq('isPublished', true);

  query = isUuid ? query.eq('id', id) : query.eq('slug', id);

  const { data, error } = await query.limit(1);

  if (error || !data || data.length === 0) {
    notFound();
  }

  const news = data[0];
  const paragraphs = (news.content || '').split('\n').filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-rose-600 hover:underline">Voltar</Link>
      </div>

      {news.coverImageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={news.coverImageUrl} alt={news.title} className="w-full h-72 object-cover" />
        </div>
      )}

      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{news.title}</h1>
      {news.summary && (
        <p className="text-slate-700 text-lg mb-4">{news.summary}</p>
      )}
      {news.publishedAt && (
        <p className="text-sm text-slate-500 mb-6">{formatDate(news.publishedAt)}</p>
      )}

      <div className="space-y-4 text-slate-700">
        {paragraphs.map((p: string, idx: number) => (
          <p key={idx} className="leading-relaxed">{p}</p>
        ))}
      </div>
    </div>
  );
}
