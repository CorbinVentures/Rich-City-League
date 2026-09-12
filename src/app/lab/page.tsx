'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FaArrowRight, FaBolt, FaCheck, FaDumbbell, FaPlay, FaRotate, FaTriangleExclamation } from 'react-icons/fa6';
import { Container } from '@/components/Container';

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];

type WorkoutDrill = { id: string; slug: string; title: string; description: string; prescription: string; duration: number; focus: string[]; coachingPoints: string[]; commonMistakes: string[]; skill: string; difficulty: string; equipment: string[]; videoSlug: string; videoId: string };
type Workout = { title: string; skill: string; minutes: number; difficulty: string; goal: string; warmup: string[]; drills: WorkoutDrill[]; finisher: string; coachingNotes: string[] };
type ApiError = { code?: string; message?: string };

function readHistory(): Workout[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem('rcl-workouts') ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is Workout => Boolean(item) && typeof item === 'object' && typeof (item as Workout).title === 'string') : [];
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
    if (status === 'loading' || selectedEquipment.length === 0) {
      setErrorMessage('Select at least one available equipment option.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch('/api/lab/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level, length, environment, equipment: selectedEquipment, goal: goal.trim() }),
        signal: controller.signal,
      });
      const payload: { workout?: Workout; error?: ApiError | string } = await response.json().catch(() => ({}));
      if (!response.ok || !payload.workout) {
        const apiError = typeof payload.error === 'string' ? payload.error : payload.error?.message;
        throw new Error(apiError || 'The session could not be built.');
      }
      const next = [payload.workout, ...history.filter((item) => item.title !== payload.workout?.title)].slice(0, 6);
      setWorkout(payload.workout);
      setHistory(next);
      try { window.localStorage.setItem('rcl-workouts', JSON.stringify(next)); } catch { /* History is optional when storage is unavailable. */ }
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error && error.name === 'AbortError' ? 'The request took too long. Check your connection and try again.' : error instanceof Error ? error.message : 'Generation failed. Try again.');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return <main className="rcl-world min-h-screen pb-24 text-white lg:pb-12"><Container maxWidth="xl" className="py-12 sm:py-16">
    <section className="lab-hero"><p className="rcl-kicker"><FaBolt /> RCL BASKETBALL DEVELOPMENT CENTER</p><h1 className="mt-4 max-w-3xl font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl">The <span className="text-rcl-orange">Lab.</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Train smarter. Develop intentionally. Build a personalized basketball session around the exact skill you want to improve.</p></section>
    <div className="mt-10 grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
      <form onSubmit={generate} className="lab-panel">
        <div className="flex items-center gap-3"><FaDumbbell className="text-rcl-orange" /><div><p className="rcl-kicker">AI WORKOUT GENERATOR</p><h2 className="font-display text-2xl font-black uppercase">Build your session</h2></div></div>
        <Field label="Skill to improve"><div className="grid grid-cols-2 gap-2">{skills.map((item) => <button type="button" key={item} onClick={() => setSkill(item)} className={`lab-option ${skill === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Experience level"><div className="grid grid-cols-4 gap-2">{levels.map((item) => <button type="button" key={item} onClick={() => setLevel(item)} className={`lab-option ${level === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label={`Workout length · ${length} minutes`}><div className="grid grid-cols-5 gap-2">{lengths.map((item) => <button type="button" key={item} onClick={() => setLength(item)} className={`lab-option ${length === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Training environment"><select value={environment} onChange={(event) => setEnvironment(event.target.value)} className="lab-select">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Available equipment"><div className="flex flex-wrap gap-2">{equipment.map((item) => <button type="button" key={item} onClick={() => setSelectedEquipment((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`lab-option ${selectedEquipment.includes(item) ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Tell the coach what you are struggling with (optional)"><textarea maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="I keep missing left on my three-point shot…" className="lab-select min-h-24 resize-y" /><span className="mt-1 block text-right text-[10px] text-slate-500">{goal.length}/500</span></Field>
        <button disabled={status === 'loading'} className="rcl-button mt-2 inline-flex w-full items-center justify-center gap-3 disabled:cursor-wait disabled:opacity-50">{status === 'loading' ? 'Building your session…' : 'Generate workout'} {status === 'loading' ? <span className="lab-spinner" aria-hidden="true" /> : <FaArrowRight />}</button>
        {status === 'error' && <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-red-300"><FaTriangleExclamation className="mt-1 shrink-0" /> {errorMessage}</p>}
      </form>
      <section className="min-w-0">{workout ? <WorkoutView workout={workout} /> : <div className="lab-empty"><FaDumbbell /><h2>YOUR NEXT SESSION</h2><p>Choose a focus and let the RCL coach build a professional training plan for you.</p></div>}
        <div className="mt-8"><p className="rcl-kicker">MY WORKOUTS</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Recent sessions</h2>{history.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{history.slice(0, 4).map((item) => <button onClick={() => { setWorkout(item); setStatus('idle'); }} key={`${item.title}-${item.minutes}`} className="lab-history text-left"><span><strong>{item.skill}</strong><small>{item.minutes} MIN · {item.difficulty}</small></span><FaRotate className="text-rcl-blue" /></button>)}</div> : <p className="mt-4 text-sm text-slate-500">Your generated workouts will appear here.</p>}</div>
      </section>
    </div>
  </Container></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-6 block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</span>{children}</label>; }
function WorkoutView({ workout }: { workout: Workout }) { return <article className="lab-workout"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="rcl-kicker">PERSONALIZED WORKOUT</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{workout.title}</h2></div><div className="text-right"><strong className="block font-display text-3xl text-rcl-orange">{workout.minutes}<span className="text-sm"> MIN</span></strong><span className="text-[10px] uppercase tracking-widest text-slate-400">{workout.difficulty}</span></div></div><div className="mt-6 rounded-xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-rcl-orange">Goal</p><p className="mt-2 text-sm text-slate-200">{workout.goal}</p></div><div className="mt-6"><DrillList drills={workout.drills} /></div><div className="mt-6 border-t border-white/10 pt-5"><p className="rcl-kicker">FINISHER</p><p className="mt-2 text-sm">{workout.finisher}</p><p className="rcl-kicker mt-5">COACHING NOTES</p><ul className="mt-2 space-y-2 text-sm text-slate-300">{workout.coachingNotes.map((note) => <li className="flex gap-2" key={note}><FaCheck className="mt-1 shrink-0 text-rcl-orange" />{note}</li>)}</ul></div></article>; }
function DrillList({ drills }: { drills: WorkoutDrill[] }) { return <div><h3 className="font-display text-lg font-bold uppercase">Training plan</h3><div className="mt-3 space-y-4">{drills.map((drill) => <div key={drill.id} className="lab-drill"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-display text-lg font-bold uppercase">{drill.title}</h4><p className="mt-1 text-sm text-slate-300">{drill.description}</p></div><span className="rounded-full bg-rcl-orange/15 px-2 py-1 text-[10px] font-black uppercase text-rcl-orange">{drill.prescription}</span></div><div className="mt-3 flex flex-wrap gap-2">{drill.focus.map((item) => <span key={item} className="lab-tag">{item}</span>)}</div><details className="mt-3 text-sm text-slate-300"><summary className="cursor-pointer font-bold text-white">Coaching cues</summary><ul className="mt-2 space-y-1">{drill.coachingPoints.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-3 text-xs text-slate-400"><strong className="text-slate-300">Avoid:</strong> {drill.commonMistakes.join(' · ')}</p></details><div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-black/30"><div className="relative aspect-video"><iframe title={`${drill.title} demonstration`} src={`https://www.youtube.com/embed/${drill.videoId}`} loading="lazy" className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><p className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rcl-orange"><FaPlay /> Watch demo · {drill.skill}</p></div></div>)}</div></div>; }
