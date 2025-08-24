"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Por favor, insere o teu nome completo");
      return;
    }
    
    if (!email.trim()) {
      setError("Por favor, insere o teu email");
      return;
    }
    
    if (!password.trim()) {
      setError("Por favor, insere uma palavra-passe");
      return;
    }
    
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres");
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
        const errorMsg = data.error || "Email já está em uso";
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        const errorMsg = "Erro ao registar. Verifica os dados e tenta novamente.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Erro no registo:", error);
      const errorMsg = "Erro de conexão. Tenta novamente.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Google Sign In */}
      <GoogleSignInButton callbackUrl="/" />
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou crie conta com email
          </span>
        </div>
      </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                className="pl-10"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o-teu-email@exemplo.com"
                className="pl-10"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Palavra-passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="A tua palavra-passe"
                className="pl-10 pr-10"
                autoComplete="new-password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 6 caracteres
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                A criar conta...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar conta
              </>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Ao criar conta, aceitas os nossos{" "}
            <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
              Termos de Serviço
            </Link>
            {" e "}
            <Link href="/privacy-policy" className="font-medium text-primary underline-offset-4 hover:underline">
              Política de Privacidade
            </Link>
          </div>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Já tens uma conta? </span>
          <Link 
            href="/login" 
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Faz login
          </Link>
        </div>
    </div>
  );
}