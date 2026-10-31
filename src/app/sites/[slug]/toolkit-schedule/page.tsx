'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {Container} from '@/components/Container';
type Game={id:string;date:string;time:string;court:string;home:string;away:string};
export default function PublicBasketballSchedule(){
  const params=useParams<{slug:string}>();
  const slug=params?.slug||'';
  const [title,setTitle]=useState('');
  const [games,setGames]=useState<Game[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!slug)return;
    const controller=new AbortController();
    void fetch('/api/rch-sites/toolkit/schedule?slug='+encodeURIComponent(slug),
      {cache:'no-store',signal:controller.signal}).then(async r=>{
      const json=await r.json();
      if(!r.ok)throw Error(json.error||'Schedule is unavailable');
      if(!controller.signal.aborted){setTitle(json.organizationName);setGames(json.games);}
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unavailable');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[slug]);
  return <main className="min-h-screen bg-[#090b11] pb-20 text-white">
    <Container maxWidth="lg" className="py-10">
      <Link href={'/sites/'+encodeURIComponent(slug)} className="text-sm text-sky-300">← Organization website</Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-rose-300">{title||'Basketball schedule'}</p>
      <h1 className="mt-2 text-3xl font-black">Game Schedule</h1>
      <p className="mt-2 text-sm text-white/60">All games listed in Eastern Time. Confirm changes with the organizer.</p>
      {loading&&<p role="status" className="mt-6">Loading schedule…</p>}
      {error&&<p role="alert" className="mt-6 text-red-200">{error}</p>}
      {!loading&&!error&&<div className="mt-6 space-y-3">{games.map(game=><article key={game.id}
        className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-xs font-semibold text-rose-300">{game.date} · {game.time} ET · {game.court}</p>
        <p className="mt-2 text-lg font-bold">{game.home} vs {game.away}</p>
      </article>)}
      {!games.length&&<p className="text-sm text-white/60">No games are published yet.</p>}</div>}
    </Container>
  </main>;
}
