"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Por favor, insere o teu nome completo");
      return;
    }
    
    if (!email.trim()) {
      toast.error("Por favor, insere o teu email");
      return;
    }
    
    if (!password.trim()) {
      toast.error("Por favor, insere uma palavra-passe");
      return;
    }
    
    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.ok) {
        toast.success("Conta criada com sucesso! Faz login para continuar.");
        window.location.href = "/login";
      } else if (res.status === 400) {
        const data = await res.json();
        toast.error(data.error || "Email já está em uso");
      } else {
        toast.error("Erro ao registar. Verifica os dados e tenta novamente.");
      }
    } catch (error) {
      console.error("Erro no registo:", error);
      toast.error("Erro de conexão. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Sign In */}
      <GoogleSignInButton callbackUrl="/" />
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            Ou crie conta com email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome completo
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Palavra-passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo 6 caracteres
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A criar conta..." : "Criar conta"}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          Ao criar conta, aceitas os nossos{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            Termos de Serviço
          </Link>
          {" "}e{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
            Política de Privacidade
          </Link>
        </div>
      </form>
    </div>
  );
}