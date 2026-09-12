import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaCrown, FaStar, FaRankingStar, FaChartLine } from 'react-icons/fa6';

export const revalidate = 60;

export default async function RankingsPage() {
  const client = getPublicClient();

  // Fetch public players, verified game statistics, and calculated Player IQ scores.
  const { data: rawPlayers } = client 
    ? await client.from('public_players').select('*, iq:public_player_iq(*)')
    : { data: [] };
  const { data: playerStats } = client
    ? await client.from('player_game_stats').select('player_id, points, rebounds, assists, steals, blocks')
    : { data: [] };
  const statsByPlayer = new Map<string, any[]>();
  for (const stat of (playerStats ?? []) as any[]) {
    const current = statsByPlayer.get(stat.player_id) ?? [];
    current.push(stat);
    statsByPlayer.set(stat.player_id, current);
  }

  const players = (rawPlayers || []).map((p: any) => {
    const stats = statsByPlayer.get(p.id) ?? [];
    const average = (key: string) => stats.length
      ? stats.reduce((total, stat) => total + Number(stat[key] ?? 0), 0) / stats.length
      : 0;
    const ovr = p.iq?.rcl_rating ?? null;

    return {
      ...p,
      ppg: average('points'),
      rpg: average('rebounds'),
      apg: average('assists'),
      spg: average('steals'),
      bpg: average('blocks'),
      ovr,
    };
  });

  // Sort leaderboards
  const ppgLeaders = [...players].sort((a, b) => b.ppg - a.ppg).slice(0, 5);
  const rpgLeaders = [...players].sort((a, b) => b.rpg - a.rpg).slice(0, 5);
  const apgLeaders = [...players].sort((a, b) => b.apg - a.apg).slice(0, 5);
  const ovrLeaders = [...players].filter((p) => p.ovr !== null).sort((a, b) => b.ovr - a.ovr).slice(0, 5);

  // Use the database-maintained standings rather than deriving records from identifiers.
  const { data: standingsData } = client
    ? await client.from('standings').select('*, team:teams(*)').order('rank', { ascending: true, nullsFirst: false })
    : { data: [] };

  const teams = (standingsData || []).map((standing: any) => {
    const wins = Number(standing.wins ?? 0);
    const losses = Number(standing.losses ?? 0);
    const gp = wins + losses;
    const pct = gp ? Math.round((wins / gp) * 100) : 0;
    const diff = Number(standing.points_for ?? 0) - Number(standing.points_against ?? 0);
    return { ...standing.team, wins, losses, gp, pct, diff };
  });

  // 3. Fetch Coaches
  const { data: coachesData } = client
    ? await client.from('team_coaches').select('*, profile:profiles(*)')
    : { data: [] };

  const coaches = (coachesData || []).map((c: any) => {
    const coachStandings = (standingsData || []).filter((standing: any) => standing.team_id === c.team_id);
    const wins = coachStandings.reduce((total: number, standing: any) => total + Number(standing.wins ?? 0), 0);
    const losses = coachStandings.reduce((total: number, standing: any) => total + Number(standing.losses ?? 0), 0);
    const gp = wins + losses;
    const pct = gp ? Math.round((wins / gp) * 100) : 0;
    const championships = 0;
    return { ...c, wins, losses, pct, championships };
  }).sort((a, b) => b.wins - a.wins || b.championships - a.championships);

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      {/* Title */}
      <section className="border-b border-white/10 py-16 text-center">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RICHMOND LEADERBOARDS
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            RCL <span className="text-rcl-gold">RANKINGS</span>
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Real-time standings, scoring champions, team records, and professional coaching legacy metrics.
          </p>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-12 space-y-16">
        {/* Section 1: Player Stat Leaders */}
        <section>
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <FaCrown className="text-rcl-gold h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-widest text-white">PLAYER STAT LEADERS</h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* OVR Rating card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-xl">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase">OVERALL OVR</span>
              <div className="mt-4 space-y-3">
                {ovrLeaders.length === 0 ? (
                  <p className="text-xs text-gray-500">No stats logged yet.</p>
                ) : (
                  ovrLeaders.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 font-bold">#{idx + 1}</span>
                        <Link href={`/players/${p.id}`} className="text-xs font-bold text-gray-200 hover:text-rcl-gold truncate max-w-[120px]">
                          {p.first_name} {p.last_name}
                        </Link>
                      </div>
                      <span className="font-display font-black text-rcl-gold">{p.ovr} OVR</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PPG card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-xl">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase">POINTS PER GAME</span>
              <div className="mt-4 space-y-3">
                {ppgLeaders.length === 0 ? (
                  <p className="text-xs text-gray-500">No stats logged yet.</p>
                ) : (
                  ppgLeaders.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 font-bold">#{idx + 1}</span>
                        <Link href={`/players/${p.id}`} className="text-xs font-bold text-gray-200 hover:text-rcl-gold truncate max-w-[120px]">
                          {p.first_name} {p.last_name}
                        </Link>
                      </div>
                      <span className="font-display font-black text-white">{p.ppg?.toFixed(1)} PPG</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RPG card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-xl">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase">REBOUNDS PER GAME</span>
              <div className="mt-4 space-y-3">
                {rpgLeaders.length === 0 ? (
                  <p className="text-xs text-gray-500">No stats logged yet.</p>
                ) : (
                  rpgLeaders.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 font-bold">#{idx + 1}</span>
                        <Link href={`/players/${p.id}`} className="text-xs font-bold text-gray-200 hover:text-rcl-gold truncate max-w-[120px]">
                          {p.first_name} {p.last_name}
                        </Link>
                      </div>
                      <span className="font-display font-black text-white">{p.rpg?.toFixed(1)} RPG</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* APG card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-xl">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase">ASSISTS PER GAME</span>
              <div className="mt-4 space-y-3">
                {apgLeaders.length === 0 ? (
                  <p className="text-xs text-gray-500">No stats logged yet.</p>
                ) : (
                  apgLeaders.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 font-bold">#{idx + 1}</span>
                        <Link href={`/players/${p.id}`} className="text-xs font-bold text-gray-200 hover:text-rcl-gold truncate max-w-[120px]">
                          {p.first_name} {p.last_name}
                        </Link>
                      </div>
                      <span className="font-display font-black text-white">{p.apg?.toFixed(1)} APG</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Team Rankings Standings */}
        <section>
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <FaRankingStar className="text-rcl-gold h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-widest text-white">TEAM STANDINGS</h2>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <th className="pb-3">RANK</th>
                  <th className="pb-3">TEAM</th>
                  <th className="pb-3 text-center">GAMES PLAYED</th>
                  <th className="pb-3 text-center">WINS</th>
                  <th className="pb-3 text-center">LOSSES</th>
                  <th className="pb-3 text-center">WIN %</th>
                  <th className="pb-3 text-center">POINT DIFF</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">No active division teams registered.</td>
                  </tr>
                ) : (
                  teams.map((team, idx) => (
                    <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.01] transition last:border-0">
                      <td className="py-4 font-mono font-bold text-gray-500">#{idx + 1}</td>
                      <td className="py-4">
                        <Link href={`/teams/${team.slug}`} className="font-bold text-white hover:text-rcl-gold">
                          {team.name}
                        </Link>
                      </td>
                      <td className="py-4 text-center font-bold text-gray-300">{team.gp}</td>
                      <td className="py-4 text-center font-display font-black text-rcl-gold text-sm">{team.wins}</td>
                      <td className="py-4 text-center font-bold text-white">{team.losses}</td>
                      <td className="py-4 text-center font-bold text-white">{team.pct}%</td>
                      <td className={`py-4 text-center font-mono font-bold ${team.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {team.diff >= 0 ? `+${team.diff}` : team.diff}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Coach Rankings */}
        <section>
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <FaChartLine className="text-rcl-gold h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-widest text-white">COACH OF THE YEAR STANDINGS</h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.length === 0 ? (
              <p className="text-xs text-gray-500 col-span-full text-center">No coach statistics loaded.</p>
            ) : (
              coaches.map((c, idx) => {
                const profile = c.profile;
                return (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 font-bold">#{idx + 1}</span>
                        <Link href={`/coaches/${c.profile_id}`} className="text-sm font-black text-white hover:text-rcl-gold">
                          {profile?.first_name} {profile?.last_name}
                        </Link>
                      </div>
                      <span className="block text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                        {c.title || 'Head Coach'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block font-display font-black text-rcl-gold text-lg">{c.wins} WINS</span>
                      <span className="block text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{c.pct}% WIN RATIO</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </Container>
    </main>
  );
}
