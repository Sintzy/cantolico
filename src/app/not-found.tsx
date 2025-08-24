"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
          <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[120px]" />
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center space-y-8 min-h-screen">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
            <div className="-mx-0.5 flex justify-center py-3">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Music className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-bold text-gray-900 mb-4 border-y [border-image:linear-gradient(to_right,transparent,theme(colors.slate.300/.8),transparent)1]">
            404
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Página não encontrada
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              Ooops... A página que procuras não existe ou foi movida. Confirma se o endereço está correto ou volta ao início para explorar mais cânticos.
            </p>
          </div>
        </div>

        {/* Action Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
              >
                <Link href="/">
                  Voltar à página principal
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full bg-white text-gray-800 hover:bg-gray-50"
              >
                <Link href="/musics">
                  Explorar Cânticos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
