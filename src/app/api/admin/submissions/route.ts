import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from "@/lib/supabase-client";

// /api/admin/submissions?page=1&limit=20&q=&status=
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Log específico para REVIEWER
    if (session.user.role === 'REVIEWER') {
      console.log(`📝 [API] REVIEWER ${session.user.name} (${session.user.email}) acessando submissions`);
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
    const userRole = searchParams.get("userRole");
    const dateFilter = searchParams.get("dateFilter");
    const moderationFilter = searchParams.get("moderationFilter");
    
    // Sort parameters
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query for submissions (apenas campos necessários para a lista)
    let query = supabase
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

    // Apply filters only if they're not "all"
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

    // Apply sorting
    const ascending = sortOrder === "asc";
    if (sortBy === "submitter.role") {
      // This will need to be handled after fetching since it's a relation
      query = query.order('createdAt', { ascending: !ascending });
    } else {
      query = query.order(sortBy, { ascending });
    }
    
    // Remove range pagination - we'll do it after filtering
    // query = query.range(skip, skip + limit - 1);

    const { data: rawSubmissions, error, count: total } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Erro ao buscar submissões' }, { status: 500 });
    }

    // For each submission, get moderation data for submitter
    let submissions = await Promise.all(
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

    // Apply filters that couldn't be done in the database query
    if (userRole && userRole !== "all") {
      submissions = submissions.filter(submission => 
        submission.submitter?.role === userRole
      );
    }

    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          submissions = submissions.filter(submission => 
            new Date(submission.createdAt) >= filterDate
          );
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          submissions = submissions.filter(submission => 
            new Date(submission.createdAt) >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          submissions = submissions.filter(submission => 
            new Date(submission.createdAt) >= filterDate
          );
          break;
      }
    }

    if (moderationFilter && moderationFilter !== "all") {
      switch (moderationFilter) {
        case "banned":
          submissions = submissions.filter(submission => 
            submission.submitter?.currentModeration?.status === 'BANNED'
          );
          break;
        case "warned":
          submissions = submissions.filter(submission => 
            submission.submitter?.currentModeration?.status === 'WARNING'
          );
          break;
        case "clean":
          submissions = submissions.filter(submission => 
            !submission.submitter?.currentModeration || 
            submission.submitter?.currentModeration?.status === 'RESOLVED'
          );
          break;
      }
    }

    // Handle special sorting cases that need to be done after fetching
    if (sortBy === "submitter.role") {
      submissions = submissions.sort((a, b) => {
        const roleA = a.submitter?.role || '';
        const roleB = b.submitter?.role || '';
        const comparison = roleA.localeCompare(roleB);
        return ascending ? comparison : -comparison;
      });
    }

    // Recalculate pagination after filtering
    const filteredTotal = submissions.length;
    const totalPages = Math.ceil(filteredTotal / limit);
    
    // Apply pagination to filtered results
    const startIndex = skip;
    const endIndex = startIndex + limit;
    submissions = submissions.slice(startIndex, endIndex);

    return NextResponse.json({ 
      submissions, 
      totalPages,
      totalItems: filteredTotal,
      total: filteredTotal,
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
