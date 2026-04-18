'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1c1917' }}>Algo correu mal</h2>
        <button
          onClick={() => reset()}
          style={{ padding: '8px 20px', borderRadius: '8px', background: '#c0392b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
