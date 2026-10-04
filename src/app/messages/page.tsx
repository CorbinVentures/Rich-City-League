'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiArchive,
  FiBellOff,
  FiEdit3,
  FiMessageCircle,
  FiSearch,
  FiStar,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { Container } from '@/components/Container';
import { ConversationList, type ConversationListItem } from '@/components/messaging/ConversationList';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type InboxView = 'INBOX' | 'UNREAD' | 'PINNED' | 'GROUPS' | 'ARCHIVED';
type ProfileResult = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: string };
type InboxRow = {
  conversation_id: string;
  title: string | null;
  conversation_type: string;
  updated_at: string;
  latest_body: string | null;
  latest_created_at: string | null;
  latest_sender_id: string | null;
  unread_count: number | string | null;
  is_pinned: boolean | null;
  muted_until: string | null;
  archived_at: string | null;
  peer_id: string | null;
  peer_display_name: string | null;
  peer_username: string | null;
  peer_avatar_url: string | null;
  peer_is_vip: boolean | null;
  peer_vip_label: string | null;
  peer_rep: number | null;
  peer_level: number | null;
  member_count: number | string | null;
};

const views: { key: InboxView; label: string; icon: typeof FiMessageCircle }[] = [
  { key: 'INBOX', label: 'Inbox', icon: FiMessageCircle },
  { key: 'UNREAD', label: 'Unread', icon: FiMessageCircle },
  { key: 'PINNED', label: 'Pinned', icon: FiStar },
  { key: 'GROUPS', label: 'Groups', icon: FiUsers },
  { key: 'ARCHIVED', label: 'Archived', icon: FiArchive },
];

function labelType(type: string) {
  return type === 'direct' ? 'DIRECT' : type.toUpperCase();
}

