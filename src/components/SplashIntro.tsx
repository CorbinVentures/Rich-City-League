'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowRight, FaBasketball } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

export interface SplashConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  duration: number;
}

const scenes = [
  { eyebrow: 'RICHMOND, VIRGINIA', title: <>RICHMOND<br /><span>VIRGINIA</span></>, copy: 'REAL HOOPS. REAL PEOPLE. REAL IMPACT.' },
  { eyebrow: 'THE CITY', title: <>THE CITY<br /><span>IS THE COURT.</span></>, copy: 'JAMES RIVER · 804 · AFTER DARK' },
  { eyebrow: 'THE PLAYER', title: <>MORE<br />THAN A<br /><span>LEAGUE.</span></>, copy: 'A PLAYER WHO COULD PLAY HERE.' },
  { eyebrow: 'THE RUN', title: <>PLAY.<br />DEVELOP.<br /><span>COMPETE.</span></>, copy: 'BELONG.' },
  { eyebrow: 'THE COMMUNITY', title: <>COMMUNITY.<br />OPPORTUNITY.<br /><span>EXPOSURE.</span></>, copy: 'RICHMOND.' },
  { eyebrow: 'THE GAME', title: <>SAME CITY.<br /><span>HIGHER STANDARDS.</span></>, copy: 'THE NEXT POSSESSION IS OURS.' },
  { eyebrow: 'RICH CITY LEAGUE', title: <>RICH CITY<br /><span>LEAGUE</span></>, copy: 'RICHMOND, VA · THE CITY IS THE COURT.' },
  { eyebrow: 'THE MISSION', title: <>A STRONGER<br /><span>RICHMOND.</span></>, copy: 'COMPETITION CREATES OPPORTUNITY. OPPORTUNITY CREATES CHANGE.' },
  { eyebrow: 'WELCOME TO THE', title: <>RICH CITY<br /><span>LEAGUE</span></>, copy: 'SAME CITY. HIGHER STANDARDS.' },
];

const sceneDuration = 1500;

export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scene, setScene] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [config, setConfig] = useState<SplashConfig>({ enabled: true, title: 'RICH CITY LEAGUE', subtitle: 'THE HOME OF RICHMOND BASKETBALL', duration: 12 });
  const startedAt = useRef(0);

  const complete = useCallback(() => {
    setShow(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const onMotionChange = () => setReducedMotion(motionQuery.matches);
    motionQuery.addEventListener?.('change', onMotionChange);
    setShow(true);
    setLoading(false);
    startedAt.current = Date.now();

    const supabase = getSupabaseClient();
    const loadConfig = async () => {
      try {
        if (!supabase) return;
        const result = await Promise.race([
          supabase.from('site_settings').select('value').eq('key', 'splash_config').maybeSingle(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1800)),
        ]);
        const data = (result as { data?: { value?: unknown } | null } | null)?.data;
        if (data?.value) {
          const value = data.value as unknown as SplashConfig;
          setConfig(value);
          if (value.enabled === false) complete();
        }
      } catch {
        // The cinematic intro is intentionally independent of CMS availability.
      }
    };
    void loadConfig();

    const failsafe = window.setTimeout(complete, 18000);
    return () => {
      motionQuery.removeEventListener?.('change', onMotionChange);
      window.clearTimeout(failsafe);
    };
  }, [complete]);

  useEffect(() => {
    if (!show || reducedMotion) return;
    const totalDuration = Math.max(config.duration * 1000, sceneDuration * scenes.length);
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= totalDuration) complete();
      else setScene(Math.min(scenes.length - 1, Math.floor(elapsed / sceneDuration)));
    }, 80);
    return () => window.clearInterval(timer);
  }, [complete, config.duration, reducedMotion, show]);

  if (!show && loading) return <div className="rcl-splash-loading" role="status" aria-label="Preparing Rich City League intro"><span>RCL</span></div>;
  if (!show) return null;

  if (reducedMotion) {
    return (
      <div className="rcl-splash rcl-splash-reduced" role="dialog" aria-label="Rich City League introduction">
        <div className="rcl-splash-skyline" aria-hidden="true" />
        <div className="rcl-splash-content">
          <p className="rcl-splash-eyebrow">RICHMOND, VIRGINIA</p>
          <h1>RICH CITY<br /><span>LEAGUE</span></h1>
          <p className="rcl-splash-copy">THE CITY IS THE COURT.</p>
          <button className="rcl-splash-enter" onClick={complete}>ENTER THE LEAGUE <FaArrowRight /></button>
          <button className="rcl-splash-skip" onClick={complete}>SKIP</button>
        </div>
      </div>
    );
  }

  const activeScene = scenes[scene];
  return (
    <div className="rcl-splash" role="dialog" aria-label="Rich City League cinematic introduction">
      <div className="rcl-splash-atmosphere" aria-hidden="true" />
      <div className="rcl-splash-skyline" aria-hidden="true"><span className="rcl-splash-bridge" /></div>
      <div className="rcl-splash-court" aria-hidden="true" />
      <div className="rcl-splash-player" aria-hidden="true"><span className="rcl-splash-ball"><FaBasketball /></span></div>
      <div className={`rcl-splash-scene rcl-splash-scene-${scene}`} key={scene}>
        <p className="rcl-splash-eyebrow">{activeScene.eyebrow}</p>
        <h1>{activeScene.title}</h1>
        <p className="rcl-splash-copy">{activeScene.copy}</p>
      </div>
      {scene === 6 && <div className="rcl-splash-mark" aria-label="Rich City League mark">R<span>CL</span></div>}
      {scene === scenes.length - 1 && (
        <div className="rcl-splash-finale">
          <p>WELCOME TO THE</p>
          <strong>RICH CITY<br /><span>LEAGUE</span></strong>
          <small>SAME CITY. HIGHER STANDARDS.</small>
          <button className="rcl-splash-enter" onClick={complete}>ENTER THE LEAGUE <FaArrowRight /></button>
        </div>
      )}
      <button className="rcl-splash-skip" onClick={complete} aria-label="Skip intro">SKIP</button>
      <div className="rcl-splash-progress" aria-hidden="true"><span style={{ width: `${((scene + 1) / scenes.length) * 100}%` }} /></div>
    </div>
  );
}
