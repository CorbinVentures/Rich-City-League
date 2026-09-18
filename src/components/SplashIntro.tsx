'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCalendarDays, FaComments, FaDumbbell, FaFlask, FaGamepad, FaLocationDot, FaMedal, FaPeopleGroup, FaRankingStar, FaUser } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

export interface SplashConfig { enabled: boolean; title: string; subtitle: string; duration: number; }
const SPLASH_LAST_SEEN_KEY = 'rcl_splash_last_seen';
const featureCards = [
  { label: 'THE LAB', detail: 'TRAIN. IMPROVE. EVOLVE.', icon: FaFlask, href: '/lab', tone: 'lab' },
  { label: 'THE NEIGHBORHOOD', detail: 'COMMUNITY. EVENTS. IMPACT.', icon: FaLocationDot, href: '/city', tone: 'neighborhood' },
  { label: 'RCL FANTASY', detail: 'DRAFT. MANAGE. COMPETE.', icon: FaRankingStar, href: '/fantasy', tone: 'fantasy' },
  { label: 'MY CAREER', detail: 'STATS. MILESTONES. LEGACY.', icon: FaUser, href: '/dashboard', tone: 'career' },
  { label: 'THE DRAFT', detail: 'NEXT UP. BIGGER OPPORTUNITIES.', icon: FaPeopleGroup, href: '/draft', tone: 'draft' },
  { label: 'BADGES', detail: 'EARN. UNLOCK. STAND OUT.', icon: FaMedal, href: '/badges', tone: 'badges' },
  { label: 'SOCIAL', detail: 'PLAYERS. FANS. CONVERSATION.', icon: FaComments, href: '/community', tone: 'social' },
];
function getLocalDateKey() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }

export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SplashConfig>({ enabled: true, title: 'RICH CITY LEAGUE', subtitle: 'THE HOME OF RICHMOND BASKETBALL', duration: 12 });
  const complete = useCallback(() => { if (typeof window !== 'undefined') window.localStorage.setItem(SPLASH_LAST_SEEN_KEY, getLocalDateKey()); setShow(false); setLoading(false); }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(SPLASH_LAST_SEEN_KEY) === getLocalDateKey()) { setLoading(false); return; }
    setShow(true); setLoading(false);
    const supabase = getSupabaseClient();
    const loadConfig = async () => { try { if (!supabase) return; const result = await Promise.race([supabase.from('site_settings').select('value').eq('key', 'splash_config').maybeSingle(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1800))]); const data = (result as { data?: { value?: unknown } | null } | null)?.data; if (data?.value) { const value = data.value as SplashConfig; setConfig(value); if (value.enabled === false) complete(); } } catch { /* Splash remains independent of CMS availability. */ } };
    void loadConfig();
    if (supabase) void supabase.from('content_assets').select('image_url').eq('asset_key', 'splash.background').eq('is_active', true).maybeSingle().then(({ data }) => setBackgroundUrl((data as { image_url?: string | null } | null)?.image_url ?? null));
    const failsafe = window.setTimeout(complete, 18000); return () => window.clearTimeout(failsafe);
  }, [complete]);
  if (!show && loading) return <div className="rcl-splash-loading" role="status" aria-label="Preparing Rich City League"><span>RCL</span></div>;
  if (!show) return null;
  return (
    <div className="rcl-splash" role="dialog" aria-label="Rich City League introduction">{backgroundUrl && <img src={backgroundUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
      <div className="rcl-splash-stars" aria-hidden="true" /><div className="rcl-splash-glow" aria-hidden="true" />
      <div className="rcl-splash-skyline-art" aria-hidden="true"><span /><i /><b /><em /></div><div className="rcl-splash-bridge-art" aria-hidden="true" />
      <div className="rcl-splash-player-art" aria-hidden="true"><div className="rcl-player-head" /><div className="rcl-player-body" /><div className="rcl-player-arm rcl-player-arm-left" /><div className="rcl-player-arm rcl-player-arm-right" /></div>
      <header className="rcl-splash-header"><div className="rcl-splash-wordmark"><span>RICHMOND</span><span>•</span><span>PLAY</span><span>•</span><span>COMPETE</span><span>•</span><span>CONNECT</span><span>•</span><span>BUILD</span></div><button className="rcl-splash-close" onClick={complete} aria-label="Close introduction">×</button></header>
      <div className="rcl-splash-side-copy rcl-splash-side-left">MORE<br />THAN<br />BASKETBALL</div><div className="rcl-splash-side-copy rcl-splash-side-right">SAME<br />CITY.<br />BIGGER<br />OPPORTUNITIES.</div><div className="rcl-splash-side-copy rcl-splash-wall-left">OUR<br />CITY.<br />OUR<br />LEAGUE.</div><div className="rcl-splash-side-copy rcl-splash-wall-right">GOOD<br />PLAYERS.<br />BETTER<br />PEOPLE.</div>
      <main className="rcl-splash-content">
        <div className="rcl-splash-logo" aria-label="Rich City League logo"><div className="rcl-splash-logo-city">RICHMOND</div><strong>RCL</strong><span>RICH CITY LEAGUE</span><small>PLAYERS &nbsp; PEOPLE &nbsp; PURPOSE</small></div>
        <p className="rcl-splash-kicker">WELCOME TO</p><h1>{config.title || 'RICH CITY LEAGUE'}</h1><p className="rcl-splash-tagline">BASKETBALL LIVES HERE</p>
        <section className="rcl-splash-feature-grid" aria-label="Rich City League features">{featureCards.map(({ label, detail, icon: Icon, href, tone }) => <Link key={label} href={href} className={`rcl-splash-feature rcl-splash-feature-${tone}`} onClick={complete}><div className="rcl-splash-feature-icon"><Icon /></div><div><strong>{label}</strong><small>{detail}</small></div></Link>)}</section>
        <button className="rcl-splash-enter" onClick={complete}>GET STARTED <FaArrowRight /></button><p className="rcl-splash-microcopy">A STRONGER RICHMOND THROUGH BASKETBALL</p>
      </main>
      <nav className="rcl-splash-nav" aria-label="Primary navigation"><Link href="/" onClick={complete}><FaGamepad /><span>HOME</span></Link><Link href="/schedule" onClick={complete}><FaCalendarDays /><span>SCHEDULE</span></Link><Link href="/teams" onClick={complete}><FaPeopleGroup /><span>TEAMS</span></Link><button className="rcl-splash-nav-rcl" onClick={complete} aria-label="RCL home"><FaBasketball /></button><Link href="/stats" onClick={complete}><FaRankingStar /><span>STATS</span></Link><Link href="/community" onClick={complete}><FaPeopleGroup /><span>COMMUNITY</span></Link><Link href="/account" onClick={complete}><FaDumbbell /><span>MORE</span></Link></nav>
    </div>
  );
}
