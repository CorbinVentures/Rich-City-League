'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaBolt, FaBrain, FaCheck, FaChartLine, FaDumbbell, FaFilm, FaMedal, FaPlay } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { LabCinematicIntro } from '@/components/LabCinematicIntro';
import { DrillAnimation } from '@/components/DrillAnimation';
import { LabDashboard } from '@/components/LabDashboard';
import './lab-redesign.css';

type WorkoutDrill = {
  id: string;
  title: string;
  description: string;
  prescription: string;
  duration: number;
  focus: string[];
  coachingPoints: string[];
  commonMistakes: string[];
  instructions: string[];
  demonstrationType: 'animation' | 'video';
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
  const [screen, setScreen] = useState<'home'|'build'|'workout'|'drill'>('home');
  const [activeDrill, setActiveDrill] = useState(0);
  const [drillTab, setDrillTab] = useState<'coaching'|'breakdown'|'mistakes'|'variations'>('coaching');

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
      setActiveDrill(0);
      setScreen('workout');
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

  const drill = workout?.drills[activeDrill];
  const goDrill = (index:number) => { setActiveDrill(index); setDrillTab('coaching'); setScreen('drill'); window.scrollTo({top:0,behavior:'smooth'}); };
  const nextDrill = () => { if(!workout)return; if(activeDrill < workout.drills.length-1) goDrill(activeDrill+1); else setScreen('workout'); };

  return <><LabCinematicIntro/><main className="labx">
    <div className="labx-bg"/>
    <header className="labx-head"><button onClick={()=>setScreen('home')} aria-label="Lab home">☰</button><div className="labx-logo">♛<b>RICH CITY</b><small>LEAGUE</small></div><div className="labx-head-actions">⌕ <span>DC</span></div></header>

    {screen==='home'&&<LabDashboard onBuild={()=>setScreen('build')} />}

    {screen==='build'&&<section className="labx-shell"><div className="labx-crumb">THE LAB <i>›</i> BUILD WORKOUT <span>STEP 1 OF 2</span></div>
      <form onSubmit={generate} className="labx-builder"><h1>BUILD YOUR WORKOUT</h1><p>Customize your session. Get a training plan built for your goals.</p>
      <Field label="Development focus"><div className="labx-grid2">{skills.map(item=><button type="button" key={item} onClick={()=>setSkill(item)} className={skill===item?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Experience level"><div className="labx-levels">{levels.map(item=><button type="button" key={item} onClick={()=>setLevel(item)} className={level===item?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Time"><div className="labx-times">{lengths.map(item=><button type="button" key={item} onClick={()=>setLength(item)} className={length===item?'selected blue':''}>{item}</button>)}</div></Field>
      <Field label="Training environment"><select value={environment} onChange={e=>setEnvironment(e.target.value)}>{environments.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Equipment · Select all that apply"><div className="labx-pills">{equipment.map(item=><button type="button" key={item} onClick={()=>setSelectedEquipment(v=>v.includes(item)?v.filter(x=>x!==item):[...v,item])} className={selectedEquipment.includes(item)?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Coach note"><textarea maxLength={500} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="What do you need to improve?"/></Field>
      <button disabled={status==='loading'} className="labx-primary">{status==='loading'?'BUILDING SESSION…':'GENERATE WORKOUT'} <FaArrowRight/></button>{status==='error'&&<p className="labx-error">{errorMessage}</p>}</form>
    </section>}

    {screen==='workout'&&workout&&<section className="labx-shell"><div className="labx-crumb">THE LAB <i>›</i> YOUR WORKOUT <button>SAVE</button></div>
      <div className="labx-workout-head"><h1>YOUR WORKOUT</h1><h3>{workout.skill} <i>•</i> {workout.difficulty} <i>•</i> {workout.minutes} Minutes</h3><button className="labx-outline" onClick={()=>goDrill(0)}>Start Session</button></div>
      <div className="labx-worktabs"><b>Workout</b><span>Details</span><span>Notes</span></div>
      <div className="labx-session-list"><article><div className="labx-thumb warm"/><div><b>WARM UP</b><small>8 MIN</small><p>{workout.warmup.join(' · ')}</p></div><strong>›</strong></article>
      {workout.drills.map((d,i)=><button key={d.id} onClick={()=>goDrill(i)}><em>{String(i+1).padStart(2,'0')}</em><div><b>{d.title}</b><strong>{d.prescription}</strong><small>{Math.max(5,Math.round(d.duration/60))} min</small><p>{d.focus.slice(0,3).map(x=><span key={x}>{x}</span>)}</p></div><div className="labx-thumb"/><i>›</i></button>)}
      <article><div className="labx-thumb finish"/><div><b>FINISHER</b><small>5 MIN</small><p>{workout.finisher}</p></div><strong>›</strong></article></div>
    </section>}

    {screen==='drill'&&workout&&drill&&<section className="labx-shell drill"><div className="labx-crumb">THE LAB <i>›</i> WORKOUT <i>›</i> DRILL {activeDrill+1}<span>{activeDrill+1} OF {workout.drills.length}</span></div>
      <div className="labx-drill-head"><h1>{drill.title}</h1><h3>{drill.prescription} <i>•</i> {Math.max(5,Math.round(drill.duration/60))} minutes</h3><p>{drill.description}</p><div className="labx-pills">{drill.focus.map(x=><span key={x}>{x}</span>)}</div></div>
      <DrillAnimation skill={drill.skill} title={drill.title} focus={drill.focus} />
      <section className="labx-howto"><div><small>DEMONSTRATION</small><b>Follow the motion above</b><span>Use pause, speed control, and restart to study the rep.</span></div><div><small>STEP-BY-STEP</small><b>{drill.instructions.length} guided steps</b><span>Open Breakdown for the complete sequence.</span></div><div><small>COACHING</small><b>{drill.coachingPoints.length} key cues</b><span>Use these checkpoints on every repetition.</span></div></section><nav className="labx-drill-tabs">{(['coaching','breakdown','mistakes','variations'] as const).map(x=><button key={x} className={drillTab===x?'active':''} onClick={()=>setDrillTab(x)}>{x}</button>)}</nav>
      <div className="labx-drill-body">
       {drillTab==='coaching'&&<><h4>HOW TO PERFORM THIS DRILL</h4><div className="labx-instructions">{drill.instructions.map((x,i)=><p key={x}><b>{String(i+1).padStart(2,'0')}</b><span>{x}</span></p>)}</div><h4>KEY COACHING CUES</h4><div className="labx-coaching"><ul>{drill.coachingPoints.map(x=><li key={x}><FaCheck/> {x}</li>)}</ul><div className="labx-court"><i/><b>↗</b></div></div></>}
       {drillTab==='breakdown'&&<div className="labx-breakdown">{drill.instructions.map((x,i)=><article key={x}><em>{i+1}</em><div className="labx-mini-motion"><span className="mini-player"/><span className="mini-ball"/></div><p><b>STEP {i+1}</b><span>{x}</span>{drill.coachingPoints[i]&&<small>COACH CUE · {drill.coachingPoints[i]}</small>}</p></article>)}</div>}
       {drillTab==='mistakes'&&<><h4>COMMON MISTAKES</h4><div className="labx-mistakes">{drill.commonMistakes.map(x=><p key={x}><b>×</b><span><strong>{x}</strong><small>Recognize it early, reset your mechanics, and repeat the rep cleanly.</small></span></p>)}</div><blockquote>“SEE IT. READ IT. MAKE THE RIGHT PLAY.”<small>— RCL</small></blockquote></>}
       {drillTab==='variations'&&<><h4>VARIATIONS</h4><div className="labx-variations"><p><b>Game Speed</b>Increase pace while keeping the same reads.</p><p><b>Pressure</b>Add a defender, cone, or time constraint.</p><p><b>Weak Side</b>Repeat from the opposite side or hand.</p></div></>}
      </div>
      <div className="labx-next"><button onClick={()=>activeDrill?goDrill(activeDrill-1):setScreen('workout')}><FaArrowLeft/> Previous</button><button className="labx-primary" onClick={nextDrill}>{activeDrill===workout.drills.length-1?'Complete Session':'Next Drill'} <FaArrowRight/></button></div>
    </section>}
  </main></>
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
