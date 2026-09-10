import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';

export const revalidate = 60;

export default async function FanProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const client = getPublicClient();
  if (!client) notFound();
  const { data: profile } = await client.from('profiles').select('id,username,display_name,avatar_url,bio,location,created_at').eq('username', username).eq('is_active', true).maybeSingle();
  if (!profile) notFound();
  const [{ data: fan }, { data: score }] = await Promise.all([
    client.from('fan_profiles').select('fan_level,games_attended,favorite_team_id').eq('profile_id', profile.id).maybeSingle(),
    client.from('score_explanations').select('score,components,data_points,calculated_at').eq('profile_id', profile.id).eq('score_type', 'fan_win_factor').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><section className="border-b border-white/10 bg-rcl-navy/40 py-16"><Container maxWidth="xl"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL FAN PROFILE</p><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-rcl-gold/50 bg-black text-3xl font-black text-rcl-gold">{(profile.display_name ?? profile.username ?? 'F').slice(0, 1).toUpperCase()}</div><div><h1 className="font-display text-4xl font-black">{profile.display_name ?? profile.username}</h1><p className="mt-1 text-gray-400">@{profile.username}</p>{profile.bio && <p className="mt-3 max-w-xl text-gray-300">{profile.bio}</p>}</div></div></Container></section><Container maxWidth="xl" className="grid gap-6 py-10 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-black tracking-widest text-gray-500">FAN LEVEL</p><p className="mt-2 font-display text-5xl font-black text-rcl-gold">{fan?.fan_level ?? 1}</p><p className="mt-3 text-sm text-gray-400">{fan?.games_attended ?? 0} games attended</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2"><div className="flex items-center justify-between"><p className="text-xs font-black tracking-widest text-gray-500">RCL FAN WIN FACTOR</p><span className="text-xs text-gray-500">{score?.data_points ? `${score.data_points} data points` : 'Building'}</span></div><p className="mt-2 font-display text-5xl font-black text-rcl-gold">{score?.score ?? '—'}</p>{score ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries((score.components ?? {}) as Record<string, unknown>).map(([label, value]) => <div key={label} className="flex justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"><span className="text-gray-400">{label}</span><span className="font-bold">{String(value)}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-400">Participate in games, predictions, and community activities to establish a transparent score.</p>}</div></Container></main>;
}
