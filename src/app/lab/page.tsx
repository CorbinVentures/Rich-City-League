'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBolt, FaBrain, FaCheck, FaChartLine, FaDumbbell, FaFilm, FaMedal, FaPlay, FaRotate, FaTriangleExclamation } from 'react-icons/fa6';
import { Container } from '@/components/Container';

type WorkoutDrill = {
  id: string;
  title: string;
  description: string;
  prescription: string;
  duration: number;
  focus: string[];
  coachingPoints: string[];
  commonMistakes: string[];
  skill: string;
  videoId: string;
};

type Workout = {
  title: string;
  skill: string;
  minutes: number;
  difficulty: string;
  goal: string;
  warmup: string[];
  drills: WorkoutDrill[];
  finisher: string;
  coachingNotes: string[];
};

type ApiError = { message?: string };

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];

const modules = [
  { title: 'Training', body: 'Build the work.', icon: FaDumbbell, path: '/lab/training' },
  { title: 'Player Lab', body: 'Build your player.', icon: FaChartLine, path: '/lab/player-lab' },
  { title: 'Film Room', body: 'Study the game.', icon: FaFilm, path: '/lab/film-room' },
  { title: 'Basketball IQ', body: 'Think faster.', icon: FaBrain, path: '/lab/iq' },
  { title: 'Skill Challenges', body: 'Daily grind.', icon: FaBolt, path: '/lab/challenges' },
  { title: 'Badge Lab', body: 'Track your progression.', icon: FaMedal, path: '/lab/badges' },
];

