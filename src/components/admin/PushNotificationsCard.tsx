import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationsCard() {
  const { permission, enabled, loading, enable, disable, supported } = usePushNotifications();

  if (!supported) {
    return (
      <Card className="surface-premium">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-display text-base text-foreground">Notificações push</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Seu navegador não suporta notificações push. No iPhone, instale o app na tela
                inicial (Compartilhar → Adicionar à Tela de Início) e abra por lá.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-premium">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base text-foreground">Notificações push</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Receba alertas instantâneos de novos pedidos e comprovantes de pagamento, mesmo
              com o navegador fechado ou celular bloqueado.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 border hairline">
          <div className="flex items-center gap-2 text-xs">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status deste dispositivo</span>
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              enabled
                ? 'text-emerald-400'
                : permission === 'denied'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {enabled ? 'Ativadas' : permission === 'denied' ? 'Bloqueadas' : 'Desativadas'}
          </span>
        </div>

        {permission === 'denied' ? (
          <p className="text-xs text-destructive/90">
            Notificações bloqueadas no navegador. Vá em Configurações do site e libere
            permissões para reativar.
          </p>
        ) : enabled ? (
          <Button
            onClick={disable}
            disabled={loading}
            variant="outline"
            className="w-full min-h-[44px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
            Desativar neste dispositivo
          </Button>
        ) : (
          <Button
            onClick={enable}
            disabled={loading}
            className="w-full min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
            Ativar notificações
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
          Dica: no Android e Chrome, instale o FotoPedido na tela inicial para receber pushes
          sem precisar manter o navegador aberto. No iPhone (iOS 16.4+), instale via Safari →
          Compartilhar → Adicionar à Tela de Início.
        </p>
      </CardContent>
    </Card>
  );
}