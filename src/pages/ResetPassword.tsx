import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Quando o usuário chega aqui pelo link do e-mail, o Supabase já
  // deve ter criado uma sessão de "recovery". A gente só confere.
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Erro ao verificar sessão de recuperação:", error);
      }

      setHasValidSession(!!data.session);
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !passwordConfirm) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha a nova senha e a confirmação.",
      });
      return;
    }

    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "Senhas diferentes",
        description: "A confirmação precisa ser igual à nova senha.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "Use pelo menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Senha atualizada com sucesso!",
        description: "Já pode usar a nova senha para acessar o sistema.",
      });

      // Aqui você escolhe: mandar direto pro sistema ou para tela de login.
      // Vou mandar direto pra home (já autenticado):
      navigate("/");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: err?.message || "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enquanto verifica a sessão
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  // Se o link for inválido / expirado (sem sessão)
  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Link inválido ou expirado</CardTitle>
            <CardDescription>
              O link de recuperação não é mais válido. Peça um novo e-mail de recuperação de senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela normal de redefinição de senha
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 -z-10" />

      <Card className="w-full max-w-md border shadow-lg bg-card">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-32" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Redefinir senha
            </CardTitle>
            <CardDescription className="text-center">
              Defina uma nova senha para continuar usando o sistema.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar nova senha</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Repita a nova senha"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => navigate("/auth")}
            >
              Voltar para o login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
