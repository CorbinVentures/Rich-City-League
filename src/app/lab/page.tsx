'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaCheck } from 'react-icons/fa6';
import { LabCinematicIntro } from '@/components/LabCinematicIntro';
import { RiggedAthleteProof } from '@/components/RiggedAthleteProof';
import { LabDashboard } from '@/components/LabDashboard';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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
type WorkoutTab = 'workout'|'details'|'notes';

type Variation={title:string;body:string};

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'];
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const lengths = [15, 30, 45, 60, 90];
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'];
const equipment = ['Basketball', 'Cones', 'Resistance bands', 'Weights', 'Agility ladder', 'None'];

const skillVariations:Record<string,Variation[]>={
  shooting:[
    {title:'Game Speed',body:'Shorten the setup time without changing your balance or release mechanics.'},
    {title:'Relocation',body:'Move into the rep from a different spot or angle before the catch or pickup.'},
    {title:'Pressure',body:'Add a make target, time limit, or late contest after the mechanics stay clean.'},
  ],
  'ball handling':[
    {title:'Weak Hand',body:'Run the full pattern with the non-dominant hand leading every change.'},
    {title:'Pace Change',body:'Alternate slow, freeze, and burst speeds without letting the dribble rise.'},
    {title:'Pressure',body:'Add a cone, shadow defender, or time limit while keeping your eyes up.'},
  ],
  finishing:[
    {title:'Opposite Hand',body:'Mirror the rep on the other side and finish with the outside hand when appropriate.'},
    {title:'Contact',body:'Add controlled pad or body contact only after the footwork and gather are stable.'},
    {title:'Angle Change',body:'Start wider, tighter, or from the middle to learn a different finishing window.'},
  ],
  playmaking:[
    {title:'Coverage Change',body:'Change the imaginary defender or help position and make a different read.'},
    {title:'Decision Clock',body:'Give yourself two dribbles or a short time window to force an early decision.'},
    {title:'Weak-Hand Entry',body:'Initiate the action with the opposite hand while keeping every passing option alive.'},
  ],
  defense:[
    {title:'Angle Change',body:'Start from a new help or closeout angle while staying square on arrival.'},
    {title:'Live Reaction',body:'Use a partner or random cue so the direction is not known before the rep.'},
    {title:'Disadvantage',body:'Begin one step late and recover without crossing your feet or flying by.'},
  ],
  athleticism:[
    {title:'Quality First',body:'Slow the movement down and own every loading, braking, and landing position.'},
    {title:'Reactive Cue',body:'Use a clap, point, or color call to decide the direction after the rep starts.'},
    {title:'Distance Change',body:'Adjust the distance slightly while preserving posture, force direction, and landing control.'},
  ],
  rebounding:[
    {title:'Contact',body:'Add a partner or pad so every rep begins with a legal hit before pursuit.'},
    {title:'Flight Change',body:'Vary the rebound direction and height so the pursuit path is not predictable.'},
    {title:'Outlet',body:'Finish the rep by chinning the ball, pivoting outside, and delivering an on-time outlet.'},
  ],
  'mental / iq':[
    {title:'Time & Score',body:'Change the clock and score before every rep and state how it changes the decision.'},
    {title:'Coverage Call',body:'Use a random defensive coverage or help position and identify the first two reads.'},
    {title:'Explain The Read',body:'Say what you saw and why you chose the action before starting the next rep.'},
  ],
};

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

function warmupMinutes(items:string[]){
  const total=items.reduce((sum,item)=>sum+(Number(item.match(/(\d+)\s*minutes?/i)?.[1])||0),0);
  return total||8;
}

function variationsForSkill(skill:string){
  return skillVariations[skill.toLowerCase()]??[
    {title:'Game Speed',body:'Increase pace only after the movement stays clean.'},
    {title:'Pressure',body:'Add a realistic constraint without changing the core technique.'},
    {title:'Opposite Side',body:'Mirror the rep when the skill can be trained from both sides.'},
  ];
}

