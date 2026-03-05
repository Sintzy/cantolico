
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function ExportMassPage() {
  const params = useParams();
  const massId = params.id as string;
  return (
    <div className="min-h-screen bg-gray-50 -mt-16 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/missas/${massId}`} className="flex items-center gap-2">
              Voltar
            </Link>
          </Button>
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-900">Funcionalidade em Beta</CardTitle>
              </div>
              <CardDescription className="text-amber-800">
                A exportação de missas ainda não está disponível
              </CardDescription>
            </CardHeader>
            <CardContent className="text-amber-900">
              <p>O sistema de exportação de missas está temporariamente desativado enquanto aprimoramos este recurso.</p>
              <p className="mt-3">Por favor, volta à página da missa ou acede a outras funcionalidades disponíveis.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
