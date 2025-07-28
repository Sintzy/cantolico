"use client";

import { Mail, Github, Music, Instagram } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) || "dev";
  const branch = process.env.NEXT_PUBLIC_BRANCH || "local";

  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-700">
        {/* Coluna 1: Sobre */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <Music className="h-5 w-5" />
            Can♱ólico!
          </h4>
          <p>
            Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.
          </p>
        </div>

        {/* Coluna 2: Navegação */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-base">Navegação</h4>
          <ul className="space-y-1">
            <li><Link href="/musics" className="hover:underline">Músicas</Link></li>
            <li><Link href="/musics/createnew" className="hover:underline">Nova Música</Link></li>
            <li><Link href="/terms" className="hover:underline">Termos & Condições</Link></li>
          </ul>
        </div>

        {/* Coluna 3: Contacto & Social */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-base">Contacto</h4>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <a href="mailto:miguel@cantolico.pt" className="hover:underline">miguel@cantolico.pt</a>
          </p>
          <div className="flex gap-4 mt-2">
            <a href="https://github.com/sintzy" target="_blank" rel="noreferrer">
              <Github className="h-5 w-5 hover:text-gray-900" />
            </a>
            <a href="https://instagram.com/loading" target="_blank" rel="noreferrer">
              <Instagram className="h-5 w-5 hover:text-pink-600" />
            </a>
            
          </div>
          <p className="text-xs text-gray-500 mt-4">
            commit <span className="font-mono">{commit}</span> on branch <span className="font-mono">{branch}</span>
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-100">
        © {new Date().getFullYear()} Cantólico!. Todos os direitos reservados. | Made with ❤️ by <a href="https://github.com/sintzy" className="text-blue-600 hover:underline">miguel</a>
      </div>
      
    </footer>
  );
}
