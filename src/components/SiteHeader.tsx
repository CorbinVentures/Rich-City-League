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
  FaShirt
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
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);
      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };
    fetchUnread();
    // Subscribe to new notifications
    const channel = supabase
      .channel('header_notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => {
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  const mainNavLinks = [
    { label: 'HOME', href: '/', icon: FaHouse },
    { label: 'SCHEDULE', href: '/games', icon: FaCalendarDays },
    { label: 'STANDINGS', href: '/standings', icon: FaFolderOpen },
    { label: 'STATS', href: '/stats', icon: FaChartSimple },
    { label: 'SOCIAL', href: '/social', icon: FaUsers },
    { label: 'MESSAGES', href: '/messages', icon: FaComments },
  ];

  const secondaryNavLinks = [
    { label: 'PLAYERS', href: '/players', icon: FaUser },
    { label: 'TEAMS', href: '/teams', icon: FaUsers },
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
  ];

  if (isAdmin) {
    secondaryNavLinks.push({ label: 'ADMIN', href: '/admin', icon: FaGear });
  }

  const allLinks = [...mainNavLinks, ...secondaryNavLinks];

  return (
    <>
      <header className="sticky top-0 z-45 border-b border-white/10 bg-[#07090d]/95 shadow-[0_4px_30px_rgba(0,0,0,0.8)] backdrop-blur font-display">
        <div className="mx-auto flex max-w-7xl h-18 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="rcl-texture flex h-10 w-10 items-center justify-center rounded-lg border-2 border-rcl-orange bg-rcl-navy font-extrabold text-rcl-orange shadow-[0_0_10px_rgba(255,107,26,0.3)] transition-all group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,107,26,0.45)]">
              R
            </div>
            <div>
              <span className="block text-sm font-black tracking-[0.2em] text-white">
                RICH CITY <span className="text-rcl-orange">LEAGUE</span>
              </span>
              <span className="block text-[9px] font-bold tracking-[0.35em] text-gray-400">
                THE CITY IS THE COURT
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {allLinks.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 hover:bg-white/5 hover:text-rcl-gold group ${
                    active 
                      ? 'text-rcl-gold shadow-[inset_0_-2px_0_#FFD700]' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-rcl-gold' : 'text-gray-500 group-hover:text-rcl-gold'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth & Notification Controls */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <Link 
                  href="/dashboard" 
                  className="relative p-2 rounded-full border border-white/10 bg-white/5 hover:border-rcl-gold hover:text-rcl-gold transition-all"
                >
                  <FaBell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rcl-red text-[10px] font-black text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Dashboard / User RVA Profile Card */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-2 pr-4 py-1 hover:border-rcl-gold transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rcl-gold text-xs font-black text-black uppercase">
                    {profile?.display_name?.[0] ?? user.email?.[0] ?? 'P'}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-gray-300">
                    {profile?.display_name ?? 'Dashboard'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/sign-in"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-wider text-white hover:border-rcl-gold hover:text-rcl-gold transition-all"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-rcl-gold px-4 py-1.5 text-xs font-bold tracking-wider text-black hover:bg-white transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                >
                  REGISTER
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-white/10 bg-white/5 hover:text-rcl-gold hover:border-rcl-gold transition-all"
              aria-label="Open navigation menu"
            >
              <FaBars className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Primary mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-[#060b14]/95 backdrop-blur-lg shadow-[0_-4px_30px_rgba(0,0,0,0.9)] font-display pb-[env(safe-area-inset-bottom)]">
        <div className="grid min-h-16 grid-cols-7 items-center justify-items-center px-1">
          {[
            { label: 'HOME', href: '/', icon: FaHouse },
            { label: 'PLAYERS', href: '/players', icon: FaUser },
            { label: 'GAMES', href: '/games', icon: FaCalendarDays },
            { label: 'RCL', href: '/dashboard', icon: FaCrown },
            { label: 'SOCIAL', href: '/social', icon: FaUsers },
            { label: 'FANTASY', href: '/fantasy', icon: FaTrophy },
          ].map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            const Icon = link.icon;
            const center = link.label === 'RCL';
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-1 text-[8px] font-black tracking-wider ${
                  active ? 'text-rcl-gold' : 'text-gray-400'
                }`}
              >
                <Icon className={`${center ? 'h-7 w-7 rounded-full bg-rcl-orange p-1.5 text-black shadow-[0_0_18px_rgba(249,115,22,.5)]' : 'h-4 w-4'} ${active ? 'text-rcl-gold' : 'text-gray-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open more navigation"
            className="flex min-h-14 flex-col items-center justify-center gap-1 py-1 text-[8px] font-black tracking-wider text-gray-400 hover:text-rcl-gold"
          >
            <FaBars className="h-4 w-4 text-gray-500" />
            <span>MORE</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (NBA 2K-Style overlay panel) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm lg:hidden font-display">
          <div className="w-full max-w-xs bg-black border-l border-white/15 h-full flex flex-col justify-between p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-slide-up">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div>
                  <span className="block font-black text-sm text-white tracking-widest">RCL NAVIGATION</span>
                  <span className="block text-[9px] text-gray-500 tracking-wider">RICHMOND BASKETBALL</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg border border-white/10 bg-white/5 hover:text-rcl-gold hover:border-rcl-gold transition-all"
                  aria-label="Close navigation menu"
                >
                  <FaXmark className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="mt-6 flex flex-col gap-1 overflow-y-auto max-h-[70vh]">
                {allLinks.map((link) => {
                  const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold tracking-widest transition-all ${
                        active 
                          ? 'bg-rcl-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-rcl-gold'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Profile / Footer Actions */}
            <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white hover:border-rcl-gold"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rcl-gold text-[10px] font-black text-black">
                      {profile?.display_name?.[0] ?? 'D'}
                    </div>
                    <span>{profile?.display_name ?? 'Dashboard'}</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold tracking-widest text-rcl-red hover:bg-rcl-red/10 transition-all"
                  >
                    SIGN OUT
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 rounded-xl border border-white/20 text-center text-xs font-bold tracking-widest text-white hover:border-rcl-gold"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 rounded-xl bg-rcl-gold text-center text-xs font-bold tracking-widest text-black hover:bg-white"
                  >
                    REGISTER NOW
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
