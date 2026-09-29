'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaCamera,
  FaCheck,
  FaFire,
  FaImage,
  FaLink,
  FaRankingStar,
  FaTrophy,
  FaVideo,
  FaXmark,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  readMediaPreview,
  safeMediaPreviewUrl,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MEDIA_ACCEPT,
  SOCIAL_MAX_IMAGES,
  SOCIAL_VIDEO_ACCEPT,
  socialMediaCollectionError,
  socialMediaExtension,
  socialMediaKind,
} from '@/lib/social-media';

type CreatorMode = 'clip' | 'moment' | 'post';

type CreatorChallenge = {
  key: string;
  label: string;
  tag: string;
  prompt: string;
  icon: string;
};

const modes: Array<{
  key: CreatorMode;
  label: string;
  kicker: string;
  description: string;
  icon: typeof FaVideo;
}> = [
  {
    key: 'clip',
    label: 'Drop a Clip',
    kicker: 'Build your Tape',
    description: 'Upload a basketball clip directly from your phone and put your game in front of the network.',
    icon: FaVideo,
  },
  {
    key: 'moment',
    label: 'Post a Moment',
    kicker: 'Photos hit different here',
    description: 'Share up to 10 photos from a game, run, workout, event, team, or basketball moment.',
    icon: FaCamera,
  },
  {
    key: 'post',
    label: 'Start a Post',
    kicker: 'Talk Richmond basketball',
    description: 'Post an update, opinion, link, photo set, or video to the RCL Network.',
    icon: FaBasketball,
  },
];

const challenges: CreatorChallenge[] = [
  { key: 'bucket', label: 'Bucket of the Week', tag: '#BucketOfTheWeek', prompt: 'Show us the bucket. Who got one?', icon: '🪣' },
  { key: 'dime', label: 'Dime of the Week', tag: '#DimeOfTheWeek', prompt: 'Drop the pass that made everybody react.', icon: '🎯' },
  { key: 'block', label: 'Block of the Week', tag: '#BlockOfTheWeek', prompt: 'Send it back. Drop the rejection.', icon: '🧱' },
  { key: 'finish', label: 'Tough Finish', tag: '#ToughFinish', prompt: 'Contact, balance, bucket. Show the finish.', icon: '💪' },
  { key: 'team', label: 'Team Moment', tag: '#RCLTeamMoment', prompt: 'Bench energy, celebration, huddle, win—show the team.', icon: '🤝' },
];

function modeFromQuery(value: string | null): CreatorMode {
  return value === 'clip' || value === 'moment' || value === 'post' ? value : 'clip';
}

function defaultPrompt(mode: CreatorMode) {
  if (mode === 'clip') return 'What happened on this play? Give the clip some context…';
  if (mode === 'moment') return 'What is the story behind this moment?';
  return 'What is happening in Richmond basketball?';
}

