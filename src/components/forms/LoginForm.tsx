"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validação básica
    if (!email.trim()) {
      toast.error("Por favor, insere o teu email");
      return;
    }
    
    if (!password.trim()) {
      toast.error("Por favor, insere a tua palavra-passe");
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
        toast.success("Login efetuado com sucesso! Bem-vindo de volta!");
        router.push("/");
      } else if (res?.error) {
        if (res.error === "CredentialsSignin") {
          toast.error("Email ou palavra-passe incorretos");
        } else {
          toast.error("Erro no login: " + res.error);
        }
      } else {
        toast.error("Erro desconhecido no login");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro de conexão. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-md mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-8 space-y-6"
    >
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Acede à tua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.com"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Ao entrar, aceitas os nossos {" "}
          <Link
            href="/terms"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            termos e condições
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A entrar..." : "Entrar"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-4">
        Não tens conta? {" "}
        <Link
          href="/register"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Criar conta
        </Link>
      </div>
    </motion.div>
  );
}