export default function LabPage() {
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient(), []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
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
  const [workoutTab,setWorkoutTab]=useState<WorkoutTab>('workout');

  useEffect(() => setHistory(readHistory()), []);

  const toggleEquipment=(item:string)=>setSelectedEquipment(current=>{
    if(item==='None')return current.includes('None')?[]:['None'];
    const withoutNone=current.filter(value=>value!=='None');
    return withoutNone.includes(item)?withoutNone.filter(value=>value!==item):[...withoutNone,item];
  });

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
    setSessionId(null);
    setSavedLocally(false);
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
      if (user && db) {
        const saved = await db.from('lab_sessions').insert({profile_id:user.id,title:payload.workout.title,skill:payload.workout.skill,duration_minutes:payload.workout.minutes,status:'planned',source:'builder',workout:payload.workout}).select('id').single();
        if (!saved.error) setSessionId(saved.data.id);
      }
      setActiveDrill(0);
      setWorkoutTab('workout');
      setScreen('workout');
      setHistory(next);
      try { window.localStorage.setItem('rcl-workouts', JSON.stringify(next)); setSavedLocally(true); } catch { setSavedLocally(false); }
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
  const nextDrill = async () => { if(!workout)return; if(activeDrill < workout.drills.length-1) goDrill(activeDrill+1); else { if(sessionId&&db){await db.rpc('complete_lab_session',{target_session:sessionId})} setScreen('home'); } };

  return <><LabCinematicIntro/><main className="labx">
    <div className="labx-bg"/>
    <header className="labx-head"><button onClick={()=>setScreen('home')} aria-label="Lab home">☰</button><div className="labx-logo">♛<b>RICH CITY</b><small>LEAGUE</small></div><div className="labx-head-actions">⌕ <span>DC</span></div></header>

    {screen==='home'&&<LabDashboard onBuild={()=>setScreen('build')} />}

    {screen==='build'&&<section className="labx-shell"><div className="labx-crumb">THE LAB <i>›</i> BUILD WORKOUT <span>STEP 1 OF 2</span></div>
      <form onSubmit={generate} className="labx-builder"><h1>BUILD YOUR WORKOUT</h1><p>Customize your session. Get a training plan built for your goals.</p>
      <Field label="Development focus"><div className="labx-grid2">{skills.map(item=><button type="button" key={item} onClick={()=>setSkill(item)} className={skill===item?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Experience level"><div className="labx-levels">{levels.map(item=><button type="button" key={item} onClick={()=>setLevel(item)} className={level===item?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Time"><div className="labx-times">{lengths.map(item=><button type="button" key={item} onClick={()=>setLength(item)} className={length===item?'selected blue':''}>{item}</button>)}</div></Field>
      <Field label="Training environment"><select aria-label="Training environment" value={environment} onChange={e=>setEnvironment(e.target.value)}>{environments.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Equipment · Select all that apply"><div className="labx-pills">{equipment.map(item=><button type="button" key={item} onClick={()=>toggleEquipment(item)} className={selectedEquipment.includes(item)?'selected':''}>{item}</button>)}</div></Field>
      <Field label="Coach note"><textarea aria-label="What do you need to improve?" maxLength={500} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="What do you need to improve?"/></Field>
      <button disabled={status==='loading'} className="labx-primary">{status==='loading'?'BUILDING SESSION…':'GENERATE WORKOUT'} <FaArrowRight/></button>{status==='error'&&<p className="labx-error">{errorMessage}</p>}</form>
    </section>}

    {screen==='workout'&&workout&&<section className="labx-shell"><div className="labx-crumb">THE LAB <i>›</i> YOUR WORKOUT <span role="status">{sessionId ? 'SAVED TO YOUR ACCOUNT' : savedLocally ? 'SAVED ON THIS DEVICE' : 'NOT SAVED'}</span></div>
      <div className="labx-workout-head"><h1>YOUR WORKOUT</h1><h3>{workout.skill} <i>•</i> {workout.difficulty} <i>•</i> {workout.minutes} Minutes</h3><button className="labx-outline" onClick={()=>goDrill(0)}>Start Session</button></div>
      <nav className="labx-worktabs" aria-label="Workout information">{(['workout','details','notes'] as WorkoutTab[]).map(tab=><button type="button" key={tab} className={workoutTab===tab?'active':''} aria-pressed={workoutTab===tab} onClick={()=>setWorkoutTab(tab)}>{tab}</button>)}</nav>
      {workoutTab==='workout'&&<div className="labx-session-list"><article><div className="labx-thumb warm"/><div><b>WARM UP</b><small>{warmupMinutes(workout.warmup)} MIN</small><p>{workout.warmup.join(' · ')}</p></div><strong>›</strong></article>
      {workout.drills.map((d,i)=><button key={d.id} onClick={()=>goDrill(i)}><em>{String(i+1).padStart(2,'0')}</em><div><b>{d.title}</b><strong>{d.prescription}</strong><small>{Math.max(1,Math.round(d.duration/60))} min</small><p>{d.focus.slice(0,3).map(x=><span key={x}>{x}</span>)}</p></div><div className="labx-thumb"/><i>›</i></button>)}
      <article><div className="labx-thumb finish"/><div><b>FINISHER</b><small>{Math.max(2,Math.min(6,Math.round(workout.minutes*.1)))} MIN TARGET</small><p>{workout.finisher}</p></div><strong>›</strong></article></div>}
      {workoutTab==='details'&&<div className="labx-work-panel"><article><small>SESSION GOAL</small><h3>{workout.goal}</h3><p>Complete quality reps at the prescribed level. If mechanics break down, reduce speed before adding volume.</p></article><article><small>WARM-UP PLAN</small><h3>{warmupMinutes(workout.warmup)} minutes</h3><ul>{workout.warmup.map(item=><li key={item}>{item}</li>)}</ul></article><article><small>FINISH STANDARD</small><h3>Leave on a clean rep</h3><p>{workout.finisher}</p></article></div>}
      {workoutTab==='notes'&&<div className="labx-work-panel notes"><article><small>COACHING NOTES</small><h3>Keep these standards through the full session.</h3><ul>{workout.coachingNotes.length?workout.coachingNotes.map(item=><li key={item}>{item}</li>):<li>Track quality, reset between reps, and stop adding speed when the technique changes.</li>}</ul></article></div>}
    </section>}

    {screen==='drill'&&workout&&drill&&<section className="labx-shell drill"><div className="labx-crumb">THE LAB <i>›</i> WORKOUT <i>›</i> DRILL {activeDrill+1}<span>{activeDrill+1} OF {workout.drills.length}</span></div>
      <div className="labx-drill-head labx-drill-hero"><small>{drill.skill.toUpperCase()} · TRAINING SESSION</small><h1>{drill.title}</h1><p>{drill.description}</p><div className="labx-drill-meta"><b>{drill.prescription}</b><b>~{Math.max(1,Math.round(drill.duration/60))} MIN</b><b>{workout.difficulty.toUpperCase()}</b></div><div className="labx-pills">{drill.focus.map(x=><span key={x}>{x}</span>)}</div></div>
      <RiggedAthleteProof title={drill.title} skill={drill.skill} />
      <section className="labx-howto"><div><small>WATCH FIRST</small><b>Learn the shape.</b><span>Watch once at full speed, then use 0.5× when you need to study positioning or timing.</span></div><div><small>FOLLOW THE CHAIN</small><b>Feet → hips → hands.</b><span>Match the written coaching cues to what you see instead of copying one body part in isolation.</span></div><div><small>CHANGE ANGLE</small><b>Front · 3/4 · Side · Back.</b><span>Use the side view for posture and the front view for alignment, balance, and lateral control.</span></div></section><nav className="labx-drill-tabs">{(['coaching','breakdown','mistakes','variations'] as const).map(x=><button type="button" key={x} className={drillTab===x?'active':''} aria-pressed={drillTab===x} onClick={()=>setDrillTab(x)}>{x}</button>)}</nav>
      <div className="labx-drill-body">
       {drillTab==='coaching'&&<><h4>HOW TO PERFORM THIS DRILL</h4><div className="labx-instructions">{drill.instructions.map((x,i)=><p key={x}><b>{String(i+1).padStart(2,'0')}</b><span>{x}</span></p>)}</div><h4>KEY COACHING CUES</h4><div className="labx-coaching"><ul>{drill.coachingPoints.map(x=><li key={x}><FaCheck/> {x}</li>)}</ul><div className="labx-cue-card"><small>REP STANDARD</small><b>{drill.coachingPoints[0]||'Stay balanced and under control.'}</b><span>Reset the rep when your mechanics no longer match the cue.</span></div></div></>}
       {drillTab==='breakdown'&&<div className="labx-breakdown">{drill.instructions.map((x,i)=><article key={x}><em>{i+1}</em><div className="labx-phase-chip"><small>{i===0?'SETUP':i===drill.instructions.length-1?'FINISH':'ACTION'}</small><b>{drill.focus[i%Math.max(1,drill.focus.length)]||drill.skill}</b></div><p><b>STEP {i+1}</b><span>{x}</span>{drill.coachingPoints[i]&&<small>COACH CUE · {drill.coachingPoints[i]}</small>}</p></article>)}</div>}
       {drillTab==='mistakes'&&<><h4>COMMON MISTAKES</h4><div className="labx-mistakes">{drill.commonMistakes.map(x=><p key={x}><b>×</b><span><strong>{x}</strong><small>Recognize it early, reset your mechanics, and repeat the rep cleanly.</small></span></p>)}</div><blockquote>“SEE IT. READ IT. MAKE THE RIGHT PLAY.”<small>— RCL</small></blockquote></>}
       {drillTab==='variations'&&<><h4>VARIATIONS</h4><div className="labx-variations">{variationsForSkill(drill.skill).map(item=><p key={item.title}><b>{item.title}</b>{item.body}</p>)}</div></>}
      </div>
      <div className="labx-next"><button onClick={()=>activeDrill?goDrill(activeDrill-1):setScreen('workout')}><FaArrowLeft/> Previous</button><button className="labx-primary" onClick={nextDrill}>{activeDrill===workout.drills.length-1?'Complete Session':'Next Drill'} <FaArrowRight/></button></div>
    </section>}
  </main></>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mt-6 block"><span className="mb-2 block text-xs font-black uppercase tracking-[.2em] text-white/40">{label}</span>{children}</label>;
}
