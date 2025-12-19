import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

// Fixed schemas with proper type coercion
const UpdateUserSchema = z.object({
  userId: z.coerce.string(),
  role: z.enum(['USER', 'TRUSTED', 'REVIEWER', 'ADMIN']).optional(),
});

const DeleteUserSchema = z.object({
  userId: z.coerce.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('🔍 Admin users endpoint called');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    console.log('🔍 Query params:', { page, limit, search, role, status });

    const offset = (page - 1) * limit;

    // Build basic users query
    let baseQuery = supabase
      .from('User')
      .select(`
        id,
        name,
        email,
        role,
        createdAt,
        image
      `)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    // Apply search filter
    if (search) {
      baseQuery = baseQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && role !== 'all') {
      baseQuery = baseQuery.eq('role', role);
    }

    console.log('🔍 Executing users query...');
    const { data: baseUsers, error: baseUsersError } = await baseQuery;

    if (baseUsersError) {
      console.error('❌ Error fetching users:', baseUsersError);
      return NextResponse.json({ error: 'Erro ao carregar utilizadores' }, { status: 500 });
    }

    console.log(`✅ Found ${baseUsers?.length || 0} users`);

    // Fetch all additional data in bulk to avoid N+1 queries
    const userIds = (baseUsers || []).map((u: any) => u.id);
    
    if (userIds.length === 0) {
      return NextResponse.json({
        users: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page
      });
    }

    // Bulk fetch moderation records
    const { data: moderationRecords } = await supabase
      .from('UserModeration')
      .select(`
        id,
        userId,
        status,
        type,
        reason,
        moderatorNote,
        moderatedAt,
        expiresAt,
        moderatedById,
        ipAddress
      `)
      .in('userId', userIds)
      .order('moderatedAt', { ascending: false });

    // Group moderation by userId (latest only)
    const moderationByUser = new Map();
    moderationRecords?.forEach((mod: any) => {
      if (!moderationByUser.has(mod.userId)) {
        moderationByUser.set(mod.userId, mod);
      }
    });

    // Bulk fetch moderator info
    const moderatorIds = Array.from(new Set(
      moderationRecords?.filter((m: any) => m.moderatedById).map((m: any) => m.moderatedById) || []
    ));
    const { data: moderators } = await supabase
      .from('User')
      .select('id, name')
      .in('id', moderatorIds);
    
    const moderatorMap = new Map(moderators?.map((m: any) => [m.id, m]) || []);

    // Enrich users with fetched data
    const enrichedUsersList = (baseUsers || []).map((user: any) => {
      const moderationRecord = moderationByUser.get(user.id);
      const moderatorInfo = moderationRecord?.moderatedById 
        ? moderatorMap.get(moderationRecord.moderatedById)
        : null;

      return {
        ...user,
        totalSongs: 0, // Removed for performance - fetch on detail page if needed
        totalSubmissions: 0, // Removed for performance - fetch on detail page if needed
        moderation: moderationRecord ? {
          id: moderationRecord.id,
          status: moderationRecord.status,
          type: moderationRecord.type,
          reason: moderationRecord.reason,
          moderatorNote: moderationRecord.moderatorNote,
          moderatedAt: moderationRecord.moderatedAt,
          expiresAt: moderationRecord.expiresAt,
          ipAddress: moderationRecord.ipAddress,
          moderatedBy: moderatorInfo ? { name: moderatorInfo.name } : null
        } : { status: 'ACTIVE' }
      };
    });

    // Filter by moderation status if specified
    let finalUsersList = enrichedUsersList;
    if (status && status !== 'all') {
      finalUsersList = enrichedUsersList.filter(user => 
        user.moderation?.status === status
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('User')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role && role !== 'all') {
      countQuery = countQuery.eq('role', role);
    }

    const { count: totalUserCount, error: countQueryError } = await countQuery;

    if (countQueryError) {
      console.error('Error counting users:', countQueryError);
    }

    const totalPagesCount = Math.ceil((totalUserCount || 0) / limit);

    console.log('✅ Returning users data with all moderation fields:', {
      usersCount: finalUsersList.length,
      totalCount: totalUserCount,
      totalPages: totalPagesCount
    });

    return NextResponse.json({
      users: finalUsersList,
      totalCount: totalUserCount || 0,
      totalPages: totalPagesCount,
      currentPage: page
    });

  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📥 Raw request body:', body);
    
    // Parse with coercion
    const parsedData = UpdateUserSchema.parse(body);
    const { userId, role } = parsedData;

    console.log('🔧 Updating user role (FIXED):', { userId, role, userIdType: typeof userId });

    // Update user role
    const { error: roleUpdateError } = await supabase
      .from('User')
      .update({ role })
      .eq('id', userId);

    if (roleUpdateError) {
      console.error('Error updating user role:', roleUpdateError);
      return NextResponse.json({ error: 'Erro ao atualizar role do utilizador' }, { status: 500 });
    }

    console.log('✅ User role updated successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = DeleteUserSchema.parse(body);

    console.log('🗑️ Deleting user:', { userId });

    // Delete user (this will cascade delete related records due to foreign key constraints)
    const { error: userDeleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      console.error('Error deleting user:', userDeleteError);
      return NextResponse.json({ error: 'Erro ao eliminar utilizador' }, { status: 500 });
    }

    console.log('✅ User deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
