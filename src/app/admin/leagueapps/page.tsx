'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RetiredLeagueAppsPage() {
 const router=useRouter();
 useEffect(()=>{router.replace('/command');},[router]);
 return <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
  <p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">RCH COMMAND CENTER</p>
  <h1 className="mt-3 text-3xl font-black text-white">League management has moved.</h1>
  <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">LeagueApps integration has been retired. Rich City League operations are managed through RCH’s own platform.</p>
  <Link href="/command" className="mt-6 rounded-lg bg-blue-500 px-4 py-3 text-sm font-bold text-white">Open Command Center</Link>
 </main>;
}
