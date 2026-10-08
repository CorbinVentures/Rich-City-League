'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { rebindExistingAppAlerts, syncAppBadge, unsubscribeLocalAppAlerts } from '@/lib/pwa-notifications';

export function PWANotificationBridge() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const previousUserId = useRef<string | null>(null);

  const refreshBadge = useCallback(async () => {
    if (!supabase || !user) {
      await syncAppBadge(0);
      return;
    }
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);
    await syncAppBadge(count ?? 0);
  }, [supabase, user]);

  useEffect(() => {
    const lastUser = previousUserId.current;
    previousUserId.current = user?.id ?? null;

    if (!user) {
      void syncAppBadge(0);
      if (lastUser) void unsubscribeLocalAppAlerts();
      return;
    }

    void refreshBadge();
    if (supabase) void rebindExistingAppAlerts(supabase as any);

    if (!supabase) return;
    const channel = supabase
      .channel(`rcl-pwa-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => void refreshBadge())
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshBadge();
    };
    const onFocus = () => void refreshBadge();
    const onLocalChange = () => void refreshBadge();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('rcl:notification-state-changed', onLocalChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('rcl:notification-state-changed', onLocalChange);
      void supabase.removeChannel(channel);
    };
  }, [refreshBadge, supabase, user]);

  return null;
}
