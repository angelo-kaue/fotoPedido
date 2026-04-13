import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVisitTracker(eventId: string | undefined) {
  useEffect(() => {
    if (!eventId) return;

    const key = `visited_event_${eventId}`;
    if (localStorage.getItem(key)) return;

    // Fire-and-forget async tracking
    const track = async () => {
      try {
        await supabase.from('event_visits' as any).insert({
          event_id: eventId,
          user_agent: navigator.userAgent,
        });
        localStorage.setItem(key, '1');
      } catch {
        // Silent fail — don't impact UX
      }
    };

    // Delay to not block page load
    const timer = setTimeout(track, 1500);
    return () => clearTimeout(timer);
  }, [eventId]);
}
