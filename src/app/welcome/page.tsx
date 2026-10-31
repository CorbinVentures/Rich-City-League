import type {Metadata} from 'next';
import Link from 'next/link';
import {RCHWelcomeActions} from '@/components/RCHWelcomeActions';
import {getSafePostAuthPath} from '@/lib/auth-redirect';

export const metadata:Metadata={title:'Welcome to Rich City Hoops',robots:{index:false,follow:false}};
export default async function WelcomePage({searchParams}:{searchParams:Promise<{role?:string;next?:string}>}) {
  const params=await searchParams;
  const role=params.role==='coach'||params.role==='fan'?params.role:'player';
  const next=getSafePostAuthPath(params.next,'/runs');
  return <main className="min-h-svh bg-[#080e16] px-5 pb-24 pt-12 text-white sm:pt-20">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm font-bold text-rose-300">← Rich City Hoops</Link>
      <p className="mt-10 text-xs font-black uppercase tracking-[.22em] text-rose-400">Welcome to your basketball world</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Your next move starts here.</h1>
      <RCHWelcomeActions role={role} originalNext={next}/>
    </div>
  </main>;
}
