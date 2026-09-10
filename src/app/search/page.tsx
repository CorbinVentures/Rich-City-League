'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { FaMagnifyingGlass, FaUser, FaBasketball, FaChalkboardUser, FaRegComment, FaCalendarDays } from 'react-icons/fa6';

export default function GlobalSearchPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Search Results
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const fetchSearchResults = async (searchVal: string) => {
    if (!supabase) return;
    if (!searchVal.trim()) {
      setPlayers([]);
      setTeams([]);
      setCoaches([]);
      setGames([]);
      setNews([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    try {
      const matchPattern = `%${searchVal.toLowerCase()}%`;

      // Parallel searches across tables
      const [
        { data: playersData },
        { data: teamsData },
        { data: coachesData },
        { data: gamesData },
        { data: newsData },
        { data: postsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*, players(*)').ilike('first_name', matchPattern),
        supabase.from('teams').select('*').ilike('name', matchPattern),
        supabase.from('profiles').select('*, team_coaches(*)').eq('role', 'coach').ilike('first_name', matchPattern),
        supabase.from('games').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)'),
        supabase.from('news').select('*').ilike('title', matchPattern),
        supabase.from('posts').select('*, author:profiles(*)').ilike('body', matchPattern),
      ]);

      if (playersData) {
        setPlayers((playersData as any[]).filter(p => p.players && p.players.length > 0));
      }
      if (teamsData) {
        setTeams(teamsData);
      }
      if (coachesData) {
        setCoaches((coachesData as any[]).filter(c => c.team_coaches && c.team_coaches.length > 0));
      }
      if (gamesData) {
        // Simple client-side search for matchups
        const filteredGames = (gamesData as any[]).filter(g => 
          g.home_team?.name.toLowerCase().includes(searchVal.toLowerCase()) ||
          g.away_team?.name.toLowerCase().includes(searchVal.toLowerCase())
        );
        setGames(filteredGames);
      }
      if (newsData) {
        setNews(newsData);
      }
      if (postsData) {
        setPosts(postsData);
      }
    } catch (err) {
      console.error('Global search query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSearchResults(query);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, supabase]);

  const hasResults = players.length > 0 || teams.length > 0 || coaches.length > 0 || games.length > 0 || news.length > 0 || posts.length > 0;

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      <section className="border-b border-white/10 py-12 text-center">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RICH CITY SEARCH ENGINE
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            GLOBAL <span className="text-rcl-gold">SEARCH</span>
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Instantly discover players, teams, coaches, matchups, league news, and community social posts.
          </p>
        </Container>
      </section>

      <Container maxWidth="md" className="mt-8 space-y-12">
        {/* Fast Search input box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500">
            <FaMagnifyingGlass className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type player name, team, matchup location, or keywords..."
            className="w-full rounded-2xl border border-white/10 bg-black/60 pl-12 pr-4 py-4 text-base text-white focus:border-rcl-gold outline-none shadow-xl placeholder:text-gray-600 transition"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-rcl-gold border-white/10 mx-auto" />
            <p className="mt-3 text-xs text-gray-400 uppercase tracking-widest">Searching the league...</p>
          </div>
        )}

        {/* Results layout */}
        {!loading && query.trim() !== '' && !hasResults && (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-gray-500">
            No matchups, players, coaches, or news items match &quot;{query}&quot;.
          </div>
        )}

        {!loading && hasResults && (
          <div className="space-y-10">
            {/* Players */}
            {players.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  PLAYERS ({players.length})
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {players.map((p) => (
                    <Link 
                      key={p.id} 
                      href={`/players/${p.id}`} 
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 hover:border-rcl-gold/50 transition-all"
                    >
                      <FaUser className="text-gray-500 h-4 w-4" />
                      <div>
                        <span className="block font-bold text-sm text-white">{p.first_name} {p.last_name}</span>
                        <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">RCL Athlete</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            {teams.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  TEAMS ({teams.length})
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {teams.map((t) => (
                    <Link 
                      key={t.id} 
                      href={`/teams/${t.slug}`} 
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 hover:border-rcl-gold/50 transition-all"
                    >
                      <FaBasketball className="text-gray-500 h-4 w-4" />
                      <div>
                        <span className="block font-bold text-sm text-white">{t.name}</span>
                        <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Division Roster</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Coaches */}
            {coaches.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  COACHES ({coaches.length})
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {coaches.map((c) => (
                    <Link 
                      key={c.id} 
                      href={`/coaches/${c.id}`} 
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 hover:border-rcl-gold/50 transition-all"
                    >
                      <FaChalkboardUser className="text-gray-500 h-4 w-4" />
                      <div>
                        <span className="block font-bold text-sm text-white">{c.first_name} {c.last_name}</span>
                        <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Tactical strategist</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Games Matchups */}
            {games.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  GAMES & SCHEDULES ({games.length})
                </span>
                <div className="grid gap-3">
                  {games.map((g) => (
                    <Link 
                      key={g.id} 
                      href={`/games/${g.id}`} 
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] p-4 hover:border-rcl-gold/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FaCalendarDays className="text-gray-500 h-4 w-4" />
                        <div>
                          <span className="block font-extrabold text-xs text-white uppercase tracking-tight">
                            {g.away_team?.name} @ {g.home_team?.name}
                          </span>
                          <span className="block text-[9px] text-gray-500 tracking-wider mt-0.5">
                            {new Date(g.scheduled_at).toLocaleDateString()} • {g.status}
                          </span>
                        </div>
                      </div>
                      {g.status === 'completed' && (
                        <span className="font-display font-black text-rcl-gold text-xs tracking-wider">
                          {g.away_score} - {g.home_score}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* News */}
            {news.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  NEWS ARTICLES ({news.length})
                </span>
                <div className="grid gap-3">
                  {news.map((item) => (
                    <Link 
                      key={item.id} 
                      href={`/news/${item.slug}`} 
                      className="block rounded-xl border border-white/5 bg-white/[0.01] p-4 hover:border-rcl-gold/50 transition-all"
                    >
                      <span className="block font-bold text-sm text-white">{item.title}</span>
                      <p className="mt-1 text-xs text-gray-400 line-clamp-1">{item.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Social Posts */}
            {posts.length > 0 && (
              <div>
                <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-4">
                  SOCIAL POSTS ({posts.length})
                </span>
                <div className="grid gap-3">
                  {posts.map((post) => (
                    <Link 
                      key={post.id} 
                      href="/social" 
                      className="block rounded-xl border border-white/5 bg-white/[0.01] p-4 hover:border-rcl-gold/50 transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mb-2 uppercase font-black tracking-wider">
                        <FaRegComment /> {post.author?.first_name ? `${post.author.first_name} ${post.author.last_name || ''}` : post.author?.display_name || 'RCL athlete'}
                      </div>
                      <p className="text-xs text-gray-300 font-sans line-clamp-2 leading-relaxed">{post.body}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </main>
  );
}
