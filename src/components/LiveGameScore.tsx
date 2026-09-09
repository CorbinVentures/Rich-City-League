'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game } from '@/types/database';

export function LiveGameScore({ initialGame }: { initialGame: Game }) {
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

  return <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
    <div><p className="text-gray-400">Away</p><p className="mt-2 font-display text-5xl font-bold">{game.away_score}</p></div>
    <div><p className="text-gray-400">Home</p><p className="mt-2 font-display text-5xl font-bold">{game.home_score}</p></div>
  </div>;
}
