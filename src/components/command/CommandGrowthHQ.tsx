'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import './command-growth.css';

type Item=Record<string,any>;
type Tab='market'|'partners'|'campaigns'|'playbook';
type ProspectForm={name:string;category:string;relationship_type:string;city:string;website_url:string;source_url:string;public_contact:string;stage:string;est_ask:string;contracted_amount:string;signed_reference:string;next_action:string;next_action_on:string;notes:string};
type CampaignForm={title:string;playbook:string;channel:string;audience:string;offer:string;call_to_action:string;status:string;starts_on:string;ends_on:string;target_tickets:string;target_leads:string;budget:string;actual_spend:string;actual_tickets:string;actual_leads:string;actual_reach:string;evidence_reference:string;notes:string};
const emptyProspect=():ProspectForm=>({name:'',category:'local_business',relationship_type:'sponsor',city:'',website_url:'',source_url:'',public_contact:'',stage:'research',est_ask:'',contracted_amount:'',signed_reference:'',next_action:'',next_action_on:'',notes:''});
const emptyCampaign=():CampaignForm=>({title:'',playbook:'founding_fans',channel:'social',audience:'Local basketball fans and community',offer:'',call_to_action:'',status:'draft',starts_on:'',ends_on:'',target_tickets:'',target_leads:'',budget:'',actual_spend:'',actual_tickets:'',actual_leads:'',actual_reach:'',evidence_reference:'',notes:''});
const categories=[
 ['local_business','Local business'],['corporate','Corporate partner'],['health_wellness','Health & wellness'],['restaurants','Restaurant / food'],['automotive','Automotive'],
 ['education','Education'],['financial_services','Financial services'],['retail','Retail'],['media_creator','Media / creator'],['basketball_organization','Basketball organization'],['nonprofit','Nonprofit'],['other','Other']
];
const prospectStages=['research','qualified','contacted','meeting','proposal','negotiating','won','lost'];
const playbooks=[
 {key:'founding_fans',name:'Founding Fan Section',channel:'social',audience:'Local basketball fans aged 18+, families and community groups',offer:'Become an original supporter of the hometown franchise',cta:'Follow the team and RSVP for the first home event',why:'Build a contactable fanbase before spending on conversion ads',kpi:'Verified event RSVPs and ticket sales'},
 {key:'sponsor_drive',name:'Territory Sponsor Drive',channel:'partners',audience:'Local businesses with a demonstrated presence in our market',offer:'Game-day visibility, branded community activations and RCH TV inventory subject to agreement',cta:'Schedule a discovery meeting about an appropriate partnership',why:'Sell specific available benefits, not speculative audience guarantees',kpi:'Qualified meetings, proposals and signed agreements'},
 {key:'court_to_crowd',name:'Court-to-Crowd Activations',channel:'venue',audience:'Adult players, local run organizers and nearby fans',offer:'Open-run meetups and franchise introductions with facility approval',cta:'Sign up for the next official franchise event',why:'Turn real basketball activity into measurable attendance',kpi:'Verified registrations and event check-ins'},
 {key:'community_clinic',name:'Community Basketball Clinic',channel:'community',audience:'Families, youth development partners and adult volunteers',offer:'A properly supervised, permission-based community clinic',cta:'Register through the official event page',why:'Earn local trust through consistent community benefit',kpi:'Verified attendance and partner participation'},
 {key:'rch_tv',name:'RCH TV Hometown Spotlight',channel:'multi_channel',audience:'Local sports viewers and content creators',offer:'Team stories, player features and sponsor-supported local programming',cta:'Watch and share the verified franchise story',why:'Grow personality, media value and local relevance',kpi:'Platform-reported views and referral visits'},
 {key:'local_rivalry',name:'Regional Rivalry Week',channel:'multi_channel',audience:'Fans of neighboring RCL franchises',offer:'A division matchup with storyline and fan challenges',cta:'Claim a seat for the next verified rivalry game',why:'Raise ticket demand through authentic competition',kpi:'Paid game attendance versus previous home games'}
] as const;
const num=(v:any)=>Number(v||0);
const dollars=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const normal=(s:string)=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const nullable=(v:string)=>(v.trim()===''?null:Number(v));
const httpsOrEmpty=(v:string)=>!v.trim()||(/^https:\/\/[^ ]{5,600}$/i.test(v.trim()));
const formatDate=(v:string)=>v?new Date(v+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No date';
const url=(raw:string)=>/^https:\/\/[^\s]+$/i.test(raw||'')?raw:undefined;
const canReadSource=(p:Item)=>Boolean(url(p.source_url)||url(p.website_url));

const markets:Record<string,string[]> = {
 'chesterfield':['midlothian','north chesterfield','bon air'],'hanover':['mechanicsville','beaverdam','ashland','rockville'],
 'henrico':['glen allen','short pump'],'prince william':['woodbridge','dumfries'],'fairfax':['reston','herndon','tysons'],
 'montgomery':['blacksburg','christiansburg'],'stafford':['falmouth']
};
function localityMatch(city:string,localities:Item[]){
 const clean=normal(city).replace(/,.*$/,'');
 const exact=localities.filter(l=>normal(l.name)===clean);
 if(exact.length)return exact.some(l=>l.locality_type==='city')?exact.find(l=>l.locality_type==='city'):exact[0];
 return localities.find(l=>(markets[normal(l.name)]||[]).includes(clean));
}
type Props={teamId:string;teamName:string;isAdmin?:boolean};
export function CommandGrowthHQ({teamId,teamName,isAdmin=false}:Props){
 const db=useMemo(()=>getSupabaseClient() as SupabaseClient<any>|null,[]);
 const [territory,setTerritory]=useState<Item|null>(null);
 const [localities,setLocalities]=useState<Item[]>([]);
 const [courtSignals,setCourtSignals]=useState<Item[]>([]);
 const [facts,setFacts]=useState<Item[]>([]);
 const [prospects,setProspects]=useState<Item[]>([]);
 const [campaigns,setCampaigns]=useState<Item[]>([]);
 const [network,setNetwork]=useState<Item[]>([]);
 const [tab,setTab]=useState<Tab>('market');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [leadEdit,setLeadEdit]=useState<string|null>(null);
 const [leadForm,setLeadForm]=useState<ProspectForm>(emptyProspect());
 const [campaignEdit,setCampaignEdit]=useState<string|null>(null);
 const [campaignForm,setCampaignForm]=useState<CampaignForm>(emptyCampaign());
 const [factFips,setFactFips]=useState('');
 const [factForm,setFactForm]=useState({population:'',adults_18_34:'',households:'',median_household_income:'',source_name:'U.S. Census Bureau ACS 5-Year',source_url:'https://data.census.gov/',source_year:'2024',notes:''});
 const [showFact,setShowFact]=useState(false);
 const [leadSearch,setLeadSearch]=useState('');
 const [quickFilter,setQuickFilter]=useState('all');

 const load=useCallback(async()=>{
  if(!db||!teamId){setLoading(false);return;}
  setLoading(true);setError('');
  const {data:home,error:homeError}=await db.from('rcl_command_territories').select('id,team_id,home_market,division').eq('team_id',teamId).maybeSingle();
  if(homeError||!home){setError(homeError?.message||'This team has no approved growth territory.');setLoading(false);return;}
  const [l,c,f,p,a,n]=await Promise.all([
   db.from('rcl_command_territory_localities').select('id,fips,name,locality_type,scope,territory_id').eq('territory_id',home.id).order('scope').limit(150),
   db.from('rcl_growth_locality_court_signals').select('fips,mapped_court_records').eq('territory_id',home.id).limit(150),
   db.from('rcl_growth_market_facts').select('*').limit(200),
   db.from('rcl_growth_prospects').select('*').eq('team_id',teamId).order('updated_at',{ascending:false}).limit(300),
   db.from('rcl_growth_campaigns').select('*').eq('team_id',teamId).order('updated_at',{ascending:false}).limit(300),
   isAdmin?db.from('network_acquisition_prospects').select('id,organization_name,organization_type,city,region,website_url,source_url,source_label,status,source_checked_at,outreach_status').limit(300):Promise.resolve({data:[],error:null})
  ]);
  const failure=[l.error,c.error,f.error,p.error,a.error,n.error].find(Boolean);
  if(failure)setError(failure.message);
  else{setTerritory(home);setLocalities(l.data||[]);setCourtSignals(c.data||[]);setFacts(f.data||[]);
   setProspects(p.data||[]);setCampaigns(a.data||[]);setNetwork(n.data||[]);}
  setLoading(false);
 },[db,teamId,isAdmin]);
 useEffect(()=>{void load()},[load]);

 const scopedFacts=facts.filter(f=>localities.some(l=>l.fips===f.fips));
 const totalCourts=courtSignals.reduce((sum,s)=>sum+num(s.mapped_court_records),0);
 const coveredFips=new Set(scopedFacts.map(f=>f.fips));
 const reportedYears=[...new Set(scopedFacts.map(f=>f.source_year))];
 const completePopulation=localities.length>0&&localities.every(l=>scopedFacts.some(f=>f.fips===l.fips&&f.population!==null))&&reportedYears.length===1;
 const aggregatePopulation=completePopulation?scopedFacts.reduce((sum,f)=>sum+num(f.population),0):null;
 const measuredCampaigns=campaigns.filter(c=>c.evidence_reference&&[c.actual_spend,c.actual_tickets,c.actual_leads,c.actual_reach].some(v=>v!==null));
 const activeCampaigns=campaigns.filter(c=>['ready','active'].includes(c.status));
 const openProspects=prospects.filter(p=>!['lost','won'].includes(p.stage));
 const due=prospects.filter(p=>p.next_action_on&&p.next_action_on<=new Date().toISOString().slice(0,10)&&!['lost','won'].includes(p.stage));
 const contracted=prospects.filter(p=>p.stage==='won'&&p.signed_reference).reduce((s,p)=>s+num(p.contracted_amount),0);
 const sourceCandidates=network.filter(p=>p.city&&localityMatch(p.city,localities))
   .filter(p=>!prospects.some(q=>normal(q.name)===normal(p.organization_name)));
 const insights=[
  {title:'Home court footprint',value:totalCourts+'',caption:'Exact-name RCH directory records (not independently audited venues)',action:totalCourts?'Map approved outreach locations and request venue permission':'Research local courts and secure a venue before events'},
  {title:'Market facts',value:coveredFips.size+'/'+localities.length,caption:'Jurisdictions with a sourced demographic record',action:coveredFips.size<localities.length?'Complete ACS evidence for core communities':'Review demographic vintage and planning assumptions'},
  {title:'Partner outreach',value:openProspects.length+'',caption:'Qualified or research-stage prospects in team CRM',action:due.length?due.length+' follow-up(s) due':'Create a sourced list of possible local partners'},
  {title:'Active activation',value:activeCampaigns.length+'',caption:'Campaigns ready or active, not evidence of ads delivered',action:activeCampaigns.length?'Record attributable outcomes with evidence':'Launch the founding fan section campaign'}
 ];

 function startLead(item?:Item){
  setLeadEdit(item?.id||'new');setError('');setNotice('');
  setLeadForm(item?Object.fromEntries(Object.keys(emptyProspect()).map(k=>[k,item[k]===null?'':String(item[k]||'')])) as ProspectForm:emptyProspect());
 }
 function startCampaign(item?:Item,playbookKey?:string){
  setCampaignEdit(item?.id||'new');setError('');setNotice('');
  if(item){setCampaignForm(Object.fromEntries(Object.keys(emptyCampaign()).map(k=>[k,item[k]===null?'':String(item[k]||'')])) as CampaignForm);return;}
  const playbook=playbooks.find(p=>p.key===playbookKey);
  setCampaignForm(playbook?{...emptyCampaign(),title:playbook.name+' — '+teamName,playbook:playbook.key,channel:playbook.channel,audience:playbook.audience,offer:playbook.offer,call_to_action:playbook.cta}:emptyCampaign());
  setTab('campaigns');
 }
 async function saveLead(event:FormEvent){
  event.preventDefault();if(!db||busy||!teamId)return;
  if(!leadForm.name.trim()||!httpsOrEmpty(leadForm.website_url)||!httpsOrEmpty(leadForm.source_url)){
   setError('Enter a business name and valid HTTPS website/source links, or leave links empty.');return;
  }
  if(leadForm.stage==='won'&&(leadForm.signed_reference.trim().length<6||leadForm.contracted_amount.trim()==='')){
   setError('A signed agreement reference and contracted amount are required before marking a deal Won.');return;
  }
  setBusy(true);setError('');setNotice('');
  const payload={...leadForm,team_id:teamId,name:leadForm.name.trim(),website_url:leadForm.website_url.trim()||null,
   source_url:leadForm.source_url.trim()||null,est_ask:nullable(leadForm.est_ask),contracted_amount:nullable(leadForm.contracted_amount),
   next_action_on:leadForm.next_action_on||null,source_checked_on:leadForm.source_url?new Date().toISOString().slice(0,10):null};
  const result=leadEdit==='new'?await db.from('rcl_growth_prospects').insert(payload):
    await db.from('rcl_growth_prospects').update(payload).eq('id',leadEdit).eq('team_id',teamId);
  if(result.error)setError(result.error.message);
  else{setNotice('Sourced opportunity saved in your franchise pipeline. No messages were sent.');setLeadEdit(null);await load();}
  setBusy(false);
 }
 async function importCandidate(p:Item){
  if(!db||busy)return;
  if(!canReadSource(p)){setError('Add an official or sourced URL before importing this lead.');return;}
  setBusy(true);setError('');setNotice('');
  const result=await db.from('rcl_growth_prospects').insert({
   team_id:teamId,name:p.organization_name,category:p.organization_type==='creator'?'media_creator':p.organization_type==='media'?'media_creator':'basketball_organization',
   relationship_type:p.organization_type==='creator'||p.organization_type==='media'?'media':'community',
   city:p.city||'',website_url:url(p.website_url)||null,source_url:url(p.source_url)||url(p.website_url)||null,
   stage:'research',notes:'Candidate from existing RCH research directory. This is NOT a confirmed sponsor or expression of interest.'
  });
  if(result.error)setError(result.error.message);
  else{setNotice('Research lead imported. Verify the organization and contact route before outreach.');await load();}
  setBusy(false);
 }
 async function saveCampaign(event:FormEvent){
  event.preventDefault();if(!db||busy)return;
  const f=campaignForm;
  if(!f.title.trim()||f.ends_on&&f.starts_on&&f.ends_on<f.starts_on){setError('Enter a campaign name and valid date range.');return;}
  const outcome=[f.actual_spend,f.actual_tickets,f.actual_leads,f.actual_reach].some(v=>v.trim()!=='');
  if(outcome&&f.evidence_reference.trim().length<6){setError('Recorded campaign outcomes require a supporting report or evidence reference.');return;}
  setBusy(true);setError('');setNotice('');
  const payload={...f,team_id:teamId,title:f.title.trim(),starts_on:f.starts_on||null,ends_on:f.ends_on||null,
   budget:nullable(f.budget),actual_spend:nullable(f.actual_spend),target_tickets:nullable(f.target_tickets),
   target_leads:nullable(f.target_leads),actual_tickets:nullable(f.actual_tickets),actual_leads:nullable(f.actual_leads),actual_reach:nullable(f.actual_reach)};
  const result=campaignEdit==='new'?await db.from('rcl_growth_campaigns').insert(payload):
   await db.from('rcl_growth_campaigns').update(payload).eq('id',campaignEdit).eq('team_id',teamId);
  if(result.error)setError(result.error.message);
  else{setNotice('Campaign saved. Reported results are self-entered and evidence-referenced, not automatic ad metrics.');setCampaignEdit(null);await load();}
  setBusy(false);
 }
 function openFact(fips:string){
  const existing=scopedFacts.find(f=>f.fips===fips);
  setFactFips(fips);setShowFact(true);setNotice('');setError('');
  setFactForm({population:existing?.population==null?'':String(existing.population),
   adults_18_34:existing?.adults_18_34==null?'':String(existing.adults_18_34),
   households:existing?.households==null?'':String(existing.households),
   median_household_income:existing?.median_household_income==null?'':String(existing.median_household_income),
   source_name:existing?.source_name||'U.S. Census Bureau ACS 5-Year',source_url:existing?.source_url||'https://data.census.gov/',
   source_year:String(existing?.source_year||2024),notes:existing?.notes||''});
 }
 async function saveFact(event:FormEvent){
  event.preventDefault();if(!db||busy||!isAdmin)return;
  if(!httpsOrEmpty(factForm.source_url)||!factForm.source_url||!factForm.source_name.trim()){
   setError('Provide an HTTPS official source link and citation name.');return;
  }
  const values=[factForm.population,factForm.adults_18_34,factForm.households,factForm.median_household_income];
  if(values.every(v=>!v.trim())){setError('Enter at least one verified population or household metric.');return;}
  setBusy(true);setError('');
  const payload={fips:factFips,source_name:factForm.source_name,source_url:factForm.source_url,source_year:Number(factForm.source_year),notes:factForm.notes,
   population:nullable(factForm.population),adults_18_34:nullable(factForm.adults_18_34),households:nullable(factForm.households),median_household_income:nullable(factForm.median_household_income),
   verified_on:new Date().toISOString().slice(0,10)};
  const result=await db.from('rcl_growth_market_facts').upsert(payload,{onConflict:'fips'});
  if(result.error)setError(result.error.message);
  else{setNotice('Sourced demographic observation updated.');setShowFact(false);await load();}
  setBusy(false);
 }
 const leadSet=(k:keyof ProspectForm,v:string)=>setLeadForm(f=>({...f,[k]:v}));
 const campaignSet=(k:keyof CampaignForm,v:string)=>setCampaignForm(f=>({...f,[k]:v}));
 const field=(label:string,value:string,onChange:(value:string)=>void,props:Record<string,any>={})=><label className="rcl-growth-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} {...props}/></label>;
 const options=(label:string,value:string,onChange:(value:string)=>void,choices:readonly (readonly [string,string])[])=><label className="rcl-growth-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{choices.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>;
 const stages=prospectStages.map(s=>[s,s.replace(/_/g,' ')] as const);
 const campaignStatuses=[['draft','Draft'],['ready','Ready for approval'],['active','Active / running'],['paused','Paused'],['completed','Completed']] as const;
 const tracked=prospects.filter(p=>['meeting','proposal','negotiating','won'].includes(p.stage)).length;
 const localitiesOrder=[...localities].sort((a,b)=>(a.scope==='core'?-1:1)-(b.scope==='core'?-1:1)||a.name.localeCompare(b.name));
 const matchedProspects=prospects.filter(p=>quickFilter==='all'||p.stage===quickFilter).filter(p=>normal(p.name).includes(normal(leadSearch))||normal(p.city).includes(normal(leadSearch)));
 const copyScript=(type:'sponsor'|'fans')=>{
  const message=type==='sponsor'?(
    'Hello, I’m reaching out on behalf of '+teamName+', a Rich City League franchise representing '+(territory?.home_market||'Virginia')+
    '. We are building a professional local basketball and entertainment experience. I would welcome a short conversation about whether a community or game-day partnership might fit your business. We can share specific available opportunities and discuss your goals. Would a brief introductory call be useful?'
   ):('Introducing '+teamName+'—your '+(territory?.home_market||'Virginia')+' Rich City League franchise. '+
     'Follow our season, discover upcoming home games, and help build an exciting local basketball culture. '+
     'Find us on Rich City Hoops at richcityhoops.com.');
  if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText)
    void navigator.clipboard.writeText(message).then(()=>setNotice('Outreach copy copied. Review and personalize before sending.')).catch(()=>setError('Clipboard unavailable. Use your browser copy tools.'));
 };
 return <section className="rcl-growth" aria-label="Franchise Growth Intelligence">
  <header className="rcl-growth-hero">
   <div><p className="cmd-eyebrow">FRANCHISE HQ / GROWTH & INTELLIGENCE</p><h2>Own the market. Earn the crowd.</h2>
    <p>Build real franchise advantage from local basketball infrastructure, verified public market facts, sourced relationships and results-driven campaigns.</p>
    <span className="rcl-growth-market">{teamName} · {territory?.home_market||'Assigned Virginia market'}</span>
   </div><div className="rcl-growth-hero-mark" aria-hidden="true">R</div>
  </header>
  {loading?<p className="cmd-empty">Building territory intelligence from RCH records…</p>:<>
   {error&&<div className="rcl-growth-alert" role="alert">{error}</div>}
   {notice&&<div className="rcl-growth-notice" role="status">{notice}</div>}
   <div className="rcl-growth-kpis">
    {insights.map(i=><div key={i.title} className="rcl-growth-kpi">
     <span>{i.title}</span><strong>{i.value}</strong><small>{i.caption}</small></div>)}
   </div>
   <nav className="rcl-growth-tabs" aria-label="Franchise growth tools">
    {([['market','Market Intel'],['partners','Sponsorship & Partners'],['campaigns','Marketing Studio'],['playbook','Growth Playbook']] as const).map(([id,title])=>
      <button key={id} className={tab===id?'active':''} type="button" aria-current={tab===id?'page':undefined} onClick={()=>{setTab(id);setError('');setNotice('')}}>{title}</button>)}
   </nav>
   {tab==='market'&&<div className="rcl-growth-body">
    <div className="rcl-growth-section-head"><div><p className="cmd-eyebrow">MARKET INTELLIGENCE / SOURCE FIRST</p><h3>Your local opportunity map</h3></div>
     <a href="https://data.census.gov/" target="_blank" rel="noopener noreferrer">Open U.S. Census data ↗</a></div>
    <div className="rcl-growth-summary">
     <div><small>VERIFIED TERRITORY POPULATION</small><strong>{aggregatePopulation===null?'Not yet established':aggregatePopulation.toLocaleString()}</strong>
      <p>{aggregatePopulation===null?'Requires complete, same-year population data for every assigned jurisdiction.':'Sum of sourced locality population values, not predicted fans.'}</p></div>
     <div><small>RESEARCH COVERAGE</small><strong>{coveredFips.size} / {localities.length}</strong><p>Source-backed locality metric records. County income medians are not averaged.</p></div>
     <div><small>COURT-DIRECTORY SIGNAL</small><strong>{totalCourts.toLocaleString()}</strong><p>Only exact-name matched records in RCH’s court database; unverified facilities may be present.</p></div>
    </div>
    <div className="rcl-growth-next"><strong>Recommended first action</strong><p>{insights.find(i=>i.title==='Market facts')?.action}. Focus first on core markets with local event venues.</p></div>
    <div className="rcl-growth-rows">
     {localitiesOrder.map(l=>{
      const fact=scopedFacts.find(f=>f.fips===l.fips),count=courtSignals.find(s=>s.fips===l.fips);
      return <article className="rcl-growth-locality" key={l.fips}>
       <div><strong>{l.name} {l.locality_type==='city'?'City':'County'}</strong><small>{l.scope==='core'?'Core market':'Development area'} · FIPS {l.fips}</small>
       <small>{num(count?.mapped_court_records).toLocaleString()} RCH directory matches</small></div>
       <div className="rcl-growth-fact">
        <span>Population: {fact?.population==null?'Unverified':Number(fact.population).toLocaleString()}</span>
        <span>Adults 18–34: {fact?.adults_18_34==null?'Unverified':Number(fact.adults_18_34).toLocaleString()}</span>
        {fact?.source_url&&<a href={url(fact.source_url)} target="_blank" rel="noopener noreferrer">Source · {fact.source_year} ↗</a>}
        {isAdmin&&<button type="button" onClick={()=>openFact(l.fips)}>{fact?'Update facts':'Add verified facts'}</button>}
       </div>
      </article>;
     })}
    </div>
    {isAdmin&&showFact&&<form className="rcl-growth-editor" onSubmit={e=>void saveFact(e)}>
     <div className="rcl-growth-section-head"><h3>Document census evidence · {localities.find(l=>l.fips===factFips)?.name}</h3>
      <button type="button" onClick={()=>setShowFact(false)}>Close</button></div>
     <p className="rcl-growth-small">Enter numbers only from the cited table and geography. A data.census.gov landing page alone is not verification: paste the specific table or report URL. Leave unavailable metrics blank.</p>
     <div className="rcl-growth-formgrid">
      {field('Population',factForm.population,v=>setFactForm(f=>({...f,population:v})),{type:'number',min:0})}
      {field('Adults 18–34',factForm.adults_18_34,v=>setFactForm(f=>({...f,adults_18_34:v})),{type:'number',min:0})}
      {field('Households',factForm.households,v=>setFactForm(f=>({...f,households:v})),{type:'number',min:0})}
      {field('Median household income (one jurisdiction only)',factForm.median_household_income,v=>setFactForm(f=>({...f,median_household_income:v})),{type:'number',min:0})}
      {field('Source name',factForm.source_name,v=>setFactForm(f=>({...f,source_name:v})),{required:true})}
      {field('Specific source/table URL (HTTPS)',factForm.source_url,v=>setFactForm(f=>({...f,source_url:v})),{required:true,type:'url'})}
      {field('Source vintage / year',factForm.source_year,v=>setFactForm(f=>({...f,source_year:v})),{type:'number',min:2010,max:2100})}
      {field('Methodology / caveats',factForm.notes,v=>setFactForm(f=>({...f,notes:v})))}
     </div><button className="rcl-growth-primary" disabled={busy} type="submit">Save sourced observation</button>
    </form>}
   </div>}
   {tab==='partners'&&<div className="rcl-growth-body">
    <div className="rcl-growth-section-head"><div><p className="cmd-eyebrow">TERRITORY RELATIONSHIP PIPELINE</p><h3>Sponsorship & partnerships</h3></div>
     <button className="rcl-growth-primary" type="button" onClick={()=>startLead()}>+ Add prospect</button></div>
    <div className="rcl-growth-summary">
     <div><small>OPEN OPPORTUNITIES</small><strong>{openProspects.length}</strong><p>Research through negotiating; not assumed partners.</p></div>
     <div><small>MEETINGS / PROPOSALS / AGREEMENTS</small><strong>{tracked}</strong><p>Documented pipeline stages, not guaranteed conversions.</p></div>
     <div><small>CONTRACTED AMOUNTS</small><strong>{dollars(contracted)}</strong><p>Agreements in CRM. Not booked cash or league ledger income.</p></div>
    </div>
    <div className="rcl-growth-next"><strong>Strategic fit</strong><p>Pitch specific local benefits: game-day branding, RCH TV storytelling, community basketball, family attendance, creator distribution and measurable activations. Research sponsors in automotive, restaurants, gyms, healthcare, financial services and education; no category guarantees demand.</p></div>
    <div className="rcl-growth-toolbar">
     {field('Search opportunity',leadSearch,setLeadSearch,{type:'search',placeholder:'Partner or city'})}
     {options('Pipeline stage',quickFilter,setQuickFilter,[['all','All stages'],...stages])}
    </div>
    {matchedProspects.length===0?<p className="rcl-growth-empty">No opportunities match. Create a sourced lead or import a research candidate below.</p>:
     <div className="rcl-growth-rows">{matchedProspects.map(p=><article className="rcl-growth-prospect" key={p.id}>
      <div><strong>{p.name}</strong><small>{p.city||'City unrecorded'} · {p.category.replace(/_/g,' ')} · {p.relationship_type}</small>
       {p.next_action_on&&<small>Next action: {formatDate(p.next_action_on)} — {p.next_action||'Follow up'}</small>}
       {p.source_url&&<a href={url(p.source_url)} target="_blank" rel="noopener noreferrer">Research source ↗</a>}</div>
      <div className="rcl-growth-prospect-actions"><span>{p.stage}</span>{p.est_ask!==null&&<small>Planning ask: {dollars(num(p.est_ask))}</small>}
       <button type="button" onClick={()=>startLead(p)}>Update opportunity</button></div>
     </article>)}</div>}
    {isAdmin&&<div className="rcl-growth-network"><h4>Research candidates already in RCH</h4><p>Matches are based on explicitly recorded cities and known geographic aliases. These organizations are <strong>not</strong> sponsors, and may be creators, leagues, or community collaborators. Research and verify before contacting.</p>
     {sourceCandidates.length?<div className="rcl-growth-rows">{sourceCandidates.slice(0,16).map(p=><div key={p.id} className="rcl-growth-prospect">
      <div><strong>{p.organization_name}</strong><small>{p.organization_type} · {p.city} · Source checked {p.source_checked_at?new Date(p.source_checked_at).toLocaleDateString():'unknown'}</small>
      {p.source_url&&<a href={url(p.source_url)} target="_blank" rel="noopener noreferrer">Evidence ↗</a>}</div>
      <button type="button" disabled={busy||!canReadSource(p)} onClick={()=>void importCandidate(p)}>Add to research CRM</button>
     </div>)}</div>:<p className="rcl-growth-empty">No new geographically matched research candidates in the existing network pipeline.</p>}
    </div>}
    {leadEdit!==null&&<form onSubmit={e=>void saveLead(e)} className="rcl-growth-editor">
     <div className="rcl-growth-section-head"><h3>{leadEdit==='new'?'New verified opportunity':'Update partnership opportunity'}</h3><button type="button" onClick={()=>setLeadEdit(null)}>Close</button></div>
     <div className="rcl-growth-formgrid">
      {field('Organization / business name',leadForm.name,v=>leadSet('name',v),{required:true,maxLength:170})}
      {options('Industry',leadForm.category,v=>leadSet('category',v),categories)}
      {options('Relationship',leadForm.relationship_type,v=>leadSet('relationship_type',v),[['sponsor','Sponsor'],['media','Media'],['venue','Venue'],['community','Community'],['promotional','Promotional'],['other','Other']])}
      {field('City or municipality',leadForm.city,v=>leadSet('city',v),{maxLength:120})}
      {field('Public website (HTTPS)',leadForm.website_url,v=>leadSet('website_url',v),{type:'url'})}
      {field('Research/evidence URL (HTTPS)',leadForm.source_url,v=>leadSet('source_url',v),{type:'url'})}
      {field('Published contact route (optional)',leadForm.public_contact,v=>leadSet('public_contact',v),{placeholder:'General email / contact page'})}
      {options('Stage',leadForm.stage,v=>leadSet('stage',v),stages)}
      {field('Planning sponsorship ask ($)',leadForm.est_ask,v=>leadSet('est_ask',v),{type:'number',min:0})}
      {field('Signed contracted amount ($)',leadForm.contracted_amount,v=>leadSet('contracted_amount',v),{type:'number',min:0})}
      {field('Executed agreement reference',leadForm.signed_reference,v=>leadSet('signed_reference',v))}
      {field('Next action date',leadForm.next_action_on,v=>leadSet('next_action_on',v),{type:'date'})}
      {field('Next outreach action',leadForm.next_action,v=>leadSet('next_action',v))}
      {field('Internal outreach notes',leadForm.notes,v=>leadSet('notes',v))}
     </div><div className="rcl-growth-actions"><button className="rcl-growth-primary" disabled={busy} type="submit">{busy?'Saving…':'Save opportunity'}</button><button type="button" onClick={()=>setLeadEdit(null)}>Cancel</button></div>
     <p className="rcl-growth-small">Research only; outreach is manual and must comply with recipient preferences. No lead is labeled a confirmed sponsor until a signed agreement is documented.</p>
    </form>}
   </div>}
   {tab==='campaigns'&&<div className="rcl-growth-body">
    <div className="rcl-growth-section-head"><div><p className="cmd-eyebrow">MARKETING / OUTREACH / CONVERSION</p><h3>Campaign execution studio</h3></div>
     <button type="button" className="rcl-growth-primary" onClick={()=>startCampaign()}>+ New campaign</button></div>
    <div className="rcl-growth-summary">
     <div><small>PLANNED CAMPAIGNS</small><strong>{campaigns.length}</strong><p>Drafts and active programs.</p></div>
     <div><small>ACTIVE / READY</small><strong>{activeCampaigns.length}</strong><p>Workflow statuses—not ad platform confirmation.</p></div>
     <div><small>RESULTS DOCUMENTED</small><strong>{measuredCampaigns.length}</strong><p>Campaigns with source-referenced self-entered outcomes.</p></div>
    </div>
    <h4 className="rcl-growth-minihead">Launch a playbook</h4>
    <div className="rcl-growth-playgrid">{playbooks.map(p=><article key={p.key}>
     <small>{p.channel.replace(/_/g,' ').toUpperCase()}</small><h4>{p.name}</h4><p>{p.why}</p><span>Primary KPI: {p.kpi}</span>
     <button type="button" onClick={()=>startCampaign(undefined,p.key)}>Create draft ↗</button></article>)}</div>
    <h4 className="rcl-growth-minihead">Your saved campaigns</h4>
    {campaigns.length?<div className="rcl-growth-rows">{campaigns.map(c=><div key={c.id} className="rcl-growth-prospect">
     <div><strong>{c.title}</strong><small>{c.status} · {c.channel.replace(/_/g,' ')} · Planned budget: {c.budget!==null?dollars(num(c.budget)):'Not set'}</small>
      {c.actual_spend!==null&&c.actual_tickets!==null&&num(c.actual_tickets)>0&&<small>Reported cost per paid ticket: {dollars(num(c.actual_spend)/num(c.actual_tickets))} · Requires entered evidence</small>}
      {c.evidence_reference&&<small>Evidence: {c.evidence_reference}</small>}</div>
     <button type="button" onClick={()=>startCampaign(c)}>Open dashboard</button></div>)}</div>:<p className="rcl-growth-empty">No saved campaigns yet. Begin with a prestructured fan acquisition, sponsor outreach or event activation playbook.</p>}
    {campaignEdit!==null&&<form onSubmit={e=>void saveCampaign(e)} className="rcl-growth-editor">
     <div className="rcl-growth-section-head"><h3>{campaignEdit==='new'?'Prepare your next activation':'Track real campaign results'}</h3><button type="button" onClick={()=>setCampaignEdit(null)}>Close</button></div>
     <div className="rcl-growth-formgrid">
      {field('Campaign title',campaignForm.title,v=>campaignSet('title',v),{required:true})}
      {options('Program',campaignForm.playbook,v=>campaignSet('playbook',v),[...playbooks.map(p=>[p.key,p.name] as const),['other','Custom']])}
      {options('Primary channel',campaignForm.channel,v=>campaignSet('channel',v),[['social','Social'],['community','Community'],['email','Email'],['partners','Partners'],['venue','Venue'],['multi_channel','Multichannel']])}
      {options('Status',campaignForm.status,v=>campaignSet('status',v),campaignStatuses)}
      {field('Audience (broad, non-sensitive)',campaignForm.audience,v=>campaignSet('audience',v))}
      {field('Offer / creative angle',campaignForm.offer,v=>campaignSet('offer',v))}
      {field('Call to action',campaignForm.call_to_action,v=>campaignSet('call_to_action',v))}
      {field('Start date',campaignForm.starts_on,v=>campaignSet('starts_on',v),{type:'date'})}
      {field('End date',campaignForm.ends_on,v=>campaignSet('ends_on',v),{type:'date'})}
      {field('Planned budget ($)',campaignForm.budget,v=>campaignSet('budget',v),{type:'number',min:0})}
      {field('Target tickets',campaignForm.target_tickets,v=>campaignSet('target_tickets',v),{type:'number',min:0})}
      {field('Target qualified leads',campaignForm.target_leads,v=>campaignSet('target_leads',v),{type:'number',min:0})}
     </div>
     <h4 className="rcl-growth-minihead">Verified outcome entries (leave blank until evidence exists)</h4>
     <div className="rcl-growth-formgrid">
      {field('Actual spend ($)',campaignForm.actual_spend,v=>campaignSet('actual_spend',v),{type:'number',min:0})}
      {field('Actual tickets',campaignForm.actual_tickets,v=>campaignSet('actual_tickets',v),{type:'number',min:0})}
      {field('Actual qualified leads',campaignForm.actual_leads,v=>campaignSet('actual_leads',v),{type:'number',min:0})}
      {field('Actual reported reach',campaignForm.actual_reach,v=>campaignSet('actual_reach',v),{type:'number',min:0})}
      {field('Evidence reference (required for results)',campaignForm.evidence_reference,v=>campaignSet('evidence_reference',v),{placeholder:'Ticket report ID, ad report URL, receipts'})}
      {field('Plan and notes',campaignForm.notes,v=>campaignSet('notes',v))}
     </div><button type="submit" disabled={busy} className="rcl-growth-primary">{busy?'Saving…':'Save campaign plan & measurements'}</button>
    </form>}
   </div>}
   {tab==='playbook'&&<div className="rcl-growth-body">
    <div className="rcl-growth-section-head"><div><p className="cmd-eyebrow">FRANCHISE SUCCESS ENGINE</p><h3>Next best actions</h3></div><span className="rcl-growth-method">Rule-based recommendations, not AI-generated guarantees</span></div>
    <div className="rcl-growth-recommendations">{insights.map((i,index)=><article key={i.title}>
     <span className="rcl-growth-number">{String(index+1).padStart(2,'0')}</span><div><strong>{i.title}</strong><p>{i.action}</p><small>{i.caption}</small></div></article>)}</div>
    <div className="rcl-growth-two"><div><h4>30-day growth sequence</h4>
     <ol><li><strong>Days 1–7:</strong> Audit local court records, check source quality, identify 10 potential businesses and verify publicly listed contact routes.</li>
      <li><strong>Days 8–14:</strong> Hold discovery conversations, design one real sponsor offer, publish a localized founding-fan creative.</li>
      <li><strong>Days 15–21:</strong> Coordinate a permitted community activation, RCH TV profile, or home-event promotion.</li>
      <li><strong>Days 22–30:</strong> Reconcile inquiries, meetings, ticket results and costs. Keep what converted; cut what did not.</li></ol>
     <button type="button" className="rcl-growth-primary" onClick={()=>startCampaign(undefined,'founding_fans')}>Create 30-day kickoff campaign</button>
    </div><div><h4>Ready-to-personalize outreach</h4><p>Use professional introductory messages—not purchased lists or mass unsolicited pitches. Customize the actual benefit, recipient and event.</p>
      <button type="button" onClick={()=>copyScript('sponsor')}>Copy sponsor introduction</button>
      <button type="button" onClick={()=>copyScript('fans')}>Copy local fan announcement</button>
      <p className="rcl-growth-small">Franchises should avoid targeting individuals using sensitive traits or advertising to minors through behavioral profiles. Use broad geographic and contextual reach plus permission-based follow-up.</p>
    </div></div>
   </div>}
  </>}
  <footer className="rcl-growth-footer">RCH internal strategy intelligence · Admin/approved-franchise scoped · Census facts require a named source and vintage · RCH court records are incomplete discovery data · No autonomous outreach, guaranteed audience or financial projections.</footer>
 </section>;
}
