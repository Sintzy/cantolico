import { NextRequest, NextResponse } from "next/server";
import { adminSupabase as supabase } from "@/lib/supabase-admin";

// /api/musics/search?q=...&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  if (!q.trim()) {
    const { data, error } = await supabase
      .from('Song')
      .select('id, title, slug, createdAt')
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1);
    if (error) return NextResponse.json({ error: "Error searching songs" }, { status: 500 });
    return NextResponse.json({ songs: data || [], totalPages: 1 });
  }

  // Fuzzy + accent-insensitive search via pg_trgm + unaccent RPC functions.
  // Fallback to ilike if the RPC functions are not yet deployed.
  const [songsResult, countResult] = await Promise.all([
    supabase.rpc('search_songs', { q, lim: limit, offs: skip }),
    supabase.rpc('count_search_songs', { q }),
  ]);

  if (songsResult.error || countResult.error) {
    // Fallback: plain ilike (works without the migration)
    const [fb, fbc] = await Promise.all([
      supabase.from('Song').select('id, title, slug, createdAt').ilike('title', `%${q}%`).order('createdAt', { ascending: false }).range(skip, skip + limit - 1),
      supabase.from('Song').select('*', { count: 'exact', head: true }).ilike('title', `%${q}%`),
    ]);
    if (fb.error) return NextResponse.json({ error: "Error searching songs" }, { status: 500 });
    return NextResponse.json({ songs: fb.data || [], totalPages: Math.ceil((fbc.count || 0) / limit) });
  }

  const total = Number(countResult.data) || 0;
  return NextResponse.json({ songs: songsResult.data || [], totalPages: Math.ceil(total / limit) });
}
