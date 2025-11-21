'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import AdminDeleteUserModal from './AdminDeleteUserModal';

type Summary = {
  songs: any[];
  playlists: any[];
  stars: any[];
  sessions: any[];
  logs: any[];
  counts: { [k: string]: number };
};

export default function AdminUserPanel({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  // AdminDeleteUserModal manages its own open state via DialogTrigger

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/admin/users/${userId}/summary`).then(async (res) => {
      if (!res.ok) {
        setSummary(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSummary(data);
      setLoading(false);
    }).catch(() => { setLoading(false); setSummary(null); });
  }, [open, userId]);

  async function handleSendReset() {
    await fetch(`/api/admin/users/${userId}/send-reset`, { method: 'POST' });
    // TODO: show toast
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Actions</Button>
  {open && (
        <div className="admin-user-panel fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg w-[90%] max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">User Actions</h3>
              <div>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted">{userEmail}</p>
              {loading && <p>Loading...</p>}
              {!loading && summary && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-medium">Counts</h4>
                    <ul>
                      <li>Songs: {summary.counts.songs}</li>
                      <li>Playlists: {summary.counts.playlists}</li>
                      <li>Stars: {summary.counts.stars}</li>
                      <li>Sessions: {summary.counts.sessions}</li>
                      <li>Logs: {summary.counts.logs}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Recent</h4>
                    <div className="space-y-2">
                      <div>
                        <strong>Songs</strong>
                        <ul>
                          {summary.songs.map(s => <li key={s.id}>{s.title}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong>Playlists</strong>
                        <ul>
                          {summary.playlists.map(p => <li key={p.id}>{p.title}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={handleSendReset}>Send Reset Email</Button>
              <AdminDeleteUserModal userId={userId} userName={userEmail || userId} onSuccess={() => { setOpen(false); }} />
            </div>
          </div>
        </div>
      )}

    </>
  );
}
