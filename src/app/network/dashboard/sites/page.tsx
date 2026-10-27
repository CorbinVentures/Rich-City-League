'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Container} from '@/components/Container';
import {RchSiteView,type RchSiteOrganization} from '@/components/sites/RchSiteView';
import {
  isRchSiteSlug,normalizeRchSiteDraft,rchSiteSectionsFor,RCH_SITE_THEMES,RCH_SITE_TYPES,
  type RchSiteDraft,type RchSiteSectionKey,type RchSiteType,
} from '@/lib/rch-site-builder';
import {FaArrowLeft,FaArrowRight,FaCircleCheck,FaCopy,FaEye,FaFloppyDisk,FaGlobe,FaLock,FaPalette,FaRocket} from 'react-icons/fa6';

type Org=RchSiteOrganization & {
  id:string;organization_type:string;status:string;member_role:string;
  network_tier:string;is_verified:boolean;is_claimed:boolean;eligible:boolean;
};
type SiteRecord={organization_id:string;slug:string;config:unknown;updated_at:string};
type Published={organization_id:string;slug:string;status:string;published_at:string};
type Payload={organizations:Org[];drafts:SiteRecord[];published:Published[]};
const templateLabels:Record<RchSiteType,{name:string,sub:string}>={
  trainer:{name:'Trainer',sub:'Private sessions & development'},
  coach:{name:'Coach',sub:'Lessons & team coaching'},
  aau:{name:'AAU Program',sub:'Club, teams & tryouts'},
  organizer:{name:'Organizer',sub:'Camps, events & showcases'},
};
const sectionLabels:Record<RchSiteSectionKey,string>={
  hero:'Home',about:'About',services:'Training',schedule:'Events',
  roster:'Programs',media:'Media',contact:'Contact',
};
const field='min-h-11 w-full rounded-xl border border-white/20 bg-[#151821] p-3 text-sm text-white focus:border-rose-400 focus:outline-none';
function eligibleTagline(type:RchSiteType){
  return type==='aau'?'Build your game. Grow together.':type==='organizer'?'Bring the game together.':'Your game. Your next level.';
}

