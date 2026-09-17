'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBolt, FaCheck, FaChartLine, FaDumbbell, FaFilm, FaFlask, FaGamepad, FaRotate, FaShieldHalved, FaTriangleExclamation, FaBrain, FaMedal, FaBullseye } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type WorkoutDrill = { id: string; title: string; description: string; prescription: string; duration: number; focus: string[]; coachingPoints: string[]; commonMistakes: string[]; skill: string; videoId: string };
type Workout = { title: string; skill: string; minutes: number; difficulty: string; goal: string; warmup: string[]; drills: WorkoutDrill[]; finisher: string; coachingNotes: string[] };
type ApiError = { message?: string };
type LabPlayer = { first_name: string; last_name: string; position: string | null; height_inches: number | null; hometown: string | null; photo_url: string | null; ovr: number | null; iq: number | null; exposure: number | null; level: number | null; xp: number | null; badgeCount: number };

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];

const labModules = [
  { title: 'Training', body: 'Put in the work.', icon: FaDumbbell, target: 'training' },
  { title: 'Player Lab', body: 'Build your player.', icon: FaFlask, target: 'player-lab' },
  { title: 'Film Room', body: 'Study. Improve. Repeat.', icon: FaFilm, target: 'film-room' },
  { title: 'Basketball IQ', body: 'Think the game.', icon: FaBrain, target: 'iq' },
  { title: 'Skill Challenges', body: 'Daily grind.', icon: FaBullseye, target: 'challenges' },
  { title: 'Badge Lab', body: 'Earn your badges.', icon: FaMedal, target: 'badges' },
  { title: 'AI Coach', body: 'Your virtual coach.', icon: FaGamepad, target: 'coach' },
];

function readHistory(): Workout[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem('rcl-workouts') ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is Workout => Boolean(item) && typeof item === 'object' && typeof (item as Workout).title === 'string') : [];
  } catch { return []; }
}

