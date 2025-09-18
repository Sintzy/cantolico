import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

// /api/musics/search?q=...&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  // Build query
  let songsQuery = supabase
    .from('Song')
    .select('id, title, slug, createdAt')
    .order('createdAt', { ascending: false });

  let countQuery = supabase
    .from('Song')
    .select('*', { count: 'exact', head: true });

  // Apply search filter if provided
  if (q) {
    songsQuery = songsQuery.ilike('title', `%${q}%`);
    countQuery = countQuery.ilike('title', `%${q}%`);
  }

  // Apply pagination
  songsQuery = songsQuery.range(skip, skip + limit - 1);

  const [songsResult, totalResult] = await Promise.all([
    songsQuery,
    countQuery
  ]);

  if (songsResult.error) {
    console.error('Error searching songs:', songsResult.error);
    return NextResponse.json({ error: "Error searching songs" }, { status: 500 });
  }

  const songs = songsResult.data || [];
  const total = totalResult.count || 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ songs, totalPages });
}
