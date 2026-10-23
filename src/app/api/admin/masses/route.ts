import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase-admin';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, requestedLimit))
      : DEFAULT_LIMIT;
    const search = searchParams.get('search')?.trim() || '';
    const visibility = searchParams.get('visibility');
    const validVisibility = visibility === 'PUBLIC' || visibility === 'PRIVATE' || visibility === 'NOT_LISTED'
      ? visibility
      : null;

    let query = adminSupabase
      .from('Mass')
      .select(`
        id,
        name,
        description,
        date,
        parish,
        celebrant,
        celebration,
        liturgicalColor,
        visibility,
        hiddenMoments,
        userId,
        createdAt,
        updatedAt,
        User!Mass_userId_fkey (
          id,
          name,
          email,
          image
        ),
        MassItem (id)
      `, { count: 'exact' })
      .order('date', { ascending: false, nullsFirst: false })
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (validVisibility) query = query.eq('visibility', validVisibility);

    const { data: masses, error, count } = await query;
    if (error) {
      console.error('Error fetching admin masses:', error);
      return NextResponse.json({ error: 'Erro ao carregar missas' }, { status: 500 });
    }

    const totalCount = count || 0;
    return NextResponse.json({
      masses: (masses || []).map((mass: any) => ({
        ...mass,
        user: mass.User || null,
        _count: { items: mass.MassItem?.length || 0 },
      })),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error in admin masses API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
