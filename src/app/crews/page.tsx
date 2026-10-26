'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaCheck, FaCrown, FaImage, FaPeopleGroup, FaShareNodes, FaTrophy, FaUserPlus } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { CrewPowerBoard } from '@/components/crews/CrewPowerBoard';
import { CourtDominion } from '@/components/runs/CourtDominion';
import { CrewLogoStudio } from '@/components/crews/CrewLogoStudio';
import { CrewCreatorFlow } from '@/components/crews/CrewCreatorFlow';
import { saveCrewLogo } from '@/lib/crew-logo-storage';
import { getSupabaseClient } from '@/lib/supabase';
import '../rch-identity.css';

type Crew = { id:string; name:string; motto:string; city:string; captain_id:string; logo_path:string|null; home_court_slug:string; season_id:string };
type CrewMember = { crew_id:string; profile_id:string; role:string; joined_at:string };
type Person = { id:string; username:string|null; display_name:string|null; avatar_url:string|null };
type Invite = { id:string; crew_id:string; inviter_id:string; status:string };
type Run = { id:string; title:string; starts_at:string; game_format:string; location:string };
type Favorite = {member_id:string;position:number};
const bucket='rch-crew-logos';
const formatDate=(date:string)=>new Date(date).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

function CrewsView(){
  const {user,loading:authLoading}=useAuth();
  const params=useSearchParams();
  const selectedId=params.get('crew');
  const db=useMemo(()=>getSupabaseClient(true) as any,[]);
  const [crews,setCrews]=useState<Crew[]>([]);
  const [members,setMembers]=useState<CrewMember[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [runs,setRuns]=useState<Run[]>([]);
  const [entries,setEntries]=useState<{crew_id:string;run_id:string}[]>([]);
  const [lookup,setLookup]=useState('');
  const [match,setMatch]=useState<Person|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [logoEditorOpen,setLogoEditorOpen]=useState(false);
  const [creating,setCreating]=useState(()=>params.get('create')==='1');
  const [crewFilter,setCrewFilter]=useState('');
  const [logoDraft,setLogoDraft]=useState<File|null>(null);
  const [reloadKey,setReloadKey]=useState(0);
  const refresh=()=>setReloadKey(n=>n+1);

  const load=useCallback(async()=>{
    if(!db)return;
    const [crewResult,memberResult,inviteResult,runResult,entryResult,selectedCrewResult,selectedRosterResult,ownMemberResult]=await Promise.all([
      db.from('commonwealth_crews').select('id,name,motto,city,captain_id,logo_path,home_court_slug,season_id').order('created_at',{ascending:false}).limit(250),
      db.from('commonwealth_crew_members').select('crew_id,profile_id,role,joined_at').limit(3000),
      user?db.from('commonwealth_crew_invitations').select('id,crew_id,inviter_id,status').eq('invitee_id',user.id).eq('status','pending'):Promise.resolve({data:[]}),
      db.from('runs').select('id,title,starts_at,game_format,location').eq('run_type','competitive').eq('status','open').gte('starts_at',new Date().toISOString()).order('starts_at').limit(50),
      db.from('commonwealth_run_entries').select('crew_id,run_id').limit(400),
      selectedId?db.from('commonwealth_crews').select('id,name,motto,city,captain_id,logo_path,home_court_slug,season_id').eq('id',selectedId).maybeSingle():Promise.resolve({data:null}),
      selectedId?db.from('commonwealth_crew_members').select('crew_id,profile_id,role,joined_at').eq('crew_id',selectedId).limit(12):Promise.resolve({data:[]}),
      user?db.from('commonwealth_crew_members').select('crew_id,profile_id,role,joined_at').eq('profile_id',user.id).order('joined_at',{ascending:false}).limit(1):Promise.resolve({data:[]}),
    ]);
    if(crewResult.error){setError('Crew data is not available. Please try again.');return;}
    const current=(crewResult.data||[]) as Crew[];
    const requested=selectedCrewResult.data as Crew|null;
    if(requested&&!current.some(c=>c.id===requested.id))current.unshift(requested);
    const roster=[...new Map([
      ...(memberResult.data||[]) as CrewMember[],
      ...(selectedRosterResult.data||[]) as CrewMember[],
      ...(ownMemberResult.data||[]) as CrewMember[],
    ].map(member=>[member.crew_id+':'+member.profile_id,member])).values()];
    setCrews(current);
    setMembers(roster);
    setInvites((inviteResult.data||[]) as Invite[]);
    setRuns((runResult.data||[]) as Run[]);
    setEntries((entryResult.data||[]) as {crew_id:string;run_id:string}[]);
    const profileIds=[...new Set(roster.map(m=>m.profile_id))];
    if(profileIds.length){
      const {data}=await db.from('profiles').select('id,username,display_name,avatar_url').in('id',profileIds).limit(500);
      setPeople((data||[]) as Person[]);
    }else setPeople([]);
    if(user){
      const {data}=await db.from('commonwealth_crew_favorites').select('member_id,position').eq('owner_id',user.id).order('position');
      setFavorites(((data||[]) as Favorite[]).map(f=>f.member_id));
    }else setFavorites([]);
  },[db,user?.id,selectedId]);

  useEffect(()=>{void load();},[load,reloadKey]);
  const myMembership=members.find(m=>m.profile_id===user?.id);
  const myCrew=crews.find(c=>c.id===myMembership?.crew_id)||crews.find(c=>c.captain_id===user?.id);
  const selected=crews.find(c=>c.id===selectedId)||myCrew;
  const displayedCrews=crews.filter(c=>!crewFilter.trim()||(c.name+' '+c.city).toLowerCase().includes(crewFilter.trim().toLowerCase()));
  const selectedMembers=members.filter(m=>m.crew_id===selected?.id);
  const captain=Boolean(user&&myCrew?.captain_id===user.id);
  const mine=Boolean(myCrew&&selected?.id===myCrew.id);
  const identity=(id:string)=>people.find(p=>p.id===id);
  const logo=(crew:Crew)=>crew.logo_path?db?.storage?.from(bucket).getPublicUrl(crew.logo_path).data.publicUrl:null;

  const execute=async(action:string,args:Record<string,unknown>,success:string)=>{
    if(!db)return;
    setBusy(action);setNotice('');setError('');
    try{
      const result=await db.rpc(action,args);
      if(result.error)throw result.error;
      setNotice(success);refresh();
    }catch(err){setError(err instanceof Error?err.message:'Could not complete the request.');}
    finally{setBusy('');}
  };
  const share=async(crew:Crew)=>{
    const url=window.location.origin+'/crews?crew='+encodeURIComponent(crew.id);
    try{
      if(navigator.share)await navigator.share({title:crew.name+' · RCH Crews',text:'Join our basketball crew on Rich City Hoops. Run with us and compete for the Commonwealth Cup.',url});
      else{await navigator.clipboard.writeText(url);setNotice('Crew invitation link copied.');}
    }catch{/* Share sheet dismissed. */}
  };
  const upload=async()=>{
    if(!logoDraft||!myCrew||!db||!captain)return;
    setBusy('logo');setError('');
    try{
      await saveCrewLogo(db,myCrew.id,logoDraft);
      setNotice('Your new crew logo is live across RCH.');
      setLogoDraft(null);setLogoEditorOpen(false);refresh();
    }catch(err){setError(err instanceof Error?err.message:'Could not save your crew logo.');}
    finally{setBusy('');}
  };
  const search=async()=>{
    const handle=lookup.trim().replace(/^@/,'');
    if(handle.length<2||!db){setMatch(null);return;}
    setBusy('search');setError('');
    const {data,error:lookupError}=await db.from('profiles').select('id,username,display_name,avatar_url')
      .ilike('username',handle).eq('is_active',true).limit(1).maybeSingle();
    if(lookupError)setError(lookupError.message);
    setMatch((data||null) as Person|null);
    if(!data&&!lookupError)setNotice('No matching member. Share the crew link so your friend can create a free RCH account.');
    setBusy('');
  };
  const toggleFavorite=(id:string)=>setFavorites(current=>current.includes(id)?current.filter(value=>value!==id):current.length<5?[...current,id]:current);
  return <main className="rcl-social-secondary rch-identity-surface min-h-screen bg-[#050d19] pb-28 text-white">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-7">
      <nav className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-[#a9cef6]"><Link href="/runs">← Runs</Link><Link href="/commonwealth">Commonwealth Cup →</Link></nav>
      <header className="mt-6 overflow-hidden rounded-xl border border-[#44484e] bg-[radial-gradient(ellipse_at_90%_5%,#54202a,#141618_58%)] p-5 sm:p-8">
        <div className="inline-flex items-center gap-2 text-xs font-black tracking-[.16em] text-[#ff768c]"><FaPeopleGroup/> RCH CREWS</div>
        <h1 className="mt-3 font-display text-4xl font-black uppercase leading-[.95] sm:text-6xl">YOUR SQUAD.<br/><span className="text-[#ff768c]">YOUR LEGACY.</span></h1>
        <p className="mt-3 text-sm text-[#d0d1d4]">Build a crew. Run your court. Earn your name.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {myCrew ? <a href="#rch-crew-hq" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-5 text-sm font-black text-white"><FaPeopleGroup/> My Crew</a> :
           user ? <button type="button" onClick={()=>setCreating(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-5 text-sm font-black text-white"><FaPeopleGroup/> Create Crew</button> :
           <Link href={'/auth/sign-up?redirect='+encodeURIComponent('/crews?create=1')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-5 text-sm font-black text-white">Create Crew</Link>}
          <a href="#rch-crews-directory" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#767b80] px-5 text-sm font-black text-white"><FaBasketball/> Find Crew</a>
          <Link href="/runs" className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#535860] px-5 text-sm font-black text-[#f5f5f3] sm:col-span-1"><FaArrowRight/> Play Runs</Link>
        </div>
      </header>
      {creating && !myCrew && user && <CrewCreatorFlow onClose={()=>setCreating(false)} onCreated={()=>{setCreating(false);refresh();}}/>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-100">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-[#39739c] bg-[#103451] p-4 text-sm text-[#d8f1ff]">{notice}</p>}

      {invites.length>0&&<section className="mt-7 rounded-3xl border border-[#4679a9] bg-[#0c2540] p-6">
        <h2 className="text-xl font-black">Crew invites <span className="text-[#ff768c]">({invites.length})</span></h2>
        <div className="mt-4 space-y-3">{invites.map(invite=><div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#071627] p-4"><span className="text-sm font-bold">{crews.find(c=>c.id===invite.crew_id)?.name||'RCH Crew'} invited you to join</span><div className="flex gap-2"><button disabled={!!busy} className="rounded-lg bg-[#68baff] px-4 py-2 text-xs font-black text-[#051321]" onClick={()=>void execute('commonwealth_respond_invitation',{p_invitation:invite.id,p_accept:true},'Invitation accepted. Captain invitations join immediately; teammate invitations go to the captain for approval.')}>Accept</button><button disabled={!!busy} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold" onClick={()=>void execute('commonwealth_respond_invitation',{p_invitation:invite.id,p_accept:false},'Invitation declined.')}>Decline</button></div></div>)}</div>
      </section>}

      {selected&&<section id="rch-crew-hq" className="rch-identity-crew-stage mt-7 scroll-mt-24" aria-label="Crew headquarters">
        <div className="flex flex-wrap items-center gap-5">
          <div className="rch-identity-crest">{logo(selected)?<img src={logo(selected)||''} alt={selected.name+' logo'} className="h-full w-full object-contain"/>:<FaBasketball className="text-4xl text-[#86c8ff]"/>}</div>
          <div className="min-w-0 flex-1"><p className="text-xs font-black tracking-[.16em] text-[#7cb7e7]">{selected.city.toUpperCase()} · {selected.home_court_slug.replace(/-/g,' ').toUpperCase()}</p><h2 className="mt-1 font-display text-3xl font-black uppercase">{selected.name}</h2><p className="mt-1 text-sm text-[#b3d0e6]">{selected.motto||'Building our legacy on Virginia courts.'}</p><p className="mt-2 text-xs font-bold text-[#88b9e1]">{selectedMembers.length} / 12 members · {mine?'Your crew':'RCH crew'}</p></div>
          <div className="flex flex-wrap gap-2">{!myCrew&&user&&<button disabled={!!busy} onClick={()=>void execute('commonwealth_request_to_join',{p_crew:selected.id},'Roster request sent to the captain.')} className="rounded-xl bg-[#70bdfb] px-4 py-3 text-xs font-black text-[#051321]">Request to join</button>}{!user&&!authLoading&&<Link href={'/auth/sign-up?redirect='+encodeURIComponent('/crews?crew='+selected.id)} className="rounded-xl bg-[#70bdfb] px-4 py-3 text-xs font-black text-[#051321]">Sign up free to join</Link>}<button onClick={()=>void share(selected)} className="inline-flex items-center gap-2 rounded-xl border border-[#497fac] px-4 py-3 text-xs font-black"><FaShareNodes/> Invite friends</button></div>
        </div>
        {captain&&mine&&myCrew&&<div className="mt-5"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#456e95] px-4 py-3 text-xs font-black" onClick={()=>setLogoEditorOpen(v=>!v)}><FaImage/>{logoEditorOpen?'Close logo studio':'Create, upload or AI-generate logo'}</button>
         {logoEditorOpen&&<><CrewLogoStudio crewName={myCrew.name} initialLogoUrl={logo(myCrew)} onChange={setLogoDraft}/>
           <button type="button" disabled={!!busy||!logoDraft} onClick={()=>void upload()} className="mt-3 min-h-11 w-full rounded-xl bg-[#66c5ed] px-4 py-3 text-sm font-black text-[#061725] disabled:opacity-40">{busy==='logo'?'Saving logo…':'Save selected logo to crew'}</button></>}
         </div>}
        <div className="rch-identity-stat-grid relative mt-5">
          <div className="rch-identity-stat"><strong>{selectedMembers.length} / 12</strong><small>Registered members</small></div>
          <div className="rch-identity-stat"><strong>{entries.filter(e=>e.crew_id===selected.id).length}</strong><small>Recorded Run entries</small></div>
          <div className="rch-identity-stat"><strong>{selected.city||'VA'}</strong><small>Home city</small></div>
        </div>
        {selected.home_court_slug&&<Link href={'/runs/courts/'+encodeURIComponent(selected.home_court_slug)} className="rch-identity-secondary relative mt-4">Visit our home court <FaArrowRight/></Link>}
        <h3 className="relative mt-6 text-lg font-black uppercase tracking-wide">Meet the roster</h3>
        <div className="relative mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selectedMembers.map(member=><Link href={'/social/profile/'+member.profile_id} key={member.profile_id} className="rch-identity-member">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#194265]">{identity(member.profile_id)?.avatar_url?<img src={identity(member.profile_id)?.avatar_url||''} alt="" className="h-full w-full object-cover"/>:<FaBasketball/>}</span>
          <span className="min-w-0"><strong className="block truncate text-sm">{identity(member.profile_id)?.display_name||identity(member.profile_id)?.username||'RCH Member'}</strong><small className="text-xs text-[#9bbcd9]">{member.role==='captain'?'Captain':'Teammate'}</small></span>
          {member.role==='captain'&&<FaCrown className="ml-auto text-[#f7bf69]"/>}
        </Link>)}</div>
      </section>}

      {mine&&myCrew&&<div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#264e73] bg-[#0a1b30] p-6">
          <div className="flex items-center gap-2 text-[#7fc2ff]"><FaCrown/><h2 className="font-display text-2xl font-black uppercase">My top five</h2></div>
          <p className="mt-2 text-sm text-[#d0d1d4]">Pick five teammates to feature on your profile.</p>
          <div className="mt-5 space-y-2">{members.filter(m=>m.crew_id===myCrew.id&&m.profile_id!==user?.id).map(member=><button key={member.profile_id} onClick={()=>toggleFavorite(member.profile_id)} className="flex w-full items-center justify-between rounded-xl border border-[#335b82] bg-[#0d2b47] px-4 py-3 text-left text-sm font-semibold"><span>{favorites.includes(member.profile_id)?(favorites.indexOf(member.profile_id)+1)+'. ':''}{identity(member.profile_id)?.display_name||identity(member.profile_id)?.username||'Teammate'}</span><span className="text-xs text-[#92c9f1]">{favorites.includes(member.profile_id)?'Remove':favorites.length>=5?'Five selected':'Feature'}</span></button>)}</div>
          <button disabled={!!busy} onClick={()=>void execute('commonwealth_set_crew_favorites',{p_members:favorites},'Your top five is updated on your profile.')} className="mt-5 rounded-xl bg-[#69baff] px-5 py-3 text-sm font-black text-[#071524]"><FaCheck className="mr-2 inline"/> Save top five</button>
        </section>

        <section className="rounded-3xl border border-[#264e73] bg-[#0a1b30] p-6">
          <div className="flex items-center gap-2 text-[#7fc2ff]"><FaUserPlus/><h2 className="font-display text-2xl font-black uppercase">Recruit your people</h2></div>
          <p className="mt-2 text-sm text-[#d0d1d4]">Find a player or send your invite link.</p>
          <div className="mt-5 flex gap-2"><input aria-label="Teammate username" value={lookup} onChange={e=>{setLookup(e.target.value);setMatch(null);}} placeholder="@username" className="min-w-0 flex-1 rounded-xl border border-[#3b6996] bg-[#091725] p-3 text-sm text-white placeholder:text-[#9bbbd4]"/><button onClick={()=>void search()} disabled={!!busy||lookup.trim().length<2} className="rounded-xl bg-[#285e8a] px-4 text-xs font-black">Find</button></div>
          {match&&<div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#113653] p-3 text-sm"><span>{match.display_name||match.username} @{match.username}</span><button disabled={!!busy||match.id===user?.id} className="rounded-lg bg-[#68baff] px-3 py-2 text-xs font-black text-[#061526]" onClick={()=>void execute('commonwealth_invite_player',{p_crew:myCrew.id,p_player:match.id},'Invite sent. They can accept in Crews HQ.')}>Send invite</button></div>}
          <button onClick={()=>void share(myCrew)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#436e95] px-4 py-3 text-xs font-black"><FaShareNodes/> Share crew invite link</button>
          
        </section>
      </div>}

      {captain&&myCrew&&<section className="mt-7 rounded-3xl border border-[#275d83] bg-[#0a223a] p-6">
        <div className="flex items-center gap-2 text-[#8bc4ff]"><FaTrophy/><h2 className="font-display text-2xl font-black uppercase">Register your crew for Runs</h2></div>
        <p className="mt-2 text-sm text-[#d0d1d4]">Choose a run. Players RSVP individually.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{runs.map(run=><div key={run.id} className="rounded-xl border border-[#2e5b7e] bg-[#0a1a2d] p-4"><p className="text-xs text-[#91c5ea]">{formatDate(run.starts_at)} · {run.game_format}</p><h3 className="mt-2 font-black">{run.title}</h3><p className="mt-1 text-xs text-[#a9bfd1]">{run.location}</p><div className="mt-3 flex flex-wrap gap-2"><Link className="rounded-lg border border-[#46759b] px-3 py-2 text-xs font-bold" href={'/runs/'+run.id}>View run</Link><button disabled={!!busy||entries.some(e=>e.crew_id===myCrew.id&&e.run_id===run.id)} onClick={()=>void execute('commonwealth_register_crew_run',{p_crew:myCrew.id,p_run:run.id},'Crew entry submitted. Share the Run Room so every teammate can RSVP.')} className="rounded-lg bg-[#67bbff] px-3 py-2 text-xs font-black text-[#071725] disabled:opacity-45">{entries.some(e=>e.crew_id===myCrew.id&&e.run_id===run.id)?'Crew registered':'Register crew'}</button></div></div>)}</div>
        {!runs.length&&<p className="mt-4 text-sm text-[#9dc6e8]">No upcoming competitive Runs are open yet. <Link className="underline" href="/runs">Host the first one</Link>.</p>}
      </section>}

      <section id="rch-crews-directory" className="mt-8 scroll-mt-24"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black uppercase">Crews around Virginia</h2><Link href="/commonwealth" className="text-xs font-black text-[#8cc6ff]">Cup rankings →</Link></div>
        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-[#6c7075] bg-[#202326] px-4 text-white"><FaBasketball className="text-[#ff768c]"/><input aria-label="Search crews by name or city" value={crewFilter} onChange={e=>setCrewFilter(e.target.value)} placeholder="Search crews or cities" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[#b4b6bc] focus:outline-none"/></label><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{displayedCrews.map(crew=><Link key={crew.id} href={'/crews?crew='+crew.id} className="flex items-center gap-3 rounded-xl border border-[#484d52] bg-[#202326] p-4 hover:border-[#ff768c]"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#173a5d]">{logo(crew)?<img alt={crew.name+' logo'} src={logo(crew)||''} className="h-full w-full object-contain"/>:<FaBasketball/>}</span><span className="min-w-0"><strong className="block truncate text-sm">{crew.name}</strong><small className="text-xs text-[#a8cae1]">{crew.city} · {members.filter(m=>m.crew_id===crew.id).length} members</small></span><FaArrowRight className="ml-auto text-[#7fbbe7]"/></Link>)}</div>
        {!displayedCrews.length&&!authLoading&&<p className="mt-6 text-sm text-[#d0d1d4]">{crewFilter ? "No crews match your search." : "No crews yet. Be the first."}</p>}
      </section>
      <details id="rch-crew-rankings" className="mt-7 scroll-mt-24 rounded-xl border border-[#44484e] bg-[#141618] p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-black"><FaTrophy className="text-[#ff768c]"/> Crew Power Rankings <FaArrowRight className="ml-auto"/></summary>
        <CrewPowerBoard/>
      </details>
      <details id="rch-crew-courts" className="mt-3 scroll-mt-24 rounded-xl border border-[#44484e] bg-[#141618] p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-black"><FaCrown className="text-[#ff768c]"/> Territory Battles <FaArrowRight className="ml-auto"/></summary>
        <CourtDominion showTakeovers/>
      </details>

    </div>
  </main>;
}


/**
 * My Crew is a contextual destination, not the public directory.
 * Resolve membership from the signed-in member's own row, without relying on
 * the first 250 crews / first 3000 members shown on the public directory.
 */
function MyCrewGateway(){
  const {user,loading:authLoading}=useAuth();
  const router=useRouter();
  const db=useMemo(()=>getSupabaseClient(true) as any,[]);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    if(authLoading)return;
    if(!user){
      router.replace('/auth/sign-in?redirect='+encodeURIComponent('/crews?intent=mine'));
      return;
    }
    if(!db){setError('Crew services are currently unavailable. Please try again.');return;}
    let active=true;
    const resolve=async()=>{
      setError('');
      try{
        const membership=await db.from('commonwealth_crew_members')
          .select('crew_id').eq('profile_id',user.id)
          .order('joined_at',{ascending:false}).limit(1);
        if(membership.error)throw membership.error;
        let crewId:string|null=membership.data?.[0]?.crew_id||null;
        if(!crewId){
          // An older captain account may be missing its membership row.
          const captain=await db.from('commonwealth_crews')
            .select('id').eq('captain_id',user.id)
            .order('created_at',{ascending:false}).limit(1);
          if(captain.error)throw captain.error;
          crewId=captain.data?.[0]?.id||null;
        }
        if(!active)return;
        router.replace(crewId
          ? '/crews?crew='+encodeURIComponent(crewId)+'#rch-crew-hq'
          : '/crews?create=1#rch-crew-create');
      }catch{
        if(active)setError('We could not check your crew membership. Your account has not been changed.');
      }
    };
    void resolve();
    return()=>{active=false;};
  },[user?.id,authLoading,db,router,attempt]);

  return <main className="min-h-[70vh] bg-[#061322] px-5 py-16 text-[#e8f5ff]">
    <div className="mx-auto max-w-md rounded-2xl border border-[#3d7196] bg-[#0d2942] p-7 text-center">
      <FaPeopleGroup className="mx-auto mb-4 text-4xl text-[#7ecaff]" aria-hidden="true"/>
      <h1 className="text-2xl font-black">Opening My Crew</h1>
      {error?<><p role="alert" className="mt-3 text-sm leading-6 text-[#ffd6c7]">{error}</p>
        <button type="button" onClick={()=>setAttempt(a=>a+1)} className="mt-5 min-h-11 rounded-xl bg-[#5eacdf] px-5 font-bold text-[#06192a]">Try again</button></>
      :<p role="status" className="mt-3 text-sm leading-6 text-[#bad9ec]">Taking you to your Crew HQ or crew creator…</p>}
    </div>
  </main>;
}

function CrewsRoute(){
  const params=useSearchParams();
  return params.get('intent')==='mine'?<MyCrewGateway/>:<CrewsView/>;
}

export default function CrewsPage(){
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#061322] text-[#b9daee]">Loading Crews…</main>}><CrewsRoute/></Suspense>;
}
