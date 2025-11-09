"use client";

import React from "react";
import { Mail, Github, Music, Instagram } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";

export default function Footer() {
  // Vercel provides these automatically, fallback to custom env vars for local dev
  const commit = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 
                 process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) || "dev";
  const fullCommit = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 
                     process.env.NEXT_PUBLIC_COMMIT_SHA || "";
  const branch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || 
                 process.env.NEXT_PUBLIC_BRANCH || "local";

  // Get commit/build time with React state for client-side rendering
  const [timeAgo, setTimeAgo] = React.useState('');

  React.useEffect(() => {
    const calculateTimeAgo = () => {
      let referenceTime: Date;
      
      // Try to use our custom build time first (works for both Vercel and local)
      const buildTimeStr = process.env.NEXT_PUBLIC_BUILD_TIME;
      if (buildTimeStr) {
        referenceTime = new Date(buildTimeStr);
      } else if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
        // Fallback for Vercel deployments without build time
        // Use a more reasonable estimate or fetch from GitHub API
        setTimeAgo('recentemente');
        return;
      } else {
        // No build time available
        setTimeAgo('tempo desconhecido');
        return;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - referenceTime.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const diffMonths = Math.floor(diffDays / 30);
      
      let result: string;
      if (diffMs < 60000) result = ' 1 min ago';
      else if (diffMinutes < 60) result = `${diffMinutes} min ago`;
      else if (diffHours < 24) result = `${diffHours} h ago`;
      else if (diffDays < 30) result = `${diffDays} d ago`;
      else result = `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;

      setTimeAgo(result);
    };

    calculateTimeAgo();
    // Update every minute
    const interval = setInterval(calculateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-700">
        {/* Coluna 1: Sobre */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={Icons.SITE_IMAGES.logo} alt="Logo" width={30} height={30} />
              <span className="text-xl font-semibold text-gray-800">Can♱ólico!</span>
            </Link>
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
            <li><Link href="/privacy-policy" className="hover:underline">Política de Privacidade</Link></li>
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
            <a href="https://github.com/sintzy/cantolico" target="_blank" rel="noreferrer">
              <Github className="h-5 w-5 hover:text-gray-900" />
            </a>
            <a href="https://instagram.com/cantolicoo" target="_blank" rel="noreferrer">
              <Instagram className="h-5 w-5 hover:text-pink-600" />
            </a>
            
          </div>
          <p className="text-xs text-gray-500 mt-4">
            commit{' '}
            <a 
              href={`https://github.com/sintzy/cantolico/commit/${fullCommit}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:text-blue-600 hover:underline cursor-pointer"
            >
              {commit}
            </a>
            {' '}on branch <span className="font-mono">{branch}</span> from about {timeAgo}
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-100" data-nosnippet>
        © {new Date().getFullYear()} Cantólico!. Todos os direitos reservados. | Made with ❤️ by <a href="https://github.com/sintzy" className="text-blue-600 hover:underline">miguel</a>
      </div>
      
    </footer>
  );
}
