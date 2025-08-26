"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
  Book
} from "lucide-react";

type Music = {
  id: string;
  title: string;
};

export default function Navbar() {
    const { data: session } = useSession();
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
            <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-50">
                <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3 group">
                        <div className="relative">
                            <Image 
                                src={Icons.SITE_IMAGES.logo} 
                                alt="Logo" 
                                width={32} 
                                height={32} 
                                className="transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full scale-0 group-hover:scale-125 transition-transform duration-300"></div>
                        </div>
                        <span className="text-xl font-bold text-black bg-clip-text">
                            Can♱ólico!
                        </span>
                    </Link>

                    {/* Desktop nav + Search */}
                    <div className="hidden lg:flex items-center gap-1">
                        <Link 
                            href="/musics" 
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                        >
                            <Music className="h-4 w-4" />
                            <span className="font-medium">Músicas</span>
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
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                            >
                                <ListMusic className="h-4 w-4" />
                                <span className="font-medium">Playlists</span>
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${playlistsMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {playlistsMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-lg z-50 overflow-hidden">
                                    <div className="py-2">
                                        <Link
                                            href="/playlists/explore"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => {
                                                setPlaylistsMenuOpen(false);
                                                setPlaylistsMenuSticky(false);
                                            }}
                                        >
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                <Globe className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium">Playlists Públicas</div>
                                                <div className="text-xs text-gray-500">Descobrir playlists da comunidade</div>
                                            </div>
                                        </Link>
                                        
                                        {session ? (
                                            <Link
                                                href="/playlists"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setPlaylistsMenuOpen(false);
                                                    setPlaylistsMenuSticky(false);
                                                }}
                                            >
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Lock className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">Minhas Playlists</div>
                                                    <div className="text-xs text-gray-500">Gerir as tuas coleções</div>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-500">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <Lock className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-400">Minhas Playlists</div>
                                                        <div className="text-xs">
                                                            <Link href="/login" className="text-blue-600 hover:underline">
                                                                Faz login
                                                            </Link> para aceder
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <Link 
                            href="/musics/create" 
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="font-medium">Nova Música</span>
                        </Link>
                        
                        {/* Admin/Reviewer Links */}
                        {session?.user?.role === "ADMIN" && (
                            <>
                                <Link 
                                    href="/admin/dashboard" 
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                    <Crown className="h-4 w-4" />
                                    <span className="font-medium">Admin</span>
                                </Link>
                                <Link 
                                    href="/admin/review" 
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                    <Eye className="h-4 w-4" />
                                    <span className="font-medium">Revisão</span>
                                </Link>
                            </>
                        )}
                        {session?.user?.role === "REVIEWER" && (
                            <Link 
                                href="/admin/review" 
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
                        {session?.user ? (
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
                                                name: session.user.name || "Utilizador",
                                                image: session.user.image
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
                                                            name: session.user.name || "Utilizador",
                                                            image: session.user.image
                                                        }} 
                                                        size={40} 
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{session.user.name}</div>
                                                    <div className="text-xs text-gray-500">{session.user.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="py-2">
                                            <Link
                                                href={`/users/${session.user.id}`}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    setUserMenuSticky(false);
                                                }}
                                            >
                                                <User className="h-4 w-4" />
                                                Ver Perfil
                                            </Link>
                                            
                                            {session.user.role === "ADMIN" && (
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
                                                    <Link
                                                        href="https://www.notion.so/23b4e08599698024ba17edc88a522623?v=23b4e085996980c0a20d000ccb830dd5&source=copy_link"
                                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                        onClick={() => {
                                                            setUserMenuOpen(false);
                                                            setUserMenuSticky(false);
                                                        }}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Book className="h-4 w-4" />
                                                        Notion
                                                    </Link>
                                                </>
                                            )}
                                            {session.user.role === "REVIEWER" && (
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
                                    href="/login"
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
            </nav>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeMobileMenu}
                    ></div>
                    
                    {/* Sidebar */}
                    <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-out">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <Image 
                                    src={Icons.SITE_IMAGES.logo} 
                                    alt="Logo" 
                                    width={24} 
                                    height={24} 
                                />
                                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Can♱ólico!
                                </span>
                            </div>
                            <button
                                onClick={closeMobileMenu}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* User Info (if logged in) */}
                        {session?.user && (
                            <div className="p-4 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-gray-200 overflow-hidden">
                                        <UserAvatar 
                                            user={{
                                                name: session.user.name || "Utilizador",
                                                image: session.user.image
                                            }} 
                                            size={48} 
                                        />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{session.user.name}</div>
                                        <div className="text-sm text-gray-500">{session.user.email}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar músicas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="py-2">
                                <Link 
                                    href="/" 
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                    onClick={closeMobileMenu}
                                >
                                    <Home className="h-5 w-5" />
                                    <span className="font-medium">Início</span>
                                </Link>
                                
                                <Link 
                                    href="/musics" 
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                    onClick={closeMobileMenu}
                                >
                                    <Music className="h-5 w-5" />
                                    <span className="font-medium">Músicas</span>
                                </Link>
                                
                                <Link 
                                    href="/playlists/explore" 
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                    onClick={closeMobileMenu}
                                >
                                    <Globe className="h-5 w-5" />
                                    <span className="font-medium">Playlists Públicas</span>
                                </Link>
                                
                                {session ? (
                                    <>
                                        <Link 
                                            href="/playlists" 
                                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                            onClick={closeMobileMenu}
                                        >
                                            <ListMusic className="h-5 w-5" />
                                            <span className="font-medium">Minhas Playlists</span>
                                        </Link>
                                        
                                        <Link 
                                            href="/musics/create" 
                                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                            onClick={closeMobileMenu}
                                        >
                                            <Plus className="h-5 w-5" />
                                            <span className="font-medium">Nova Música</span>
                                        </Link>

                                        <Link 
                                            href={`/users/${session.user.id}`} 
                                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                            onClick={closeMobileMenu}
                                        >
                                            <User className="h-5 w-5" />
                                            <span className="font-medium">Meu Perfil</span>
                                        </Link>
                                        
                                        {/* Admin/Reviewer Links Mobile */}
                                        {session.user.role === "ADMIN" && (
                                            <>
                                                <div className="px-4 py-2">
                                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administração</div>
                                                </div>
                                                <Link 
                                                    href="/admin/dashboard" 
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Crown className="h-5 w-5" />
                                                    <span className="font-medium">Dashboard</span>
                                                </Link>
                                                <Link 
                                                    href="/admin/review" 
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Eye className="h-5 w-5" />
                                                    <span className="font-medium">Revisão</span>
                                                </Link>
                                                <Link 
                                                    href="https://www.notion.so/23b4e08599698024ba17edc88a522623?v=23b4e085996980c0a20d000ccb830dd5&source=copy_link" 
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                                    onClick={closeMobileMenu}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Book className="h-5 w-5" />
                                                    <span className="font-medium">Notion</span>
                                                </Link>
                                            </>
                                        )}
                                        {session.user.role === "REVIEWER" && (
                                            <>
                                                <div className="px-4 py-2">
                                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Moderação</div>
                                                </div>
                                                <Link 
                                                    href="/admin/review" 
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                                                    onClick={closeMobileMenu}
                                                >
                                                    <Eye className="h-5 w-5" />
                                                    <span className="font-medium">Revisão</span>
                                                </Link>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="px-4 py-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conta</div>
                                        </div>
                                        <Link 
                                            href="/login" 
                                            className="flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors"
                                            onClick={closeMobileMenu}
                                        >
                                            <User className="h-5 w-5" />
                                            <span className="font-medium">Login</span>
                                        </Link>
                                        
                                        <Link 
                                            href="/register" 
                                            className="flex items-center gap-3 px-4 py-3 text-green-600 hover:bg-green-50 transition-colors"
                                            onClick={closeMobileMenu}
                                        >
                                            <UserPlus className="h-5 w-5" />
                                            <span className="font-medium">Criar Conta</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        {session && (
                            <div className="border-t border-gray-200 p-4">
                                <button
                                    onClick={() => {
                                        signOut();
                                        closeMobileMenu();
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="font-medium">Sair</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}