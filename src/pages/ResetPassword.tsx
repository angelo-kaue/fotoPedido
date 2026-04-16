import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import logoFotoPedido from '@/assets/logo-fotopedido.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [canReset, setCanReset] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Escuta evento de recuperação de senha
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setCanReset(true);
        }
      }
    );

    // Pequeno delay pra garantir que o Supabase processe o token da URL (#)
    setTimeout(() => {
      setCanReset((prev) => (prev === null ? false : prev));
    }, 1500);

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error('Erro ao redefinir senha: ' + error.message);
    } else {
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/admin/login'), 2500);
    }

    setLoading(false);
  };

  // 🔄 Carregando
  if (canReset === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Validando link...</p>
      </div>
    );
  }

  // ❌ Link inválido
  if (!canReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-xl text-center">
          <CardContent className="pt-6 space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-foreground font-medium">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground">
              Solicite um novo link de redefinição.
            </p>
            <Button variant="outline" onClick={() => navigate('/admin/login')} className="w-full">
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-xl text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-foreground font-medium">Senha redefinida com sucesso!</p>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 🧩 Formulário
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-xl">
        <CardHeader className="text-center">
          <img
            src={logoFotoPedido}
            alt="FotoPedido"
            className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg"
          />
          <CardTitle className="text-xl">Redefinir Senha</CardTitle>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button type="submit" disabled={loading} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" />
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;