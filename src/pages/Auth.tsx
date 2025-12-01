import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || (!isLogin && !username)) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta.",
        });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Você já pode fazer login.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Informe o e-mail",
        description: "Preencha o campo de email para recuperar a senha.",
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email de recuperação enviado",
        description:
          "Se este email estiver cadastrado, você receberá um link para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao recuperar senha",
        description:
          error.message || "Não foi possível enviar o email de recuperação.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 -z-10" />
      
      <Card className="w-full max-w-md border shadow-lg bg-card">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="UndoinG" className="h-40" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isLogin ? "Fazer Login" : "Criar Conta"}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin
                ? "Entre com seu email e senha"
                : "Crie sua conta para começar"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || resetLoading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || resetLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || resetLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              disabled={loading || resetLoading}
            >
              {(loading || resetLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isLogin ? "Entrar" : "Criar Conta"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading || resetLoading}
            >
              {isLogin
                ? "Não tem conta? Criar uma"
                : "Já tem conta? Fazer login"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full mt-2 text-sm"
              onClick={handleForgotPassword}
              disabled={resetLoading || loading}
            >
              {resetLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Recuperar minha senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
