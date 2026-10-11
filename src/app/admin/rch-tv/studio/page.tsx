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
  const [activePanel, setActivePanel] = useState<'camera' | 'score' | 'graphics' | 'show'>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
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

  async function startPreview(preferredFacing: 'environment' | 'user' = facing, ignoreSelectedVideo = false) {
    if (!authorized || onAir) return;
    setBusy(true);setError('');setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access camera devices. Use HTTPS and a supported browser.');
      // iOS Safari can refuse a second camera while the first capture remains live.
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      if (preview.current) preview.current.srcObject = null;
      setReady(false);
      const next = await navigator.mediaDevices.getUserMedia({
        video: videoId && !ignoreSelectedVideo ? { deviceId: { ideal: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: preferredFacing } },
        audio: audioId ? { deviceId: { ideal: audioId }, echoCancellation: true } : { echoCancellation: true },
      });
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = next;
      if (preview.current) {
        preview.current.srcObject = next;
        await preview.current.play();
        if (!next.getVideoTracks().some(track => track.readyState === 'live')) {
          throw new Error('The camera did not start producing a video track.');
        }
      }
      setReady(true);
      await refreshDevices();
      setMessage('Camera preview ready. You are not live yet.');
    } catch (e) {
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      if (preview.current) preview.current.srcObject = null;
      setReady(false);
      setError(e instanceof Error ? e.message : 'Camera or microphone access was denied.');
    } finally { setBusy(false); }
  }

  async function flipCamera() {
    if (onAir || busy) return;
    const nextFacing = facing === 'environment' ? 'user' : 'environment';
    setFacing(nextFacing);
    setVideoId('');
    await startPreview(nextFacing, true);
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

  const configuredFor = mode === 'the_pulse' ? 'The Pulse' : 'Live Games';
  const panelItems = [
    { id: 'camera' as const, label: 'Camera' },
    { id: 'score' as const, label: mode === 'the_pulse' ? 'Episode' : 'Score' },
    { id: 'graphics' as const, label: 'Graphics' },
    { id: 'show' as const, label: 'Show' },
  ];
  if (authLoading || loading) return <main className="rch-broadcast-studio min-h-dvh p-6 text-white">Loading RCH TV Studio…</main>;
  if (!authorized) return <main className="rch-broadcast-studio min-h-dvh p-6 text-white"><h1 className="text-2xl font-bold">Administrator access required</h1><Link href="/media" className="mt-4 inline-block text-sky-300">Return to RCH TV</Link></main>;

  return (
    <main className="rch-broadcast-studio min-h-dvh text-white">
      <div className="rch-studio-shell mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6">
        <header className="rch-studio-heading flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">RCH TV · Production</p>
            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-white sm:text-3xl">Broadcast Studio</h1>
          </div>
          <Link href="/admin/rch-tv" className="rch-studio-button min-h-10 shrink-0 rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white" aria-label="Leave Broadcast Studio and return to RCH TV administration">Exit Studio ↗</Link>
        </header>

        <div className="rch-studio-mode-switch flex items-center gap-2" role="group" aria-label="Production format">
          {(['live_games', 'the_pulse'] as const).map(item => (
            <button type="button" disabled={onAir || busy} key={item}
              onClick={() => { stopPreview(); setMode(item); setActivePanel('camera'); setMessage(''); }}
              aria-pressed={mode === item}
              className={`rch-studio-button min-h-10 flex-1 rounded-lg border px-4 py-2.5 text-xs font-extrabold sm:flex-none sm:text-sm ${mode === item ? 'rch-studio-button-selected' : ''}`}>
              {RCH_TV_MODES[item].label}
            </button>
          ))}
          <span role="status" className={`rch-studio-onair ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-black tracking-wide ${onAir ? 'is-live' : ''}`}>{onAir ? '● LIVE' : '● OFF AIR'}</span>
        </div>

        <section className="rch-studio-preview-sticky" aria-label="Live camera preview and broadcast controls">
          <div className="rch-studio-preview-head flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
            <h2 className="min-w-0 truncate text-xs font-bold text-white sm:text-sm">Program Monitor <span className="text-sky-300">/ {configuredFor}</span></h2>
            <span className="shrink-0 text-[10px] font-semibold text-slate-300">{ready ? '● Camera ready' : 'Camera offline'}</span>
          </div>
          <div className="rch-studio-video-frame relative aspect-video overflow-hidden">
            <video ref={preview} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-contain" aria-label="Local camera preview" />
            {!ready && <div className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-slate-400">Select a camera and tap Start Preview.</div>}
            {ready && <RchBroadcastOverlay mode={mode} config={config} showLive={onAir} />}
          </div>
          <div className="rch-studio-actions flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
            <button type="button" onClick={() => void startPreview()} disabled={onAir || busy}
              className="rch-studio-button min-h-11 rounded-lg px-3 text-xs font-bold disabled:opacity-40">
              {ready ? 'Refresh camera' : 'Start preview'}
            </button>
            <button type="button" onClick={() => void flipCamera()} disabled={onAir || busy}
              className="rch-studio-button min-h-11 rounded-lg px-3 text-xs font-bold disabled:opacity-40" aria-label="Switch between front and rear cameras">
              Flip camera
            </button>
            <button type="button" onClick={stopPreview} disabled={!ready || onAir}
              className="rch-studio-button rch-studio-stop min-h-11 rounded-lg px-3 text-xs font-bold disabled:opacity-40">Stop preview</button>
            {onAir
              ? <button type="button" onClick={() => void endBroadcast()} disabled={busy} className="rch-studio-button rch-studio-live min-h-11 rounded-lg px-5 text-xs font-black disabled:opacity-40">End Live</button>
              : <button type="button" onClick={() => void goLive()} disabled={!ready || config.active || busy}
                  className="rch-studio-button rch-studio-primary min-h-11 rounded-lg px-5 text-xs font-black disabled:opacity-40">● Go Live</button>}
            <button type="button" onClick={() => void updateGraphics()} disabled={busy}
              className="rch-studio-button rch-studio-publish min-h-11 rounded-lg px-3 text-xs font-bold disabled:opacity-40">Publish graphics</button>
          </div>
        </section>

        {error && <p role="alert" className="rch-studio-alert mt-3 rounded-lg p-3 text-xs leading-5">{error}</p>}
        {message && <p role="status" className="rch-studio-message mt-3 rounded-lg p-3 text-xs leading-5">{message}</p>}

        <nav className="rch-studio-tabs mt-4 grid grid-cols-4 gap-1.5" role="tablist" aria-label="Studio controls">
          {panelItems.map(item => (
            <button type="button" key={item.id} role="tab" aria-selected={activePanel === item.id}
              aria-controls={`rch-studio-panel-${item.id}`} id={`rch-studio-tab-${item.id}`}
              onClick={() => setActivePanel(item.id)}
              className={`rch-studio-tab min-h-11 rounded-lg px-2 py-2 text-xs font-bold ${activePanel === item.id ? 'is-active' : ''}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="rch-studio-panels mt-3 grid gap-4 lg:grid-cols-2">
          <section className="rch-studio-card rounded-xl p-4 sm:p-5" data-panel="camera" data-active={activePanel === 'camera'}
            id="rch-studio-panel-camera" role="tabpanel" aria-labelledby="rch-studio-tab-camera">
            <h2 className="text-lg font-extrabold text-white">Camera & audio</h2>
            <p className="mb-4 mt-1 text-xs leading-5 text-slate-300">Choose your iPad camera or a compatible Canon capture input. The preview remains muted locally to prevent feedback.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={cssLabel} htmlFor="rch-camera">Video source
                <select id="rch-camera" value={videoId} onChange={e => setVideoId(e.target.value)} disabled={onAir} className={cssInput}>
                  <option value="">Default / {facing === 'environment' ? 'rear' : 'front'} camera</option>
                  {videoDevices.map(d => <option value={d.deviceId} key={d.deviceId}>{d.label}</option>)}
                </select>
              </label>
              <label className={cssLabel} htmlFor="rch-mic">Microphone
                <select id="rch-mic" value={audioId} onChange={e => setAudioId(e.target.value)} disabled={onAir} className={cssInput}>
                  <option value="">Default microphone</option>
                  {audioDevices.map(d => <option value={d.deviceId} key={d.deviceId}>{d.label}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-4 rounded-lg bg-white/5 p-3 text-xs leading-5 text-slate-300">For Canon, connect a compatible UVC capture device. On iPhone or iPad, tap Flip Camera above to change between front and rear inputs. Choose a different device above, then tap Refresh Camera.</p>
          </section>

          <section className="rch-studio-card rounded-xl p-4 sm:p-5" data-panel="score" data-active={activePanel === 'score'}
            id="rch-studio-panel-score" role="tabpanel" aria-labelledby="rch-studio-tab-score">
            {mode === 'live_games' ? <>
              <h2 className="text-lg font-extrabold text-white">Game Scoreboard</h2>
              <p className="mb-4 mt-1 text-xs text-slate-300">Score changes update your preview immediately. Tap Publish graphics to update viewers.</p>
              <div className="grid grid-cols-2 gap-3">
                {([['away', 'awayScore', 'Away'], ['home', 'homeScore', 'Home']] as const).map(([name, scoreKey, label]) => (
                  <div key={name} className="min-w-0 space-y-2">
                    <label className={cssLabel}>{label} Team
                      <input maxLength={22} value={config[name]} onChange={e => edit({ [name]: e.target.value })} className={cssInput} />
                    </label>
                    <div className="rch-studio-score-stepper flex items-center justify-between rounded-lg p-2">
                      <button type="button" aria-label={`Reduce ${label} score`} onClick={() => numeric(scoreKey, -1)} className="rch-studio-button min-h-11 min-w-10 rounded-md px-3 font-black">−</button>
                      <strong className="px-1 font-mono text-3xl font-black tabular-nums text-white">{config[scoreKey]}</strong>
                      <button type="button" aria-label={`Increase ${label} score`} onClick={() => numeric(scoreKey, 1)} className="rch-studio-button rch-studio-primary min-h-11 min-w-10 rounded-md px-3 font-black">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className={cssLabel}>Period
                  <input maxLength={12} value={config.period} onChange={e => edit({ period: e.target.value })} className={cssInput} />
                </label>
                <label className={cssLabel}>Game Clock
                  <input maxLength={12} value={config.clock} onChange={e => edit({ clock: e.target.value })} className={cssInput} placeholder="10:00" />
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">The game clock is manually operated; it's not yet synchronized with the official scorebook.</p>
            </> : <>
              <h2 className="text-lg font-extrabold text-white">The Pulse · Episode</h2>
              <p className="mb-4 mt-1 text-xs text-slate-300">Prepare the topic and guest cards for the show.</p>
              <div className="space-y-4">
                <label className={cssLabel}>Episode Topic
                  <input maxLength={100} value={config.topic} onChange={e => edit({ topic: e.target.value })} className={cssInput} />
                </label>
                <label className={cssLabel}>Featured Guest
                  <input maxLength={80} value={config.guest} onChange={e => edit({ guest: e.target.value })} className={cssInput} />
                </label>
              </div>
            </>}
          </section>

          <section className="rch-studio-card rounded-xl p-4 sm:p-5" data-panel="graphics" data-active={activePanel === 'graphics'}
            id="rch-studio-panel-graphics" role="tabpanel" aria-labelledby="rch-studio-tab-graphics">
            <h2 className="text-lg font-extrabold text-white">Overlay Designer</h2>
            <p className="mb-4 mt-1 text-xs text-slate-300">Preview changes immediately. Publish them when you're satisfied with the design.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={cssLabel}>Overlay Preset
                <select value={config.preset} onChange={e => edit({ preset: e.target.value as RchTvBroadcast['preset'] })} className={cssInput}>
                  {presets.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </label>
              <label className={cssLabel}>Accent Color
                <input aria-label="Overlay accent color" type="color" value={config.accent}
                  onChange={e => edit({ accent: e.target.value })} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/20 bg-transparent p-1" />
              </label>
              <label className={cssLabel}>Program Title
                <input maxLength={100} value={config.title} onChange={e => edit({ title: e.target.value })} className={cssInput} />
              </label>
              <label className={cssLabel}>Lower Third
                <input maxLength={90} value={config.lowerThird} onChange={e => edit({ lowerThird: e.target.value })} className={cssInput} />
              </label>
              <label className={cssLabel}>Sponsor
                <input maxLength={80} value={config.sponsor} onChange={e => edit({ sponsor: e.target.value })} className={cssInput} />
              </label>
              <label className={cssLabel}>Ticker
                <input maxLength={160} value={config.ticker} onChange={e => edit({ ticker: e.target.value })} className={cssInput} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {([
                ['showLowerThird', 'Lower third'], ['showSponsor', 'Sponsor'], ['showTicker', 'Ticker'],
                ...(mode === 'live_games' ? [['showScoreboard', 'Scoreboard']] : []),
              ] as Array<[keyof RchTvBroadcast, string]>).map(([key, label]) => (
                <label key={key} className="flex min-h-10 items-center gap-2 text-xs font-bold text-slate-200">
                  <input type="checkbox" checked={config[key] === true} onChange={e => edit({ [key]: e.target.checked })} />{label}
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void updateGraphics()} disabled={busy} className="rch-studio-button rch-studio-primary mt-5 min-h-11 rounded-lg px-5 text-xs font-extrabold disabled:opacity-40">Publish Graphics</button>
          </section>

          <section className="rch-studio-card rounded-xl p-4 sm:p-5" data-panel="show" data-active={activePanel === 'show'}
            id="rch-studio-panel-show" role="tabpanel" aria-labelledby="rch-studio-tab-show">
            <h2 className="text-lg font-extrabold text-white">Production Checklist</h2>
            <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6 text-slate-300">
              <li>Choose Live Games or The Pulse.</li>
              <li>Grant camera/mic access and start the preview.</li>
              <li>Configure score or episode details and overlay graphics.</li>
              <li>Publish graphics, then tap Go Live when ready.</li>
              <li>Open RCH TV on a second device to test picture and sound.</li>
              <li>End the broadcast when finished.</li>
            </ol>
            {config.active && !onAir && (
              <div className="rch-studio-alert mt-5 rounded-lg p-4 text-xs leading-5">
                This channel is still marked live from another session.
                <button type="button" disabled={busy} onClick={() => void endBroadcast()} className="rch-studio-button mt-3 block min-h-11 rounded-lg border border-red-400/40 px-4 font-bold">Mark channel offline</button>
              </div>
            )}
            <p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-slate-400">Overlays are displayed over the RCH TV website feed. Automatic recording and multi-camera switching are not yet enabled.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