export default function SocialCreatorPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CreatorMode>('clip');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ type: string; url: string }>>([]);
  const [challenge, setChallenge] = useState<CreatorChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(modeFromQuery(params.get('mode')));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(files.map(async (file) => ({ type: file.type, url: await readMediaPreview(file) }))).then((next) => {
      if (!cancelled) setPreviews(next);
    });
    return () => { cancelled = true; };
  }, [files]);

  const activeMode = modes.find((entry) => entry.key === mode) ?? modes[0];
  const ActiveIcon = activeMode.icon;
  const accepts = mode === 'clip' ? SOCIAL_VIDEO_ACCEPT : mode === 'moment' ? SOCIAL_IMAGE_ACCEPT : SOCIAL_MEDIA_ACCEPT;
  const allowsMultiple = mode !== 'clip';

  const switchMode = (next: CreatorMode) => {
    setMode(next);
    setFiles([]);
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.set('mode', next);
    window.history.replaceState({}, '', url);
  };

  const chooseFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const incomingKind = socialMediaKind(incoming[0].type);
    const existingArePhotos = files.length > 0 && files.every((file) => socialMediaKind(file.type) === 'image');
    const selected = existingArePhotos && incomingKind === 'image' ? [...files, ...incoming] : incoming;
    const collectionIssue = socialMediaCollectionError(selected);
    if (collectionIssue) { setError(collectionIssue); return; }

    const kind = socialMediaKind(selected[0].type);
    if (mode === 'clip' && kind !== 'video') { setError('Drop a Clip accepts video. Switch to Post a Moment for photos.'); return; }
    if (mode === 'moment' && kind !== 'image') { setError('Post a Moment accepts photos. Switch to Drop a Clip for video.'); return; }

    setError('');
    setFiles(selected);
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadFile = async (file: File, index: number) => {
    if (!supabase || !user) throw new Error('Sign in to upload media.');
    const extension = socialMediaExtension(file.type);
    if (!extension) throw new Error('That media type is not supported.');
    setProgress(`Uploading ${index + 1} of ${files.length}…`);
    const path = `${user.id}/posts/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (uploadError) throw uploadError;
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!user) {
      window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(`/create/social?mode=${mode}`)}`;
      return;
    }
    if (!db) { setError('RCL Network services are not available right now.'); return; }
    if (!body.trim() && !link.trim() && !files.length) { setError('Add a clip, photo, link, or caption before posting.'); return; }

    const collectionIssue = socialMediaCollectionError(files);
    if (collectionIssue) { setError(collectionIssue); return; }

    setBusy(true);
    try {
      const mediaUrls: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        mediaUrls.push(await uploadFile(files[index], index));
      }

      setProgress('Publishing to RCL Network…');
      const identityTag = mode === 'clip' ? '#RCLClip' : mode === 'moment' ? '#RCLMoment' : '';
      const tags = [challenge?.tag, identityTag].filter(Boolean) as string[];
      const uniqueTags = tags.filter((tag) => !body.toLowerCase().includes(tag.toLowerCase()));
      const composedBody = [body.trim(), link.trim(), uniqueTags.join(' ')].filter(Boolean).join('\n\n') || (mode === 'clip' ? 'Dropped a new clip. #RCLClip' : 'Shared a new RCL moment. #RCLMoment');

      const { data, error: postError } = await db.from('posts').insert({
        author_id: user.id,
        body: composedBody,
        media_urls: mediaUrls,
        status: 'published',
      }).select('id').single();
      if (postError) throw postError;

      if (data?.id) {
        await db.from('user_activity').insert({
          profile_id: user.id,
          activity_type: 'post_created',
          entity_type: 'post',
          entity_id: data.id,
          metadata: {
            creator_mode: mode,
            media_count: mediaUrls.length,
            challenge: challenge?.key ?? null,
          },
        });
        window.location.href = `/social?post=${data.id}`;
      } else {
        window.location.href = '/social';
      }
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'We could not publish that post.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#03070d] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03070d]/95 backdrop-blur-xl">
        <Container maxWidth="xl" className="flex h-16 items-center gap-3 px-3 sm:h-20 sm:px-4">
          <Link href="/create" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:border-rcl-blue/30 hover:text-white" aria-label="Back to Create"><FaArrowLeft /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Creator Studio</p>
            <h1 className="truncate font-display text-xl font-black uppercase sm:text-2xl">Make the network move.</h1>
          </div>
          <Link href="/social" className="hidden rounded-xl border border-rcl-blue/25 bg-rcl-blue/5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rcl-blue sm:inline-flex">Network Home</Link>
        </Container>
      </header>

      <Container maxWidth="xl" className="py-5 sm:py-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,760px)_minmax(280px,1fr)]">
          <div className="space-y-5">
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#07111b] p-2 sm:grid-cols-3">
              {modes.map((entry) => {
                const Icon = entry.icon;
                const active = entry.key === mode;
                return <button key={entry.key} type="button" onClick={() => switchMode(entry.key)} className={`rounded-xl border px-4 py-3 text-left transition ${active ? 'border-rcl-orange/40 bg-rcl-orange/10' : 'border-transparent hover:border-white/10 hover:bg-white/[.025]'}`}><span className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${active ? 'text-rcl-orange' : 'text-white/45'}`}><Icon /> {entry.label}</span><small className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-white/20">{entry.kicker}</small></button>;
              })}
            </div>

            <form onSubmit={publish} className="overflow-hidden rounded-3xl border border-white/10 bg-[#08131e] shadow-[0_24px_90px_rgba(0,0,0,.28)]">
              <div className="border-b border-white/[.07] bg-[radial-gradient(circle_at_90%_10%,rgba(255,79,22,.13),transparent_34%),linear-gradient(135deg,#0a1723,#07111b)] p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rcl-orange/25 bg-rcl-orange/10 text-lg text-rcl-orange"><ActiveIcon /></span>
                  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">{activeMode.kicker}</p><h2 className="mt-1 font-display text-3xl font-black uppercase">{activeMode.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">{activeMode.description}</p></div>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Caption / context</label>
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={5} placeholder={challenge?.prompt ?? defaultPrompt(mode)} className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/15 p-4 text-base leading-7 outline-none placeholder:text-white/20 focus:border-rcl-blue/40" />
                  <div className="mt-1 text-right text-[10px] font-bold text-white/20">{body.length}/2000</div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3"><label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Weekly challenge <span className="text-white/20">· optional</span></label>{challenge && <button type="button" onClick={() => setChallenge(null)} className="text-[10px] font-black uppercase text-rcl-orange">Clear</button>}</div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {challenges.map((entry) => <button key={entry.key} type="button" onClick={() => setChallenge((current) => current?.key === entry.key ? null : entry)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition ${challenge?.key === entry.key ? 'border-rcl-orange/40 bg-rcl-orange/10 text-white' : 'border-white/10 bg-white/[.02] text-white/45 hover:text-white'}`}><span className="mr-1.5">{entry.icon}</span>{entry.label}</button>)}
                  </div>
                  {challenge && <p className="mt-2 rounded-xl border border-rcl-orange/15 bg-rcl-orange/[.04] px-3 py-2 text-xs leading-5 text-white/45"><b className="text-rcl-orange">{challenge.tag}</b> · {challenge.prompt}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Native media</label>
                  {!previews.length ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 grid min-h-52 w-full place-items-center rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.025] p-6 text-center transition hover:border-rcl-blue/50 hover:bg-rcl-blue/[.05]">
                      <span><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rcl-blue/10 text-2xl text-rcl-blue">{mode === 'clip' ? <FaVideo /> : <FaImage />}</span><b className="mt-4 block font-display text-xl uppercase">{mode === 'clip' ? 'Choose a video from your phone' : mode === 'moment' ? 'Choose your photos' : 'Add native media'}</b><small className="mt-2 block max-w-md text-xs leading-5 text-white/30">{mode === 'clip' ? 'One MP4, MOV, WebM, or Ogg clip · up to 50MB' : `Up to ${SOCIAL_MAX_IMAGES} photos · JPG, PNG, GIF, WebP, or AVIF · 15MB each`}</small></span>
                    </button>
                  ) : (
                    <div className={`mt-2 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {previews.map((preview, index) => <div key={index} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black">{preview.type.startsWith('video/') ? <video src={safeMediaPreviewUrl(preview.url)} controls playsInline className="max-h-[480px] w-full object-contain" /> : <img src={safeMediaPreviewUrl(preview.url)} alt={`Upload preview ${index + 1}`} className="aspect-square w-full object-cover" />}<button type="button" onClick={() => removeFile(index)} aria-label={`Remove upload ${index + 1}`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white"><FaXmark /></button>{previews.length > 1 && <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-black">{index + 1}/{previews.length}</span>}</div>)}
                      {mode !== 'clip' && files.length < SOCIAL_MAX_IMAGES && files.every((file) => socialMediaKind(file.type) === 'image') && <button type="button" onClick={() => fileInputRef.current?.click()} className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/15 text-xs font-black uppercase tracking-wider text-white/35 hover:border-rcl-blue/35 hover:text-rcl-blue"><span><FaImage className="mx-auto mb-2 text-xl"/>Add photos</span></button>}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept={accepts} multiple={allowsMultiple} className="hidden" onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Link <span className="text-white/20">· optional</span></label>
                  <div className="relative mt-2"><FaLink className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-rcl-blue"/><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="YouTube, article, stat page, event link…" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/15 pl-10 pr-4 text-sm outline-none placeholder:text-white/20 focus:border-rcl-blue/40" /></div>
                  <p className="mt-2 text-[11px] leading-5 text-white/25">Links still work. Native uploads are now the main event.</p>
                </div>

                {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[.06] px-4 py-3 text-sm text-red-100">{error}</div>}
                {progress && <div className="flex items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/[.05] px-4 py-3 text-xs font-black uppercase tracking-wider text-rcl-blue"><FaBolt className="animate-pulse" /> {progress}</div>}

                <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-xs leading-5 text-white/30">Quality participation earns attention. RCL reactions, comments, saves, features, and challenge visibility make strong posts travel farther.</p>
                  <button disabled={busy || (!body.trim() && !link.trim() && !files.length)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">{busy ? 'Publishing…' : mode === 'clip' ? 'Drop the Clip' : mode === 'moment' ? 'Post the Moment' : 'Post to RCL'} <FaArrowRight /></button>
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-rcl-orange/20 bg-[linear-gradient(145deg,rgba(255,79,22,.11),rgba(7,17,27,.95)_48%)] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-rcl-orange"><FaFire /><span className="text-[10px] font-black uppercase tracking-[.2em]">Why post here?</span></div>
              <h2 className="mt-3 font-display text-3xl font-black uppercase leading-none">Your game should build your name.</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">RCL media is connected to basketball identity—not just a random feed. Give people a reason to know your game, your team, your work, and your community.</p>
              <div className="mt-5 space-y-3">
                <Benefit icon={<FaVideo />} title="Build The Tape" copy="Media posts surface through your profile Highlights/Media identity and give people somewhere to see your work." />
                <Benefit icon={<FaRankingStar />} title="Earn recognition" copy="Strong engagement feeds discovery and REP activity without rewarding empty spam." />
                <Benefit icon={<FaTrophy />} title="Get featured" copy="Challenges create an easy path for RCL to spotlight the best community clips and moments." />
              </div>
              <Link href="/explore" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">See what is moving <FaArrowRight /></Link>
            </div>

            <div className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">The creator loop</p>
              <div className="mt-4 grid gap-2 text-xs font-black uppercase tracking-wider text-white/45">
                {['Upload', 'Get reactions', 'Build REP + identity', 'Get discovered', 'Come back with more'].map((label, index) => <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.018] px-3 py-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-rcl-blue/10 text-[10px] text-rcl-blue">0{index + 1}</span><span>{label}</span>{index === 4 && <FaCheck className="ml-auto text-rcl-orange" />}</div>)}
              </div>
            </div>
          </aside>
        </section>
      </Container>
    </main>
  );
}

function Benefit({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/[.07] bg-black/15 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange">{icon}</span><span><b className="block text-xs font-black uppercase tracking-wider">{title}</b><small className="mt-1 block text-[11px] leading-5 text-white/32">{copy}</small></span></div>;
}
