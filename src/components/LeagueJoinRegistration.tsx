'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {RegistrationForm} from '@/components/RegistrationForm';
import type {Season,Division} from '@/types/database';

export function LeagueJoinRegistration(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [seasons,setSeasons]=useState<Season[]>([]);
 const [divisions,setDivisions]=useState<Division[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let live=true;
  async function load(){
   if(!db){if(live){setLoading(false);setError(true)}return;}
   try{
    const result=await db.from('seasons').select('*').eq('registration_open',true).order('start_date',{ascending:true}).limit(10);
    if(result.error)throw result.error;
    const open=(result.data??[]) as Season[];
    const divisionsResult=open.length
      ? await db.from('divisions').select('*').in('season_id',open.map(season=>season.id)).order('name')
      : {data:[] as Division[],error:null};
    if(divisionsResult.error)throw divisionsResult.error;
    if(live){setSeasons(open);setDivisions((divisionsResult.data??[]) as Division[]);setError(false);}
   }catch{if(live)setError(true);}
   finally{if(live)setLoading(false);}
  }
  void load();
  return()=>{live=false;};
 },[db]);
 return <section id="official-registration" className="mt-8 scroll-mt-24 rounded-xl border border-white/15 bg-white/[.025] p-4 sm:p-6" aria-labelledby="official-registration-title">
  <h2 id="official-registration-title" className="text-xl font-bold">Official league registration</h2>
  {loading?<p role="status" className="mt-3 text-sm text-white/60">Checking open seasons…</p>
   :error?<p role="alert" className="mt-3 text-sm text-white/70">Registration availability could not be verified. Check the official registration information before applying.</p>
   :seasons.length&&divisions.length?
    <><p className="mt-2 text-sm text-white/70">An in-app season is accepting registrations. Submitting an application does not guarantee a roster place or tryout selection.</p>
    {authLoading?<p className="mt-3 text-sm text-white/60">Checking your account…</p>
     :user?<RegistrationForm seasons={seasons} divisions={divisions}/>
     :<Link href="/auth/sign-in?redirect=%2Fleague%2Fjoin%23official-registration" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-rcl-orange px-4 text-sm font-semibold text-black">Sign in to apply</Link>}
    </>
   :<p className="mt-2 text-sm text-white/65">No in-app league season is currently listed as open for registration. You can still join Rich City Hoops, play Runs, and follow updates without waiting.</p>}
  <p className="mt-4 text-xs leading-5 text-white/55">League registration and official player tryouts may use different enrollment processes. Confirm eligibility, dates and fees in each official announcement.</p>
  <Link href="/register" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-rcl-orange">Other registration information →</Link>
 </section>;
}
