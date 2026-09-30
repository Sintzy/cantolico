import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminProtection } from '@/lib/enhanced-api-protection';
import { adminSupabase } from '@/lib/supabase-admin';
import { generatePartnerApiKey } from '@/lib/partner-api';

const createKeySchema = z.object({
  name: z.string().trim().min(2, 'Indica um nome para o cliente.').max(80),
  rateLimit: z.coerce.number().int().min(1).max(10_000).default(120),
  expiresAt: z.string().datetime().nullable().optional(),
});

function toKeySummary(key: any) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes || [],
    rateLimit: key.rateLimit,
    isActive: key.isActive,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

export const GET = withAdminProtection<any>(async () => {
  const { data, error } = await adminSupabase
    .from('PartnerApiKey')
    .select('id,name,keyPrefix,scopes,rateLimit,isActive,expiresAt,lastUsedAt,createdAt,updatedAt')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[ADMIN_PARTNER_API_KEYS_LIST]', error);
    return NextResponse.json({ error: 'Não foi possível carregar as credenciais da API.' }, { status: 500 });
  }

  return NextResponse.json({ data: (data || []).map(toKeySummary) });
}, {
  logAction: 'partner_api_keys_view',
  actionDescription: 'Visualização das credenciais da API de parceiros',
});

export const POST = withAdminProtection<any>(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'O corpo do pedido deve ser JSON válido.' }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Os dados da credencial não são válidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { key, prefix, hash } = generatePartnerApiKey();
  const { data, error } = await adminSupabase
    .from('PartnerApiKey')
    .insert({
      name: parsed.data.name,
      secretHash: hash,
      keyPrefix: prefix,
      scopes: ['songs:read'],
      rateLimit: parsed.data.rateLimit,
      expiresAt: parsed.data.expiresAt || null,
      createdById: session.user.id,
    })
    .select('id,name,keyPrefix,scopes,rateLimit,isActive,expiresAt,lastUsedAt,createdAt,updatedAt')
    .single();

  if (error || !data) {
    console.error('[ADMIN_PARTNER_API_KEYS_CREATE]', error);
    return NextResponse.json({ error: 'Não foi possível criar a credencial.' }, { status: 500 });
  }

  // `key` is intentionally included only in this response. It is never stored
  // and therefore cannot be retrieved later.
  return NextResponse.json({ data: toKeySummary(data), key }, { status: 201 });
}, {
  logAction: 'partner_api_key_create',
  actionDescription: 'Criação de uma credencial de leitura para a API de parceiros',
});
