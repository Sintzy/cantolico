import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";
import { getClerkSession } from "@/lib/api-middleware";

// /api/admin/submissions?page=1&limit=20&q=&status=
export async function GET(req: NextRequest) {
  try {
    const session = await getClerkSession();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const instrument = searchParams.get("instrument");
    
    // Sort parameters
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build optimized query - apply filters at database level
    let query = adminSupabase
      .from('SongSubmission')
      .select(`
        id,
        title,
        status,
        type,
        mainInstrument,
        tags,
        createdAt,
        submitterId,
        submitter:User!SongSubmission_submitterId_fkey (
          id,
          name,
          email,
          role
        )
      `, { count: 'exact' });

    // Apply filters at database level (more efficient)
    if (q) {
      query = query.or(`title.ilike.%${q}%,tags.cs.{${q}}`);
    }
    
    if (status && status !== "all") {
      query = query.eq('status', status);
    }
    
    if (type && type !== "all") {
      query = query.eq('type', type);
    }
    
    if (instrument && instrument !== "all") {
      query = query.eq('mainInstrument', instrument);
    }

    // Apply sorting and pagination at database level
    const ascending = sortOrder === "asc";
    query = query.order(sortBy, { ascending }).range(skip, skip + limit - 1);

    const { data: rawSubmissions, error, count: total } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Erro ao buscar submissões' }, { status: 500 });
    }

    // Bulk fetch moderation data only for submissions on this page
    const submitterIds = (rawSubmissions || [])
      .map((s: any) => s.submitter?.id)
      .filter(Boolean);
    
    let moderationByUser = new Map();
    if (submitterIds.length > 0) {
      const { data: moderationRecords } = await adminSupabase
        .from('UserModeration')
        .select(`
          userId,
          id,
          status,
          type,
          reason,
          moderatorNote,
          moderatedAt,
          expiresAt,
          moderatedBy
        `)
        .in('userId', submitterIds)
        .order('moderatedAt', { ascending: false });

      // Group by userId (latest only)
      moderationRecords?.forEach((mod: any) => {
        if (!moderationByUser.has(mod.userId)) {
          moderationByUser.set(mod.userId, mod);
        }
      });
    }

    // Enrich submissions with moderation data
    const submissions = (rawSubmissions || []).map((submission: any) => ({
      ...submission,
      submitter: {
        ...submission.submitter,
        currentModeration: submission.submitter?.id 
          ? moderationByUser.get(submission.submitter.id) || null
          : null
      }
    }));

    const totalPages = Math.ceil((total || 0) / limit);

    return NextResponse.json({ 
      submissions, 
      totalPages,
      totalItems: total || 0,
      total: total || 0,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error in admin submissions API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
