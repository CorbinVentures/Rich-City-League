import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getPlayerDetail, getPublicClient } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';
import { FaAward, FaBolt, FaCircleCheck } from 'react-icons/fa6';
import { calculatePlayerIQ } from '@/lib/player-iq';

export const revalidate = 60;

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlayerDetail(id);
  if (!data) notFound();

  const { player, rosters, teamSeasons, teams, seasons, divisions, games, stats, iq, iqHistory } = data;
  const client = getPublicClient();

  // Load earned badges
  let earnedBadges: any[] = [];
  if (client) {
    const { data: badgesData } = await client
      .from('player_badges')
      .select('*, badge:badges(*)')
      .eq('player_id', id);
    earnedBadges = badgesData ?? [];
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const divisionById = new Map(divisions.map((division) => [division.id, division]));
  const teamSeasonById = new Map(teamSeasons.map((item) => [item.id, item]));
  const statByGame = new Map(stats.map((stat) => [stat.game_id, stat]));

  // Calculate stats averages
  const totalGames = stats.length;
  const avgPoints = totalGames ? Number((stats.reduce((sum, s) => sum + s.points, 0) / totalGames).toFixed(1)) : 0;
  const avgRebounds = totalGames ? Number((stats.reduce((sum, s) => sum + s.rebounds, 0) / totalGames).toFixed(1)) : 0;
  const avgAssists = totalGames ? Number((stats.reduce((sum, s) => sum + s.assists, 0) / totalGames).toFixed(1)) : 0;
  const avgSteals = totalGames ? Number((stats.reduce((sum, s) => sum + s.steals, 0) / totalGames).toFixed(1)) : 0;
  const avgBlocks = totalGames ? Number((stats.reduce((sum, s) => sum + s.blocks, 0) / totalGames).toFixed(1)) : 0;

  // Calculate field goal percentage
  const totalFGM = stats.reduce((sum, s) => sum + s.field_goals_made, 0);
  const totalFGA = stats.reduce((sum, s) => sum + s.field_goals_attempted, 0);
  const fgPct = totalFGA ? Math.round((totalFGM / totalFGA) * 100) : 0;

  // Calculate three point percentage
  const total3PM = stats.reduce((sum, s) => sum + s.three_pointers_made, 0);
  const total3PA = stats.reduce((sum, s) => sum + s.three_pointers_attempted, 0);
  const threePct = total3PA ? Math.round((total3PM / total3PA) * 100) : 0;

  const calculatedIQ = calculatePlayerIQ({ stats });
  const playerIQ = iq ?? {
    rcl_rating: calculatedIQ.rclRating,
    court_performance_score: calculatedIQ.courtPerformance,
    skill_profile_score: calculatedIQ.skillProfile,
    teammate_grade_score: calculatedIQ.teammateGrade,
    community_popularity_score: calculatedIQ.communityPopularity,
    growth_consistency_score: calculatedIQ.growthConsistency,
    exposure_index: calculatedIQ.exposureIndex,
    player_archetype: calculatedIQ.archetype,
    rating_trend: calculatedIQ.trend,
    rating_change: calculatedIQ.ratingChange,
    games_evaluated: calculatedIQ.gamesEvaluated,
  };

  // Keep the existing stat cards while exposing the cached Player IQ dimensions.
  const scoreRating = Math.min(99, Math.max(50, Math.round(50 + (avgPoints * 2.5))));
  const passingRating = Math.min(99, Math.max(50, Math.round(50 + (avgAssists * 5))));
  const reboundRating = Math.min(99, Math.max(50, Math.round(50 + (avgRebounds * 4))));
  const defenseRating = Math.min(99, Math.max(50, Math.round(50 + ((avgSteals + avgBlocks) * 8))));
  const overallRating = Math.round(playerIQ.rcl_rating);

  // Get current active team
  const currentRoster = rosters[0];
  const currentTeamSeason = currentRoster ? teamSeasonById.get(currentRoster.team_season_id) : null;
  const currentTeam = currentTeamSeason ? teamById.get(currentTeamSeason.team_id) : null;

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white">
      {/* 2K Style Player Card Hero Header */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-rcl-navy/40 to-rcl-black py-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        <Container maxWidth="xl" className="relative z-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Player Main Info */}
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              {/* Photo Frame */}
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl border-4 border-rcl-gold bg-black/60 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={`${player.first_name}`} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <span className="font-display text-4xl font-black text-rcl-gold uppercase">
                    {player.first_name?.[0]}{player.last_name?.[0]}
                  </span>
                )}
                {player.jersey_number && (
                  <span className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-rcl-gold font-display text-lg font-black text-black border-2 border-black">
                    #{player.jersey_number}
                  </span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <span className="rounded-full bg-rcl-gold/10 border border-rcl-gold/20 px-3 py-0.5 text-[10px] font-black tracking-widest text-rcl-gold uppercase">
                    RCL ATHLETE
                  </span>
                  {currentTeam && (
                    <Link href={`/teams/${currentTeam.slug}`} className="text-xs font-bold text-gray-400 hover:text-rcl-gold">
                      {currentTeam.name}
                    </Link>
                  )}
                </div>
                <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
                  {player.first_name} <span className="text-rcl-gold">{player.last_name}</span>
                </h1>
                <p className="mt-3 text-base text-gray-400 font-medium">
                  {player.position || 'Forward-Guard'} • {player.height_inches ? `${Math.floor(player.height_inches / 12)}'${player.height_inches % 12}"` : 'Height N/A'} • {player.hometown || 'Richmond, VA'}
                </p>
              </div>
            </div>

            {/* Video Game Overall Rating Circle */}
            <div className="flex items-center justify-center gap-6 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-rcl-gold bg-black shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                <div className="text-center">
                  <span className="block font-display text-3xl font-black text-white">{overallRating}</span>
                  <span className="block text-[8px] font-bold tracking-widest text-rcl-gold">RCL IQ</span>
                </div>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between gap-8"><span className="text-gray-400 uppercase font-black">COURT</span><span className="font-bold text-white">{Math.round(playerIQ.court_performance_score)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-400 uppercase font-black">SKILLS</span><span className="font-bold text-white">{Math.round(playerIQ.skill_profile_score)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-400 uppercase font-black">TEAMMATE</span><span className="font-bold text-white">{Math.round(playerIQ.teammate_grade_score)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-400 uppercase font-black">EXPOSURE</span><span className="font-bold text-white">{Math.round(playerIQ.exposure_index)}</span></div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Roster & Stats Panels */}
      <Container maxWidth="xl" className="mt-12 grid gap-8 lg:grid-cols-3">
        {/* Left Column: Player Cards / Bio / Team */}
        <div className="space-y-8 lg:col-span-1">
          {/* Quick Bio */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
              ATHLETE BIO
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              {player.is_active ? 'Active player' : 'Inactive player'} currently registered in Richmond&apos;s Rich City League. This card represents certified league credentials.
            </p>
            <div className="mt-6 border-t border-white/10 pt-4 space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">HOMETOWN</span><span className="font-bold text-white">{player.hometown || 'Richmond, VA'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AGE DIVISION</span><span className="font-bold text-white">Open Men&apos;s</span></div>
              <div className="flex justify-between"><span className="text-gray-500">STATUS</span><span className="font-bold text-emerald-400 flex items-center gap-1"><FaCircleCheck /> Certified</span></div>
            </div>
          </div>

          {/* Active Badges */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase flex items-center gap-2">
              <FaAward /> EARNED BADGES ({earnedBadges.length})
            </h3>
            {earnedBadges.length === 0 ? (
              <p className="mt-4 text-xs text-gray-500">
                No performance badges unlocked yet. Standard badges trigger automatically on game stat recordings.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {earnedBadges.map((eb) => {
                  const badge = eb.badge;
                  const tierColor = 
                    badge.tier === 'elite' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                    badge.tier === 'gold' ? 'border-rcl-gold text-rcl-gold bg-rcl-gold/10' :
                    badge.tier === 'silver' ? 'border-blue-400 text-blue-300 bg-blue-500/10' :
                    'border-amber-700 text-amber-500 bg-amber-700/10';
                  return (
                    <div key={eb.id} className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center shadow-lg transition hover:scale-105 ${tierColor}`}>
                      <span className="text-3xl mb-1">{badge.icon || '🏆'}</span>
                      <span className="block text-[10px] font-black tracking-wider uppercase truncate max-w-full">{badge.name}</span>
                      <span className="block text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">{badge.tier}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team seasons */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
              TEAM ROSTERS
            </h3>
            {rosters.length === 0 ? (
              <p className="mt-4 text-xs text-gray-500">Not assigned to any team rosters currently.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {rosters.map((roster) => {
                  const teamSeason = teamSeasonById.get(roster.team_season_id);
                  const team = teamSeason ? teamById.get(teamSeason.team_id) : null;
                  if (!teamSeason || !team) return null;
                  return (
                    <div key={roster.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-4 hover:border-rcl-gold/30 transition">
                      <div>
                        <Link href={`/teams/${team.slug}`} className="font-bold text-white hover:text-rcl-gold">
                          {team.name}
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                          {seasonById.get(teamSeason.season_id)?.name} • {divisionById.get(teamSeason.division_id || '')?.name || 'Division 1'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs font-black text-rcl-gold">
                        #{roster.jersey_number || player.jersey_number || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Stats Grid */}
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-rcl-gold/20 bg-rcl-gold/[0.04] p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">PLAYER DNA</h2>
                <p className="mt-1 text-xs text-gray-400">{playerIQ.player_archetype ?? 'Not enough data'} · {playerIQ.rating_trend} trend</p>
              </div>
              <div className="text-right"><span className="block text-[9px] uppercase tracking-widest text-gray-500">Exposure Index</span><span className="font-display text-2xl font-black text-white">{Math.round(playerIQ.exposure_index)}</span></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Court Performance', playerIQ.court_performance_score],
                ['Skill Profile', playerIQ.skill_profile_score],
                ['Teammate Grade', playerIQ.teammate_grade_score],
                ['Community', playerIQ.community_popularity_score],
                ['Growth', playerIQ.growth_consistency_score],
              ].map(([label, value]) => <div key={label as string}><div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-400"><span>{label as string}</span><b className="text-white">{Math.round(value as number)}</b></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-rcl-gold" style={{ width: `${value}%` }} /></div></div>)}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-gray-400">Your RCL Rating is weighted toward court performance and skill, with teammate impact, community popularity, and sustained growth contributing separately. {playerIQ.rating_change > 0 ? `Your rating is up ${playerIQ.rating_change}.` : 'Add more completed game logs to improve rating confidence.'}</p>
            {iqHistory.length > 1 && <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">Rating history: {iqHistory.map((item) => Math.round(item.rcl_rating)).join(' → ')}</p>}
          </div>
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg text-center">
              <span className="block text-[10px] font-black tracking-widest text-gray-500 uppercase">GAMES</span>
              <span className="block font-display text-3xl font-extrabold text-white mt-1">{totalGames}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg text-center">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase">PPG</span>
              <span className="block font-display text-3xl font-extrabold text-rcl-gold mt-1">{avgPoints}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg text-center">
              <span className="block text-[10px] font-black tracking-widest text-white uppercase">RPG</span>
              <span className="block font-display text-3xl font-extrabold text-white mt-1">{avgRebounds}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg text-center">
              <span className="block text-[10px] font-black tracking-widest text-white uppercase">APG</span>
              <span className="block font-display text-3xl font-extrabold text-white mt-1">{avgAssists}</span>
            </div>
          </div>

          {/* Shooting splits & Advanced */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
              EFFICIENCY & ACCURACY
            </h3>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {/* splits */}
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FG SPLIT</span>
                <p className="font-display text-2xl font-black text-white mt-1">{fgPct}%</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-rcl-gold" style={{ width: `${fgPct}%` }} />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3PT SPLIT</span>
                <p className="font-display text-2xl font-black text-white mt-1">{threePct}%</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-rcl-blue" style={{ width: `${threePct}%` }} />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">STOCKS/G</span>
                <p className="font-display text-2xl font-black text-white mt-1">{(avgSteals + avgBlocks).toFixed(1)}</p>
                <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider">{avgSteals} STL • {avgBlocks} BLK</p>
              </div>
            </div>
          </div>

          {/* Game Logs */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase flex items-center gap-2">
              <FaBolt /> GAME-BY-GAME STAT LOGS
            </h3>
            {stats.length === 0 ? (
              <p className="mt-4 text-xs text-gray-500">No official game logs recorded yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      <th className="pb-3">DATE / GAME</th>
                      <th className="pb-3">TEAM</th>
                      <th className="pb-3 text-center">PTS</th>
                      <th className="pb-3 text-center">REB</th>
                      <th className="pb-3 text-center">AST</th>
                      <th className="pb-3 text-center">STL</th>
                      <th className="pb-3 text-center">BLK</th>
                      <th className="pb-3 text-center">3PM-3PA</th>
                      <th className="pb-3 text-center">MIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game) => {
                      const stat = statByGame.get(game.id);
                      if (!stat) return null;
                      const team = teamById.get(stat.team_id);
                      return (
                        <tr key={game.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                          <td className="py-3 font-semibold">
                            <span className="block font-black">{formatDate(game.scheduled_at)}</span>
                            <span className="block text-[9px] font-bold text-gray-500 uppercase">{game.status}</span>
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-gray-300">{team ? team.short_name || team.name : 'RCL Team'}</span>
                          </td>
                          <td className="py-3 text-center font-display font-black text-rcl-gold text-sm">{stat.points}</td>
                          <td className="py-3 text-center font-bold text-white">{stat.rebounds}</td>
                          <td className="py-3 text-center font-bold text-white">{stat.assists}</td>
                          <td className="py-3 text-center text-gray-300">{stat.steals}</td>
                          <td className="py-3 text-center text-gray-300">{stat.blocks}</td>
                          <td className="py-3 text-center text-gray-400 font-mono">{stat.three_pointers_made}-{stat.three_pointers_attempted}</td>
                          <td className="py-3 text-center text-gray-400 font-mono">{stat.minutes ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
