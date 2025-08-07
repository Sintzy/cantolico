import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, path } = body;

    // Verificar secret de segurança
    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 401 }
      );
    }

    // Revalidar o path especificado
    const pathToRevalidate = path || '/sitemap.xml';
    revalidatePath(pathToRevalidate);

    console.log(`✅ Revalidado: ${pathToRevalidate}`);

    return NextResponse.json({
      revalidated: true,
      path: pathToRevalidate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro na revalidação:', error);
    return NextResponse.json(
      { message: 'Erro interno', error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
