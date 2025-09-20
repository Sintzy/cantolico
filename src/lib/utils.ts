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

/**
 * Extrai o IP real do cliente a partir dos headers da requisição
 * Verifica múltiplos headers para obter o IP verdadeiro
 */
export function getClientIP(headers: any): string {
  // Verificar x-forwarded-for (proxy/load balancer)
  const forwarded = headers?.get?.('x-forwarded-for') || headers?.['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for pode conter múltiplos IPs separados por vírgula
    // O primeiro é normalmente o IP do cliente
    const ips = forwarded.split(',').map((ip: string) => ip.trim());
    for (const ip of ips) {
      if (isValidPublicIP(ip)) {
        return ip;
      }
    }
  }

  // Verificar x-real-ip
  const realIP = headers?.get?.('x-real-ip') || headers?.['x-real-ip'];
  if (realIP && isValidPublicIP(realIP)) {
    return realIP;
  }

  // Verificar cf-connecting-ip (Cloudflare)
  const cfIP = headers?.get?.('cf-connecting-ip') || headers?.['cf-connecting-ip'];
  if (cfIP && isValidPublicIP(cfIP)) {
    return cfIP;
  }

  // Verificar x-client-ip
  const clientIP = headers?.get?.('x-client-ip') || headers?.['x-client-ip'];
  if (clientIP && isValidPublicIP(clientIP)) {
    return clientIP;
  }

  return 'unknown';
}

/**
 * Verifica se um IP é público (não local/privado)
 */
function isValidPublicIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  
  // Remover espaços e verificar formato básico de IP
  ip = ip.trim();
  
  // Verificar se é IPv4 válido
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    // Se não for IPv4, pode ser IPv6 - aceitar por enquanto
    return ip.includes(':') && ip.length > 7;
  }

  const parts = ip.split('.').map(Number);
  
  // Verificar se cada parte está no range válido
  if (parts.some(part => part < 0 || part > 255)) {
    return false;
  }

  // Excluir ranges privados/locais
  // 127.x.x.x (localhost)
  if (parts[0] === 127) return false;
  
  // 10.x.x.x (private)
  if (parts[0] === 10) return false;
  
  // 172.16.x.x - 172.31.x.x (private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  
  // 192.168.x.x (private)
  if (parts[0] === 192 && parts[1] === 168) return false;
  
  // 169.254.x.x (link-local)
  if (parts[0] === 169 && parts[1] === 254) return false;
  
  // 0.0.0.0
  if (parts.every(part => part === 0)) return false;

  return true;
}
