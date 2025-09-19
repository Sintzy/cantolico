import { NextRequest, NextResponse } from 'next/server';

// ================================================
// API PARA OBTER INFORMAÇÕES DO CLIENTE
// ================================================

export async function GET(req: NextRequest) {
  try {
    // Obter IP do cliente
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';

    // Obter outros headers úteis
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const acceptLanguage = req.headers.get('accept-language') || 'unknown';
    const referer = req.headers.get('referer') || null;
    const origin = req.headers.get('origin') || null;

    // Tentar obter geolocalização (simplificado)
    let geoData: any = null;
    try {
      if (ip && ip !== 'unknown' && !ip.startsWith('192.168.') && !ip.startsWith('127.')) {
        // Em produção, você pode usar um serviço como ipapi.co
        // const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        // geoData = await geoResponse.json();
      }
    } catch (error) {
      // Geolocalização opcional - não falha se não conseguir
    }

    const clientInfo = {
      ip,
      userAgent,
      acceptLanguage,
      referer,
      origin,
      timestamp: new Date().toISOString(),
      
      // Headers de segurança
      xForwardedFor: forwarded,
      xRealIp: realIp,
      
      // Geolocalização (se disponível)
      country: geoData?.country_name || null,
      city: geoData?.city || null,
      region: geoData?.region || null,
      timezone: geoData?.timezone || null,
      
      // Informações adicionais de segurança
      isp: geoData?.org || null,
      asn: geoData?.asn || null
    };

    return NextResponse.json(clientInfo);

  } catch (error) {
    console.error('Erro ao obter informações do cliente:', error);
    
    return NextResponse.json({
      ip: 'error',
      userAgent: 'error',
      timestamp: new Date().toISOString(),
      error: 'Erro ao obter informações do cliente'
    });
  }
}