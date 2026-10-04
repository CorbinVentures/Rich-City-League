import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { OrganizationClaimForm } from '@/components/network/OrganizationClaimForm';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowLeft, FaChartLine, FaCircleCheck, FaPenToSquare, FaShieldHalved } from 'react-icons/fa6';

export const revalidate = 60;

export default async function OrganizationClaimPage({ params }:{ params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const client = getPublicClient(); const supabase:any = client; if (!supabase) notFound();
  const { data } = await supabase.from('network_organizations').select('id,slug,name,network_tier,is_claimed,status').eq('slug', slug).eq('status','active').maybeSingle();
  const organization = data as {id:string;slug:string;name:string;network_tier:string;is_claimed:boolean}|null;
  if (!organization) notFound();

  if (organization.network_tier === 'flagship') return <main className="min-h-screen bg-[#03070d] py-14 text-white"><Container maxWidth="md"><Link href={`/organizations/${slug}`} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45"><FaArrowLeft/> Back</Link><div className="mt-8 rounded-3xl border border-rcl-orange/25 bg-rcl-orange/[.05] p-7"><FaShieldHalved className="text-2xl text-rcl-orange"/><h1 className="mt-3 font-display text-4xl font-black uppercase">RCL Flagship property</h1><p className="mt-3 text-sm leading-6 text-white/50">Rich City League is operated directly by RCL and is not available through the public organization claim process.</p></div></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_80%_12%,rgba(44,166,255,.11),transparent_28%),linear-gradient(145deg,#071522,#03070d)]"><Container maxWidth="lg" className="py-12 sm:py-16"><Link href={`/organizations/${slug}`} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45"><FaArrowLeft/> Organization page</Link><p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Network · Free organization claim</p><h1 className="mt-3 font-display text-5xl font-black uppercase tracking-[-.035em] sm:text-6xl">Manage <span className="text-rcl-blue">{organization.name}</span></h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">Verify that you represent this organization. The standard Network listing and core management tools are free; paid distribution remains optional.</p></Container></section>
    <Container maxWidth="lg" className="py-8"><section className="mb-7 grid gap-3 sm:grid-cols-3"><Benefit icon={<FaPenToSquare/>} title="Control the listing" copy="Maintain the public description, city, links, logo, and cover image."/><Benefit icon={<FaCircleCheck/>} title="Publish activity" copy="Submit camps, tournaments, tryouts, runs, clinics, and other events for RCH review."/><Benefit icon={<FaChartLine/>} title="Measure exposure" copy="See RCH-generated views, impressions, clicks, shares, and media activity."/></section><div className="grid gap-6 lg:grid-cols-[1fr_300px]"><OrganizationClaimForm organizationId={organization.id} organizationSlug={organization.slug} organizationName={organization.name}/><aside className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">What verification changes</p><p className="mt-3 text-sm leading-6 text-white/45">An approved claim creates organization-manager access for your RCH account. It does not give RCH control over your registration, money, rosters, eligibility, schedules, or internal operations.</p><p className="mt-4 text-xs leading-5 text-white/30">RCH may ask for an official website, social profile, organization email, or another reasonable proof that connects you to the organization.</p></aside></div></Container>
  </main>;
}

function Benefit({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-rcl-blue/[.035] p-5"><span className="text-xl text-rcl-blue">{icon}</span><h2 className="mt-3 font-display text-2xl font-black uppercase">{title}</h2><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>; }
