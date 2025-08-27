"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, LogOut, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function BannedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [moderationInfo, setModerationInfo] = useState<any>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Verificar se o utilizador está realmente banido
    fetch("/api/user/moderation-status")
      .then(res => res.json())
      .then(data => {
        if (data.status !== "BANNED") {
          router.push("/");
          return;
        }
        setModerationInfo(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/");
      });
  }, [session, status, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleContact = () => {
    window.open("mailto:miguel@cantolico.pt?subject=Recurso de Banimento - Cantólico&body=Olá,%0D%0A%0D%0AGostaria de contestar o banimento da minha conta.%0D%0A%0D%0AMinha conta: " + encodeURIComponent(session?.user?.email || ""), "_blank");
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-700 flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Conta Banida
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              A sua conta foi permanentemente banida do Cantólico
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Informação do Banimento</h3>
              {moderationInfo?.reason && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Motivo:</span>
                  </p>
                  <p className="text-sm text-red-700 bg-white p-2 rounded border">
                    {moderationInfo.reason}
                  </p>
                </div>
              )}
              {moderationInfo?.moderatedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Data: {new Date(moderationInfo.moderatedAt).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Considera que foi um erro?
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Se acredita que o banimento foi aplicado incorretamente, pode contactar a administração para recurso.
              </p>
              <Button 
                onClick={handleContact}
                variant="outline" 
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contactar Administração
              </Button>
            </div>

            <Separator />

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Não pode continuar a utilizar este serviço enquanto o banimento estiver ativo.
              </p>
              
              <Button 
                onClick={handleLogout}
                variant="destructive" 
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Sessão
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Para mais informações, consulte os nossos{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  termos de utilização
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
