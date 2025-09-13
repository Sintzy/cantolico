import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";

// /api/admin/submissions?page=1&limit=20&q=&status=
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status") || undefined;
    const sort = searchParams.get("sort") || "az";

    // Build query for submissions
    let query = supabase
      .from('SongSubmission')
      .select(`
        *,
        submitter:User!SongSubmission_submitterId_fkey (
          id,
          name,
          email,
          role,
          createdAt,
          image,
          bio
        )
      `, { count: 'exact' })
      .order('title', { ascending: sort === 'az' })
      .range(skip, skip + limit - 1);

    // Apply filters
    if (q) {
      query = query.or(`title.ilike.%${q}%`);
    }
    
    if (status && status !== "all") {
      query = query.eq('status', status);
    }

    const { data: rawSubmissions, error, count: total } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Erro ao buscar submissões' }, { status: 500 });
    }

    // For each submission, get moderation data for submitter
    const submissions = await Promise.all(
      (rawSubmissions || []).map(async (submission: any) => {
        let moderationData = null;
        if (submission.submitter?.id) {
          const { data: moderation } = await supabase
            .from('UserModeration')
            .select(`
              id,
              status,
              type,
              reason,
              moderatorNote,
              moderatedAt,
              expiresAt,
              moderatedBy
            `)
            .eq('userId', submission.submitter.id)
            .order('moderatedAt', { ascending: false })
            .limit(1)
            .single();

          moderationData = moderation;
        }

        return {
          ...submission,
          submitter: {
            ...submission.submitter,
            currentModeration: moderationData
          }
        };
      })
    );

    const totalPages = Math.ceil((total || 0) / limit);

    return NextResponse.json({ submissions, totalPages });

  } catch (error) {
    console.error('Error in admin submissions API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
