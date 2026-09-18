'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export function ContentAssetBackground({ assetKey, opacity = 0.22, className = '' }: { assetKey: string; opacity?: number; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const client = getSupabaseClient(true);
    if (!client) return;
    let active = true;
    void client.from('content_assets').select('image_url,updated_at').eq('asset_key', assetKey).eq('is_active', true).maybeSingle()
      .then(({ data }) => { if (active) setUrl((data as { image_url?: string | null } | null)?.image_url ?? null); });
    return () => { active = false; };
  }, [assetKey]);
  if (!url) return null;
  return <img src={url} alt="" aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`} style={{ opacity }} />;
}
