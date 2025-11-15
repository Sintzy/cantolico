import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminSupabase as supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/user-action-logger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Find user
    const { data: user } = await supabaseAdmin.from('User').select('id, email, name').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check if user has OAuth account (Google, etc.) - they don't have passwords
    const { data: accounts } = await supabaseAdmin
      .from('Account')
      .select('provider')
      .eq('userId', user.id);
    
    if (accounts && accounts.length > 0) {
      // User has OAuth account(s) - no password to reset
      console.log(`🚫 Admin attempted password reset for OAuth user: ${user.email} (providers: ${accounts.map(a => a.provider).join(', ')})`);
      
      try { 
        await logAdminAction('admin_password_reset_blocked_oauth', { 
          targetUserId: user.id,
          targetEmail: user.email,
          providers: accounts.map(a => a.provider),
          reason: 'OAuth users do not have passwords'
        }, false); 
      } catch (e) { 
        console.warn('Failed to log OAuth password reset attempt', e); 
      }
      
      return NextResponse.json({ 
        error: 'Este utilizador tem login via OAuth (Google) e não possui senha para redefinir.' 
      }, { status: 400 });
    }

    // Create token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('VerificationToken').upsert({ identifier: user.email, token: resetToken, expires: expiresAt });

    await sendPasswordResetEmail(user.name || user.email, resetToken, '24 horas');

    try { await logAdminAction('admin_sent_password_reset', { targetUserId: user.id }, true); } catch (e) { console.warn('failed to log admin send reset', e); }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin send reset error', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
