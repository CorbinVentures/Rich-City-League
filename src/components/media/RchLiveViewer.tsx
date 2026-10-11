'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { getSupabaseClient } from '@/lib/supabase';
import { defaultRchTvBroadcast, parseRchTvBroadcast, RCH_TV_MODES, type RchTvBroadcast, type RchTvMode } from '@/lib/rch-tv-broadcast';
import { RchBroadcastOverlay } from './RchBroadcastOverlay';

export function RchLiveViewer({ mode }: { mode: RchTvMode }) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [config, setConfig] = useState<RchTvBroadcast>(() => defaultRchTvBroadcast(mode));
  const [connected, setConnected] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const video = useRef<HTMLVideoElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const room = useRef<Room | null>(null);

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    const refresh = async () => {
      const { data, error: dbError } = await client.from('site_settings')
        .select('value').eq('key', RCH_TV_MODES[mode].key).maybeSingle();
      if (mounted && !dbError) setConfig(parseRchTvBroadcast(mode, data?.value));
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 6000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [client, mode]);

  useEffect(() => {
    if (!config.active) {
      setConnected(false); setReceiving(false); setError('');
      return;
    }
    let disposed = false;
    const connection = new Room({ adaptiveStream: true, dynacast: true });
    room.current = connection;
    const onSubscribed = (track: { kind: Track.Kind; attach: (element: HTMLMediaElement) => void }) => {
      if (disposed) return;
      if (track.kind === Track.Kind.Video && video.current) {
        track.attach(video.current);
        setReceiving(true);
      }
      if (track.kind === Track.Kind.Audio && audio.current) track.attach(audio.current);
    };
    const onUnsubscribed = (track: { kind: Track.Kind; detach: () => void }) => {
      track.detach();
      if (track.kind === Track.Kind.Video) setReceiving(false);
    };
    connection.on(RoomEvent.TrackSubscribed, onSubscribed);
    connection.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    connection.on(RoomEvent.Disconnected, () => { if (!disposed) { setConnected(false);setReceiving(false); } });

    (async () => {
      try {
        const response = await fetch('/api/rch-tv/token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, role: 'viewer' }), cache: 'no-store',
        });
        const info = await response.json();
        if (!response.ok) throw new Error(info.error || 'RCH TV viewer connection is unavailable.');
        if (disposed) return;
        await connection.connect(info.url, info.token);
        if (disposed) return;
        setConnected(true); setError('');
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'Unable to connect to broadcast.');
      }
    })();
    return () => {
      disposed = true;
      room.current = null;
      connection.disconnect();
      if (video.current) video.current.srcObject = null;
      if (audio.current) audio.current.srcObject = null;
    };
  }, [config.active, mode, retry]);

  const enableSound = useCallback(async () => {
    try {
      await room.current?.startAudio();
      await video.current?.play().catch(() => undefined);
      await audio.current?.play().catch(() => undefined);
    } catch {
      setError('Tap again to enable playback audio on this device.');
    }
  }, []);

  const showVideo = config.active && receiving;
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[#02060b]">
      <video ref={video} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" aria-label={`${RCH_TV_MODES[mode].label} live video`} />
      <audio ref={audio} autoPlay aria-label="RCH TV broadcast audio" />
      {showVideo && <RchBroadcastOverlay mode={mode} config={config} showLive />}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black tracking-widest ${config.active ? 'border-rcl-orange/30 text-rcl-orange' : 'border-white/20 text-white/55'}`}>
            <span className={`h-2 w-2 rounded-full ${config.active ? 'bg-rcl-orange' : 'bg-white/40'}`} />
            {config.active ? 'BROADCAST CONNECTING' : 'OFF AIR'}
          </span>
          <h3 className="font-display text-xl font-black uppercase sm:text-3xl">{config.active ? 'Waiting for the camera feed' : mode === 'the_pulse' ? 'The Pulse returns soon' : 'Next broadcast coming soon'}</h3>
          <p className="mt-3 max-w-lg text-xs leading-5 text-white/55 sm:text-sm">{error || (config.active ? 'The producer is connecting to the RCH TV studio.' : 'The program will play right here when the RCH production team goes live.')}</p>
          {config.active && error && <button type="button" onClick={() => setRetry(n => n + 1)} className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-xs font-bold">Retry connection</button>}
        </div>
      )}
      {showVideo && connected && <button type="button" onClick={() => void enableSound()} className="absolute bottom-3 right-3 z-20 rounded-lg border border-white/25 bg-black/75 px-3 py-2 text-xs font-bold text-white">Enable sound</button>}
    </div>
  );
}
