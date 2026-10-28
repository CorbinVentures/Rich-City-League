'use client';

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Container} from '@/components/Container';
import {RchSiteView} from '@/components/sites/RchSiteView';
import {
  isRchSiteSlug,normalizeRchSiteDraft,RCH_SITE_THEMES,RCH_SITE_TYPES,
  rchSiteSectionsFor,type RchSiteDraft,type RchSiteType,
} from '@/lib/rch-site-builder';
import {isRchSitePlanTier,type RchSitePlanTier} from '@/lib/rch-sites-plans';
import {NETWORK_REGIONS} from '@/lib/network-taxonomy';
import {
  FaArrowLeft,FaArrowRight,FaBasketball,FaCalendarDays,FaCircleCheck,
  FaFloppyDisk,FaGlobe,FaPalette,FaShieldHalved,FaTrophy,
} from 'react-icons/fa6';

type ExistingOrg={id:string;name:string;eligible:boolean;member_role:string};
type Starter={organizationName:string;slug:string;tier:RchSitePlanTier;
  config:RchSiteDraft;verificationRequested:boolean;verificationStatus:string|null};
const templates=[
  {type:'trainer',label:'Trainer',detail:'Sessions & skills',icon:FaBasketball},
  {type:'coach',label:'Coach',detail:'Coaching programs',icon:FaCalendarDays},
  {type:'aau',label:'AAU / Team',detail:'Teams & tryouts',icon:FaTrophy},
  {type:'organizer',label:'Organizer',detail:'Events & tournaments',icon:FaGlobe},
] as const;
const tiers=[
  {id:'free',name:'Free',price:'$0',copy:'Start building now'},
  {id:'amateur',name:'Amateur',price:'Coming later',copy:'Use Free while we finish this level'},
  {id:'professional',name:'Professional',price:'Coming later',copy:'Use Free while we finish this level'},
] as const;
const field='mt-2 w-full min-h-12 rounded-xl border border-white/20 bg-[#111e2b] p-3 text-sm text-white outline-none focus:border-sky-400';
const states=['Your site','Make it yours','Finish setup'];

function startingText(type:RchSiteType){
  return type==='aau'?'Where our team grows together':
    type==='organizer'?'Your next basketball experience starts here':
    type==='coach'?'Develop your game. Build your future.':
    'Train harder. Take your game further.';
}
function initialConfig(type:RchSiteType='trainer'){
  return normalizeRchSiteDraft({
    siteType:type,theme:'courtside',sections:rchSiteSectionsFor(type),
    tagline:startingText(type),about:'Basketball training, development and opportunities.',
    callToAction:'Get in touch',
  });
}
function slugify(name:string){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
}
type ResponseData={error?:string;status?:string;slug?:string;studioUrl?:string;draft?:Starter|null};
async function postAction(payload:Record<string,unknown>):Promise<ResponseData>{
  const response=await fetch('/api/rch-sites/starter',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify(payload),
  });
  const json=await response.json().catch(()=>({})) as ResponseData;
  if(!response.ok)throw Error(json.error||'Could not update your website.');
  return json;
}

