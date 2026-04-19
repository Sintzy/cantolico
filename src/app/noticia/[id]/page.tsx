import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      {/* Header bar */}
      <div className="border-b border-stone-100">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        {/* Eyebrow */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-rose-700 text-sm">✝</span>
          <span className="h-px w-6 bg-stone-300" />
          <span className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Notícias</span>
        </div>

        {/* Title */}
        <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-[1.1] text-stone-900">
          {news.title}
        </h1>

        {/* Summary */}
        {news.summary && (
          <p className="mt-4 text-lg leading-relaxed text-stone-500">
            {news.summary}
          </p>
        )}

        {/* Meta */}
        {news.publishedAt && (
          <p className="mt-4 font-mono text-xs text-stone-400">
            {formatDate(news.publishedAt)}
          </p>
        )}

        {/* Cover image */}
        {news.coverImageUrl && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={news.coverImageUrl}
              alt={news.title}
              className="w-full h-72 sm:h-96 object-cover"
            />
          </div>
        )}

        {/* Divider */}
        <div className="my-10 border-t border-stone-100" />

        {/* Body */}
        <div className="space-y-5">
          {paragraphs.map((p: string, idx: number) => (
            <p key={idx} className="text-base leading-[1.8] text-stone-700">
              {p}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center justify-between border-t border-stone-100 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
          <span className="text-xs text-stone-400 flex items-center gap-1.5">
            <span className="text-rose-700">✝</span>
            Qui bene cantat, bis orat
          </span>
        </div>
      </article>
    </div>
  );
}
