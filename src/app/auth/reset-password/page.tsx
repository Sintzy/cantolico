"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token de redefinição ausente');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) return toast.error('A password deve ter pelo menos 8 caracteres');
    if (password !== confirm) return toast.error('As passwords não coincidem');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        toast.success('Password atualizada com sucesso. Pode fazer login.');
        router.push('/auth/login');
      } else {
        const data = await res.json();
        toast.error(data?.error || 'Erro ao redefinir a password');
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
      <h1 className="text-2xl font-bold mb-4">Definir nova palavra-passe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="password" placeholder="Nova password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="password" placeholder="Confirmar password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'A processar...' : 'Definir password'}</Button>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto py-12">
        <h1 className="text-2xl font-bold mb-4">Definir nova palavra-passe</h1>
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
