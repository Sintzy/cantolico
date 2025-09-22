"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
          <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/30 to-purple-500/30 blur-[120px]" />
        </div>
        <div className="absolute left-1/4 top-2/3 -translate-x-1/2">
          <div className="h-60 w-60 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-[100px]" />
        </div>
        <div className="absolute right-1/4 top-1/4 -translate-x-1/2">
          <div className="h-40 w-40 rounded-full bg-gradient-to-tr from-orange-400/25 to-yellow-400/25 blur-[80px]" />
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center space-y-8 min-h-screen">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6">
            <div className="-mx-0.5 flex justify-center py-3">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Music className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-bold text-gray-900 mb-4 drop-shadow-lg">
            404
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 drop-shadow-lg">
              Página não encontrada
            </h2>
            <p className="text-lg text-gray-900 mb-8 drop-shadow-lg font-medium">
              Ooops... A página que procuras não existe ou foi movida. Confirma se o endereço está correto ou volta ao início para explorar mais cânticos.
            </p>
          </div>
        </div>

        {/* Action Card */}
        <Card className="border-0 shadow-2xl bg-white/50 backdrop-blur-lg max-w-md w-full ring-1 ring-white/20">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg"
              >
                <Link href="/">
                  Voltar à página principal
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full bg-white/70 text-gray-800 hover:bg-white/80 backdrop-blur-sm border-white/30 shadow-md"
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
