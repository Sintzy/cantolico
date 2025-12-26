'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GripVertical,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlaylistItem {
  id: string;
  order: number;
  songId: string;
  note?: string | null;
  song?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface PlaylistEditComponentProps {
  playlistId: string;
  items: PlaylistItem[];
  canEdit: boolean;
  onItemsChange?: (items: PlaylistItem[]) => void;
}

export default function PlaylistEditComponent({
  playlistId,
  items: initialItems,
  canEdit,
  onItemsChange
}: PlaylistEditComponentProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50');

    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    const targetIndex = items.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [draggedItemObj] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItemObj);

    // Atualizar as ordens
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setItems(updatedItems);
    setDraggedItem(null);

    // Notificar parent do novo estado (sem salvar ainda)
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  const saveReorder = async (itemsToSave: PlaylistItem[]) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToSave.map(item => ({
            id: item.id,
            order: item.order
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar ordem');
      }

      toast.success('Ordem atualizada com sucesso');
      onItemsChange?.(itemsToSave);
    } catch (error) {
      console.error('Error saving reorder:', error);
      toast.error('Erro ao atualizar ordem');
      setItems(initialItems);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNote = (item: PlaylistItem) => {
    setEditingItemId(item.id);
    setEditingNote(item.note || '');
    setNoteDialogOpen(true);
  };

  const saveNote = async () => {
    if (!editingItemId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/playlists/${playlistId}/items/${editingItemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: editingNote })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao salvar nota');
      }

      const updatedItems = items.map(item =>
        item.id === editingItemId ? { ...item, note: editingNote } : item
      );

      setItems(updatedItems);
      setNoteDialogOpen(false);
      setEditingItemId(null);
      toast.success('Nota atualizada com sucesso');
      onItemsChange?.(updatedItems);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Erro ao atualizar nota');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/playlists/${playlistId}/items/${itemId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao remover item');
      }

      const updatedItems = items
        .filter(item => item.id !== itemId)
        .map((item, index) => ({
          ...item,
          order: index + 1
        }));

      setItems(updatedItems);
      setDeleteConfirmId(null);
      toast.success('Música removida da playlist');
      onItemsChange?.(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover música');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canEdit || !session) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            className={cn(
              'flex items-center gap-3 p-3 bg-white border rounded-lg transition-all cursor-move hover:shadow-sm',
              draggedItem === item.id && 'opacity-50'
            )}
          >
            <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {item.song?.title || 'Música removida'}
              </p>
              {item.note && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  📝 {item.note}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditNote(item)}
                disabled={isLoading}
                title="Editar nota"
              >
                <Edit2 className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmId(item.id)}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Remover música"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog para editar nota */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Nota</DialogTitle>
            <DialogDescription>
              Adicione uma nota para esta música. Máximo de 500 caracteres.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value.slice(0, 500))}
              placeholder="Digite sua nota aqui..."
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />

            <div className="text-xs text-gray-500">
              {editingNote.length}/500
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setNoteDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>

              <Button
                onClick={saveNote}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover música da playlist?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A música será removida permanentemente da playlist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteItem(deleteConfirmId!)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