export default function RchSitesBuilderPage(){
  const {user,loading:authLoading}=useAuth();
  const [data,setData]=useState<Payload>({organizations:[],drafts:[],published:[]});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [selected,setSelected]=useState('');
  const [slug,setSlug]=useState('');
  const [config,setConfig]=useState<RchSiteDraft>(()=>normalizeRchSiteDraft({}));
  const [dirty,setDirty]=useState(false);
  const [preview,setPreview]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await fetch('/api/rch-sites',{cache:'no-store'});
      const body=await response.json() as Payload & {error?:string};
      if(!response.ok)throw Error(body.error||'Could not load your websites.');
      setData({organizations:body.organizations||[],drafts:body.drafts||[],published:body.published||[]});
      setSelected(current=>current||body.organizations?.find(o=>o.eligible)?.id||body.organizations?.[0]?.id||'');
    }catch(e){setError(e instanceof Error?e.message:'Site builder is temporarily unavailable.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{if(!authLoading&&user)void load();else if(!authLoading)setLoading(false)},[authLoading,user,load]);

  const organization=useMemo(()=>data.organizations.find(o=>o.id===selected)||null,[data.organizations,selected]);
  const draft=useMemo(()=>data.drafts.find(d=>d.organization_id===selected)||null,[data.drafts,selected]);
  const published=useMemo(()=>data.published.find(d=>d.organization_id===selected)||null,[data.published,selected]);

  useEffect(()=>{
    if(!organization)return;
    const initial=draft?normalizeRchSiteDraft(draft.config):normalizeRchSiteDraft({
      siteType:organization.organization_type==='training'?'trainer':
        organization.organization_type==='tournament'?'organizer':'aau',
      tagline:eligibleTagline(organization.organization_type==='training'?'trainer':organization.organization_type==='tournament'?'organizer':'aau'),
      about:organization.description||'',
      callToAction:'Get in touch',
    });
    setConfig(initial);
    setSlug(draft?.slug|| (isRchSiteSlug(organization.slug)?organization.slug:''));
    setMessage('');
    setError('');
    setDirty(false);
  },[organization,draft]);

  const setField=<K extends keyof RchSiteDraft>(name:K,value:RchSiteDraft[K])=>{
    setConfig(c=>({...c,[name]:value}));
    setDirty(true);
  };
  const setTemplate=(type:RchSiteType)=>{
    setConfig(c=>({...c,siteType:type,sections:rchSiteSectionsFor(type),
      tagline:dirty?c.tagline:eligibleTagline(type)}));
    setDirty(true);
  };
  const toggleSection=(section:RchSiteSectionKey)=>{
    if(section==='hero'||section==='contact')return;
    setConfig(c=>({...c,sections:c.sections.includes(section)
      ? c.sections.filter(s=>s!==section):[...c.sections.slice(0,-1),section,'contact']}));
    setDirty(true);
  };
  const submit=async(action:'save'|'publish'|'unpublish')=>{
    if(!organization||busy)return;
    setBusy(action);setError('');setMessage('');
    try{
      const response=await fetch('/api/rch-sites',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId:organization.id,action,slug,config}),
      });
      const body=await response.json() as {error?:string;status?:string;url?:string};
      if(!response.ok)throw Error(body.error||'Could not complete this action.');
      setMessage(action==='publish'?'Website published successfully.':
        action==='save'?'Draft saved privately.':'Website unpublished.');
      setDirty(false);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update the website.');}
    finally{setBusy('');}
  };
  const copyLink=async()=>{
    if(!published)return;
    try{await navigator.clipboard.writeText(window.location.origin+'/sites/'+published.slug);setMessage('Public link copied.');}
    catch{setMessage('Public link: '+window.location.origin+'/sites/'+published.slug);}
  };

  if(authLoading||loading)return <Shell><p className="text-sm text-white/70" role="status">Loading your sites…</p></Shell>;
  if(!user)return <Shell><p className="text-white/80">Sign in to build an organization website.</p>
    <Link href="/auth/sign-in?next=/network/dashboard/sites" className="mt-5 inline-flex rounded-xl bg-rose-600 px-5 py-3 font-black">Sign in</Link></Shell>;
  if(!data.organizations.length)return <Shell><h1 className="text-3xl font-black">Claim your organization first.</h1>
    <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">RCH Sites is for verified representatives of basketball organizations. Once your organization is approved, you can build its website here.</p>
    <Link href="/organizations" className="mt-5 inline-flex rounded-xl bg-rose-600 px-5 py-3 font-black">Find your organization</Link></Shell>;

  const canPublish=organization?.member_role==='owner'||organization?.member_role==='manager';
  const valid=isRchSiteSlug(slug)&&config.tagline.trim().length>0&&config.about.trim().length>0;
  return <Shell>
    <Link href="/network/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-white/60"><FaArrowLeft/> Partner dashboard</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-rose-400">RCH Sites · Website Studio</p>
        <h1 className="mt-2 text-4xl font-black">Build your own website.</h1>
        <p className="mt-2 text-sm text-white/65">Your brand. Your visitors. Powered by Rich City Hoops.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs text-white/70"><FaLock/> Only your organization can edit</div>
    </div>
    <div className="mt-6 grid gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 md:grid-cols-[1fr_auto] md:items-end">
      <label className="text-xs font-bold">Your organization
        <select className={field+' mt-2'} value={selected} onChange={e=>setSelected(e.target.value)}>
          {data.organizations.map(o=><option key={o.id} value={o.id}>{o.name}{o.eligible?'':' — verification required'}</option>)}
        </select>
      </label>
      <span className="text-xs text-white/60">{published?'Published':'Not published'} {dirty?'· Unsaved changes':''}</span>
    </div>
    {organization&&!organization.eligible&&<div role="alert" className="mt-5 rounded-2xl border border-amber-300/30 p-5 text-sm text-amber-100">RCH Sites requires an active, verified and claimed basketball organization. Your listing must be approved before you can create a site.</div>}
    {organization?.eligible&&<div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <Heading number="01" icon={<FaPalette/>} title="Choose your style"/>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {RCH_SITE_TYPES.map(type=><button key={type} type="button" onClick={()=>setTemplate(type)}
              aria-pressed={config.siteType===type}
              className={'rounded-xl border p-3 text-left '+(config.siteType===type?'border-rose-400 bg-rose-600/20':'border-white/15 bg-black/25')}>
              <b className="text-sm">{templateLabels[type].name}</b>
              <span className="mt-1 block text-xs text-white/60">{templateLabels[type].sub}</span>
            </button>)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(RCH_SITE_THEMES) as Array<keyof typeof RCH_SITE_THEMES>).map(key=>{
              const t=RCH_SITE_THEMES[key];return <button key={key} type="button" aria-pressed={config.theme===key}
                onClick={()=>setField('theme',key)}
                className={'rounded-xl border p-2 text-xs font-bold '+(config.theme===key?'border-rose-400':'border-white/15')}>
                <span className="mb-2 block h-8 rounded-lg border border-white/10" style={{backgroundColor:t.canvas,borderLeft:'8px solid '+t.accent}}/>
                {t.label}
              </button>
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <Heading number="02" icon={<FaGlobe/>} title="Make it yours"/>
          <label className="mt-4 block text-xs font-bold">Website URL
            <div className="mt-2 flex overflow-hidden rounded-xl border border-white/20 bg-[#151821]">
              <span className="my-auto pl-3 text-xs text-white/50">/sites/</span>
              <input className="w-full min-w-0 bg-transparent p-3 text-sm outline-none" value={slug}
                onChange={e=>{setSlug(e.target.value.trim().toLowerCase());setDirty(true);}} maxLength={48} placeholder="your-program" autoComplete="off"/>
            </div>
            {!isRchSiteSlug(slug)&&<span className="mt-1 block text-xs text-amber-200">Use 3–48 lowercase characters, numbers or hyphens.</span>}
          </label>
          <label className="mt-4 block text-xs font-bold">Headline
            <input className={field+' mt-2'} maxLength={110} value={config.tagline} onChange={e=>setField('tagline',e.target.value)}/>
          </label>
          <label className="mt-4 block text-xs font-bold">About your program
            <textarea className={field+' mt-2 min-h-32'} maxLength={1000} value={config.about} onChange={e=>setField('about',e.target.value)} placeholder="Tell visitors about your real services, values and location."/>
          </label>
          <label className="mt-4 block text-xs font-bold">Main button text
            <input className={field+' mt-2'} maxLength={32} value={config.callToAction} onChange={e=>setField('callToAction',e.target.value)}/>
          </label>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <Heading number="03" icon={<FaEye/>} title="Choose sections"/>
          <p className="mt-2 text-xs text-white/60">Your live website uses approved RCH layouts. Empty events and media do not appear publicly.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(Object.keys(sectionLabels) as RchSiteSectionKey[]).map(section=><label key={section} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={config.sections.includes(section)} onChange={()=>toggleSection(section)}
                disabled={section==='hero'||section==='contact'} className="h-4 w-4 accent-rose-500"/>
              {sectionLabels[section]}
            </label>)}
          </div>
        </section>
        {canPublish&&<Link href="/network/dashboard/sites/people" className="mb-3 inline-flex min-h-12 items-center gap-2 rounded-xl border border-rose-400/40 px-5 text-sm font-black text-rose-200">Organization inbox <FaArrowRight/></Link>}
        {canPublish&&<Link href="/network/dashboard/sites/payments" className="mb-3 inline-flex min-h-12 items-center gap-2 rounded-xl border border-rose-400/40 px-5 text-sm font-black text-rose-200">Independent PayPal links <FaArrowRight/></Link>}
        {canPublish&&<Link href="/network/dashboard/sites/appointments" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rose-400/40 px-5 text-sm font-black text-rose-200">Calendar &amp; bookings <FaArrowRight/></Link>}
        <div className="flex flex-wrap gap-2">
          <button disabled={!valid||Boolean(busy)} onClick={()=>void submit('save')} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-black disabled:opacity-40"><FaFloppyDisk/> {busy==='save'?'Saving…':'Save draft'}</button>
          <button disabled={!valid||!canPublish||Boolean(busy)} onClick={()=>void submit('publish')} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40"><FaRocket/> {busy==='publish'?'Publishing…':published?'Publish changes':'Publish website'}</button>
        </div>
        {published&&<div className="rounded-xl border border-emerald-400/30 bg-emerald-600/10 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3"><FaCircleCheck className="text-emerald-300"/> Your public website is live.
            <Link className="underline" href={'/sites/'+published.slug} target="_blank" rel="noopener noreferrer">Open site <FaArrowRight className="inline"/></Link>
            <button onClick={()=>void copyLink()} className="inline-flex items-center gap-1 underline"><FaCopy/> Copy</button>
          </div>
          {canPublish&&<button disabled={Boolean(busy)} onClick={()=>void submit('unpublish')} className="mt-4 text-xs text-rose-300 underline disabled:opacity-40">Unpublish website</button>}
        </div>}
        {!canPublish&&<p className="text-xs text-white/60">Editors can save drafts. Only an organization owner or manager can publish.</p>}
        {message&&<p role="status" className="rounded-xl border border-emerald-400/25 p-4 text-sm text-emerald-200">{message}</p>}
        {error&&<p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error}</p>}
      </div>
      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Live preview</h2>
          <button type="button" onClick={()=>setPreview(p=>!p)} className="rounded-xl border border-white/25 px-4 py-2 text-xs font-bold">{preview?'Show full':'Compact view'}</button>
        </div>
        <div className={'overflow-y-auto rounded-2xl border border-white/20 shadow-xl '+(preview?'max-h-[600px] max-w-sm':'max-h-[850px]')}>
          <RchSiteView organization={organization} config={normalizeRchSiteDraft(config)} preview/>
        </div>
      </section>
    </div>}
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#0b0c10] pb-28 text-white">
    <Container maxWidth="2xl" className="py-8 sm:py-12">{children}</Container>
  </main>;
}
function Heading({number,title,icon}:{number:string;title:string;icon:React.ReactNode}){
  return <h2 className="flex items-center gap-2 font-black"><span className="text-xs text-rose-400">{number}</span><span className="text-rose-400">{icon}</span>{title}</h2>;
}
