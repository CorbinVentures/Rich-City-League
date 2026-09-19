'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaBolt, FaDumbbell, FaRotate, FaTriangleExclamation } from 'react-icons/fa6';
import { Container } from '@/components/Container';

type Workout = {
  title: string;
  skill: string;
  minutes: number;
  difficulty: string;
  goal: string;
  drills?: Array<{ id: string; title: string; description: string; prescription: string; skill: string }>;
  finisher?: string;
  coachingNotes?: string[];
};

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];

function historyFromStorage(): Workout[] {
  try {
    const value = JSON.parse(window.localStorage.getItem('rcl-workouts') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function TrainingPage() {
  const [skill, setSkill] = useState(skills[0]);
  const [level, setLevel] = useState(levels[1]);
  const [length, setLength] = useState(45);
  const [environment, setEnvironment] = useState(environments[0]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Basketball']);
  const [goal, setGoal] = useState('');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setHistory(historyFromStorage()), []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!selectedEquipment.length) {
      setError('Select at least one equipment option.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/lab/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level, length, environment, equipment: selectedEquipment, goal: goal.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.workout) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'The workout could not be generated.');
      const next = [payload.workout, ...history.filter((item) => item.title !== payload.workout.title)].slice(0, 6);
      setWorkout(payload.workout);
      setHistory(next);
      window.localStorage.setItem('rcl-workouts', JSON.stringify(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <section className="rcl-lab-hero relative overflow-hidden border-b border-rcl-orange/30 bg-[linear-gradient(90deg,rgba(3,7,13,.98)_0%,rgba(3,7,13,.84)_38%,rgba(3,7,13,.48)_68%,rgba(3,7,13,.82)_100%),linear-gradient(180deg,rgba(3,7,13,.18)_25%,rgba(3,7,13,.96)_100%),url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1800&q=90')] bg-cover bg-center">\n        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,79,22,.08),transparent_42%,rgba(21,159,255,.08))]" />\n        <Container maxWidth="xl" className="relative py-12 sm:py-16">
          <Link href="/lab" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-white/40 hover:text-white"><FaArrowLeft /> Back to The Lab</Link>
          <div className="mt-9 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black tracking-[.28em] text-rcl-orange"><FaDumbbell /> RCL TRAINING SYSTEM</p>
              <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.82] sm:text-7xl">Build<br /><span className="text-rcl-orange">Your Work.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/50">Create a personalized basketball session from your skill, experience, time, environment and equipment.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-[8px] font-black tracking-[.2em] text-rcl-gold">TRAINING LOOP</p><p className="mt-2 font-display text-xl font-black uppercase">Build → Train → Log → Improve</p></div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="py-7 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={generate} className="rounded-3xl border border-white/10 bg-[#0a111b] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.22em] text-rcl-orange">WORKOUT BUILDER</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Set the session</h2></div><FaBolt className="text-rcl-orange" /></div>
            <Field label="Development focus"><div className="grid grid-cols-2 gap-2">{skills.map((item) => <button type="button" key={item} onClick={() => setSkill(item)} className={choice(skill === item)}>{item}</button>)}</div></Field>
            <Field label="Experience"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{levels.map((item) => <button type="button" key={item} onClick={() => setLevel(item)} className={choice(level === item)}>{item}</button>)}</div></Field>
            <Field label="Time"><div className="grid grid-cols-5 gap-2">{lengths.map((item) => <button type="button" key={item} onClick={() => setLength(item)} className={choice(length === item)}>{item}</button>)}</div></Field>
            <Field label="Environment"><select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs outline-none focus:border-rcl-orange">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Equipment"><div className="flex flex-wrap gap-2">{equipment.map((item) => <button type="button" key={item} onClick={() => setSelectedEquipment((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item])} className={selectedEquipment.includes(item) ? 'rounded-full border border-rcl-gold bg-rcl-gold/10 px-3 py-2 text-[9px] font-bold text-rcl-gold' : 'rounded-full border border-white/10 px-3 py-2 text-[9px] font-bold text-white/40'}>{item}</button>)}</div></Field>
            <Field label="What do you want to improve?"><textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={500} placeholder="Tell the Lab what you need to fix..." className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/40 p-3 text-xs outline-none focus:border-rcl-orange" /></Field>
            <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-rcl-orange py-4 text-[9px] font-black uppercase tracking-[.18em] text-black transition hover:bg-white disabled:opacity-50">{loading ? 'Building session...' : 'Generate my workout'}{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <FaArrowRight />}</button>
            {error && <p role="alert" className="mt-3 flex gap-2 text-xs text-red-300"><FaTriangleExclamation />{error}</p>}
          </form>

          <section className="min-w-0">
            {workout ? <WorkoutView workout={workout} /> : <div className="flex min-h-[520px] flex-col justify-between rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(77,163,255,.12),transparent_25%),linear-gradient(145deg,#0b1827,#05080d)] p-7 shadow-xl sm:p-9"><div><span className="inline-flex rounded-full border border-rcl-blue/30 bg-rcl-blue/10 px-3 py-1 text-[8px] font-black tracking-widest text-rcl-blue">READY TO TRAIN</span><h2 className="mt-5 max-w-xl font-display text-4xl font-black uppercase leading-[.95]">Your next session starts here.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/40">Set your inputs and the RCL training engine will build the session. Generated sessions are saved to this device.</p></div><div className="grid gap-3 sm:grid-cols-3"><Mini title="PERSONALIZED" body="Built from your inputs" /><Mini title="COACHING" body="Actionable cues" /><Mini title="TRACKABLE" body="Saved locally" /></div></div>}
            {history.length > 0 && <div className="mt-5 rounded-3xl border border-white/10 bg-[#0a111b] p-5"><div className="flex items-center justify-between"><div><p className="text-[8px] font-black tracking-[.2em] text-white/30">TRAINING LOG</p><h2 className="mt-1 font-display text-lg font-black uppercase">Recent sessions</h2></div><FaRotate className="text-rcl-blue" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{history.slice(0, 4).map((item) => <button type="button" key={item.title + item.minutes} onClick={() => setWorkout(item)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-rcl-orange/40"><span className="block text-[10px] font-black uppercase">{item.skill}</span><span className="mt-1 block text-[8px] text-white/35">{item.minutes} MIN · {item.difficulty}</span></button>)}</div></div>}
          </section>
        </div>

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <Link href="/lab/player-lab" className="rounded-2xl border border-white/10 bg-[#0a111b] p-5 hover:border-rcl-orange/50"><p className="text-[8px] font-black tracking-widest text-rcl-blue">NEXT</p><p className="mt-2 font-display text-lg font-black uppercase">Player Lab</p></Link>
          <Link href="/lab/film-room" className="rounded-2xl border border-white/10 bg-[#0a111b] p-5 hover:border-rcl-orange/50"><p className="text-[8px] font-black tracking-widest text-rcl-blue">STUDY</p><p className="mt-2 font-display text-lg font-black uppercase">Film Room</p></Link>
          <Link href="/lab/badges" className="rounded-2xl border border-white/10 bg-[#0a111b] p-5 hover:border-rcl-orange/50"><p className="text-[8px] font-black tracking-widest text-rcl-gold">PROGRESS</p><p className="mt-2 font-display text-lg font-black uppercase">Badge Lab</p></Link>
        </section>
      </Container>
    </main>
  );
}

function choice(active: boolean) {
  return active ? 'rounded-xl border border-rcl-orange bg-rcl-orange/10 p-3 text-left text-[10px] font-bold text-white' : 'rounded-xl border border-white/10 bg-black/20 p-3 text-left text-[10px] font-bold text-white/45 hover:border-white/25';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-6 block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.2em] text-white/40">{label}</span>{children}</label>;
}

function Mini({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black tracking-widest text-rcl-gold">{title}</p><p className="mt-2 text-xs text-white/45">{body}</p></div>;
}

function WorkoutView({ workout }: { workout: Workout }) {
  return <article className="rounded-3xl border border-white/10 bg-white/[.035] p-6 shadow-2xl sm:p-8"><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">PERSONALIZED SESSION · {workout.skill}</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><h2 className="font-display text-3xl font-black uppercase">{workout.title}</h2><p className="font-display text-4xl font-black text-rcl-orange">{workout.minutes}<span className="ml-1 text-[9px] text-white/30">MIN</span></p></div><div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black tracking-widest text-rcl-gold">SESSION GOAL</p><p className="mt-2 text-sm text-white/70">{workout.goal}</p></div><div className="mt-6 space-y-3">{(workout.drills || []).map((drill, index) => <div key={drill.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex gap-3"><span className="font-black text-white/20">{String(index + 1).padStart(2, '0')}</span><div><h3 className="font-display text-lg font-black uppercase">{drill.title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{drill.description}</p><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-rcl-orange">{drill.prescription}</p></div></div></div>)}</div>{workout.finisher && <div className="mt-5 rounded-xl border border-rcl-orange/20 bg-rcl-orange/5 p-4"><p className="text-[9px] font-black tracking-widest text-rcl-orange">FINISHER</p><p className="mt-2 text-sm text-white/70">{workout.finisher}</p></div>}</article>;
}
