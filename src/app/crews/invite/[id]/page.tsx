import Link from 'next/link';
import {notFound} from 'next/navigation';
import {loadCrewInvite} from '@/lib/crew-invite';
import {crewJoinPath} from '@/lib/crew-invite-links';

export const dynamic = 'force-dynamic';
type Props = {params: Promise<{id: string}>};

export default async function CrewInvitePage({params}: Props) {
 const {id} = await params;
 const result = await loadCrewInvite(id);
 if (result.status !== 'found') {
  if (result.status === 'missing') notFound();
  return <main className="grid min-h-[70vh] place-items-center bg-[#060d16] px-5 text-white">
   <section className="w-full max-w-lg rounded-2xl border border-[#415d72] bg-[#102234] p-8 text-center">
    <h1 className="text-2xl font-black">Crew invite temporarily unavailable</h1>
    <p className="mt-3 text-sm text-[#c2d5e4]">We could not load this crew right now. Please try opening the invitation again.</p>
    <Link href="/crews" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#6a94b0] px-5 font-bold">Explore RCH Crews</Link>
   </section>
  </main>;
 }
 const {crew} = result;
 const destination = crewJoinPath(crew.id);
 const signup = '/auth/sign-up?redirect=' + encodeURIComponent(destination);
 return <main className="min-h-screen bg-[#060d16] px-4 py-12 text-[#f6f9fb] sm:py-20">
  <section aria-label={crew.name + ' invitation'} className="relative mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[#567894] bg-[radial-gradient(ellipse_at_84%_5%,#204c70_0%,transparent_50%),linear-gradient(145deg,#162f47,#091723_65%,#10151c)] p-6 shadow-[0_25px_85px_#0009] sm:p-12">
   <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[24px] border-[#8fc7ec]/10"/>
   <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[#7297b0]/30 pb-5">
    <span className="text-xs font-black uppercase tracking-[.24em] text-[#9dcee9]">RCH CREWS / OFFICIAL INVITE</span>
    <span className="rounded-full border border-[#7299b2] bg-[#193a52] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">RICH CITY HOOPS</span>
   </div>
   <div className="relative mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
    <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-[#8bb1ca] bg-[#0b1b29] shadow-[0_8px_25px_#0006]">
     {crew.logoUrl ? <img src={crew.logoUrl} alt={crew.name + ' logo'} className="h-full w-full object-contain p-2"/> :
      <span aria-hidden="true" className="font-display text-5xl font-black uppercase text-[#b9dff7]">{crew.name.slice(0, 2)}</span>}
    </div>
    <div className="min-w-0">
     <p className="text-xs font-black uppercase tracking-[.2em] text-[#9ac8e5]">You have been invited to</p>
     <h1 className="mt-2 break-words font-display text-4xl font-black uppercase leading-none sm:text-6xl">{crew.name}</h1>
     <p className="mt-3 text-sm font-bold text-[#c0d9ec]">{crew.city || 'Virginia'}{crew.homeCourt ? ' · ' + crew.homeCourt.replace(/-/g, ' ') : ''}</p>
    </div>
   </div>
   <p className="relative mt-10 max-w-xl text-lg leading-8 text-[#e0edf5]">{crew.motto || 'Build your crew. Run your court. Earn your name.'}</p>
   <div className="relative mt-10 grid gap-3 sm:grid-cols-2">
    <Link href={destination} className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#b1dcf5] px-5 text-center text-sm font-black uppercase tracking-wide text-[#081724]">View Crew &amp; Request to Join →</Link>
    <Link href={signup} className="inline-flex min-h-14 items-center justify-center rounded-xl border border-[#7198b4] px-5 text-center text-sm font-black uppercase tracking-wide text-white">Create a Free RCH Profile</Link>
   </div>
   <p className="relative mt-6 text-xs leading-5 text-[#b9cbd8]">Membership is not automatic. Crew requests follow the existing captain approval process. Already a member? Open your crew headquarters.</p>
   <footer className="relative mt-9 border-t border-[#7297b0]/30 pt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#8fb6d0]">CREWS · RUNS · COMMONWEALTH CUP</footer>
  </section>
 </main>;
}
