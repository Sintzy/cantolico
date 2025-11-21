import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sistema de Logs',
  description: 'Sistema completo de monitorização e análise de logs do Cantolico',
  robots: 'noindex, nofollow', // Não indexar páginas de admin
};

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="py-6">
        {children}
      </div>
    </div>
  );
}