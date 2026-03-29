"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";
import UserAvatar from "./ui/user-avatar";
import { toast } from "sonner";
import { 
  ChevronDown, 
  ListMusic, 
  Globe, 
  Lock, 
  Music, 
  Plus, 
  Shield, 
  Settings, 
  User, 
  LogOut,
  Search,
  Menu,
  X,
  Home,
  FileText,
  UserPlus,
  Crown,
  Eye,
  Star,
  Church
} from "lucide-react";

type Music = {
  id: string;
  title: string;
};

export default function Navbar() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const userRole = user?.publicMetadata?.role as string | undefined;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [playlistsMenuOpen, setPlaylistsMenuOpen] = useState(false);
    const [playlistsMenuSticky, setPlaylistsMenuSticky] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userMenuSticky, setUserMenuSticky] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Music[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const playlistsMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
                setUserMenuSticky(false);
            }
            if (playlistsMenuRef.current && !playlistsMenuRef.current.contains(event.target as Node)) {
                setPlaylistsMenuOpen(false);
                setPlaylistsMenuSticky(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    // Busca debounced
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setIsSearching(true);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (value.trim() === "") {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/musics/search?q=${encodeURIComponent(value)}&limit=10`);
                if (!res.ok) throw new Error('Erro ao pesquisar músicas');
                const data = await res.json();
                setSearchResults(data.songs || []);
            } catch (error) {
                setSearchResults([]);
            }
            setIsSearching(false);
        }, 400);
    };



    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <>
            {/* Floating Navbar */}
            <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95vw] max-w-6xl">
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className="px-5 py-3 flex items-center justify-between max-w-7xl mx-auto">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2 group shrink-0">
                            <div className="relative">
                                <Image 
                                    src={Icons.SITE_IMAGES.logo} 
                                    alt="Logo" 
                                    width={28} 
                                    height={28} 
                                    className="transition-transform group-hover:scale-110"
                                />
                            </div>
                            <span className="text-base font-black text-slate-900 hidden sm:inline">
                                Can♱ólico!
                            </span>
                        </Link>

                        {/* Desktop nav + Search */}
                        <div className="hidden lg:flex items-center gap-0.5">
                        <Link 
                            href="/musics" 
                            prefetch={false}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-100/50 transition-all duration-200 font-medium text-sm"
                        >
                            <Music className="h-4 w-4" />
                            <span>Músicas</span>
                        </Link>
                        
                        {/* Playlists Dropdown Menu */}
                        <div 
                            ref={playlistsMenuRef}
                            className="relative"
                            onMouseEnter={() => !playlistsMenuSticky && setPlaylistsMenuOpen(true)}
                            onMouseLeave={() => !playlistsMenuSticky && setPlaylistsMenuOpen(false)}
                        >
                            <button 
                                onClick={() => {
                                    if (playlistsMenuSticky) {
                                        setPlaylistsMenuSticky(false);
                                        setPlaylistsMenuOpen(false);
                                    } else {
                                        setPlaylistsMenuSticky(true);
                                        setPlaylistsMenuOpen(true);
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-orange-600 hover:bg-orange-100/50 transition-all duration-200 font-medium text-sm"
                            >
                                <ListMusic className="h-4 w-4" />
                                <span>Playlists</span>
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${playlistsMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {playlistsMenuOpen && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-lg shadow-lg z-50 overflow-hidden">
                                    <div className="py-1">
                                        <Link
                                            href="/playlists/explore"
                                            prefetch={false}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-orange-100/50 hover:text-orange-600 transition-colors"
                                            onClick={() => {
                                                setPlaylistsMenuOpen(false);
                                                setPlaylistsMenuSticky(false);
                                            }}
                                        >
                                            <div className="w-7 h-7 bg-orange-100 rounded-md flex items-center justify-center">
                                                <Globe className="h-3.5 w-3.5 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Públicas</div>
                                                <div className="text-xs text-gray-500">Descobrir</div>
                                            </div>
                                        </Link>
                                        
                                        {user ? (
                                            <Link
                                                href="/playlists"
                                                prefetch={false}
                                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-rose-100/50 hover:text-rose-600 transition-colors"
                                                onClick={() => {
                                                    setPlaylistsMenuOpen(false);
                                                    setPlaylistsMenuSticky(false);
                                                }}
                                            >
                                                <div className="w-7 h-7 bg-rose-100 rounded-md flex items-center justify-center">
                                                    <Lock className="h-3.5 w-3.5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">Minhas</div>
                                                    <div className="text-xs text-gray-500">Tuas coleções</div>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center">
                                                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-500">Minhas Playlists</div>
                                                        <Link href="/login" className="text-xs text-rose-600 hover:underline">
                                                            Login
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Missas Link */}
                        {user && (
                            <Link 
                                href="/missas" 
                                prefetch={false}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-purple-600 hover:bg-purple-100/50 transition-all duration-200 font-medium text-sm"
                            >
                                <Church className="h-4 w-4" />
                                <span>Missas</span>
                            </Link>
                        )}
                        
                        <Link 
                            href="/musics/create" 
                            prefetch={false}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-amber-600 hover:bg-amber-100/50 transition-all duration-200 font-medium text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nova</span>
                        </Link>
                        
                        {/* Admin/Reviewer Links */}
                        {userRole === "ADMIN" && (
                            <>
                                <Link 
                                    href="/admin/dashboard" 
                                    prefetch={false}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                    <Crown className="h-4 w-4" />
                                    <span className="font-medium">Admin</span>
                                </Link>
                                <Link 
                                    href="/admin/review" 
                                    prefetch={false}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                    <Eye className="h-4 w-4" />
                                    <span className="font-medium">Revisão</span>
                                </Link>
                            </>
                        )}
                        {userRole === "REVIEWER" && (
                            <Link 
                                href="/admin/review" 
                                prefetch={false}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                            >
                                <Eye className="h-4 w-4" />
                                <span className="font-medium">Revisão</span>
                            </Link>
                        )}

                        {/* Searchbar */}
                        <div className="relative ml-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar músicas..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200"
                                />
                            </div>
                            {searchQuery.trim() !== "" && (
                                <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg mt-2 z-50 overflow-hidden">
                                    {isSearching ? (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">A procurar...</div>
                                    ) : searchResults.length > 0 ? (
                                        <>
                                            {searchResults.slice(0, 5).map((result) => (
                                                <Link
                                                    key={result.id}
                                                    href={`/musics/${result.id}`}
                                                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setSearchQuery("")}
                                                >
                                                    <Music className="h-4 w-4 text-gray-400" />
                                                    <span>{result.title}</span>
                                                </Link>
                                            ))}
                                            {searchResults.length > 5 && (
                                                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
                                                    +{searchResults.length - 5} mais resultados...
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">Nenhum resultado encontrado.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Menu & Mobile Toggle */}
                    <div className="flex items-center gap-3">
                        {/* User Menu */}
                        {user ? (
                            <div 
                                ref={userMenuRef}
                                className="relative"
                                onMouseEnter={() => !userMenuSticky && setUserMenuOpen(true)}
                                onMouseLeave={() => !userMenuSticky && setUserMenuOpen(false)}
                            >
                                <button
                                    onClick={() => {
                                        if (userMenuSticky) {
                                            setUserMenuSticky(false);
                                            setUserMenuOpen(false);
                                        } else {
                                            setUserMenuSticky(true);
                                            setUserMenuOpen(true);
                                        }
                                    }}
                                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-all duration-200"
                                >
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-200 overflow-hidden">
                                        <UserAvatar 
                                            user={{
                                                name: user?.fullName || "Utilizador",
                                                image: user?.imageUrl
                                            }} 
                                            size={32} 
                                        />
                                    </div>
                                    <ChevronDown className={`h-3 w-3 text-gray-600 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''} hidden md:block`} />
                                </button>
                                
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-lg z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-gray-200 overflow-hidden">
                                                    <UserAvatar 
                                                        user={{
                                                            name: user?.fullName || "Utilizador",
                                                            image: user?.imageUrl
                                                        }} 
                                                        size={40} 
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user?.fullName}</div>
                                                    <div className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="py-2">
                                            <Link
                                                href={`/account`}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    setUserMenuSticky(false);
                                                }}
                                            >
                                                <Settings className="h-4 w-4" />
                                                A minha conta
                                            </Link>
                                            
                                            <Link
                                                href="/starred-songs"
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    setUserMenuSticky(false);
                                                }}
                                            >
                                                <Star className="h-4 w-4" />
                                                Músicas Favoritas
                                            </Link>
                                            
                                            {userRole === "ADMIN" && (
                                                <>
                                                    <Link
                                                        href="/admin/dashboard"
                                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                        onClick={() => {
                                                            setUserMenuOpen(false);
                                                            setUserMenuSticky(false);
                                                        }}
                                                    >
                                                        <Crown className="h-4 w-4" />
                                                        Dashboard Admin
                                                    </Link>
                                                    <Link
                                                        href="/admin/review"
                                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                        onClick={() => {
                                                            setUserMenuOpen(false);
                                                            setUserMenuSticky(false);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Painel Revisão
                                                    </Link>
                                                </>
                                            )}
                                            {userRole === "REVIEWER" && (
                                                <Link
                                                    href="/admin/review"
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        setUserMenuSticky(false);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Painel Revisão
                                                </Link>
                                            )}
                                            
                                            <hr className="my-2" />
                                            <button
                                                onClick={() => {
                                                    signOut();
                                                    setUserMenuOpen(false);
                                                    setUserMenuSticky(false);
                                                }}
                                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sair
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                <Link
                                    href="/sign-in"
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <User className="h-4 w-4" />
                                    Login
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
                </div>
            </nav>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-60 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeMobileMenu}
                    ></div>
                    
                    {/* Sidebar */}
                    <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 via-orange-50 to-yellow-50">
                            <div className="flex items-center space-x-2">
                                <Image 
                                    src={Icons.SITE_IMAGES.logo} 
                                    alt="Logo" 
                                    width={28} 
                                    height={28} 
                                />
                                <span className="text-base font-black text-slate-900">
                                    Can♱ólico!
                                </span>
                            </div>
                            <button
                                onClick={closeMobileMenu}
                                className="p-2 text-slate-500 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* User Info (if logged in) */}
                        {user && (
                            <div className="p-3 bg-slate-50 border-b border-slate-200/50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full border-2 border-slate-200 overflow-hidden">
                                        <UserAvatar 
                                            user={{
                                                name: user?.fullName || "Utilizador",
                                                image: user?.imageUrl
                                            }} 
                                            size={40} 
                                        />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{user?.fullName}</div>
                                        <div className="text-xs text-slate-500">{user?.primaryEmailAddress?.emailAddress}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="p-3 border-b border-slate-200/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar músicas..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm bg-slate-50 focus:bg-white transition-all duration-200"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    autoComplete="off"
                                />
                            </div>
                            
                            {/* Search Results Mobile */}
                            {searchQuery.trim() !== "" && (
                                <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-md max-h-72 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="px-4 py-3 text-sm text-slate-500 text-center">A procurar...</div>
                                    ) : searchResults.length > 0 ? (
                                        <>
                                            {searchResults.slice(0, 8).map((result) => (
                                                <Link
                                                    key={result.id}
                                                    href={`/musics/${result.id}`}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-b border-slate-100 last:border-b-0"
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        closeMobileMenu();
                                                    }}
                                                >
                                                    <Music className="h-4 w-4 text-slate-400 shrink-0" />
                                                    <span className="truncate font-medium">{result.title}</span>
                                                </Link>
                                            ))}
                                            {searchResults.length > 8 && (
                                                <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 text-center">
                                                    +{searchResults.length - 8} mais...
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum resultado.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="py-1">
                                <Link 
                                    href="/" 
                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-rose-100/50 hover:text-rose-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                    onClick={closeMobileMenu}
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Início</span>
                                </Link>
                                
                                <Link 
                                    href="/musics" 
                                    prefetch={false}
                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-rose-100/50 hover:text-rose-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                    onClick={closeMobileMenu}
                                >
                                    <Music className="h-4 w-4" />
                                    <span>Músicas</span>
                                </Link>
                                
                                <Link 
                                    href="/playlists/explore" 
                                    prefetch={false}
                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-orange-100/50 hover:text-orange-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                    onClick={closeMobileMenu}
                                >
                                    <Globe className="h-4 w-4" />
                                    <span>Playlists Públicas</span>
                                </Link>
                                
                                {user ? (
                                    <>
                                        <Link 
                                            href="/playlists" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-orange-100/50 hover:text-orange-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <ListMusic className="h-4 w-4" />
                                            <span>Minhas Playlists</span>
                                        </Link>

                                        <Link 
                                            href="/missas" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-purple-100/50 hover:text-purple-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <Church className="h-4 w-4" />
                                            <span>Minhas Missas</span>
                                        </Link>
                                        
                                        <Link 
                                            href="/musics/create" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-amber-100/50 hover:text-amber-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>Nova Música</span>
                                        </Link>

                                        <div className="h-px bg-slate-200 my-2 mx-3"></div>

                                        <Link 
                                            href={`/account`}
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-slate-100/50 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <Settings className="h-4 w-4" />
                                            <span>A minha conta</span>
                                        </Link>
                                        
                                        <Link 
                                            href="/starred-songs" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-yellow-100/50 hover:text-yellow-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <Star className="h-4 w-4" />
                                            <span>Favoritas</span>
                                        </Link>
                                        
                                        {/* Admin/Reviewer Links Mobile */}
                                        {userRole === "ADMIN" && (
                                            <>
                                                <div className="px-3 py-2 mt-2">
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</div>
                                                </div>
                                                <Link 
                                                    href="/admin/dashboard" 
                                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-purple-100/50 hover:text-purple-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Crown className="h-4 w-4" />
                                                    <span>Dashboard</span>
                                                </Link>
                                                <Link 
                                                    href="/admin/review" 
                                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-blue-100/50 hover:text-blue-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span>Revisão</span>
                                                </Link>
                                            </>
                                        )}
                                        {userRole === "REVIEWER" && (
                                            <>
                                                <div className="px-3 py-2 mt-2">
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moderação</div>
                                                </div>
                                                <Link 
                                                    href="/admin/review" 
                                                    className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-slate-700 hover:bg-blue-100/50 hover:text-blue-600 rounded-lg transition-all duration-200 font-medium text-sm"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span>Revisão</span>
                                                </Link>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="px-3 py-2 mt-2">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</div>
                                        </div>
                                        <Link 
                                            href="/login" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-rose-600 hover:bg-rose-100/50 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <User className="h-4 w-4" />
                                            <span>Login</span>
                                        </Link>
                                        
                                        <Link 
                                            href="/register" 
                                            className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 text-emerald-600 hover:bg-emerald-100/50 rounded-lg transition-all duration-200 font-medium text-sm"
                                            onClick={closeMobileMenu}
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            <span>Criar Conta</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        {user && (
                            <div className="border-t border-slate-200 p-3">
                                <button
                                    onClick={() => {
                                        signOut();
                                        closeMobileMenu();
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium text-sm"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Sair</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}