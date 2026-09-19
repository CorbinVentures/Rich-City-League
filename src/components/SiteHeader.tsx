'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaHouse, FaCalendarDays, FaChartSimple, FaUsers, FaUser, FaFolderOpen, FaNewspaper,
  FaPlay, FaListOl, FaUserTie, FaGear, FaBars, FaXmark, FaBell, FaComments,
  FaPeopleGroup, FaCrown, FaTrophy, FaShirt, FaMagnifyingGlass, FaFlask, FaBasketball
} from 'react-icons/fa6';

type NavItem={label:string;href:string;icon:any};

const nav:NavItem[]=[
  {label:'Home',href:'/',icon:FaHouse},{label:'The Lab',href:'/lab',icon:FaFlask},
  {label:'Players',href:'/players',icon:FaUser},{label:'Teams',href:'/teams',icon:FaUsers},
  {label:'Schedule',href:'/games',icon:FaCalendarDays},{label:'Games',href:'/games',icon:FaBasketball},
  {label:'Standings',href:'/standings',icon:FaFolderOpen},{label:'Stats',href:'/stats',icon:FaChartSimple},
  {label:'Draft Night',href:'/draft',icon:FaCrown},{label:'Social',href:'/social',icon:FaPeopleGroup},
  {label:'News',href:'/news',icon:FaNewspaper},{label:'Media',href:'/media',icon:FaPlay},
  {label:'Community',href:'/communities',icon:FaPeopleGroup},{label:'Rankings',href:'/rankings',icon:FaListOl},
  {label:'Fantasy',href:'/fantasy',icon:FaTrophy},{label:'Leaderboards',href:'/leaderboards',icon:FaListOl},
  {label:'Game IQ',href:'/game-iq',icon:FaChartSimple},{label:'Messages',href:'/messages',icon:FaComments},
  {label:'Friends',href:'/friends',icon:FaUsers},{label:'Coaches',href:'/coaches',icon:FaUserTie},
  {label:'Awards',href:'/badges',icon:FaTrophy},{label:'Shop',href:'/shop',icon:FaShirt},
  {label:'Notifications',href:'/notifications',icon:FaBell}
];

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

  if(pathname==='/')return null;

  const isAdmin=profile?.role==='admin'||profile?.role==='staff';
  const links=isAdmin?[...nav,{label:'Admin',href:'/admin',icon:FaGear}]:nav;
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
