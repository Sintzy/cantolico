'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen bg-gray-50 -mt-16 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/missas" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Nova Missa</h1>
            <p className="text-gray-600 mt-1">
              Cria uma nova missa e adiciona os cânticos para cada momento
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações da Missa</CardTitle>
                <CardDescription>
                  Preenche os detalhes da celebração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Missa *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Missa do 1º Domingo do Advento"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Celebration */}
                <div className="space-y-2">
                  <Label htmlFor="celebration">Celebração</Label>
                  <Input
                    id="celebration"
                    placeholder="Ex: 1º Domingo do Advento"
                    value={formData.celebration}
                    onChange={(e) => setFormData(prev => ({ ...prev, celebration: e.target.value }))}
                  />
                </div>

                {/* Liturgical Color */}
                <div className="space-y-2">
                  <Label htmlFor="liturgicalColor">Cor Litúrgica</Label>
                  <Select
                    value={formData.liturgicalColor}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      liturgicalColor: value as LiturgicalColor 
                    }))}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="parish" className="flex items-center gap-2">
                    <Church className="w-4 h-4" />
                    Paróquia/Local
                  </Label>
                  <Input
                    id="parish"
                    placeholder="Ex: Paróquia de São João"
                    value={formData.parish}
                    onChange={(e) => setFormData(prev => ({ ...prev, parish: e.target.value }))}
                  />
                </div>

                {/* Celebrant */}
                <div className="space-y-2">
                  <Label htmlFor="celebrant" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Celebrante
                  </Label>
                  <Input
                    id="celebrant"
                    placeholder="Ex: Padre António"
                    value={formData.celebrant}
                    onChange={(e) => setFormData(prev => ({ ...prev, celebrant: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Notas/Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Notas adicionais sobre a missa..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilidade</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      visibility: value as MassVisibility 
                    }))}
                  >
                    <SelectTrigger>
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/missas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Missa
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
