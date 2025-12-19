import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public endpoint to fetch a song's files (PDFs/MP3s).
 * Uses the same underlying data as the admin endpoint, but without requiring admin auth.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  try {
    // The admin endpoint resolves slug->uuid; do the same here.
    const { data: song, error: songError } = await supabase
      .from('Song')
      .select('id, slug')
      .or(`slug.eq.${id},id.eq.${id}`)
      .single();

    if (songError || !song) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    // Match the schema used throughout the project (see admin song files endpoint):
    // - Song has currentVersionId
    // - SongFile belongs to a version via songVersionId
    // - storage path column is fileKey
    const { data: songWithVersion, error: songWithVersionError } = await supabase
      .from('Song')
      .select('id, slug, currentVersionId')
      .eq('id', song.id)
      .single();

    if (songWithVersionError || !songWithVersion?.currentVersionId) {
      return NextResponse.json(
        { success: false, error: 'Song version not found' },
        { status: 404 }
      );
    }

    const { data: files, error: filesError } = await supabase
      .from('SongFile')
      .select('id, fileType, fileName, description, fileSize, fileKey, mimeType, isPrincipal, uploadedAt')
      .eq('songVersionId', songWithVersion.currentVersionId)
      .order('uploadedAt', { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { success: false, error: filesError.message },
        { status: 500 }
      );
    }

    // Sign URLs so the client can access private Supabase storage.
    let signedFiles = await Promise.all(
      (files || []).map(async (f: any) => {
        const key = f.fileKey as string | undefined;
        if (!key) return { ...f, signedUrl: null };

        const { data: signed, error: signError } = await supabase.storage
          .from('songs')
          .createSignedUrl(key, 60 * 60);

        return {
          ...f,
          signedUrl: signError ? null : signed?.signedUrl ?? null,
        };
      })
    );

    // Extra fallback (real-world): sometimes files exist in storage but SongFile rows are missing.
    // In that case, list the storage folder for the song and return signed URLs.
    if (!signedFiles || signedFiles.length === 0) {
      const { data: storageList, error: storageListError } = await supabase.storage
        .from('songs')
        .list(`songs/${songWithVersion.id}`, {
          limit: 200,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (!storageListError && storageList && storageList.length > 0) {
        const valid = storageList.filter((f) => {
          const name = f.name || '';
          if (!name) return false;
          if (name.startsWith('.')) return false;
          if (name.toLowerCase().endsWith('.json')) return false;
          const lower = name.toLowerCase();
          return (
            lower.endsWith('.pdf') ||
            lower.endsWith('.mp3') ||
            lower.endsWith('.wav') ||
            lower.endsWith('.ogg') ||
            lower.endsWith('.m4a')
          );
        });

        signedFiles = await Promise.all(
          valid.map(async (f) => {
            const filePath = `songs/${songWithVersion.id}/${f.name}`;
            const lower = f.name.toLowerCase();
            const fileType = lower.endsWith('.pdf') ? 'PDF' : 'AUDIO';
            const { data: signed, error: signError } = await supabase.storage
              .from('songs')
              .createSignedUrl(filePath, 60 * 60);

            return {
              id: `storage-${songWithVersion.id}-${f.name}`,
              fileType,
              fileName: f.name,
              description: f.name,
              fileKey: filePath,
              fileSize: (f.metadata as any)?.size ?? null,
              signedUrl: signError ? null : signed?.signedUrl ?? null,
            };
          })
        );
      }
    }

    // Fallback: if the song has no SongFile entries, return the legacy single PDF/audio
    // stored on SongVersion (sourcePdfKey/mediaUrl) so the public page can still render.
    if (!signedFiles || signedFiles.length === 0) {
      const { data: version, error: versionError } = await supabase
        .from('SongVersion')
        .select('id, sourcePdfKey, mediaUrl')
        .eq('id', songWithVersion.currentVersionId)
        .single();

      if (!versionError && version) {
        const fallback: any[] = [];

        if (version.sourcePdfKey) {
          const { data: signed, error: signError } = await supabase.storage
            .from('songs')
            .createSignedUrl(version.sourcePdfKey, 60 * 60);
          fallback.push({
            id: `legacy-pdf-${version.id}`,
            fileType: 'PDF',
            fileName: 'Partitura.pdf',
            description: 'Partitura',
            fileKey: version.sourcePdfKey,
            signedUrl: signError ? null : signed?.signedUrl ?? null,
          });
        }

        if (version.mediaUrl) {
          const { data: signed, error: signError } = await supabase.storage
            .from('songs')
            .createSignedUrl(version.mediaUrl, 60 * 60);
          fallback.push({
            id: `legacy-audio-${version.id}`,
            fileType: 'AUDIO',
            fileName: 'Audio.mp3',
            description: 'Áudio',
            fileKey: version.mediaUrl,
            signedUrl: signError ? null : signed?.signedUrl ?? null,
          });
        }

        signedFiles = fallback;
      }
    }

    return NextResponse.json({ success: true, files: signedFiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
