import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 240_000; // 4 min (URLs expire in 5 min)
const BATCH_SIZE = 100;

interface CacheEntry {
  url: string;
  expires: number;
}

export function useSignedUrls() {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const pending = useRef<Map<string, Promise<string>>>(new Map());
  const [, forceUpdate] = useState(0);

  const getSignedUrl = useCallback((path: string): string | null => {
    const entry = cache.current.get(path);
    if (entry && Date.now() < entry.expires) {
      return entry.url;
    }
    return null;
  }, []);

  const fetchSignedUrls = useCallback(async (paths: string[]) => {
    // Filter out paths we already have cached
    const needed = paths.filter((p) => {
      const entry = cache.current.get(p);
      return !entry || Date.now() >= entry.expires;
    });

    if (needed.length === 0) return;

    // Batch into chunks
    for (let i = 0; i < needed.length; i += BATCH_SIZE) {
      const batch = needed.slice(i, i + BATCH_SIZE);

      try {
        const { data } = await supabase.functions.invoke('get-signed-urls', {
          body: { paths: batch, expiresIn: 300 },
        });

        if (data?.urls) {
          const now = Date.now();
          Object.entries(data.urls).forEach(([path, url]) => {
            cache.current.set(path, {
              url: url as string,
              expires: now + CACHE_TTL,
            });
          });
        }
      } catch (err) {
        console.error('Failed to fetch signed URLs:', err);
      }
    }

    forceUpdate((n) => n + 1);
  }, []);

  return { getSignedUrl, fetchSignedUrls };
}
