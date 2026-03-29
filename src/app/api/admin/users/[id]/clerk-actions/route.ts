import { NextRequest, NextResponse } from 'next/server';
import { withAdminProtection } from '@/lib/enhanced-api-protection';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

// POST - Executar ações no Clerk
export const POST = withAdminProtection<any>(async (
  request: NextRequest,
  session,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await request.json();
  const { action, ...data } = body;

  const supabase = createAdminSupabaseClient();

  // Buscar utilizador do Supabase para obter clerkUserId
  const { data: user, error } = await supabase
    .from('User')
    .select('id, clerkUserId, email, name, role')
    .eq('id', id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
  }

  if (!user.clerkUserId) {
    return NextResponse.json({ error: 'Utilizador não está ligado ao Clerk' }, { status: 400 });
  }

  const clerkUserId = user.clerkUserId;

  switch (action) {
    case 'ban': {
      // Banir utilizador no Clerk
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ error: 'Erro ao banir utilizador', details: error }, { status: 500 });
      }

      // Atualizar metadata
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: { isBanned: true, bannedAt: new Date().toISOString(), bannedReason: data.reason },
        }),
      });

      // Registar moderação no Supabase
      await supabase.from('UserModeration').insert({
        userId: user.id,
        type: 'BAN',
        status: 'BANNED',
        reason: data.reason || 'Banido pelo administrador',
        moderatedById: session.user.id,
        moderatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: 'Utilizador banido' });
    }

    case 'unban': {
      // Desbanir utilizador no Clerk
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ error: 'Erro ao desbanir utilizador', details: error }, { status: 500 });
      }

      // Atualizar metadata
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: { isBanned: false, bannedAt: null, bannedReason: null },
        }),
      });

      // Registar no Supabase
      await supabase.from('UserModeration').insert({
        userId: user.id,
        type: 'UNBAN',
        status: 'ACTIVE',
        reason: 'Banimento removido pelo administrador',
        moderatedById: session.user.id,
        moderatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: 'Utilizador desbanido' });
    }

    case 'updateRole': {
      const { role } = data;
      if (!['USER', 'TRUSTED', 'REVIEWER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Role inválida' }, { status: 400 });
      }

      // Atualizar no Supabase
      await supabase.from('User').update({ role }).eq('id', id);

      // Atualizar metadata no Clerk
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: { role },
        }),
      });

      return NextResponse.json({ success: true, message: 'Role atualizada' });
    }

    case 'updateMetadata': {
      const { publicMetadata, privateMetadata } = data;

      const body: any = {};
      if (publicMetadata) body.public_metadata = publicMetadata;
      if (privateMetadata) body.private_metadata = privateMetadata;

      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ error: 'Erro ao atualizar metadata', details: error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Metadata atualizada' });
    }

    case 'revokeSession': {
      const { sessionId } = data;

      const response = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ error: 'Erro ao revogar sessão', details: error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Sessão revogada' });
    }

    case 'revokeAllSessions': {
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/sessions`, {
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      });

      if (response.ok) {
        const sessions = await response.json();
        for (const s of sessions.data || []) {
          await fetch(`https://api.clerk.com/v1/sessions/${s.id}/revoke`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            },
          });
        }
      }

      return NextResponse.json({ success: true, message: 'Todas as sessões revogadas' });
    }

    case 'deleteUser': {
      // Eliminar do Clerk
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json({ error: 'Erro ao eliminar utilizador do Clerk', details: error }, { status: 500 });
      }

      // Anonimizar no Supabase (mantém dados para integridade referencial)
      await supabase.from('User').update({
        email: `deleted_${user.id}@deleted.local`,
        name: 'Utilizador Eliminado',
        image: null,
        clerkUserId: null,
        passwordHash: null,
      }).eq('id', id);

      return NextResponse.json({ success: true, message: 'Utilizador eliminado' });
    }

    case 'verifyEmail': {
      const { emailId } = data;

      // Clerk não permite verificar emails diretamente via API
      // Mas podemos marcar como verificado no Supabase
      await supabase.from('User').update({
        emailVerified: new Date().toISOString(),
      }).eq('id', id);

      return NextResponse.json({ success: true, message: 'Email marcado como verificado no sistema' });
    }

    case 'impersonate': {
      // Criar token de impersonação (Clerk Enterprise feature)
      // Para versão gratuita, apenas retornamos um link para fazer login como o utilizador
      return NextResponse.json({
        success: false,
        message: 'Impersonação requer Clerk Enterprise',
        workaround: 'Use o email do utilizador para fazer login de teste'
      });
    }

    default:
      return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  }
}, {
  requiredRole: 'ADMIN',
  logAction: 'admin_user_action',
  actionDescription: 'Ação administrativa em utilizador',
});