export function RchSiteStarterClient({initialTier='free'}:{initialTier?:string}){
  const {user,loading:authLoading}=useAuth();
  const [loading,setLoading]=useState(true);
  const [step,setStep]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [name,setName]=useState('');
  const [slug,setSlug]=useState('');
  const [slugTouched,setSlugTouched]=useState(false);
  const [tier,setTier]=useState<RchSitePlanTier>(isRchSitePlanTier(initialTier)?initialTier:'free');
  const [config,setConfig]=useState<RchSiteDraft>(()=>initialConfig());
  const [saved,setSaved]=useState(false);
  const [requested,setRequested]=useState(false);
  const [verificationStatus,setVerificationStatus]=useState<string|null>(null);
  const [eligibleOrgs,setEligibleOrgs]=useState<ExistingOrg[]>([]);
  const [selectedOrg,setSelectedOrg]=useState('');
  const [contactName,setContactName]=useState('');
  const [city,setCity]=useState('');
  const [region,setRegion]=useState('central-virginia');
  const [proofUrl,setProofUrl]=useState('');
  const [claimSlug,setClaimSlug]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [savedResponse,sitesResponse]=await Promise.all([
        fetch('/api/rch-sites/starter',{cache:'no-store'}),
        fetch('/api/rch-sites',{cache:'no-store'}),
      ]);
      const savedData=await savedResponse.json() as ResponseData;
      const sitesData=await sitesResponse.json() as {organizations?:ExistingOrg[]};
      if(!savedResponse.ok)throw Error(savedData.error||'Could not open your website workspace.');
      if(savedData.draft){
        const d=savedData.draft;
        setName(d.organizationName);setSlug(d.slug);setSlugTouched(true);
        setTier(isRchSitePlanTier(d.tier)?d.tier:'free');
        setConfig(normalizeRchSiteDraft(d.config));setSaved(true);
        setRequested(d.verificationRequested);setVerificationStatus(d.verificationStatus);
        setStep(1);
      }
      if(sitesResponse.ok){
        const permitted=(sitesData.organizations??[])
          .filter(o=>o.eligible&&['owner','manager'].includes(o.member_role));
        setEligibleOrgs(permitted);setSelectedOrg(permitted[0]?.id||'');
      }
    }catch(e){setError(e instanceof Error?e.message:'Could not load the starter.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(user)void load();else setLoading(false);
  },[authLoading,user,load]);

  function updateConfig<K extends keyof RchSiteDraft>(key:K,value:RchSiteDraft[K]){
    setConfig(previous=>({...previous,[key]:value}));setSaved(false);setMessage('');
  }
  function changeType(type:RchSiteType){
    setConfig(previous=>({...previous,siteType:type,sections:rchSiteSectionsFor(type),
      tagline:previous.tagline===startingText(previous.siteType)?startingText(type):previous.tagline}));
    setSaved(false);
  }
  function updateName(value:string){
    const next=value.slice(0,140);setName(next);
    if(!slugTouched)setSlug(slugify(next));
    setSaved(false);
  }
  const valid=name.trim().length>=2&&isRchSiteSlug(slug)
    &&config.tagline.trim().length>0&&config.about.trim().length>0;
  async function save(){
    if(!valid){setError('Add your business name, a valid site address, headline and description.');return false;}
    setBusy(true);setError('');setMessage('');
    try{
      await postAction({action:'save',organizationName:name,slug,tier,config});
      setSaved(true);setMessage('Your private website draft is saved.');return true;
    }catch(e){setError(e instanceof Error?e.message:'Could not save your website.');return false;}
    finally{setBusy(false);}
  }
  async function finishDesign(){
    if(await save())setStep(2);
  }
  async function requestVerification(){
    setBusy(true);setError('');setClaimSlug('');
    try{
      const response=await fetch('/api/rch-sites/starter',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify({action:'requestVerification',contactName,city,region,proofUrl}),
      });
      const body=await response.json().catch(()=>({})) as ResponseData;
      if(response.status===409&&body.status==='existing_listing'){
        const existing=body as ResponseData & {slug:string};
        setClaimSlug(existing.slug);
        setError('We found this organization in the RCH directory. Claim its existing listing instead.');
        return;
      }
      if(!response.ok)throw Error(body.error||'Could not request verification.');
      setRequested(true);setVerificationStatus('new');
      setMessage('Publishing verification requested. Your website draft is safe.');
    }catch(e){setError(e instanceof Error?e.message:'Could not request verification.');}
    finally{setBusy(false);}
  }
  async function importDraft(){
    if(!selectedOrg)return;
    setBusy(true);setError('');setMessage('');
    try{
      await postAction({action:'import',organizationId:selectedOrg});
      window.location.assign('/network/dashboard/sites');
    }catch(e){setError(e instanceof Error?e.message:'Could not open your website in Studio.');}
    finally{setBusy(false);}
  }

  const path='/website-creator/start'+(isRchSitePlanTier(initialTier)?'?tier='+initialTier:'');
  if(authLoading||loading)return <Shell><p role="status" className="text-white/65">Opening your website setup…</p></Shell>;
  if(!user)return <Shell>
    <div className="mx-auto max-w-xl rounded-3xl border border-sky-400/25 bg-[#0a2030] p-7 sm:p-10">
      <p className="text-xs font-black uppercase tracking-[.15em] text-sky-300">RCH Sites · Get Started</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase">Your website starts here.</h1>
      <p className="mt-4 text-sm leading-7 text-white/70">Create a free RCH account to choose your design, preview your site and save it privately. You can verify your organization when you&apos;re ready to publish.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={'/auth/sign-up?next='+encodeURIComponent(path)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 text-sm font-black text-[#061321]">Create a free account <FaArrowRight/></Link>
        <Link href={'/auth/sign-in?next='+encodeURIComponent(path)} className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-5 text-sm font-bold">I already have an account</Link>
      </div>
      {error&&<p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    </div>
  </Shell>;

  return <Shell>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/website-creator" className="inline-flex items-center gap-2 text-xs font-black text-white/60"><FaArrowLeft/> Website Creator</Link>
      <span className="rounded-full border border-sky-400/25 px-3 py-1.5 text-xs font-bold text-sky-200"><FaShieldHalved className="mr-1 inline"/> Private setup · Free to begin</span>
    </div>
    <h1 className="font-display text-4xl font-black uppercase sm:text-5xl">Let&apos;s build your website.</h1>
    <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Choose a look, add your brand, and save a real draft. Organization verification happens before publishing—not before designing.</p>
    <div className="mt-7 grid grid-cols-3 gap-2" aria-label="Setup progress">{states.map((title,index)=>
      <button key={title} type="button" disabled={index>step||busy} onClick={()=>setStep(index)}
        aria-current={step===index?'step':undefined}
        className={'min-h-12 rounded-xl border px-2 py-3 text-xs font-bold disabled:cursor-not-allowed '+(step===index?'border-sky-300 bg-sky-400/20 text-white':'border-white/15 text-white/55')}>{index+1}. {title}</button>
    )}</div>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/35 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</p>}

    {step===0&&<div className="mt-8 space-y-7">
      <section>
        <h2 className="text-xl font-black">What are you building?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{templates.map(({type,label,detail,icon:Icon})=>
          <button key={type} type="button" aria-pressed={config.siteType===type}
            onClick={()=>changeType(type)}
            className={'min-h-32 rounded-2xl border p-5 text-left transition '+(config.siteType===type?'border-sky-300 bg-sky-400/15':'border-white/15 bg-white/[.04] hover:border-sky-400/40')}>
            <Icon className="text-2xl text-sky-300"/><b className="mt-4 block text-lg">{label}</b>
            <span className="mt-1 block text-xs text-white/60">{detail}</span>
          </button>)}</div>
      </section>
      <section>
        <h2 className="text-xl font-black">Choose your starting level</h2>
        <p className="mt-2 text-xs text-white/60">Everyone begins on Free. Paid plans are being developed; your selection just saves your preference.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">{tiers.map(plan=>
          <button key={plan.id} type="button" aria-pressed={tier===plan.id}
            onClick={()=>{setTier(plan.id);setSaved(false);}}
            className={'rounded-xl border p-4 text-left '+(tier===plan.id?'border-sky-300 bg-sky-400/15':'border-white/15 bg-white/[.03]')}>
            <b className="block text-base">{plan.name}</b><span className="mt-1 block text-xl font-black">{plan.price}</span>
            <span className="mt-2 block text-xs text-white/55">{plan.copy}</span>
          </button>)}</div>
      </section>
      <button type="button" onClick={()=>{setError('');setStep(1);}}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-6 text-sm font-black text-[#061321]">Customize my site <FaArrowRight/></button>
    </div>}

    {step===1&&<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-white/15 bg-white/[.04] p-5">
          <div className="flex items-center gap-2 text-lg font-black"><FaBasketball className="text-sky-300"/> Your brand</div>
          <label className="mt-5 block text-sm font-semibold">Basketball business / organization
            <input className={field} value={name} onChange={e=>updateName(e.target.value)} placeholder="Your program name" maxLength={140}/></label>
          <label className="mt-4 block text-sm font-semibold">Your website address
            <div className="mt-2 flex overflow-hidden rounded-xl border border-white/20 bg-[#111e2b]">
              <span className="my-auto pl-3 text-xs text-white/45">/sites/</span>
              <input className="w-full min-w-0 bg-transparent p-3 text-sm outline-none" value={slug} maxLength={48} placeholder="your-program"
                onChange={e=>{setSlug(e.target.value.toLowerCase().trim());setSlugTouched(true);setSaved(false);}}/>
            </div>
          </label>
          {!isRchSiteSlug(slug)&&<p className="mt-2 text-xs text-amber-200">Use 3–48 lowercase letters, numbers and hyphens.</p>}
          <label className="mt-4 block text-sm font-semibold">Your headline
            <input className={field} maxLength={110} value={config.tagline} onChange={e=>updateConfig('tagline',e.target.value)}/></label>
          <label className="mt-4 block text-sm font-semibold">About your organization
            <textarea className={field+' min-h-28'} maxLength={1000} value={config.about}
              onChange={e=>updateConfig('about',e.target.value)} placeholder="Tell people about your program and why it matters."/></label>
          <label className="mt-4 block text-sm font-semibold">Main button
            <input className={field} maxLength={32} value={config.callToAction}
              onChange={e=>updateConfig('callToAction',e.target.value)}/></label>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/[.04] p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><FaPalette className="text-sky-300"/> Pick your style</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(RCH_SITE_THEMES) as Array<keyof typeof RCH_SITE_THEMES>).map(key=>{
              const theme=RCH_SITE_THEMES[key];
              return <button key={key} type="button" aria-pressed={config.theme===key}
                onClick={()=>updateConfig('theme',key)}
                className={'rounded-xl border p-2 text-left text-xs font-bold '+(config.theme===key?'border-sky-300':'border-white/20')}>
                <span className="mb-2 block h-9 rounded-lg border border-white/15"
                  style={{backgroundColor:theme.canvas,borderLeft:'8px solid '+theme.accent}}/>
                {theme.label}
              </button>;
            })}
          </div>
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={()=>setStep(0)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold"><FaArrowLeft/> Back</button>
          <button type="button" disabled={!valid||busy} onClick={()=>void save()}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold disabled:opacity-40"><FaFloppyDisk/> {busy?'Saving…':'Save draft'}</button>
          <button type="button" disabled={!valid||busy} onClick={()=>void finishDesign()}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-6 text-sm font-black text-[#061321] disabled:opacity-40">Continue <FaArrowRight/></button>
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-black">Your live preview</h2>
          <span className="text-xs text-white/45">Only you can see this draft</span></div>
        <div className="pointer-events-none max-h-[800px] overflow-hidden overflow-y-auto rounded-2xl border border-white/20">
          <RchSiteView preview organization={{name:name||'Your Basketball Brand',slug:slug||'starter-preview',
            city:city||null,state:'VA'}} config={normalizeRchSiteDraft(config)}/>
        </div>
      </div>
    </div>}

    {step===2&&<div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-emerald-400/20 bg-[#0c2029] p-6">
        <FaCircleCheck className="text-3xl text-emerald-300"/>
        <h2 className="mt-4 font-display text-3xl font-black uppercase">Your site is saved.</h2>
        <p className="mt-3 text-sm leading-7 text-white/65"><b>{name}</b> now has a private RCH website draft. You can edit and preview it while your organization completes publishing verification.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={()=>setStep(1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-bold">Keep designing <FaArrowRight/></button>
          <Link href="/website-creator" className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-4 text-sm font-bold">View plans</Link>
        </div>
      </section>
      <section className="rounded-2xl border border-sky-400/20 bg-[#0b1d2c] p-6">
        <h2 className="font-display text-3xl font-black uppercase">Ready to publish?</h2>
        {!!eligibleOrgs.length&&<>
          <p className="mt-3 text-sm text-white/65">You already manage an approved basketball organization. Move your starter design into Website Studio.</p>
          <label className="mt-5 block text-xs font-bold">Approved organization
            <select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)} className={field}>
              {eligibleOrgs.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </label>
          <button type="button" disabled={!selectedOrg||busy} onClick={()=>void importDraft()}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 text-sm font-black text-[#061321] disabled:opacity-40">Open in Website Studio <FaArrowRight/></button>
          <p className="mt-2 text-xs text-white/45">Your website is never published automatically.</p>
          <div className="my-6 border-t border-white/15"/>
        </>}
        {requested?<div className="mt-5 rounded-xl border border-sky-400/25 p-4">
          <p className="font-bold text-sky-200">Publishing verification requested</p>
          <p className="mt-2 text-sm leading-6 text-white/60">Status: {verificationStatus||'submitted'}. Your private design remains editable. Once RCH approves an organization listing and your ownership claim, return here to open the site in Website Studio.</p>
          <Link href="/organizations" className="mt-3 inline-block text-sm font-bold text-sky-300 underline">Find or claim your organization</Link>
        </div>:<form onSubmit={e=>{e.preventDefault();void requestVerification();}} className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-white/60">We verify ownership before a website goes public. This protects organizations from impersonation. You don&apos;t need to re-enter your website design.</p>
          <label className="block text-xs font-bold">Your name
            <input className={field} required minLength={2} maxLength={120} value={contactName}
              placeholder="Owner or director" onChange={e=>setContactName(e.target.value)}/></label>
          <label className="block text-xs font-bold">Operating region
            <select className={field} value={region} onChange={e=>setRegion(e.target.value)}>
              {NETWORK_REGIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
            </select></label>
          <label className="block text-xs font-bold">City (optional)
            <input className={field} maxLength={120} value={city} onChange={e=>setCity(e.target.value)} placeholder="Richmond"/></label>
          <label className="block text-xs font-bold">Proof link (optional)
            <input className={field} type="url" maxLength={500} value={proofUrl} onChange={e=>setProofUrl(e.target.value)} placeholder="https://your-program.org"/></label>
          <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 text-sm font-black text-[#061321] disabled:opacity-40">Request publishing verification <FaArrowRight/></button>
          {claimSlug&&<Link href={'/organizations/'+claimSlug+'/claim'} className="block text-sm font-black text-sky-300 underline">Claim existing listing instead</Link>}
          <p className="text-xs leading-5 text-white/40">This is a website activation check, not a sales inquiry or subscription checkout. You can keep editing while ownership is reviewed.</p>
        </form>}
      </section>
    </div>}
  </Shell>;
}

function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">{children}</Container></main>;
}
