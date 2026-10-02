'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowLeft,
  FaBasketball,
  FaCompass,
  FaHouse,
  FaImage,
  FaMagnifyingGlass,
  FaPeopleGroup,
  FaPlus,
  FaVideo,
  FaXmark,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ReferralCard } from '@/components/ReferralCard';
import { SocialIdentity } from '@/components/SocialIdentity';
import { SocialLinkField } from '@/components/SocialRichContent';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { scoreSocialPost } from '@/lib/social-feed';
import {
  readMediaPreview,
  safeMediaPreviewUrl,
  SOCIAL_MEDIA_ACCEPT,
  socialMediaError,
  socialMediaExtension,
} from '@/lib/social-media';
import {
  NetworkPostCard,
  type NetworkAuthor,
  type NetworkComment,
  type NetworkFeedItem,
  type NetworkPost,
  type NetworkReaction,
  type NetworkRepost,
} from '@/components/social/NetworkPostCard';

type Story = {
  id: string;
  author_id: string;
  body: string | null;
  media_url: string | null;
  expires_at: string;
  author?: NetworkAuthor;
};

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  community_type: string | null;
};

type Run = {
  id: string;
  title: string;
  starts_at: string;
  court_name: string | null;
  location: string | null;
  game_format: string | null;
};

type FeedMode = 'for-you' | 'following' | 'trending';

const leftNav = [
  { href: '/social', label: 'Home', icon: FaHouse },
  { href: '/discover', label: 'Discover', icon: FaCompass },
  { href: '/create', label: 'Create', icon: FaPlus },
  { href: '/runs', label: 'Runs', icon: FaBasketball },
  { href: '/league', label: 'League', icon: FaBasketball },
];

