'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaChartLine,FaClipboardCheck,FaGear,FaPeopleGroup,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {RunVenuePicker,runVenueLocation,type RunVenue} from '@/components/runs/RunVenuePicker';

type Partner={id:string;slug:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;status:string};
type Member={profile_id:string;role:'manager'|'scorekeeper'};
type Session={run_id:string;experience:'park'|'rec';price_cents:number;run?:{id:string;title:string;starts_at:string;location:string;status:string;game_format:string}};
type Metrics={total_sessions:number;upcoming_sessions:number;total_checkins:number;unique_attendees:number;repeat_attendees:number;verified_matches:number;waiting_players:number};
type SessionForm={title:string;starts:string;location:string;court_slug:string;format:string;experience:'park'|'rec';capacity:number;price:string;description:string};
const empty:SessionForm={title:'',starts:'',location:'',court_slug:'',format:'5v5',experience:'rec',capacity:20,price:'0',description:''};
const initialMetrics:Metrics={total_sessions:0,upcoming_sessions:0,total_checkins:0,unique_attendees:0,repeat_attendees:0,verified_matches:0,waiting_players:0};
const fieldClass='mt-2 min-h-11 w-full rounded-xl border border-[#4b718e] bg-[#071b2d] px-3 py-3 text-sm text-white outline-none focus:border-[#66bcff]';

