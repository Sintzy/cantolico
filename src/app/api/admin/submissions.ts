import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

// /api/admin/submissions?page=1&limit=20&q=&status=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const status = searchParams.get("status") || undefined;
  // Força ordenação alfabética
  const sort = "az";

  // Filtro de busca
  const where: any = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { submitter: { name: { contains: q, mode: "insensitive" as const } } },
        { submitter: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
    ...(status && status !== "all" && { status }),
  };

  // Ordenação
  let orderBy: any = { title: "asc" };

  // Build query
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
        bio,
        moderationHistory:UserModeration!UserModeration_userId_fkey (
          id,
          status,
          type,
          reason,
          moderatorNote,
          moderatedAt,
          expiresAt,
          moderatedBy:User!UserModeration_moderatedById_fkey (
            name
          )
        ),
        moderation:UserModeration!UserModeration_userId_fkey (
          id,
          status,
          type,
          reason,
          moderatorNote,
          moderatedAt,
          expiresAt,
          moderatedBy:User!UserModeration_moderatedById_fkey (
            name
          )
        )
      )
    `, { count: 'exact' })
    .order('title', { ascending: true })
    .range(skip, skip + limit - 1);

  // Apply filters
  if (q) {
    query = query.or(`title.ilike.%${q}%,submitter.name.ilike.%${q}%,submitter.email.ilike.%${q}%`);
  }
  
  if (status && status !== "all") {
    query = query.eq('status', status);
  }

  const { data: rawSubmissions, error, count: total } = await query;

  if (error) {
    throw new Error(`Erro ao buscar submissões: ${error.message}`);
  }

  // Garante que moderationHistory e moderation (currentModeration) nunca sejam undefined
  const submissions = (rawSubmissions || []).map((s: any) => ({
    ...s,
    submitter: {
      ...s.submitter,
      moderationHistory: s.submitter?.moderationHistory ?? [],
      currentModeration: s.submitter?.moderation ?? null,
    },
  }));

  const totalPages = Math.ceil((total || 0) / limit);

  return NextResponse.json({ submissions, totalPages });
}
