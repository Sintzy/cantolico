import { LoginForm } from "@/components/forms/LoginForm";
import { Metadata } from "next";
import Link from "next/link";
import { Music, Heart, Users, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Entrar - Cantólico",
  description: "Entra na tua conta para submeter e gerir os teus cânticos católicos.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Welcome Content */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              Bem-vindo de volta ao <span className="text-blue-600">Cantólico</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Continua a tua jornada musical. Acede aos teus cânticos favoritos e contribui para a nossa comunidade.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Biblioteca Completa</h3>
                <p className="text-gray-600">Acesso a centenas de cânticos católicos organizados</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Favoritos Pessoais</h3>
                <p className="text-gray-600">Guarda e organiza os teus cânticos preferidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Comunidade Ativa</h3>
                <p className="text-gray-600">Colabora com outros utilizadores!</p>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Aprovado pela comunidade</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sempre gratuito</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Entrar na conta</h2>
              <p className="text-gray-600 mt-2">Aceda à sua conta Cantólico</p>
            </div>

            {/* Login Form */}
            <LoginForm />

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Novo no Cantólico?</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <Link 
                href="/register" 
                className="inline-flex items-center justify-center w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
              >
                Criar conta gratuita
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-700">Termos de Serviço</Link>
            <span className="mx-2">•</span>
            <Link href="/privacy-policy" className="hover:text-gray-700">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
