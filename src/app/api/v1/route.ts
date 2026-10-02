import { NextRequest, NextResponse } from 'next/server';
import { partnerApiData, partnerApiHeaders, withPartnerApiAuth } from '@/lib/partner-api';

export async function GET(request: NextRequest) {
  const access = await withPartnerApiAuth(request);
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
        liturgical_suggestions: {
          get: '/api/v1/liturgical-suggestions?date=YYYY-MM-DD',
        },
      },
      authentication: {
        schemes: ['Authorization: Bearer <api_key>', 'X-API-Key: <api_key>'],
        scopes: ['songs:read'],
      },
      license: 'O conteúdo deve manter a atribuição de autoria e respeitar as condições de uso do Can♱ólico.',
    },
    { headers: partnerApiHeaders(access.auth) },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
