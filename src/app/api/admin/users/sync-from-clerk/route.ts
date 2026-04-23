import { NextRequest, NextResponse } from 'next/server';
import { withAdminProtection } from '@/lib/enhanced-api-protection';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export const POST = withAdminProtection<any>(async (request: NextRequest) => {
  const { clerkUserId } = await request.json();

  if (!clerkUserId?.trim()) {
    return NextResponse.json({ error: 'clerkUserId é obrigatório' }, { status: 400 });
  }

  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
  if (!CLERK_SECRET_KEY) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY não configurada' }, { status: 500 });
  }

  // Buscar utilizador no Clerk
  const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId.trim()}`, {
    headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
  });

  if (!clerkRes.ok) {
    const err = await clerkRes.json();
    return NextResponse.json({ error: 'Utilizador não encontrado no Clerk', details: err }, { status: 404 });
  }

  const clerkUser = await clerkRes.json();
  const email = clerkUser.email_addresses?.[0]?.email_address;
  const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || null;
  const image = clerkUser.image_url || null;

  if (!email) {
    return NextResponse.json({ error: 'Utilizador no Clerk não tem email' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Verificar se já existe pelo clerkUserId ou email
  const { data: existing } = await supabase
    .from('User')
    .select('id, role, clerkUserId, email')
    .or(`clerkUserId.eq.${clerkUserId},email.eq.${email}`)
    .single();

  let userId: number;
  let role: string;

  if (existing) {
    // Atualizar registo existente
    const { error: updateError } = await supabase
      .from('User')
      .update({
        clerkUserId: clerkUserId,
        name,
        image,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar utilizador', details: updateError }, { status: 500 });
    }

    userId = existing.id;
    role = existing.role;
  } else {
    // Criar novo utilizador
    const { data: newUser, error: insertError } = await supabase
      .from('User')
      .insert({
        clerkUserId,
        email,
        name,
        image,
        role: 'USER',
        emailVerified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newUser) {
      return NextResponse.json({ error: 'Erro ao criar utilizador', details: insertError }, { status: 500 });
    }

    userId = newUser.id;
    role = newUser.role;
  }

  // Atualizar metadata no Clerk
  const metaRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: { role, supabaseUserId: userId },
    }),
  });

  if (!metaRes.ok) {
    const metaErr = await metaRes.json();
    // Utilizador foi criado mas metadata falhou — não é fatal
    return NextResponse.json({
      success: true,
      userId,
      warning: 'Utilizador sincronizado mas metadata do Clerk falhou',
      metaError: metaErr,
    });
  }

  return NextResponse.json({
    success: true,
    userId,
    email,
    role,
    action: existing ? 'updated' : 'created',
  });
}, {
  requiredRole: 'ADMIN',
  logAction: 'admin_sync_clerk_user',
  actionDescription: 'Sincronizar utilizador do Clerk',
});
