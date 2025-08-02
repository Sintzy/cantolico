"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "@/lib/site-images";
type Music = {
  id: string;
  title: string;
};

export default function Navbar() {
    const { data: session } = useSession();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Music[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const image = session?.user?.image || "/default-profile.png";


    useEffect(() => {
        const fetchMusics = async () => {
            try {
                const res = await fetch(`/api/musics/getmusics`);
                const data: Music[] = await res.json();
                setSearchResults(data); 
            } catch (error) {
                console.error("Erro ao buscar músicas:", error);
            }
        };

        fetchMusics();
    }, []);


    const filteredResults = searchResults.filter((music) =>
        music.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <Image src={Icons.SITE_IMAGES.logo} alt="Logo" width={30} height={30} />
                    <span className="text-xl font-semibold text-gray-800">Can♱ólico!</span>
                </Link>

                {/* Desktop nav + Search */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/musics" className="text-gray-700 hover:text-blue-600">Músicas</Link>
                    <Link href="/musics/create" className="text-gray-700 hover:text-blue-600">Nova Música</Link>
                    
                    {/* Admin/Reviewer Links */}
                    {session?.user?.role === "ADMIN" && (
                        <>
                            <Link href="/admin/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                                Administração
                            </Link>
                            <Link href="/admin/review" className="text-gray-700 hover:text-orange-600 font-medium">
                                Revisão
                            </Link>
                        </>
                    )}
                    {session?.user?.role === "REVIEWER" && (
                        <Link href="/admin/review" className="text-gray-700 hover:text-orange-600 font-medium">
                            Revisão
                        </Link>
                    )}

                    {/* Searchbar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-3 py-1 rounded-md border text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery.trim() !== "" && filteredResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-md mt-1 z-50">
                                {filteredResults.map((result) => (
                                    <Link
                                        key={result.id}
                                        href={`/musics/${result.id}`}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {result.title}
                                    </Link>
                                ))}
                            </div>
                        )}
                        {searchQuery.trim() !== "" && filteredResults.length === 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-md mt-1 z-50">
                                <p className="px-4 py-2 text-sm text-gray-500">Nenhum resultado encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* User */}
                <div className="relative flex items-center space-x-3">
                    {session?.user ? (
                        <>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-9 h-9 rounded-full border border-gray-300 overflow-hidden focus:outline-none"
                            >
                                <Image
                                    src={image}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full"
                                    alt="Foto de perfil"
                                />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 top-12 w-44 bg-white border rounded-md shadow-md z-50">
                                    <Link
                                        href={`/users/${session.user.id}`}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Ver Perfil
                                    </Link>
                                    
                                    {/* Admin/Reviewer options in dropdown */}
                                    {session.user.role === "ADMIN" && (
                                        <>
                                            <Link
                                                href="/admin/dashboard"
                                                className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-medium"
                                            >
                                                Dashboard Admin
                                            </Link>
                                            <Link
                                                href="/admin/review"
                                                className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-medium"
                                            >
                                                Painel Revisão
                                            </Link>
                                        </>
                                    )}
                                    {session.user.role === "REVIEWER" && (
                                        <Link
                                            href="/admin/review"
                                            className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-medium"
                                        >
                                            Painel Revisão
                                        </Link>
                                    )}
                                    
                                    <hr className="my-1" />
                                    <button
                                        onClick={() => signOut()}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Sair
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="text-sm px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
                        >
                            Login
                        </Link>
                    )}

                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-gray-600 focus:outline-none"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-3">
                    <Link href="/musics" className="block text-gray-700">Músicas</Link>
                    <Link href="/musics/create" className="block text-gray-700">Nova Música</Link>
                    
                    {/* Admin/Reviewer Links Mobile */}
                    {session?.user?.role === "ADMIN" && (
                        <>
                            <Link href="/admin/dashboard" className="block text-purple-600 font-medium">
                                Administração
                            </Link>
                            <Link href="/admin/review" className="block text-orange-600 font-medium">
                                Revisão
                            </Link>
                        </>
                    )}
                    {session?.user?.role === "REVIEWER" && (
                        <Link href="/admin/review" className="block text-orange-600 font-medium">
                            Revisão
                        </Link>
                    )}
                    
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-1 rounded-md border text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}
        </nav>
    );
}