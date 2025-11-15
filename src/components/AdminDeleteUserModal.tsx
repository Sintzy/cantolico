"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type Props = {
  userId: string;
  userName: string;
  onSuccess?: () => void;
};

export default function AdminDeleteUserModal({ userId, userName, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [deleteSongs, setDeleteSongs] = useState(false);
  const [deletePlaylists, setDeletePlaylists] = useState(false);
  const [deleteStars, setDeleteStars] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete-with-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { deleteSongs, deletePlaylists, deleteStars } }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Erro ao apagar utilizador');
      }

      const data = await res.json();
      toast.success('Utilizador apagado com sucesso');
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Apagar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar utilizador: {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Escolha o que pretende apagar do utilizador.</p>
          <div className="flex items-center gap-3">
            <Checkbox checked={deleteSongs} onCheckedChange={(v) => setDeleteSongs(Boolean(v))} /> <span>Apagar músicas</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={deletePlaylists} onCheckedChange={(v) => setDeletePlaylists(Boolean(v))} /> <span>Apagar playlists</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={deleteStars} onCheckedChange={(v) => setDeleteStars(Boolean(v))} /> <span>Apagar favoritos</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? 'A apagar...' : 'Apagar utilizador'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
