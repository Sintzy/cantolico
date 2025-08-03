/**
 * Utilitário simplificado para processar HTML gerado pelo markdown-it-chords
 * Mantém apenas o processamento básico sem adicionar classes complexas
 */

export function processChordHtml(html: string): string {
  // Se não tem HTML, retornar como está
  if (!html) {
    return html;
  }
  
  // Retornar o HTML como está - o CSS vai cuidar do posicionamento
  return html;
}
