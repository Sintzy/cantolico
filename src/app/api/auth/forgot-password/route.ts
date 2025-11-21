import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });

    // Find user
    const { data: user } = await supabase.from('User').select('id, email, name').eq('email', email).single();
    if (!user) {
      // Do not reveal existence
      return NextResponse.json({ success: true });
    }

    // Check if user has OAuth account (Google, etc.) - they don't have passwords
    const { data: accounts } = await supabase
      .from('Account')
      .select('provider')
      .eq('userId', user.id);
    
    if (accounts && accounts.length > 0) {
      // User has OAuth account(s) - no password to reset
      // Don't reveal this to prevent account enumeration
      console.log(`🚫 Password reset blocked for OAuth user: ${email} (providers: ${accounts.map(a => a.provider).join(', ')})`);
      
      return NextResponse.json({ success: true });
    }

    // Create a secure token and expiration
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token in VerificationToken table
    await supabase.from('VerificationToken').upsert({ identifier: user.email, token: resetToken, expires: expiresAt });

    // Send email
    await sendPasswordResetEmail(user.name || user.email, resetToken, '24 horas');

    console.log(`✅ Password reset email sent to ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
