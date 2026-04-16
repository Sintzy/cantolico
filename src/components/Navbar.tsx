"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "@/hooks/useClerkSession";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";
import UserAvatar from "./ui/user-avatar";
import {
  ChevronDown,
  Church,
  Crown,
  Eye,
  Globe,
  Heart,
  ListMusic,
  LogOut,
  Menu,
  Music,
  Plus,
  Search,
  X,
} from "lucide-react";

type MusicResult = { id: string; title: string };

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);
  const playlistsRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (playlistsRef.current && !playlistsRef.current.contains(e.target as Node)) setPlaylistsOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    const onScroll = () => setScrolled(window.scrollY > 8);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/musics/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSearchResults(Array.isArray(data?.songs) ? data.songs : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const role = session?.user?.role;
  const showAdmin = role === "ADMIN";
  const showReview = role === "ADMIN" || role === "REVIEWER";
  const close = () => { setMobileOpen(false); setPlaylistsOpen(false); setUserOpen(false); setSearchQuery(""); };

  const linkCls = "flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors";

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-shadow duration-200 bg-white ${scrolled ? "border-b border-stone-200 shadow-sm" : "border-b border-stone-100"}`}>
      <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-4 px-5">

        {/* Logo */}
        <Link href="/" onClick={close} className="flex items-center gap-2 shrink-0 mr-2">
          <Image src={Icons.SITE_IMAGES.logo} alt="Cantólico" width={26} height={26} />
          <span className="hidden sm:inline text-base font-semibold text-stone-900 tracking-tight">
            Can<span className="text-rose-700">♱</span>ólico!
          </span>
          <span className="hidden sm:inline text-[10px] font-semibold tracking-wide text-stone-400 bg-stone-100 rounded px-1 py-0.5 leading-none select-none">v2</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          <Link href="/musics" prefetch={false} onClick={close} className={linkCls}>
            <Music className="h-3.5 w-3.5" />
            Músicas
          </Link>

          <div className="relative" ref={playlistsRef}>
            <button
              onClick={() => setPlaylistsOpen(v => !v)}
              aria-expanded={playlistsOpen}
              aria-haspopup="menu"
              className={linkCls}
            >
              <ListMusic className="h-3.5 w-3.5" />
              Playlists
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${playlistsOpen ? "rotate-180" : ""}`} />
            </button>
            {playlistsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/50 overflow-hidden" role="menu">
                <Link href="/playlists/explore" prefetch={false} onClick={close} className="flex items-center gap-2.5 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50">
                  <Globe className="h-3.5 w-3.5 text-stone-400" />
                  Playlists públicas
                </Link>
                {session?.user ? (
                  <Link href="/playlists" prefetch={false} onClick={close} className="flex items-center gap-2.5 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 border-t border-stone-100">
                    <Heart className="h-3.5 w-3.5 text-stone-400" />
                    Minhas playlists
                  </Link>
                ) : (
                  <Link href="/sign-in" prefetch={false} onClick={close} className="flex items-center gap-2.5 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 border-t border-stone-100">
                    <Heart className="h-3.5 w-3.5 text-stone-400" />
                    Iniciar sessão
                  </Link>
                )}
              </div>
            )}
          </div>

          {session?.user && (
            <Link href="/missas" prefetch={false} onClick={close} className={linkCls}>
              <Church className="h-3.5 w-3.5" />
              Missas
            </Link>
          )}

          <Link href="/musics/create" prefetch={false} onClick={close} className={linkCls}>
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Link>

          {showAdmin && (
            <Link href="/admin/dashboard" prefetch={false} onClick={close} className={linkCls}>
              <Crown className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
          {showReview && (
            <Link href="/admin/review" prefetch={false} onClick={close} className={linkCls}>
              <Eye className="h-3.5 w-3.5" />
              Revisão
            </Link>
          )}
        </nav>

        {/* Search + auth */}
        <div className="hidden lg:flex items-center gap-2.5 ml-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar cânticos..."
              className="h-9 w-52 rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white transition-colors"
            />
            {searchQuery.trim() && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/50 overflow-hidden">
                {isSearching ? (
                  <p className="px-4 py-3 text-sm text-stone-500">A procurar...</p>
                ) : searchResults.length ? (
                  searchResults.slice(0, 6).map(r => (
                    <Link key={r.id} href={`/musics/${r.id}`} onClick={close} className="block border-b border-stone-100 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 last:border-0">
                      {r.title}
                    </Link>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-stone-500">Nenhum resultado encontrado.</p>
                )}
              </div>
            )}
          </div>

          {session?.user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(v => !v)}
                aria-expanded={userOpen}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1.5 hover:bg-stone-50 transition-colors"
              >
                <UserAvatar user={{ name: session.user.name || "Utilizador", image: session.user.image }} size={24} />
                <ChevronDown className={`h-3 w-3 text-stone-500 transition-transform duration-200 ${userOpen ? "rotate-180" : ""}`} />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/50 overflow-hidden" role="menu">
                  <div className="border-b border-stone-100 px-4 py-3">
                    <p className="text-sm font-semibold text-stone-900 truncate">{session.user.name || "Utilizador"}</p>
                    <p className="text-xs text-stone-500 truncate">{session.user.email}</p>
                  </div>
                  <Link href="/starred-songs" onClick={close} className="flex items-center gap-2.5 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50">
                    <Heart className="h-3.5 w-3.5 text-stone-400" />
                    Favoritos
                  </Link>
                  <button
                    onClick={() => { close(); signOut({ callbackUrl: "/" }); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-stone-100"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Terminar sessão
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" prefetch={false} className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
                Entrar
              </Link>
              <Link href="/sign-up" prefetch={false} className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-rose-700 transition-colors duration-200">
                Criar conta
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          className="ml-auto lg:hidden inline-flex items-center justify-center rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div ref={mobileRef} className="lg:hidden border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-screen-xl px-5 py-4 space-y-1">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar cânticos..."
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm text-stone-800 outline-none"
              />
            </div>
            {searchQuery.trim() && (
              <div className="mb-3 rounded-xl border border-stone-200 overflow-hidden">
                {isSearching ? <p className="px-4 py-3 text-sm text-stone-500">A procurar...</p>
                  : searchResults.length ? searchResults.slice(0, 5).map(r => (
                    <Link key={r.id} href={`/musics/${r.id}`} onClick={close} className="block border-b border-stone-100 px-4 py-3 text-sm text-stone-700 last:border-0">{r.title}</Link>
                  )) : <p className="px-4 py-3 text-sm text-stone-500">Nenhum resultado.</p>}
              </div>
            )}
            {[
              { href: "/musics", icon: Music, label: "Músicas" },
              { href: "/playlists/explore", icon: Globe, label: "Playlists públicas" },
              ...(session?.user ? [{ href: "/playlists", icon: Heart, label: "Minhas playlists" }] : [{ href: "/sign-in", icon: Heart, label: "Iniciar sessão" }]),
              ...(session?.user ? [{ href: "/missas", icon: Church, label: "Missas" }] : []),
              { href: "/musics/create", icon: Plus, label: "Nova música" },
              ...(session?.user ? [{ href: "/starred-songs", icon: Heart, label: "Favoritos" }] : []),
              ...(showAdmin ? [{ href: "/admin/dashboard", icon: Crown, label: "Admin" }] : []),
              ...(showReview ? [{ href: "/admin/review", icon: Eye, label: "Revisão" }] : []),
            ].map(item => (
              <Link key={item.href} href={item.href} prefetch={false} onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <item.icon className="h-4 w-4 text-stone-400" />
                {item.label}
              </Link>
            ))}
            {!session?.user ? (
              <div className="border-t border-stone-100 pt-3 mt-2 flex gap-2">
                <Link href="/sign-in" prefetch={false} onClick={close} className="flex-1 text-center py-2.5 text-sm font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50">Entrar</Link>
                <Link href="/sign-up" prefetch={false} onClick={close} className="flex-1 text-center py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-rose-700 transition-colors">Criar conta</Link>
              </div>
            ) : (
              <div className="border-t border-stone-100 pt-3 mt-2">
                <button onClick={() => { close(); signOut({ callbackUrl: "/" }); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
