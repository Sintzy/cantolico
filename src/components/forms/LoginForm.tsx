"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!email.trim()) {
      setError("Por favor, insere o teu email");
      return;
    }
    
    if (!password.trim()) {
      setError("Por favor, insere a tua palavra-passe");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (res?.ok) {
        toast.success("Login efetuado com sucesso!");
        router.push("/");
      } else if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setError("Email ou palavra-passe incorretos");
          toast.error("Email ou palavra-passe incorretos");
        } else {
          setError("Erro no login: " + res.error);
          toast.error("Erro no login");
        }
      } else {
        setError("Erro desconhecido no login");
        toast.error("Erro desconhecido no login");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      setError("Erro de conexão. Tenta novamente.");
      toast.error("Erro de conexão. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
        <CardDescription>
          Inicia sessão na tua conta para continuares
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Google Sign In */}
        <GoogleSignInButton />
        
        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continue com email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="current-password"
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
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                A entrar...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Ao entrar, aceitas os nossos{" "}
            <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
              termos e condições
            </Link>
            {" e "}
            <Link href="/privacy-policy" className="font-medium text-primary underline-offset-4 hover:underline">
              política de privacidade
            </Link>
          </div>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Não tens conta? </span>
          <Link 
            href="/register" 
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Cria uma conta
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}