import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowRight, FaCalendarDays, FaCheck, FaCrown, FaEnvelope, FaHeart, FaLocationDot, FaPeopleGroup, FaPhone, FaShieldHalved, FaStar } from 'react-icons/fa6';
import './royaltee-brand.css';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Royaltee Steppas & Cheerleading | Official Rich City League Partner',
  description: 'Royaltee Steppas & Cheerleading, the official Rich City League cheer and step partner. Explore approved adult (18+) performers, events and opportunities.',
  alternates: { canonical: '/league/royaltee' },
  openGraph: { title: 'Royaltee Steppas & Cheerleading | Rich City League', description: 'Adult cheer. Stepping. Sisterhood. A proud Rich City League partner.' }
};

type Program = { headline:string; about:string; registration_note:string; contact_email:string; contact_phone:string; registration_open:boolean };
type Cheerleader = { profile_id:string; headline:string; discipline:'cheer'|'step'|'both'; profile:{ id:string; display_name:string|null; username:string|null; avatar_url:string|null; location:string|null }|null };
type Event = { id:string; title:string; description:string; event_type:string; starts_at:string; location:string; status:string };
const fallback:Program = {
  headline:'Bring the energy. Own the floor.',
  about:'Royaltee Steppas & Cheerleading is the official Rich City League cheer and step partner. Its adult performers help create a game-day experience beyond the basketball court.',
  registration_note:'Contact Royaltee for current adult cheer and step opportunities, tryout details and availability.',
  contact_email:'royalteesteppas@gmail.com',
  contact_phone:'804-613-9199',
  registration_open:false
};
const readable=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());

