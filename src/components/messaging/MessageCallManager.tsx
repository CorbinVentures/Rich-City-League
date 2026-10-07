'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiMaximize2,
  FiMic,
  FiMicOff,
  FiMinimize2,
  FiPhone,
  FiPhoneOff,
  FiVideo,
  FiVideoOff,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

type CallKind = 'audio' | 'video';
type CallStatus = 'ringing' | 'connecting' | 'active' | 'declined' | 'missed' | 'ended' | 'failed';

type MessageCall = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  expires_at: string;
  end_reason: string | null;
};

type CallPeer = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type StartCallDetail = {
  conversationId: string;
  calleeId: string;
  kind: CallKind;
  peerName: string;
  peerAvatar?: string | null;
};

const RING_MS = 45_000;

function profileName(profile: { display_name?: string | null; username?: string | null } | null) {
  return profile?.display_name ?? profile?.username ?? 'RCH member';
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function callStatusLabel(status: CallStatus | 'requesting' | 'reconnecting') {
  if (status === 'ringing') return 'Ringing…';
  if (status === 'requesting') return 'Requesting camera & microphone…';
  if (status === 'connecting') return 'Connecting…';
  if (status === 'reconnecting') return 'Reconnecting…';
  if (status === 'active') return 'Connected';
  if (status === 'declined') return 'Call declined';
  if (status === 'missed') return 'No answer';
  if (status === 'failed') return 'Call failed';
  return 'Call ended';
}

export function MessageCallManager() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;

  const [incoming, setIncoming] = useState<MessageCall | null>(null);
  const [activeCall, setActiveCall] = useState<MessageCall | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [phase, setPhase] = useState<CallStatus | 'requesting' | 'reconnecting'>('ringing');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringTimerRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeCallRef = useRef<MessageCall | null>(null);
  const directionRef = useRef<'incoming' | 'outgoing' | null>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      if (localStream) void localVideoRef.current.play().catch(() => undefined);
    }
  }, [localStream, activeCall?.kind, minimized]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      if (remoteStream) void remoteVideoRef.current.play().catch(() => undefined);
    }
  }, [remoteStream, activeCall?.kind, minimized]);

  useEffect(() => {
    if (phase !== 'active') {
      setSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase, activeCall?.id]);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      window.clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    setLocalStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setRemoteStream(null);
  }, []);

  const closeTransport = useCallback(() => {
    clearRingTimer();
    pendingCandidatesRef.current = [];
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (signalChannelRef.current && supabase) {
      void supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
  }, [clearRingTimer, supabase]);

  const resetCall = useCallback(() => {
    finishingRef.current = false;
    closeTransport();
    stopMedia();
    setActiveCall(null);
    setPeer(null);
    setPhase('ringing');
    setMuted(false);
    setCameraOff(false);
    setMinimized(false);
    setSeconds(0);
  }, [closeTransport, stopMedia]);

  const showFinalState = useCallback((status: CallStatus, message?: string) => {
    setPhase(status);
    if (message) setError(message);
    window.setTimeout(() => resetCall(), 1300);
  }, [resetCall]);

  const fetchPeer = useCallback(async (profileId: string) => {
    if (!db) return null;
    const result = await db.from('profiles').select('id,display_name,username,avatar_url').eq('id', profileId).maybeSingle();
    if (!result.data) return { id: profileId, name: 'RCH member', avatarUrl: null } as CallPeer;
    return {
      id: result.data.id,
      name: profileName(result.data),
      avatarUrl: result.data.avatar_url ?? null,
    } as CallPeer;
  }, [db]);

  const surfaceIncoming = useCallback(async (call: MessageCall) => {
    if (!user || call.callee_id !== user.id || call.status !== 'ringing') return;
    if (new Date(call.expires_at).getTime() <= Date.now()) return;
    if (activeCallRef.current) return;
    const caller = await fetchPeer(call.caller_id);
    setPeer(caller);
    setIncoming(call);
    setError('');
  }, [fetchPeer, user]);

  useEffect(() => {
    if (!db || !supabase || !user) {
      setIncoming(null);
      resetCall();
      return;
    }

    let cancelled = false;
    const loadRinging = async () => {
      const result = await db
        .from('message_calls')
        .select('id,conversation_id,caller_id,callee_id,kind,status,created_at,answered_at,ended_at,expires_at,end_reason')
        .eq('callee_id', user.id)
        .eq('status', 'ringing')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && result.data) void surfaceIncoming(result.data as MessageCall);
    };
    void loadRinging();

    const handleUpdate = (row: MessageCall) => {
      const active = activeCallRef.current;
      if (incoming?.id === row.id && row.status !== 'ringing') setIncoming(null);
      if (!active || active.id !== row.id) return;
      setActiveCall(row);
      if (row.status === 'connecting') setPhase('connecting');
      if (row.status === 'active') setPhase('active');
      if (['declined', 'missed', 'ended', 'failed'].includes(row.status)) {
        showFinalState(row.status);
      }
    };

    const channel = supabase
      .channel(`rch-call-events-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_calls', filter: `callee_id=eq.${user.id}` }, (payload: { new: MessageCall }) => {
        void surfaceIncoming(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_calls', filter: `callee_id=eq.${user.id}` }, (payload: { new: MessageCall }) => {
        handleUpdate(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_calls', filter: `caller_id=eq.${user.id}` }, (payload: { new: MessageCall }) => {
        handleUpdate(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [db, incoming?.id, resetCall, showFinalState, supabase, surfaceIncoming, user]);

  useEffect(() => {
    if (!incoming) return;
    const remaining = Math.max(0, new Date(incoming.expires_at).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      setIncoming((current) => current?.id === incoming.id ? null : current);
      setPeer((current) => activeCallRef.current ? current : null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [incoming]);

  const acquireMedia = useCallback(async (kind: CallKind) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Calling is not supported in this browser.');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: kind === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const sendSignal = useCallback(async (event: string, payload: Record<string, unknown>) => {
    if (!signalChannelRef.current) return;
    await signalChannelRef.current.send({ type: 'broadcast', event, payload });
  }, []);

  const flushCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore candidates that become obsolete during renegotiation.
      }
    }
  }, []);

  const createPeerConnection = useCallback((call: MessageCall, stream: MediaStream) => {
    closeTransport();

    const configuredTurn = process.env.NEXT_PUBLIC_RCH_TURN_URL?.trim();
    const iceServers: RTCIceServer[] = [
      { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
    ];
    if (configuredTurn) {
      iceServers.push({
        urls: configuredTurn.split(',').map((value) => value.trim()).filter(Boolean),
        username: process.env.NEXT_PUBLIC_RCH_TURN_USERNAME?.trim() || undefined,
        credential: process.env.NEXT_PUBLIC_RCH_TURN_CREDENTIAL?.trim() || undefined,
      });
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const streamFromPeer = event.streams[0];
      if (streamFromPeer) setRemoteStream(streamFromPeer);
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void sendSignal('ice', { candidate: event.candidate.toJSON() });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setPhase('active');
        if (db) void db.rpc('activate_message_call', { target_call_id: call.id });
      } else if (pc.connectionState === 'disconnected') {
        setPhase('reconnecting');
      } else if (pc.connectionState === 'failed') {
        if (db && !finishingRef.current) {
          finishingRef.current = true;
          void db.rpc('finish_message_call', {
            target_call_id: call.id,
            target_status: 'failed',
            target_reason: 'peer_connection_failed',
          });
        }
        showFinalState('failed', 'The connection could not be restored.');
      }
    };

    return pc;
  }, [closeTransport, db, sendSignal, showFinalState]);

  const joinSignalChannel = useCallback(async (call: MessageCall, stream: MediaStream, role: 'caller' | 'callee') => {
    if (!supabase) throw new Error('Calling service is unavailable.');
    const pc = createPeerConnection(call, stream);
    const realtime = (supabase as any).realtime;
    if (realtime?.setAuth) await realtime.setAuth();

    const channel = (supabase as any).channel(`rch-call:${call.id}`, {
      config: { private: true, broadcast: { ack: true } },
    });
    signalChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'ready' }, async () => {
        if (role !== 'caller' || pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal('offer', { description: pc.localDescription });
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }: { payload: { description?: RTCSessionDescriptionInit } }) => {
        if (role !== 'callee' || !payload.description) return;
        await pc.setRemoteDescription(payload.description);
        await flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer', { description: pc.localDescription });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: { description?: RTCSessionDescriptionInit } }) => {
        if (role !== 'caller' || !payload.description) return;
        await pc.setRemoteDescription(payload.description);
        await flushCandidates(pc);
      })
      .on('broadcast', { event: 'ice' }, async ({ payload }: { payload: { candidate?: RTCIceCandidateInit } }) => {
        if (!payload.candidate) return;
        if (!pc.remoteDescription) {
          pendingCandidatesRef.current.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          // Ignore stale candidates from a superseded network path.
        }
      })
      .on('broadcast', { event: 'hangup' }, () => {
        if (!finishingRef.current) showFinalState('ended');
      })
      .subscribe(async (status: string, subscribeError?: Error) => {
        if (status === 'SUBSCRIBED') {
          setPhase('connecting');
          if (role === 'callee') await sendSignal('ready', { profile_id: user?.id });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError(subscribeError?.message || 'Unable to establish the secure call channel.');
        }
      });
  }, [createPeerConnection, flushCandidates, sendSignal, showFinalState, supabase, user?.id]);

  const startOutgoing = useCallback(async (detail: StartCallDetail) => {
    if (!db || !user || activeCallRef.current || incoming) return;
    setError('');
    setPhase('requesting');
    directionRef.current = 'outgoing';
    let stream: MediaStream | null = null;

    try {
      stream = await acquireMedia(detail.kind);
      setPeer({ id: detail.calleeId, name: detail.peerName || 'RCH member', avatarUrl: detail.peerAvatar ?? null });
      const created = await db.rpc('start_message_call', {
        target_conversation_id: detail.conversationId,
        target_profile_id: detail.calleeId,
        call_kind: detail.kind,
      });
      if (created.error || !created.data) throw new Error(created.error?.message || 'Unable to start the call.');

      const callResult = await db
        .from('message_calls')
        .select('id,conversation_id,caller_id,callee_id,kind,status,created_at,answered_at,ended_at,expires_at,end_reason')
        .eq('id', created.data)
        .single();
      if (callResult.error || !callResult.data) throw new Error(callResult.error?.message || 'Unable to open the call.');

      const call = callResult.data as MessageCall;
      setActiveCall(call);
      setPhase('ringing');
      await joinSignalChannel(call, stream, 'caller');
      ringTimerRef.current = window.setTimeout(async () => {
        if (activeCallRef.current?.id !== call.id || finishingRef.current) return;
        finishingRef.current = true;
        await db.rpc('finish_message_call', {
          target_call_id: call.id,
          target_status: 'missed',
          target_reason: 'ring_timeout',
        });
        showFinalState('missed');
      }, RING_MS);
    } catch (callError) {
      stream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setPeer(null);
      setError(callError instanceof Error ? callError.message : 'Unable to start the call.');
      setPhase('failed');
      window.setTimeout(() => resetCall(), 1600);
    }
  }, [acquireMedia, db, incoming, joinSignalChannel, resetCall, showFinalState, user]);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<StartCallDetail>).detail;
      if (!detail?.conversationId || !detail?.calleeId || !detail?.kind) return;
      void startOutgoing(detail);
    };
    window.addEventListener('rch:start-message-call', onStart as EventListener);
    return () => window.removeEventListener('rch:start-message-call', onStart as EventListener);
  }, [startOutgoing]);

  const acceptIncoming = async () => {
    if (!incoming || !db || activeCallRef.current) return;
    setError('');
    setPhase('requesting');
    directionRef.current = 'incoming';
    let stream: MediaStream | null = null;
    try {
      stream = await acquireMedia(incoming.kind);
      const answered = await db.rpc('answer_message_call', { target_call_id: incoming.id });
      if (answered.error) throw new Error(answered.error.message || 'Unable to answer this call.');
      const call = { ...incoming, status: 'connecting' as const, answered_at: new Date().toISOString() };
      setActiveCall(call);
      setIncoming(null);
      setPhase('connecting');
      await joinSignalChannel(call, stream, 'callee');
    } catch (callError) {
      stream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setError(callError instanceof Error ? callError.message : 'Unable to answer the call.');
      setPhase('failed');
      window.setTimeout(() => resetCall(), 1600);
    }
  };

  const declineIncoming = async () => {
    if (!incoming || !db) return;
    const callId = incoming.id;
    setIncoming(null);
    await db.rpc('finish_message_call', {
      target_call_id: callId,
      target_status: 'declined',
      target_reason: 'recipient_declined',
    });
    setPeer(null);
  };

  const hangUp = async () => {
    const call = activeCallRef.current;
    if (!call || !db || finishingRef.current) return;
    finishingRef.current = true;
    try {
      await sendSignal('hangup', { reason: 'hangup' });
      await db.rpc('finish_message_call', {
        target_call_id: call.id,
        target_status: 'ended',
        target_reason: 'hangup',
      });
    } finally {
      showFinalState('ended');
    }
  };

  const toggleMute = () => {
    const next = !muted;
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    if (activeCall?.kind !== 'video') return;
    const next = !cameraOff;
    localStream?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  };

  if (!user) return null;

  if (incoming && !activeCall) {
    return (
      <div className="rch-call-layer rch-call-incoming-layer" role="dialog" aria-modal="true" aria-label={`Incoming ${incoming.kind} call from ${peer?.name ?? 'RCH member'}`}>
        <section className="rch-call-incoming">
          <div className="rch-call-pulse">
            <ProfileAvatarMedia src={peer?.avatarUrl} alt={peer?.name ?? 'RCH member'} className="h-full w-full object-cover" />
          </div>
          <p>Incoming {incoming.kind === 'video' ? 'video' : 'voice'} call</p>
          <h2>{peer?.name ?? 'RCH member'}</h2>
          <span>RCH Messages</span>
          {error && <small className="rch-call-error">{error}</small>}
          <div className="rch-call-incoming-actions">
            <button type="button" className="decline" onClick={() => void declineIncoming()} aria-label="Decline call"><FiPhoneOff /><span>Decline</span></button>
            <button type="button" className="accept" onClick={() => void acceptIncoming()} aria-label="Answer call">{incoming.kind === 'video' ? <FiVideo /> : <FiPhone />}<span>Answer</span></button>
          </div>
        </section>
      </div>
    );
  }

  if (!activeCall && phase !== 'requesting' && phase !== 'failed') return null;

  return (
    <div className={`rch-call-layer ${minimized ? 'is-minimized' : ''}`} role="dialog" aria-modal={!minimized} aria-label={`${activeCall?.kind === 'video' ? 'Video' : 'Voice'} call with ${peer?.name ?? 'RCH member'}`}>
      <section className={`rch-call-stage ${activeCall?.kind === 'audio' ? 'audio-only' : ''}`}>
        <div className="rch-call-stage-head">
          <div>
            <strong>{peer?.name ?? 'RCH member'}</strong>
            <span>{phase === 'active' ? formatDuration(seconds) : callStatusLabel(phase)}</span>
          </div>
          <button type="button" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? 'Expand call' : 'Minimize call'}>{minimized ? <FiMaximize2 /> : <FiMinimize2 />}</button>
        </div>

        {activeCall?.kind === 'video' && (
          <video ref={remoteVideoRef} className="rch-call-remote-video" autoPlay playsInline />
        )}
        {activeCall?.kind === 'audio' && (
          <>
            <video ref={remoteVideoRef} className="rch-call-audio-media" autoPlay playsInline />
            <div className="rch-call-audio-identity">
              <div><ProfileAvatarMedia src={peer?.avatarUrl} alt={peer?.name ?? 'RCH member'} className="h-full w-full object-cover" /></div>
              <h2>{peer?.name ?? 'RCH member'}</h2>
              <p>{phase === 'active' ? formatDuration(seconds) : callStatusLabel(phase)}</p>
            </div>
          </>
        )}

        {activeCall?.kind === 'video' && localStream && (
          <video ref={localVideoRef} className={`rch-call-local-video ${cameraOff ? 'camera-off' : ''}`} autoPlay playsInline muted />
        )}

        {activeCall?.kind === 'video' && !remoteStream && (
          <div className="rch-call-video-waiting">
            <div><ProfileAvatarMedia src={peer?.avatarUrl} alt={peer?.name ?? 'RCH member'} className="h-full w-full object-cover" /></div>
            <strong>{peer?.name ?? 'RCH member'}</strong>
            <span>{callStatusLabel(phase)}</span>
          </div>
        )}

        {error && <div className="rch-call-error-banner">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss"><FiX /></button></div>}

        {!minimized && (
          <div className="rch-call-controls">
            <button type="button" onClick={toggleMute} className={muted ? 'off' : ''} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <FiMicOff /> : <FiMic />}<span>{muted ? 'Unmute' : 'Mute'}</span></button>
            {activeCall?.kind === 'video' && <button type="button" onClick={toggleCamera} className={cameraOff ? 'off' : ''} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>{cameraOff ? <FiVideoOff /> : <FiVideo />}<span>Camera</span></button>}
            <button type="button" className="hangup" onClick={() => void hangUp()} aria-label="End call"><FiPhoneOff /><span>End</span></button>
          </div>
        )}
      </section>
    </div>
  );
}
