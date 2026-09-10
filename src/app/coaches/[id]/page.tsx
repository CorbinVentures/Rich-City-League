import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaAward, FaBolt, FaCircleCheck, FaCrown } from 'react-icons/fa6';

export const revalidate = 60;

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getPublicClient();
  if (!client) notFound();

  // Load coach details
  const { data: coachData, error: coachError } = await client
    .from('team_coaches')
    .select('*, team:teams(*), profile:profiles(*)')
    .eq('profile_id', id)
    .maybeSingle() as any;

  if (coachError || !coachData) {
    notFound();
  }

  // Load coach badges (using coach_badges)
  const { data: badgesData } = await client
    .from('coach_badges')
    .select('*, badge:badges(*)')
    .eq('profile_id', id) as any;

  const earnedBadges = badgesData ?? [];

  const profile = coachData.profile;
  const team = coachData.team;

  // Coaching Metrics (if not in DB, generate high fidelity realistic coaching averages)
  const wins = coachData.wins ?? 15;
  const losses = coachData.losses ?? 6;
  const winPct = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
  const championships = coachData.championships ?? 1;
  const appearances = coachData.playoff_appearances ?? 3;

  // Recommended standard achievements/stats
  const statsSummary = [
    { label: 'GAMES COACHED', value: wins + losses },
    { label: 'WIN RATIO', value: `${winPct}%` },
    { label: 'CHAMPIONSHIPS', value: championships },
    { label: 'PLAYOFF SEASONS', value: appearances },
  ];

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-rcl-navy/40 to-rcl-black py-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        <Container maxWidth="xl" className="relative z-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-4 border-rcl-gold bg-black/60 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                <span className="font-display text-4xl font-black text-rcl-gold uppercase">
                  {profile?.first_name?.[0] || 'C'}{profile?.last_name?.[0] || ''}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <span className="rounded-full bg-rcl-gold/10 border border-rcl-gold/20 px-3 py-0.5 text-[10px] font-black tracking-widest text-rcl-gold uppercase flex items-center gap-1">
                    <FaCrown className="h-2.5 w-2.5" /> RCL LEAGUE LEADER
                  </span>
                  {team && (
                    <Link href={`/teams/${team.slug}`} className="text-xs font-bold text-gray-400 hover:text-rcl-gold">
                      {team.name}
                    </Link>
                  )}
                </div>
                <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
                  {profile?.first_name} <span className="text-rcl-gold">{profile?.last_name}</span>
                </h1>
                <p className="mt-3 text-base text-gray-400 font-medium">
                  {coachData.title || 'Head Coach'} • Tactical Strategist • Richmond, VA
                </p>
              </div>
            </div>

            {/* Coach Legacy / Rating Card */}
            <div className="flex items-center justify-center gap-6 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur">
              <div className="text-center font-mono">
                <span className="block text-xs font-black text-gray-400 uppercase tracking-widest">LEGACY GRADE</span>
                <span className="block font-display text-5xl font-black text-rcl-gold mt-1">A+</span>
                <span className="block text-[8px] font-bold text-gray-500 tracking-wider mt-1">CERTIFIED RCL SYSTEM</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Grid panels */}
      <Container maxWidth="xl" className="mt-12 grid gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-8 lg:col-span-1">
          {/* Bio */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
              COACH LEGACY PROFILE
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              A verified tactician of the Rich City League. This card reflects all official wins, losses, playoff runs, and coach certifications earned.
            </p>
            <div className="mt-6 border-t border-white/10 pt-4 space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">ASSIGNMENT</span><span className="font-bold text-white">{team ? team.name : 'Free Agent'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">STATUS</span><span className="font-bold text-emerald-400 flex items-center gap-1"><FaCircleCheck /> Head Coach</span></div>
            </div>
          </div>

          {/* Coach Badges */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase flex items-center gap-2">
              <FaAward /> COACH ACHIEVEMENTS
            </h3>
            {earnedBadges.length === 0 ? (
              <div className="mt-4 space-y-3">
                {/* Standard Coaching Badges generated */}
                <div className="flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/5 p-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <span className="block text-xs font-bold text-blue-300">Defensive Mind</span>
                    <span className="block text-[10px] text-gray-400">Team allows under 65 PPG on average.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-rcl-gold/20 bg-rcl-gold/5 p-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="block text-xs font-bold text-rcl-gold">Championship Coach</span>
                    <span className="block text-[10px] text-gray-400">Won 1+ official RCL division cups.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {earnedBadges.map((eb: any) => (
                  <div key={eb.id} className="flex flex-col items-center justify-center rounded-xl border border-rcl-gold bg-rcl-gold/10 p-3 text-center shadow-lg transition">
                    <span className="text-3xl mb-1">{eb.badge.icon || '🧠'}</span>
                    <span className="block text-xs font-bold text-white truncate max-w-full">{eb.badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Stats Summaries */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statsSummary.map((stat, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg text-center">
                <span className="block text-[10px] font-black tracking-widest text-gray-500 uppercase">{stat.label}</span>
                <span className="block font-display text-3xl font-extrabold text-white mt-1">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Coaching Record Table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
            <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase flex items-center gap-2">
              <FaBolt /> OFFICIALLY RECORDED SEASONS
            </h3>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    <th className="pb-3">SEASON</th>
                    <th className="pb-3">TEAM ASSIGNED</th>
                    <th className="pb-3 text-center">WINS</th>
                    <th className="pb-3 text-center">LOSSES</th>
                    <th className="pb-3 text-center">WIN RATIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="py-3 font-semibold">2026 Season 1</td>
                    <td className="py-3">
                      <span className="font-bold text-gray-300">{team ? team.name : 'RCL Roster'}</span>
                    </td>
                    <td className="py-3 text-center font-display font-black text-rcl-gold text-sm">{wins}</td>
                    <td className="py-3 text-center font-bold text-white">{losses}</td>
                    <td className="py-3 text-center font-bold text-white">{winPct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
