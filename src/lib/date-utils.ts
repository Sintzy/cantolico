/**
 * Utilitários para formatação de datas consistente entre servidor e cliente
 * Evita erros de hidratação causados por diferenças de timezone/locale
 */

/**
 * Formata uma data de forma consistente entre servidor e cliente
 * @param date Data para formatar
 * @param options Opções de formatação
 * @returns Data formatada
 */
export function formatDate(
  date: string | Date,
  options: {
    locale?: string;
    timeZone?: string;
    year?: "numeric" | "2-digit";
    month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
    day?: "numeric" | "2-digit";
  } = {}
): string {
  const {
    locale = "pt-PT",
    timeZone = "UTC",
    year = "numeric",
    month = "long",
    day = "numeric",
  } = options;

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Garantir que a data é válida
    if (isNaN(dateObj.getTime())) {
      return "Data inválida";
    }

    return dateObj.toLocaleDateString(locale, {
      year,
      month,
      day,
      timeZone,
    });
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "Data inválida";
  }
}

/**
 * Formata uma data de forma relativa (ex: "há 2 dias")
 * @param date Data para formatar
 * @param locale Locale a usar
 * @returns Data formatada de forma relativa
 */
export function formatRelativeDate(
  date: string | Date,
  locale: string = "pt-PT"
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return "Data inválida";
    }

    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Hoje";
    } else if (diffInDays === 1) {
      return "Ontem";
    } else if (diffInDays < 30) {
      return `Há ${diffInDays} dias`;
    } else if (diffInDays < 365) {
      const diffInMonths = Math.floor(diffInDays / 30);
      return `Há ${diffInMonths} ${diffInMonths === 1 ? "mês" : "meses"}`;
    } else {
      const diffInYears = Math.floor(diffInDays / 365);
      return `Há ${diffInYears} ${diffInYears === 1 ? "ano" : "anos"}`;
    }
  } catch (error) {
    console.error("Erro ao formatar data relativa:", error);
    return "Data inválida";
  }
}