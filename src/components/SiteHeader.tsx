'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaHouse,
  FaCalendarDays,
  FaChartSimple,
  FaUsers,
  FaUser,
  FaFolderOpen,
  FaNewspaper,
  FaPlay,
  FaListOl,
  FaUserTie,
  FaGear,
  FaBars,
  FaXmark,
  FaBell,
  FaComments,
  FaPeopleGroup,
  FaCrown,
  FaTrophy,
  FaShirt,
  FaMagnifyingGlass,
  FaFlask,
} from 'react-icons/fa6';

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    const fetchUnread = async () => {
      const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).is('read_at', null);
      if (!error && count !== null) setUnreadCount(count);
    };
    fetchUnread();
    const channel = supabase.channel('header_notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => setUnreadCount((c) => c + 1)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  if (pathname === '/') return null;

  const primaryNav = [
    { label: 'HOME', href: '/', icon: FaHouse },
    { label: 'GAMES', href: '/games', icon: FaCalendarDays },
    { label: 'TEAMS', href: '/teams', icon: FaUsers },
    { label: 'PLAYERS', href: '/players', icon: FaUser },
    { label: 'SOCIAL', href: '/social', icon: FaPeopleGroup },
    { label: 'THE LAB', href: '/lab', icon: FaFlask },
  ];

  const allLinks = [
    ...primaryNav,
    { label: 'DRAFT NIGHT', href: '/draft', icon: FaCrown },
    { label: 'STANDINGS', href: '/standings', icon: FaFolderOpen },
    { label: 'STATS', href: '/stats', icon: FaChartSimple },
    { label: 'GAME IQ', href: '/game-iq', icon: FaChartSimple },
    { label: 'MESSAGES', href: '/messages', icon: FaComments },
    { label: 'COACHES', href: '/coaches', icon: FaUserTie },
    { label: 'NEWS', href: '/news', icon: FaNewspaper },
    { label: 'MEDIA', href: '/media', icon: FaPlay },
    { label: 'RANKINGS', href: '/rankings', icon: FaListOl },
    { label: 'COMMUNITIES', href: '/communities', icon: FaPeopleGroup },
    { label: 'FRIENDS', href: '/friends', icon: FaUsers },
    { label: 'FANTASY', href: '/fantasy', icon: FaTrophy },
    { label: 'LEADERBOARDS', href: '/leaderboards', icon: FaListOl },
    { label: 'SHOP', href: '/shop', icon: FaShirt },
    { label: 'NOTIFICATIONS', href: '/notifications', icon: FaBell },
    ...(isAdmin ? [{ label: 'ADMIN', href: '/admin', icon: FaGear }] : []),
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <header className="rcl-site-header sticky top-0 z-45 border-b border-white/10 backdrop-blur font-display">
        <div className="rcl-site-header-inner mx-auto flex h-[4.5rem] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="rcl-brand group flex items-center gap-3">
            <div className="rcl-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 bg-rcl-navy font-black text-lg transition-all group-hover:scale-105">R</div>
            <div className="leading-none">
              <span className="block text-[15px] font-black tracking-[0.22em] text-white">RICH CITY</span>
              <span className="mt-1 block text-[15px] font-black tracking-[0.22em]">LEAGUE</span>
              <span className="mt-1 block text-[7px] font-bold tracking-[0.32em] text-slate-500">THE CITY IS THE COURT</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {primaryNav.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black tracking-[.14em] transition-all ${active ? 'text-white' : 'text-slate-500 hover:text-white'}`}>
                  {active && <span className="absolute inset-x-2 -bottom-1 h-px bg-gradient-to-r from-rcl-orange to-rcl-blue" />}
                  <Icon className={`h-3 w-3 ${active ? 'text-rcl-orange' : 'text-slate-600 group-hover:text-rcl-blue'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/search" aria-label="Search RCL" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/60 hover:border-rcl-blue hover:text-white">
              <FaMagnifyingGlass className="h-3.5 w-3.5" />
            </Link>
            {user && (
              <Link href="/dashboard" aria-label="Open dashboard" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.03] text-xs font-black text-rcl-orange">
                {profile?.display_name?.[0] ?? user.email?.[0] ?? 'P'}
              </Link>
            )}
            <Link href={user ? "/dashboard" : "/auth/sign-in"} className="hidden sm:inline-flex min-h-9 items-center rounded-lg border border-white/15 bg-white/[.03] px-4 text-[10px] font-black tracking-[.12em] text-white hover:border-rcl-blue">
              {user ? 'PROFILE' : 'SIGN IN'}
            </Link>
            <Link href="https://vba.leagueapps.com/leagues" className="hidden sm:inline-flex min-h-9 items-center rounded-lg bg-gradient-to-r from-[#0f9fff] to-[#0672e8] px-4 text-[10px] font-black tracking-[.12em] text-white shadow-[0_8px_25px_rgba(0,137,255,.22)] hover:-translate-y-0.5">
              JOIN RCL
            </Link>
            <div className="rcl-mobile-actions flex items-center gap-2 lg:hidden">
              <Link href="/search" aria-label="Search RCL" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/65"><FaMagnifyingGlass className="h-3.5 w-3.5" /></Link>
              <Link href={user ? "/dashboard" : "/auth/sign-in"} aria-label={user ? "Open profile" : "Sign in"} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/65">{user ? <span className="text-xs font-black text-rcl-orange">{profile?.display_name?.[0] ?? 'P'}</span> : <FaUser className="h-3.5 w-3.5" />}</Link>
              <button onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/65"><FaBars className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </header>

      {pathname !== '/social' && (
        <nav aria-label="Primary mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#05080d]/96 backdrop-blur-xl font-display pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto grid min-h-16 max-w-xl grid-cols-5 items-center px-2">
            {[
              { label: 'HOME', href: '/', icon: FaHouse },
              { label: 'PLAYERS', href: '/players', icon: FaUser },
              { label: 'GAMES', href: '/games', icon: FaCalendarDays },
              { label: 'SOCIAL', href: '/social', icon: FaPeopleGroup },
            ].map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return <Link key={link.href} href={link.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[8px] font-black tracking-[.12em] ${active ? 'text-rcl-orange' : 'text-gray-500'}`}><Icon className="h-4 w-4" /><span>{link.label}</span></Link>;
            })}
            <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open full RCL navigation" className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[8px] font-black tracking-[.12em] ${mobileMenuOpen ? 'text-rcl-orange' : 'text-gray-500'}`}><FaBars className="h-4 w-4" /><span>MORE</span></button>
          </div>
        </nav>
      )}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm lg:hidden font-display" onClick={() => setMobileMenuOpen(false)}>
          <div className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-l border-rcl-blue/20 bg-[#05080d] shadow-[0_0_70px_rgba(0,0,0,.9)]" onClick={(event) => event.stopPropagation()}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(15,159,255,.14),transparent_32%),linear-gradient(145deg,rgba(9,22,36,.95),rgba(3,7,13,.98))]" />
            <div className="relative flex min-h-32 items-center gap-4 border-b border-white/10 px-5">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-rcl-blue/40 bg-[#0b1c2d] text-2xl font-black text-white shadow-[0_0_30px_rgba(15,159,255,.14)]">R</div>
              <div className="min-w-0 flex-1">
                <span className="block text-base font-black tracking-[.18em] text-white">RICH CITY <span className="text-rcl-blue">LEAGUE</span></span>
                <span className="mt-1 block text-[8px] font-bold tracking-[.3em] text-slate-500">804 · RICHMOND, VIRGINIA</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/70 hover:border-rcl-orange hover:text-rcl-orange"><FaXmark className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 flex max-h-[72vh] flex-col gap-1 overflow-y-auto">
              {allLinks.map((link) => {
                const Icon = link.icon;
                return <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-black tracking-widest ${isActive(link.href) ? 'bg-gradient-to-r from-[#0f9fff] to-[#0672e8] text-white' : 'text-slate-400 hover:bg-white/[.04] hover:text-white'}`}><Icon className="h-4 w-4" />{link.label}</Link>;
              })}
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              {user ? (
                <button onClick={() => { setMobileMenuOpen(false); void signOut(); }} className="w-full rounded-xl border border-white/10 py-3 text-xs font-black tracking-widest text-slate-400 hover:border-rcl-orange hover:text-rcl-orange">SIGN OUT</button>
              ) : (
                <Link href="https://vba.leagueapps.com/leagues" onClick={() => setMobileMenuOpen(false)} className="block w-full rounded-xl bg-gradient-to-r from-[#0f9fff] to-[#0672e8] py-3 text-center text-xs font-black tracking-widest text-white">JOIN RCL</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
