import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  onForegroundMessage,
  pushSupported,
  requestFcmToken,
} from '@/lib/firebase';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const TOKEN_CACHE_KEY = 'fp_push_token_v1';

export function usePushNotifications() {
  const { user, tenantId } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect support + current permission
  useEffect(() => {
    if (!pushSupported()) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
    setEnabled(
      Notification.permission === 'granted' && !!localStorage.getItem(TOKEN_CACHE_KEY)
    );
  }, []);

  // Listen to navigation messages from SW (notification click)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'NAVIGATE' && typeof data.url === 'string') {
        navigate(data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

  // Foreground messages → toast
  useEffect(() => {
    if (permission !== 'granted') return;
    let unsub: (() => void) | undefined;
    (async () => {
      const off = await onForegroundMessage((payload) => {
        const d = payload.data || {};
        toast.success(d.title || 'FotoPedido', {
          description: d.body,
          action: d.url
            ? { label: 'Abrir', onClick: () => navigate(d.url as string) }
            : undefined,
        });
      });
      if (typeof off === 'function') unsub = off;
    })();
    return () => unsub?.();
  }, [permission, navigate]);

  const enable = useCallback(async () => {
    if (!pushSupported() || !user || !tenantId) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);
      if (perm !== 'granted') {
        toast.error('Permissão negada', {
          description: 'Habilite as notificações nas configurações do navegador.',
        });
        return false;
      }
      const token = await requestFcmToken();
      if (!token) {
        toast.error('Não foi possível gerar o token de notificação');
        return false;
      }
      const ua = navigator.userAgent.slice(0, 240);
      const label = guessDeviceLabel(ua);
      const { error } = await supabase
        .from('admin_push_tokens')
        .upsert(
          {
            tenant_id: tenantId,
            user_id: user.id,
            token,
            user_agent: ua,
            device_label: label,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );
      if (error) {
        toast.error('Erro ao registrar dispositivo', { description: error.message });
        return false;
      }
      localStorage.setItem(TOKEN_CACHE_KEY, token);
      setEnabled(true);
      toast.success('Notificações ativadas', {
        description: 'Você receberá alertas instantâneos de pedidos e pagamentos.',
      });
      return true;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_CACHE_KEY);
      if (token && user) {
        await supabase.from('admin_push_tokens').delete().eq('token', token);
      }
      localStorage.removeItem(TOKEN_CACHE_KEY);
      setEnabled(false);
      toast.success('Notificações desativadas neste dispositivo');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { permission, enabled, loading, enable, disable, supported: permission !== 'unsupported' };
}

function guessDeviceLabel(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Navegador';
}