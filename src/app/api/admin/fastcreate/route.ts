import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { formatTagsForPostgreSQL } from '@/lib/utils';
import { getClerkSession } from '@/lib/api-middleware';
import { FileType } from '@/types/song-files';

async function uploadToSupabase(path: string, file: Buffer | string, contentType: string): Promise<boolean> {
  const { error } = await supabase.storage.from('songs').upload(path, file, { contentType });
  if (error) {
    console.error(`Erro ao enviar ficheiro: ${error.message}`);
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getClerkSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'REVIEWER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formData = await req.formData();

    const title = formData.get('title')?.toString().trim() ?? '';
    const author = formData.get('author')?.toString().trim() || null;

    const rawType = formData.get('type')?.toString() ?? '';
    const typeMap: Record<string, string> = {
      Acordes: 'ACORDES',
      Partitura: 'PARTITURA',
      ACORDES: 'ACORDES',
      PARTITURA: 'PARTITURA',
    };
    const type = (typeMap[rawType] ?? rawType.toUpperCase()) as 'ACORDES' | 'PARTITURA';
    const instrument = formData.get('instrument')?.toString() ?? 'GUITARRA';
    const capo = parseInt(formData.get('capo')?.toString() ?? '0') || 0;
    const markdown = formData.get('markdown')?.toString() ?? '';
    const spotifyLink = formData.get('spotifyLink')?.toString().trim() || null;
    const youtubeLink = formData.get('youtubeLink')?.toString().trim() || null;

    const tagString = formData.get('tags')?.toString() ?? '';
    const tags = formatTagsForPostgreSQL(
      tagString.split(',').map((t) => t.trim()).filter(Boolean)
    );

    let moments: string[] = [];
    try {
      moments = JSON.parse(formData.get('moments')?.toString() ?? '[]');
    } catch {
      return NextResponse.json({ error: 'Momentos inválidos' }, { status: 400 });
    }

    if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    if (!instrument) return NextResponse.json({ error: 'Instrumento é obrigatório' }, { status: 400 });
    if (moments.length === 0) return NextResponse.json({ error: 'Seleciona pelo menos um momento litúrgico' }, { status: 400 });
    if (type === 'ACORDES' && !markdown.trim()) return NextResponse.json({ error: 'Letra/acordes é obrigatória para o tipo Acordes' }, { status: 400 });

    // Generate unique slug
    const baseSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').substring(0, 50);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase.from('Song').select('id').eq('slug', slug).single();
      if (!existing) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const songId = randomUUID();

    const { data: newSong, error: songError } = await supabase
      .from('Song')
      .insert({
        id: songId,
        title,
        author,
        slug,
        type,
        mainInstrument: instrument,
        capo: capo > 0 ? capo : null,
        moments,
        tags,
      })
      .select('id, slug')
      .single();

    if (songError || !newSong) {
      console.error('Erro ao criar música:', songError);
      return NextResponse.json({ error: 'Erro ao criar música', details: songError?.message }, { status: 500 });
    }

    const versionId = randomUUID();
    const sourceText = type === 'ACORDES' ? markdown.trim() : '';

    const { data: newVersion, error: versionError } = await supabase
      .from('SongVersion')
      .insert({
        id: versionId,
        songId: newSong.id,
        versionNumber: 1,
        sourceType: type === 'ACORDES' ? 'MARKDOWN' : 'PDF',
        sourceText,
        lyricsPlain: sourceText,
        renderedHtml: '',
        createdById: session.user.id,
        spotifyLink,
        youtubeLink,
      })
      .select('id')
      .single();

    if (versionError || !newVersion) {
      console.error('Erro ao criar versão:', versionError);
      await supabase.from('Song').delete().eq('id', newSong.id);
      return NextResponse.json({ error: 'Erro ao criar versão da música', details: versionError?.message }, { status: 500 });
    }

    await supabase.from('Song').update({ currentVersionId: newVersion.id }).eq('id', newSong.id);

    // Process files
    const filesJson = formData.get('files')?.toString();
    if (filesJson) {
      try {
        const parsedFiles: { fileType: FileType; fileName: string; description: string; fileSize: number }[] = JSON.parse(filesJson);

        for (let i = 0; i < parsedFiles.length; i++) {
          const meta = parsedFiles[i];
          const file = formData.get(`file_${i}`) as File | null;
          if (!file) continue;

          const fileBuffer = Buffer.from(await file.arrayBuffer());

          // Validate magic bytes
          if (meta.fileType === 'PDF') {
            if (fileBuffer.slice(0, 5).toString('ascii') !== '%PDF-') continue;
          } else if (meta.fileType === 'AUDIO') {
            const b = fileBuffer;
            const valid =
              (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) ||
              (b[0] === 0xFF && (b[1] === 0xFB || b[1] === 0xF3 || b[1] === 0xF2)) ||
              (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) ||
              (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) ||
              (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70);
            if (!valid) continue;
          }

          const ext = meta.fileName.split('.').pop();
          const fileId = randomUUID();
          const storagePath = `songs/${songId}/${fileId}.${ext}`;
          const mimeType = meta.fileType === 'PDF' ? 'application/pdf' : 'audio/mpeg';

          const uploaded = await uploadToSupabase(storagePath, fileBuffer, mimeType);
          if (!uploaded) continue;

          await supabase.from('SongFile').insert({
            id: fileId,
            songVersionId: newVersion.id,
            fileType: meta.fileType,
            fileName: meta.fileName,
            description: meta.description,
            fileKey: storagePath,
            fileSize: meta.fileSize,
            mimeType,
            isPrincipal: i === 0,
            uploadedById: session.user.id,
          });
        }
      } catch (err) {
        console.error('Erro ao processar ficheiros:', err);
      }
    }

    return NextResponse.json({ success: true, songId: newSong.id, slug: newSong.slug });
  } catch (error) {
    console.error('Erro em fastcreate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