function readHistory(): Workout[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem('rcl-workouts') ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Workout => Boolean(item) && typeof item === 'object' && typeof (item as Workout).title === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function LabPage() {
  const [skill, setSkill] = useState(skills[0]);
  const [level, setLevel] = useState(levels[1]);
  const [length, setLength] = useState(45);
  const [environment, setEnvironment] = useState(environments[0]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Basketball']);
  const [goal, setGoal] = useState('');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => setHistory(readHistory()), []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (status === 'loading') return;
    if (!selectedEquipment.length) {
      setStatus('error');
      setErrorMessage('Select at least one equipment option.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('/api/lab/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level, length, environment, equipment: selectedEquipment, goal: goal.trim() }),
        signal: controller.signal,
      });
      const payload: { workout?: Workout; error?: ApiError | string } = await response.json().catch(() => ({}));
      if (!response.ok || !payload.workout) {
        throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'The session could not be built.');
      }
      const next = [payload.workout, ...history.filter((item) => item.title !== payload.workout?.title)].slice(0, 6);
      setWorkout(payload.workout);
      setHistory(next);
      try { window.localStorage.setItem('rcl-workouts', JSON.stringify(next)); } catch {}
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error && error.name === 'AbortError' ? 'The request took too long. Try again.' : error instanceof Error ? error.message : 'Generation failed. Try again.');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05080d] pb-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07111c]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_40%,rgba(35,133,220,.28),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(255,107,26,.2),transparent_22%),linear-gradient(180deg,#07111c,#030509)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 opacity-50 bg-[linear-gradient(180deg,transparent,rgba(2,5,9,.95)),repeating-linear-gradient(90deg,transparent_0_72px,rgba(77,163,255,.08)_73px_74px)]" />
        <Container maxWidth="xl" className="relative z-10 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr_.65fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black tracking-[.3em] text-rcl-orange"><FaBolt /> RCL PERFORMANCE LAB</p>
              <h1 className="mt-5 font-display text-6xl font-black uppercase leading-[.78] sm:text-8xl">The<br /><span className="text-rcl-blue">Lab.</span></h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/55">Train. Create. Analyze. Evolve.<br />Richmond builds different.</p>
              <div className="mt-8 h-px w-28 bg-rcl-orange" />
            </div>

            <div className="relative mx-auto flex h-[330px] w-full max-w-md items-end justify-center">
              <div className="absolute bottom-0 h-[275px] w-[210px] rounded-[48%_48%_8%_8%] bg-[linear-gradient(90deg,#05070b,#17283a_48%,#05070b)] shadow-[0_0_90px_rgba(30,126,205,.25)]" />
              <div className="absolute bottom-[230px] h-20 w-20 rounded-full bg-[radial-gradient(circle_at_35%_30%,#50657b,#080b10_70%)] shadow-[0_0_45px_rgba(77,163,255,.2)]" />
              <div className="absolute bottom-[260px] h-8 w-28 rounded-full bg-[#05070b]" />
              <div className="absolute bottom-5 h-44 w-80 rounded-[50%] border border-rcl-blue/20 bg-rcl-blue/5 blur-2xl" />
              <span className="absolute bottom-2 font-black uppercase tracking-[.3em] text-white/15">MORE THAN A GAME</span>
            </div>

            <div className="hidden border-l border-white/10 pl-7 lg:block">
              <p className="font-black text-4xl uppercase leading-[.88]">Harder<br />Smarter<br /><span className="text-rcl-orange">Better.</span></p>
              <p className="mt-5 text-[9px] font-black tracking-[.28em] text-white/30">RICHMOND, VIRGINIA</p>
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-20 -mt-10">
        <section id="player-lab" className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a111b]/95 shadow-2xl backdrop-blur-xl">
          <div className="grid md:grid-cols-[1.3fr_.7fr]">
            <div className="p-6 sm:p-8">
              <p className="text-[9px] font-black tracking-[.25em] text-rcl-blue">PLAYER LAB</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Build the player.<br /><span className="text-rcl-orange">Not just the workout.</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/45">Your development space connects training, performance, film, IQ and progression. Start with a workout, then use the other systems to keep developing.</p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <Metric label="SKILLS" value="8 focus areas" />
                <Metric label="SESSIONS" value="15–90 min" />
                <Metric label="PROGRESSION" value="XP + badges" />
              </div>
            </div>
            <div className="flex items-center justify-center border-t border-white/10 bg-[radial-gradient(circle,rgba(255,107,26,.1),transparent_60%)] p-8 md:border-l md:border-t-0">
              <div className="text-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-[8px] border-rcl-orange/20 bg-black/30 shadow-[0_0_50px_rgba(255,107,26,.12)]"><span className="font-display text-4xl font-black">RCL</span></div><p className="mt-4 text-[9px] font-black tracking-[.2em] text-white/30">THE CITY IS THE COURT</p></div>
            </div>
          </div>
        </section>

        <section id="challenges" className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[9px] font-black tracking-[.25em] text-rcl-blue">SKILL CHALLENGE</p><h2 className="mt-2 font-display text-2xl font-black uppercase">The 804 Shootout</h2><p className="mt-2 max-w-xl text-xs leading-6 text-white/40">Make 10 three-pointers and build your shot confidence. Challenges belong here so they are separate from workout creation.</p></div>
            <div className="flex items-center gap-4"><div><p className="text-2xl font-black">0<span className="text-white/20"> / 10</span></p><p className="text-[8px] font-black tracking-widest text-white/25">SHOTS MADE</p></div><span className="rounded-lg bg-rcl-orange/10 px-3 py-2 text-[9px] font-black text-rcl-orange">+250 XP</span><span className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">READY</span></div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="lab-systems">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black tracking-[.25em] text-white/30">EXPLORE THE SYSTEM</p><h2 id="lab-systems" className="mt-1 font-display text-2xl font-black uppercase">Choose your system</h2></div><span className="text-[8px] font-black uppercase tracking-widest text-white/25">6 systems</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {modules.map(({ title, body, icon: Icon, path }) => <Link key={title} href={path} className="group min-h-[145px] rounded-xl border border-white/10 bg-[#0a111b] p-4 transition hover:-translate-y-1 hover:border-rcl-orange/60"><div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-rcl-orange transition group-hover:bg-rcl-orange group-hover:text-black"><Icon /></div><h3 className="mt-7 font-display text-sm font-black uppercase">{title}</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">{body}</p></Link>)}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <form id="training" onSubmit={generate} className="rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-5 shadow-xl sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.22em] text-rcl-orange">TRAINING SYSTEM</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Build your workout</h2></div><span className="rounded-full bg-rcl-orange/10 px-3 py-1 text-[8px] font-black text-rcl-orange">STEP 01</span></div>
            <Field label="Development focus"><div className="grid grid-cols-2 gap-2">{skills.map((item) => <button type="button" key={item} onClick={() => setSkill(item)} className={`rounded-lg border p-3 text-left text-[10px] font-bold transition ${skill === item ? 'border-rcl-orange bg-rcl-orange/10 text-white' : 'border-white/10 bg-black/20 text-white/45 hover:border-white/25'}`}>{item}</button>)}</div></Field>
            <Field label="Experience"><div className="grid grid-cols-4 gap-2">{levels.map((item) => <button type="button" key={item} onClick={() => setLevel(item)} className={`rounded-lg border p-2.5 text-[9px] font-black uppercase ${level === item ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/10 text-white/45'}`}>{item}</button>)}</div></Field>
            <Field label={`Time · ${length} minutes`}><div className="grid grid-cols-5 gap-2">{lengths.map((item) => <button type="button" key={item} onClick={() => setLength(item)} className={`rounded-lg border py-3 text-[10px] font-black ${length === item ? 'border-rcl-blue bg-rcl-blue/15 text-white' : 'border-white/10 text-white/45'}`}>{item}</button>)}</div></Field>
            <Field label="Training environment"><select value={environment} onChange={(event) => setEnvironment(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-xs text-white outline-none focus:border-rcl-orange">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Equipment"><div className="flex flex-wrap gap-2">{equipment.map((item) => <button type="button" key={item} onClick={() => setSelectedEquipment((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${selectedEquipment.includes(item) ? 'border-rcl-gold bg-rcl-gold/10 text-rcl-gold' : 'border-white/10 text-white/40'}`}>{item}</button>)}</div></Field>
            <Field label="Coach note"><textarea maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Tell the Lab what you need to fix…" className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 text-xs outline-none focus:border-rcl-orange" /></Field>
            <button disabled={status === 'loading'} className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-rcl-orange py-4 text-[9px] font-black uppercase tracking-[.18em] text-black transition hover:bg-white disabled:opacity-50">{status === 'loading' ? 'Building session…' : 'Generate my workout'}{status === 'loading' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <FaArrowRight />}</button>
            {status === 'error' && <p role="alert" className="mt-3 flex gap-2 text-xs text-red-300"><FaTriangleExclamation />{errorMessage}</p>}
          </form>

          <section className="min-w-0">
            {workout ? <WorkoutView workout={workout} /> : <div className="flex min-h-[520px] flex-col justify-between rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(77,163,255,.12),transparent_25%),linear-gradient(145deg,#0b1827,#05080d)] p-7 shadow-xl"><div><span className="inline-flex rounded-full border border-rcl-blue/30 bg-rcl-blue/10 px-3 py-1 text-[8px] font-black tracking-widest text-rcl-blue">YOUR NEXT SESSION</span><h2 className="mt-5 max-w-xl font-display text-4xl font-black uppercase leading-[.95]">Your next session starts here.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/40">Build a session around your game, then use drills, coaching cues, video demonstrations and a finisher to put the work in.</p></div><div className="grid gap-3 sm:grid-cols-3"><Mini title="PERSONALIZED" body="Built from your inputs" /><Mini title="COACHING" body="Actionable cues" /><Mini title="TRACKABLE" body="Saved to this device" /></div></div>}
            {history.length > 0 && <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-black tracking-[.2em] text-white/30">TRAINING LOG</p><h2 className="mt-1 font-display text-lg font-black uppercase">Recent sessions</h2></div><FaRotate className="text-rcl-blue" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{history.slice(0, 4).map((item) => <button type="button" onClick={() => { setWorkout(item); setStatus('idle'); }} key={`${item.title}-${item.minutes}`} className="rounded-lg border border-white/10 bg-black/20 p-3 text-left hover:border-rcl-orange/40"><span className="block text-[10px] font-black uppercase">{item.skill}</span><span className="mt-1 block text-[8px] text-white/35">{item.minutes} MIN · {item.difficulty}</span></button>)}</div></div>}
          </section>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <LabFeature id="film-room" icon={<FaFilm />} title="Film Room" body="Turn game footage into lessons. Study, clip and build a smarter player." />
          <LabFeature id="iq" icon={<FaBrain />} title="Basketball IQ" body="Daily reads, situations and decisions designed to sharpen how you see the game." />
          <LabFeature id="badges" icon={<FaMedal />} title="Badge Lab" body="Turn completed work into visible progression and future RCL badges." />
        </section>
      </Container>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mt-6 block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.2em] text-white/40">{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[8px] font-black tracking-widest text-white/30">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}

function Mini({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black tracking-widest text-rcl-gold">{title}</p><p className="mt-2 text-xs text-white/45">{body}</p></div>;
}

function LabFeature({ id, icon, title, body }: { id: string; icon: ReactNode; title: string; body: string }) {
  return <article id={id} className="rounded-[1.5rem] border border-white/10 bg-[#0a111b] p-6 shadow-xl"><div className="grid h-11 w-11 place-items-center rounded-lg bg-rcl-orange/10 text-rcl-orange">{icon}</div><h3 className="mt-5 font-display text-xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-6 text-white/40">{body}</p></article>;
}

function WorkoutView({ workout }: { workout: Workout }) {
  return <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.035] shadow-2xl">
    <header className="border-b border-white/10 bg-gradient-to-r from-rcl-navy/70 to-black p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">PERSONALIZED SESSION · {workout.skill}</p><h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">{workout.title}</h2></div><div className="text-right"><strong className="font-display text-4xl text-rcl-orange">{workout.minutes}</strong><span className="block text-[9px] font-black tracking-widest text-white/35">MINUTES</span></div></div><div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black tracking-widest text-rcl-gold">SESSION GOAL</p><p className="mt-2 text-sm text-white/70">{workout.goal}</p></div></header>
    <div className="p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rcl-orange font-black text-black">01</span><h3 className="font-display text-xl font-black uppercase">Training plan</h3></div><div className="mt-5 space-y-4">{workout.drills.map((drill, index) => <div key={drill.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex gap-4"><span className="text-lg font-black text-white/20">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-3"><h4 className="font-display text-lg font-black uppercase">{drill.title}</h4><span className="rounded-full bg-rcl-orange/10 px-3 py-1 text-[9px] font-black text-rcl-orange">{drill.prescription}</span></div><p className="mt-2 text-sm leading-6 text-white/55">{drill.description}</p><div className="mt-3 flex flex-wrap gap-2">{drill.focus.map((item) => <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/45">{item}</span>)}</div><details className="mt-4"><summary className="cursor-pointer text-xs font-bold text-white/70">Coaching cues & common mistakes</summary><ul className="mt-3 space-y-2 text-xs text-white/50">{drill.coachingPoints.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-3 text-xs text-white/40"><strong className="text-white/60">Avoid:</strong> {drill.commonMistakes.join(' · ')}</p></details><div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black"><div className="relative aspect-video"><iframe title={`${drill.title} demonstration`} src={`https://www.youtube.com/embed/${drill.videoId}`} loading="lazy" className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><p className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest text-rcl-orange"><FaPlay /> DEMONSTRATION · {drill.skill}</p></div></div></div></div>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-rcl-orange/20 bg-rcl-orange/5 p-5"><p className="text-[9px] font-black tracking-widest text-rcl-orange">FINISHER</p><p className="mt-2 text-sm text-white/70">{workout.finisher}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><p className="text-[9px] font-black tracking-widest text-rcl-gold">COACHING NOTES</p><ul className="mt-2 space-y-2 text-xs text-white/50">{workout.coachingNotes.map((note) => <li key={note} className="flex gap-2"><FaCheck className="mt-0.5 text-rcl-orange" />{note}</li>)}</ul></div></div></div>
  </article>;
}
