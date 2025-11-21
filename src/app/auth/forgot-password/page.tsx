"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success('Se o e-mail existir, receberá instruções para redefinir a password.');
        setEmail('');
      } else {
        const data = await res.json();
        toast.error(data?.error || 'Erro ao solicitar redefinição');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de rede');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Redefinir palavra-passe</h1>
      <p className="text-sm text-muted-foreground mb-6">Insira o seu e-mail e enviaremos um link para redefinir a palavra-passe.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="seu@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'A enviar...' : 'Enviar link de redefinição'}</Button>
          <Link href="/auth/login" className="text-sm text-muted-foreground">Voltar ao login</Link>
        </div>
      </form>
    </div>
  );
}