export default function LabPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient() as any, []);
  const [player, setPlayer] = useState<LabPlayer | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [skill, setSkill] = useState(skills[0]);
  const [level, setLevel] = useState(levels[1]);
  const [length, setLength] = useState(45);
  const [environment, setEnvironment] = useState(environments[0]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Basketball']);
  const [goal, setGoal] = useState('');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [status, setStatus] = useState<'idle'|'loading'|'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => setHistory(readHistory()), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) { setPlayerLoading(false); return; }
    let active = true;
    const load = async () => {
      try {
        const levelResult = await supabase.from('user_levels').select('level,xp').eq('profile_id', user.id).maybeSingle();
        if (profile?.role !== 'player') { if (active) setPlayerLoading(false); return; }
        const playerResult = await supabase.from('players').select('first_name,last_name,position,height_inches,hometown,photo_url').eq('profile_id', user.id).maybeSingle();
        if (playerResult.error) throw playerResult.error;
        if (!playerResult.data) { if (active) setPlayerLoading(false); return; }
        const p = playerResult.data;
        const [iqResult, badgeResult] = await Promise.all([
          supabase.from('public_player_iq').select('rcl_rating,exposure_index').eq('player_id', (await supabase.from('players').select('id').eq('profile_id', user.id).maybeSingle()).data?.id ?? '').maybeSingle(),
          supabase.from('player_badges').select('id').eq('player_id', (await supabase.from('players').select('id').eq('profile_id', user.id).maybeSingle()).data?.id ?? ''),
        ]);
        if (active) setPlayer({ first_name:p.first_name,last_name:p.last_name,position:p.position,height_inches:p.height_inches,hometown:p.hometown,photo_url:p.photo_url,ovr:iqResult.data?.rcl_rating ?? null,iq:iqResult.data?.rcl_rating ?? null,exposure:iqResult.data?.exposure_index ?? null,level:levelResult.data?.level ?? null,xp:levelResult.data?.xp ?? null,badgeCount:(badgeResult.data ?? []).length });
      } catch (error) {
        console.error('Unable to load Lab player data', error);
      } finally { if (active) setPlayerLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [authLoading, profile?.role, supabase, user]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (status === 'loading') return;
    if (!selectedEquipment.length) { setStatus('error'); setErrorMessage('Select at least one equipment option.'); return; }
    setStatus('loading'); setErrorMessage('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/lab/workout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ skill, level, length, environment, equipment:selectedEquipment, goal:goal.trim() }), signal:controller.signal });
      const payload:{workout?:Workout;error?:ApiError|string}=await response.json().catch(()=>({}));
      if(!response.ok||!payload.workout) throw new Error(typeof payload.error==='string'?payload.error:payload.error?.message||'The session could not be built.');
      const next=[payload.workout,...history.filter(item=>item.title!==payload.workout?.title)].slice(0,6);
      setWorkout(payload.workout); setHistory(next); try { window.localStorage.setItem('rcl-workouts',JSON.stringify(next)); } catch {}
      setStatus('idle');
    } catch(error) { setStatus('error'); setErrorMessage(error instanceof Error&&error.name==='AbortError'?'The request took too long. Try again.':error instanceof Error?error.message:'Generation failed. Try again.'); }
    finally { window.clearTimeout(timeout); }
  }

  const displayName = player ? `${player.first_name} ${player.last_name}` : profile?.display_name ?? 'RCL Player';
  const height = player?.height_inches ? `${Math.floor(player.height_inches / 12)}'${player.height_inches % 12}"` : '—';
  const ovr = player?.ovr ?? '—';
  const xp = player?.xp ?? 0;
  const levelNumber = player?.level ?? 1;
  const xpProgress = Math.min(100, Math.round(((xp % 3000) / 3000) * 100));

  return <main className="min-h-screen overflow-hidden bg-[#05080d] pb-24 text-white">
    <section className="relative min-h-[590px] overflow-hidden border-b border-white/10 bg-[#07111c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_66%_42%,rgba(35,133,220,.28),transparent_25%),radial-gradient(circle_at_82%_30%,rgba(255,107,26,.18),transparent_22%),linear-gradient(180deg,#07111c_0%,#07111c_45%,#030509_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-[linear-gradient(180deg,transparent,rgba(2,5,9,.9)),repeating-linear-gradient(90deg,transparent_0_72px,rgba(77,163,255,.08)_73px_74px)]" />
      <div className="absolute bottom-0 left-0 right-0 h-48 opacity-30 [background:linear-gradient(90deg,transparent_0_7%,#123a58_7%_11%,transparent_11%_16%,#0e2940_16%_23%,transparent_23%_29%,#154563_29%_37%,transparent_37%_44%,#102e49_44%_52%,transparent_52%_60%,#164c6d_60%_68%,transparent_68%_76%,#0e2b44_76%_85%,transparent_85%)] [clip-path:polygon(0_58%,6%_45%,11%_62%,15%_35%,21%_58%,27%_25%,34%_60%,40%_42%,46%_62%,52%_20%,58%_56%,64%_37%,71%_62%,77%_30%,83%_56%,89%_40%,95%_60%,100%_45%,100%_100%,0_100%)]" />
      <div className="absolute right-[8%] top-[24%] hidden rotate-[-8deg] font-black uppercase leading-[.8] text-white/[.06] lg:block lg:text-[7rem]">RVA</div>
      <Container maxWidth="xl" className="relative z-10 py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr_.65fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-[10px] font-black tracking-[.28em] text-rcl-orange">RCL PERFORMANCE LAB</p>
            <h1 className="mt-4 font-display text-6xl font-black uppercase leading-[.82] sm:text-8xl">The<br /><span className="text-rcl-blue">Lab.</span></h1>
            <p className="mt-5 max-w-md text-sm font-medium leading-7 text-white/55">Train. Create. Analyze. Evolve.<br />Richmond builds different.</p>
            <div className="mt-7 h-px w-28 bg-rcl-orange" />
          </div>
          <div className="relative order-1 flex min-h-[390px] items-end justify-center lg:order-2">
            <div className="absolute bottom-0 h-[340px] w-[270px] rounded-[50%_50%_8%_8%] bg-[radial-gradient(ellipse_at_50%_22%,rgba(255,255,255,.15),transparent_4%),linear-gradient(90deg,#05070b,#17283a_48%,#05070b)] shadow-[0_0_80px_rgba(30,126,205,.2)]" />
            <div className="absolute bottom-[285px] h-24 w-24 rounded-full bg-[radial-gradient(circle_at_38%_30%,#41556a,#0a0d12_68%)] shadow-[0_0_40px_rgba(77,163,255,.18)]" />
            <div className="absolute bottom-[315px] h-10 w-32 rounded-[50%] bg-[#05070b]" />
            <div className="absolute bottom-16 h-56 w-[360px] rounded-[50%] border border-rcl-blue/10 bg-rcl-blue/5 blur-2xl" />
            <span className="absolute bottom-8 font-black uppercase tracking-[.3em] text-white/15">MORE THAN A GAME</span>
          </div>
          <div className="order-3 hidden lg:block">
            <div className="border-l border-white/10 pl-7 text-right">
              <p className="text-4xl font-black uppercase leading-[.9]">Harder<br />Smarter<br /><span className="text-rcl-orange">Better.</span></p>
              <p className="mt-5 text-[9px] font-black tracking-[.25em] text-white/30">RICHMOND, VIRGINIA</p>
            </div>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="relative z-20 -mt-12">
      <div className="grid gap-4 xl:grid-cols-[1.7fr_.75fr]">
        <section id="player-lab" className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a111b]/95 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_60%_45%,rgba(255,107,26,.08),transparent_55%)]" />
          <div className="relative grid md:grid-cols-[190px_1fr_150px]">
            <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(145deg,#163b5d,#07111c)]">
              {player?.photo_url ? <img src={player.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" /> : <div className="absolute inset-0 flex items-center justify-center text-7xl font-black text-white/10">RCL</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07101a] via-transparent to-transparent" />
              <span className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-[8px] font-black tracking-widest text-rcl-orange">LAB PROFILE</span>
            </div>
            <div className="p-6 sm:p-7">
              <p className="text-[9px] font-black tracking-[.22em] text-rcl-blue">YOUR PLAYER</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl font-black sm:text-3xl">{displayName}</h2><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/45">{player?.position ?? 'Player'} · {height} · {player?.hometown ?? 'Richmond, VA'}</p></div><Link href="/profile" className="text-[9px] font-black uppercase tracking-widest text-rcl-orange">View profile →</Link></div>
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3">
                <Progress label="Finishing" value={player?.ovr ? Math.max(1, player.ovr - 4) : null} />
                <Progress label="Physical" value={player?.ovr ? Math.min(99, player.ovr + 6) : null} />
                <Progress label="Shooting" value={player?.ovr ? Math.min(99, player.ovr + 2) : null} />
                <Progress label="Defense" value={player?.ovr ? Math.max(1, player.ovr - 1) : null} />
                <Progress label="Playmaking" value={player?.iq ?? null} />
                <Progress label="Basketball IQ" value={player?.iq ?? null} />
              </div>
              <div className="mt-5 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rcl-blue to-rcl-orange" style={{width:`${xpProgress}%`}} /></div><span className="text-[9px] font-black text-white/40">LVL {levelNumber}</span></div>
              <div className="mt-2 flex justify-between text-[8px] font-black tracking-widest text-white/25"><span>NEXT LEVEL</span><span>{xp.toLocaleString()} XP</span></div>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-white/10 p-6 text-center">
              <p className="text-[8px] font-black tracking-[.2em] text-rcl-orange">OVR</p>
              <div className="mt-2 grid h-28 w-28 place-items-center rounded-full border-[8px] border-rcl-blue/25 bg-black/30 shadow-[inset_0_0_30px_rgba(77,163,255,.12)]"><span className="font-display text-5xl font-black">{ovr}</span></div>
              <p className="mt-3 text-[8px] font-black tracking-widest text-white/30">{player ? 'OFFICIAL RCL DATA' : 'SIGN IN TO SYNC'}</p>
            </div>
          </div>
        </section>

        <section id="challenges" className="rounded-[1.5rem] border border-white/10 bg-[#0a111b]/95 p-6 shadow-2xl">
          <p className="text-[9px] font-black tracking-[.2em] text-rcl-blue">TODAY'S CHALLENGE</p>
          <div className="mt-5 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange"><FaBullseye /></div><div><h2 className="font-display text-xl font-black uppercase">The 804 Shootout</h2><p className="mt-2 text-xs leading-5 text-white/45">Make 10 three-pointers and keep the city talking.</p></div></div>
          <div className="mt-6 flex items-end justify-between"><div><p className="text-3xl font-black">0<span className="text-white/25"> / 10</span></p><p className="text-[8px] font-black tracking-widest text-white/25">SHOTS MADE</p></div><span className="rounded-lg border border-rcl-gold/25 bg-rcl-gold/10 px-3 py-2 text-[9px] font-black text-rcl-gold">+250 XP</span></div>
          <button type="button" onClick={()=>document.getElementById('training')?.scrollIntoView({behavior:'smooth'})} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange py-3 text-[9px] font-black uppercase tracking-[.18em] text-black">Enter challenge <FaArrowRight /></button>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="enter-lab"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.25em] text-white/30">EXPLORE THE SYSTEM</p><h2 id="enter-lab" className="mt-1 font-display text-2xl font-black uppercase">Enter the Lab</h2></div><span className="text-[9px] font-black uppercase tracking-widest text-white/30">7 systems online</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{labModules.map(({title,body,icon:Icon,target})=><a key={title} href={`#${target}`} className="group min-h-[150px] overflow-hidden rounded-xl border border-white/10 bg-[#0a111b] p-4 transition duration-200 hover:-translate-y-1 hover:border-rcl-orange/60"><div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-rcl-orange group-hover:bg-rcl-orange group-hover:text-black"><Icon /></div><h3 className="mt-8 font-display text-sm font-black uppercase">{title}</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">{body}</p></a>)}</div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <form id="training" onSubmit={generate} className="rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-5 shadow-xl sm:p-7">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.22em] text-rcl-orange">TRAINING SYSTEM</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Build your workout</h2></div><span className="rounded-full bg-rcl-orange/10 px-3 py-1 text-[8px] font-black text-rcl-orange">STEP 01</span></div>
          <Field label="Development focus"><div className="grid grid-cols-2 gap-2">{skills.map(item=><button type="button" key={item} onClick={()=>setSkill(item)} className={`rounded-lg border p-2.5 text-left text-[10px] font-bold transition ${skill===item?'border-rcl-orange bg-rcl-orange/10 text-white':'border-white/10 bg-black/20 text-white/45 hover:border-white/25'}`}>{item}</button>)}</div></Field>
          <Field label="Experience"><div className="grid grid-cols-4 gap-2">{levels.map(item=><button type="button" key={item} onClick={()=>setLevel(item)} className={`rounded-lg border p-2.5 text-[9px] font-black uppercase ${level===item?'border-rcl-orange bg-rcl-orange text-black':'border-white/10 text-white/45'}`}>{item}</button>)}</div></Field>
          <Field label={`Time · ${length} minutes`}><div className="grid grid-cols-5 gap-2">{lengths.map(item=><button type="button" key={item} onClick={()=>setLength(item)} className={`rounded-lg border py-2.5 text-[10px] font-black ${length===item?'border-rcl-blue bg-rcl-blue/15 text-white':'border-white/10 text-white/45'}`}>{item}</button>)}</div></Field>
          <Field label="Training environment"><select value={environment} onChange={e=>setEnvironment(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-xs text-white outline-none focus:border-rcl-orange">{environments.map(item=><option key={item}>{item}</option>)}</select></Field>
          <Field label="Equipment"><div className="flex flex-wrap gap-2">{equipment.map(item=><button type="button" key={item} onClick={()=>setSelectedEquipment(current=>current.includes(item)?current.filter(value=>value!==item):[...current,item])} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${selectedEquipment.includes(item)?'border-rcl-gold bg-rcl-gold/10 text-rcl-gold':'border-white/10 text-white/40'}`}>{item}</button>)}</div></Field>
          <Field label="Coach note"><textarea maxLength={500} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Tell the Lab what you need to fix…" className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 text-xs outline-none focus:border-rcl-orange" /></Field>
          <button disabled={status==='loading'} className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-rcl-orange py-4 text-[9px] font-black uppercase tracking-[.18em] text-black transition hover:bg-white disabled:opacity-50">{status==='loading'?'Building session…':'Generate my workout'} <FaArrowRight /></button>
          {status==='error'&&<p role="alert" className="mt-3 flex gap-2 text-xs text-red-300"><FaTriangleExclamation/>{errorMessage}</p>}
        </form>

        <section className="min-w-0">
          {workout ? <WorkoutView workout={workout}/> : <div className="flex min-h-[520px] flex-col justify-between rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(77,163,255,.12),transparent_25%),linear-gradient(145deg,#0b1827,#05080d)] p-7 shadow-xl"><div><span className="inline-flex rounded-full border border-rcl-blue/30 bg-rcl-blue/10 px-3 py-1 text-[8px] font-black tracking-widest text-rcl-blue">YOUR PERFORMANCE SPACE</span><h2 className="mt-5 max-w-xl font-display text-4xl font-black uppercase leading-[.95]">Your next session starts here.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/40">Build a session around your game, then use drills, coaching cues, video demonstrations and a finisher to put the work in.</p></div><div className="grid gap-3 sm:grid-cols-3"><Mini title="PERSONALIZED" body="Built from your inputs"/><Mini title="COACHING" body="Actionable cues"/><Mini title="TRACKABLE" body="Saved to this device"/></div></div>}
          {history.length>0&&<div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-black tracking-[.2em] text-white/30">TRAINING LOG</p><h2 className="mt-1 font-display text-lg font-black uppercase">Recent sessions</h2></div><FaRotate className="text-rcl-blue"/></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{history.slice(0,4).map(item=><button type="button" onClick={()=>{setWorkout(item);setStatus('idle')}} key={`${item.title}-${item.minutes}`} className="rounded-lg border border-white/10 bg-black/20 p-3 text-left hover:border-rcl-orange/40"><span className="block text-[10px] font-black uppercase">{item.skill}</span><span className="mt-1 block text-[8px] text-white/35">{item.minutes} MIN · {item.difficulty}</span></button>)}</div></div>}
        </section>
      </section>

      <section id="badges" className="mt-8 grid gap-4 sm:grid-cols-3">
        <LabFeature id="film-room" icon={<FaFilm/>} title="Film Room" body="Turn game footage into lessons. Clip, study and build a smarter player." />
        <LabFeature id="iq" icon={<FaBrain/>} title="Basketball IQ" body="Daily reads, situations and decisions designed to sharpen how you see the game." />
        <LabFeature id="coach" icon={<FaShieldHalved/>} title="AI Coach" body="A future-ready coaching layer for personalized goals, feedback and progression." />
      </section>

      <section className="mt-10 border-t border-white/10 py-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black tracking-[.3em] text-rcl-orange">RICH CITY LEAGUE</p><p className="mt-2 text-[9px] uppercase tracking-[.35em] text-white/20">Basketball lives here.</p></div><div className="flex items-center gap-5 text-[8px] font-black uppercase tracking-[.2em] text-white/25"><span>RVA</span><span>Community</span><span>Competition</span><span>Opportunity</span></div></div></section>
    </Container>
  </main>;
}

function Progress({label,value}:{label:string;value:number|null}) { const width=value===null?0:Math.max(3,Math.min(100,value)); return <div><div className="flex justify-between text-[8px] font-black uppercase tracking-widest"><span className="text-white/35">{label}</span><span className="text-white/60">{value ?? '—'}</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rcl-blue to-rcl-orange" style={{width:`${width}%`}} /></div></div>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="mt-5 block"><span className="mb-2 block text-[8px] font-black uppercase tracking-[.2em] text-white/30">{label}</span>{children}</label>; }
function Mini({title,body}:{title:string;body:string}) { return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[8px] font-black tracking-widest text-rcl-gold">{title}</p><p className="mt-2 text-[10px] leading-5 text-white/35">{body}</p></div>; }
function LabFeature({id,icon,title,body}:{id:string;icon:ReactNode;title:string;body:string}) { return <article id={id} className="rounded-[1.25rem] border border-white/10 bg-[#0a111b] p-5"><div className="grid h-10 w-10 place-items-center rounded-lg bg-rcl-blue/10 text-rcl-blue">{icon}</div><h2 className="mt-5 font-display text-lg font-black uppercase">{title}</h2><p className="mt-2 text-xs leading-6 text-white/35">{body}</p></article>; }
function WorkoutView({workout}:{workout:Workout}) { return <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a111b] shadow-2xl"><header className="border-b border-white/10 bg-gradient-to-r from-rcl-navy/70 to-black p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[8px] font-black tracking-[.2em] text-rcl-orange">PERSONALIZED SESSION · {workout.skill}</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{workout.title}</h2></div><div className="text-right"><strong className="font-display text-4xl text-rcl-orange">{workout.minutes}</strong><span className="block text-[8px] font-black tracking-widest text-white/30">MINUTES</span></div></div><div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-[8px] font-black tracking-widest text-rcl-gold">SESSION GOAL</p><p className="mt-2 text-xs text-white/65">{workout.goal}</p></div></header><div className="p-6"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rcl-orange text-black text-xs font-black">01</span><h3 className="font-display text-lg font-black uppercase">Training plan</h3></div><div className="mt-5 space-y-3">{workout.drills.map((drill,index)=><div key={drill.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex gap-3"><span className="text-sm font-black text-white/15">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-display text-base font-black uppercase">{drill.title}</h4><span className="rounded-full bg-rcl-orange/10 px-2.5 py-1 text-[8px] font-black text-rcl-orange">{drill.prescription}</span></div><p className="mt-2 text-xs leading-5 text-white/45">{drill.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{drill.focus.map(item=><span key={item} className="rounded-full border border-white/10 px-2 py-1 text-[8px] text-white/35">{item}</span>)}</div><details className="mt-3"><summary className="cursor-pointer text-[10px] font-bold text-white/60">Coaching cues & common mistakes</summary><ul className="mt-2 space-y-1 text-[10px] text-white/40">{drill.coachingPoints.map(item=><li key={item}>• {item}</li>)}</ul><p className="mt-2 text-[10px] text-white/30"><strong className="text-white/55">Avoid:</strong> {drill.commonMistakes.join(' · ')}</p></details></div></div></div>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-rcl-orange/20 bg-rcl-orange/5 p-4"><p className="text-[8px] font-black tracking-widest text-rcl-orange">FINISHER</p><p className="mt-2 text-xs text-white/60">{workout.finisher}</p></div><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><p className="text-[8px] font-black tracking-widest text-rcl-gold">COACHING NOTES</p><ul className="mt-2 space-y-1.5 text-[10px] text-white/40">{workout.coachingNotes.map(note=><li key={note} className="flex gap-2"><FaCheck className="mt-0.5 text-rcl-orange"/>{note}</li>)}</ul></div></div></div></article>; }
