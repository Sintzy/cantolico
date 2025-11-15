import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase-client';
import bcrypt from 'bcryptjs';
import { logVerificationAction, getUserInfoFromRequest } from '@/lib/user-action-logger';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    // Look up token
    const { data: vt } = await supabase.from('VerificationToken').select('*').eq('token', token).single();
    if (!vt) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });

    const now = new Date();
    if (new Date(vt.expires) < now) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
    }

    // Find user by identifier
    const { data: user } = await supabase.from('User').select('id, email').eq('email', vt.identifier).single();
    if (!user) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });

    // Hash password and update using admin client
    const hashed = await bcrypt.hash(password, 10);
    await supabaseAdmin.from('User').update({ password: hashed }).eq('id', user.id);

    // Remove sessions and the token
    await supabaseAdmin.from('Session').delete().eq('user_id', user.id);
    await supabase.from('VerificationToken').delete().eq('token', token);

    try { await logVerificationAction('password_reset_completed', getUserInfoFromRequest(req), true, { userId: user.id }); } catch (e) { console.warn('failed to log reset completion', e); }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
