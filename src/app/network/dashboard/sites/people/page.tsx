'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaEnvelope,FaCheck,FaInbox,FaLock} from 'react-icons/fa6';

type Org={id:string;name:string;eligible:boolean;member_role:string};
type Inquiry={id:string;contact_email:string;purpose:string;status:string;submitted_at:string;reviewed_at:string|null};
const purposeLabel:Record<string,string>={
  training:'Training',program:'Program / tryouts',event:'Camp / event',general:'General information',
};
const statusLabel:Record<string,string>={new:'New',contacted:'Contacted',closed:'Closed'};
const dateLabel=(s:string)=>new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s));

export default function OrganizationInbox(){
  const {user,loading:authLoading}=useAuth();
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [organizationId,setOrganizationId]=useState('');
  const [inquiries,setInquiries]=useState<Inquiry[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [filter,setFilter]=useState('new');
  const loadOrganizations=useCallback(async()=>{
    const response=await fetch('/api/rch-sites',{cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Could not load organizations.');
    const approved=(result.organizations??[]).filter((o:Org)=>o.eligible&&['owner','manager'].includes(o.member_role));
    setOrgs(approved);
    setOrganizationId(value=>value||approved[0]?.id||'');
  },[]);
  const loadInquiries=useCallback(async(id:string)=>{
    const response=await fetch('/api/rch-sites/inquiries?organizationId='+encodeURIComponent(id),{cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Could not load inquiries.');
    setInquiries(result.inquiries??[]);
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(!user){setLoading(false);return;}
    void loadOrganizations().catch(e=>setError(e instanceof Error?e.message:'Unable to load organizations.'))
      .finally(()=>setLoading(false));
  },[authLoading,user,loadOrganizations]);
  useEffect(()=>{
    if(!organizationId){setInquiries([]);return;}
    setError('');setInquiries([]);
    void loadInquiries(organizationId).catch(e=>setError(e instanceof Error?e.message:'Unable to load inquiries.'));
  },[organizationId,loadInquiries]);
  const filtered=useMemo(()=>filter==='all'?inquiries:inquiries.filter(i=>i.status===filter),[inquiries,filter]);
  const mark=async(id:string,status:'contacted'|'closed')=>{
    if(busy||!organizationId)return;
    setBusy(id);setError('');setNotice('');
    try{
      const response=await fetch('/api/rch-sites/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'setStatus',inquiryId:id,organizationId,status})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||'Unable to update inquiry.');
      setNotice(status==='contacted'?'Marked as contacted.':'Inquiry closed.');
      await loadInquiries(organizationId);
    }catch(e){setError(e instanceof Error?e.message:'Unable to update inquiry.');}
    finally{setBusy('');}
  };
  return <main className="min-h-screen bg-[#0b0c10] pb-24 text-white">
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <Link href="/network/dashboard/sites" className="inline-flex items-center gap-2 text-sm text-white/60"><FaArrowLeft/> Website Studio</Link>
      <p className="mt-7 text-xs font-black uppercase tracking-widest text-rose-400">RCH Sites · Organization Hub</p>
      <h1 className="mt-2 text-4xl font-black">Your inbox.</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">Follow up on training, program, and event interest. Inquiries come from verified adult RCH members who agree to share their email.</p>
      {authLoading||loading?<p className="mt-7 text-sm text-white/60" role="status">Loading your inbox…</p>:!user?
        <section className="mt-7 rounded-xl border border-white/20 p-5">
          <p className="text-sm text-white/70">Sign in to manage your organization.</p>
          <Link href="/auth/sign-in?next=/network/dashboard/sites/people" className="mt-4 inline-flex rounded-xl bg-rose-600 px-5 py-3 text-sm font-black">Sign in</Link>
        </section>:<>
        {!orgs.length?<p className="mt-7 rounded-xl border border-white/20 p-5 text-sm text-white/70">You need an active, verified organization and owner or manager access to open an inbox.</p>:<>
          <label className="mt-7 block max-w-md text-xs font-bold">Organization
            <select value={organizationId} onChange={e=>{setOrganizationId(e.target.value);setNotice('');}}
              className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#191b24] p-3 text-sm text-white">
              {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Summary label="New" value={inquiries.filter(i=>i.status==='new').length}/>
            <Summary label="Contacted" value={inquiries.filter(i=>i.status==='contacted').length}/>
            <Summary label="Closed" value={inquiries.filter(i=>i.status==='closed').length}/>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter inquiries">
            {['new','contacted','closed','all'].map(status=><button key={status} type="button" onClick={()=>setFilter(status)}
              aria-pressed={filter===status}
              className={'rounded-xl border px-4 py-2 text-xs font-bold '+(filter===status?'border-rose-400 bg-rose-600/20':'border-white/20')}>
              {status==='all'?'All':statusLabel[status]}</button>)}
          </div>
          {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/25 p-4 text-sm text-emerald-200">{notice}</p>}
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/25 p-4 text-sm text-rose-200">{error}</p>}
          <section className="mt-6 grid gap-3 md:grid-cols-2">
            {!filtered.length&&<div className="rounded-2xl border border-white/15 bg-white/5 p-7">
              <FaInbox className="text-rose-300" size={24}/>
              <h2 className="mt-3 text-lg font-black">Nothing here yet</h2>
              <p className="mt-2 text-sm text-white/60">When adults contact your published RCH website, their requests appear here.</p>
            </div>}
            {filtered.map(item=><article key={item.id} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold">{purposeLabel[item.purpose]||'Inquiry'}</span>
                <span className="text-xs text-white/50">{dateLabel(item.submitted_at)}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 break-all text-sm font-semibold"><FaEnvelope className="shrink-0 text-rose-300"/>{item.contact_email}</div>
              <p className="mt-3 flex items-center gap-2 text-xs text-white/60"><FaLock/> Private contact info · {statusLabel[item.status]}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href={'mailto:'+encodeURIComponent(item.contact_email)+'?subject='+encodeURIComponent('Following up on your basketball inquiry')}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black">Email contact</a>
                {item.status==='new'&&<>
                  <button type="button" disabled={Boolean(busy)} onClick={()=>void mark(item.id,'contacted')}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-xs font-bold disabled:opacity-40"><FaCheck/> Mark contacted</button>
                  <button type="button" disabled={Boolean(busy)} onClick={()=>void mark(item.id,'closed')}
                    className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-xs font-bold text-white/65 disabled:opacity-40">Close</button>
                </>}
              </div>
            </article>)}
          </section>
          <p className="mt-7 text-xs leading-6 text-white/50">Interest inquiries are not bookings, paid registrations, confirmed tryouts, or athlete records. Verify any registration and payment separately.</p>
        </>}
      </>}
    </Container>
  </main>;
}
function Summary({label,value}:{label:string;value:number}){
  return <div className="rounded-xl border border-white/15 bg-white/5 p-4">
    <span className="text-xs font-bold text-white/60">{label}</span>
    <div className="mt-2 text-3xl font-black tabular-nums">{value}</div>
  </div>;
}
