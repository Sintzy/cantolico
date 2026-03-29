"use client";

import React from "react";
import { Mail, Github, Instagram, ArrowUpRight } from "lucide-react";
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
    <footer className="mt-8 border-t border-slate-200/80 bg-white/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 text-sm text-slate-600 md:flex-row md:justify-between">
        {/* Brand & Description */}
        <div className="space-y-3 md:max-w-xs">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src={Icons.SITE_IMAGES.logo} alt="Cantólico" width={28} height={28} />
            <span className="text-xl font-bold tracking-tight text-slate-900">Can♱ólico!</span>
          </Link>
          <p className="max-w-[280px] leading-relaxed text-slate-500">
            Encontra, submete e partilha cânticos católicos. Um projeto aberto para servir a liturgia com música de qualidade.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">Navegação</h4>
          <ul className="space-y-2">
            <li><Link href="/musics" className="transition-colors hover:text-rose-600">Músicas</Link></li>
            <li><Link href="/musics/create" className="transition-colors hover:text-rose-600">Nova Música</Link></li>
            <li><Link href="/playlists/explore" className="transition-colors hover:text-rose-600">Playlists Públicas</Link></li>
            <li><Link href="/terms" className="transition-colors hover:text-rose-600">Termos & Condições</Link></li>
            <li><Link href="/privacy-policy" className="transition-colors hover:text-rose-600">Política de Privacidade</Link></li>
          </ul>
        </div>

        {/* Contacto & Meta */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">Contacto</h4>
          <a href="mailto:miguel@cantolico.pt" className="flex items-center gap-2 transition-colors hover:text-rose-600">
            <Mail className="h-4 w-4" />
            miguel@cantolico.pt
          </a>

          <div className="flex gap-4 pt-1">
            <a href="https://github.com/sintzy/cantolico" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors hover:text-slate-900">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
            <a href="https://instagram.com/cantolicoo" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors hover:text-slate-900">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </a>
          </div>

          <div className="pt-2 text-[11px] leading-relaxed text-slate-400">
            commit{' '}
            <a
              href={fullCommit ? `https://github.com/sintzy/cantolico/commit/${fullCommit}` : "https://github.com/sintzy/cantolico"}
              target="_blank"
              rel="noreferrer"
              className="font-mono transition-colors hover:text-slate-700 hover:underline"
            >
              {commit}
            </a>
            {' '}on branch <span className="font-mono">{branch}</span> from about {timeAgo || 'recentemente'}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200/60 py-4" data-nosnippet>
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} Cantólico!. Todos os direitos reservados.
            <span className="mx-2 text-slate-300">|</span>
            Made with <span className="text-rose-500">❤️</span> by{' '}
            <a
              href="https://github.com/sintzy"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              miguel
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