function personName(person: ProfileResult) {
  return person.display_name ?? person.username ?? 'RCH member';
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [view, setView] = useState<InboxView>('INBOX');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [people, setPeople] = useState<ProfileResult[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<ProfileResult[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [starting, setStarting] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!db || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const result = await db.rpc('get_message_inbox');
    if (result.error) {
      setError(result.error.message || 'Unable to load messages.');
      setLoading(false);
      return;
    }

    const rows = (result.data ?? []) as InboxRow[];
    const now = Date.now();
    const next: ConversationListItem[] = rows.map((row) => {
      const direct = row.conversation_type === 'direct';
      const title = direct
        ? (row.peer_display_name ?? row.peer_username ?? 'RCH member')
        : (row.title ?? (row.conversation_type === 'group' ? 'Group conversation' : 'RCH conversation'));
      const mutedUntil = row.muted_until ? new Date(row.muted_until).getTime() : 0;
      return {
        id: row.conversation_id,
        title,
        type: labelType(row.conversation_type),
        preview: row.latest_body ?? '',
        updatedAt: row.latest_created_at ?? row.updated_at,
        unread: Number(row.unread_count ?? 0),
        avatarUrl: direct ? row.peer_avatar_url : null,
        identity: direct && row.peer_id ? {
          id: row.peer_id,
          display_name: row.peer_display_name,
          username: row.peer_username,
          avatar_url: row.peer_avatar_url,
          is_vip: row.peer_is_vip,
          vip_label: row.peer_vip_label,
          rep: row.peer_rep ?? 0,
          level: row.peer_level ?? 1,
        } : null,
        isPinned: Boolean(row.is_pinned),
        isMuted: mutedUntil > now,
        isArchived: Boolean(row.archived_at),
        memberCount: Number(row.member_count ?? 0),
        lastSenderIsMe: row.latest_sender_id === user.id,
      };
    });

    setItems(next);
    setLoading(false);
  }, [db, user]);

  useEffect(() => {
    void loadConversations();
    if (!supabase || !user) return;
    const channel = supabase
      .channel('rch-messaging-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void loadConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: \`profile_id=eq.\${user.id}\` }, () => void loadConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_preferences', filter: \`profile_id=eq.\${user.id}\` }, () => void loadConversations())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, supabase, user]);

  useEffect(() => {
    if (!composeOpen || !db || !user) return;
    const timer = window.setTimeout(async () => {
      setPeopleLoading(true);
      const query = peopleSearch.trim();
      let request = db.from('profiles').select('id,display_name,username,avatar_url,role').eq('is_active', true).neq('id', user.id).limit(20);
      if (query) request = request.or(\`display_name.ilike.%\${query}%,username.ilike.%\${query}%\`);
      const result = await request;
      setPeople((result.data ?? []) as ProfileResult[]);
      setPeopleLoading(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [composeOpen, db, peopleSearch, user]);

  const visible = items.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || \`\${item.title} \${item.preview} \${item.type}\`.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (view === 'ARCHIVED') return item.isArchived;
    if (item.isArchived) return false;
    if (view === 'UNREAD') return item.unread > 0;
    if (view === 'PINNED') return item.isPinned;
    if (view === 'GROUPS') return ['GROUP', 'TEAM', 'COMMUNITY'].includes(item.type);
    return true;
  });

  const unreadTotal = items.filter((item) => !item.isArchived).reduce((sum, item) => sum + item.unread, 0);
  const pinnedTotal = items.filter((item) => item.isPinned && !item.isArchived).length;
  const groupTotal = items.filter((item) => ['GROUP', 'TEAM', 'COMMUNITY'].includes(item.type) && !item.isArchived).length;

  const savePreference = async (item: ConversationListItem, patch: Record<string, unknown>) => {
    if (!db || !user) return;
    const current = {
      conversation_id: item.id,
      profile_id: user.id,
      is_pinned: item.isPinned ?? false,
      muted_until: item.isMuted ? '2099-12-31T23:59:59.000Z' : null,
      archived_at: item.isArchived ? new Date().toISOString() : null,
      ...patch,
    };
    const result = await db.from('conversation_preferences').upsert(current, { onConflict: 'conversation_id,profile_id' });
    if (result.error) setError(result.error.message);
    else void loadConversations();
  };

  const togglePin = (item: ConversationListItem) => void savePreference(item, { is_pinned: !item.isPinned });
  const toggleMute = (item: ConversationListItem) => void savePreference(item, { muted_until: item.isMuted ? null : '2099-12-31T23:59:59.000Z' });
  const toggleArchive = (item: ConversationListItem) => void savePreference(item, { archived_at: item.isArchived ? null : new Date().toISOString() });

  const togglePerson = (person: ProfileResult) => {
    setSelectedPeople((current) => current.some((item) => item.id === person.id)
      ? current.filter((item) => item.id !== person.id)
      : [...current, person]);
  };

  const closeComposer = () => {
    setComposeOpen(false);
    setPeopleSearch('');
    setSelectedPeople([]);
    setGroupTitle('');
    setStarting(false);
  };

  const startConversation = async () => {
    if (!db || !user || !selectedPeople.length || starting) return;
    setStarting(true);
    setError('');

    let result: { data: string | null; error: { message?: string } | null };
    if (selectedPeople.length === 1) {
      result = await db.rpc('start_direct_conversation', { target_profile_id: selectedPeople[0].id });
    } else {
      const fallbackTitle = selectedPeople.slice(0, 3).map(personName).join(', ');
      result = await db.rpc('start_group_conversation', {
        target_profile_ids: selectedPeople.map((person) => person.id),
        group_title: groupTitle.trim() || fallbackTitle,
      });
    }

    if (result.error || !result.data) {
      setError(result.error?.message || 'Unable to start that conversation.');
      setStarting(false);
      return;
    }

    window.location.href = \`/messages/\${result.data}\`;
  };

  if (!authLoading && !user) {
    return (
      <main className="rcl-messages-shell">
        <Container maxWidth="lg" className="py-16 text-center">
          <span className="rcl-messages-lock"><FiMessageCircle /></span>
          <h1>RCH Messages</h1>
          <p>Sign in to access private conversations with players, coaches, teams and the RCH community.</p>
          <Link href="/auth/sign-in?next=/messages" className="rcl-message-primary-button">Sign in</Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="rcl-messages-shell">
      <Container maxWidth="xl" className="py-7 sm:py-10">
        <section className="rcl-inbox-hero">
          <div>
            <p>RCH Messages</p>
            <h1>Your basketball conversations.</h1>
            <span>Private, realtime messaging built around the people, teams and communities in your basketball world.</span>
          </div>
          <button type="button" onClick={() => setComposeOpen(true)} className="rcl-message-primary-button"><FiEdit3 /> New message</button>
        </section>

        <section className="rcl-message-overview" aria-label="Messaging overview">
          <div><span>Unread</span><strong>{unreadTotal}</strong><small>Messages waiting for you</small></div>
          <div><span>Pinned</span><strong>{pinnedTotal}</strong><small>Priority conversations</small></div>
          <div><span>Groups</span><strong>{groupTotal}</strong><small>Team and community threads</small></div>
        </section>

        <section className="rcl-inbox-workspace">
          <aside className="rcl-inbox-sidebar">
            <div className="rcl-inbox-sidebar-head">
              <strong>Messages</strong>
              <button type="button" onClick={() => setComposeOpen(true)} aria-label="New message"><FiEdit3 /></button>
            </div>
            <nav aria-label="Message views">
              {views.map(({ key, label, icon: Icon }) => {
                const count = key === 'UNREAD' ? unreadTotal : key === 'PINNED' ? pinnedTotal : key === 'GROUPS' ? groupTotal : undefined;
                return <button key={key} type="button" onClick={() => setView(key)} className={view === key ? 'active' : ''}><Icon /><span>{label}</span>{typeof count === 'number' && count > 0 ? <b>{count}</b> : null}</button>;
              })}
            </nav>
            <div className="rcl-inbox-sidebar-note">
              <FiBellOff />
              <div><strong>Notification control</strong><p>Choose how message alerts reach you.</p><Link href="/settings/notifications">Open settings</Link></div>
            </div>
          </aside>

          <div className="rcl-inbox-main">
            <header className="rcl-inbox-toolbar">
              <div className="rcl-inbox-title">
                <h2>{views.find((item) => item.key === view)?.label ?? 'Inbox'}</h2>
                <span>{visible.length} conversation{visible.length === 1 ? '' : 's'}</span>
              </div>
              <label className="rcl-message-search">
                <FiSearch />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><FiX /></button>}
              </label>
            </header>

            {error && <div className="rcl-message-error">{error}<button type="button" onClick={() => { setError(''); void loadConversations(); }}>Retry</button></div>}

            <div className="rcl-inbox-list">
              {authLoading || loading ? (
                <div className="rcl-message-skeletons">{[1,2,3,4,5].map((row) => <div key={row}><i /><span><b /><em /></span></div>)}</div>
              ) : (
                <ConversationList
                  items={visible}
                  emptyMessage={items.length ? 'No conversations match this view.' : 'Start a conversation with someone in the RCH community.'}
                  onPin={togglePin}
                  onMute={toggleMute}
                  onArchive={toggleArchive}
                />
              )}
            </div>
          </div>
        </section>
      </Container>

      {composeOpen && (
        <div className="rcl-message-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeComposer(); }}>
          <section className="rcl-message-compose">
            <header>
              <div><p>Start a conversation</p><h2 id="compose-title">{selectedPeople.length > 1 ? 'New group' : 'New message'}</h2></div>
              <button type="button" onClick={closeComposer} aria-label="Close"><FiX /></button>
            </header>

            {selectedPeople.length > 0 && (
              <div className="rcl-selected-people">
                {selectedPeople.map((person) => <button type="button" key={person.id} onClick={() => togglePerson(person)}><span>{person.avatar_url ? <img src={person.avatar_url} alt="" /> : personName(person).slice(0, 1).toUpperCase()}</span>{personName(person)}<FiX /></button>)}
              </div>
            )}

            {selectedPeople.length > 1 && (
              <label className="rcl-group-title">
                <span>Group name</span>
                <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} maxLength={80} placeholder="Give this conversation a name" />
              </label>
            )}

            <label className="rcl-compose-search">
              <FiSearch />
              <input autoFocus value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Search players, coaches and members" />
            </label>

            <div className="rcl-people-results">
              {peopleLoading ? <p>Finding people…</p> : people.map((person) => {
                const selected = selectedPeople.some((item) => item.id === person.id);
                return <button type="button" key={person.id} onClick={() => togglePerson(person)} className={selected ? 'selected' : ''}>
                  <span className="rcl-person-result-avatar">{person.avatar_url ? <img src={person.avatar_url} alt="" /> : personName(person).slice(0, 2).toUpperCase()}</span>
                  <span><strong>{personName(person)}</strong><small>{person.username ? \`@\${person.username} · \` : ''}{person.role}</small></span>
                  <i>{selected ? '✓' : '+'}</i>
                </button>;
              })}
            </div>

            <footer>
              <p>{selectedPeople.length === 0 ? 'Choose one person for a direct message or several for a group.' : selectedPeople.length === 1 ? 'Direct message' : \`Group with \${selectedPeople.length + 1} members\`}</p>
              <button type="button" disabled={!selectedPeople.length || starting} onClick={() => void startConversation()} className="rcl-message-primary-button">{starting ? 'Opening…' : selectedPeople.length > 1 ? 'Create group' : 'Open conversation'}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
