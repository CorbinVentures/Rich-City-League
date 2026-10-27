import Image from 'next/image';
import Link from 'next/link';
import {
  RCH_SITE_THEMES, type RchSiteDraft, type RchSiteSectionKey,
} from '@/lib/rch-site-builder';

export type RchSiteOrganization = {
  slug:string; name:string;short_name?:string|null;description?:string|null;
  city?:string|null;state?:string|null;logo_url?:string|null;cover_url?:string|null;
  instagram_url?:string|null;youtube_url?:string|null;
};
export type RchSiteEvent = {id:string;title:string;slug:string;starts_at:string;city:string|null};
type Props={organization:RchSiteOrganization;config:RchSiteDraft;events?:RchSiteEvent[];preview?:boolean};

function safeUrl(value:string|null|undefined){
  if(!value)return null;
  try{const url=new URL(value);return url.protocol==='https:'?url.toString():null;}catch{return null;}
}
const sectionNames:Record<RchSiteSectionKey,string>={
  hero:'Home',about:'About',services:'Training',schedule:'Events',
  roster:'Programs',media:'Media',contact:'Contact',
};
const siteNames:Record<RchSiteDraft['siteType'],string>={
  trainer:'Basketball development',coach:'Coaching & mentorship',
  aau:'Youth basketball program',organizer:'Basketball events',
};

export function RchSiteView({organization,config,events=[],preview=false}:Props){
  const colors=RCH_SITE_THEMES[config.theme];
  const cover=safeUrl(organization.cover_url);
  const logo=safeUrl(organization.logo_url);
  const socials=[
    {label:'Instagram',url:safeUrl(organization.instagram_url)},
    {label:'YouTube',url:safeUrl(organization.youtube_url)},
  ].filter((v):v is {label:string;url:string}=>Boolean(v.url));
  const sections=config.sections;
  const show=(key:RchSiteSectionKey)=>sections.includes(key);
  return <div className="rch-site-surface min-h-svh" style={{backgroundColor:colors.canvas,color:colors.ink}}>
    <header className="border-b border-current/15 px-4 py-4 sm:px-7">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {logo?<Image src={logo} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-xl object-cover"/>:
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-current/20 font-black" style={{color:colors.accent}}>{organization.name.slice(0,2).toUpperCase()}</div>}
          <span className="min-w-0 text-sm font-black tracking-tight sm:text-lg">{organization.name}</span>
        </div>
        <nav aria-label="Organization website" className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
          {sections.filter(k=>k!=='hero'&&k!=='roster').slice(0,4).map(key=><a key={key} href={'#'+key} className="hover:underline">{sectionNames[key]}</a>)}
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-7">
      {show('hero')&&<section className="relative my-5 overflow-hidden rounded-3xl border border-current/10" id="hero" style={{backgroundColor:colors.canvas}}>
        {cover&&<Image src={cover} alt="" width={1400} height={600} unoptimized className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="relative flex min-h-72 flex-col items-start justify-center gap-5 bg-gradient-to-r from-black/50 to-transparent p-7 text-white sm:min-h-96 sm:p-12">
          <p className="rounded-full border border-white/25 bg-black/30 px-3 py-1 text-xs uppercase tracking-wider">{siteNames[config.siteType]}</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">{config.tagline||organization.name}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-lg">{[organization.city,organization.state].filter(Boolean).join(', ')||'Part of the RCH basketball community'}</p>
          <a href="#contact" className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-bold text-white" style={{backgroundColor:colors.accent}}>{config.callToAction}</a>
        </div>
      </section>}
      {show('about')&&<section id="about" className="scroll-mt-24 border-b border-current/15 py-10">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>Our story</p>
        <h2 className="mt-2 text-3xl font-black">About {organization.short_name||organization.name}</h2>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 opacity-80">{config.about||organization.description}</p>
      </section>}
      {show('services')&&<section id="services" className="scroll-mt-24 border-b border-current/15 py-10">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>Development</p>
        <h2 className="mt-2 text-3xl font-black">Training & coaching</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">Interested in working together? Get in touch about upcoming training, availability and programs.</p>
        <a href="#contact" className="mt-5 inline-block rounded-xl border border-current/30 px-5 py-3 text-sm font-bold">Ask about sessions</a>
      </section>}
      {show('roster')&&<section id="roster" className="scroll-mt-24 border-b border-current/15 py-10">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>The program</p>
        <h2 className="mt-2 text-3xl font-black">Teams & opportunities</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">Contact the program about teams, tryouts and upcoming opportunities. Athlete and family records remain private.</p>
      </section>}
      {show('schedule')&&events.length>0&&<section id="schedule" className="scroll-mt-24 border-b border-current/15 py-10">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>On the calendar</p>
        <h2 className="mt-2 text-3xl font-black">Upcoming events</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {events.slice(0,6).map(event=><Link key={event.id} href={'/network/events/'+encodeURIComponent(event.slug)} className="rounded-2xl border border-current/20 p-4 hover:underline">
            <p className="text-xs font-semibold opacity-70">{new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(event.starts_at))}</p>
            <h3 className="mt-2 text-base font-black">{event.title}</h3>
            {event.city&&<p className="mt-2 text-xs opacity-70">{event.city}</p>}
          </Link>)}
        </div>
      </section>}
      {show('media')&&socials.length>0&&<section id="media" className="scroll-mt-24 border-b border-current/15 py-10">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>Keep up</p>
        <h2 className="mt-2 text-3xl font-black">Follow our journey</h2>
        <div className="mt-5 flex flex-wrap gap-3">{socials.map(s=><a key={s.label} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-current/30 px-5 py-3 text-sm font-bold" href={s.url}>{s.label}</a>)}</div>
      </section>}
      {show('contact')&&<section id="contact" className="scroll-mt-24 py-12">
        <p className="text-xs font-black uppercase tracking-widest" style={{color:colors.accent}}>Get connected</p>
        <h2 className="mt-2 text-3xl font-black">Let&apos;s talk basketball</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 opacity-75">Ready to learn more about {organization.name}? Visit our RCH organization listing or connect through our social channels.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={'/organizations/'+encodeURIComponent(organization.slug)} className="inline-flex min-h-12 items-center rounded-xl px-5 text-sm font-black text-white" style={{backgroundColor:colors.accent}}>View RCH listing</Link>
          {socials[0]&&<a href={socials[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-xl border border-current/30 px-5 text-sm font-bold">Contact on {socials[0].label}</a>}
        </div>
      </section>}
    </main>
    <footer className="border-t border-current/15 px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs opacity-75">
        <span>© {new Date().getFullYear()} {organization.name}</span>
        <Link href="/" className="font-bold">Powered by Rich City Hoops</Link>
      </div>
    </footer>
    {preview&&<div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/90 px-5 py-2 text-xs font-black text-white">Private draft preview</div>}
  </div>;
}
