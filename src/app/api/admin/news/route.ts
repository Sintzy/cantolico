import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase } from '@/lib/supabase-admin';
import { titleToSlug } from '@/lib/slugs';

async function generateUniqueNewsSlug(title: string) {
  const baseSlug = titleToSlug(title);
  if (!baseSlug) {
    throw new Error('Slug inválida');
  }

  const { count } = await adminSupabase
    .from('News')
    .select('id', { count: 'exact', head: true })
    .like('slug', `${baseSlug}%`);

  if (!count || count === 0) {
    return baseSlug;
  }

  let counter = 1;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const { data } = await adminSupabase
      .from('News')
      .select('id')
      .eq('slug', candidate)
      .limit(1);

    if (!data || data.length === 0) {
      return candidate;
    }

    counter += 1;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { data, error } = await adminSupabase
      .from('News')
      .select('id, title, slug, summary, coverImageUrl, isPublished, publishedAt, createdAt')
      .order('createdAt', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Erro ao carregar notícias' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      summary,
      content,
      coverImageUrl,
      isPublished,
      publishedAt
    } = body || {};

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const slug = await generateUniqueNewsSlug(title);
    const publishDate = isPublished
      ? new Date(publishedAt || new Date().toISOString()).toISOString()
      : null;

    const { data, error } = await adminSupabase
      .from('News')
      .insert({
        title,
        slug,
        summary: summary || null,
        content,
        coverImageUrl: coverImageUrl || null,
        isPublished: !!isPublished,
        publishedAt: publishDate,
        createdById: session.user.id
      })
      .select('id, title, slug, summary, coverImageUrl, isPublished, publishedAt, createdAt')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Erro ao criar notícia' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
