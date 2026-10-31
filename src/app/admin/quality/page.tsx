import Link from 'next/link';
import { Container } from '@/components/Container';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { RCH_QUALITY_DIMENSIONS, assessRchQualityRelease } from '@/lib/rch-business-quality';

export const dynamic='force-dynamic';

export default async function QualityGatePage(){
  // /admin requires session, admin profile and MFA in middleware.
  // Display aggregate records only: never expose member identities or raw events.
  const db=getSupabaseAdminClient() as any;
  const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
  const queries=db?await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}).eq('is_system_account',false),
    db.from('posts').select('id',{count:'exact',head:true}).eq('is_automated',false).gte('created_at',since),
    db.from('posts').select('id',{count:'exact',head:true}).eq('is_automated',true).gte('created_at',since),
    db.from('run_games').select('id',{count:'exact',head:true}),
    db.from('run_ranked_matches').select('id',{count:'exact',head:true}),
    db.from('rch_sites').select('id',{count:'exact',head:true}).eq('status','published'),
  ]):[];
  const metrics=[
    ['Non-system member profiles','Real account records, not verified active users'],
    ['Human-authored posts · 7 days','Non-automated posts, not distinct contributors'],
    ['Automated posts · 7 days','Never count as human engagement'],
    ['Completed Run game records','Database records, not independently field-audited'],
    ['Ranked match records','Requires separate integrity and verification review'],
    ['Published organization sites','Publication alone does not prove organizer success'],
  ].map(([label,detail],i)=>({
    label,detail,value:queries[i]?.error || queries[i]?.count==null ? null : Number(queries[i].count),
  }));
  // There is intentionally no fabricated baseline score and no self-certification
  // UI. QA evidence must be reviewed and stored through an authorized release process.
  const gate=assessRchQualityRelease({});
  return <main className="min-h-screen bg-[#0b0c0e] pb-28 text-white">
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-rose-300 underline underline-offset-4">Return to administration</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-rose-300">Rich City Hoops · Business Psychology</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">8/10 Quality Gates</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">Every category must pass at least four of five independently evidenced checks (8/10). Both critical checks must pass. Market categories also require genuine external participation or business outcomes. An available feature, a deploy or an automated post is not proof of success.</p>
      <div role="status" className="mt-7 rounded-xl border border-amber-400/35 bg-amber-400/5 p-5 text-sm text-amber-100">
        Release verdict: {gate.ready?'QUALITY GATES CLEARED':'NOT CERTIFIED'}. All categories remain unverified until independent review evidence is recorded. No production readiness or market success is asserted by this page.
      </div>
      <h2 className="mt-10 text-2xl font-bold">Production evidence snapshot</h2>
      <p className="mt-2 text-sm text-white/60">Read-only aggregate counts. Unavailable data is not interpreted as zero. Values are operational indicators, not 8/10 grades.</p>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(m=><article key={m.label} className="rounded-xl border border-white/15 bg-white/[.035] p-5">
          <p className="text-xs font-semibold uppercase text-white/60">{m.label}</p>
          <p className="mt-3 font-display text-4xl font-black tabular-nums">{m.value==null?'Unavailable':m.value.toLocaleString()}</p>
          <p className="mt-2 text-xs leading-5 text-white/55">{m.detail}</p>
        </article>)}
      </section>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">All sixteen quality dimensions</h2>
        <Link href="/admin/growth" className="text-sm font-semibold text-rose-300 underline underline-offset-4">Member acquisition funnel</Link>
      </div>
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        {RCH_QUALITY_DIMENSIONS.map(d=>{
          const result=gate.dimensions.find(row=>row.id===d.id)!;
          return <article key={d.id} className="rounded-xl border border-white/15 bg-[#141618] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{d.title}</h3>
              <span className="rounded-full border border-amber-300/35 px-3 py-1 text-xs font-semibold text-amber-200">{result.score==null?'UNVERIFIED':result.score+'/10'}</span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wider text-white/50">{d.kind==='market'?'Product and real-world market evidence':'Product readiness evidence'}</p>
            <ol className="mt-4 space-y-2">
              {d.checks.map((check,i)=><li key={check} className="flex gap-2 text-sm text-white/75"><span className="shrink-0 text-white/45">{i+1}.</span><span>{check}{i<2?' (mandatory)':''}</span></li>)}
            </ol>
            <Link href={d.href} className="mt-5 inline-block text-sm font-semibold text-rose-300 underline underline-offset-4">Inspect relevant experience</Link>
          </article>;
        })}
      </section>
      <p className="mt-7 text-xs leading-6 text-white/55">To certify a dimension, each check requires a named reviewer, dated evidence and an explicit pass/fail result. Missing evidence blocks certification. Market outcomes must be demonstrated with real user/partner data; code cannot award them automatically.</p>
    </Container>
  </main>;
}
