import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaCamera, FaCircleCheck, FaFilm, FaMapLocationDot, FaMicrophoneLines, FaMobileScreenButton, FaPlay, FaShareNodes, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';

export const metadata:Metadata={
  title:{absolute:'Founding RCH Creators | Virginia Basketball Creator Network'},
  description:'Join RCH TV as a selected Virginia basketball creator for Shorts, Reels, game coverage, interviews, documentaries, photography, podcasts and original series.',
  alternates:{canonical:'/media/creators'},
};

const formats=[
  [FaMobileScreenButton,'Shorts & Reels','Vertical game moments, quick stories, rankings, reactions, player spotlights and culture.'],
  [FaFilm,'Original series','Documentaries, recurring shows, behind-the-scenes access and episodic Virginia basketball stories.'],
  [FaMicrophoneLines,'Voices & shows','Interviews, podcasts, commentary, film study and personality-led basketball programming.'],
  [FaCamera,'Photos & visual stories','Courtside photography, photo essays, tournament galleries and player storytelling.'],
];

const regions=[
  ['804 · Central Virginia','Richmond, Petersburg, Chesterfield, Henrico and surrounding basketball communities.'],
  ['757 · Hampton Roads','Virginia Beach, Norfolk, Hampton, Newport News, Chesapeake, Portsmouth and the Peninsula.'],
  ['NOVA','Fairfax, Arlington, Alexandria, Loudoun, Prince William and the greater Northern Virginia scene.'],
  ['540 · Valley & Western VA','Harrisonburg, Winchester, Roanoke, Blacksburg and communities across western Virginia.'],
  ['434 · Charlottesville / Lynchburg','UVA country, Lynchburg and Central-Southside basketball stories.'],
  ['Statewide','Creators who travel, cover circuits, AAU, tournaments, college hoops or multiple Virginia regions.'],
];

const principles=[
  ['Curated, not crowded','RCH selects creators based on originality, consistency, basketball access and storytelling—not follower count alone.'],
  ['Creators keep their identity','RCH is an additional home for your work, not a demand that you abandon Instagram, TikTok, YouTube or your own brand.'],
  ['Own what you publish','Creators must own the content or have permission to publish it. School, team, employer and client footage may require separate clearance.'],
  ['Build toward paid originals','Short-form and public work can grow audience first. Commissioned or premium originals use separate written terms when RCH is ready to fund them.'],
];

export default function RchTvCreatorsPage(){
  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Founding RCH Creators"
      title="Virginia basketball. Told by the people already in the gym."
      accent="Curated, not crowded."
      description="RCH TV is building a statewide creator network for original basketball content—from 30-second Reels to documentaries, podcasts, photo stories and recurring shows. The goal is to make RCH the destination for Virginia hoops even when Rich City League is not playing."
      assetKey="media.cover"
      actions={<><Link href="/media/creators/apply" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black text-white">Apply to create <FaArrowRight/></Link><Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black text-rcl-blue"><FaArrowLeft/>RCH TV</Link></>}
    />

    <Container maxWidth="xl" className="py-10 sm:py-12">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{principles.map(([title,copy])=><article key={title} className="rounded-2xl border border-rcl-blue/15 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Creator standard</p><h2 className="mt-2 text-xl font-black text-[#0F2547]">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p></article>)}</section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Every format can matter</p><h2 className="mt-2 font-display text-3xl font-black">A Reel can open the door. A series can build the room.</h2><p className="mt-3 text-sm leading-6 text-white/50">RCH does not define “original” by runtime. A creator who consistently makes great short-form basketball content can be as valuable to the network as a filmmaker producing a 30-minute feature.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{formats.map(([Icon,title,copy])=><article key={String(title)} className="rounded-2xl border border-rcl-blue/15 bg-white p-6"><Icon className="text-2xl text-rcl-blue"/><h3 className="mt-4 text-xl font-black text-[#0F2547]">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(copy)}</p></article>)}</div>
      </section>

      <section className="mt-10 overflow-hidden rounded-3xl border border-rcl-blue/15 bg-white">
        <div className="border-b border-rcl-blue/15 p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue"><FaMapLocationDot className="mr-2 inline"/>Virginia creator map</p><h2 className="mt-2 font-display text-3xl font-black text-[#0F2547]">RCH should feel statewide without pretending every region is the same.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">The network works when creators bring local knowledge, relationships and access from the places they already cover.</p></div>
        <div className="grid gap-px bg-[#D9E4EF] md:grid-cols-2 xl:grid-cols-3">{regions.map(([title,copy])=><div key={title} className="bg-white p-6"><h3 className="font-black text-[#0F2547]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></div>)}</div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-3xl border border-rcl-blue/20 bg-rcl-blue/[.04] p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaShareNodes/></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Distribution model</p><h2 className="text-2xl font-black">RCH is the home. Social is the amplifier.</h2></div></div><p className="mt-4 text-sm leading-6 text-white/55">Creators should generally be able to publish approved RCH work on their own channels too. Instagram, TikTok and YouTube help discovery; RCH organizes the creator, series, region and archive into one permanent Virginia basketball destination.</p></article>
        <article className="rounded-3xl border border-rcl-blue/15 bg-white p-7"><FaUsers className="text-2xl text-rcl-blue"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Founding cohort</p><h2 className="mt-2 text-2xl font-black text-[#0F2547]">The first creators help define the network.</h2><p className="mt-3 text-sm leading-6 text-slate-500">RCH is actively identifying creators across Virginia now. The first cohort should include established filmmakers, rising shooters, photographers, podcast voices and short-form creators—not one single style of media.</p></article>
      </section>

      <section className="mt-10 overflow-hidden rounded-3xl border border-rcl-blue/15 bg-white">
        <div className="border-b border-rcl-blue/15 p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Compensation path</p><h2 className="mt-2 font-display text-3xl font-black text-[#0F2547]">Audience first. Transparent creator economics next.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Revenue sharing is not live yet. When paid creator programming launches, RCH should use clear written terms and measurable qualified viewing rather than vague “exposure” promises.</p></div>
        <div className="grid gap-px bg-[#D9E4EF] md:grid-cols-4">{[['1','Public discovery','Shorts, trailers and selected work can build reach.'],['2','Pilot originals','RCH can test recurring concepts with selected creators.'],['3','Paid programming','Commissioned or premium work uses written compensation terms.'],['4','Creator analytics','Creators should eventually see qualified views, watch time and earnings.']].map(([num,title,copy])=><div key={num} className="bg-white p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-rcl-blue/10 text-xs font-black text-rcl-blue">{num}</span><h3 className="mt-4 font-black text-[#0F2547]">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></div>)}</div>
      </section>

      <section className="mt-10 rounded-3xl border border-rcl-blue/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.10),transparent_38%),#FFFFFF] p-7 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-6"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue"><FaPlay className="mr-2 inline"/>Founding RCH Creators</p><h2 className="mt-2 font-display text-3xl font-black text-[#0F2547]">If you make Virginia basketball move, RCH wants to see it.</h2><div className="mt-4 space-y-2">{['No minimum follower count','Shorts and Reels are welcome','Independent creators and media brands can apply','Under-18 creators can apply with parent/guardian contact'].map(item=><p key={item} className="flex gap-2 text-sm text-slate-500"><FaCircleCheck className="mt-1 shrink-0 text-rcl-blue"/>{item}</p>)}</div></div><Link href="/media/creators/apply" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black text-white">Apply to create <FaArrowRight/></Link></div></section>
    </Container>
  </main>;
}
