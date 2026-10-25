'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaCamera,FaVideo} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

type CourtMoment={id:string;run_id:string;body:string|null;media_urls:unknown;created_at:string};

export function RunCultureMoments(){
 // The live posts migration includes run_id; generated Database types have not caught up.
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [moments,setMoments]=useState<CourtMoment[]>([]);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  if(!db){setLoaded(true);return;}
  let active=true;
  void (async()=>{
   // Only posts already published and visible through the caller's RLS.
   // Social posts are personal stories, never proof of celebrity attendance.
   const {data,error}=await db.from('posts')
    .select('id,run_id,body,media_urls,created_at')
    .eq('status','published').not('run_id','is',null)
    .order('created_at',{ascending:false}).limit(30);
   if(active){
    if(!error)setMoments(((data??[]) as CourtMoment[])
     .filter(post=>Array.isArray(post.media_urls)&&post.media_urls.length>0)
     .slice(0,3));
    setLoaded(true);
   }
  })();
  return()=>{active=false;};
 },[db]);

 return <section className="rch-run-culture" aria-label="Real court stories">
   <div className="rch-run-culture-head">
    <div><p>COURT CULTURE</p><h2>From the court</h2>
     <span>Actual runs. Real highlights. The community tells the story.</span></div>
    <Link href="/social">The timeline <FaArrowRight aria-hidden="true"/></Link>
   </div>
   {moments.length>0?<div className="rch-run-culture-grid">
     {moments.map(post=><Link key={post.id} href={`/runs/${encodeURIComponent(post.run_id)}`}
       className="rch-run-culture-card" aria-label="Open community Run highlights">
       <span><FaVideo aria-hidden="true"/> RUN TAPE</span>
       <strong>{(post.body||'Real moments from a Rich City Hoops Run').slice(0,130)}</strong>
       <small>Open the Run Room <FaArrowRight aria-hidden="true"/></small>
     </Link>)}
    </div>:loaded?<div className="rch-run-culture-empty">
      <FaCamera aria-hidden="true"/>
      <p>No published Run clips to feature yet. Your next real game could start the tape.</p>
      <Link href="/runs?solo=1">Find a Run <FaArrowRight aria-hidden="true"/></Link>
    </div>:<p role="status" className="rch-run-culture-empty">Loading court moments…</p>}
   <details className="rch-run-guest-note">
    <summary>Guest appearances &amp; court etiquette</summary>
    <p>Special guests, creators and recognizable hoopers can make a Run memorable. Share genuine moments with permission from people shown. An uploaded photo or community report is not proof of a celebrity appearance. Only independently reviewed, consented appearances should receive official recognition. Never post anyone&apos;s live location to track them.</p>
    <Link href="/create/social?mode=moment">Share a court moment <FaArrowRight aria-hidden="true"/></Link>
   </details>
  </section>;
}
