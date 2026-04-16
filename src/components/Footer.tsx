"use client";

import React from "react";
import { Mail, Github, Instagram, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";

export default function Footer() {
  const commit =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) ||
    "dev";
  const fullCommit =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    "";
  const branch =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ||
    process.env.NEXT_PUBLIC_BRANCH ||
    "local";

  const [timeAgo, setTimeAgo] = React.useState("");

  React.useEffect(() => {
    const calc = () => {
      const buildTimeStr = process.env.NEXT_PUBLIC_BUILD_TIME;
      if (!buildTimeStr) {
        setTimeAgo(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? "recentemente" : "");
        return;
      }
      const diff = Date.now() - new Date(buildTimeStr).getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (diff < 60000) setTimeAgo("agora mesmo");
      else if (mins < 60) setTimeAgo(`há ${mins} min`);
      else if (hours < 24) setTimeAgo(`há ${hours} h`);
      else setTimeAgo(`há ${days} d`);
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-screen-xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">

          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src={Icons.SITE_IMAGES.logo} alt="Cantólico" width={26} height={26} />
              <span className="text-base font-semibold text-stone-900 tracking-tight">
                Can<span className="text-rose-700">♱</span>ólico!
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-stone-500">
              Biblioteca colaborativa para descobrir, organizar e partilhar cânticos católicos em português.
            </p>
            <div className="font-mono text-xs text-stone-400" data-nosnippet>
              <a
                href={fullCommit ? `https://github.com/sintzy/cantolico/commit/${fullCommit}` : "https://github.com/sintzy/cantolico"}
                target="_blank"
                rel="noreferrer"
                className="hover:text-rose-700 hover:underline transition-colors"
              >
                {commit}
              </a>
              {" · "}
              <span>{branch}</span>
              {timeAgo && ` · ${timeAgo}`}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-900">
              Navegação
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/musics", label: "Músicas" },
                { href: "/musics/create", label: "Nova Música" },
                { href: "/playlists/explore", label: "Playlists Públicas" },
                { href: "/terms", label: "Termos e Condições" },
                { href: "/privacy-policy", label: "Privacidade" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-stone-500 transition-colors hover:text-stone-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-900">
              Contacto
            </h4>
            <div className="space-y-3">
              <a
                href="mailto:miguel@cantolico.pt"
                className="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-900"
              >
                <Mail className="h-3.5 w-3.5" />
                miguel@cantolico.pt
              </a>
              <div className="flex gap-2 pt-1">
                <a
                  href="https://github.com/sintzy/cantolico"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
                >
                  <Github className="h-3 w-3" />
                  GitHub
                </a>
                <a
                  href="https://instagram.com/cantolicoo"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
                >
                  <Instagram className="h-3 w-3" />
                  Instagram
                </a>
              </div>
              <a
                href="https://github.com/sintzy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-stone-400 transition-colors hover:text-stone-600"
              >
                Criado por miguel
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-stone-100 pt-6" data-nosnippet>
          <span className="text-xs text-stone-400">
            © {new Date().getFullYear()} Cantólico. Todos os direitos reservados.
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="text-rose-700 text-xs leading-none">✝</span>
            Qui bene cantat, bis orat
          </span>
        </div>
      </div>
    </footer>
  );
}
