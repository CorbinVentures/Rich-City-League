'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FiArchive,
  FiArrowLeft,
  FiBellOff,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiImage,
  FiInfo,
  FiLink,
  FiMessageCircle,
  FiMic,
  FiMoreHorizontal,
  FiPhone,
  FiCornerUpLeft,
  FiSend,
  FiSearch,
  FiSmile,
  FiStar,
  FiStopCircle,
  FiTrash2,
  FiUser,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { Container } from '@/components/Container';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  readMediaPreview,
  safeMediaPreviewUrl,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_VIDEO_ACCEPT,
  socialMediaError,
  socialMediaExtension,
} from '@/lib/social-media';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  reply_to_id: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  created_at: string;
};

type Conversation = { id: string; title: string | null; conversation_type: string; updated_at: string };
type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: string; is_vip?: boolean | null; vip_label?: string | null };
type Member = { conversation_id: string; profile_id: string; role: string; last_read_at: string | null; joined_at: string; profile?: Profile };
type Reaction = { message_id: string; profile_id: string; reaction_key: string; created_at: string };
type Preference = { is_pinned: boolean; muted_until: string | null; archived_at: string | null };

const PAGE_SIZE = 40;
const reactionOptions = [
  ['fire', '🔥'],
  ['hoop', '🏀'],
  ['facts', '💯'],
  ['watch', '👀'],
  ['laugh', '😂'],
  ['love', '❤️'],
] as const;

const legacyReactionEmoji: Record<string, string> = {
  like: '👍',
  wow: '😮',
  clutch: '🏀',
};

const VOICE_NOTE_MAX_BYTES = 10 * 1024 * 1024;

function isAudioAttachment(url: string | null) {
  return Boolean(url && /\/voice-[^/?]+\.(m4a|webm|ogg|oga|mp3|aac)(?:$|\?)/i.test(url));
}

function audioExtension(type: string) {
  if (/mp4|m4a|x-m4a/i.test(type)) return 'm4a';
  if (/mpeg|mp3/i.test(type)) return 'mp3';
  if (/ogg/i.test(type)) return 'ogg';
  if (/aac/i.test(type)) return 'aac';
  return 'webm';
}

function formatRecordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function displayName(profile?: Profile | null) {
  return profile?.display_name ?? profile?.username ?? 'RCH member';
}

function isVideoAttachment(url: string | null) {
  return Boolean(url && /\.(mp4|webm|mov|ogv)(?:$|\?)/i.test(url));
}

