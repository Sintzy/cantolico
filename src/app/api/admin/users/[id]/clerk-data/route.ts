import { NextRequest, NextResponse } from 'next/server';
import { withAdminProtection } from '@/lib/enhanced-api-protection';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

// Buscar dados completos do utilizador do Clerk
async function getClerkUser(clerkUserId: string) {
  const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Buscar sessões ativas do Clerk
async function getClerkSessions(clerkUserId: string) {
  const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/sessions`, {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export const GET = withAdminProtection<any>(async (
  request: NextRequest,
  session,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  // Buscar utilizador do Supabase
  const { data: user, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  // Se não tem clerkUserId, retornar apenas dados do Supabase
  if (!user.clerkUserId) {
    return NextResponse.json({
      supabase: user,
      clerk: null,
      sessions: [],
      isLinked: false,
    });
  }

  // Buscar dados do Clerk
  const [clerkUser, clerkSessions] = await Promise.all([
    getClerkUser(user.clerkUserId),
    getClerkSessions(user.clerkUserId),
  ]);

  // Buscar estatísticas do Supabase
  const [
    { count: songsCount },
    { count: playlistsCount },
    { count: starsCount },
    { count: submissionsCount },
    { data: moderationHistory },
  ] = await Promise.all([
    supabase.from('Song').select('*', { count: 'exact', head: true }).eq('createdById', id),
    supabase.from('Playlist').select('*', { count: 'exact', head: true }).eq('userId', id),
    supabase.from('StarredSong').select('*', { count: 'exact', head: true }).eq('userId', id),
    supabase.from('SongSubmission').select('*', { count: 'exact', head: true }).eq('userId', id),
    supabase.from('UserModeration').select('*').eq('userId', id).order('moderatedAt', { ascending: false }),
  ]);

  return NextResponse.json({
    supabase: {
      ...user,
      stats: {
        songs: songsCount || 0,
        playlists: playlistsCount || 0,
        stars: starsCount || 0,
        submissions: submissionsCount || 0,
      },
      moderationHistory: moderationHistory || [],
    },
    clerk: clerkUser ? {
      id: clerkUser.id,
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name,
      imageUrl: clerkUser.image_url,
      profileImageUrl: clerkUser.profile_image_url,
      hasImage: clerkUser.has_image,
      primaryEmailAddress: clerkUser.email_addresses?.find((e: any) => e.id === clerkUser.primary_email_address_id),
      emailAddresses: clerkUser.email_addresses,
      primaryPhoneNumber: clerkUser.phone_numbers?.find((p: any) => p.id === clerkUser.primary_phone_number_id),
      phoneNumbers: clerkUser.phone_numbers,
      externalAccounts: clerkUser.external_accounts,
      publicMetadata: clerkUser.public_metadata,
      privateMetadata: clerkUser.private_metadata,
      unsafeMetadata: clerkUser.unsafe_metadata,
      lastSignInAt: clerkUser.last_sign_in_at,
      lastActiveAt: clerkUser.last_active_at,
      createdAt: clerkUser.created_at,
      updatedAt: clerkUser.updated_at,
      banned: clerkUser.banned,
      locked: clerkUser.locked,
      twoFactorEnabled: clerkUser.two_factor_enabled,
      totpEnabled: clerkUser.totp_enabled,
      backupCodeEnabled: clerkUser.backup_code_enabled,
      passwordEnabled: clerkUser.password_enabled,
      createOrganizationEnabled: clerkUser.create_organization_enabled,
      deleteSelfEnabled: clerkUser.delete_self_enabled,
    } : null,
    sessions: clerkSessions?.data?.map((s: any) => ({
      id: s.id,
      status: s.status,
      lastActiveAt: s.last_active_at,
      expireAt: s.expire_at,
      abandonAt: s.abandon_at,
      clientId: s.client_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })) || [],
    isLinked: !!user.clerkUserId,
  });
}, {
  requiredRole: 'ADMIN',
  logAction: 'admin_user_detail_view',
  actionDescription: 'Visualização detalhada de utilizador',
});
