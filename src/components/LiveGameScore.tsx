'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game } from '@/types/database';

export function LiveGameScore({ initialGame, homeName, awayName }: { initialGame: Game; homeName: string; awayName: string }) {
  const [game, setGame] = useState(initialGame);
  const router = useRouter();
  const lastVersion = useRef(initialGame.updated_at ?? '');
  const lastRefresh = useRef(0);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let disposed = false;

    function applyOfficialUpdate(next: Game) {
      if (disposed) return;
      setGame(next);
      const version = next.updated_at ?? '';
      if (lastVersion.current === version) return;
      lastVersion.current = version;

      // The score is already live in this component. Refresh the dynamic
      // server-rendered box score, top performers and game details as well.
      const now = Date.now();
      if (now - lastRefresh.current > 3_000) {
        lastRefresh.current = now;
        router.refresh();
      }
    }

    async function recover() {
      if (disposed) return;
      const { data, error } = await client!
        .from('games')
        .select('*')
        .eq('id', initialGame.id)
        .maybeSingle();
      if (!error && data) applyOfficialUpdate(data as Game);
    }

    const channel = client
      .channel(`official-game-score:${initialGame.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${initialGame.id}`,
      }, (payload) => applyOfficialUpdate(payload.new as Game))
      .subscribe();

    // Covers suspended PWAs and browsers that miss websocket events.
    const interval = window.setInterval(() => {
      if (!document.hidden) void recover();
    }, 12_000);
    function onResume() {
      if (!document.hidden) void recover();
    }
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    void recover();

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
      void client.removeChannel(channel);
    };
  }, [initialGame.id, router]);

  return <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{game.status}</p>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div><p className="text-gray-400">{awayName}</p><p className="mt-2 font-display text-5xl font-bold">{game.away_score}</p></div>
      <div><p className="text-gray-400">{homeName}</p><p className="mt-2 font-display text-5xl font-bold">{game.home_score}</p></div>
    </div>
  </div>;
}
