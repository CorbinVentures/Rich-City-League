'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaGear, FaBars, FaXmark, FaMagnifyingGlass, FaBell, FaHouse, FaUser, FaPeopleGroup, FaCalendarDays, FaBasketball } from 'react-icons/fa6';
import { RCL_ADMIN_NAV_ITEM, RCL_NAV_ITEMS } from '@/lib/rcl-navigation';

export function SiteHeader(){
  const pathname=usePathname();
  const {user,profile,signOut}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const [unreadCount,setUnreadCount]=useState(0);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    if(!user||!supabase)return;
    const load=async()=>{const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);if(count!==null)setUnreadCount(count);};
    void load();
    const channel=supabase.channel('rcl_header_notifications').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>setUnreadCount(v=>v+1)).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[user,supabase]);

  if(pathname==='/'||pathname==='/social'||pathname.startsWith('/social/')||pathname==='/profile'||pathname.startsWith('/profile/'))return null;

  const socialChildPaths=['/friends','/messages','/notifications','/communities','/runs','/settings'];
  const isSocialChild=socialChildPaths.some(path=>pathname===path||pathname.startsWith(path+'/'));
  if(isSocialChild)return <>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05080d]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-5xl items-center gap-3 px-4">
        <Link href="/social" aria-label="Back to Social" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rcl-orange/30 bg-black/50 font-black text-rcl-orange">←</Link>
        <Link href="/social" className="hidden text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange sm:block">RCL Social</Link>
        <Link href="/search" className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-rcl-blue/40 bg-[#07111b] px-4 text-white/40"><FaMagnifyingGlass/><span className="truncate text-sm">Search players, teams, runs…</span></Link>
        <Link href="/notifications" aria-label="Notifications" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60"><FaBell/>{unreadCount>0&&<em className="absolute right-1 top-1 rounded-full bg-rcl-orange px-1 text-[8px] not-italic text-black">{unreadCount>9?'9+':unreadCount}</em>}</Link>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080b10]/95 px-4 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
        <Link href="/social" className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[10px] font-black uppercase text-white/50"><span>⚡</span>Feed</Link>
        <Link href="/friends" className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[10px] font-black uppercase ${pathname.startsWith('/friends')?'bg-rcl-orange text-black':'border border-white/10 text-white/50'}`}><span>◉</span>Discover</Link>
        <Link href="/runs" className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[10px] font-black uppercase ${pathname.startsWith('/runs')?'bg-rcl-orange text-black':'border border-white/10 text-white/50'}`}><FaBasketball/>Runs</Link>
        <Link href="/social?view=highlights" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-3 text-[10px] font-black uppercase text-white/50"><span>▶</span>Highlights</Link>
      </div>
    </nav>
  </>;

  const isAdmin=profile?.role==='admin'||profile?.role==='staff';
  const links=isAdmin?[...RCL_NAV_ITEMS,RCL_ADMIN_NAV_ITEM]:RCL_NAV_ITEMS;
  const active=(href:string)=>pathname===href||(href!=='/'&&pathname.startsWith(href));

  return <>
    <aside className="rcl-universal-sidebar">
      <Link href="/" className="rcl-universal-brand">
        <span className="rcl-universal-mark">RCL</span>
        <span><b>RICH CITY <i>LEAGUE</i></b><small>804 · RVA</small></span>
      </Link>
      <nav className="rcl-universal-nav">
        {links.map(item=>{const Icon=item.icon;return <Link key={item.href+item.label} href={item.href} className={active(item.href)?'active':''}><Icon/><span>{item.label}</span></Link>})}
      </nav>
      <div className="rcl-universal-account">
        {user?<Link href="/dashboard" className="rcl-universal-profile"><span className="rcl-universal-avatar">{profile?.display_name?.[0]??user.email?.[0]??'P'}</span><span><b>{profile?.display_name??'RCL MEMBER'}</b><small>View Profile</small></span><strong>›</strong></Link>:<Link href="/auth/sign-in" className="rcl-universal-profile"><span className="rcl-universal-avatar">R</span><span><b>RCL MEMBER</b><small>Sign In</small></span><strong>›</strong></Link>}
        <Link href="/settings" className="rcl-universal-account-link"><FaGear/> Settings</Link>
        {user&&<button onClick={()=>void signOut()} className="rcl-universal-account-link"><span>↪</span> Log Out</button>}
      </div>
      <div className="rcl-universal-motto"><b>PLAY.</b><span>COMPETE.</span><b>CONNECT.</b><span>GROW.</span><small>♛<br/>RICHMOND<br/>VIRGINIA</small></div>
    </aside>

    <header className="rcl-universal-topbar">
      <Link href="/" className="rcl-universal-wordmark"><span>R</span><b>RICH CITY <i>LEAGUE</i></b></Link>
      <div className="rcl-universal-tools">
        <Link href="/search" aria-label="Search"><FaMagnifyingGlass/></Link>
        <Link href="/notifications" aria-label="Notifications" className="rcl-notification-button"><FaBell/>{unreadCount>0&&<em>{unreadCount>9?'9+':unreadCount}</em>}</Link>
        <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL navigation"><FaBars/></button>
      </div>
    </header>

    <nav className="rcl-universal-bottom">
      {[{label:'Home',href:'/',icon:FaHouse},{label:'Players',href:'/players',icon:FaUser},{label:'Games',href:'/games',icon:FaCalendarDays},{label:'Social',href:'/social',icon:FaPeopleGroup}].map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className={active(item.href)?'active':''}><Icon/><span>{item.label}</span></Link>})}
      <button type="button" onClick={()=>setMenuOpen(true)} className={menuOpen?'active':''}><FaBars/><span>More</span></button>
    </nav>

    {menuOpen&&<div className="rcl-universal-drawer-backdrop" onClick={()=>setMenuOpen(false)}>
      <aside className="rcl-universal-drawer" onClick={e=>e.stopPropagation()}>
        <div className="rcl-universal-drawer-head"><div className="rcl-universal-mark">RCL</div><div><b>RICH CITY <i>LEAGUE</i></b><small>804 · RICHMOND, VIRGINIA</small></div><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close"><FaXmark/></button></div>
        <nav>{links.map(item=>{const Icon=item.icon;return <Link key={item.href+item.label} href={item.href} onClick={()=>setMenuOpen(false)} className={active(item.href)?'active':''}><Icon/><span>{item.label}</span></Link>})}</nav>
      </aside>
    </div>}
  </>;
}
