"use client";

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import AdminUserPanel from './AdminUserPanel';
import { toast } from 'sonner';

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  onDeleted?: () => void;
};

export default function AdminUserActions({ userId, userName, userEmail, onDeleted }: Props) {
  const handleSendReset = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao enviar reset');
      toast.success('Email de redefinição enviado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar email de redefinição');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleSendReset} title="Enviar email de redefinição">
        <ExternalLink className="h-4 w-4" />
      </Button>
      <AdminUserPanel userId={userId} userEmail={userEmail} />
    </div>
  );
}
