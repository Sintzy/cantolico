'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, Church, Loader2, User } from 'lucide-react';
import {
  MassVisibility,
  LITURGICAL_COLORS,
  LITURGICAL_COLOR_LABELS,
  LiturgicalColor
} from '@/types/mass';

export default function CreateMassPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    parish: '',
    celebrant: '',
    celebration: '',
    liturgicalColor: '' as LiturgicalColor | '',
    visibility: 'PRIVATE' as MassVisibility,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('O nome da missa é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      // Combine date and time
      let dateTime = null;
      if (formData.date) {
        dateTime = formData.time
          ? `${formData.date}T${formData.time}:00`
          : `${formData.date}T10:00:00`;
      }

      const response = await fetch('/api/masses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          date: dateTime,
          parish: formData.parish.trim() || null,
          celebrant: formData.celebrant.trim() || null,
          celebration: formData.celebration.trim() || null,
          liturgicalColor: formData.liturgicalColor || null,
          visibility: formData.visibility,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar missa');
      }

      const mass = await response.json();
      toast.success('Missa criada com sucesso!');
      router.push(`/missas/${mass.id}`);
    } catch (error: any) {
      console.error('Error creating mass:', error);
      toast.error(error.message || 'Erro ao criar missa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">
          <Link href="/missas" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Missas
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-rose-700 text-sm">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Nova Missa</span>
          </div>
          <h1 className="font-display text-4xl text-stone-900 leading-tight">Criar Missa</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-sm font-semibold text-stone-900">Detalhes da Missa</h2>
              <p className="text-xs text-stone-500 mt-0.5">Preenche as informações sobre a celebração</p>
            </div>
            <div className="px-6 py-6 space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-stone-700 text-sm font-medium">Nome da Missa *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Missa do 1º Domingo do Advento"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-stone-700 text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-stone-700 text-sm font-medium">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Celebration */}
              <div className="space-y-2">
                <Label htmlFor="celebration" className="text-stone-700 text-sm font-medium">Celebração</Label>
                <Input
                  id="celebration"
                  placeholder="Ex: 1º Domingo do Advento"
                  value={formData.celebration}
                  onChange={(e) => setFormData(prev => ({ ...prev, celebration: e.target.value }))}
                  className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                />
              </div>

              {/* Liturgical Color */}
              <div className="space-y-2">
                <Label htmlFor="liturgicalColor" className="text-stone-700 text-sm font-medium">Cor Litúrgica</Label>
                <Select
                  value={formData.liturgicalColor}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    liturgicalColor: value as LiturgicalColor
                  }))}
                >
                  <SelectTrigger className="border-stone-200 bg-white rounded-lg text-stone-900 focus:ring-0 h-9">
                    <SelectValue placeholder="Selecionar cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {LITURGICAL_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{
                              backgroundColor: color === 'BRANCO' ? '#f5f5f5' :
                                color === 'VERDE' ? '#22c55e' :
                                color === 'ROXO' ? '#7c3aed' :
                                color === 'VERMELHO' ? '#ef4444' : '#ec4899'
                            }}
                          />
                          {LITURGICAL_COLOR_LABELS[color]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parish */}
              <div className="space-y-2">
                <Label htmlFor="parish" className="text-stone-700 text-sm font-medium flex items-center gap-2">
                  <Church className="w-4 h-4" />
                  Paróquia/Local
                </Label>
                <Input
                  id="parish"
                  placeholder="Ex: Paróquia de São João"
                  value={formData.parish}
                  onChange={(e) => setFormData(prev => ({ ...prev, parish: e.target.value }))}
                  className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                />
              </div>

              {/* Celebrant */}
              <div className="space-y-2">
                <Label htmlFor="celebrant" className="text-stone-700 text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Celebrante
                </Label>
                <Input
                  id="celebrant"
                  placeholder="Ex: Padre António"
                  value={formData.celebrant}
                  onChange={(e) => setFormData(prev => ({ ...prev, celebrant: e.target.value }))}
                  className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-stone-700 text-sm font-medium">Notas/Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Notas adicionais sobre a missa..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 focus-visible:ring-0 placeholder:text-stone-400"
                />
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label htmlFor="visibility" className="text-stone-700 text-sm font-medium">Visibilidade</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    visibility: value as MassVisibility
                  }))}
                >
                  <SelectTrigger className="border-stone-200 bg-white rounded-lg text-stone-900 focus:ring-0 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">
                      🔒 Privada - Só tu podes ver
                    </SelectItem>
                    <SelectItem value="NOT_LISTED">
                      👁 Não listada - Quem tiver o link pode ver
                    </SelectItem>
                    <SelectItem value="PUBLIC">
                      🌍 Pública - Todos podem ver e duplicar
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Link href="/missas" className="inline-flex items-center px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Cancelar
            </Link>
            <Button type="submit" disabled={isLoading} className="bg-stone-900 hover:bg-rose-700 transition-colors text-white">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar Missa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
