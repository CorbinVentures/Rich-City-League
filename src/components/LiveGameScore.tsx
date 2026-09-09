'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game } from '@/types/database';

export function LiveGameScore({ initialGame, homeName, awayName }: { initialGame: Game; homeName: string; awayName: string }) {
  const [game, setGame] = useState(initialGame);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const channel = client
      .channel(`game:${initialGame.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${initialGame.id}` }, (payload) => {
        setGame(payload.new as Game);
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [initialGame.id]);

  return <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{game.status}</p>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div><p className="text-gray-400">{awayName}</p><p className="mt-2 font-display text-5xl font-bold">{game.away_score}</p></div>
      <div><p className="text-gray-400">{homeName}</p><p className="mt-2 font-display text-5xl font-bold">{game.home_score}</p></div>
    </div>
  </div>;
}