function mediaStoragePath(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/media/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [preference, setPreference] = useState<Preference>({ is_pinned: false, muted_until: null, archived_at: null });
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [reactionOpen, setReactionOpen] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<string | null>(null);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [searchCursor, setSearchCursor] = useState(0);
  const [infoTab, setInfoTab] = useState<'media' | 'links'>('media');
  const [toast, setToast] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimers = useRef<Record<string, number>>({});
  const lastTypingSent = useRef(0);
  const messageIdsRef = useRef<string[]>([]);
  const meNameRef = useRef('RCH member');
  const swipeReplyRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const me = members.find((member) => member.profile_id === user?.id);
  const others = members.filter((member) => member.profile_id !== user?.id);
  const peer = conversation?.conversation_type === 'direct' ? others[0]?.profile ?? null : null;
  const conversationTitle = conversation?.conversation_type === 'direct'
    ? displayName(peer)
    : conversation?.title ?? 'RCH conversation';
  const muted = Boolean(preference.muted_until && new Date(preference.muted_until).getTime() > Date.now());
  const draftKey = user ? `rch-message-draft:${user.id}:${conversationId}` : '';

  const memberMap = useMemo(() => new Map(members.map((member) => [member.profile_id, member.profile])), [members]);
  const messageMap = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const searchMatches = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) return [];
    return messages.filter((message) => !message.deleted_at && message.body.toLowerCase().includes(query));
  }, [messages, threadSearch]);
  const activeSearchId = searchMatches.length
    ? searchMatches[((searchCursor % searchMatches.length) + searchMatches.length) % searchMatches.length].id
    : null;
  const sharedMedia = useMemo(
    () => messages.filter((message) => message.attachment_url && !message.deleted_at),
    [messages],
  );
  const sharedLinks = useMemo(() => messages.flatMap((message) => {
    if (message.deleted_at) return [];
    const matches = message.body.match(/https?:\/\/[^\s]+/gi) ?? [];
    return matches.map((href) => ({
      messageId: message.id,
      href: href.replace(/[),.!?]+$/, ''),
      label: href.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    }));
  }), [messages]);

  useEffect(() => {
    messageIdsRef.current = messages.map((message) => message.id);
  }, [messages]);

  useEffect(() => {
    meNameRef.current = displayName(me?.profile);
  }, [me?.profile]);

  useEffect(() => {
    if (!draftKey || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(draftKey);
    if (saved) setBody((current) => current || saved);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || editing || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      if (body.trim()) window.localStorage.setItem(draftKey, body);
      else window.localStorage.removeItem(draftKey);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [body, draftKey, editing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === 'input' || tagName === 'textarea' || Boolean(target?.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }
      if (event.key === 'Escape') {
        setReactionOpen(null);
        setMessageMenu(null);
        if (searchOpen) {
          setSearchOpen(false);
          setThreadSearch('');
        } else if (!isTypingTarget) {
          setShowInfo(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 2600);
  }, []);

  const markRead = useCallback(async () => {
    if (!db || !user) return;
    if (typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus())) return;
    const result = await db.rpc('mark_conversation_read', { target_conversation_id: conversationId });
    if (result.error) {
      showToast('Read status will sync when the connection catches up.');
      return;
    }
    const readAt = typeof result.data === 'string' ? result.data : new Date().toISOString();
    setMembers((current) => current.map((member) => member.profile_id === user.id ? { ...member, last_read_at: readAt } : member));
  }, [conversationId, db, showToast, user]);

  const loadMembers = useCallback(async () => {
    if (!db || !user) return;
    const membershipResult = await db.from('conversation_members').select('conversation_id,profile_id,role,last_read_at,joined_at').eq('conversation_id', conversationId);
    const membershipRows = (membershipResult.data ?? []) as Member[];
    const profileIds = membershipRows.map((member) => member.profile_id);
    let profiles: Profile[] = [];
    if (profileIds.length) {
      const profileResult = await db.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label').in('id', profileIds);
      profiles = (profileResult.data ?? []) as Profile[];
    }
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    setMembers(membershipRows.map((member) => ({ ...member, profile: profileMap.get(member.profile_id) })));
  }, [conversationId, db, user]);

  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (!db || !messageIds.length) {
      setReactions([]);
      return;
    }
    const result = await db.from('message_reactions').select('message_id,profile_id,reaction_key,created_at').in('message_id', messageIds);
    if (result.error) {
      setError((current) => current || 'Unable to refresh message reactions.');
      return;
    }
    setReactions((result.data ?? []) as Reaction[]);
  }, [db]);

  const load = useCallback(async (initial = true) => {
    if (!db || !user) return;
    if (initial) setLoading(true);
    setError('');

    const [conversationResult, messageResult, preferenceResult] = await Promise.all([
      db.from('conversations').select('id,title,conversation_type,updated_at').eq('id', conversationId).maybeSingle(),
      db.from('messages').select('id,conversation_id,sender_id,body,attachment_url,reply_to_id,deleted_at,edited_at,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(PAGE_SIZE),
      db.from('conversation_preferences').select('is_pinned,muted_until,archived_at').eq('conversation_id', conversationId).eq('profile_id', user.id).maybeSingle(),
    ]);

    if (conversationResult.error || messageResult.error || !conversationResult.data) {
      setError('This conversation is unavailable or you no longer have access.');
      if (initial) setLoading(false);
      return;
    }

    const loadedConversation = conversationResult.data as Conversation;
    const next = ((messageResult.data ?? []) as Message[]).reverse();
    setConversation(loadedConversation);
    setMessages(next);
    setHasOlder(next.length === PAGE_SIZE);
    if (preferenceResult.data) setPreference(preferenceResult.data as Preference);
    await Promise.all([loadMembers(), loadReactions(next.map((message) => message.id)), markRead()]);
    if (initial) {
      setLoading(false);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
    }
  }, [conversationId, db, loadMembers, loadReactions, markRead, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!conversation) return;
    const markWhenActive = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void markRead();
    };
    document.addEventListener('visibilitychange', markWhenActive);
    window.addEventListener('focus', markWhenActive);
    return () => {
      document.removeEventListener('visibilitychange', markWhenActive);
      window.removeEventListener('focus', markWhenActive);
    };
  }, [conversation, markRead]);

  useEffect(() => {
    if (!supabase || !user || !conversation) return;

    const channel = supabase.channel(`rch-conversation-${conversationId}`, {
      config: { presence: { key: user.id } },
    }) as any;
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: { new: Message }) => {
        const next = payload.new;
        setMessages((current) => current.some((message) => message.id === next.id) ? current : [...current, next]);
        void markRead();
        window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: { new: Message }) => {
        const next = payload.new;
        setMessages((current) => current.map((message) => message.id === next.id ? next : message));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        void loadReactions(messageIdsRef.current);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${conversationId}` }, () => {
        void loadMembers();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { profile_id?: string; name?: string } }) => {
        const profileId = payload?.profile_id;
        if (!profileId || profileId === user.id) return;
        const name = payload.name || 'Someone';
        setTypingNames((current) => current.includes(name) ? current : [...current, name]);
        if (typingTimers.current[profileId]) window.clearTimeout(typingTimers.current[profileId]);
        typingTimers.current[profileId] = window.setTimeout(() => {
          setTypingNames((current) => current.filter((item) => item !== name));
          delete typingTimers.current[profileId];
        }, 1800);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ profile_id?: string }>>;
        const ids = Object.values(state).flat().map((entry) => entry.profile_id).filter((id): id is string => Boolean(id));
        setOnlineIds([...new Set(ids)]);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ profile_id: user.id, name: meNameRef.current, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channelRef.current = null;
      Object.values(typingTimers.current).forEach((timer) => window.clearTimeout(timer));
      typingTimers.current = {};
      void supabase.removeChannel(channel);
    };
  }, [conversation, conversationId, loadMembers, loadReactions, markRead, supabase, user]);

  useEffect(() => {
    let active = true;
    if (!attachmentFile || attachmentFile.type.startsWith('audio/') || attachmentFile.size > 8 * 1024 * 1024) {
      setAttachmentPreview('');
      return () => { active = false; };
    }
    void readMediaPreview(attachmentFile).then((preview) => { if (active) setAttachmentPreview(preview); });
    return () => { active = false; };
  }, [attachmentFile]);

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const loadOlder = async () => {
    if (!db || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    const oldest = messages[0].created_at;
    const result = await db.from('messages').select('id,conversation_id,sender_id,body,attachment_url,reply_to_id,deleted_at,edited_at,created_at').eq('conversation_id', conversationId).lt('created_at', oldest).order('created_at', { ascending: false }).limit(PAGE_SIZE);
    if (result.error) {
      setError(result.error.message || 'Unable to load earlier messages.');
      setLoadingOlder(false);
      return;
    }
    const older = ((result.data ?? []) as Message[]).reverse();
    setMessages((current) => [...older, ...current]);
    setHasOlder(older.length === PAGE_SIZE);
    await loadReactions([...older, ...messages].map((message) => message.id));
    setLoadingOlder(false);
  };

  const chooseAttachment = (file: File | null) => {
    if (!file) return;
    if (file.type.startsWith('audio/')) {
      if (file.size <= 0 || file.size > VOICE_NOTE_MAX_BYTES) {
        setError('Voice notes must be 10MB or smaller.');
        return;
      }
    } else {
      const issue = socialMediaError(file);
      if (issue) {
        setError(issue);
        return;
      }
    }
    setAttachmentFile(file);
    setError('');
  };

  const uploadAttachment = async () => {
    if (!supabase || !user || !attachmentFile) return null;
    const extension = attachmentFile.type.startsWith('audio/')
      ? audioExtension(attachmentFile.type)
      : socialMediaExtension(attachmentFile.type);
    if (!extension) throw new Error('That attachment type is not supported.');
    const filename = `${attachmentFile.type.startsWith('audio/') ? 'voice-' : ''}${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const path = `${user.id}/messages/${conversationId}/${filename}`;
    const uploaded = await supabase.storage.from('media').upload(path, attachmentFile, {
      upsert: false,
      contentType: attachmentFile.type,
      cacheControl: '3600',
    });
    if (uploaded.error) throw uploaded.error;
    return { path, url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl };
  };

  const resetComposer = () => {
    setBody('');
    setReplyTo(null);
    setEditing(null);
    setAttachmentFile(null);
    setAttachmentPreview('');
  };

  const restoreDraftAfterEdit = () => {
    const saved = draftKey && typeof window !== 'undefined' ? window.localStorage.getItem(draftKey) ?? '' : '';
    setEditing(null);
    setReplyTo(null);
    setAttachmentFile(null);
    setAttachmentPreview('');
    setBody(saved);
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!db || !user || sending) return;

    if (editing) {
      if (!trimmed) return;
      setSending(true);
      const result = await db.from('messages').update({ body: trimmed, edited_at: new Date().toISOString() }).eq('id', editing.id).eq('sender_id', user.id);
      if (result.error) setError(result.error.message);
      else restoreDraftAfterEdit();
      setSending(false);
      return;
    }

    if (!trimmed && !attachmentFile) return;
    setSending(true);
    setError('');

    let uploadedPath: string | null = null;
    try {
      const attachment = attachmentFile ? await uploadAttachment() : null;
      uploadedPath = attachment?.path ?? null;
      const fallbackBody = attachmentFile
        ? (attachmentFile.type.startsWith('audio/')
          ? 'Shared a voice note'
          : attachmentFile.type.startsWith('video/')
            ? 'Shared a video'
            : 'Shared a photo')
        : '';
      const result = await db.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: trimmed || fallbackBody,
        attachment_url: attachment?.url ?? null,
        reply_to_id: replyTo?.id ?? null,
      }).select('id,conversation_id,sender_id,body,attachment_url,reply_to_id,deleted_at,edited_at,created_at').single();

      if (result.error) throw result.error;
      const sent = result.data as Message;
      setMessages((current) => current.some((message) => message.id === sent.id) ? current : [...current, sent]);
      if (draftKey && typeof window !== 'undefined') window.localStorage.removeItem(draftKey);
      resetComposer();
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    } catch (sendError) {
      if (uploadedPath && supabase) {
        await supabase.storage.from('media').remove([uploadedPath]);
      }
      setError(sendError instanceof Error ? sendError.message : 'Unable to send that message.');
    }

    setSending(false);
  };

  const broadcastTyping = (value: string) => {
    setBody(value);
    if (!value.trim() || !channelRef.current || !user) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 700) return;
    lastTypingSent.current = now;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { profile_id: user.id, name: displayName(me?.profile) },
    });
  };

  const toggleReaction = async (messageId: string, reactionKey: string) => {
    if (!db || !user) return;
    const exists = reactions.some((reaction) => reaction.message_id === messageId && reaction.profile_id === user.id && reaction.reaction_key === reactionKey);
    const result = exists
      ? await db.from('message_reactions').delete().eq('message_id', messageId).eq('profile_id', user.id).eq('reaction_key', reactionKey)
      : await db.from('message_reactions').insert({ message_id: messageId, profile_id: user.id, reaction_key: reactionKey });
    if (result.error) {
      setError(result.error.message || 'Unable to update that reaction.');
      return;
    }
    setReactionOpen(null);
    await loadReactions(messageIdsRef.current);
  };

  const deleteMessage = async (message: Message) => {
    if (!db || !user || message.sender_id !== user.id) return;
    const attachmentPath = mediaStoragePath(message.attachment_url);
    const result = await db.from('messages').update({
      deleted_at: new Date().toISOString(),
    }).eq('id', message.id).eq('sender_id', user.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (attachmentPath && supabase) {
      const removed = await supabase.storage.from('media').remove([attachmentPath]);
      if (removed.error) setError('Message removed, but its uploaded media could not be cleaned up.');
    }
    setMessageMenu(null);
  };

  const focusComposer = () => {
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setRecording(false);
  };

  const startVoiceRecording = async () => {
    if (recording) {
      stopVoiceRecording();
      return;
    }
    if (recordingStarting || editing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice notes are not supported in this browser.');
      return;
    }
    setRecordingStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const supportedType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorderStreamRef.current = stream;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        const type = recorder.mimeType || supportedType || 'audio/webm';
        const blob = new Blob(recorderChunksRef.current, { type });
        recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        recorderStreamRef.current = null;
        recorderRef.current = null;
        recorderChunksRef.current = [];
        setRecording(false);
        setRecordingSeconds(0);
        if (!blob.size) {
          setError('That voice note was empty. Try recording again.');
          return;
        }
        chooseAttachment(new File([blob], `voice-note-${Date.now()}.${audioExtension(type)}`, { type }));
        showToast('Voice note ready to send');
      };
      recorder.start(250);
      setRecordingStarting(false);
      setAttachmentFile(null);
      setAttachmentPreview('');
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => {
          if (seconds >= 119) {
            window.setTimeout(stopVoiceRecording, 0);
            return 120;
          }
          return seconds + 1;
        });
      }, 1000);
    } catch (recordError) {
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setRecordingStarting(false);
      setError(recordError instanceof Error ? recordError.message : 'Microphone access is required for voice notes.');
    }
  };

  const beginSwipeReply = (event: React.TouchEvent, messageId: string) => {
    const touch = event.touches[0];
    if (!touch) return;
    swipeReplyRef.current = { id: messageId, x: touch.clientX, y: touch.clientY };
  };

  const finishSwipeReply = (event: React.TouchEvent, message: Message) => {
    const start = swipeReplyRef.current;
    swipeReplyRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || start.id !== message.id || message.deleted_at) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (dx < 56 || Math.abs(dy) > 44) return;
    setReplyTo(message);
    setEditing(null);
    setReactionOpen(null);
    setMessageMenu(null);
    showToast('Replying to message');
    focusComposer();
  };

  const editMessage = (message: Message) => {
    setEditing(message);
    setReplyTo(null);
    setAttachmentFile(null);
    setBody(message.body);
    setMessageMenu(null);
    focusComposer();
  };

  const savePreference = async (patch: Partial<Preference>) => {
    if (!db || !user) return;
    const next = { ...preference, ...patch };
    const result = await db.from('conversation_preferences').upsert({
      conversation_id: conversationId,
      profile_id: user.id,
      ...next,
    }, { onConflict: 'conversation_id,profile_id' });
    if (result.error) setError(result.error.message);
    else setPreference(next);
  };

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    setShowJump(node.scrollHeight - node.scrollTop - node.clientHeight > 360);
  };

  const jumpSearch = (direction: number) => {
    if (!searchMatches.length) return;
    const next = ((searchCursor + direction) % searchMatches.length + searchMatches.length) % searchMatches.length;
    setSearchCursor(next);
    const target = searchMatches[next];
    window.requestAnimationFrame(() => document.getElementById(`rch-message-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  useEffect(() => {
    setSearchCursor(searchMatches.length ? searchMatches.length - 1 : 0);
  }, [threadSearch, searchMatches.length]);

  const startDirectCall = (kind: 'audio' | 'video') => {
    if (!peer || conversation?.conversation_type !== 'direct') return;
    window.dispatchEvent(new CustomEvent('rch:start-message-call', {
      detail: {
        conversationId,
        calleeId: peer.id,
        kind,
        peerName: displayName(peer),
        peerAvatar: peer.avatar_url,
      },
    }));
  };

  const presenceText = (() => {
    if (!conversation) return '';
    if (conversation.conversation_type === 'direct') {
      return peer && onlineIds.includes(peer.id) ? 'Active here now' : 'Direct message';
    }
    const onlineOthers = others.filter((member) => onlineIds.includes(member.profile_id)).length;
    return `${members.length} members${onlineOthers ? ` · ${onlineOthers} active` : ''}`;
  })();

  const reactionsFor = (messageId: string) => {
    const rows = reactions.filter((reaction) => reaction.message_id === messageId);
    const grouped = new Map<string, { count: number; mine: boolean }>();
    rows.forEach((reaction) => {
      const current = grouped.get(reaction.reaction_key) ?? { count: 0, mine: false };
      current.count += 1;
      if (reaction.profile_id === user?.id) current.mine = true;
      grouped.set(reaction.reaction_key, current);
    });
    return [...grouped.entries()];
  };

  const readStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return '';
    const seen = others.filter((member) => member.last_read_at && new Date(member.last_read_at).getTime() >= new Date(message.created_at).getTime()).length;
    if (!others.length) return 'Sent';
    if (conversation?.conversation_type === 'direct') return seen ? 'Seen' : 'Delivered';
    return seen ? `Seen by ${seen}` : 'Sent';
  };

  if (loading) {
    return <main className="rcl-messages-shell"><Container maxWidth="xl" className="py-7"><div className="rcl-thread-loading" /></Container></main>;
  }

  if (error && !conversation) {
    return (
      <main className="rcl-messages-shell">
        <Container maxWidth="lg" className="py-16 text-center">
          <span className="rcl-messages-lock"><FiMessageCircle /></span>
          <h1>Conversation unavailable</h1>
          <p>{error}</p>
          <Link href="/messages" className="rcl-message-primary-button">Back to messages</Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="rcl-messages-shell rcl-thread-page">
      <Container maxWidth="xl" className="py-4 sm:py-7">
        <div className="rcl-thread-topline">
          <Link href="/messages"><FiArrowLeft /> Messages</Link>
          <div>
            <button type="button" onClick={() => { setSearchOpen((value) => !value); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }} className={searchOpen ? 'active' : ''} aria-label="Search this conversation"><FiSearch /></button>
            <button type="button" onClick={() => void savePreference({ is_pinned: !preference.is_pinned })} className={preference.is_pinned ? 'active' : ''} aria-label={preference.is_pinned ? 'Unpin conversation' : 'Pin conversation'}><FiStar /></button>
            <button type="button" onClick={() => void savePreference({ muted_until: muted ? null : '2099-12-31T23:59:59.000Z' })} className={muted ? 'active' : ''} aria-label={muted ? 'Unmute conversation' : 'Mute conversation'}><FiBellOff /></button>
            <button type="button" onClick={() => setShowInfo((value) => !value)} className={showInfo ? 'active' : ''} aria-label="Conversation details"><FiInfo /></button>
          </div>
        </div>

        {error && <div className="rcl-message-error">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}
        {toast && <div className="rcl-message-toast" role="status">{toast}</div>}

        {conversation && (
          <div className={`rcl-thread-workspace ${showInfo ? 'show-info' : ''}`}>
            <section className="rcl-thread-main">
              <header className="rcl-thread-header">
                <Link href="/messages" className="rcl-thread-mobile-back" aria-label="Back to messages"><FiArrowLeft /></Link>
                <div className="rcl-thread-avatar">
                  {conversation.conversation_type === 'direct' ? <ProfileAvatarMedia src={peer?.avatar_url} alt={displayName(peer)} className="h-full w-full object-cover" /> : <FiUsers />}
                  {peer && onlineIds.includes(peer.id) && <i />}
                </div>
                <div className="rcl-thread-identity">
                  <h1>{conversationTitle}</h1>
                  <p>{typingNames.length ? `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…` : presenceText}</p>
                </div>
                {conversation.conversation_type === 'direct' && peer && <>
                  <button type="button" onClick={() => startDirectCall('audio')} aria-label="Start voice call" title="Voice call"><FiPhone /></button>
                  <button type="button" onClick={() => startDirectCall('video')} aria-label="Start video call" title="Video call"><FiVideo /></button>
                </>}
                <button type="button" onClick={() => { setSearchOpen(true); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }} className={`rcl-thread-header-search ${searchOpen ? 'active' : ''}`} aria-label="Search messages"><FiSearch /></button>
                <button type="button" onClick={() => setShowInfo((value) => !value)} aria-label="Conversation information"><FiMoreHorizontal /></button>
              </header>

              {searchOpen && (
                <div className="rcl-thread-searchbar" role="search">
                  <FiSearch />
                  <input
                    ref={searchInputRef}
                    value={threadSearch}
                    onChange={(event) => setThreadSearch(event.target.value)}
                    placeholder="Search this conversation"
                    aria-label="Search this conversation"
                  />
                  <span>{threadSearch.trim() ? `${searchMatches.length ? searchCursor + 1 : 0}/${searchMatches.length}` : '⌘F'}</span>
                  <button type="button" onClick={() => jumpSearch(-1)} disabled={!searchMatches.length} aria-label="Previous match">↑</button>
                  <button type="button" onClick={() => jumpSearch(1)} disabled={!searchMatches.length} aria-label="Next match">↓</button>
                  <button type="button" onClick={() => { setSearchOpen(false); setThreadSearch(''); }} aria-label="Close search"><FiX /></button>
                </div>
              )}

              <div className="rcl-thread-scroll" ref={scrollRef} onScroll={onScroll}>
                {hasOlder && <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="rcl-load-older">{loadingOlder ? 'Loading…' : 'Load earlier messages'}</button>}

                {!messages.length && (
                  <div className="rcl-thread-empty">
                    <span><FiSend /></span>
                    <h2>Start the conversation.</h2>
                    <p>Share a message, photo, video, game thought or basketball update.</p>
                  </div>
                )}

                {messages.map((message, index) => {
                  const mine = message.sender_id === user?.id;
                  const sender = memberMap.get(message.sender_id);
                  const previous = messages[index - 1];
                  const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
                  const grouped = previous && previous.sender_id === message.sender_id && (new Date(message.created_at).getTime() - new Date(previous.created_at).getTime()) < 5 * 60 * 1000 && !newDay;
                  const reply = message.reply_to_id ? messageMap.get(message.reply_to_id) : null;
                  const messageReactions = reactionsFor(message.id);
                  const attachmentOnly = message.attachment_url && ['Shared a photo', 'Shared a video', 'Shared a voice note'].includes(message.body);

                  return <div key={message.id}>
                    {newDay && <div className="rcl-message-day"><span>{dateLabel(message.created_at)}</span></div>}
                    <article
                      id={`rch-message-${message.id}`}
                      className={`rcl-chat-message ${mine ? 'mine' : 'theirs'} ${grouped ? 'grouped' : ''} ${activeSearchId === message.id ? 'search-hit' : ''}`}
                      onTouchStart={(event) => beginSwipeReply(event, message.id)}
                      onTouchEnd={(event) => finishSwipeReply(event, message)}
                    >
                      {!mine && !grouped && <div className="rcl-chat-avatar"><ProfileAvatarMedia src={sender?.avatar_url} alt={displayName(sender)} className="h-full w-full object-cover" /></div>}
                      {!mine && grouped && <div className="rcl-chat-avatar-spacer" />}

                      <div className="rcl-chat-message-content">
                        {!mine && !grouped && conversation.conversation_type !== 'direct' && <strong className="rcl-chat-sender">{displayName(sender)}</strong>}

                        {message.deleted_at ? (
                          <div className="rcl-message-deleted">Message removed</div>
                        ) : (
                          <>
                            {reply && <button type="button" className="rcl-reply-quote" onClick={() => document.getElementById(`rch-message-${reply.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} aria-label="Jump to replied message"><FiCornerUpLeft /><span><strong>{reply.sender_id === user?.id ? 'You' : displayName(memberMap.get(reply.sender_id))}</strong>{reply.deleted_at ? 'Message removed' : reply.body}</span></button>}

                            <div className="rcl-message-bubble">
                              {message.attachment_url && (
                                <div className="rcl-message-attachment">
                                  {isAudioAttachment(message.attachment_url)
                                    ? <div className="rcl-message-voice-note"><FiMic /><audio src={message.attachment_url} controls preload="metadata" /></div>
                                    : isVideoAttachment(message.attachment_url)
                                      ? <video src={message.attachment_url} controls playsInline preload="metadata" />
                                      : <img src={message.attachment_url} alt="Message attachment" />}
                                </div>
                              )}
                              {!attachmentOnly && <p>{message.body}</p>}
                            </div>

                            <div className="rcl-message-actions">
                              <button type="button" onClick={() => { setReplyTo(message); setEditing(null); focusComposer(); }} aria-label="Reply"><FiCornerUpLeft /></button>
                              <button type="button" onClick={() => setReactionOpen(reactionOpen === message.id ? null : message.id)} aria-label="React"><FiSmile /></button>
                              {mine && <button type="button" onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)} aria-label="More message actions"><FiMoreHorizontal /></button>}
                            </div>

                            {reactionOpen === message.id && (
                              <div className="rcl-reaction-picker">
                                {reactionOptions.map(([key, emoji]) => <button type="button" key={key} onClick={() => void toggleReaction(message.id, key)}>{emoji}</button>)}
                              </div>
                            )}

                            {messageMenu === message.id && mine && (
                              <div className="rcl-message-menu">
                                <button type="button" onClick={() => editMessage(message)}><FiEdit2 /> Edit</button>
                                <button type="button" onClick={() => void deleteMessage(message)}><FiTrash2 /> Remove</button>
                              </div>
                            )}

                            {messageReactions.length > 0 && (
                              <div className="rcl-message-reactions">
                                {messageReactions.map(([key, data]) => {
                                  const emoji = reactionOptions.find(([option]) => option === key)?.[1] ?? legacyReactionEmoji[key] ?? '•';
                                  return <button type="button" key={key} onClick={() => void toggleReaction(message.id, key)} className={data.mine ? 'mine' : ''}>{emoji}<span>{data.count}</span></button>;
                                })}
                              </div>
                            )}
                          </>
                        )}

                        <div className="rcl-message-time">
                          <span>{timeLabel(message.created_at)}{message.edited_at ? ' · Edited' : ''}</span>
                          {mine && <span className="rcl-read-status">{readStatus(message) === 'Seen' ? <FiCheckCircle /> : <FiCheck />}{readStatus(message)}</span>}
                        </div>
                      </div>
                    </article>
                  </div>;
                })}
                <div ref={bottomRef} />

                {showJump && <button type="button" className="rcl-jump-latest" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}><FiChevronDown /> Newest</button>}
              </div>

              <form onSubmit={send} className="rcl-message-composer">
                {(replyTo || editing) && (
                  <div className="rcl-composer-context">
                    <span>{editing ? <FiEdit2 /> : <FiCornerUpLeft />}</span>
                    <div><strong>{editing ? 'Editing message' : `Replying to ${replyTo?.sender_id === user?.id ? 'yourself' : displayName(memberMap.get(replyTo?.sender_id ?? ''))}`}</strong><p>{editing?.body ?? replyTo?.body}</p></div>
                    <button type="button" onClick={() => { setReplyTo(null); if (editing) restoreDraftAfterEdit(); }} aria-label="Cancel"><FiX /></button>
                  </div>
                )}

                {attachmentFile && !editing && (
                  <div className="rcl-attachment-preview">
                    <div>
                      {attachmentFile.type.startsWith('audio/')
                        ? <FiMic />
                        : attachmentPreview ? attachmentFile.type.startsWith('video/')
                          ? <video src={safeMediaPreviewUrl(attachmentPreview)} muted />
                          : <img src={safeMediaPreviewUrl(attachmentPreview)} alt="" />
                          : attachmentFile.type.startsWith('video/') ? <FiVideo /> : <FiImage />}
                    </div>
                    <span><strong>{attachmentFile.type.startsWith('audio/') ? 'Voice note ready' : attachmentFile.type.startsWith('video/') ? 'Video ready' : 'Photo ready'}</strong><small>{Math.max(1, Math.round(attachmentFile.size / 1024))} KB</small></span>
                    <button type="button" onClick={() => setAttachmentFile(null)} aria-label="Remove attachment"><FiX /></button>
                  </div>
                )}

                <div className="rcl-composer-row">
                  {!editing && <>
                    <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Attach photo"><FiImage /></button>
                    <button type="button" onClick={() => videoInputRef.current?.click()} aria-label="Attach video"><FiVideo /></button>
                    <button type="button" disabled={recordingStarting} onClick={() => void startVoiceRecording()} className={recording ? 'recording' : ''} aria-label={recordingStarting ? 'Starting voice recorder' : recording ? 'Stop voice recording' : 'Record voice note'}>{recording ? <FiStopCircle /> : <FiMic />}</button>
                    <input ref={imageInputRef} type="file" accept={SOCIAL_IMAGE_ACCEPT} className="hidden" onChange={(event) => { chooseAttachment(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
                    <input ref={videoInputRef} type="file" accept={SOCIAL_VIDEO_ACCEPT} className="hidden" onChange={(event) => { chooseAttachment(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
                  </>}

                  {recording && <div className="rcl-voice-recording"><i /><span>Recording {formatRecordingTime(recordingSeconds)}</span></div>}

                  <textarea
                    ref={composerRef}
                    value={body}
                    onChange={(event) => broadcastTyping(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={4000}
                    rows={1}
                    placeholder={editing ? 'Edit your message' : 'Message RCH…'}
                    aria-label="Write a message"
                  />

                  <button type="submit" disabled={sending || recording || (!body.trim() && !attachmentFile)} className="rcl-send-button" aria-label={editing ? 'Save edit' : 'Send message'}><FiSend /></button>
                </div>
                <small className="rcl-composer-hint">{!editing && body.trim() ? 'Draft saved on this device · ' : ''}Enter to send · Shift + Enter for a new line{body.length > 3600 ? ` · ${4000 - body.length} characters left` : ''}</small>
              </form>
            </section>

            <aside className="rcl-thread-info">
              <header>
                <button type="button" onClick={() => setShowInfo(false)} aria-label="Close details"><FiX /></button>
                <div className="rcl-thread-info-avatar">{conversation.conversation_type === 'direct' ? <ProfileAvatarMedia src={peer?.avatar_url} alt={displayName(peer)} className="h-full w-full object-cover" /> : <FiUsers />}</div>
                <h2>{conversationTitle}</h2>
                <p>{presenceText}</p>
              </header>

              <div className="rcl-thread-info-actions">
                <button type="button" onClick={() => { setShowInfo(false); setSearchOpen(true); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }} className={searchOpen ? 'active' : ''}><FiSearch /><span>Search</span></button>
                <button type="button" onClick={() => void savePreference({ is_pinned: !preference.is_pinned })} className={preference.is_pinned ? 'active' : ''}><FiStar /><span>{preference.is_pinned ? 'Pinned' : 'Pin'}</span></button>
                <button type="button" onClick={() => void savePreference({ muted_until: muted ? null : '2099-12-31T23:59:59.000Z' })} className={muted ? 'active' : ''}><FiBellOff /><span>{muted ? 'Muted' : 'Mute'}</span></button>
                <button type="button" onClick={() => void savePreference({ archived_at: preference.archived_at ? null : new Date().toISOString() })} className={preference.archived_at ? 'active' : ''}><FiArchive /><span>{preference.archived_at ? 'Archived' : 'Archive'}</span></button>
              </div>

              {peer && <Link href={`/social/profile/${peer.id}`} className="rcl-thread-profile-link"><FiUser /><span>View basketball profile</span></Link>}

              <section className="rcl-thread-members">
                <div><strong>People</strong><span>{members.length}</span></div>
                {members.map((member) => <Link key={member.profile_id} href={member.profile_id === user?.id ? '/social/profile/me' : `/social/profile/${member.profile_id}`}>
                  <span><ProfileAvatarMedia src={member.profile?.avatar_url} alt={displayName(member.profile)} className="h-full w-full object-cover" /></span>
                  <div><strong>{member.profile_id === user?.id ? 'You' : displayName(member.profile)}</strong><small>{member.role === 'admin' ? 'Conversation admin' : member.profile?.role ?? 'Member'}</small></div>
                  {onlineIds.includes(member.profile_id) && <i />}
                </Link>)}
              </section>

              <section className="rcl-thread-shared">
                <div><strong>Shared in this chat</strong><span>{sharedMedia.length + sharedLinks.length}</span></div>
                <div className="rcl-thread-shared-tabs" role="tablist" aria-label="Shared conversation content">
                  <button type="button" role="tab" aria-selected={infoTab === 'media'} className={infoTab === 'media' ? 'active' : ''} onClick={() => setInfoTab('media')}>Media <span>{sharedMedia.length}</span></button>
                  <button type="button" role="tab" aria-selected={infoTab === 'links'} className={infoTab === 'links' ? 'active' : ''} onClick={() => setInfoTab('links')}>Links <span>{sharedLinks.length}</span></button>
                </div>
                {infoTab === 'media' ? (
                  sharedMedia.length ? <div className="rcl-shared-grid">
                    {sharedMedia.slice(-12).reverse().map((message) => <a key={message.id} href={message.attachment_url!} target="_blank" rel="noopener noreferrer">
                      {isAudioAttachment(message.attachment_url)
                        ? <span><FiMic /></span>
                        : isVideoAttachment(message.attachment_url)
                          ? <span><FiVideo /></span>
                          : <img src={message.attachment_url!} alt="" />}
                    </a>)}
                  </div> : <p className="rcl-thread-shared-empty">Photos, videos, and voice notes shared here will stay easy to find.</p>
                ) : (
                  sharedLinks.length ? <div className="rcl-shared-links">
                    {sharedLinks.slice(-12).reverse().map((item, index) => <a key={`${item.messageId}-${index}`} href={item.href} target="_blank" rel="noopener noreferrer"><FiLink /><span>{item.label}</span></a>)}
                  </div> : <p className="rcl-thread-shared-empty">Links shared in this conversation will appear here.</p>
                )}
              </section>

              <Link href="/settings/privacy" className="rcl-thread-privacy">Messaging privacy & safety</Link>
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
}