export default async function RoyalteePage() {
  const client=getPublicClient() as any;
  const [p,m,e]=await Promise.all([
    client ? client.from('rcl_royaltee_program').select('headline,about,registration_note,contact_email,contact_phone,registration_open').eq('slug','royaltee-steppas').maybeSingle() : Promise.resolve({data:null}),
    client ? client.from('rcl_royaltee_cheer_profiles').select('profile_id,headline,discipline,profile:profiles!rcl_royaltee_cheer_profiles_profile_id_fkey!inner(id,display_name,username,avatar_url,location)').eq('status','approved').eq('published',true).order('created_at',{ascending:false}).limit(24) : Promise.resolve({data:[]}),
    client ? client.from('rcl_royaltee_events').select('id,title,description,event_type,starts_at,location,status').eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(12) : Promise.resolve({data:[]})
  ]);
  const program={...fallback,...((p.data??{}) as Partial<Program>)};
  const people=((m.data??[]) as Array<Cheerleader&{profile:any}>).map(person=>({...person,profile:Array.isArray(person.profile)?person.profile[0]:person.profile})).filter(person=>Boolean(person.profile));
  const events=(e.data??[]) as Event[];
  const contactMail='mailto:'+program.contact_email;
  return <main className="royaltee-site" id="royaltee-top">
    <header className="royaltee-nav-shell">
      <div className="royaltee-nav royaltee-wrap">
        <Link className="royaltee-brand" href="#royaltee-top" aria-label="Royaltee home">
          <span className="royaltee-brand-crown"><FaCrown aria-hidden="true"/></span><span><strong>ROYALTEE</strong><small>STEPPAS &amp; CHEERLEADING</small></span>
        </Link>
        <nav className="royaltee-nav-links" aria-label="Royaltee section navigation">
          <a href="#about">About</a><a href="#programs">Our Programs</a><a href="#performers">Performers</a><a href="#events">Events</a><a href="#contact">Contact</a>
        </nav>
        <Link href="/league" className="royaltee-rcl-link"><FaCrown aria-hidden="true"/><span>RICH CITY LEAGUE<small>OFFICIAL PARTNER</small></span></Link>
      </div>
    </header>

    <section className="royaltee-hero" aria-labelledby="royaltee-hero-title">
      <div className="royaltee-hero-glow" aria-hidden="true"/>
      <div className="royaltee-wrap royaltee-hero-layout">
        <div className="royaltee-hero-copy">
          <span className="royaltee-kicker"><FaCrown aria-hidden="true"/> THE OFFICIAL RCL CHEER &amp; STEP PARTNER</span>
          <h1 id="royaltee-hero-title">MORE THAN CHEER.<span>IT&apos;S A ROYAL MOVEMENT.</span></h1>
          <p className="royaltee-hero-strap">{program.headline}</p>
          <p className="royaltee-hero-description">{program.about}</p>
          <div className="royaltee-actions">
            <Link className="royaltee-cta royaltee-cta-primary" href="/league/royaltee/join">JOIN THE MOVEMENT <FaArrowRight aria-hidden="true"/></Link>
            <a className="royaltee-cta royaltee-cta-outline" href="#about">EXPLORE ROYALTEE <FaArrowRight aria-hidden="true"/></a>
          </div>
          <p className="royaltee-age-tag"><FaShieldHalved aria-hidden="true"/> Royaltee profiles and recruitment on RCH are 18+ only</p>
        </div>
        <div className="royaltee-hero-art">
          <div className="royaltee-art-orbit" aria-hidden="true"/>
          <img src="/brand/royaltee-logo.avif" alt="Royaltee Steppas and Cheerleading official blue, silver and orange crown logo featuring adult cheer and step performers" width="640" height="640" className="royaltee-official-logo" fetchPriority="high"/>
          <div className="royaltee-art-label"><FaStar aria-hidden="true"/><span>CHEER &nbsp;•&nbsp; STEP &nbsp;•&nbsp; PERFORM</span><FaStar aria-hidden="true"/></div>
        </div>
      </div>
      <div className="royaltee-hero-ticker"><span>DISCIPLINE</span><FaStar aria-hidden="true"/><span>CONFIDENCE</span><FaStar aria-hidden="true"/><span>TEAMWORK</span><FaStar aria-hidden="true"/><span>SISTERHOOD</span><FaStar aria-hidden="true"/><span>PERFORMANCE</span><FaStar aria-hidden="true"/><span>OPPORTUNITY</span></div>
    </section>

    <section className="royaltee-section royaltee-about" id="about">
      <div className="royaltee-wrap royaltee-about-layout">
        <div>
          <span className="royaltee-kicker">A RICH CITY LEAGUE PARTNER</span>
          <h2 className="royaltee-display">BUILT DIFFERENT.<span>ROYALTEE.</span></h2>
          <p className="royaltee-body">{program.about}</p>
          <a href={contactMail} className="royaltee-cta royaltee-cta-outline">CONNECT WITH US <FaArrowRight aria-hidden="true"/></a>
        </div>
        <div className="royaltee-values">
          <article><FaCrown aria-hidden="true"/><h3>DISCIPLINE</h3><p>Building confident leaders on and off the floor.</p></article>
          <article><FaHeart aria-hidden="true"/><h3>SISTERHOOD</h3><p>United by teamwork, commitment and purpose.</p></article>
          <article><FaStar aria-hidden="true"/><h3>PERFORMANCE</h3><p>Showcasing power, precision and community.</p></article>
        </div>
      </div>
    </section>

    <section className="royaltee-section royaltee-programs-section" id="programs">
      <div className="royaltee-wrap">
        <div className="royaltee-section-heading"><div><span className="royaltee-kicker">ENERGY BUILT FOR THE FLOOR</span><h2 className="royaltee-display">OUR ROYALTEE <span>PROGRAMS.</span></h2></div><p>Two disciplines, one movement. Adult opportunities on Rich City Hoops are exclusively for ages 18 and older.</p></div>
        <div className="royaltee-program-grid">
          <article className="royaltee-program-card royaltee-cheer-card"><div className="royaltee-program-visual"><span className="royaltee-program-number">01 / CHEER</span><div className="royaltee-program-art royaltee-program-art-cheer" role="img" aria-label="Royaltee adult cheer performer from the official organization artwork"/></div><div className="royaltee-program-content"><span>THE SPIRIT OF GAME DAY</span><h3>ADULT CHEER</h3><p>Confidence, precision and electric routines. Bring championship-level energy to the Rich City League experience.</p><Link href="/league/royaltee/join" className="royaltee-mini-link">EXPLORE 18+ CHEER <FaArrowRight aria-hidden="true"/></Link></div></article>
          <article className="royaltee-program-card royaltee-step-card"><div className="royaltee-program-visual"><span className="royaltee-program-number">02 / STEP</span><div className="royaltee-program-art royaltee-program-art-step" role="img" aria-label="Royaltee adult step performer from the official organization artwork"/></div><div className="royaltee-program-content"><span>RHYTHM, CULTURE &amp; POWER</span><h3>ADULT STEPPAS</h3><p>Every movement makes a statement. Celebrate rhythm, athleticism, culture and unity through step.</p><Link href="/league/royaltee/join" className="royaltee-mini-link">EXPLORE 18+ STEP <FaArrowRight aria-hidden="true"/></Link></div></article>
        </div>
      </div>
    </section>

    <section className="royaltee-join-band" id="join">
      <div className="royaltee-wrap royaltee-join-layout"><div><span className="royaltee-kicker"><FaCrown aria-hidden="true"/> YOUR NEXT CHAPTER STARTS HERE</span><h2>JOIN <span>ROYALTEE.</span></h2><p>Be part of a legacy. Train. Perform. Belong.</p></div><Link href="/league/royaltee/join" className="royaltee-cta royaltee-cta-primary">APPLY FOR 18+ AFFILIATION <FaArrowRight aria-hidden="true"/></Link></div>
    </section>

    <section className="royaltee-section royaltee-roster-section" id="performers">
      <div className="royaltee-wrap">
        <div className="royaltee-section-heading"><div><span className="royaltee-kicker">MEET THE MOVEMENT</span><h2 className="royaltee-display">OUR ROYALTEE <span>PERFORMERS.</span></h2></div><p>Real RCH members. Adult profiles only. Every featured performer is approved by Royaltee and has opted into public discovery.</p></div>
        {people.length?<div className="royaltee-roster">{people.map(person=><Link href={'/social/profile/'+person.profile_id} className="royaltee-person" key={person.profile_id}><div className="royaltee-person-photo">{person.profile?.avatar_url?<img src={person.profile.avatar_url} alt="" loading="lazy"/>:<span><FaCrown aria-hidden="true"/></span>}</div><div className="royaltee-person-info"><h3>{person.profile?.display_name||person.profile?.username||'Royaltee Performer'}</h3><p>{person.discipline==='both'?'CHEER + STEP':readable(person.discipline).toUpperCase()}</p><small>{person.headline||'Official Royaltee performer'}</small></div></Link>)}</div>:<div className="royaltee-empty-roster"><div className="royaltee-empty-icon"><FaCrown aria-hidden="true"/></div><div><h3>THE ROYALTEE ROSTER IS COMING.</h3><p>Verified adult performers will appear as Royaltee approves their RCH profiles and they choose to publish them. We never display youth profiles or placeholder people.</p></div><Link href="/league/royaltee/join" className="royaltee-cta royaltee-cta-outline">CREATE YOUR PROFILE <FaArrowRight aria-hidden="true"/></Link></div>}
      </div>
    </section>

    <section className="royaltee-section royaltee-events-section" id="events">
      <div className="royaltee-wrap">
        <div className="royaltee-section-heading"><div><span className="royaltee-kicker">SEE THE MOVEMENT LIVE</span><h2 className="royaltee-display">UPCOMING <span>EVENTS.</span></h2></div><p>Adult performances, rehearsals, auditions and game-day appearances. Only confirmed, published 18+ events appear here.</p></div>
        {events.length?<div className="royaltee-event-grid">{events.map(event=><article className="royaltee-event-card" key={event.id}><div className="royaltee-datebox"><strong>{new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'America/New_York'}).format(new Date(event.starts_at)).toUpperCase()}</strong><span>{new Intl.DateTimeFormat('en-US',{day:'2-digit',timeZone:'America/New_York'}).format(new Date(event.starts_at))}</span></div><div><span className="royaltee-event-kind">{readable(event.event_type)} · 18+</span><h3>{event.title}</h3><p><FaCalendarDays aria-hidden="true"/> {new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(event.starts_at))}</p>{event.location&&<p><FaLocationDot aria-hidden="true"/>{event.location}</p>}{event.description&&<small>{event.description}</small>}</div></article>)}</div>:<div className="royaltee-empty-events"><FaCalendarDays aria-hidden="true"/><div><h3>MORE ROYALTEE MOMENTS AHEAD.</h3><p>Upcoming adult performances and tryouts will appear here after Royaltee confirms and publishes them.</p></div></div>}
      </div>
    </section>

    <section className="royaltee-partner-strip"><div className="royaltee-wrap royaltee-partner-layout"><FaCrown aria-hidden="true"/><div><span>PROUD OFFICIAL PARTNER OF</span><h2>RICH CITY LEAGUE</h2><p>Two organizations. One unforgettable game-night experience.</p></div><Link href="/league" className="royaltee-cta royaltee-cta-outline">VISIT RCL <FaArrowRight aria-hidden="true"/></Link></div></section>
    <footer className="royaltee-footer" id="contact"><div className="royaltee-wrap royaltee-footer-layout"><div><p className="royaltee-footer-name"><FaCrown aria-hidden="true"/> ROYALTEE</p><p>STEPPAS &amp; CHEERLEADING</p><small>Represent. Perform. Empower. 18+ RCH division.</small></div><div className="royaltee-footer-contact"><a href={contactMail}><FaEnvelope aria-hidden="true"/> {program.contact_email}</a><a href={'tel:'+program.contact_phone.replace(/[^\d+]/g,'')}><FaPhone aria-hidden="true"/> {program.contact_phone}</a><span>{program.registration_note}</span></div><div className="royaltee-footer-buttons"><Link href="/league/royaltee/manage">ROYALTEE HQ <FaArrowRight aria-hidden="true"/></Link><Link href="/league">RICH CITY LEAGUE <FaArrowRight aria-hidden="true"/></Link></div></div><div className="royaltee-wrap royaltee-footer-base"><span>© {new Date().getFullYear()} Royaltee Steppas &amp; Cheerleading · Partner of Rich City League</span><Link href="#royaltee-top">BACK TO TOP ↑</Link></div></footer>
  </main>;
}