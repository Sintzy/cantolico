import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { withUserProtection } from '@/lib/enhanced-api-protection';
import { canEditMass as canEditMassForMembership, findMembershipByEmail } from '@/lib/mass-collaboration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to check if user can edit mass
async function canEditMass(massId: string, userId: number, userEmail: string | undefined, userRole: string): Promise<boolean> {
  const { data: mass } = await supabase
    .from('Mass')
    .select('userId')
    .eq('id', massId)
    .single();

  if (!mass) return false;

  const { data: memberships, error } = await supabase
    .from('MassMember')
    .select('userEmail, role, status')
    .eq('massId', massId);

  if (error) return false;
  return canEditMassForMembership(mass.userId, userId, userRole, findMembershipByEmail(memberships, userEmail));
}

// PUT - Reorder items in a mass
export const PUT = withUserProtection<any>(async (request: NextRequest, session: any, context: RouteParams) => {
  try {
    const { id: massId } = await context.params;
    const body = await request.json();

    const { items }: { items: { id: string; order: number; moment?: string }[] } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items array é obrigatório' },
        { status: 400 }
      );
    }

    // Check permissions
    const canEdit = await canEditMass(massId, session.user.id, session.user.email, session.user.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Não tens permissão para editar esta missa' },
        { status: 403 }
      );
    }

    // Update each item's order (and optionally moment)
    const updates = items.map(item => {
      const updateData: any = { order: item.order };
      if (item.moment) {
        updateData.moment = item.moment;
      }
      
      return supabase
        .from('MassItem')
        .update(updateData)
        .eq('id', item.id)
        .eq('massId', massId);
    });

    const results = await Promise.all(updates);
    const failedUpdate = results.find(result => result.error);
    if (failedUpdate?.error) {
      console.error('Error reordering mass items:', failedUpdate.error);
      return NextResponse.json({ error: 'Erro ao reordenar os cânticos' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error reordering mass items:', error);
    return NextResponse.json(
      { error: 'Failed to reorder items' },
      { status: 500 }
    );
  }
});
