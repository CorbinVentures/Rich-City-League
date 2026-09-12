'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FaArrowRight, FaBolt, FaCheck, FaDumbbell, FaRotate, FaTriangleExclamation } from 'react-icons/fa6';
import { Container } from '@/components/Container';

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];
type Workout = { title: string; skill: string; minutes: number; difficulty: string; goal: string; warmup: string[]; drills: { title: string; prescription: string; focus: string[] }[]; finisher: string; coachingNotes: string[] };

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

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('rcl-workouts') ?? '[]')); } catch { setHistory([]); }
  }, []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');
    try {
      const response = await fetch('/api/lab/workout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill, level, length, environment, equipment: selectedEquipment, goal }) });
      const payload = await response.json();
      if (!response.ok || !payload.workout) throw new Error(payload.error);
      setWorkout(payload.workout);
      const next = [payload.workout, ...history.filter((item) => item.title !== payload.workout.title)].slice(0, 6);
      setHistory(next);
      localStorage.setItem('rcl-workouts', JSON.stringify(next));
      setStatus('idle');
    } catch { setStatus('error'); }
  }

  return <main className="rcl-world min-h-screen pb-24 text-white lg:pb-12"><Container maxWidth="xl" className="py-12 sm:py-16">
    <section className="lab-hero"><p className="rcl-kicker"><FaBolt /> RCL BASKETBALL DEVELOPMENT CENTER</p><h1 className="mt-4 max-w-3xl font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl">The <span className="text-rcl-orange">Lab.</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Train smarter. Build your game. Create a personalized basketball workout based on the exact skills you want to improve.</p></section>
    <div className="mt-10 grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
      <form onSubmit={generate} className="lab-panel">
        <div className="flex items-center gap-3"><FaDumbbell className="text-rcl-orange" /><div><p className="rcl-kicker">AI WORKOUT GENERATOR</p><h2 className="font-display text-2xl font-black uppercase">Build your session</h2></div></div>
        <Field label="Skill to improve"><div className="grid grid-cols-2 gap-2">{skills.map((item) => <button type="button" key={item} onClick={() => setSkill(item)} className={`lab-option ${skill === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Experience level"><div className="grid grid-cols-4 gap-2">{levels.map((item) => <button type="button" key={item} onClick={() => setLevel(item)} className={`lab-option ${level === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label={`Workout length · ${length} minutes`}><div className="grid grid-cols-5 gap-2">{lengths.map((item) => <button type="button" key={item} onClick={() => setLength(item)} className={`lab-option ${length === item ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Training environment"><select value={environment} onChange={(event) => setEnvironment(event.target.value)} className="lab-select">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Available equipment"><div className="flex flex-wrap gap-2">{equipment.map((item) => <button type="button" key={item} onClick={() => setSelectedEquipment((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`lab-option ${selectedEquipment.includes(item) ? 'selected' : ''}`}>{item}</button>)}</div></Field>
        <Field label="Tell the AI what you are struggling with (optional)"><textarea maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="I keep missing left on my three-point shot…" className="lab-select min-h-24 resize-y" /></Field>
        <button disabled={status === 'loading'} className="rcl-button mt-2 inline-flex w-full items-center justify-center gap-3 disabled:opacity-50">{status === 'loading' ? 'Building your session…' : 'Generate workout'} <FaArrowRight /></button>
        {status === 'error' && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-300"><FaTriangleExclamation /> Generation failed. Check your inputs and try again.</p>}
      </form>
      <section className="min-w-0">{workout ? <WorkoutView workout={workout} /> : <div className="lab-empty"><FaDumbbell /><h2>YOUR NEXT SESSION</h2><p>Choose a focus and let the RCL coach build a professional training plan for you.</p></div>}
        <div className="mt-8"><p className="rcl-kicker">MY WORKOUTS</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Recent sessions</h2>{history.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{history.slice(0, 4).map((item) => <button onClick={() => setWorkout(item)} key={`${item.title}-${item.minutes}`} className="lab-history text-left"><span><strong>{item.skill}</strong><small>{item.minutes} MIN · {item.difficulty}</small></span><FaRotate className="text-rcl-blue" /></button>)}</div> : <p className="mt-4 text-sm text-slate-500">Your generated workouts will appear here.</p>}</div>
      </section>
    </div>
  </Container></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-6 block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</span>{children}</label>; }
function WorkoutView({ workout }: { workout: Workout }) { return <article className="lab-workout"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="rcl-kicker">PERSONALIZED WORKOUT</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{workout.title}</h2></div><div className="text-right"><strong className="block font-display text-3xl text-rcl-orange">{workout.minutes}<span className="text-sm"> MIN</span></strong><span className="text-[10px] uppercase tracking-widest text-slate-400">{workout.difficulty}</span></div></div><div className="mt-6 rounded-xl bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-rcl-orange">Goal</p><p className="mt-2 text-sm text-slate-200">{workout.goal}</p></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><Drill title="Warm-up" items={workout.warmup.map((item) => `${item}`)} /><Drill title="Training plan" items={workout.drills.map((item) => `${item.title} · ${item.prescription} · ${item.focus.join(', ')}`)} /></div><div className="mt-6 border-t border-white/10 pt-5"><p className="rcl-kicker">FINISHER</p><p className="mt-2 text-sm">{workout.finisher}</p><p className="rcl-kicker mt-5">COACHING NOTES</p><ul className="mt-2 space-y-2 text-sm text-slate-300">{workout.coachingNotes.map((note) => <li className="flex gap-2" key={note}><FaCheck className="mt-1 shrink-0 text-rcl-orange" />{note}</li>)}</ul></div></article>; }
function Drill({ title, items }: { title: string; items: string[] }) { return <div><h3 className="font-display text-lg font-bold uppercase">{title}</h3><ul className="mt-3 space-y-3 text-sm text-slate-300">{items.map((item) => <li key={item} className="rounded-lg bg-black/20 p-3">{item}</li>)}</ul></div>; }
