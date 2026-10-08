import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowLeft, FaBolt, FaFilm, FaMapLocationDot, FaMobileScreenButton } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { CreatorInterestForm } from '@/components/media/CreatorInterestForm';

export const metadata:Metadata={
  title:{absolute:'Apply to RCH TV | Founding Virginia Basketball Creators'},
  description:'Apply to join the curated Founding RCH Creators network for Virginia basketball Shorts, Reels, original series, interviews, documentaries, photography and local coverage.',
  alternates:{canonical:'/media/creators/apply'},
};

export default function CreatorApplyPage(){
  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Founding RCH Creators"
      title="Virginia basketball needs more than one camera."
      accent="Bring your city. Bring your voice."
      description="RCH TV is building a curated statewide creator network for Shorts, Reels, game-day coverage, interviews, documentaries, analysis, photography and basketball culture."
      assetKey="media.cover"
      actions={<><Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black text-rcl-blue"><FaArrowLeft/>Creator program</Link><Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black text-white">RCH TV</Link></>}
    />
    <Container maxWidth="lg" className="py-10 sm:py-12">
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<FaMobileScreenButton/>} title="Short-form counts" copy="A great 30-second Reel can matter as much as a long episode."/>
        <Card icon={<FaFilm/>} title="Originals grow here" copy="Recurring shows and films can develop into RCH Originals."/>
        <Card icon={<FaMapLocationDot/>} title="Own your region" copy="804, 757, NOVA, 540 and Southwest Virginia all need voices."/>
        <Card icon={<FaBolt/>} title="Stay yourself" copy="Creators can keep building their own channels while publishing with RCH."/>
      </section>
      <CreatorInterestForm/>
    </Container>
  </main>;
}

function Card({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}){return <article className="rounded-2xl border border-rcl-blue/15 bg-white p-5"><span className="text-xl text-rcl-blue">{icon}</span><h2 className="mt-3 text-lg font-black text-[#0F2547]">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></article>}
