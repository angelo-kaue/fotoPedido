import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import logoFotoPedido from '@/assets/logo-fotopedido.png';

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }
    if (!captchaToken) {
      toast.error('Confirme que você não é um robô');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password, captchaToken);
    if (error) {
      toast.error('Email ou senha inválidos.');
      resetCaptcha();
    } else {
      navigate('/admin');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Digite seu email primeiro.');
      return;
    }
    if (!captchaToken) {
      toast.error('Confirme que você não é um robô');
      return;
    }
    setForgotLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken,
    });
    if (error) {
      toast.error('Erro ao enviar email de redefinição.');
    } else {
      toast.success('Email de redefinição enviado! Verifique sua caixa de entrada.');
    }
    resetCaptcha();
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-xl">
        <CardHeader className="text-center">
          <img src={logoFotoPedido} alt="FotoPedido" width={56} height={56} className="w-14 h-14 mx-auto mb-3 rounded-2xl shadow-lg" />
          <CardTitle className="text-xl">FotoPedido</CardTitle>
          <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] bg-secondary/50 border-border/50 focus-visible:ring-primary"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] bg-secondary/50 border-border/50 focus-visible:ring-primary"
            />
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ theme: 'auto', size: 'normal' }}
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full min-h-[44px] bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400 glow-primary">
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <button
            type="button"
            disabled={forgotLoading}
            onClick={handleForgotPassword}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors mt-3"
          >
            {forgotLoading ? 'Enviando...' : 'Esqueceu a senha?'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
