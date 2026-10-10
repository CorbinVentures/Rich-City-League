'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaBars, FaBell, FaGear, FaMagnifyingGlass, FaUser } from 'react-icons/fa6';
import { NavigationDrawer } from '@/components/NavigationDrawer';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { MessageQuickMenu } from '@/components/messaging/MessageQuickMenu';
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
  const router=useRouter();
  const {user,profile,signOut}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const [unreadCount,setUnreadCount]=useState(0);
  const [messageUnread,setMessageUnread]=useState(0);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    if(!user||!supabase){setUnreadCount(0);setMessageUnread(0);return;}
    const db=supabase as any;
    const loadNotifications=async()=>{
      const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);
      if(count!==null)setUnreadCount(count);
    };
    const loadMessages=async()=>{
      const result=await db.rpc('get_message_inbox');
      if(!result.error){
        const rows=(result.data??[]) as Array<{unread_count:number|string|null;archived_at:string|null}>;
        setMessageUnread(rows.filter(row=>!row.archived_at).reduce((sum,row)=>sum+Number(row.unread_count??0),0));
      }
    };
    void Promise.all([loadNotifications(),loadMessages()]);
    const refreshNotifications=()=>void loadNotifications();
    window.addEventListener('rcl:notification-state-changed',refreshNotifications);
    const channel=supabase.channel('rcl_header_activity')
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>void loadNotifications())
      .on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>void loadMessages())
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'conversation_members',filter:`profile_id=eq.${user.id}`},()=>void loadMessages())
      .on('postgres_changes',{event:'*',schema:'public',table:'conversation_preferences',filter:`profile_id=eq.${user.id}`},()=>void loadMessages())
      .subscribe();
    return()=>{
      window.removeEventListener('rcl:notification-state-changed',refreshNotifications);
      void supabase.removeChannel(channel);
    };
  },[user,supabase]);

  useEffect(()=>setMenuOpen(false),[pathname]);

  useEffect(()=>{
    const openSearch=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        router.push('/search');
      }
    };
    window.addEventListener('keydown',openSearch);
    return()=>window.removeEventListener('keydown',openSearch);
  },[router]);

  const isAdmin=profile?.role==='admin'||profile?.role==='staff';
  const memberMode=Boolean(user);
  const groups=memberMode?RCL_MEMBER_NAV_GROUPS:RCL_NAV_GROUPS;
  const drawerGroups=isAdmin?[...groups,RCL_ADMIN_NAV_GROUP]:groups;
  const primaryItems=memberMode?RCL_MEMBER_DESKTOP_NAV:RCL_PRIMARY_NAV_ITEMS;
  const bottomItems=memberMode?RCL_MEMBER_PRIMARY_NAV:RCL_PRIMARY_NAV_ITEMS;
  const active=(href:string)=>memberMode?isMemberNavigationActive(pathname,href):isPrimaryNavigationActive(pathname,href);
  const resolveMemberHref=(href:string)=>href==='/social/profile/me'&&user?`/social/profile/${user.id}`:href;
  const profileHref=user?`/social/profile/${user.id}`:'/auth/sign-up';
  const displayName=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'RCH Member';

  return <>
    <aside className="rcl-universal-sidebar rcl-social-world-sidebar">
      <Link href={memberMode?'/social':'/'} className="rcl-universal-brand" aria-label="RCH home">
        <span className="rcl-universal-mark">R</span>
        <span><b>RCH</b><small>Basketball Social</small></span>
      </Link>

      <nav className="rcl-universal-nav" aria-label="Primary navigation">
        {primaryItems.map(item=>{
          const Icon=item.icon;
          const selected=active(item.href);
          const destination=resolveMemberHref(item.href);
          const create=item.href==='/create';
          return <Link key={item.href} href={destination} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${create?'rcl-primary-create':''}`}>
            <Icon/><span>{item.label}</span>
          </Link>;
        })}
      </nav>

      <button type="button" className="rcl-universal-more" onClick={()=>setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}>
        <FaBars/><span>More</span>
      </button>

      <div className="rcl-universal-account">
        <Link href={profileHref} className="rcl-universal-profile">
          <span className="rcl-universal-avatar">{user?<ProfileAvatarMedia src={profile?.avatar_url} alt={displayName} className="h-full w-full object-cover" />:'R'}</span>
          <span><b>{user?displayName:'Join RCH'}</b><small>{user?'View basketball identity':'Create a free profile'}</small></span>
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
      <Link href="/social" className="rcl-universal-wordmark" aria-label="Open RCH social home">
        <span>RCH</span><b>RCH <i>Social</i></b>
      </Link>

      <Link href="/search" className="rcl-global-search" aria-label="Search RCH">
        <FaMagnifyingGlass/>
        <span>Search players, teams, runs…</span>
        <kbd>⌘K</kbd>
      </Link>

      <div className="rcl-universal-tools">
        {user&&<MessageQuickMenu userId={user.id} unreadCount={messageUnread}/>} 
        {user&&<Link href="/notifications" aria-label="Notifications" className="rcl-notification-button"><FaBell/>{unreadCount>0&&<em>{unreadCount>9?'9+':unreadCount}</em>}</Link>}
        {!user&&<Link href="/auth/sign-in?redirect=/social" className="rcl-topbar-signin">Sign in</Link>}
        <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL navigation" aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/></button>
      </div>
    </header>

    <nav className="rcl-universal-bottom rcl-social-world-bottom" aria-label="RCL mobile navigation">
      {bottomItems.map(item=>{
        const Icon=item.icon;
        const selected=active(item.href);
        const destination=resolveMemberHref(item.href);
        const create=item.href==='/create';
        return <Link key={item.href} href={destination} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${create?'rcl-mobile-create':''}`}>
          <Icon/><span>{item.label}</span>
        </Link>;
      })}
    </nav>

    <NavigationDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} groups={drawerGroups} pathname={pathname}/>
  </>;
}
