import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

const ModerateUserSchema = z.object({
  action: z.enum(['WARNING', 'SUSPENSION', 'BAN']),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  moderatorNote: z.string().optional(),
  duration: z.number().optional(), // Duration in days for suspensions
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

  const { id: userId } = await params;
    const body = await request.json();
    const { action, reason, moderatorNote, duration   } = ModerateUserSchema.parse(body);

    // Get client IP address for audit log
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Calculate expiration date for suspensions
    let expiresAt = null;
    if (action === 'SUSPENSION' && duration) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + duration);
      expiresAt = expirationDate.toISOString();
    }

    // Map action to status
    const statusMap = {
      'WARNING': 'WARNING',
      'SUSPENSION': 'SUSPENDED', 
      'BAN': 'BANNED'
    };

    const status = statusMap[action];

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', parseInt(userId))
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Insert or update moderation record
    const { error: moderationError } = await supabase
      .from('UserModeration')
      .upsert({
        userId: parseInt(userId),
        status,
        type: action,
        reason,
        moderatorNote: moderatorNote || null,
  moderatedById: session.user.id,
        moderatedAt: new Date().toISOString(),
        expiresAt,
        ipAddress,
      }, {
        onConflict: 'userId'
      });

    if (moderationError) {
      console.error('Error creating moderation record:', moderationError);
      return NextResponse.json({ error: 'Erro ao aplicar moderação' }, { status: 500 });
    }

    // Log the moderation action
    console.log(`🛡️ [MODERATION] User ${targetUser.name} (${targetUser.email}) moderated by ${session.user.name}:`, {
      action,
      reason,
      moderatorNote,
      duration,
      expiresAt,
      ipAddress
    });

    return NextResponse.json({ 
      success: true,
      message: `Moderação ${action} aplicada com sucesso`
    });

  } catch (error) {
    console.error('Error moderating user:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

  const { id: userId } = await params;

    // Remove moderation (set status back to ACTIVE)
    const { error } = await supabase
      .from('UserModeration')
      .update({
        status: 'ACTIVE',
        type: null,
        reason: null,
        moderatorNote: null,
        expiresAt: null,
        moderatedAt: new Date().toISOString(),
        moderatedBy: session.user.id
      })
  .eq('userId', parseInt(userId));

    if (error) {
      console.error('Error removing moderation:', error);
      return NextResponse.json({ error: 'Erro ao remover moderação' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Moderação removida com sucesso'
    });

  } catch (error) {
    console.error('Error removing moderation:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
