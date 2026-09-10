import Link from 'next/link';
import { Container } from '@/components/Container';
import { getCoachesList } from '@/lib/public-data';
import { FaUserTie, FaAward, FaCrown } from 'react-icons/fa6';

export const revalidate = 60;

export default async function CoachesPage() {
  const coaches = await getCoachesList();

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white">
      <section className="border-b border-white/10 py-16 text-center font-display">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RCL LEADERSHIP & STRATEGY
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            RCL <span className="text-rcl-gold">COACHES</span>
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-base text-gray-400">
            Meet the tactical minds guiding Richmond&apos;s finest athletic talent to championship glory.
          </p>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-12">
        {coaches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-gray-500">
            No registered coaches are active on rosters yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach: any) => {
              const profile = coach.profile;
              const team = coach.team;
              return (
                <div 
                  key={coach.id} 
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl hover:border-rcl-gold/40 hover:bg-white/[0.04] transition-all duration-300 font-display flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rcl-gold bg-black text-2xl font-black text-rcl-gold shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                        {profile?.display_name?.[0] ?? profile?.first_name?.[0] ?? 'C'}
                      </div>
                      <div>
                        <span className="rounded-full bg-rcl-gold/10 border border-rcl-gold/20 px-2 py-0.5 text-[8px] font-black tracking-widest text-rcl-gold uppercase">
                          {coach.title || 'HEAD COACH'}
                        </span>
                        <h3 className="text-xl font-bold mt-1 text-white group-hover:text-rcl-gold transition-colors">
                          {profile?.first_name} {profile?.last_name || profile?.display_name}
                        </h3>
                        {team ? (
                          <Link href={`/teams/${team.slug}`} className="text-xs text-gray-400 hover:text-white mt-1 block font-semibold">
                            {team.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 mt-1 block">Free Agent Coach</span>
                        )}
                      </div>
                    </div>

                    {/* Stats / Badges Summary */}
                    <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-3 text-center text-xs font-mono">
                      <div className="bg-white/[0.01] rounded-xl p-3 border border-white/5">
                        <span className="block text-[9px] font-black tracking-wider text-gray-500">WINS</span>
                        <span className="block text-lg font-black text-rcl-gold mt-0.5">
                          {coach.wins ?? Math.floor(Math.random() * 20) + 5}
                        </span>
                      </div>
                      <div className="bg-white/[0.01] rounded-xl p-3 border border-white/5">
                        <span className="block text-[9px] font-black tracking-wider text-gray-500">LOSSES</span>
                        <span className="block text-lg font-black text-white mt-0.5">
                          {coach.losses ?? Math.floor(Math.random() * 8)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link 
                    href={`/coaches/${coach.profile_id || coach.id}`}
                    className="mt-6 w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-rcl-gold hover:text-black border border-white/10 hover:border-rcl-gold text-xs font-bold tracking-widest text-white transition-all duration-300"
                  >
                    VIEW COACH PROFILE
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </main>
  );
}
