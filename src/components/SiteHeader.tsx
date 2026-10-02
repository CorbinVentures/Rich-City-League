'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaBars, FaBell, FaComments, FaGear, FaMagnifyingGlass, FaUser } from 'react-icons/fa6';
import { NavigationDrawer } from '@/components/NavigationDrawer';
import {
  isPrimaryNavigationActive,
  RCL_ADMIN_NAV_GROUP,
  RCL_NAV_GROUPS,
  RCL_PRIMARY_NAV_ITEMS,
} from '@/lib/rcl-navigation';
import {
  isMemberNavigationActive,
  RCL_MEMBER_DESKTOP_NAV,
  RCL_MEMBER_NAV_GROUPS,
  RCL_MEMBER_PRIMARY_NAV,
} from '@/lib/member-navigation';

export function SiteHeader(){
  const pathname=usePathname();
  const {user,profile,signOut}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const [unreadCount,setUnreadCount]=useState(0);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    if(!user||!supabase){setUnreadCount(0);return;}
    const load=async()=>{
      const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);
      if(count!==null)setUnreadCount(count);
    };
    void load();
    const channel=supabase.channel('rcl_header_notifications')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>setUnreadCount(value=>value+1))
      .subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[user,supabase]);

  useEffect(()=>setMenuOpen(false),[pathname]);

  const isAdmin=profile?.role==='admin'||profile?.role==='staff';
  const memberMode=Boolean(user);
  const groups=memberMode?RCL_MEMBER_NAV_GROUPS:RCL_NAV_GROUPS;
  const drawerGroups=isAdmin?[...groups,RCL_ADMIN_NAV_GROUP]:groups;
  const primaryItems=memberMode?RCL_MEMBER_DESKTOP_NAV:RCL_PRIMARY_NAV_ITEMS;
  const bottomItems=memberMode?RCL_MEMBER_PRIMARY_NAV:RCL_PRIMARY_NAV_ITEMS;
  const active=(href:string)=>memberMode?isMemberNavigationActive(pathname,href):isPrimaryNavigationActive(pathname,href);
  const profileHref=user?'/social/profile/me':'/auth/sign-in?redirect=/social';
  const displayName=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'RCL Member';
  const initial=(displayName||user?.email||'R').trim().slice(0,1).toUpperCase();

  return <>
    <aside className="rcl-universal-sidebar rcl-social-world-sidebar">
      <Link href={memberMode?'/social':'/'} className="rcl-universal-brand" aria-label="RCL home">
        <span className="rcl-universal-mark">R</span>
        <span><b>RCL</b><small>Basketball Social</small></span>
      </Link>

      <nav className="rcl-universal-nav" aria-label="Primary navigation">
        {primaryItems.map(item=>{
          const Icon=item.icon;
          const selected=active(item.href);
          const create=item.href==='/create';
          return <Link key={item.href} href={item.href} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${create?'rcl-primary-create':''}`}>
            <Icon/><span>{item.label}</span>
          </Link>;
        })}
      </nav>

      <button type="button" className="rcl-universal-more" onClick={()=>setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}>
        <FaBars/><span>More</span>
      </button>

      <div className="rcl-universal-account">
        <Link href={profileHref} className="rcl-universal-profile">
          <span className="rcl-universal-avatar">{user?initial:'R'}</span>
          <span><b>{user?displayName:'Join RCL'}</b><small>{user?'View basketball identity':'Create a free profile'}</small></span>
          <strong>›</strong>
        </Link>
        {user?<>
          <Link href="/settings" className="rcl-universal-account-link"><FaGear/> Settings</Link>
          <button onClick={()=>void signOut()} className="rcl-universal-account-link"><span>↪</span> Log Out</button>
        </>:<Link href="/auth/sign-in?redirect=/social" className="rcl-universal-account-link"><FaUser/> Sign In</Link>}
      </div>

      <div className="rcl-social-brand-note">
        <b>RICHMOND BASKETBALL</b>
        <span>People · Runs · Culture</span>
        <small>Rich City League is the flagship competition.</small>
      </div>
    </aside>

    <header className="rcl-universal-topbar rcl-social-world-topbar">
      <Link href="/social" className="rcl-universal-wordmark" aria-label="Open RCL social home">
        <span>R</span><b>RCL <i>Social</i></b>
      </Link>

      <Link href="/search" className="rcl-global-search" aria-label="Search RCL">
        <FaMagnifyingGlass/><span>Search basketball</span>
      </Link>

      <div className="rcl-universal-tools">
        {user&&<Link href="/messages" aria-label="Messages"><FaComments/></Link>}
        {user&&<Link href="/notifications" aria-label="Notifications" className="rcl-notification-button"><FaBell/>{unreadCount>0&&<em>{unreadCount>9?'9+':unreadCount}</em>}</Link>}
        {!user&&<Link href="/auth/sign-in?redirect=/social" className="rcl-topbar-signin">Sign in</Link>}
        <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL navigation" aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/></button>
      </div>
    </header>

    <nav className="rcl-universal-bottom rcl-social-world-bottom" aria-label="RCL mobile navigation">
      {bottomItems.map(item=>{
        const Icon=item.icon;
        const selected=active(item.href);
        const create=item.href==='/create';
        return <Link key={item.href} href={item.href} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${create?'rcl-mobile-create':''}`}>
          <Icon/><span>{item.label}</span>
        </Link>;
      })}
    </nav>

    <NavigationDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} groups={drawerGroups} pathname={pathname}/>
  </>;
}
