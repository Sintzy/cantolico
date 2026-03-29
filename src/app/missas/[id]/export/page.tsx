
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ExportMassPanel from '@/components/ExportMassPanel';

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
          <ExportMassPanel massId={massId} />
        </div>
      </div>
    </div>
  );
}
