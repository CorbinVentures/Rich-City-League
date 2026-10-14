import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowRight, FaCalendarDays, FaCheck, FaCrown, FaEnvelope, FaHeart, FaPeopleGroup, FaPhone, FaStar } from 'react-icons/fa6';

export const revalidate = 60;
export const metadata:Metadata = {
  title:'Royaltee Steppas & Cheerleading | Official Rich City League Partner',
  description:'Meet Royaltee, the official Rich City League cheer and step partner. Discover adult (18+) performer profiles, appearances and ways to connect.',
  alternates:{canonical:'/league/royaltee'}
};

type Program={headline:string;about:string;registration_note:string;contact_email:string;contact_phone:string;registration_open:boolean};
type Cheerleader={profile_id:string;headline:string;discipline:'cheer'|'step'|'both';years_experience:number|null;profile:{id:string;display_name:string|null;username:string|null;avatar_url:string|null;location:string|null}|null};
type Event={id:string;title:string;description:string;event_type:string;starts_at:string;location:string;status:string};
const fallback:Program={
  headline:'Bring the energy. Own the floor.',
  about:'Royaltee Steppas & Cheerleading is the official Rich City League cheer and step partner. Its adult performers help create a game-day experience beyond the basketball court.',
  registration_note:'Contact Royaltee for the latest adult cheer and step opportunities and tryout information.',
  contact_email:'royalteesteppas@gmail.com',
  contact_phone:'804-613-9199',
  registration_open:false
};
const highlights=[
  {icon:FaStar,title:'Game-day energy',copy:'Cheer, step and crowd engagement in the Rich City League atmosphere.'},
  {icon:FaPeopleGroup,title:'Adult sisterhood',copy:'Build confidence, discipline, teamwork and performance skills together.'},
  {icon:FaCalendarDays,title:'Performances and appearances',copy:'Follow official 18+ rehearsals, tryouts and performance opportunities.'}
];
const readable=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
export default async function RoyalteePage(){
  const client=getPublicClient() as any;
  const [programResult,memberResult,eventResult]=await Promise.all([
    client?client.from('rcl_royaltee_program').select('headline,about,registration_note,contact_email,contact_phone,registration_open').eq('slug','royaltee-steppas').maybeSingle():Promise.resolve({data:null}),
    client?client.from('rcl_royaltee_cheer_profiles').select('profile_id,headline,discipline,years_experience,profile:profiles!rcl_royaltee_cheer_profiles_profile_id_fkey!inner(id,display_name,username,avatar_url,location)').eq('status','approved').eq('published',true).order('created_at',{ascending:false}).limit(24):Promise.resolve({data:[]}),
    client?client.from('rcl_royaltee_events').select('id,title,description,event_type,starts_at,location,status').eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(12):Promise.resolve({data:[]})
  ]);
  const program={...fallback,...((programResult.data??{}) as Partial<Program>)};
  const people=((memberResult.data??[]) as Array<Cheerleader & {profile:any}>).map(person=>({...person,profile:Array.isArray(person.profile)?person.profile[0]:person.profile})).filter(person=>person.profile);
  const events=(eventResult.data??[]) as Event[];
  return <main className="min-h-screen overflow-hidden bg-[#050811] pb-24 text-white">
    <section className="relative isolate overflow-hidden border-b border-[#345a90] bg-[radial-gradient(ellipse_at_10%_15%,rgba(0,155,255,.40),transparent_40%),radial-gradient(ellipse_at_88%_75%,rgba(255,102,0,.32),transparent_39%),linear-gradient(135deg,#030811,#081a36_55%,#080710)]">
      <div className="pointer-events-none absolute -right-12 top-[-180px] h-[520px] w-[520px] rounded-full border-[32px] border-[#158ad4]/15 shadow-[0_0_180px_rgba(13,133,240,.2)]"/>
      <Container maxWidth="xl" className="relative py-12 sm:py-20">
        <Link href="/league" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#bcdbff]">← Rich City League</Link>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#4c99d7] bg-[#0b3c69]/70 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#d8efff]"><FaCheck/> Official Rich City League Partner</p>
            <div className="mt-6"><p className="text-xs font-black uppercase tracking-[.36em] text-[#ffb072]">Cheerleading · Stepping · Entertainment</p>
              <h1 className="mt-3 font-display text-6xl font-black italic leading-[.88] tracking-[-.07em] text-[#63bdff] [text-shadow:2px_2px_0_#fff,5px_7px_0_#be4e07,8px_11px_25px_#000] sm:text-7xl xl:text-8xl">Royaltee</h1>
              <p className="mt-5 font-display text-2xl font-black uppercase tracking-[.09em] text-white sm:text-3xl">Steppas &amp; Cheerleading</p>
            </div>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#daeafb]">{program.headline}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#abc5db]">{program.about}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/league/royaltee/join" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#ff7b20] px-6 text-sm font-black text-[#170900] shadow-[0_12px_30px_rgba(255,113,26,.2)]">Explore 18+ Opportunities <FaArrowRight/></Link>
              <a href={'mailto:'+program.contact_email} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#7eadd6] bg-[#0a2746]/70 px-5 text-sm font-bold text-white">Contact Royaltee <FaEnvelope/></a>
            </div>
          </div>
          <div className="relative mx-auto grid w-full max-w-md aspect-square place-items-center overflow-hidden rounded-[2rem] border border-[#6ebfff]/50 bg-[radial-gradient(circle,#1469a9_0%,#09294e_50%,#030b19_85%)] shadow-[0_35px_100px_rgba(0,0,0,.5)]">
            <div className="absolute inset-7 rounded-full border-[16px] border-[#ff8026]/50"/>
            <div className="absolute inset-12 rounded-full border-[3px] border-[#d6eaff]/70"/>
            <FaCrown className="absolute top-14 text-8xl text-[#e5f5ff] drop-shadow-[0_6px_3px_#1d86c3]" aria-hidden="true"/>
            <div className="relative mt-20 text-center"><p className="font-display text-6xl font-black italic text-white [text-shadow:4px_5px_0_#eb6511]">R</p><p className="mt-3 text-sm font-black uppercase tracking-[.33em] text-[#c5e8ff]">ROYALTEE</p><p className="mt-2 text-xs font-black tracking-widest text-[#ffae6a]">CHEER + STEP</p></div>
            <span className="absolute bottom-6 rounded-full bg-[#031b35] px-5 py-2 text-[10px] font-black uppercase tracking-[.2em] text-white">18+ Adult Division</span>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-12 sm:py-16">
      <div className="grid gap-4 md:grid-cols-3">{highlights.map(({icon:Icon,title,copy})=><article key={title} className="rounded-2xl border border-[#24547f] bg-[#081d34] p-6"><Icon className="text-2xl text-[#ffa36a]"/><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-6 text-[#bed1e4]">{copy}</p></article>)}</div>

      <section className="mt-16" id="join"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#ff9e59]">Join the team</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Your stage starts here.</h2></div><Link href="/league/royaltee/join" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#83bef0] px-5 text-sm font-bold text-white">Create an adult cheer profile <FaArrowRight/></Link></div>
        <div className="mt-6 grid gap-5 rounded-2xl border border-[#2e5c82] bg-[#0a2035] p-6 lg:grid-cols-[1.4fr_.6fr]">
          <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#ffad77]"><FaHeart/> Year-round cheer &amp; step</p><p className="mt-3 text-sm leading-7 text-[#d2e2ed]">{program.registration_note}</p><p className="mt-3 text-xs font-semibold text-[#a2c7e1]">RCH profiles and all published events in this section are strictly for ages 18 and older. Royaltee manages acceptance into its organization separately from RCH membership.</p></div>
          <div className="rounded-xl bg-[#04172a] p-5"><p className="text-xs font-black uppercase tracking-widest text-[#a6d8ff]">Recruitment status</p><p className="mt-2 text-xl font-black">{program.registration_open?'Adult inquiries open':'Contact for availability'}</p><a href={'tel:'+program.contact_phone.replace(/[^\d+]/g,'')} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#ffa96b]"><FaPhone/>{program.contact_phone}</a><a href={'mailto:'+program.contact_email} className="mt-3 block break-all text-sm text-[#b2dbff]">{program.contact_email}</a></div>
        </div>
      </section>

      <section className="mt-16" id="performers"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff9e59]">Verified adult performers</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Meet the Royaltee Team</h2></div><span className="rounded-full border border-[#3777aa] px-4 py-2 text-xs font-black text-[#a5ddff]">{people.length} published profiles</span></div>
        {people.length?<div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{people.map(person=><Link key={person.profile_id} href={'/social/profile/'+person.profile_id} className="group flex gap-4 rounded-2xl border border-[#2e668e] bg-[#0b2740] p-5 hover:border-[#f6934e]">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#21517b] text-2xl font-black">{person.profile?.avatar_url?<img src={person.profile.avatar_url} alt="" className="h-full w-full object-cover"/>:'R'}</div>
          <div className="min-w-0"><h3 className="truncate text-lg font-black">{person.profile?.display_name||person.profile?.username||'Royaltee Performer'}</h3><p className="mt-1 text-xs font-black uppercase tracking-[.13em] text-[#ffaf76]">{person.discipline==='both'?'Cheer + Step':readable(person.discipline)}</p><p className="mt-2 line-clamp-2 text-sm text-[#b9d7ee]">{person.headline||'Royaltee adult performer'}</p><span className="mt-3 inline-block text-xs font-bold text-[#98d8ff]">View RCH profile →</span></div>
        </Link>)}</div>:<div className="mt-7 rounded-2xl border border-dashed border-[#3d7399] bg-[#091a2a] p-8 text-sm text-[#b6cee0]">The adult performer roster will appear here as Royaltee approves members who choose to publish their profiles.</div>}
      </section>

      <section className="mt-16" id="events"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff9e59]">Performances &amp; appearances</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Adult Events Calendar</h2>
        {events.length?<div className="mt-7 grid gap-4 md:grid-cols-2">{events.map(event=><article key={event.id} className="rounded-2xl border border-[#336e9b] bg-[#0a243b] p-6"><p className="text-xs font-black uppercase tracking-[.12em] text-[#ffad75]">{readable(event.event_type)} · 18+</p><h3 className="mt-3 text-2xl font-black">{event.title}</h3><p className="mt-2 text-sm text-[#b6d5ec]">{new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(event.starts_at))}</p>{event.location&&<p className="mt-1 text-sm text-[#bad8ec]">{event.location}</p>}{event.description&&<p className="mt-4 text-sm leading-6 text-[#abc6db]">{event.description}</p>}</article>)}</div>:<div className="mt-7 rounded-2xl border border-dashed border-[#346991] bg-[#091a2a] p-8 text-sm text-[#bad0e2]">Adult tryouts, rehearsals, game-day appearances and community performances will be listed here once dates are confirmed by Royaltee.</div>}
      </section>
      <section className="mt-16 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#295b87] bg-[linear-gradient(120deg,#092743,#0c1a2c)] p-7"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#ffa874]">Partner operations</p><h2 className="mt-2 text-2xl font-black">Royaltee Organization HQ</h2><p className="mt-2 max-w-xl text-sm text-[#bfd5e7]">Authorized Royaltee leadership can maintain program details, review adult performer affiliations and manage 18+ events.</p></div><Link href="/league/royaltee/manage" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#84bcdf] px-5 text-sm font-black">Manage Royaltee <FaArrowRight/></Link></section>
    </Container>
  </main>;
}
