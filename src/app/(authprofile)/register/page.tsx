import { RegisterForm } from "@/components/forms/RegisterForm";
import { Metadata } from "next";
import Link from "next/link";
import { Music, BookOpen, Upload, Crown, Shield, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Criar Conta - Cantólico",
  description: "Cria uma conta para submeter os teus cânticos católicos e contribuir para a comunidade.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side - Registration Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 order-2 lg:order-1">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Juntar-se ao Cantólico</h2>
              <p className="text-gray-600 mt-2">Crie a sua conta gratuita</p>
            </div>

            {/* Register Form */}
            <RegisterForm />

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Já tem conta?</span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
              >
                Entrar na conta existente
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Ao criar conta, aceita os nossos{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">Termos de Serviço</Link>
            {" "}e{" "}
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">Política de Privacidade</Link>
          </div>
        </div>

        {/* Right Side - Benefits Content */}
        <div className="space-y-8 order-1 lg:order-2">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Comece a sua jornada no <span className="text-blue-600">Cantólico</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Junta-te à maior comunidade de música católica e partilha a tua paixão pelos cânticos sagrados.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Submeta Cânticos</h3>
                <p className="text-gray-600">Partilhe os seus cânticos favoritos com a comunidade católica</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Biblioteca Pessoal</h3>
                <p className="text-gray-600">Organiza os teus cânticos em playlists personalizadas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Qualidade Aprovada</h3>
                <p className="text-gray-600">Todos os cânticos são revistos pela nossa equipa</p>
              </div>
            </div>
          </div>

          {/* User progression */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Sistema de Progressão</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Music className="w-4 h-4 text-gray-700" />
                </div>
                <span className="text-gray-600">Utilizador → Contribua para a comunidade</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-gray-700" />
                </div>
                <span className="text-gray-600">Revisor → Ajude a moderar conteúdo</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-gray-700" />
                </div>
                <span className="text-gray-600">Admin → Gerir toda a plataforma</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
