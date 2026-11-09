'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaArrowLeft, FaCircleCheck, FaCloudArrowUp, FaFilm, FaPaperPlane } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { getSupabaseConfig } from '@/lib/supabase-config';
import { uploadRchTvVideo, clearRchTvCheckpoint, rchTvVideoMimeType } from '@/lib/rch-tv-upload';

type Player = {id:string;first_name:string;last_name:string};
type Game = {id:string;scheduled_at:string;home?:{name:string}|null;away?:{name:string}|null};
const MAX_CLIP_BYTES = 250 * 1024 * 1024;
const HIGHLIGHTS_BUCKET = 'rch-player-highlights';
const categories = [['highlight','Highlight'],['top_play','Top Play'],['game_winner','Game Winner'],['ankle_breaker','Ankle Breaker'],['block','Block'],['dime','Dime'],['hustle','Hustle Play'],['micd_up','Mic’d Up'],['interview','Interview']];

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <label className="block text-xs font-bold text-[#d1d1d5]">{label}{children}</label>;
}

export default function SubmitHighlightPage() {
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(true),[]);
  const db=supabase as any;
  const cancelRef=useRef<AbortController|null>(null);
  const [players,setPlayers]=useState<Player[]>([]);
  const [games,setGames]=useState<Game[]>([]);
  const [title,setTitle]=useState('');
  const [category,setCategory]=useState('highlight');
  const [playerId,setPlayerId]=useState('');
  const [gameId,setGameId]=useState('');
  const [clip,setClip]=useState<File|null>(null);
  const [poster,setPoster]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [progress,setProgress]=useState(0);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!db)return;
    let active=true;
    void(async()=>{
      const since=new Date(Date.now()-120*24*60*60*1000).toISOString();
      const [p,g,own]=await Promise.all([
        db.from('public_players').select('id,first_name,last_name').eq('is_active',true).order('last_name').limit(500),
        db.from('games').select('id,scheduled_at,home:teams!games_home_team_id_fkey(name),away:teams!games_away_team_id_fkey(name)').gte('scheduled_at',since).order('scheduled_at',{ascending:false}).limit(100),
        user?db.from('players').select('id').eq('profile_id',user.id).eq('is_active',true).maybeSingle():Promise.resolve({data:null}),
      ]);
      if(!active)return;
      setPlayers((p.data??[]) as Player[]);
      setGames((g.data??[]) as Game[]);
      if(own.data?.id)setPlayerId(current=>current||own.data.id);
    })();
    return()=>{active=false;};
  },[db,user]);

  useEffect(()=>{
    if(!clip){setPreview('');return;}
    const url=URL.createObjectURL(clip);
    setPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[clip]);

  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!supabase||!user){setError('Sign in to upload a highlight.');return;}
    if(!title.trim()||!playerId||!clip){setError('Add a title, select a player and choose a video file.');return;}
    if(!rchTvVideoMimeType(clip)){setError('Choose an MP4, MOV or WebM video.');return;}
    if(clip.size<1||clip.size>MAX_CLIP_BYTES){setError('Videos must be between 1 byte and 250 MB.');return;}
    if(poster&&(!['image/jpeg','image/png','image/webp'].includes(poster.type)||poster.size>5*1024*1024)){
      setError('The optional cover must be a JPEG, PNG or WebP image no larger than 5 MB.');return;
    }
    const config=getSupabaseConfig();
    if(config.status!=='configured'||!config.url){setError('Video storage is unavailable. Try again later.');return;}
    const controller=new AbortController();
    cancelRef.current=controller;
    setBusy(true);setProgress(0);setError('');setNotice('');
    try{
      const uploaded=await uploadRchTvVideo({
        file:clip,userId:user.id,projectUrl:config.url,purpose:'highlight',
        signal:controller.signal,progress:setProgress,
        token:async()=>{
          const {data,error:sessionError}=await supabase.auth.getSession();
          if(sessionError||!data.session?.access_token)throw new Error('Your session has expired. Sign in again before uploading.');
          return data.session.access_token;
        },
      });
      const videoUrl=supabase.storage.from(HIGHLIGHTS_BUCKET).getPublicUrl(uploaded.objectPath).data.publicUrl;
      if(!videoUrl)throw new Error('Could not resolve the uploaded video.');
      let thumbnailUrl:string|null=null;
      let posterPath:string|null=null;
      if(poster){
        const ext=poster.type==='image/png'?'png':poster.type==='image/webp'?'webp':'jpg';
        posterPath=user.id+'/highlight-thumbnails/'+crypto.randomUUID()+'.'+ext;
        const result=await supabase.storage.from('media').upload(posterPath,poster,{upsert:false,contentType:poster.type,cacheControl:'3600'});
        if(result.error)throw new Error('Cover image could not be uploaded: '+result.error.message);
        thumbnailUrl=supabase.storage.from('media').getPublicUrl(posterPath).data.publicUrl;
      }
      const {error:insertError}=await db.from('player_highlights').insert({
        player_id:playerId,game_id:gameId||null,uploaded_by:user.id,title:title.trim(),
        category,clip_url:videoUrl,thumbnail_url:thumbnailUrl,status:'pending',
      });
      if(insertError){
        if(posterPath)await supabase.storage.from('media').remove([posterPath]);
        throw new Error('Video uploaded, but submission was not saved: '+insertError.message+'. Retry with the same file.');
      }
      clearRchTvCheckpoint(user.id,clip,'highlight');
      setNotice('Highlight received for review. Once approved, it can appear on RCH TV and the player’s Basketball Passport.');
      setTitle('');setGameId('');setClip(null);setPoster(null);setProgress(0);
    }catch(cause){
      setError(controller.signal.aborted?'Upload stopped. Choose the same video and submit again to resume.':cause instanceof Error?cause.message:'Unable to upload the highlight.');
    }finally{setBusy(false);cancelRef.current=null;}
  };

  return <main className="min-h-screen bg-[#0b0b0d] pb-28 text-white">
    <ClientPageHero eyebrow="RCH TV / Highlight Engine" title="Upload your highlight" accent="Show the play" description="Upload a clip directly from your phone, tablet or computer. Tag a player and optional official game. Every submission is reviewed before it appears on RCH TV." assetKey="media.cover" actions={<Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 px-4 text-xs font-bold"><FaArrowLeft/>RCH TV</Link>}/>
    <Container maxWidth="md" className="py-7 sm:py-10">
      {notice&&<p role="status" className="mb-5 rounded-xl border border-white/30 bg-white/10 p-4 text-sm text-white"><FaCircleCheck className="mr-2 inline"/>{notice}</p>}
      {error&&<p role="alert" className="mb-5 rounded-xl border border-red-300/35 bg-red-900/20 p-4 text-sm text-red-100">{error}</p>}
      {!user&&!authLoading?<div className="rounded-2xl border border-white/20 bg-[#18181a] p-8 text-center"><FaFilm className="mx-auto text-3xl"/><h2 className="mt-3 text-xl font-bold">Sign in to submit highlights</h2><Link href="/auth/sign-in?next=/media/submit" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-black">Sign in</Link></div>:
      <form onSubmit={submit} className="rounded-2xl border border-white/20 bg-[#171719] p-4 sm:p-7">
        <div className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b8b8bc]">PLAYER HIGHLIGHTS</p><h2 className="mt-2 text-2xl font-black">Submit a play</h2><p className="mt-2 text-sm text-[#c3c3c7]">No video link needed. MP4, MOV or WebM, up to 250 MB.</p></div>
        <Field label="Highlight title"><input required value={title} maxLength={120} onChange={event=>setTitle(event.target.value)} className="rch-highlight-input" placeholder="Example: Fourth-quarter game winner"/></Field>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Category"><select value={category} onChange={event=>setCategory(event.target.value)} className="rch-highlight-input">{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Player"><select required value={playerId} onChange={event=>setPlayerId(event.target.value)} className="rch-highlight-input"><option value="">Select player</option>{players.map(player=><option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select></Field>
        </div>
        <div className="mt-5"><Field label="Official game (optional)"><select value={gameId} onChange={event=>setGameId(event.target.value)} className="rch-highlight-input"><option value="">Not tied to a game</option>{games.map(game=><option key={game.id} value={game.id}>{game.away?.name??'Away'} vs {game.home?.name??'Home'} · {new Date(game.scheduled_at).toLocaleDateString()}</option>)}</select></Field></div>
        <div className="mt-6">
          <label htmlFor="rch-highlight-video" className="block text-xs font-bold text-[#d1d1d5]">Video file</label>
          <label htmlFor="rch-highlight-video" className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/35 bg-[#252527] p-5 text-center focus-within:border-white">
            <FaCloudArrowUp className="text-3xl text-white" aria-hidden="true"/>
            <strong className="mt-3 text-sm">{clip?clip.name:'Tap to choose your video'}</strong>
            <span className="mt-2 text-xs text-[#c8c8cc]">{clip?(clip.size/1024/1024).toFixed(1)+' MB selected':'Choose a video from Photos or Files'}</span>
            <input id="rch-highlight-video" type="file" accept="video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm" required onChange={event=>{setClip(event.target.files?.[0]??null);setProgress(0);setError('');}} disabled={busy} className="sr-only"/>
          </label>
          {preview&&<video controls preload="metadata" playsInline src={preview} className="mt-3 max-h-56 w-full rounded-xl bg-black" aria-label="Selected highlight preview"/>}
        </div>
        <div className="mt-5"><Field label="Cover image (optional)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>setPoster(event.target.files?.[0]??null)} disabled={busy} className="rch-highlight-input h-auto py-3 text-xs"/></Field></div>
        {busy&&<div className="mt-5" role="status" aria-live="polite"><div className="flex justify-between text-xs text-white"><span>Uploading your video</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#4a4a4d]"><div className="h-full bg-white transition-all" style={{width:progress+'%'}}/></div></div>}
        <p className="mt-5 text-xs leading-5 text-[#bdbdc1]">Submissions are pending until reviewed by RCL staff. Only upload media you have permission to share. For widest compatibility, MP4 is recommended.</p>
        <div className="mt-5 flex flex-wrap gap-2"><button type="submit" disabled={busy||!user||!clip} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-black disabled:opacity-40"><FaPaperPlane/>{busy?'Uploading…':'Submit for review'}</button>{busy&&<button type="button" onClick={()=>cancelRef.current?.abort()} className="min-h-12 rounded-xl border border-white/40 px-4 text-sm font-bold">Stop</button>}</div>
      </form>}
    </Container>
    <style jsx>{'.rch-highlight-input{margin-top:.5rem;min-height:3rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.35);background:#27272a;padding:0 .875rem;color:white;outline:none}.rch-highlight-input:focus{border-color:white}.rch-highlight-input::placeholder{color:#b6b6bc}.rch-highlight-input option{background:#242426;color:#fff}'}</style>
  </main>;
}
