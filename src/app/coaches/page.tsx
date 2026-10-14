import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCircleCheck,FaPeopleGroup} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getCoachesList, getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { CoachesDirectory } from '@/components/PublicDirectory';
import { RCHCoachesNetwork,type RCHDirectoryCoach } from '@/components/RCHCoachesNetwork';

export const revalidate=60;
export const metadata={
 title:'RCH Coaches Network | Meet Basketball Coaches in Virginia',
 description:'Discover independent basketball coaches, trainers, school and club leaders in Virginia on their regular Rich City Hoops member profiles. Join free to share your coaching identity.',
 alternates:{canonical:'/coaches'}
};

export default async function CoachesPage(){
 const client=getPublicClient();
 const [official,memberResult,snapshot]=await Promise.all([
   getCoachesList(),
   client
     ? (client as any).from('rch_coach_identities')
        .select('profile_id,headline,organization,city,years_experience,coaching_level,specialties,availability,published,profile:profiles!inner(id,display_name,username,avatar_url,location)')
        .eq('published',true).order('updated_at',{ascending:false}).limit(250)
     : Promise.resolve({data:[],error:null}),
   getLeagueSnapshot(),
 ]);
 if(memberResult.error)console.error('RCH coach directory load failed:',memberResult.error.message);
 const coaches=(memberResult.data??[]) as RCHDirectoryCoach[];
 const officialItems=official.map((coach:any)=>{
  const profile=coach.profile;
  const record=snapshot.standings.find(standing=>standing.team_id===coach.team_id);
  return {id:coach.id,profileId:coach.profile_id,name:profile?.display_name??([profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'RCL coach'),title:coach.title||'Coach',team:coach.team?.name??null,teamSlug:coach.team?.slug??null,wins:record?.wins??null,losses:record?.losses??null};
 });
 return <main className="min-h-screen bg-[#071725] pb-28 text-white">
  <section className="border-b border-[#315a7b] bg-[radial-gradient(ellipse_at_88%_0%,#17466e_0%,transparent_57%),linear-gradient(140deg,#081b2e,#102f4d)]">
   <Container maxWidth="xl" className="py-9 sm:py-12">
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#a1d0fa]"><FaBasketball aria-hidden="true"/> RCH COACHES NETWORK · VIRGINIA</p>
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
     <div><h1 className="max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">The coaches behind <span className="text-[#94ceff]">the game.</span></h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d3e4f3] sm:text-base">Find coaches and skills trainers across Virginia. A coach is a regular RCH member with a coaching identity—not an automatically appointed RCL staff member.</p>
      <div className="mt-5 flex flex-wrap gap-3">
       <Link href="/profile" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#a7d7ff] bg-[#2878b9] px-5 text-sm font-black text-white">Add coaching to my profile <FaArrowRight aria-hidden="true"/></Link>
       <Link href="/auth/sign-up?next=/profile" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#5e8bb0] bg-[#0a243c] px-5 text-sm font-black text-white">Join RCH free</Link>
      </div>
     </div>
     <div className="flex gap-3">
      <div className="min-w-28 rounded-2xl border border-[#5a85a7] bg-[#0b2540] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#b2cce1]">Network coaches</p><strong className="mt-2 block text-3xl font-black text-white">{coaches.length}</strong><small className="text-xs text-[#b6d0e3]">Member profiles</small></div>
      <div className="min-w-28 rounded-2xl border border-[#5a85a7] bg-[#0b2540] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#b2cce1]">Official staff</p><strong className="mt-2 block text-3xl font-black text-white">{officialItems.length}</strong><small className="text-xs text-[#b6d0e3]">League appointed</small></div>
     </div>
    </div>
   </Container>
  </section>
  <Container maxWidth="xl" className="py-7 sm:py-9">
   <div className="mb-6"><h2 className="text-2xl font-black text-white">Meet RCH Coaches</h2>
    <p className="mt-2 text-sm leading-6 text-[#c1d8ed]">Free to join. Self-described experience and specialties. Coaching certifications and league affiliation are not automatically verified.</p></div>
   <RCHCoachesNetwork coaches={coaches}/>
   <details className="mt-9 overflow-hidden rounded-2xl border border-[#426c8c] bg-[#0b243a]">
    <summary className="flex min-h-20 cursor-pointer items-center justify-between gap-4 px-5 py-4 marker:text-[#aed8f6]">
     <span><span className="flex items-center gap-2 text-sm font-black text-white"><FaCircleCheck className="text-[#91cbfa]" aria-hidden="true"/> Official Rich City League staff</span><span className="mt-2 block text-xs leading-5 text-[#c2d7ea]">RCL-assigned coaching positions and official competition records · {officialItems.length} listed</span></span>
     <FaPeopleGroup className="shrink-0 text-[#99cff6]" aria-hidden="true"/>
    </summary>
    <div className="border-t border-[#416986] px-4 py-5"><CoachesDirectory items={officialItems}/></div>
   </details>
  </Container>
 </main>;
}
