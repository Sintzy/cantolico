import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte um array JavaScript para o formato de array PostgreSQL
 * @param tags Array de strings ou string já formatada
 * @returns String no formato {tag1,tag2,tag3} para PostgreSQL
 */
export function formatTagsForPostgreSQL(tags: string[] | string): string {
  if (!tags) return '{}';
  
  if (typeof tags === 'string') {
    // Se já é uma string, limpar e reformatar
    if (tags.startsWith('{') && tags.endsWith('}')) {
      // Já está no formato PostgreSQL, apenas limpar
      const cleaned = tags
        .replace(/[{}]/g, '')
        .split(',')
        .map(tag => tag.trim().toLowerCase().replace(/['"]/g, ''))
        .filter(tag => tag.length > 0);
      return `{${cleaned.join(',')}}`;
    }
    // Se é uma string simples, tratar como uma única tag
    const cleaned = tags.trim().toLowerCase().replace(/['"]/g, '');
    return cleaned ? `{${cleaned}}` : '{}';
  }
  
  if (Array.isArray(tags)) {
    const cleaned = tags
      .map(tag => String(tag).trim().toLowerCase().replace(/['"]/g, ''))
      .filter(tag => tag.length > 0);
    return `{${cleaned.join(',')}}`;
  }
  
  return '{}';
}

/**
 * Converte o formato PostgreSQL {tag1,tag2,tag3} para array JavaScript
 * @param tags String no formato PostgreSQL ou array
 * @returns Array de strings
 */
export function parseTagsFromPostgreSQL(tags: string | string[]): string[] {
  if (!tags) return [];
  
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0);
  }
  
  if (typeof tags === 'string') {
    return tags
      .replace(/[{}]/g, '')
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  
  return [];
}

/**
 * Converte um array de momentos litúrgicos para o formato PostgreSQL
 * @param moments Array de strings ou string já formatada
 * @returns String no formato {momento1,momento2,momento3} para PostgreSQL
 */
export function formatMomentsForPostgreSQL(moments: string[] | string): string {
  if (!moments) return '{}';
  
  if (typeof moments === 'string') {
    if (moments.startsWith('{') && moments.endsWith('}')) {
      const cleaned = moments
        .replace(/[{}]/g, '')
        .split(',')
        .map(moment => moment.trim().replace(/['"]/g, ''))
        .filter(moment => moment.length > 0);
      return `{${cleaned.join(',')}}`;
    }
    const cleaned = moments.trim().replace(/['"]/g, '');
    return cleaned ? `{${cleaned}}` : '{}';
  }
  
  if (Array.isArray(moments)) {
    const cleaned = moments
      .map(moment => String(moment).trim().replace(/['"]/g, ''))
      .filter(moment => moment.length > 0);
    return `{${cleaned.join(',')}}`;
  }
  
  return '{}';
}

/**
 * Converte o formato PostgreSQL {momento1,momento2,momento3} para array JavaScript
 * @param moments String no formato PostgreSQL ou array
 * @returns Array de strings
 */
export function parseMomentsFromPostgreSQL(moments: string | string[]): string[] {
  if (!moments) return [];
  
  if (Array.isArray(moments)) {
    return moments.map(moment => String(moment).trim()).filter(moment => moment.length > 0);
  }
  
  if (typeof moments === 'string') {
    return moments
      .replace(/[{}]/g, '')
      .split(',')
      .map(moment => moment.trim())
      .filter(moment => moment.length > 0);
  }
  
  return [];
}
