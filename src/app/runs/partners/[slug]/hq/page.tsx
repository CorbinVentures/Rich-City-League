'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaChartLine,FaClipboardCheck,FaGear,FaPeopleGroup,FaShieldHalved,FaPaintbrush,FaEye} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {RunVenuePicker,runVenueLocation,type RunVenue} from '@/components/runs/RunVenuePicker';

type PageSettings={eyebrow:string;headline:string;subheadline:string;hero_image_url:string;featured_video_url:string;featured_video_label:string;cta_label:string;show_schedule:boolean;show_leaderboard:boolean;show_video:boolean;show_results:boolean;callout_title:string;callout_body:string};
type Partner={id:string;slug:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;status:string;reward_multiplier:number;page_settings:PageSettings};
type Member={profile_id:string;role:'manager'|'scorekeeper'};
type Session={run_id:string;experience:'park'|'rec';price_cents:number;reward_multiplier:number;run?:{id:string;title:string;starts_at:string;location:string;status:string;game_format:string}};
type Metrics={total_sessions:number;upcoming_sessions:number;total_checkins:number;unique_attendees:number;repeat_attendees:number;verified_matches:number;waiting_players:number};
type SessionForm={title:string;starts:string;location:string;court_slug:string;format:string;experience:'park'|'rec';capacity:number;price:string;description:string};
const empty:SessionForm={title:'',starts:'',location:'',court_slug:'',format:'5v5',experience:'rec',capacity:20,price:'0',description:''};
const sessionTemplates:ReadonlyArray<{id:string;label:string;title:string;experience:'park'|'rec';format:string;capacity:number;description:string}>=[
 {id:'park-5v5',label:'Outdoor pickup · 5v5',title:'Outdoor Community Run',experience:'park',format:'5v5',capacity:20,description:'Organizer: add arrival details, park access information, event rules and participant check-in instructions.'},
 {id:'rec-5v5',label:'REC session · 5v5',title:'Organized REC Session',experience:'rec',format:'5v5',capacity:20,description:'Organizer: add facility entry details, arrival time, event rules and participant check-in instructions.'},
 {id:'park-3v3',label:'Competitive · 3v3',title:'3v3 Competitive Run',experience:'park',format:'3v3',capacity:6,description:'Organizer: add arrival details, park access information, matchup rules and participant check-in instructions.'},
 {id:'park-1v1',label:'1v1 matchup',title:'1v1 Matchup Session',experience:'park',format:'1v1',capacity:2,description:'Organizer: add arrival details, park access information, matchup rules and participant check-in instructions.'},
];
const initialMetrics:Metrics={total_sessions:0,upcoming_sessions:0,total_checkins:0,unique_attendees:0,repeat_attendees:0,verified_matches:0,waiting_players:0};
const emptyPageSettings:PageSettings={eyebrow:'OFFICIAL RUNS PARTNER · RVA 1V1 CIRCUIT',headline:'Every matchup has a story.',subheadline:'The talk. The records. The moment the ball goes up.',hero_image_url:'',featured_video_url:'https://www.youtube.com/watch?v=ir8I6M2MXqk',featured_video_label:'CARI VS WICK',cta_label:'Explore the circuit',show_schedule:true,show_leaderboard:true,show_video:true,show_results:true,callout_title:'ONE COURT. EVERY RECORD.',callout_body:'Follow the official SYB 1v1 circuit, see verified records, and bring your next matchup to the floor.'};
const fieldClass='mt-2 min-h-11 w-full rounded-xl border border-[#6b6b6b] bg-[#181818] px-3 py-3 text-sm text-white outline-none focus:border-[#afafaf]';

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
 const [form,setForm]=useState<SessionForm>(()=>slug==='syb-hoop-richmond'?{...empty,format:'1v1',capacity:2}:empty);
 const [selectedVenue,setSelectedVenue]=useState<RunVenue|null>(null);
 const [brand,setBrand]=useState({name:'',city:'',description:'',instagram:'',logo:'',color:'#7b7b7b'});
 const [pageSettings,setPageSettings]=useState<PageSettings>(emptyPageSettings);
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
   .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status,reward_multiplier,page_settings')
   .eq('slug',slug).maybeSingle();
  if(failure||!row){setError('Partner HQ not found or not accessible.');setLoading(false);return;}
  const p=row as Partner;
  const own=p.owner_id===user.id;
  const {data:me}=own?{data:null}:await db.from('rch_runs_partner_members').select('role').eq('partner_id',p.id).eq('profile_id',user.id).maybeSingle();
  const currentRole=own?'owner':me?.role||'';
  if(!currentRole){setError('Your account is not authorized to open this partner headquarters.');setLoading(false);return;}
  setRole(currentRole);setPartner(p);setBrand({name:p.name,city:p.city,description:p.description,instagram:p.instagram_url||'',logo:p.logo_url||'',color:p.brand_color});setPageSettings({...emptyPageSettings,...(p.page_settings||{})});
  const [metricResult,staffResult,linksResult]=await Promise.all([
   db.rpc('rch_partner_hq_metrics',{p_partner:p.id}),
   own?db.from('rch_runs_partner_members').select('profile_id,role').eq('partner_id',p.id):Promise.resolve({data:[]}),
   db.from('rch_runs_partner_sessions').select('run_id,experience,price_cents,reward_multiplier').eq('partner_id',p.id).limit(200)
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
 if(!user)return <main className="min-h-screen bg-[#151515] p-8 text-white">Sign in to manage a Runs organization. <Link href={'/auth/sign-in?next='+encodeURIComponent('/runs/partners/'+slug+'/hq')} className="text-[#c6c6c6]">Sign in →</Link></main>;
 if(loading)return <main className="min-h-screen bg-[#151515] p-8 text-[#d2d2d2]">Opening partner headquarters…</main>;
 if(!partner)return <main className="min-h-screen bg-[#151515] p-8 text-white"><p role="alert">{error||'Access denied.'}</p><Link href="/runs/partners" className="text-[#c4c4c4]">Partner directory</Link></main>;
 return <main className="min-h-screen bg-[#151515] px-4 pb-28 pt-8 text-white sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href={'/runs/partners/'+partner.slug} className="text-xs font-bold text-[#c7c7c7]">← Public organization page</Link>
   <header className="mt-5 rounded-3xl border border-[#585858] bg-[radial-gradient(circle_at_top_right,#3b3b3b,#0a243c_70%)] p-6 sm:p-9">
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#c2c2c2]"><FaBuildingIcon/> Official Runs Partner HQ</p>
    <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">{partner.name}</h1>
    <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-[#7c7c7c] px-3 py-1 text-xs font-bold text-[#dcdcdc]">{partner.status==='approved'?'Verified organization':partner.status}</span><span className="rounded-full border border-[#787878] px-3 py-1 text-xs font-bold">{role.toUpperCase()} ACCESS</span><span className="rounded-full border border-[#787878] px-3 py-1 text-xs font-bold">{partner.city}, VA</span>{partner.reward_multiplier>1&&<span className="rounded-full border border-[#959595] bg-[#2e2e2e] px-3 py-1 text-xs font-black text-[#e6e6e6]">{partner.reward_multiplier}× event XP / REP</span>}</div>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-[#cccccc]">Publish event listings and schedules here. Players use a free RCH profile to check in, join games and share Run Tape highlights. RCH verification of an organization does not certify an individual event or score.</p>
   </header>
   {error&&<p role="alert" className="mt-5 rounded-xl border border-gray-400/50 bg-gray-900/20 p-4 text-sm text-gray-100">{error}</p>}
   {notice&&<p role="status" className="mt-5 rounded-xl border border-gray-500/40 bg-gray-900/20 p-4 text-sm text-gray-100">{notice}</p>}
   <section className="mt-7">
    <div className="flex items-center gap-2"><FaChartLine className="text-[#b5b5b5]"/><h2 className="text-xl font-black uppercase">Organization pulse</h2></div>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
     {([['Sessions scheduled',metrics.total_sessions],['Upcoming runs',metrics.upcoming_sessions],['Player check-ins',metrics.total_checkins],['Unique attendees',metrics.unique_attendees],['Repeat attendees',metrics.repeat_attendees],['Verified games',metrics.verified_matches],['Players waiting',metrics.waiting_players]] as [string,number][]).map(([label,value])=><div key={label} className="rounded-2xl border border-[#565656] bg-[#242424] p-4"><span className="block text-3xl font-black tabular-nums">{value}</span><span className="mt-2 block text-xs text-[#c2c2c2]">{label}</span></div>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#aaaaaa]">Aggregated from actual RCH session, check-in, queue and verified-match records. A scheduled run is not proof of attendance, and advertised fees are not revenue.</p>
   </section>
   <section className="mt-9 rounded-2xl border border-[#5a5a5a] bg-[#212121] p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#c0c0c0]"><FaCalendarDays/> THE PARK / THE REC</p><h2 className="mt-2 text-2xl font-black uppercase">Event schedule</h2></div>{canManage&&<button onClick={()=>{if(!showForm&&partner.slug==='syb-hoop-richmond'&&!form.title.trim())setForm({...empty,title:'SYB 1v1 Matchup',format:'1v1',experience:'park',capacity:2});setShowForm(v=>!v)}} className="min-h-11 rounded-xl bg-[#838383] px-4 text-sm font-black">{showForm?'Close editor':'+ Publish an event'}</button>}</div>
    {showForm&&canManage&&<form onSubmit={e=>void publish(e)} className="mt-5 grid gap-4 rounded-xl border border-[#707070] bg-[#1b1b1b] p-5 sm:grid-cols-2">
     <fieldset className="sm:col-span-2">
      <legend className="text-xs font-black uppercase tracking-wide text-[#d0d0d0]">Start from an event template</legend>
      <p className="mt-1 text-[11px] leading-5 text-[#c3c3c3]">Presets save setup time. Confirm the venue, time, facility permission, rules and fees before publishing; a template does not certify the event or any score.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{sessionTemplates.map(template=><button key={template.id} type="button" onClick={()=>setForm(current=>({...current,title:template.title,experience:template.experience,format:template.format,capacity:template.capacity,price:'0',description:template.description}))} className="min-h-[68px] rounded-xl border border-[#656565] bg-[#242424] p-3 text-left text-xs font-black text-[#f2f2f2] hover:border-[#bababa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#bababa]"><span className="block">{template.label}</span><span className="mt-1 block text-[10px] font-normal text-[#c3c3c3]">Prefill session details</span></button>)}</div>
     </fieldset>
     <div className="sm:col-span-2 grid grid-cols-2 gap-2">
      {(['park','rec'] as const).map(mode=><button type="button" key={mode} aria-pressed={form.experience===mode} onClick={()=>setForm({...form,experience:mode})} className={'min-h-12 rounded-xl border px-4 text-sm font-black '+(form.experience===mode?'border-[#a6a6a6] bg-[#5c5c5c]':'border-[#676767]')}>{mode==='park'?'THE PARK · Pickup':'THE REC · Organized'}</button>)}
     </div>
     <label className="text-xs font-black sm:col-span-2">Event title<input required minLength={5} maxLength={120} className={fieldClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="SYB Comp Week — Lucks Field"/></label>
     <RunVenuePicker selected={selectedVenue} onSelect={venue=>{setSelectedVenue(venue);setForm(f=>({...f,location:runVenueLocation(venue),court_slug:venue.slug}));}} onClear={()=>{setSelectedVenue(null);setForm(f=>({...f,court_slug:'',location:''}));}}/>
     <label className="text-xs font-black sm:col-span-2">Venue / address<input required minLength={5} maxLength={300} className={fieldClass} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Gym or park name, street address, Virginia city"/></label>
     <label className="text-xs font-black">Start (Virginia local time)<input required type="datetime-local" className={fieldClass} value={form.starts} onChange={e=>setForm({...form,starts:e.target.value})}/></label>
     <label className="text-xs font-black">Game format<select value={form.format} onChange={e=>setForm({...form,format:e.target.value})} className={fieldClass}>{['1v1','2v2','3v3','4v4','5v5'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label className="text-xs font-black">Player capacity<input required type="number" min={2} max={50} className={fieldClass} value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></label>
     <label className="text-xs font-black">Organizer fee (USD)<input required type="number" min={0} max={500} step=".01" className={fieldClass} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
     <label className="text-xs font-black sm:col-span-2">Schedule, rules and check-in instructions<textarea maxLength={1600} rows={5} className={fieldClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Arrival time, first game, matchup schedule, parking, rules and player check-in details…"/></label>
     <p className="text-xs leading-5 text-[#c3c3c3] sm:col-span-2">Add event logistics above. Each Run Room carries its live scorekeeper, recorded results and Run Tape. {partner.reward_multiplier>1?`${partner.reward_multiplier}× eligible rewards apply to code-verified attendance, verified game/stat results and event highlights.`:'Rewards follow the organization’s approved multiplier and RCH’s independent result review.'} RCH does not collect event fees.</p>
     <button disabled={busy} type="submit" className="min-h-12 rounded-xl bg-[#898989] px-5 font-black disabled:opacity-50">{busy?'Publishing…':'Publish event to Runs'}</button>
    </form>}
    <div className="mt-5 space-y-3">{sessions.map(s=><div key={s.run_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#5b5b5b] bg-[#1d1d1d] p-4">
     <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-bold uppercase text-[#c6c6c6]">{s.experience==='rec'?'THE REC':'THE PARK'} · {s.run?.game_format} · {s.run?.status}</p><h3 className="mt-1 font-black">{s.run?.title}</h3><p className="mt-1 text-xs text-[#c9c9c9]">{s.run?.starts_at?new Date(s.run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''} · {s.run?.location}</p>{s.reward_multiplier>1&&<p className="mt-2 text-[10px] font-black uppercase text-[#e6e6e6]">{s.reward_multiplier}× event XP / REP</p>}</div>
     <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-black">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'FREE'}</span><Link href={'/runs/'+s.run_id} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#878787] px-3 text-xs font-black">Run Room <FaArrowRight/></Link>{s.run?.game_format==='1v1'&&<Link href={'/runs/'+s.run_id+'#rch-live-game'} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#4e4e4e] px-3 text-xs font-black text-white"><FaBasketball/> Courtside board</Link>}</div>
    </div>)}{!sessions.length&&<p className="rounded-xl border border-dashed border-[#5c5c5c] p-6 text-sm text-[#cbcbcb]">No sessions published yet. Start with your next scheduled run.</p>}</div>
   </section>
   {canManage&&<section className="mt-9 grid gap-5 lg:grid-cols-2">
    <form onSubmit={e=>{e.preventDefault();if(partner)void call('rch_update_runs_partner',{p_partner:partner.id,p_name:brand.name,p_city:brand.city,p_description:brand.description,p_instagram:brand.instagram||null,p_logo:brand.logo||null,p_color:brand.color},'Partner brand updated.');}} className="rounded-2xl border border-[#585858] bg-[#212121] p-5">
     <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaGear/> Branding studio</h2>
     <p className="mt-2 text-xs leading-5 text-[#c4c4c4]">The organization controls its public identity. RCH approval is not delegated.</p>
     <div className="mt-4 space-y-3">
      <label className="block text-xs font-black">Name<input required minLength={3} maxLength={120} className={fieldClass} value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})}/></label>
      <label className="block text-xs font-black">City<input required minLength={2} maxLength={100} className={fieldClass} value={brand.city} onChange={e=>setBrand({...brand,city:e.target.value})}/></label>
      <label className="block text-xs font-black">Description<textarea maxLength={1200} rows={3} className={fieldClass} value={brand.description} onChange={e=>setBrand({...brand,description:e.target.value})}/></label>
      <label className="block text-xs font-black">Instagram<input type="url" className={fieldClass} value={brand.instagram} onChange={e=>setBrand({...brand,instagram:e.target.value})}/></label>
      <label className="block text-xs font-black">Logo image (HTTPS URL)<input type="url" className={fieldClass} value={brand.logo} onChange={e=>setBrand({...brand,logo:e.target.value})}/></label>
      <label className="flex items-center gap-3 text-xs font-black">Brand accent<input type="color" value={brand.color} onChange={e=>setBrand({...brand,color:e.target.value})} className="h-11 w-14 rounded-lg border border-[#6b6b6b] bg-[#181818]"/> {brand.color}</label>
     </div>
     <button disabled={busy} className="mt-5 min-h-11 rounded-xl bg-[#7f7f7f] px-5 text-sm font-black disabled:opacity-50">Save brand</button>
    </form>
    <section className="rounded-2xl border border-[#585858] bg-[#212121] p-5">
     <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaPeopleGroup/> Organization staff</h2>
     <p className="mt-2 text-xs leading-5 text-[#c4c4c4]">Only the owner can appoint or remove scoped managers and scorekeepers. Managers can publish sessions; scorekeepers get private analytics and can be appointed to individual Run Rooms separately.</p>
     {role==='owner'&&<form onSubmit={e=>{e.preventDefault();if(partner)void call('rch_manage_runs_partner_member',{p_partner:partner.id,p_username:staffUser,p_role:staffRole,p_enabled:true},'Partner staff account appointed.');}} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="min-w-[140px] flex-1 text-xs font-bold">Member username<input required className={fieldClass} value={staffUser} onChange={e=>setStaffUser(e.target.value)} placeholder="@username"/></label>
      <label className="text-xs font-bold">Role<select className={fieldClass} value={staffRole} onChange={e=>setStaffRole(e.target.value as typeof staffRole)}><option value="manager">Manager</option><option value="scorekeeper">Scorekeeper</option></select></label>
      <button disabled={busy} className="min-h-11 rounded-lg bg-[#838383] px-3 text-xs font-black disabled:opacity-50">Add staff</button>
     </form>}
     <div className="mt-4 space-y-2">{members.map(m=><div key={m.profile_id} className="flex items-center justify-between gap-3 rounded-xl border border-[#656565] px-3 py-3"><div><p className="text-sm font-bold">{names[m.profile_id]||m.profile_id.slice(0,8)}</p><p className="text-xs text-[#c5c5c5]">{m.role}</p></div>{role==='owner'&&<button disabled={busy} type="button" onClick={()=>{const name=names[m.profile_id];if(!name){setError('Staff member username unavailable.');return;}void (async()=>{const {data}=await db.from('profiles').select('username').eq('id',m.profile_id).maybeSingle();if(data?.username&&partner)void call('rch_manage_runs_partner_member',{p_partner:partner.id,p_username:data.username,p_role:m.role,p_enabled:false},'Staff member removed.');})();}} className="rounded-lg border border-[#888888] px-3 py-2 text-xs disabled:opacity-50">Remove</button>}</div>)}{!members.length&&<p className="text-xs text-[#c0c0c0]">Owner is the only manager right now.</p>}</div>
    </section>
   </section>}
   {canManage&&<section className="mt-9 rounded-2xl border border-[#4c4c4c] bg-[linear-gradient(140deg,#0f0f0f,#161616)] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#a5a5a5]"><FaPaintbrush/> Public experience</p><h2 className="mt-2 text-2xl font-black uppercase">Page studio</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[#bdbdbd]">Shape the SYB page from one place: headline, banner, featured video, callout and which sections fans see.</p></div><Link href={'/runs/partners/'+partner.slug} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#4c4c4c] px-3 text-xs font-black text-white"><FaEye/> View public page</Link></div>
    <form onSubmit={e=>{e.preventDefault();if(partner)void call('rch_update_runs_partner_page',{p_partner:partner.id,p_settings:pageSettings},'Public page saved. Your SYB circuit page is updated.');}} className="mt-5 grid gap-4 sm:grid-cols-2">
     <label className="text-xs font-black">Eyebrow / section label<input maxLength={100} className={fieldClass} value={pageSettings.eyebrow} onChange={e=>setPageSettings({...pageSettings,eyebrow:e.target.value})}/></label>
     <label className="text-xs font-black">Hero headline<input required minLength={3} maxLength={100} className={fieldClass} value={pageSettings.headline} onChange={e=>setPageSettings({...pageSettings,headline:e.target.value})}/></label>
     <label className="text-xs font-black sm:col-span-2">Hero subheading<textarea maxLength={280} rows={2} className={fieldClass} value={pageSettings.subheadline} onChange={e=>setPageSettings({...pageSettings,subheadline:e.target.value})}/></label>
     <label className="text-xs font-black">Banner image (HTTPS URL)<input type="url" className={fieldClass} value={pageSettings.hero_image_url} onChange={e=>setPageSettings({...pageSettings,hero_image_url:e.target.value})} placeholder="https://…"/></label>
     <label className="text-xs font-black">Featured YouTube video<input type="url" className={fieldClass} value={pageSettings.featured_video_url} onChange={e=>setPageSettings({...pageSettings,featured_video_url:e.target.value})} placeholder="https://youtu.be/…"/></label>
     <label className="text-xs font-black">Video label<input maxLength={60} className={fieldClass} value={pageSettings.featured_video_label} onChange={e=>setPageSettings({...pageSettings,featured_video_label:e.target.value})}/></label>
     <label className="text-xs font-black">Main button label<input maxLength={40} className={fieldClass} value={pageSettings.cta_label} onChange={e=>setPageSettings({...pageSettings,cta_label:e.target.value})}/></label>
     <label className="text-xs font-black">Custom callout title<input maxLength={80} className={fieldClass} value={pageSettings.callout_title} onChange={e=>setPageSettings({...pageSettings,callout_title:e.target.value})}/></label>
     <label className="text-xs font-black sm:col-span-2">Custom callout text<textarea maxLength={300} rows={2} className={fieldClass} value={pageSettings.callout_body} onChange={e=>setPageSettings({...pageSettings,callout_body:e.target.value})}/></label>
     <fieldset className="sm:col-span-2 rounded-xl border border-[#3b3b3b] p-4"><legend className="px-2 text-xs font-black uppercase tracking-wider text-[#dddddd]">Show these public sections</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([['show_schedule','Upcoming events'],['show_leaderboard','1v1 leaderboard'],['show_video','Featured video'],['show_results','Past events & Run Tape']] as const).map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-3 rounded-lg bg-white/[.04] px-3 text-xs font-bold"><input type="checkbox" checked={pageSettings[key]} onChange={e=>setPageSettings({...pageSettings,[key]:e.target.checked})} className="h-4 w-4 accent-[#4e4e4e]"/>{label}</label>)}</div></fieldset>
     <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] leading-5 text-[#afafaf]">Logo, city, Instagram, brand color and organization description are managed in the Branding studio above.</p><button disabled={busy} className="min-h-11 rounded-xl bg-[#4e4e4e] px-5 text-sm font-black text-white disabled:opacity-50">Save public page</button></div>
    </form>
   </section>}
   {staffAllowed&&<Link href="/runs/partners/review" className="mt-6 inline-flex items-center gap-2 text-xs font-black text-[#d2d2d2]"><FaClipboardCheck/> RCH applications review <FaArrowRight/></Link>}
   <div className="mt-8 rounded-2xl border border-[#595959] p-4 text-xs leading-6 text-[#bdbdbd]"><FaShieldHalved className="mr-2 inline"/> Player REP, rankings, verified match stats and skill medals remain part of RCH’s independent competitive verification system. Publishing or managing an organization never grants basketball achievements.</div>
  </div>
 </main>;
}
function FaBuildingIcon(){return <FaBasketball/>;}
