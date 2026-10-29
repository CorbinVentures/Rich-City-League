'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {Container} from '@/components/Container';
const field='mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#151821] px-4 text-white';
export default function PublicToolkitRegistration(){
  const params=useParams<{slug:string}>();
  const slug=params?.slug??'';
  const [form,setForm]=useState<{title:string;organizationName:string}|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [adult,setAdult]=useState(false);
  const [consent,setConsent]=useState(false);
  const [website,setWebsite]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!slug)return;
    const controller=new AbortController();
    void fetch('/api/rch-sites/toolkit/registration?slug='+encodeURIComponent(slug),
      {cache:'no-store',signal:controller.signal}).then(async r=>{
      const body=await r.json();
      if(!r.ok)throw Error(body.error||'Registration is not available.');
      if(!controller.signal.aborted)setForm(body);
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Registration closed');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[slug]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');
    try{
      const r=await fetch('/api/rch-sites/toolkit/registration',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({slug,name,email,isAdult:adult,privacyConsent:consent,website})});
      const body=await r.json();
      if(!r.ok)throw Error(body.error||'Unable to submit registration');
      setDone(true);
    }catch(e){setError(e instanceof Error?e.message:'Registration unavailable');}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-[#090b11] pb-20 text-white">
    <Container maxWidth="sm" className="py-12">
      <Link href={'/sites/'+encodeURIComponent(slug)} className="text-sm text-sky-300">← Organization website</Link>
      {loading&&<p className="mt-8" role="status">Loading registration…</p>}
      {form&&<div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-rose-300">{form.organizationName}</p>
        <h1 className="mt-2 text-3xl font-black">{form.title}</h1>
        {done?<div role="status" className="mt-6 rounded-2xl border border-emerald-500/50 p-5">
          <h2 className="text-xl font-bold">Your interest was received.</h2>
          <p className="mt-2 text-sm text-white/70">The organization may contact you. Registration does not confirm a paid booking, roster spot or participation eligibility.</p>
        </div>:<form onSubmit={submit} className="mt-6 space-y-5">
          <p className="text-sm text-white/70">Adult registration interest only. This form does not accept youth or guardian applications.</p>
          <label className="block text-sm">Name<input className={field} required minLength={2} maxLength={90}
            autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
          <label className="block text-sm">Email<input className={field} type="email" required maxLength={254}
            autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} value={website}
            autoComplete="off" onChange={e=>setWebsite(e.target.value)}/></label>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" required
            checked={adult} onChange={e=>setAdult(e.target.checked)} className="mt-1"/>
            I confirm I am at least 18 years old.</label>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" required
            checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>
            I agree that my name and email will be shared with this organization for registration follow-up. I have reviewed the <Link href="/legal/privacy" className="text-sky-300 underline">privacy policy</Link>.</label>
          <button className="min-h-12 w-full rounded-xl bg-rose-600 px-5 font-bold disabled:opacity-60"
            disabled={busy} type="submit">{busy?'Submitting…':'Submit interest'}</button>
          <p className="text-xs text-white/50">Powered by Rich City Hoops. The organization manages its own program; no payment is collected here.</p>
        </form>}
      </div>}
      {error&&<p role="alert" className="mt-6 rounded-xl border border-red-500/40 p-4 text-sm text-red-200">{error}</p>}
    </Container>
  </main>;
}
