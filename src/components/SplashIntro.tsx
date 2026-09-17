'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowRight, FaBasketball, FaCalendarDays, FaComments, FaDumbbell, FaTrophy, FaUsers } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

export interface SplashConfig { enabled: boolean; title: string; subtitle: string; duration: number; }

const scenes = [
  { eyebrow: 'RICHMOND, VIRGINIA', title: <>THE CITY<br /><span>IS THE COURT.</span></>, copy: 'A basketball community built for the 804.' },
  { eyebrow: 'PLAY', title: <>GAMES.<br /><span>SCHEDULES.</span></>, copy: 'Follow the action, scores, standings and game-day moments.' },
  { eyebrow: 'THE PLAYERS', title: <>BUILD YOUR<br /><span>LEGACY.</span></>, copy: 'Player profiles, stats, rankings, badges and verified achievements.' },
  { eyebrow: 'THE COMMUNITY', title: <>CONNECT.<br /><span>SHARE.</span></>, copy: 'A basketball-first social experience for players, fans and the city.' },
  { eyebrow: 'THE LAB', title: <>TRAIN.<br /><span>DEVELOP.</span></>, copy: 'Personalized basketball workouts designed around your game.' },
  { eyebrow: 'FANTASY', title: <>DRAFT YOUR<br /><span>SQUAD.</span></>, copy: 'Build a fantasy team and compete using official RCL statistics.' },
  { eyebrow: 'THE LEAGUE', title: <>ONE CITY.<br /><span>ONE HOME.</span></>, copy: 'Registration, teams, officials, media, news and league operations.' },
  { eyebrow: 'RICH CITY LEAGUE', title: <>RICH CITY<br /><span>LEAGUE</span></>, copy: 'SAME CITY. HIGHER STANDARDS.' },
];

const sceneDuration = 1600;
const features = [
  { icon: FaBasketball, label: 'PLAY', detail: 'Games & stats' },
  { icon: FaUsers, label: 'PLAYERS', detail: 'Profiles & rankings' },
  { icon: FaComments, label: 'SOCIAL', detail: 'The 804 community' },
  { icon: FaDumbbell, label: 'THE LAB', detail: 'Player development' },
  { icon: FaTrophy, label: 'FANTASY', detail: 'Draft & compete' },
  { icon: FaCalendarDays, label: 'LEAGUE', detail: 'Schedules & events' },
];

export function SplashIntro() {
  const [show, setShow] = useState(false); const [loading, setLoading] = useState(true); const [scene, setScene] = useState(0); const [reducedMotion, setReducedMotion] = useState(false);
  const [config, setConfig] = useState<SplashConfig>({ enabled: true, title: 'RICH CITY LEAGUE', subtitle: 'THE HOME OF RICHMOND BASKETBALL', duration: 12 });
  const startedAt = useRef(0);
  const complete = useCallback(() => { setShow(false); setLoading(false); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); setReducedMotion(motionQuery.matches);
    const onMotionChange = () => setReducedMotion(motionQuery.matches); motionQuery.addEventListener?.('change', onMotionChange); setShow(true); setLoading(false); startedAt.current = Date.now();
    const supabase = getSupabaseClient();
    const loadConfig = async () => { try { if (!supabase) return; const result = await Promise.race([supabase.from('site_settings').select('value').eq('key', 'splash_config').maybeSingle(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1800))]); const data = (result as { data?: { value?: unknown } | null } | null)?.data; if (data?.value) { const value = data.value as SplashConfig; setConfig(value); if (value.enabled === false) complete(); } } catch { /* Intro remains independent of CMS availability. */ } };
    void loadConfig(); const failsafe = window.setTimeout(complete, 18000); return () => { motionQuery.removeEventListener?.('change', onMotionChange); window.clearTimeout(failsafe); };
  }, [complete]);

  useEffect(() => { if (!show || reducedMotion) return; const totalDuration = Math.max(config.duration * 1000, sceneDuration * scenes.length); const timer = window.setInterval(() => { const elapsed = Date.now() - startedAt.current; if (elapsed >= totalDuration) complete(); else setScene(Math.min(scenes.length - 1, Math.floor(elapsed / sceneDuration))); }, 80); return () => window.clearInterval(timer); }, [complete, config.duration, reducedMotion, show]);
  if (!show && loading) return <div className="rcl-splash-loading" role="status" aria-label="Preparing Rich City League intro"><span>RCL</span></div>;
  if (!show) return null;

  const activeScene = scenes[scene];
  return <div className="rcl-splash" role="dialog" aria-label="Rich City League introduction">
    <div className="rcl-splash-atmosphere" aria-hidden="true" /><div className="rcl-splash-skyline" aria-hidden="true"><span className="rcl-splash-bridge" /></div><div className="rcl-splash-court" aria-hidden="true" /><div className="rcl-splash-player" aria-hidden="true"><span className="rcl-splash-ball"><FaBasketball /></span></div>
    <div className={`rcl-splash-scene rcl-splash-scene-${scene}`} key={scene}><p className="rcl-splash-eyebrow">{activeScene.eyebrow}</p><h1>{activeScene.title}</h1><p className="rcl-splash-copy">{activeScene.copy}</p></div>
    {scene >= 1 && scene <= 6 && <div className="absolute bottom-20 left-1/2 z-20 w-[min(92vw,900px)] -translate-x-1/2"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{features.map(({ icon: Icon, label, detail }) => <div key={label} className={`rounded-xl border border-white/10 bg-black/45 p-3 backdrop-blur transition ${scene === features.findIndex((item) => item.label === label) + 1 ? 'border-rcl-orange/60 bg-rcl-orange/10' : ''}`}><Icon className="text-rcl-orange" /><p className="mt-2 text-[10px] font-black tracking-widest text-white">{label}</p><p className="mt-1 text-[9px] text-white/55">{detail}</p></div>)}</div></div>}
    {scene === scenes.length - 1 && <div className="rcl-splash-finale"><p>WELCOME TO THE</p><strong>RICH CITY<br /><span>LEAGUE</span></strong><small>{config.subtitle}</small><button className="rcl-splash-enter" onClick={complete}>ENTER THE LEAGUE <FaArrowRight /></button></div>}
    <button className="rcl-splash-skip" onClick={complete} aria-label="Skip intro">SKIP</button><div className="rcl-splash-progress" aria-hidden="true"><span style={{ width: `${((scene + 1) / scenes.length) * 100}%` }} /></div>
  </div>;
}
