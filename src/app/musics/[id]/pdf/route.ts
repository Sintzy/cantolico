import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { logGeneral, logErrors } from '@/lib/logs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await logGeneral('INFO', 'Geração de PDF iniciada', 'Utilizador solicitou PDF de música', {
      musicId: id,
      action: 'pdf_generation_request'
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); 
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 16;
    const text = "Função em manutenção, pedimos desculpa pelo incómodo";
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(text, {
      x: (width - textWidth) / 2, 
      y: (height - textHeight) / 2, 
      size: fontSize,
      font,
      color: rgb(0, 0, 0), // preto
    });

    const pdfBytes = await pdfDoc.save();

    await logGeneral('SUCCESS', 'PDF gerado com sucesso', 'PDF de manutenção criado e enviado', {
      musicId: id,
      action: 'pdf_generated'
    });
    
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="manutencao.pdf"`,
      },
    });
  } catch (error) {
    const resolvedParams = await params;
    await logErrors('ERROR', 'Erro na geração de PDF', 'Falha durante criação do PDF', {
      musicId: resolvedParams?.id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      action: 'pdf_generation_error'
    });
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
  }
}