"use client";

import React, { useEffect, useState } from 'react';

type HealthOkResponse = { ok: true; service: 'supabase' };
type HealthFailResponse = { ok: false; service: 'supabase'; error?: string };

type HealthResponse = HealthOkResponse | HealthFailResponse;

type Props = {
  children: React.ReactNode;
  /**
   * Tempo (ms) depois do primeiro render para fazer o health-check.
   * Objetivo: "carregar o essencial" primeiro.
   */
  delayMs?: number;
};

export default function MaintenanceGate({ children, delayMs = 1200 }: Props) {
  const [dbOk, setDbOk] = useState<null | boolean>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    const controller = new AbortController();

    timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/health/supabase', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        let json: HealthResponse | null = null;
        try {
          json = (await res.json()) as HealthResponse;
        } catch {
          // ignore
        }

        if (!res.ok || !json || json.ok !== true) {
          setDbOk(false);
          return;
        }

        setDbOk(true);
      } catch {
        setDbOk(false);
      }
    }, delayMs);

    return () => {
      controller.abort();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [delayMs]);

  // Enquanto não sabemos, deixamos o site funcionar.
  if (dbOk !== false) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-0px)] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border bg-background/80 backdrop-blur p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Serviço indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O Cantólico está temporariamente em manutenção ou sem ligação à base de dados.
            Por favor tenta novamente dentro de alguns minutos.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
            <a
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              href="/"
            >
              Ir para a home
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Se isto persistir, é provável que o nosso sistema esteja com problemas.
          </p>
        </div>
      </div>
    </div>
  );
}
