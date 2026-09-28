'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaBars,
  FaBasketball,
  FaBell,
  FaComments,
  FaGear,
  FaHouse,
  FaMagnifyingGlass,
  FaPeopleGroup,
  FaUser,
} from 'react-icons/fa6';
import { NavigationDrawer } from '@/components/NavigationDrawer';
import {
  isPrimaryNavigationActive,
  RCL_ADMIN_NAV_GROUP,
  RCL_ADMIN_NAV_ITEM,
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
    const load=async()=>{const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);if(count!==null)setUnreadCount(count);};
    void load();
    const channel=supabase.channel('rcl_header_notifications').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>setUnreadCount(v=>v+1)).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[user,supabase]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // The public homepage owns its own SEO-forward shell. Social owns its immersive feed shell.
  if(pathname==='/'||pathname==='/social'||pathname.startsWith('/social/'))return null;

  const isAdmin=profile?.role==='admin'||profile?.role==='staff';
  const memberMode=Boolean(user);
  const memberGroups=isAdmin?[...RCL_MEMBER_NAV_GROUPS,RCL_ADMIN_NAV_GROUP]:RCL_MEMBER_NAV_GROUPS;
  const publicGroups=isAdmin?[...RCL_NAV_GROUPS,RCL_ADMIN_NAV_GROUP]:RCL_NAV_GROUPS;
  const drawerGroups=memberMode?memberGroups:publicGroups;
  const active=(href:string)=>memberMode?isMemberNavigationActive(pathname,href):isPrimaryNavigationActive(pathname,href);

  const socialChildPaths=['/friends','/messages','/notifications','/communities','/runs'];
  const isSocialChild=socialChildPaths.some(path=>pathname===path||pathname.startsWith(path+'/'));

  if(isSocialChild)return <>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05080d]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:h-20 sm:px-4">
        <Link href="/social" aria-label="RCL Network home" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rcl-blue/35 bg-rcl-blue/10 font-black text-rcl-blue sm:h-11 sm:w-11">RCL</Link>
        <Link href="/social" className="hidden text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange sm:block">RCL Network</Link>
        <Link href="/search" className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-[#07111b] px-4 text-white/40 sm:h-11"><FaMagnifyingGlass/><span className="truncate text-sm">Search people, teams, communities, games…</span></Link>
        {user&&<Link href="/messages" aria-label="Messages" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 sm:h-11 sm:w-11"><FaComments/></Link>}
        <Link href="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 sm:h-11 sm:w-11"><FaBell/>{unreadCount>0&&<em className="absolute right-1 top-1 rounded-full bg-rcl-orange px-1 text-xs not-italic text-black">{unreadCount>9?'9+':unreadCount}</em>}</Link>
        <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL Network menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 sm:h-11 sm:w-11"><FaBars/></button>
      </div>
    </header>
    {user?<MemberBottomNavigation pathname={pathname}/>:<nav aria-label="Social navigation" className="rcl-social-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080b10]/95 px-4 py-2 backdrop-blur-xl"><div className="mx-auto grid max-w-3xl grid-cols-4 gap-2"><Link href="/social" className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black uppercase text-white/50"><span>⚡</span>Feed</Link><Link href="/friends" className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black uppercase ${pathname.startsWith('/friends')?'bg-rcl-orange text-black':'border border-white/10 text-white/50'}`}><span>◉</span>Discover</Link><Link href="/runs" className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black uppercase ${pathname.startsWith('/runs')?'bg-rcl-orange text-black':'border border-white/10 text-white/50'}`}><FaBasketball/>Runs</Link><Link href="/social/highlights" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-3 text-xs font-black uppercase text-white/50"><span>▶</span>Highlights</Link></div></nav>}
    <NavigationDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} groups={drawerGroups} pathname={pathname} />
  </>;

  if(user){
    return <>
      <aside className="rcl-universal-sidebar rcl-member-sidebar">
        <Link href="/social" className="rcl-universal-brand">
          <span className="rcl-universal-mark">RCL</span>
          <span><b>RCL <i>NETWORK</i></b><small>RICHMOND BASKETBALL</small></span>
        </Link>
        <nav className="rcl-universal-nav" aria-label="RCL Network navigation">
          {RCL_MEMBER_DESKTOP_NAV.map(item=>{const Icon=item.icon;const selected=active(item.href);return <Link key={item.href+item.label} href={item.href} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${item.action==='create'?'rcl-member-create-link':''}`}><Icon/><span>{item.label}</span></Link>})}
        </nav>
        <button type="button" className="rcl-universal-more" onClick={()=>setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/><span>More</span></button>
        <div className="rcl-universal-account">
          <Link href="/profile" className="rcl-universal-profile"><span className="rcl-universal-avatar">{profile?.display_name?.[0]??user.email?.[0]??'P'}</span><span><b>{profile?.display_name??'RCL MEMBER'}</b><small>View basketball identity</small></span><strong>›</strong></Link>
          <Link href="/settings" className="rcl-universal-account-link"><FaGear/> Settings</Link>
          <button onClick={()=>void signOut()} className="rcl-universal-account-link"><span>↪</span> Log Out</button>
        </div>
        <div className="rcl-universal-motto rcl-member-motto"><b>YOUR CITY.</b><span>YOUR COURT.</span><b>YOUR REP.</b><small>RCL NETWORK<br/>804 · RVA</small></div>
      </aside>

      <header className="rcl-universal-topbar rcl-member-topbar">
        <Link href="/social" className="rcl-universal-wordmark"><span>R</span><b>RCL <i>NETWORK</i></b></Link>
        <Link href="/search" className="rcl-member-search-link"><FaMagnifyingGlass/><span>Search RCL</span></Link>
        <div className="rcl-universal-tools">
          <Link href="/messages" aria-label="Messages"><FaComments/></Link>
          <Link href="/notifications" aria-label="Notifications" className="rcl-notification-button"><FaBell/>{unreadCount>0&&<em>{unreadCount>9?'9+':unreadCount}</em>}</Link>
          <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL Network navigation" aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/></button>
        </div>
      </header>

      <MemberBottomNavigation pathname={pathname}/>
      <NavigationDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} groups={drawerGroups} pathname={pathname} />
    </>;
  }

  const primaryLinks=isAdmin?[...RCL_PRIMARY_NAV_ITEMS,RCL_ADMIN_NAV_ITEM]:RCL_PRIMARY_NAV_ITEMS;

  return <>
    <aside className="rcl-universal-sidebar">
      <Link href="/" className="rcl-universal-brand">
        <span className="rcl-universal-mark">RCL</span>
        <span><b>RICH CITY <i>LEAGUE</i></b><small>804 · RVA</small></span>
      </Link>
      <nav className="rcl-universal-nav" aria-label="Primary navigation">
        {primaryLinks.map(item=>{const Icon=item.icon;return <Link key={item.href+item.label} href={item.href} aria-current={active(item.href)?'page':undefined} className={active(item.href)?'active':''}><Icon/><span>{item.label}</span></Link>})}
      </nav>
      <button type="button" className="rcl-universal-more" onClick={()=>setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/><span>All RCL</span></button>
      <div className="rcl-universal-account">
        <Link href="/auth/sign-in" className="rcl-universal-profile"><span className="rcl-universal-avatar">R</span><span><b>RCL MEMBER</b><small>Sign In</small></span><strong>›</strong></Link>
        <Link href="/settings" className="rcl-universal-account-link"><FaGear/> Settings</Link>
      </div>
      <div className="rcl-universal-motto"><b>PLAY.</b><span>COMPETE.</span><b>CONNECT.</b><span>GROW.</span><small>♛<br/>RICHMOND<br/>VIRGINIA</small></div>
    </aside>

    <header className="rcl-universal-topbar">
      <Link href="/" className="rcl-universal-wordmark"><span>R</span><b>RICH CITY <i>LEAGUE</i></b></Link>
      <div className="rcl-universal-tools">
        <Link href="/search" aria-label="Search"><FaMagnifyingGlass/></Link>
        <Link href="/notifications" aria-label="Notifications" className="rcl-notification-button"><FaBell/>{unreadCount>0&&<em>{unreadCount>9?'9+':unreadCount}</em>}</Link>
        <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open RCL navigation" aria-haspopup="dialog" aria-expanded={menuOpen}><FaBars/></button>
      </div>
    </header>

    <nav className="rcl-universal-bottom" aria-label="Mobile navigation">
      {[{label:'Home',href:'/',icon:FaHouse},{label:'League',href:'/league',icon:FaBasketball},{label:'Players',href:'/players',icon:FaUser},{label:'Social',href:'/social',icon:FaPeopleGroup}].map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined} className={active(item.href)?'active':''}><Icon/><span>{item.label}</span></Link>})}
      <button type="button" onClick={()=>setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} className={menuOpen?'active':''}><FaBars/><span>More</span></button>
    </nav>

    <NavigationDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} groups={drawerGroups} pathname={pathname} />
  </>;
}

function MemberBottomNavigation({pathname}:{pathname:string}){
  return <nav className="rcl-universal-bottom rcl-member-bottom" aria-label="RCL Network mobile navigation">
    {RCL_MEMBER_PRIMARY_NAV.map(item=>{const Icon=item.icon;const selected=isMemberNavigationActive(pathname,item.href);return <Link key={item.label} href={item.href} aria-current={selected?'page':undefined} className={`${selected?'active':''} ${item.action==='create'?'rcl-member-create-tab':''}`}><Icon/><span>{item.label}</span></Link>})}
  </nav>;
}
