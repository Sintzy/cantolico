import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { SITE_IMAGES } from '@/lib/site-images';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Cântico Católico';
    const type = searchParams.get('type') || 'default'; // 'seo' para Google Search, 'default' para social
    
    // Configurações baseadas no tipo
    const config = type === 'seo' ? {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      brandColor: '#7c3aed',
    } : {
      backgroundColor: '#000000', 
      textColor: '#ffffff',
      brandColor: '#7c3aed',
    };

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: config.backgroundColor,
            color: config.textColor,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: config.brandColor,
              marginBottom: 40,
            }}
          >
            Can♱ólico!
          </div>

          <div
            style={{
              fontSize: title.length > 30 ? 48 : 64,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 20,
              maxWidth: '90%',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 24,
              color: '#d1d5db',
              textAlign: 'center',
            }}
          >
            Cântico Católico
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 40,
              fontSize: 18,
              color: '#9ca3af',
            }}
          >
            cantolico.pt
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`Failed to generate OG image: ${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
