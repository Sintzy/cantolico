import { NextRequest, NextResponse } from 'next/server';
import { withAdminProtection, logUserModerationAction } from '@/lib/enhanced-api-protection';
import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  userId: z.coerce.string(), // Converte automaticamente number para string
  role: z.enum(['USER', 'TRUSTED', 'REVIEWER', 'ADMIN']).optional(),
});

const DeleteUserSchema = z.object({
  userId: z.coerce.string(), // Converte automaticamente number para string
});

export const GET = withAdminProtection<any>(async (request: NextRequest, session: any) => {
  console.log('🔍 Admin users endpoint called');

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';

  console.log('🔍 Query params:', { page, limit, search, role, status });

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
  const { data: allUsers, error: baseUsersError } = await baseQuery;

  if (baseUsersError) {
    console.error('❌ Error fetching users:', baseUsersError);
    return NextResponse.json({ error: 'Erro ao carregar utilizadores' }, { status: 500 });
  }

  console.log(`✅ Found ${allUsers?.length || 0} total users`);

  // Bulk fetch all required data to avoid N+1 queries
  const userIds = (allUsers || []).map((u: any) => u.id);

  // Bulk fetch moderation records
  const { data: allModerations } = await supabase
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
      ipAddress,
      userId
    `)
    .in('userId', userIds)
    .order('moderatedAt', { ascending: false });

  // Group moderations by userId (latest only)
  const moderationByUser = new Map();
  allModerations?.forEach((mod: any) => {
    if (!moderationByUser.has(mod.userId)) {
      moderationByUser.set(mod.userId, mod);
    }
  });

  // Bulk fetch moderator names
  const moderatorIds = Array.from(new Set(
    allModerations?.map((m: any) => m.moderatedById).filter(Boolean) || []
  ));
  const { data: moderators } = await supabase
    .from('User')
    .select('id, name')
    .in('id', moderatorIds);

  const moderatorMap = new Map(moderators?.map((m: any) => [m.id, m]) || []);

  // Note: Song/submission counts removed for list performance
  // These can be fetched on the user detail page if needed
  const enrichedUsersList = (allUsers || []).map((user: any) => {
    const moderationRecord = moderationByUser.get(user.id);
    const moderatorInfo = moderationRecord?.moderatedById 
      ? moderatorMap.get(moderationRecord.moderatedById)
      : null;

    return {
      ...user,
      totalSongs: 0, // Fetch on detail page if needed
      totalSubmissions: 0, // Fetch on detail page if needed
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
  });

  // Filter by moderation status if specified
  let finalUsersList = enrichedUsersList;
  if (status && status !== 'all') {
    finalUsersList = enrichedUsersList.filter(user => 
      user.moderation?.status === status
    );
  }

  // Apply pagination AFTER filtering
  const offset = (page - 1) * limit;
  const totalFilteredCount = finalUsersList.length;
  const paginatedUsers = finalUsersList.slice(offset, offset + limit);
  const totalPagesCount = Math.ceil(totalFilteredCount / limit);

  console.log('✅ Returning users data with all moderation fields:', {
    usersCount: paginatedUsers.length,
    totalCount: totalFilteredCount,
    totalPages: totalPagesCount
  });

  return NextResponse.json({
    users: paginatedUsers,
    totalCount: totalFilteredCount,
    totalPages: totalPagesCount,
    currentPage: page
  });
}, {
  logAction: 'admin_users_view',
  actionDescription: 'Visualização da lista de utilizadores (Admin)'
});

export const PATCH = withAdminProtection<any>(async (request: NextRequest, session: any) => {
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

  console.log('📥 Raw request body from admin PATCH');
  
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

  // Buscar dados do utilizador alvo
  const { data: targetUser, error: targetUserError } = await supabase
    .from('User')
    .select('id, name, email, role')
    .eq('id', userId)
    .single();

  if (targetUserError || !targetUser) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  // Update user role
  const { error: roleUpdateError } = await supabase
    .from('User')
    .update({ role })
    .eq('id', userId);

  if (roleUpdateError) {
    console.error('Error updating user role:', roleUpdateError);
    return NextResponse.json({ error: 'Erro ao atualizar role do utilizador' }, { status: 500 });
  }

  // Log da ação de moderação
  await logUserModerationAction(
    role === 'ADMIN' ? 'promote' : role === 'USER' ? 'demote' : 'promote',
    targetUser.id,
    targetUser.email,
    `Role alterada de ${targetUser.role} para ${role}`,
    session,
    request,
    {
      oldRole: targetUser.role,
      newRole: role,
      targetUserName: targetUser.name
    }
  );

  console.log('✅ User role updated successfully');
  return NextResponse.json({ success: true });
}, {
  logAction: 'admin_user_role_update',
  actionDescription: 'Atualização de role de utilizador'
});

export const DELETE = withAdminProtection<any>(async (request: NextRequest, session: any) => {
  const body = await request.json();
  const { userId } = DeleteUserSchema.parse(body);

  console.log('🗑️ Deleting user:', { userId });

  // Buscar dados do utilizador antes de eliminar
  const { data: targetUser, error: targetUserError } = await supabase
    .from('User')
    .select('id, name, email, role')
    .eq('id', userId)
    .single();

  if (targetUserError || !targetUser) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  // Delete user (this will cascade delete related records due to foreign key constraints)
  const { error: userDeleteError } = await supabase
    .from('User')
    .delete()
    .eq('id', userId);

  if (userDeleteError) {
    console.error('Error deleting user:', userDeleteError);
    return NextResponse.json({ error: 'Erro ao eliminar utilizador' }, { status: 500 });
  }

  // Log da ação crítica de eliminação
  await logUserModerationAction(
    'ban',
    targetUser.id,
    targetUser.email,
    'Utilizador eliminado permanentemente do sistema',
    session,
    request,
    {
      action_type: 'PERMANENT_DELETE',
      targetUserName: targetUser.name,
      targetUserRole: targetUser.role
    }
  );

  console.log('✅ User deleted successfully');
  return NextResponse.json({ success: true });
}, {
  logAction: 'admin_user_delete',
  actionDescription: 'Eliminação permanente de utilizador'
});
