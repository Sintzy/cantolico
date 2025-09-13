import { supabase } from "@/lib/supabase-client";

/**
 * Converte um título numa slug URL-friendly
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove acentos
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Substitui espaços e caracteres especiais por hífens
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    // Remove hífens múltiplos
    .replace(/-+/g, "-")
    // Remove hífens no início e fim
    .replace(/^-|-$/g, "");
}

/**
 * Gera uma slug única para uma música
 * Se já existir, adiciona um sufixo numérico
 */
export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const baseSlug = titleToSlug(title);
  
  if (!baseSlug) {
    throw new Error("Não foi possível gerar uma slug válida para este título");
  }

  // Verifica se a slug base já existe
  let query = (supabase as any)
    .from('Song')
    .select('id', { count: 'exact' })
    .like('slug', `${baseSlug}%`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count } = await query;

  if (!count || count === 0) {
    return baseSlug;
  }

  // Se existir, procura o próximo número disponível
  let counter = 1;
  let slugCandidate = `${baseSlug}-${counter}`;
  
  while (true) {
    let existingQuery = (supabase as any)
      .from('Song')
      .select('id')
      .eq('slug', slugCandidate);

    if (excludeId) {
      existingQuery = existingQuery.neq('id', excludeId);
    }

    const { data: existing } = await existingQuery.single();

    if (!existing) {
      return slugCandidate;
    }

    counter++;
    slugCandidate = `${baseSlug}-${counter}`;
  }
}

/**
 * Encontra uma música pela slug
 */
export async function findSongBySlug(slug: string) {
  const { data: song, error } = await (supabase as any)
    .from('Song')
    .select(`
      *,
      currentVersion:SongVersion!Song_currentVersionId_fkey(
        *,
        createdBy:User!SongVersion_createdById_fkey(name)
      )
    `)
    .eq('slug', slug)
    .single();

  if (error) return null;
  return song;
}

/**
 * Atualiza a slug de uma música existente
 */
export async function updateSongSlug(songId: string, newTitle: string): Promise<string> {
  const newSlug = await generateUniqueSlug(newTitle, songId);
  
  const { error } = await (supabase as any)
    .from('Song')
    .update({ slug: newSlug })
    .eq('id', songId);

  if (error) throw error;
  return newSlug;
}
