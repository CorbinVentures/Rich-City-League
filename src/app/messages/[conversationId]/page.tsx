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
  FiMessageCircle,
  FiMoreHorizontal,
  FiCornerUpLeft,
  FiSend,
  FiSmile,
  FiStar,
  FiTrash2,
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
  ['like', '👍'],
  ['love', '❤️'],
  ['fire', '🔥'],
  ['laugh', '😂'],
  ['wow', '😮'],
  ['clutch', '🏀'],
] as const;

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimers = useRef<Record<string, number>>({});
  const lastTypingSent = useRef(0);
  const messageIdsRef = useRef<string[]>([]);
  const meNameRef = useRef('RCH member');

  const me = members.find((member) => member.profile_id === user?.id);
  const others = members.filter((member) => member.profile_id !== user?.id);
  const peer = conversation?.conversation_type === 'direct' ? others[0]?.profile ?? null : null;
  const conversationTitle = conversation?.conversation_type === 'direct'
    ? displayName(peer)
    : conversation?.title ?? 'RCH conversation';
  const muted = Boolean(preference.muted_until && new Date(preference.muted_until).getTime() > Date.now());

  const memberMap = useMemo(() => new Map(members.map((member) => [member.profile_id, member.profile])), [members]);
  const messageMap = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  useEffect(() => {
    messageIdsRef.current = messages.map((message) => message.id);
  }, [messages]);

  useEffect(() => {
    meNameRef.current = displayName(me?.profile);
  }, [me?.profile]);

  const markRead = useCallback(async () => {
    if (!db || !user) return;
    if (typeof document !== 'undefined' && (document.visibilityState !== 'visible' || !document.hasFocus())) return;
    const result = await db.rpc('mark_conversation_read', { target_conversation_id: conversationId });
    if (result.error) {
      setError((current) => current || 'Unable to update read status.');
      return;
    }
    const readAt = typeof result.data === 'string' ? result.data : new Date().toISOString();
    setMembers((current) => current.map((member) => member.profile_id === user.id ? { ...member, last_read_at: readAt } : member));
  }, [conversationId, db, user]);

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
    if (!attachmentFile || attachmentFile.size > 8 * 1024 * 1024) {
      setAttachmentPreview('');
      return () => { active = false; };
    }
    void readMediaPreview(attachmentFile).then((preview) => { if (active) setAttachmentPreview(preview); });
    return () => { active = false; };
  }, [attachmentFile]);

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
    const issue = socialMediaError(file);
    if (issue) {
      setError(issue);
      return;
    }
    setAttachmentFile(file);
    setError('');
  };

  const uploadAttachment = async () => {
    if (!supabase || !user || !attachmentFile) return null;
    const extension = socialMediaExtension(attachmentFile.type);
    if (!extension) throw new Error('That attachment type is not supported.');
    const path = `${user.id}/messages/${conversationId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
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

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!db || !user || sending) return;

    if (editing) {
      if (!trimmed) return;
      setSending(true);
      const result = await db.from('messages').update({ body: trimmed, edited_at: new Date().toISOString() }).eq('id', editing.id).eq('sender_id', user.id);
      if (result.error) setError(result.error.message);
      else resetComposer();
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
      const fallbackBody = attachmentFile ? (attachmentFile.type.startsWith('video/') ? 'Shared a video' : 'Shared a photo') : '';
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
            <button type="button" onClick={() => void savePreference({ is_pinned: !preference.is_pinned })} className={preference.is_pinned ? 'active' : ''} aria-label={preference.is_pinned ? 'Unpin conversation' : 'Pin conversation'}><FiStar /></button>
            <button type="button" onClick={() => void savePreference({ muted_until: muted ? null : '2099-12-31T23:59:59.000Z' })} className={muted ? 'active' : ''} aria-label={muted ? 'Unmute conversation' : 'Mute conversation'}><FiBellOff /></button>
            <button type="button" onClick={() => setShowInfo((value) => !value)} className={showInfo ? 'active' : ''} aria-label="Conversation details"><FiInfo /></button>
          </div>
        </div>

        {error && <div className="rcl-message-error">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}

        {conversation && (
          <div className={`rcl-thread-workspace ${showInfo ? 'show-info' : ''}`}>
            <section className="rcl-thread-main">
              <header className="rcl-thread-header">
                <div className="rcl-thread-avatar">
                  {conversation.conversation_type === 'direct' ? <ProfileAvatarMedia src={peer?.avatar_url} alt={displayName(peer)} className="h-full w-full object-cover" /> : <FiUsers />}
                  {peer && onlineIds.includes(peer.id) && <i />}
                </div>
                <div>
                  <h1>{conversationTitle}</h1>
                  <p>{typingNames.length ? `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…` : presenceText}</p>
                </div>
                <button type="button" onClick={() => setShowInfo((value) => !value)} aria-label="Conversation information"><FiMoreHorizontal /></button>
              </header>

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
                  const attachmentOnly = message.attachment_url && ['Shared a photo', 'Shared a video'].includes(message.body);

                  return <div key={message.id}>
                    {newDay && <div className="rcl-message-day"><span>{dateLabel(message.created_at)}</span></div>}
                    <article id={`rch-message-${message.id}`} className={`rcl-chat-message ${mine ? 'mine' : 'theirs'} ${grouped ? 'grouped' : ''}`}>
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
                                  {isVideoAttachment(message.attachment_url)
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
                                  const emoji = reactionOptions.find(([option]) => option === key)?.[1] ?? '•';
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
                    <button type="button" onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setBody(''); } }} aria-label="Cancel"><FiX /></button>
                  </div>
                )}

                {attachmentFile && !editing && (
                  <div className="rcl-attachment-preview">
                    <div>
                      {attachmentPreview ? attachmentFile.type.startsWith('video/')
                        ? <video src={safeMediaPreviewUrl(attachmentPreview)} muted />
                        : <img src={safeMediaPreviewUrl(attachmentPreview)} alt="" />
                        : attachmentFile.type.startsWith('video/') ? <FiVideo /> : <FiImage />}
                    </div>
                    <span><strong>{attachmentFile.type.startsWith('video/') ? 'Video ready' : 'Photo ready'}</strong><small>{Math.max(1, Math.round(attachmentFile.size / 1024))} KB</small></span>
                    <button type="button" onClick={() => setAttachmentFile(null)} aria-label="Remove attachment"><FiX /></button>
                  </div>
                )}

                <div className="rcl-composer-row">
                  {!editing && <>
                    <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Attach photo"><FiImage /></button>
                    <button type="button" onClick={() => videoInputRef.current?.click()} aria-label="Attach video"><FiVideo /></button>
                    <input ref={imageInputRef} type="file" accept={SOCIAL_IMAGE_ACCEPT} className="hidden" onChange={(event) => { chooseAttachment(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
                    <input ref={videoInputRef} type="file" accept={SOCIAL_VIDEO_ACCEPT} className="hidden" onChange={(event) => { chooseAttachment(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
                  </>}

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

                  <button type="submit" disabled={sending || (!body.trim() && !attachmentFile)} className="rcl-send-button" aria-label={editing ? 'Save edit' : 'Send message'}><FiSend /></button>
                </div>
                <small className="rcl-composer-hint">Enter to send · Shift + Enter for a new line</small>
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
                <button type="button" onClick={() => void savePreference({ is_pinned: !preference.is_pinned })} className={preference.is_pinned ? 'active' : ''}><FiStar /><span>{preference.is_pinned ? 'Pinned' : 'Pin'}</span></button>
                <button type="button" onClick={() => void savePreference({ muted_until: muted ? null : '2099-12-31T23:59:59.000Z' })} className={muted ? 'active' : ''}><FiBellOff /><span>{muted ? 'Muted' : 'Mute'}</span></button>
                <button type="button" onClick={() => void savePreference({ archived_at: preference.archived_at ? null : new Date().toISOString() })} className={preference.archived_at ? 'active' : ''}><FiArchive /><span>{preference.archived_at ? 'Archived' : 'Archive'}</span></button>
              </div>

              <section className="rcl-thread-members">
                <div><strong>People</strong><span>{members.length}</span></div>
                {members.map((member) => <Link key={member.profile_id} href={member.profile_id === user?.id ? '/social/profile/me' : `/social/profile/${member.profile_id}`}>
                  <span><ProfileAvatarMedia src={member.profile?.avatar_url} alt={displayName(member.profile)} className="h-full w-full object-cover" /></span>
                  <div><strong>{member.profile_id === user?.id ? 'You' : displayName(member.profile)}</strong><small>{member.role === 'admin' ? 'Conversation admin' : member.profile?.role ?? 'Member'}</small></div>
                  {onlineIds.includes(member.profile_id) && <i />}
                </Link>)}
              </section>

              <section className="rcl-thread-shared">
                <div><strong>Shared media</strong><span>{messages.filter((message) => message.attachment_url && !message.deleted_at).length}</span></div>
                <div className="rcl-shared-grid">
                  {messages.filter((message) => message.attachment_url && !message.deleted_at).slice(-6).reverse().map((message) => <a key={message.id} href={message.attachment_url!} target="_blank" rel="noopener noreferrer">
                    {isVideoAttachment(message.attachment_url) ? <span><FiVideo /></span> : <img src={message.attachment_url!} alt="" />}
                  </a>)}
                </div>
              </section>

              <Link href="/settings/privacy" className="rcl-thread-privacy">Messaging privacy & safety</Link>
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
}

