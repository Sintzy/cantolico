"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";


export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center space-y-6">
      <div className="flex items-center gap-3 text-black-600">
        <h1 className="text-9xl font-bold">404</h1>
      </div>

      <p className="text-muted-foreground text-lg max-w-xl">
        Ooops... A página que procuras não existe ou foi movida. Confirma se o endereço está correto ou volta ao início para explorar mais cânticos.
      </p>

      <Button asChild>
        <Link href="/">Voltar à página principal</Link>
      </Button>
    </div>
  );
}
