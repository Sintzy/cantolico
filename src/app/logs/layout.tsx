import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Sistema de Logs',
  description: 'Monitorização e análise de logs do Cantólico.',
  path: '/logs',
  index: false,
});

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