export default function NetworkHome() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;

  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [reposts, setReposts] = useState<NetworkRepost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentProfile, setCurrentProfile] = useState<NetworkAuthor | null>(null);
  const [suggestedProfiles, setSuggestedProfiles] = useState<NetworkAuthor[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<FeedMode>('for-you');
  const [search, setSearch] = useState('');
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [reactionBurst, setReactionBurst] = useState<Record<string, string>>({});

  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyBody, setStoryBody] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState('');
  const [publishingStory, setPublishingStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const post = params.get('post');
    setFocusPostId(post);
    if (params.get('compose') === '1' && user) setComposerOpen(true);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!mediaFile || mediaFile.size > 8 * 1024 * 1024) { setMediaPreview(''); return () => { active = false; }; }
    void readMediaPreview(mediaFile).then((preview) => { if (active) setMediaPreview(preview); });
    return () => { active = false; };
  }, [mediaFile]);

  useEffect(() => {
    let active = true;
    if (!storyFile || storyFile.size > 8 * 1024 * 1024) { setStoryPreview(''); return () => { active = false; }; }
    void readMediaPreview(storyFile).then((preview) => { if (active) setStoryPreview(preview); });
    return () => { active = false; };
  }, [storyFile]);

  const signInForNetwork = () => {
    window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  };

  const openComposer = () => {
    if (!user) { signInForNetwork(); return; }
    setComposerOpen(true);
  };

  const trackActivity = async (activityType: string, entityType?: string, entityId?: string, metadata: Record<string, unknown> = {}) => {
    if (!db || !user) return;
    await db.from('user_activity').insert({
      profile_id: user.id,
      activity_type: activityType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata,
    });
  };

  const refreshRep = async () => {
    if (!db || !user) return;
    const { data } = await db.from('user_levels').select('xp,level').eq('profile_id', user.id).maybeSingle();
    if (!data) return;
    setCurrentProfile((current) => current ? { ...current, rep: data.xp ?? current.rep ?? 0, level: data.level ?? current.level ?? 1 } : current);
  };

  const load = async () => {
    if (!db) { setLoading(false); setError('RCL social services are not configured.'); return; }
    setLoading(true);
    setError('');
    try {
      const [basePostsResult, repostResult, storiesResult, followsResult, savedResult, currentProfileResult, suggestedResult, communitiesResult, runsResult] = await Promise.all([
        db.from('posts').select('id,author_id,body,media_urls,created_at,is_automated,automation_type').eq('status', 'published').order('created_at', { ascending: false }).limit(100),
        db.from('post_reposts').select('id,post_id,profile_id,created_at').order('created_at', { ascending: false }).limit(120),
        db.from('stories').select('id,author_id,body,media_url,expires_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30),
        user ? db.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [], error: null }),
        user ? db.from('saved_posts').select('post_id').eq('profile_id', user.id) : Promise.resolve({ data: [], error: null }),
        user ? db.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label,is_system_account,system_account_key').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        db.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label,is_system_account,system_account_key').eq('is_active', true).eq('profile_visibility', 'public').eq('is_system_account', false).order('created_at', { ascending: false }).limit(12),
        db.from('communities').select('id,name,slug,description,community_type').eq('privacy', 'public').order('created_at', { ascending: false }).limit(5),
        db.from('runs').select('id,title,starts_at,court_name,location,game_format').eq('status', 'open').gt('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(4),
      ]);

      if (basePostsResult.error) throw basePostsResult.error;
      const visibleReposts = repostResult.error ? [] : (repostResult.data ?? []);
      const basePosts = (basePostsResult.data ?? []) as NetworkPost[];
      const basePostIds = new Set(basePosts.map((post) => post.id));
      const neededPostIds = [...new Set([
        ...visibleReposts.map((entry: any) => entry.post_id as string),
        ...(focusPostId ? [focusPostId] : []),
      ].filter((id) => id && !basePostIds.has(id)))];

      let extraPosts: NetworkPost[] = [];
      if (neededPostIds.length) {
        const extraResult = await db.from('posts').select('id,author_id,body,media_urls,created_at,is_automated,automation_type').eq('status', 'published').in('id', neededPostIds);
        if (!extraResult.error) extraPosts = (extraResult.data ?? []) as NetworkPost[];
      }

      const postMap = new Map<string, NetworkPost>();
      [...basePosts, ...extraPosts].forEach((post) => postMap.set(post.id, post));
      const allPosts = [...postMap.values()];
      const postIds = allPosts.map((post) => post.id);

      const [commentsResult, reactionsResult] = await Promise.all([
        postIds.length ? db.from('comments').select('id,post_id,author_id,body,created_at').in('post_id', postIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
        postIds.length ? db.from('reactions').select('post_id,user_id,type').in('post_id', postIds) : Promise.resolve({ data: [], error: null }),
      ]);

      const comments = (commentsResult.data ?? []) as NetworkComment[];
      const reactions = (reactionsResult.data ?? []) as NetworkReaction[];
      const storyRows = (storiesResult.data ?? []) as Story[];
      const suggestionRows = (suggestedResult.data ?? []) as Array<NetworkAuthor & { id: string }>;
      const repostRows = visibleReposts as NetworkRepost[];
      const identityIds = [...new Set([
        ...allPosts.map((post) => post.author_id),
        ...comments.map((entry) => entry.author_id),
        ...storyRows.map((entry) => entry.author_id),
        ...repostRows.map((entry) => entry.profile_id),
        ...suggestionRows.map((entry) => entry.id as string),
        ...(user ? [user.id] : []),
      ])];

      const [profilesResult, levelsResult] = identityIds.length ? await Promise.all([
        db.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label,is_system_account,system_account_key').in('id', identityIds),
        db.from('user_levels').select('profile_id,xp,level').in('profile_id', identityIds),
      ]) : [{ data: [] }, { data: [] }];

      const levelMap = new Map(((levelsResult.data ?? []) as Array<{ profile_id: string; xp: number; level: number }>).map((row) => [row.profile_id, row]));
      const authorMap = new Map<string, NetworkAuthor>(((profilesResult.data ?? []) as Array<NetworkAuthor & { id: string }>).map((profile) => [profile.id, {
        ...profile,
        rep: levelMap.get(profile.id)?.xp ?? 0,
        level: levelMap.get(profile.id)?.level ?? 1,
      }]));

      const enrichedPosts = allPosts.map((post) => ({
        ...post,
        media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
        author: authorMap.get(post.author_id),
        comments: comments.filter((entry) => entry.post_id === post.id).map((entry) => ({ ...entry, author: authorMap.get(entry.author_id) })),
        reactions: reactions.filter((entry) => entry.post_id === post.id),
      }));
      const enrichedReposts = repostRows.map((entry) => ({ ...entry, profile: authorMap.get(entry.profile_id) }));
      const enrichedStories = storyRows.map((entry) => ({ ...entry, author: authorMap.get(entry.author_id) }));

      setPosts(enrichedPosts);
      setReposts(enrichedReposts);
      setStories(enrichedStories);
      setFollowing(((followsResult.data ?? []) as Array<{ following_id: string }>).map((entry) => entry.following_id));
      setSaved(((savedResult.data ?? []) as Array<{ post_id: string }>).map((entry) => entry.post_id));
      setCommunities((communitiesResult.data ?? []) as Community[]);
      setRuns((runsResult.data ?? []) as Run[]);
      setCurrentProfile(user ? authorMap.get(user.id) ?? ((currentProfileResult.data ?? null) as NetworkAuthor | null) : null);
      setSuggestedProfiles(suggestionRows.map((profile) => authorMap.get(profile.id as string) ?? profile).filter((profile) => profile.id !== user?.id).slice(0, 6));
    } catch (loadError) {
      console.error('Unable to load RCL Social', loadError);
      setError(loadError instanceof Error ? loadError.message : 'We could not load your RCL Home feed right now.');
      setPosts([]);
      setReposts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [supabase, user?.id, focusPostId]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('rcl-network-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reposts' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id, focusPostId]);

  const uploadMedia = async (file: File, folder: 'posts' | 'stories') => {
    if (!supabase || !user) throw new Error('Please sign in to upload media.');
    const issue = socialMediaError(file);
    if (issue) throw new Error(issue);
    const extension = socialMediaExtension(file.type);
    const path = `${user.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (uploadError) throw uploadError;
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  };

  const createPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !user) { signInForNetwork(); return; }
    if (!body.trim() && !mediaFile && !linkInput.trim()) return;
    setPublishing(true); setError('');
    try {
      const composedBody = [body.trim(), linkInput.trim()].filter(Boolean).join('\n');
      const mediaUrl = mediaFile ? await uploadMedia(mediaFile, 'posts') : '';
      const { data, error: insertError } = await db.from('posts').insert({ author_id: user.id, body: composedBody, media_urls: mediaUrl ? [mediaUrl] : [], status: 'published' }).select('id,author_id,body,media_urls,created_at').single();
      if (insertError) throw insertError;
      setBody(''); setLinkInput(''); setMediaFile(null); setMediaPreview(''); setComposerOpen(false);
      if (data) {
        setPosts((current) => [{ ...data, author: currentProfile ?? { id: user.id, display_name: 'RCL Member', username: null }, comments: [], reactions: [] }, ...current]);
        void trackActivity('post_created', 'post', data.id);
        void refreshRep();
      }
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'We could not publish that post.');
    } finally { setPublishing(false); }
  };

  const createStory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !user) { signInForNetwork(); return; }
    if (!storyBody.trim() && !storyFile) return;
    setPublishingStory(true); setError('');
    try {
      const mediaUrl = storyFile ? await uploadMedia(storyFile, 'stories') : null;
      const storyType = mediaUrl ? (storyFile?.type.startsWith('video/') ? 'video' : 'photo') : 'text';
      const { data, error: storyError } = await db.from('stories').insert({ author_id: user.id, story_type: storyType, body: storyBody.trim() || null, media_url: mediaUrl, audience: 'public' }).select('id,author_id,body,media_url,expires_at').single();
      if (storyError) throw storyError;
      if (data) setStories((current) => [{ ...data, author: currentProfile ?? { id: user.id, display_name: 'RCL Member', username: null } }, ...current]);
      setStoryBody(''); setStoryFile(null); setStoryPreview(''); setStoryComposerOpen(false);
    } catch (storyError) {
      setError(storyError instanceof Error ? storyError.message : 'We could not publish that story.');
    } finally { setPublishingStory(false); }
  };

  const react = async (postId: string, type: string) => {
    if (!db || !user) { signInForNetwork(); return; }
    setReactionBurst((current) => ({ ...current, [postId]: type }));
    window.setTimeout(() => setReactionBurst((current) => { const next = { ...current }; delete next[postId]; return next; }), 650);
    const post = posts.find((entry) => entry.id === postId);
    const existing = post?.reactions?.find((entry) => entry.user_id === user.id);
    const nextType = existing?.type === type ? null : type;
    setPosts((current) => current.map((entry) => entry.id !== postId ? entry : {
      ...entry,
      reactions: nextType ? [...(entry.reactions ?? []).filter((reaction) => reaction.user_id !== user.id), { post_id: postId, user_id: user.id, type: nextType }] : (entry.reactions ?? []).filter((reaction) => reaction.user_id !== user.id),
    }));
    if (existing) {
      const removed = await db.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
      if (removed.error) { setError(removed.error.message); void load(); return; }
    }
    if (nextType) {
      const added = await db.from('reactions').insert({ post_id: postId, user_id: user.id, type: nextType });
      if (added.error) { setError(added.error.message); void load(); return; }
      void trackActivity('reaction', 'post', postId, { reaction_type: nextType });
      void refreshRep();
    }
  };

  const addComment = async (postId: string) => {
    if (!db || !user) { signInForNetwork(); return; }
    const text = comment[postId]?.trim();
    if (!text) return;
    setComment((current) => ({ ...current, [postId]: '' }));
    const optimistic: NetworkComment = { id: `local-${Date.now()}`, post_id: postId, author_id: user.id, body: text, created_at: new Date().toISOString(), author: currentProfile ?? { id: user.id, display_name: 'RCL Member', username: null } };
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...(post.comments ?? []), optimistic] } : post));
    const { error: commentError } = await db.from('comments').insert({ post_id: postId, author_id: user.id, body: text, parent_id: null });
    if (commentError) { setError(commentError.message); void load(); return; }
    void trackActivity('comment', 'post', postId);
    void refreshRep();
  };

  const toggleSave = async (postId: string) => {
    if (!db || !user) { signInForNetwork(); return; }
    const isSaved = saved.includes(postId);
    setSaved((current) => isSaved ? current.filter((id) => id !== postId) : [...current, postId]);
    const result = isSaved ? await db.from('saved_posts').delete().eq('profile_id', user.id).eq('post_id', postId) : await db.from('saved_posts').insert({ profile_id: user.id, post_id: postId });
    if (result.error) { setSaved((current) => isSaved ? [...current, postId] : current.filter((id) => id !== postId)); setError(result.error.message); return; }
    void trackActivity(isSaved ? 'save_removed' : 'save_added', 'post', postId);
  };

  const toggleFollow = async (profileId: string) => {
    if (!db || !user) { signInForNetwork(); return; }
    if (profileId === user.id) return;
    const isFollowing = following.includes(profileId);
    setFollowing((current) => isFollowing ? current.filter((id) => id !== profileId) : [...current, profileId]);
    const result = isFollowing ? await db.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId) : await db.from('follows').insert({ follower_id: user.id, following_id: profileId });
    if (result.error) { setFollowing((current) => isFollowing ? [...current, profileId] : current.filter((id) => id !== profileId)); setError(result.error.message); return; }
    void trackActivity(isFollowing ? 'unfollow' : 'follow', 'profile', profileId);
    if (!isFollowing) void refreshRep();
  };

  const toggleRepost = async (postId: string) => {
    if (!db || !user) { signInForNetwork(); return; }
    const existing = reposts.find((entry) => entry.post_id === postId && entry.profile_id === user.id);
    if (existing) {
      setReposts((current) => current.filter((entry) => entry.id !== existing.id));
      const result = await db.from('post_reposts').delete().eq('id', existing.id).eq('profile_id', user.id);
      if (result.error) { setError(result.error.message); void load(); return; }
      void trackActivity('repost_removed', 'post', postId);
      return;
    }
    const optimistic: NetworkRepost = { id: `local-${Date.now()}`, post_id: postId, profile_id: user.id, created_at: new Date().toISOString(), profile: currentProfile ?? { id: user.id, display_name: 'RCL Member', username: null } };
    setReposts((current) => [optimistic, ...current]);
    const { data, error: repostError } = await db.from('post_reposts').insert({ post_id: postId, profile_id: user.id }).select('id,post_id,profile_id,created_at').single();
    if (repostError) { setError(repostError.message); void load(); return; }
    setReposts((current) => current.map((entry) => entry.id === optimistic.id ? { ...data, profile: currentProfile ?? optimistic.profile } : entry));
    void trackActivity('repost_created', 'post', postId);
  };

  const sharePost = async (post: NetworkPost) => {
    const url = `${window.location.origin}/social/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'RCL', text: post.body.slice(0, 140), url });
      else { await navigator.clipboard.writeText(url); setError('Post link copied.'); window.setTimeout(() => setError(''), 1800); }
      void trackActivity('share', 'post', post.id);
    } catch { /* user cancelled */ }
  };

  const deletePost = async (postId: string) => {
    if (!db || !user || !window.confirm('Delete this post?')) return;
    const result = await db.from('posts').delete().eq('id', postId).eq('author_id', user.id);
    if (result.error) { setError(result.error.message); return; }
    setPosts((current) => current.filter((post) => post.id !== postId));
  };

  const openStory = async (index: number) => {
    setStoryIndex(index);
    const item = stories[index];
    if (db && user && item) {
      void trackActivity('story_view', 'story', item.id);
      await db.from('story_views').upsert({ story_id: item.id, viewer_id: user.id });
    }
  };

  const feedItems = useMemo(() => {
    const repostsByPost = new Map<string, NetworkRepost[]>();
    reposts.forEach((repost) => repostsByPost.set(repost.post_id, [...(repostsByPost.get(repost.post_id) ?? []), repost]));
    const postsWithReposts = posts.map((post) => ({ ...post, reposts: repostsByPost.get(post.id) ?? [] }));
    const postById = new Map(postsWithReposts.map((post) => [post.id, post]));
    let candidates: NetworkFeedItem[] = postsWithReposts.map((post) => ({ key: `post:${post.id}`, post, feed_at: post.created_at }));
    if (!focusPostId) {
      for (const repost of reposts) {
        const post = postById.get(repost.post_id);
        if (post) candidates.push({ key: `repost:${repost.id}`, post, feed_at: repost.created_at, repost });
      }
    }

    const query = search.trim().toLowerCase();
    candidates = candidates.filter((item) => {
      if (focusPostId && item.post.id !== focusPostId) return false;
      if (query) {
        const haystack = `${item.post.body} ${item.post.author?.display_name ?? ''} ${item.post.author?.username ?? ''} ${item.repost?.profile?.display_name ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (mode === 'following') {
        const distributedBy = item.repost?.profile_id;
        return item.post.author_id === user?.id || following.includes(item.post.author_id) || distributedBy === user?.id || Boolean(distributedBy && following.includes(distributedBy));
      }
      return true;
    });

    if (mode === 'trending') {
      candidates.sort((a, b) => trendScore(b) - trendScore(a) || new Date(b.feed_at).getTime() - new Date(a.feed_at).getTime());
    } else if (mode === 'following') {
      candidates.sort((a, b) => new Date(b.feed_at).getTime() - new Date(a.feed_at).getTime());
    } else {
      candidates.sort((a, b) => {
        const score = (item: NetworkFeedItem) => scoreSocialPost({ ...item.post, created_at: item.feed_at }, { userId: user?.id, following }) + (item.repost && following.includes(item.repost.profile_id) ? 0.3 : item.repost ? 0.06 : 0);
        return score(b) - score(a) || new Date(b.feed_at).getTime() - new Date(a.feed_at).getTime();
      });
    }

    const seen = new Set<string>();
    return candidates.filter((item) => {
      if (seen.has(item.post.id)) return false;
      seen.add(item.post.id);
      return true;
    }).slice(0, 100);
  }, [posts, reposts, mode, search, focusPostId, user?.id, following]);

  const officialActivity = useMemo(() => posts.filter((post) => post.author?.is_system_account).slice(0, 4), [posts]);

  return (
    <main className="rcl-social-world min-h-screen pb-24 lg:pb-0">
      {error && <div className="fixed left-1/2 top-20 z-[80] w-[min(92vw,540px)] -translate-x-1/2 rounded-xl border border-rcl-orange/25 bg-[#10141a] px-4 py-3 text-sm text-white shadow-2xl"><div className="flex items-center justify-between gap-3"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><FaXmark/></button></div></div>}

      <Container maxWidth="xl" className="py-5 sm:py-7">
        <section className="rcl-feed-intro">
          <div><p>Home</p><h1>Your basketball world</h1><span>People, runs, highlights and competition around you.</span></div>
          <div className="rcl-feed-intro-actions">
            <label><span className="sr-only">Search this feed</span><FaMagnifyingGlass/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search this feed"/></label>
            {user?<button type="button" onClick={openComposer}><FaPlus/> Create</button>:<Link href="/auth/sign-in?redirect=/social">Join free</Link>}
          </div>
        </section>
        <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,680px)_minmax(250px,1fr)] xl:grid-cols-[190px_minmax(0,720px)_300px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              {leftNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`rcl-feed-left-link ${href === '/social' ? 'active' : ''} ${href === '/create' ? 'create' : ''}`}><Icon/><span>{label}</span></Link>)}
              <div className="my-3 border-t border-white/10"/>
              {user ? <Link href="/social/profile/me" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-3 hover:border-rcl-blue/25"><SocialIdentity author={currentProfile} compact/><span className="min-w-0"><b className="block truncate text-xs">{currentProfile?.display_name || currentProfile?.username || 'Your profile'}</b><small className="text-[10px] font-black uppercase tracking-wider text-white/25">View identity</small></span></Link> : <Link href="/auth/sign-in?redirect=/social" className="block rounded-xl border border-white/10 p-3 text-center text-xs font-black uppercase text-white/45">Join RCL</Link>}
              <p className="px-3 pt-4 text-[10px] font-black uppercase leading-5 tracking-[.18em] text-white/20">Your city · Your court · Your rep</p>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {focusPostId && <div className="flex items-center justify-between rounded-xl border border-rcl-blue/15 bg-rcl-blue/[.04] px-4 py-3"><span className="text-xs font-black uppercase tracking-wider text-rcl-blue">Post permalink</span><Link href="/social" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/45"><FaArrowLeft/> Back to feed</Link></div>}

            {!focusPostId && <StoryRail stories={stories} user={user} currentProfile={currentProfile} onCreate={() => user ? setStoryComposerOpen(true) : signInForNetwork()} onOpen={(index) => void openStory(index)} />}

            {!focusPostId && (
              <section className="rounded-2xl border border-white/10 bg-[#08111b]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,.18)]">
                <div className="flex gap-3"><button onClick={openComposer} aria-label="Create post"><SocialIdentity author={currentProfile ?? { display_name: user ? 'RCL Member' : 'Guest', username: null }} compact/></button><button onClick={openComposer} className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-left text-sm text-white/35 hover:border-rcl-blue/30">Share something with Richmond basketball…</button></div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[.06] pt-3"><button onClick={openComposer} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-white/40 hover:bg-white/[.04] hover:text-white"><FaImage/> Media</button><button onClick={() => user ? setStoryComposerOpen(true) : signInForNetwork()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-white/40 hover:bg-white/[.04] hover:text-white"><FaVideo/> Story</button><Link href="/runs" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-white/40 hover:bg-white/[.04] hover:text-white"><FaBasketball/> Run</Link></div>
              </section>
            )}

            {!focusPostId && <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-[#07111b] p-1"><FeedModeButton active={mode === 'for-you'} onClick={() => setMode('for-you')}>For You</FeedModeButton><FeedModeButton active={mode === 'following'} onClick={() => setMode('following')}>Following</FeedModeButton><FeedModeButton active={mode === 'trending'} onClick={() => setMode('trending')}>Trending</FeedModeButton></div>}

            {loading ? <LoadingFeed /> : feedItems.length ? feedItems.map((item) => <NetworkPostCard key={item.key} item={item} userId={user?.id} following={following.includes(item.post.author_id)} saved={saved.includes(item.post.id)} openComments={openComments === item.post.id} comment={comment[item.post.id] ?? ''} reactionBurst={reactionBurst[item.post.id] ?? null} onCommentChange={(value) => setComment((current) => ({ ...current, [item.post.id]: value }))} onToggleComments={() => setOpenComments((current) => current === item.post.id ? null : item.post.id)} onComment={() => void addComment(item.post.id)} onReact={(type) => void react(item.post.id, type)} onSave={() => void toggleSave(item.post.id)} onShare={() => void sharePost(item.post)} onFollow={() => void toggleFollow(item.post.author_id)} onToggleRepost={() => void toggleRepost(item.post.id)} onDelete={item.post.author_id === user?.id ? () => void deletePost(item.post.id) : undefined} />) : <FeedEmpty user={Boolean(user)} followingMode={mode === 'following'} onCreate={openComposer} />}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <SideCard title="People to know" href="/friends">
                <div className="space-y-2">{suggestedProfiles.slice(0, 4).map((profile) => <div key={profile.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/[.03]"><SocialIdentity author={profile} compact/><Link href={`/social/profile/${profile.id}`} className="min-w-0 flex-1"><b className="block truncate text-xs">{profile.display_name || profile.username || 'RCL Member'}</b><small className="text-[10px] font-black uppercase tracking-wider text-white/25">{formatRep(profile.rep ?? 0)} REP</small></Link>{profile.id && profile.id !== user?.id && <button onClick={() => void toggleFollow(profile.id!)} className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${following.includes(profile.id) ? 'text-rcl-blue' : 'border border-white/10 text-white/45'}`}>{following.includes(profile.id) ? 'Following' : 'Follow'}</button>}</div>)}</div>
              </SideCard>

              {runs.length > 0 && <SideCard title="On court soon" href="/runs"><div className="space-y-2">{runs.slice(0, 3).map((run) => <Link key={run.id} href="/runs" className="block rounded-xl border border-white/[.06] p-3 hover:border-rcl-orange/25"><b className="block text-xs">{run.title}</b><small className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-rcl-orange">{formatRunTime(run.starts_at)} · {run.court_name || run.location || 'RCL court'}</small></Link>)}</div></SideCard>}

              {communities.length > 0 && <SideCard title="Communities" href="/communities"><div className="space-y-1">{communities.slice(0, 3).map((community) => <Link key={community.id} href={`/communities/${community.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[.03]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rcl-blue/10 text-rcl-blue"><FaPeopleGroup/></span><span className="min-w-0"><b className="block truncate text-xs">{community.name}</b><small className="text-[10px] uppercase tracking-wider text-white/25">{community.community_type?.replace(/_/g, ' ') || 'Community'}</small></span></Link>)}</div></SideCard>}

              {officialActivity.length > 0 && <SideCard title="Official activity" href="/social"><div className="space-y-2">{officialActivity.slice(0, 3).map((post) => <Link key={post.id} href={`/social/post/${post.id}`} className="block rounded-xl border border-rcl-blue/10 bg-rcl-blue/[.025] p-3 hover:border-rcl-blue/30"><small className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">RCL Official</small><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/40">{post.body}</p></Link>)}</div></SideCard>}

              {user && <ReferralCard />}
            </div>
          </aside>
        </div>
      </Container>

      {composerOpen && <ComposerModal currentProfile={currentProfile} body={body} setBody={setBody} linkInput={linkInput} setLinkInput={setLinkInput} mediaFile={mediaFile} mediaPreview={mediaPreview} setMediaFile={setMediaFile} mediaInputRef={mediaInputRef} publishing={publishing} onClose={() => setComposerOpen(false)} onSubmit={(event) => void createPost(event)} />}
      {storyComposerOpen && <StoryComposer currentProfile={currentProfile} body={storyBody} setBody={setStoryBody} file={storyFile} preview={storyPreview} setFile={setStoryFile} inputRef={storyInputRef} publishing={publishingStory} onClose={() => setStoryComposerOpen(false)} onSubmit={(event) => void createStory(event)} />}
      {storyIndex !== null && stories[storyIndex] && <StoryViewer stories={stories} index={storyIndex} onClose={() => setStoryIndex(null)} onIndex={setStoryIndex} />}
    </main>
  );
}

function StoryRail({ stories, user, currentProfile, onCreate, onOpen }: { stories: Story[]; user: { id: string } | null; currentProfile: NetworkAuthor | null; onCreate: () => void; onOpen: (index: number) => void }) {
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#08111b]/80 p-3"><div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><button onClick={onCreate} className="w-[70px] shrink-0 text-center"><span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-rcl-orange/60 bg-white/[.03]"><SocialIdentity author={currentProfile ?? { display_name: user ? 'You' : 'Guest', username: null }} compact/><span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#08111b] bg-rcl-orange text-xs text-black"><FaPlus/></span></span><span className="mt-2 block truncate text-[10px] font-black uppercase tracking-wider text-white/45">Your story</span></button>{stories.map((story, index) => <button key={story.id} onClick={() => onOpen(index)} className="w-[70px] shrink-0 text-center"><span className="mx-auto block h-16 w-16 rounded-full bg-gradient-to-br from-rcl-orange to-rcl-blue p-[2px]"><span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-[#08111b] bg-[#101722]">{story.media_url ? isVideoUrl(story.media_url) ? <video src={story.media_url} muted playsInline className="h-full w-full object-cover"/> : <img src={story.media_url} alt="" className="h-full w-full object-cover"/> : <SocialIdentity author={story.author} compact/>}</span></span><span className="mt-2 block truncate text-[10px] font-bold text-white/45">{story.author?.display_name || story.author?.username || 'RCL'}</span></button>)}</div></section>;
}

function ComposerModal({ currentProfile, body, setBody, linkInput, setLinkInput, mediaFile, mediaPreview, setMediaFile, mediaInputRef, publishing, onClose, onSubmit }: { currentProfile: NetworkAuthor | null; body: string; setBody: (value: string) => void; linkInput: string; setLinkInput: (value: string) => void; mediaFile: File | null; mediaPreview: string; setMediaFile: (file: File | null) => void; mediaInputRef: React.RefObject<HTMLInputElement>; publishing: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const chooseFile = (file: File | null) => { if (!file) return; const issue = socialMediaError(file); if (!issue) setMediaFile(file); };
  return <div className="fixed inset-0 z-[90] grid place-items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"><form onSubmit={onSubmit} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#09131e] p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Create</p><h2 className="font-display text-2xl font-black uppercase">Post to RCL</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/50"><FaXmark/></button></div><div className="mt-5 flex gap-3"><SocialIdentity author={currentProfile} compact/><textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={5} placeholder="What is happening in Richmond basketball?" className="min-h-32 flex-1 resize-none bg-transparent text-base leading-7 outline-none placeholder:text-white/25"/></div>{mediaPreview && <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">{mediaFile?.type.startsWith('video/') ? <video src={safeMediaPreviewUrl(mediaPreview)} controls className="max-h-72 w-full object-contain"/> : <img src={safeMediaPreviewUrl(mediaPreview)} alt="Preview" className="max-h-72 w-full object-contain"/>}<button type="button" onClick={() => setMediaFile(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70"><FaXmark/></button></div>}<SocialLinkField value={linkInput} onChange={setLinkInput}/><div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"><div><button type="button" onClick={() => mediaInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black uppercase tracking-wider text-white/50"><FaImage/> Photo / video</button><input ref={mediaInputRef} type="file" accept={SOCIAL_MEDIA_ACCEPT} className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}/></div><button disabled={publishing || (!body.trim() && !mediaFile && !linkInput.trim())} className="min-h-11 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-35">{publishing ? 'Posting…' : 'Post'}</button></div></form></div>;
}

function StoryComposer({ currentProfile, body, setBody, file, preview, setFile, inputRef, publishing, onClose, onSubmit }: { currentProfile: NetworkAuthor | null; body: string; setBody: (value: string) => void; file: File | null; preview: string; setFile: (file: File | null) => void; inputRef: React.RefObject<HTMLInputElement>; publishing: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const chooseFile = (next: File | null) => { if (!next) return; const issue = socialMediaError(next); if (!issue) setFile(next); };
  return <div className="fixed inset-0 z-[90] grid place-items-end bg-black/80 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"><form onSubmit={onSubmit} className="w-full rounded-t-3xl border border-white/10 bg-[#09131e] p-5 sm:max-w-md sm:rounded-3xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">24 hours</p><h2 className="font-display text-2xl font-black uppercase">Add story</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><FaXmark/></button></div><div className="mt-5 flex items-center gap-3"><SocialIdentity author={currentProfile} compact/><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={240} rows={3} placeholder="Add a caption…" className="flex-1 resize-none rounded-xl border border-white/10 bg-black/15 p-3 text-sm outline-none"/></div><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 grid min-h-52 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.025]">{preview ? file?.type.startsWith('video/') ? <video src={safeMediaPreviewUrl(preview)} muted className="max-h-72 w-full object-contain"/> : <img src={safeMediaPreviewUrl(preview)} alt="Story preview" className="max-h-72 w-full object-contain"/> : <span className="text-center"><FaImage className="mx-auto text-3xl text-rcl-blue"/><b className="mt-3 block text-xs font-black uppercase">Choose photo or video</b></span>}</button><input ref={inputRef} type="file" accept={SOCIAL_MEDIA_ACCEPT} className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}/><button disabled={publishing || (!body.trim() && !file)} className="mt-4 min-h-12 w-full rounded-xl bg-rcl-orange text-xs font-black uppercase tracking-wider text-black disabled:opacity-35">{publishing ? 'Sharing…' : 'Share story'}</button></form></div>;
}

function StoryViewer({ stories, index, onClose, onIndex }: { stories: Story[]; index: number; onClose: () => void; onIndex: (index: number) => void }) {
  const story = stories[index];
  return <div className="rcl-dark-media fixed inset-0 z-[100] grid place-items-center bg-black/95 p-3"><div className="relative flex h-[min(760px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#09131e]"><div className="absolute left-3 right-3 top-3 z-10 flex gap-1">{stories.map((_, itemIndex) => <span key={itemIndex} className={`h-1 flex-1 rounded-full ${itemIndex === index ? 'bg-white' : itemIndex < index ? 'bg-rcl-orange' : 'bg-white/15'}`}/>)}</div><button type="button" onClick={onClose} className="absolute right-3 top-7 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/55"><FaXmark/></button><div className="flex flex-1 items-center justify-center p-6 pt-14">{story.media_url ? <div className="w-full">{isVideoUrl(story.media_url) ? <video src={story.media_url} controls autoPlay playsInline className="max-h-[62vh] w-full rounded-2xl object-contain"/> : <img src={story.media_url} alt="Story" className="max-h-[62vh] w-full rounded-2xl object-contain"/>}{story.body && <p className="mt-4 text-center text-base font-bold leading-6">{story.body}</p>}</div> : <div className="text-center"><SocialIdentity author={story.author}/><p className="mt-5 text-xl font-bold leading-8">{story.body}</p></div>}</div><button aria-label="Previous story" disabled={index === 0} onClick={() => onIndex(index - 1)} className="absolute left-0 top-1/2 h-1/2 w-1/3 -translate-y-1/2 disabled:pointer-events-none"/><button aria-label="Next story" disabled={index === stories.length - 1} onClick={() => onIndex(index + 1)} className="absolute right-0 top-1/2 h-1/2 w-1/3 -translate-y-1/2 disabled:pointer-events-none"/><div className="border-t border-white/10 p-3 text-center text-[10px] font-black uppercase tracking-wider text-white/25">{index + 1} / {stories.length}</div></div></div>;
}

function FeedModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-lg text-xs font-black uppercase tracking-wider transition ${active ? 'bg-rcl-blue/12 text-rcl-blue' : 'text-white/30 hover:text-white'}`}>{children}</button>;
}

function LoadingFeed() {
  return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[.025]"/>)}</div>;
}

function FeedEmpty({ user, followingMode, onCreate }: { user: boolean; followingMode: boolean; onCreate: () => void }) {
  return <div className="rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-10 text-center"><FaBasketball className="mx-auto text-4xl text-rcl-blue/45"/><h2 className="mt-4 font-display text-2xl font-black uppercase">{followingMode ? 'Build your network' : 'The conversation starts here'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">{followingMode ? 'Follow people from Discover or People and their posts and reposts will collect here.' : 'Posts, official game moments, communities and basketball activity will appear here.'}</p>{user && <button onClick={onCreate} className="mt-5 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Create a post</button>}</div>;
}

function SideCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-[#08111b]/70 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">{title}</h3><Link href={href} className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">See all</Link></div>{children}</section>;
}

function trendScore(item: NetworkFeedItem) {
  const ageHours = Math.max(0, (Date.now() - new Date(item.feed_at).getTime()) / 3_600_000);
  return (item.post.reactions?.length ?? 0) * 3 + (item.post.comments?.length ?? 0) * 5 + (item.post.reposts?.length ?? 0) * 4 + Math.max(0, 72 - ageHours);
}

function formatRep(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function formatRunTime(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
}
