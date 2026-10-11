'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { defaultRchTvBroadcast, parseRchTvBroadcast, RCH_TV_MODES, type RchTvBroadcast, type RchTvMode } from '@/lib/rch-tv-broadcast';
import { RchBroadcastOverlay } from '@/components/media/RchBroadcastOverlay';

type CameraDevice = { deviceId: string; label: string };
const cssInput = 'min-h-10 w-full rounded-lg border border-white/20 bg-[#0b1925] px-3 py-2 text-sm text-white outline-none focus:border-rcl-blue';
const cssLabel = 'block text-[11px] font-bold uppercase tracking-[.08em] text-white/65';
const presets: RchTvBroadcast['preset'][] = ['broadcast','minimal','cinematic'];

export default function RchBroadcastStudio() {
  const { user, profile, loading: authLoading } = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const db = client as any;
  const authorized = Boolean(user && profile?.role === 'admin');
  const [mode, setMode] = useState<RchTvMode>('live_games');
  const [config, setConfig] = useState<RchTvBroadcast>(() => defaultRchTvBroadcast('live_games'));
  const [videoDevices, setVideoDevices] = useState<CameraDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<CameraDevice[]>([]);
  const [videoId, setVideoId] = useState('');
  const [audioId, setAudioId] = useState('');
  const [ready, setReady] = useState(false);
  const [onAir, setOnAir] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const preview = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const room = useRef<Room | null>(null);
  const streaming = useRef(false);
  const currentMode = useRef(mode);
  const currentConfig = useRef(config);
  currentMode.current = mode;
  currentConfig.current = config;

  const saveConfig = useCallback(async (next: RchTvBroadcast, active: boolean, channel: RchTvMode) => {
    if (!authorized || !db) throw new Error('Administrator access is required.');
    const sanitized = parseRchTvBroadcast(channel, { ...next, active });
    const { error: updateError } = await db.from('site_settings').upsert({
      key: RCH_TV_MODES[channel].key, value: sanitized,
    }, { onConflict: 'key' });
    if (updateError) throw new Error(updateError.message);
    return sanitized;
  }, [authorized, db]);

  useEffect(() => {
    if (authLoading) return;
    if (!authorized || !db) { setLoading(false); return; }
    let alive = true;
    setLoading(true);setError('');
    void db.from('site_settings').select('value')
      .eq('key', RCH_TV_MODES[mode].key).maybeSingle()
      .then(({ data, error: readError }: {data:{value:unknown}|null;error:{message:string}|null}) => {
        if (!alive) return;
        if (readError) setError(readError.message);
        setConfig(parseRchTvBroadcast(mode, data?.value));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [mode, authLoading, authorized, db]);

  useEffect(() => {
    return () => {
      // Do not silently leave a local camera recording when the studio page unmounts.
      stream.current?.getTracks().forEach(track => track.stop());
      room.current?.disconnect();
    };
  }, []);

  const edit = (changes: Partial<RchTvBroadcast>) => setConfig(previous => ({ ...previous, ...changes }));
  const numeric = (field: 'homeScore' | 'awayScore', change: number) =>
    edit({ [field]: Math.max(0, Math.min(999, config[field] + change)) });

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setVideoDevices(devices.filter(device => device.kind === 'videoinput')
      .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Camera ${index + 1}` })));
    setAudioDevices(devices.filter(device => device.kind === 'audioinput')
      .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Microphone ${index + 1}` })));
  }, []);

  async function startPreview() {
    if (!authorized || onAir) return;
    setBusy(true);setError('');setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access camera devices. Use HTTPS and a supported browser.');
      const next = await navigator.mediaDevices.getUserMedia({
        video: videoId ? { deviceId: { ideal: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: audioId ? { deviceId: { ideal: audioId }, echoCancellation: true } : { echoCancellation: true },
      });
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = next;
      if (preview.current) {
        preview.current.srcObject = next;
        void preview.current.play().catch(() => undefined);
      }
      setReady(true);
      await refreshDevices();
      setMessage('Camera preview ready. You are not live yet.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera or microphone access was denied.');
    } finally { setBusy(false); }
  }

  function stopPreview() {
    if (onAir) return;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (preview.current) preview.current.srcObject = null;
    setReady(false);
  }

  async function updateGraphics() {
    if (!authorized) return;
    setBusy(true);setError('');setMessage('');
    try {
      const saved = await saveConfig(config, onAir || config.active, mode);
      setConfig(saved);
      setMessage('Broadcast graphics updated. Viewers will see changes within several seconds.');
    } catch(e) {setError(e instanceof Error?e.message:'Unable to update graphics.');}
    finally { setBusy(false); }
  }

  async function goLive() {
    if (!client || !authorized || !ready || !stream.current || onAir || config.active) return;
    setBusy(true);setError('');setMessage('');
    const next = new Room({ adaptiveStream:true, dynacast:true });
    try {
      const session = await client.auth.getSession();
      if (!session.data.session?.access_token) throw new Error('Sign in again to start broadcasting.');
      const response = await fetch('/api/rch-tv/token',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},
        body:JSON.stringify({mode,role:'producer'}),cache:'no-store',
      });
      const info=await response.json();
      if (!response.ok) throw new Error(info.error||'Broadcast service is unavailable.');
      await next.connect(info.url,info.token);
      for (const track of stream.current.getTracks()) {
        await next.localParticipant.publishTrack(track,{
          source:track.kind==='video'?Track.Source.Camera:Track.Source.Microphone,
        });
      }
      room.current=next;
      streaming.current=true;
      next.on(RoomEvent.Disconnected, () => {
        if (!streaming.current) return;
        streaming.current=false;
        setOnAir(false);
        setError('Broadcast connection lost. Confirm the stream is offline before restarting.');
        void saveConfig(currentConfig.current,false,currentMode.current).catch(()=>undefined);
      });
      const saved=await saveConfig(config,true,mode);
      setConfig(saved);
      setOnAir(true);
      setMessage('On air. Open RCH TV on another device to test the picture and audio.');
    } catch(e) {
      streaming.current=false;
      await next.disconnect();
      room.current=null;
      setError(e instanceof Error?e.message:'Could not start live broadcasting.');
    } finally{setBusy(false);}
  }

  async function endBroadcast() {
    if (!authorized) return;
    setBusy(true);setError('');setMessage('');
    try{
      const saved=await saveConfig(config,false,mode);
      setConfig(saved);
      streaming.current=false;
      await room.current?.disconnect();
      room.current=null;
      setOnAir(false);
      setMessage('Off air. This session is finished.');
    } catch(e){setError(e instanceof Error?e.message:'Unable to take broadcast offline.');}
    finally{setBusy(false);}
  }

  const configuredFor = mode==='the_pulse'?'The Pulse':'Live Games';
  if (authLoading || loading) return <main className="min-h-[70vh] p-7 text-white">Loading RCH TV Studio…</main>;
  if (!authorized) return <main className="min-h-[70vh] p-7 text-white"><h1 className="text-2xl font-bold">Admin access required</h1><Link href="/media" className="mt-4 inline-block text-rcl-blue">Return to RCH TV</Link></main>;

  return (
    <main className="min-h-screen bg-[#060d15] pb-24 text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">RCH TV / Production</p>
            <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Broadcast Studio</h1>
            <p className="mt-2 text-sm text-white/55">Camera controls, program preview, and live overlays for games and The Pulse.</p>
          </div>
          <Link className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-bold" href="/media" target="_blank">Open viewer ↗</Link>
        </header>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Production format">
          {(['live_games','the_pulse'] as const).map(item=><button type="button" disabled={onAir||busy} key={item} onClick={()=>{stopPreview();setMode(item);setMessage('');}} className={`rounded-lg border px-5 py-3 text-sm font-bold disabled:opacity-60 ${mode===item?'border-rcl-blue bg-rcl-blue/15 text-rcl-blue':'border-white/15 bg-white/[.03]'}`}>{RCH_TV_MODES[item].label}</button>)}
          <span className={`ml-auto rounded-full border px-3 py-1.5 text-[11px] font-black tracking-wide ${onAir?'border-red-400/35 bg-red-500/10 text-red-300':'border-white/20 text-white/50'}`}>{onAir?'● LIVE':'● OFF AIR'}</span>
        </div>
        {error&&<p role="alert" className="rounded-xl border border-red-400/35 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
        {message&&<p role="status" className="rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 p-4 text-sm text-rcl-blue">{message}</p>}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-white/15 bg-[#0a1723]">
              <div className="flex items-center justify-between gap-3 p-4"><h2 className="font-bold">Program preview — {configuredFor}</h2><span className="text-xs text-white/50">{ready?'Camera connected':'Camera not selected'}</span></div>
              <div className="relative aspect-video overflow-hidden bg-black">
                <video ref={preview} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-contain"/>
                {!ready&&<div className="absolute inset-0 grid place-items-center text-center text-sm text-white/50"><p>Choose camera + microphone and start preview.</p></div>}
                {ready&&<RchBroadcastOverlay mode={mode} config={config} showLive={onAir}/>}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
                <button onClick={()=>void startPreview()} disabled={onAir||busy} className="min-h-11 rounded-lg border border-white/20 px-4 text-xs font-black disabled:opacity-45">{ready?'Refresh preview':'Start preview'}</button>
                <button onClick={stopPreview} disabled={!ready||onAir} className="min-h-11 rounded-lg border border-white/20 px-4 text-xs font-black disabled:opacity-45">Stop preview</button>
                {onAir?<button onClick={()=>void endBroadcast()} disabled={busy} className="min-h-11 rounded-lg bg-red-600 px-5 text-xs font-black disabled:opacity-45">End broadcast</button>
                  :<button onClick={()=>void goLive()} disabled={!ready||config.active||busy} className="min-h-11 rounded-lg bg-rcl-blue px-5 text-xs font-black text-black disabled:opacity-45">Go live</button>}
                <button onClick={()=>void updateGraphics()} disabled={busy} className="min-h-11 rounded-lg border border-rcl-blue/40 px-4 text-xs font-black text-rcl-blue disabled:opacity-45">Publish graphics</button>
              </div>
            </section>
            <section className="grid gap-4 rounded-2xl border border-white/15 bg-[#0a1723] p-5 sm:grid-cols-2">
              <div className="space-y-2"><label className={cssLabel} htmlFor="rch-camera">Camera / Canon capture input</label><select id="rch-camera" value={videoId} onChange={e=>setVideoId(e.target.value)} disabled={onAir} className={cssInput}><option value="">Default / rear camera</option>{videoDevices.map(d=><option value={d.deviceId} key={d.deviceId}>{d.label}</option>)}</select></div>
              <div className="space-y-2"><label className={cssLabel} htmlFor="rch-mic">Microphone</label><select id="rch-mic" value={audioId} onChange={e=>setAudioId(e.target.value)} disabled={onAir} className={cssInput}><option value="">Default microphone</option>{audioDevices.map(d=><option value={d.deviceId} key={d.deviceId}>{d.label}</option>)}</select></div>
              <p className="text-xs leading-5 text-white/55 sm:col-span-2">On iPad, allow Safari camera and mic access. A Canon camera can appear here when a computer or supported tablet recognizes an HDMI-to-USB UVC capture device. Select the capture card, then refresh preview. Camera compatibility varies by browser and hardware.</p>
            </section>
            <section className="space-y-4 rounded-2xl border border-white/15 bg-[#0a1723] p-5">
              <h2 className="text-lg font-bold">Broadcast graphics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={cssLabel}>Overlay preset<select value={config.preset} onChange={e=>edit({preset:e.target.value as RchTvBroadcast['preset']})} className={cssInput}>{presets.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></label>
                <label className={cssLabel}>Accent color<input aria-label="Overlay accent color" type="color" value={config.accent} onChange={e=>edit({accent:e.target.value})} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-transparent p-1"/></label>
                <label className={cssLabel}>Program title<input maxLength={100} value={config.title} onChange={e=>edit({title:e.target.value})} className={cssInput}/></label>
                <label className={cssLabel}>Lower third<input maxLength={90} value={config.lowerThird} onChange={e=>edit({lowerThird:e.target.value})} className={cssInput}/></label>
                <label className={cssLabel}>Sponsor label<input maxLength={80} value={config.sponsor} onChange={e=>edit({sponsor:e.target.value})} className={cssInput} placeholder="Presenting sponsor"/></label>
                <label className={cssLabel}>Scrolling update / ticker<input maxLength={160} value={config.ticker} onChange={e=>edit({ticker:e.target.value})} className={cssInput} placeholder="Latest RCH basketball update"/></label>
              </div>
              <div className="flex flex-wrap gap-4">{([
                ['showLowerThird','Lower third'],['showSponsor','Sponsor'],['showTicker','Ticker'],...(mode==='live_games'?[['showScoreboard','Scoreboard']]:[]),
              ] as Array<[keyof RchTvBroadcast,string]>).map(([key,label])=><label key={key} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={config[key]===true} onChange={e=>edit({[key]:e.target.checked})}/>{label}</label>)}</div>
            </section>
          </div>
          <div className="space-y-5">
            {mode==='live_games'?<section className="space-y-4 rounded-2xl border border-white/15 bg-[#0a1723] p-5">
              <h2 className="text-lg font-bold">Game scoreboard</h2>
              <div className="grid grid-cols-2 gap-3">
                {([['away','awayScore','Away'],['home','homeScore','Home']] as const).map(([name,scoreKey,label])=><div key={name} className="space-y-2">
                  <label className={cssLabel}>{label} team<input maxLength={22} value={config[name]} onChange={e=>edit({[name]:e.target.value})} className={cssInput}/></label>
                  <div className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-2">
                    <button aria-label={`Reduce ${label} score`} onClick={()=>numeric(scoreKey,-1)} className="rounded-md border border-white/20 px-3 py-2 font-black">−</button>
                    <span className="font-mono text-3xl font-black tabular-nums">{config[scoreKey]}</span>
                    <button aria-label={`Increase ${label} score`} onClick={()=>numeric(scoreKey,1)} className="rounded-md bg-rcl-blue px-3 py-2 font-black text-black">+</button>
                  </div>
                </div>)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={cssLabel}>Period<input maxLength={12} value={config.period} onChange={e=>edit({period:e.target.value})} className={cssInput}/></label>
                <label className={cssLabel}>Game clock<input maxLength={12} value={config.clock} onChange={e=>edit({clock:e.target.value})} className={cssInput} placeholder="10:00"/></label>
              </div>
              <p className="text-xs text-white/50">Score and clock are producer-controlled in this release, not automatically synchronized to the official scorebook. Press Publish graphics to send updates to viewers.</p>
            </section>:<section className="space-y-4 rounded-2xl border border-rcl-orange/25 bg-[#0a1723] p-5">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-rcl-orange">The Pulse</p>
              <h2 className="text-lg font-bold">Podcast title cards</h2>
              <label className={cssLabel}>Episode topic<input maxLength={100} value={config.topic} onChange={e=>edit({topic:e.target.value})} className={cssInput}/></label>
              <label className={cssLabel}>Featured guest<input maxLength={80} value={config.guest} onChange={e=>edit({guest:e.target.value})} className={cssInput}/></label>
              <p className="text-xs leading-5 text-white/50">The initial podcast broadcast is one selected camera/mic input. Remote guests and multi-camera compositing will follow after the first live feed is verified.</p>
            </section>}
            <section className="space-y-3 rounded-2xl border border-white/15 bg-[#0a1723] p-5">
              <h2 className="text-lg font-bold">Production checklist</h2>
              <ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-white/65">
                <li>Connect a LiveKit server in Vercel using server-side credentials.</li>
                <li>On iPad/desktop, allow camera and microphone, then Start preview.</li>
                <li>Choose {configuredFor} and customize the overlay.</li>
                <li>Publish graphics, then Go live when the game or show begins.</li>
                <li>Verify the video and sound from a separate viewer device.</li>
              </ol>
              {config.active&&!onAir&&<p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">This channel is marked active from another session. Do not start a second feed. An administrator can take it offline below if the broadcast has ended.</p>}
              {config.active&&!onAir&&<button type="button" disabled={busy} onClick={()=>void endBroadcast()} className="rounded-lg border border-red-300/35 px-4 py-2 text-xs font-bold text-red-200">Mark channel offline</button>}
              <p className="border-t border-white/10 pt-3 text-xs text-white/45">RCH TV displays overlays in its website player. This version does not burn graphics into camera footage, automatically record shows, or support remote guest switching yet.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
