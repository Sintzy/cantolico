import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminProtection } from '@/lib/enhanced-api-protection';
import { adminSupabase } from '@/lib/supabase-admin';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();
const updateKeySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  rateLimit: z.coerce.number().int().min(1).max(10_000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, 'Indica pelo menos uma alteração.');

function validId(context: RouteContext) {
  return context.params.then(({ id }) => idSchema.safeParse(id));
}

export const PATCH = withAdminProtection<any>(async (request: NextRequest, _session, context: RouteContext) => {
  const parsedId = await validId(context);
  if (!parsedId.success) return NextResponse.json({ error: 'Credencial inválida.' }, { status: 422 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'O corpo do pedido deve ser JSON válido.' }, { status: 400 });
  }
  const parsed = updateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Os dados da credencial não são válidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { data, error } = await adminSupabase
    .from('PartnerApiKey')
    .update({ ...parsed.data, updatedAt: new Date().toISOString() })
    .eq('id', parsedId.data)
    .select('id,name,keyPrefix,scopes,rateLimit,isActive,expiresAt,lastUsedAt,createdAt,updatedAt')
    .maybeSingle();

  if (error) {
    console.error('[ADMIN_PARTNER_API_KEYS_UPDATE]', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a credencial.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Credencial não encontrada.' }, { status: 404 });

  return NextResponse.json({ data });
}, {
  logAction: 'partner_api_key_update',
  actionDescription: 'Atualização ou revogação de uma credencial da API de parceiros',
});

// A credencial fica registada para auditoria; DELETE é semanticamente uma revogação.
export const DELETE = withAdminProtection<any>(async (_request: NextRequest, _session, context: RouteContext) => {
  const parsedId = await validId(context);
  if (!parsedId.success) return NextResponse.json({ error: 'Credencial inválida.' }, { status: 422 });

  const { data, error } = await adminSupabase
    .from('PartnerApiKey')
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq('id', parsedId.data)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[ADMIN_PARTNER_API_KEYS_REVOKE]', error);
    return NextResponse.json({ error: 'Não foi possível revogar a credencial.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Credencial não encontrada.' }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}, {
  logAction: 'partner_api_key_revoke',
  actionDescription: 'Revogação de uma credencial da API de parceiros',
});
