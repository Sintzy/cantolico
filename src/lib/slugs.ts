import { prisma } from "@/lib/prisma";

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
  const existingCount = await prisma.song.count({
    where: {
      slug: {
        startsWith: baseSlug
      },
      ...(excludeId && { id: { not: excludeId } })
    }
  });

  if (existingCount === 0) {
    return baseSlug;
  }

  // Se existir, procura o próximo número disponível
  let counter = 1;
  let slugCandidate = `${baseSlug}-${counter}`;
  
  while (true) {
    const existing = await prisma.song.findFirst({
      where: {
        slug: slugCandidate,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

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
  return await prisma.song.findUnique({
    where: { slug },
    include: {
      currentVersion: {
        include: {
          createdBy: {
            select: { name: true }
          }
        }
      }
    }
  });
}

/**
 * Atualiza a slug de uma música existente
 */
export async function updateSongSlug(songId: string, newTitle: string): Promise<string> {
  const newSlug = await generateUniqueSlug(newTitle, songId);
  
  await prisma.song.update({
    where: { id: songId },
    data: { slug: newSlug }
  });

  return newSlug;
}
