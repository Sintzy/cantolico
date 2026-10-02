'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getClerkSession } from '@/lib/api-middleware';
import { syncLiturgicalCalendar } from '@/lib/liturgical-calendar-store';

const adminPath = '/admin/dashboard/liturgia';

export async function syncLiturgicalCalendarAction() {
  const session = await getClerkSession();
  if (!session || session.user.role !== 'ADMIN') redirect('/sign-in');

  let result: { calendarDays: number; generatedDays: number; generatedSuggestions: number };
  try {
    result = await syncLiturgicalCalendar();
  } catch (error) {
    console.error('Erro ao sincronizar a liturgia a partir do painel administrativo:', error);
    redirect(`${adminPath}?error=${encodeURIComponent('Não foi possível sincronizar. Confirma a ligação ao SNL e tenta novamente.')}`);
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
