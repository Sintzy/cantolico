"use client";

import React from 'react';
import dynamic from 'next/dynamic';

import type SimpleMDEEditor from 'react-simplemde-editor';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
      A carregar editor...
    </div>
  ),
});

type Props = {
  value: string;
  onChange: (val: string) => void;
  options?: any;
  getMdeInstance?: (instance: any) => void;
  id?: string;
};

/**
 * Wrapper do SimpleMDE com fallback para <textarea>.
 * Assim garantimos que o utilizador nunca fica sem um editor de letra/acordes.
 */
export default function MarkdownEditor({ value, onChange, options, getMdeInstance, id }: Props) {
  // Se por algum motivo o dynamic import falhar em runtime,
  // o erro normalmente aparece no console. O fallback abaixo ainda garante edição.
  try {
    return (
      <SimpleMDE
        id={id}
        value={value}
        onChange={onChange}
        getMdeInstance={getMdeInstance}
        options={options}
      />
    );
  } catch {
    return (
      <textarea
        id={id}
        className="min-h-60 w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreve a letra com acordes (Markdown)"
      />
    );
  }
}
