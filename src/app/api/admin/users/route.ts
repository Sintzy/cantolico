import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  userId: z.coerce.string(), // Converte automaticamente number para string
  role: z.enum(['USER', 'TRUSTED', 'REVIEWER', 'ADMIN']).optional(),
});

const DeleteUserSchema = z.object({
  userId: z.coerce.string(), // Converte automaticamente number para string
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

    // Enrich each user with additional data
    const enrichedUsersList = await Promise.all(
      (baseUsers || []).map(async (user: any) => {
        try {
          // Fetch latest moderation data
          const { data: moderationRecord } = await supabase
            .from('UserModeration')
            .select(`
              id,
              status,
              type,
              reason,
              moderatorNote,
              moderatedAt,
              expiresAt,
              moderatedById,
              ipAddress
            `)
            .eq('userId', user.id)
            .order('moderatedAt', { ascending: false })
            .limit(1)
            .maybeSingle();

          let moderatorInfo: { name: string } | null = null;
          if (moderationRecord?.moderatedById) {
            const { data: moderator } = await supabase
              .from('User')
              .select('name')
              .eq('id', moderationRecord.moderatedById)
              .single();
            moderatorInfo = moderator;
          }

          // Fetch songs count
          const { count: songsCount } = await supabase
            .from('SongVersion')
            .select('id', { count: 'exact', head: true })
            .eq('createdById', user.id);

          // Fetch submissions count
          const { count: submissionsCount } = await supabase
            .from('SongSubmission')
            .select('id', { count: 'exact', head: true })
            .eq('submitterId', user.id);

          return {
            ...user,
            totalSongs: songsCount || 0,
            totalSubmissions: submissionsCount || 0,
            moderation: moderationRecord ? {
              id: moderationRecord.id,
              status: moderationRecord.status,
              type: moderationRecord.type,
              reason: moderationRecord.reason,
              moderatorNote: moderationRecord.moderatorNote,
              moderatedAt: moderationRecord.moderatedAt,
              expiresAt: moderationRecord.expiresAt,
              ipAddress: moderationRecord.ipAddress,
              moderatedBy: moderatorInfo ? {
                name: moderatorInfo.name
              } : null
            } : { status: 'ACTIVE' }
          };
        } catch (error) {
          console.error(`Error fetching data for user ${user.id}:`, error);
          return {
            ...user,
            totalSongs: 0,
            totalSubmissions: 0,
            moderation: { status: 'ACTIVE' }
          };
        }
      })
    );

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
    // FIXED: Admin access validation with proper type coercion
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📥 Raw request body:', body);
    
    // Manual validation and coercion to bypass cache issues
    const userId = String(body.userId);
    const role = body.role;
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId e role são obrigatórios' }, { status: 400 });
    }
    
    if (!['USER', 'TRUSTED', 'REVIEWER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Role inválida' }, { status: 400 });
    }

    console.log('🔧 Updating user role (MANUAL VALIDATION):', { userId, role, userIdType: typeof userId });

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
