'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getClerkSession } from '@/lib/api-middleware';
import { syncLiturgicalCalendar } from '@/lib/liturgical-calendar-store';

const adminPath = '/admin/dashboard/liturgia';

function syncErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const payload = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const parts = [payload.message, payload.details, payload.hint]
      .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()));
    if (parts.length) return `${typeof payload.code === 'string' ? `${payload.code}: ` : ''}${parts.join(' — ')}`;
  }

  return 'O servidor não devolveu detalhes sobre a falha.';
}

export async function syncLiturgicalCalendarAction() {
  const session = await getClerkSession();
  if (!session || session.user.role !== 'ADMIN') redirect('/sign-in');

  let result: { calendarDays: number; generatedDays: number; generatedSuggestions: number };
  try {
    result = await syncLiturgicalCalendar();
  } catch (error) {
    console.error('Erro ao sincronizar a liturgia a partir do painel administrativo:', error);
    const message = syncErrorMessage(error);
    redirect(`${adminPath}?error=${encodeURIComponent(`Não foi possível sincronizar: ${message}`)}`);
  }

  revalidatePath('/sugestoes');
  revalidatePath(adminPath);

  const params = new URLSearchParams({
    success: '1',
    calendarDays: String(result.calendarDays),
    generatedDays: String(result.generatedDays),
    generatedSuggestions: String(result.generatedSuggestions),
  });
  redirect(`${adminPath}?${params}`);
}
