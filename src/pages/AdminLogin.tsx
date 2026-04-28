import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-primary/[0.08] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <img
            src={logoFotoPedido}
            alt="FotoPedido"
            width={56}
            height={56}
            className="w-14 h-14 mx-auto mb-4 rounded-xl border hairline"
          />
          <h1 className="font-display text-3xl text-foreground leading-tight">FotoPedido</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground mt-2">
            Área do fotógrafo
          </p>
        </div>

        <Card className="surface-premium">
          <CardContent className="pt-7 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="voce@estudio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
                />
              </div>
              <div className="flex justify-center pt-1">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{ theme: 'dark', size: 'normal' }}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full min-h-[48px] bg-primary text-primary-foreground hover:bg-primary/90 ring-premium uppercase tracking-wide text-xs font-semibold">
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <button
              type="button"
              disabled={forgotLoading}
              onClick={handleForgotPassword}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary-soft transition-colors mt-4 uppercase tracking-[0.18em] font-semibold"
            >
              {forgotLoading ? 'Enviando...' : 'Esqueceu a senha?'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;