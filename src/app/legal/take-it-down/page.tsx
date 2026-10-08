'use client';
import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function TakeItDownPage(){
 const {user}=useAuth(); const supabase=useMemo(()=>getSupabaseClient(),[]);
 const [url,setUrl]=useState(''); const [statement,setStatement]=useState(''); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault(); if(!supabase||!user)return; setBusy(true);setMsg('');
 const {data,error}=await (supabase as any).rpc('create_intimate_image_removal_request',{target_url:url,victim_statement:statement});
 setBusy(false); if(error)setMsg(error.message); else {setMsg('Request received. Reference: '+data+'. RCL will review valid requests promptly and within the legally required window.');setUrl('');setStatement('');}}
 return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl font-bold">Remove an intimate image</h1><p className="mt-4">Use this process to request removal of an intimate image or video of you that was shared without your consent, including a digitally altered or AI-generated image. Valid requests are handled under the TAKE IT DOWN Act, including removal of known identical copies as required.</p>
 {!user?<p className="mt-6">Please <Link className="underline" href="/auth/sign-in">sign in</Link> to submit and track a request.</p>:<form onSubmit={submit} className="mt-8 space-y-5"><label className="block">URL or location of the content<input required value={url} onChange={e=>setUrl(e.target.value)} className="mt-2 w-full rounded border p-3" placeholder="Paste the RCL content URL"/></label><label className="block">Statement<textarea required value={statement} onChange={e=>setStatement(e.target.value)} className="mt-2 min-h-36 w-full rounded border p-3" placeholder="State that you are the person depicted or an authorized representative and that the intimate content was shared without consent."/></label><button disabled={busy} className="rounded bg-white px-5 py-3 font-semibold text-black">{busy?'Submitting…':'Submit removal request'}</button></form>}
 {msg&&<p className="mt-5" role="status">{msg}</p>}<section className="mt-10"><h2 className="text-xl font-semibold">Immediate safety</h2><p className="mt-2">If a child may be depicted, or someone is in immediate danger, also contact the appropriate emergency or child-protection authorities. Do not upload the intimate image itself to this form.</p></section></main>;
}