export default function RunsPartnerHeadquarters(){
 const {slug}=useParams<{slug:string}>();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [partner,setPartner]=useState<Partner|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [role,setRole]=useState('');
 const [metrics,setMetrics]=useState<Metrics>(initialMetrics);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [form,setForm]=useState<SessionForm>(empty);
 const [selectedVenue,setSelectedVenue]=useState<RunVenue|null>(null);
 const [brand,setBrand]=useState({name:'',city:'',description:'',instagram:'',logo:'',color:'#3b82f6'});
 const [staffUser,setStaffUser]=useState('');
 const [staffRole,setStaffRole]=useState<'manager'|'scorekeeper'>('manager');
 const [showForm,setShowForm]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [staffAllowed,setStaffAllowed]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!slug||!user?.id){setLoading(false);return;}
  setLoading(true);
  const {data:row,error:failure}=await db.from('rch_runs_partners')
   .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status')
   .eq('slug',slug).maybeSingle();
  if(failure||!row){setError('Partner HQ not found or not accessible.');setLoading(false);return;}
  const p=row as Partner;
  const own=p.owner_id===user.id;
  const {data:me}=own?{data:null}:await db.from('rch_runs_partner_members').select('role').eq('partner_id',p.id).eq('profile_id',user.id).maybeSingle();
  const currentRole=own?'owner':me?.role||'';
  if(!currentRole){setError('Your account is not authorized to open this partner headquarters.');setLoading(false);return;}
  setRole(currentRole);setPartner(p);setBrand({name:p.name,city:p.city,description:p.description,instagram:p.instagram_url||'',logo:p.logo_url||'',color:p.brand_color});
  const [metricResult,staffResult,linksResult]=await Promise.all([
   db.rpc('rch_partner_hq_metrics',{p_partner:p.id}),
   own?db.from('rch_runs_partner_members').select('profile_id,role').eq('partner_id',p.id):Promise.resolve({data:[]}),
   db.from('rch_runs_partner_sessions').select('run_id,experience,price_cents').eq('partner_id',p.id).limit(200)
  ]);
  if(metricResult.data)setMetrics(metricResult.data as Metrics);
  if(metricResult.error)setError(metricResult.error.message);
  const staff=(staffResult.data??[]) as Member[];setMembers(staff);
  if(staff.length){
   const {data:profiles}=await db.from('profiles').select('id,display_name,username').in('id',staff.map(m=>m.profile_id));
   setNames(Object.fromEntries((profiles??[]).map((q:{id:string;display_name:string|null;username:string|null})=>[q.id,q.display_name||q.username||'RCH member'])));
  }
  const links=(linksResult.data??[]) as Session[];
  if(links.length){
   const {data:runs}=await db.from('runs').select('id,title,starts_at,location,status,game_format').in('id',links.map(s=>s.run_id));
   const byId=new Map(((runs??[]) as NonNullable<Session['run']>[]).map(r=>[r.id,r]));
   setSessions(links.map(s=>({...s,run:byId.get(s.run_id)})).filter(s=>s.run).sort((a,b)=>(b.run?.starts_at||'').localeCompare(a.run?.starts_at||'')));
  }else setSessions([]);
  if(own){const {data:admin}=await db.rpc('is_staff_or_admin');setStaffAllowed(Boolean(admin));}
  setLoading(false);
 },[db,slug,user?.id]);
 useEffect(()=>{void load();},[load,refresh]);

 async function call(fn:string,args:Record<string,unknown>,success:string){
  if(!db||busy)return false;
  setBusy(true);setError('');setNotice('');
  const {data,error:failure}=await db.rpc(fn,args);
  if(failure){setError(failure.message);setBusy(false);return false;}
  setNotice(success);setBusy(false);setRefresh(v=>v+1);
  return data??true;
 }
 async function publish(e:React.FormEvent){
  e.preventDefault();if(!partner||busy)return;
  const starts=new Date(form.starts);
  if(Number.isNaN(starts.getTime())){setError('Choose a valid date and time.');return;}
  const amount=Number(form.price);
  if(!Number.isFinite(amount)||amount<0||amount>500||Math.round(amount*100)!==amount*100){setError('Enter a valid USD fee, from free to $500, with at most two decimals.');return;}
  const result=await call('rch_create_runs_partner_session',{
   p_partner:partner.id,p_title:form.title.trim(),p_location:form.location.trim(),
   p_starts:starts.toISOString(),p_format:form.format,p_experience:form.experience,
   p_capacity:form.capacity,p_price_cents:Math.round(amount*100),
   p_description:form.description.trim(),p_court_slug:form.court_slug||null
  },'The new session is live under your Runs Partner HQ. It is not independently game-verified yet.');
  if(result){setForm(empty);setSelectedVenue(null);setShowForm(false);}
 }
 const canManage=role==='owner'||role==='manager';
 if(!user)return <main className="min-h-screen bg-[#071727] p-8 text-white">Sign in to manage a Runs organization. <Link href={'/auth/sign-in?next='+encodeURIComponent('/runs/partners/'+slug+'/hq')} className="text-[#98ceff]">Sign in →</Link></main>;
 if(loading)return <main className="min-h-screen bg-[#071727] p-8 text-[#bdd6e8]">Opening partner headquarters…</main>;
 if(!partner)return <main className="min-h-screen bg-[#071727] p-8 text-white"><p role="alert">{error||'Access denied.'}</p><Link href="/runs/partners" className="text-[#9bcbf5]">Partner directory</Link></main>;
 return <main className="min-h-screen bg-[#071727] px-4 pb-28 pt-8 text-white sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href={'/runs/partners/'+partner.slug} className="text-xs font-bold text-[#96d0ff]">← Public organization page</Link>
   <header className="mt-5 rounded-3xl border border-[#355f7e] bg-[radial-gradient(circle_at_top_right,#164267,#0a243c_70%)] p-6 sm:p-9">
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8acdfb]"><FaBuildingIcon/> Official Runs Partner HQ</p>
    <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">{partner.name}</h1>
    <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-[#3d8b9b] px-3 py-1 text-xs font-bold text-[#a7edc9]">{partner.status==='approved'?'Approved network organization':partner.status}</span><span className="rounded-full border border-[#527f9f] px-3 py-1 text-xs font-bold">{role.toUpperCase()} ACCESS</span><span className="rounded-full border border-[#527f9f] px-3 py-1 text-xs font-bold">{partner.city}, VA</span></div>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-[#bad0df]">Your operation, your event schedule and your brand. RCH connects your players to statewide Run Passport, Next Up, verified competition, REP and badges.</p>
   </header>
   {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/50 bg-red-900/20 p-4 text-sm text-red-100">{error}</p>}
   {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-4 text-sm text-emerald-100">{notice}</p>}
   <section className="mt-7">
    <div className="flex items-center gap-2"><FaChartLine className="text-[#75c0ff]"/><h2 className="text-xl font-black uppercase">Organization pulse</h2></div>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
     {([['Sessions scheduled',metrics.total_sessions],['Upcoming runs',metrics.upcoming_sessions],['Player check-ins',metrics.total_checkins],['Unique attendees',metrics.unique_attendees],['Repeat attendees',metrics.repeat_attendees],['Verified games',metrics.verified_matches],['Players waiting',metrics.waiting_players]] as [string,number][]).map(([label,value])=><div key={label} className="rounded-2xl border border-[#365c79] bg-[#0c2841] p-4"><span className="block text-3xl font-black tabular-nums">{value}</span><span className="mt-2 block text-xs text-[#aac6db]">{label}</span></div>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#91afc6]">Aggregated from actual RCH session, check-in, queue and verified-match records. A scheduled run is not proof of attendance, and advertised fees are not revenue.</p>
   </section>
   <section className="mt-9 rounded-2xl border border-[#356182] bg-[#0b253d] p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#8ec9f6]"><FaCalendarDays/> THE PARK / THE REC</p><h2 className="mt-2 text-2xl font-black uppercase">Session control room</h2></div>{canManage&&<button onClick={()=>setShowForm(v=>!v)} className="min-h-11 rounded-xl bg-[#348ff5] px-4 text-sm font-black">{showForm?'Close editor':'+ Publish a Run'}</button>}</div>
    {showForm&&canManage&&<form onSubmit={e=>void publish(e)} className="mt-5 grid gap-4 rounded-xl border border-[#4c7698] bg-[#091e33] p-5 sm:grid-cols-2">
     <div className="sm:col-span-2 grid grid-cols-2 gap-2">
      {(['park','rec'] as const).map(mode=><button type="button" key={mode} aria-pressed={form.experience===mode} onClick={()=>setForm({...form,experience:mode})} className={'min-h-12 rounded-xl border px-4 text-sm font-black '+(form.experience===mode?'border-[#58b4fc] bg-[#2067a3]':'border-[#456d8b]')}>{mode==='park'?'THE PARK · Pickup':'THE REC · Organized'}</button>)}
     </div>
     <label className="text-xs font-black sm:col-span-2">Session title<input required minLength={5} maxLength={120} className={fieldClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Friday night 5V5 — The REC"/></label>
     <RunVenuePicker selected={selectedVenue} onSelect={venue=>{setSelectedVenue(venue);setForm(f=>({...f,location:runVenueLocation(venue),court_slug:venue.slug}));}} onClear={()=>{setSelectedVenue(null);setForm(f=>({...f,court_slug:'',location:''}));}}/>
     <label className="text-xs font-black sm:col-span-2">Venue / address<input required minLength={5} maxLength={300} className={fieldClass} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Gym or park name, street address, Virginia city"/></label>
     <label className="text-xs font-black">Start (Virginia local time)<input required type="datetime-local" className={fieldClass} value={form.starts} onChange={e=>setForm({...form,starts:e.target.value})}/></label>
     <label className="text-xs font-black">Game format<select value={form.format} onChange={e=>setForm({...form,format:e.target.value})} className={fieldClass}>{['1v1','2v2','3v3','4v4','5v5'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label className="text-xs font-black">Player capacity<input required type="number" min={2} max={50} className={fieldClass} value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></label>
     <label className="text-xs font-black">Organizer fee (USD)<input required type="number" min={0} max={500} step=".01" className={fieldClass} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
     <label className="text-xs font-black sm:col-span-2">Run rules / check-in instructions<textarea maxLength={1600} rows={3} className={fieldClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Team rotation, arrival, parking, skill requirements, bring a light/dark jersey…"/></label>
     <p className="text-xs leading-5 text-[#a9c8dd] sm:col-span-2">Event fees are listed for transparency. RCH does not collect payments on the organizer&apos;s behalf. Results are verified separately after play.</p>
     <button disabled={busy} type="submit" className="min-h-12 rounded-xl bg-[#3b95f5] px-5 font-black disabled:opacity-50">{busy?'Publishing…':'Publish under this Partner HQ'}</button>
    </form>}
    <div className="mt-5 space-y-3">{sessions.map(s=><div key={s.run_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3c607e] bg-[#092037] p-4">
     <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-bold uppercase text-[#91d0fd]">{s.experience==='rec'?'THE REC':'THE PARK'} · {s.run?.game_format} · {s.run?.status}</p><h3 className="mt-1 font-black">{s.run?.title}</h3><p className="mt-1 text-xs text-[#b1cee2]">{s.run?.starts_at?new Date(s.run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''} · {s.run?.location}</p></div>
     <div className="flex items-center gap-3"><span className="text-xs font-black">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'FREE'}</span><Link href={'/runs/'+s.run_id} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#5f8eb3] px-3 text-xs font-black">Run Room <FaArrowRight/></Link></div>
    </div>)}{!sessions.length&&<p className="rounded-xl border border-dashed border-[#3d6280] p-6 text-sm text-[#b4d0e2]">No sessions published yet. Start with your next scheduled run.</p>}</div>
   </section>
   {canManage&&<section className="mt-9 grid gap-5 lg:grid-cols-2">
    <form onSubmit={e=>{e.preventDefault();if(partner)void call('rch_update_runs_partner',{p_partner:partner.id,p_name:brand.name,p_city:brand.city,p_description:brand.description,p_instagram:brand.instagram||null,p_logo:brand.logo||null,p_color:brand.color},'Partner brand updated.');}} className="rounded-2xl border border-[#365f7c] bg-[#0b253d] p-5">
     <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaGear/> Branding studio</h2>
     <p className="mt-2 text-xs leading-5 text-[#aac9dd]">The organization controls its public identity. RCH approval is not delegated.</p>
     <div className="mt-4 space-y-3">
      <label className="block text-xs font-black">Name<input required minLength={3} maxLength={120} className={fieldClass} value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})}/></label>
      <label className="block text-xs font-black">City<input required minLength={2} maxLength={100} className={fieldClass} value={brand.city} onChange={e=>setBrand({...brand,city:e.target.value})}/></label>
      <label className="block text-xs font-black">Description<textarea maxLength={1200} rows={3} className={fieldClass} value={brand.description} onChange={e=>setBrand({...brand,description:e.target.value})}/></label>
      <label className="block text-xs font-black">Instagram<input type="url" className={fieldClass} value={brand.instagram} onChange={e=>setBrand({...brand,instagram:e.target.value})}/></label>
      <label className="block text-xs font-black">Logo image (HTTPS URL)<input type="url" className={fieldClass} value={brand.logo} onChange={e=>setBrand({...brand,logo:e.target.value})}/></label>
      <label className="flex items-center gap-3 text-xs font-black">Brand accent<input type="color" value={brand.color} onChange={e=>setBrand({...brand,color:e.target.value})} className="h-11 w-14 rounded-lg border border-[#4c718e] bg-[#071b2d]"/> {brand.color}</label>
     </div>
     <button disabled={busy} className="mt-5 min-h-11 rounded-xl bg-[#318bee] px-5 text-sm font-black disabled:opacity-50">Save brand</button>
    </form>
    <section className="rounded-2xl border border-[#365f7c] bg-[#0b253d] p-5">
     <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaPeopleGroup/> Organization staff</h2>
     <p className="mt-2 text-xs leading-5 text-[#aac9dd]">Only the owner can appoint or remove scoped managers and scorekeepers. Managers can publish sessions; scorekeepers get private analytics and can be appointed to individual Run Rooms separately.</p>
     {role==='owner'&&<form onSubmit={e=>{e.preventDefault();if(partner)void call('rch_manage_runs_partner_member',{p_partner:partner.id,p_username:staffUser,p_role:staffRole,p_enabled:true},'Partner staff account appointed.');}} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="min-w-[140px] flex-1 text-xs font-bold">Member username<input required className={fieldClass} value={staffUser} onChange={e=>setStaffUser(e.target.value)} placeholder="@username"/></label>
      <label className="text-xs font-bold">Role<select className={fieldClass} value={staffRole} onChange={e=>setStaffRole(e.target.value as typeof staffRole)}><option value="manager">Manager</option><option value="scorekeeper">Scorekeeper</option></select></label>
      <button disabled={busy} className="min-h-11 rounded-lg bg-[#358ff0] px-3 text-xs font-black disabled:opacity-50">Add staff</button>
     </form>}
     <div className="mt-4 space-y-2">{members.map(m=><div key={m.profile_id} className="flex items-center justify-between gap-3 rounded-xl border border-[#476b88] px-3 py-3"><div><p className="text-sm font-bold">{names[m.profile_id]||m.profile_id.slice(0,8)}</p><p className="text-xs text-[#afc9db]">{m.role}</p></div>{role==='owner'&&<button disabled={busy} type="button" onClick={()=>{const name=names[m.profile_id];if(!name){setError('Staff member username unavailable.');return;}void (async()=>{const {data}=await db.from('profiles').select('username').eq('id',m.profile_id).maybeSingle();if(data?.username&&partner)void call('rch_manage_runs_partner_member',{p_partner:partner.id,p_username:data.username,p_role:m.role,p_enabled:false},'Staff member removed.');})();}} className="rounded-lg border border-[#748ba3] px-3 py-2 text-xs disabled:opacity-50">Remove</button>}</div>)}{!members.length&&<p className="text-xs text-[#a6c5d8]">Owner is the only manager right now.</p>}</div>
    </section>
   </section>}
   {staffAllowed&&<Link href="/runs/partners/review" className="mt-6 inline-flex items-center gap-2 text-xs font-black text-[#a3dcff]"><FaClipboardCheck/> RCH applications review <FaArrowRight/></Link>}
   <div className="mt-8 rounded-2xl border border-[#395f79] p-4 text-xs leading-6 text-[#a5c2d4]"><FaShieldHalved className="mr-2 inline"/> Player REP, rankings, verified match stats and skill medals remain part of RCH’s independent competitive verification system. Publishing or managing an organization never grants basketball achievements.</div>
  </div>
 </main>;
}
function FaBuildingIcon(){return <FaBasketball/>;}
