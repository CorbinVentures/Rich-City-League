'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export interface SplashConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  duration: number;
}

export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<SplashConfig>({
    enabled: true,
    title: 'RICH CITY LEAGUE',
    subtitle: 'THE HOME OF RICHMOND BASKETBALL',
    duration: 2.5,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Check localStorage
    const hasSeen = localStorage.getItem('rcl_seen_splash');
    if (hasSeen === 'true') {
      setLoading(false);
      return;
    }

    // Load CMS Splash Config
    const supabase = getSupabaseClient();
    async function loadConfig() {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'splash_config')
            .maybeSingle() as any;
          if (data && data.value) {
            const val = data.value as unknown as SplashConfig;
            setConfig(val);
            if (!val.enabled) {
              setLoading(false);
              localStorage.setItem('rcl_seen_splash', 'true');
            } else {
              setShow(true);
            }
          } else {
            setShow(true);
          }
        } catch (e) {
          setShow(true);
        }
      } else {
        setShow(true);
      }
    }
    void loadConfig();
  }, []);

  useEffect(() => {
    if (!show) return;

    const intervalTime = (config.duration * 1000) / 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleComplete();
          return 100;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [show, config.duration]);

  const handleComplete = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('rcl_seen_splash', 'true');
    setShow(false);
    setLoading(false);
  };

  if (loading && !show) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rcl-gold border-t-transparent" />
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black font-display text-white transition-opacity duration-500">
      {/* Background Court Grid Texture */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Animated Basketball Crest */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-rcl-gold bg-black/40 shadow-[0_0_30px_rgba(255,215,0,0.3)] animate-pulse">
          <svg className="h-14 w-14 text-rcl-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3a9 9 0 019 9c0 2.22-.8 4.24-2.13 5.8m-1.4 1.34A9.001 9.001 0 013 12c0-2.22.8-4.24 2.13-5.8m1.4-1.34c1.6-.96 3.48-1.52 5.47-1.52a9 9 0 019 9m-9-9v18m0-18C8.5 7.5 7 10 7 12s1.5 4.5 5 6m0-12c3.5 1.5 5 4 5 6s-1.5 4.5-5 6" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-widest sm:text-6xl text-white">
          {config.title.split(' ').map((word, i) => (
            <span key={i} className={i === config.title.split(' ').length - 1 ? 'text-rcl-gold' : 'text-white'}>
              {word}{' '}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-sm font-bold tracking-[0.3em] uppercase text-gray-400 sm:text-base">
          {config.subtitle}
        </p>

        {/* Loading Bar */}
        <div className="mt-12 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-rcl-gold via-yellow-400 to-white transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <p className="mt-2 text-xs font-mono tracking-wider text-rcl-gold">{progress}% LOADED</p>

        {/* Skip button */}
        <button
          onClick={handleComplete}
          className="mt-8 rounded-full border border-white/20 bg-white/5 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:border-rcl-gold hover:bg-rcl-gold hover:text-black"
        >
          Skip Intro
        </button>
      </div>

      {/* Richmond Skyline Silhouette / Graphic at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 100">
          <path fill="currentColor" d="M0,100 L0,80 L50,80 L70,50 L90,50 L110,75 L150,75 L180,30 L210,30 L230,60 L280,60 L310,20 L350,20 L380,55 L420,55 L450,10 L500,10 L530,65 L580,65 L610,35 L660,35 L690,85 L730,85 L760,40 L810,40 L840,70 L890,70 L920,15 L960,15 L1000,60 L1040,60 L1080,25 L1120,25 L1150,80 L1200,80 L1240,45 L1280,45 L1310,75 L1360,75 L1400,90 L1440,90 L1440,100 Z" />
        </svg>
      </div>
    </div>
  );
}
