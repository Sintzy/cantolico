import { NextRequest, NextResponse } from 'next/server';
import { partnerApiData, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';

export async function GET(request: NextRequest) {
  const access = withPartnerApiAuth(request);
  if (access.error) return access.error;

  return partnerApiData(
    {
      name: 'Can♱ólico Partner API',
      version: 'v1',
      description: 'Leitura do catálogo musical do Can♱ólico para integrações servidor-a-servidor.',
      resources: {
        songs: {
          list: '/api/v1/songs',
          get: '/api/v1/songs/{id_or_slug}',
        },
        admin_songs: {
          list_and_create: '/api/v1/admin/songs',
          update_and_delete: '/api/v1/admin/songs/{id}',
        },
      },
      authentication: {
        schemes: ['Authorization: Bearer <api_key>', 'X-API-Key: <api_key>'],
        scopes: ['songs:read', 'songs:write', 'songs:delete', 'admin:*'],
      },
      license: 'O conteúdo deve manter a atribuição de autoria e respeitar as condições de uso do Can♱ólico.',
    },
    { headers: partnerApiHeaders(access.auth) },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
