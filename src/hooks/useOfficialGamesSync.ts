'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, Standing } from '@/types/database';

/**
 * The games table is in the Supabase Realtime publication and is updated in
 * the same database transaction as official event/stat projections.
 *
 * Realtime gives prompt delivery while polling/visibility recovery prevents
 * long-lived app sessions from being stranded after a lost websocket.
 */
export function useOfficialGamesSync(initialGames: Game[], initialStandings: Standing[]) {
  const [games, setGames] = useState(initialGames);
  const [standings, setStandings] = useState(initialStandings);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let disposed = false;
    let inFlight = false;
    let retry = false;

    async function refresh() {
      if (disposed) return;
      if (inFlight) {
        retry = true;
        return;
      }

      inFlight = true;
      try {
        const [gameResult, standingResult] = await Promise.all([
          client!.from('games').select('*').order('scheduled_at', { ascending: false }).limit(100),
          client!.from('standings').select('*').order('rank', { ascending: true, nullsFirst: false }),
        ]);

        if (disposed) return;
        if (!gameResult.error && gameResult.data) setGames(gameResult.data as Game[]);
        if (!standingResult.error && standingResult.data) setStandings(standingResult.data as Standing[]);

        if (gameResult.error) console.warn('Official RCH games refresh failed', gameResult.error.message);
        if (standingResult.error) console.warn('Official RCH standings refresh failed', standingResult.error.message);
      } catch (error) {
        console.warn('Official RCH sync temporarily unavailable', error);
      } finally {
        inFlight = false;
        if (retry && !disposed) {
          retry = false;
          void refresh();
        }
      }
    }

    const channel = client
      .channel('official-games-sync-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
      }, () => { void refresh(); })
      .subscribe();

    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15_000);

    function onVisibility() {
      if (!document.hidden) void refresh();
    }
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);
    void refresh();

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
      void client.removeChannel(channel);
    };
  }, []);

  return { games, standings };
}
