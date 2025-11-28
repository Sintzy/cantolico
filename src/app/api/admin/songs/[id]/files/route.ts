import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import { FileType } from '@/types/song-files';

/**
 * GET /api/admin/songs/[id]/files
 * Retorna todos os ficheiros de uma música
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params;

    // Buscar versão atual da música
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('currentVersionId')
      .eq('id', songId)
      .single();

    if (songError || !song?.currentVersionId) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    // Buscar todos os ficheiros da versão atual
    const { data: files, error: filesError } = await supabase
      .from('SongFile')
      .select('*')
      .eq('songVersionId', song.currentVersionId)
      .order('uploadedAt', { ascending: false });

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ error: 'Erro ao carregar ficheiros' }, { status: 500 });
    }

    // Gerar URLs assinadas para cada ficheiro (válidas por 1 hora)
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        try {
          const { data: signedUrlData } = await supabase.storage
            .from('songs')
            .createSignedUrl(file.fileKey, 3600);

          return {
            ...file,
            signedUrl: signedUrlData?.signedUrl || null
          };
        } catch (error) {
          console.error(`Error creating signed URL for ${file.fileKey}:`, error);
          return {
            ...file,
            signedUrl: null
          };
        }
      })
    );

    return NextResponse.json({ 
      success: true,
      files: filesWithUrls 
    });

  } catch (error) {
    console.error('Error in GET /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * POST /api/admin/songs/[id]/files
 * Upload de um novo ficheiro (PDF ou MP3)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: songId } = await params;
    const formData = await req.formData();
    
    const fileTypeStr = formData.get('fileType') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;

    if (!file || !fileTypeStr || !description?.trim()) {
      return NextResponse.json({ 
        error: 'Ficheiro, tipo e descrição são obrigatórios' 
      }, { status: 400 });
    }

    // Validar FileType
    if (!Object.values(FileType).includes(fileTypeStr as FileType)) {
      return NextResponse.json({ error: 'Tipo de ficheiro inválido' }, { status: 400 });
    }

    const fileType = fileTypeStr as FileType;

    // Validar tipo de ficheiro
    const isPdf = fileType === FileType.PDF;
    const isAudio = fileType === FileType.AUDIO;
    
    if (isPdf && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'Tipo de ficheiro inválido. Esperado: PDF' 
      }, { status: 400 });
    }
    
    if (isAudio && !file.type.includes('audio') && !file.name.toLowerCase().endsWith('.mp3')) {
      return NextResponse.json({ 
        error: 'Tipo de ficheiro inválido. Esperado: MP3' 
      }, { status: 400 });
    }

    // Validar tamanho (50MB para PDF, 20MB para áudio)
    const maxSize = isPdf ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `Ficheiro demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Buscar versão atual da música
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('currentVersionId')
      .eq('id', songId)
      .single();

    if (songError || !song?.currentVersionId) {
      return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });
    }

    // Gerar ID único para o ficheiro
    const fileId = crypto.randomUUID();
    const fileExtension = isPdf ? 'pdf' : 'mp3';
    const storagePath = `songs/${songId}/files/${fileId}.${fileExtension}`;
    
    // Converter File para Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(storagePath, fileBuffer, {
        contentType: isPdf ? 'application/pdf' : 'audio/mpeg',
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Erro ao fazer upload do ficheiro para o armazenamento' 
      }, { status: 500 });
    }

    // Criar registo na base de dados
    const { data: songFile, error: dbError } = await supabase
      .from('SongFile')
      .insert({
        id: fileId,
        songVersionId: song.currentVersionId,
        fileType: fileType,
        fileName: file.name,
        fileKey: storagePath,
        fileSize: file.size,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'audio/mpeg'),
        description: description.trim(),
        uploadedById: session.user.id,
        uploadedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: apagar ficheiro do storage
      console.error('Database insert error:', dbError);
      await supabase.storage.from('songs').remove([storagePath]);
      return NextResponse.json({ 
        error: 'Erro ao guardar informação do ficheiro na base de dados' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      file: songFile 
    });

  } catch (error) {
    console.error('Error in POST /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/songs/[id]/files
 * Elimina um ficheiro (query param: fileId)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'ID do ficheiro é obrigatório' }, { status: 400 });
    }

    // Buscar informação do ficheiro
    const { data: file, error: fetchError } = await supabase
      .from('SongFile')
      .select('fileKey')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 });
    }

    // Apagar do storage
    const { error: storageError } = await supabase.storage
      .from('songs')
      .remove([file.fileKey]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continuar mesmo com erro no storage
    }

    // Apagar da base de dados
    const { error: dbError } = await supabase
      .from('SongFile')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ error: 'Erro ao eliminar ficheiro' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/admin/songs/[id]/files:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
