'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaBasketball, FaCamera, FaCircleCheck, FaImage, FaVideo, FaXmark } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MAX_IMAGES,
  SOCIAL_VIDEO_ACCEPT,
  socialMediaCollectionError,
  socialMediaExtension,
  socialMediaKind,
} from '@/lib/social-media';

type Mode = 'clip' | 'moment';
type Run = {
  id: string;
  host_id: string;
  title: string;
  location: string;
  starts_at: string;
  status: string;
};

type Preview = { url: string; type: string; name: string };

export default function RunHighlightPublisher() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [run, setRun] = useState<Run | null>(null);
  const [participant, setParticipant] = useState(false);
  const [mode, setMode] = useState<Mode>('clip');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('mode');
    setMode(requested === 'moment' ? 'moment' : 'clip');
  }, []);

  useEffect(() => {
    if (!db || !runId) return;
    void (async () => {
      const { data, error: runError } = await db.from('runs').select('id,host_id,title,location,starts_at,status').eq('id', runId).maybeSingle();
      if (runError) {
        setError(runError.message);
        return;
      }
      const nextRun = (data ?? null) as Run | null;
      setRun(nextRun);
      if (!user || !nextRun) {
        setParticipant(false);
        return;
      }
      if (nextRun.host_id === user.id) {
        setParticipant(true);
        return;
      }
      const { data: membership } = await db.from('run_players').select('profile_id').eq('run_id', runId).eq('profile_id', user.id).maybeSingle();
      setParticipant(Boolean(membership));
    })();
  }, [db, runId, user?.id]);

  useEffect(() => {
    const next = files.map((file) => ({ url: URL.createObjectURL(file), type: file.type, name: file.name }));
    setPreviews(next);
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  const switchMode = (next: Mode) => {
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
    const firstKind = socialMediaKind(incoming[0].type);
    const canAppend = mode === 'moment' && firstKind === 'image' && files.every((file) => socialMediaKind(file.type) === 'image');
    const selected = canAppend ? [...files, ...incoming] : incoming;
    const issue = socialMediaCollectionError(selected);
    if (issue) {
      setError(issue);
      return;
    }
    if (mode === 'clip' && firstKind !== 'video') {
      setError('Drop a Clip accepts one video file. Switch to Photos for images.');
      return;
    }
    if (mode === 'moment' && firstKind !== 'image') {
      setError('Photos accepts images. Switch to Drop a Clip for video.');
      return;
    }
    setFiles(selected);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadFile = async (file: File, index: number) => {
    if (!supabase || !user) throw new Error('Sign in to upload media.');
    const extension = socialMediaExtension(file.type);
    if (!extension) throw new Error('That media type is not supported.');
    setProgress(`Uploading ${index + 1} of ${files.length}…`);
    const path = `${user.id}/runs/${runId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
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
      window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(`/runs/${runId}/highlight?mode=${mode}`)}`;
      return;
    }
    if (!run || !db) {
      setError('This Run is not available right now.');
      return;
    }
    if (!files.length) {
      setError(mode === 'clip' ? 'Choose a video clip first.' : 'Choose at least one photo first.');
      return;
    }
    const issue = socialMediaCollectionError(files);
    if (issue) {
      setError(issue);
      return;
    }

    setBusy(true);
    try {
      const mediaUrls: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        mediaUrls.push(await uploadFile(files[index], index));
      }

      setProgress('Publishing to the Run Tape…');
      const runLink = `${window.location.origin}/runs/${run.id}`;
      const identity = mode === 'clip' ? '#RCLRunClip' : '#RCLRunMoment';
      const composedBody = [
        body.trim() || (mode === 'clip' ? `Clip from ${run.title}.` : `Photos from ${run.title}.`),
        `Run: ${run.title}`,
        runLink,
        `${identity} #RCLRun`,
      ].join('\n\n');

      const { data, error: insertError } = await db.from('posts').insert({
        author_id: user.id,
        body: composedBody,
        media_urls: mediaUrls,
        status: 'published',
        run_id: run.id,
      }).select('id').single();
      if (insertError) throw insertError;

      if (data?.id) {
        await db.from('user_activity').insert({
          profile_id: user.id,
          activity_type: 'run_highlight_posted',
          entity_type: 'post',
          entity_id: data.id,
          metadata: { run_id: run.id, creator_mode: mode, media_count: mediaUrls.length },
        });
      }

      let message = 'Run highlight posted to the Run Tape and RCL Social.';
      if (participant) {
        const { data: rewardData, error: rewardError } = await db.rpc('claim_latest_run_highlight', { p_run: run.id });
        if (!rewardError) {
          const reward = Number(rewardData?.[0]?.rep_awarded ?? 0);
          message = reward > 0
            ? `Run highlight posted · +${reward} REP earned.`
            : 'Run highlight posted · this Run highlight reward was already claimed.';
        }
      }

      window.sessionStorage.setItem('rcl-run-highlight-notice', message);
      window.location.href = `/runs/${run.id}`;
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'We could not publish that Run highlight.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  if (!run) {
    return <main className="min-h-screen bg-[#03070d] p-6 text-white"><Container maxWidth="md"><p className="rounded-3xl border border-white/10 p-10 text-center text-white/45">{error || 'Loading Run Tape…'}</p></Container></main>;
  }

  return (
    <main className="min-h-screen bg-[#03070d] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03070d]/95 backdrop-blur-xl">
        <Container maxWidth="lg" className="flex h-16 items-center gap-3 px-3 sm:h-20 sm:px-4">
          <Link href={`/runs/${run.id}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-white/60" aria-label="Back to Run Room"><FaArrowLeft /></Link>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Run Tape</p><h1 className="truncate font-display text-xl font-black uppercase sm:text-2xl">{run.title}</h1></div>
          {participant && <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.05] px-3 py-2 text-[10px] font-black uppercase text-emerald-300 sm:inline-flex"><FaCircleCheck />Participant</span>}
        </Container>
      </header>

      <Container maxWidth="lg" className="py-6 sm:py-9">
        <section className="mb-5 rounded-3xl border border-rcl-blue/15 bg-[radial-gradient(circle_at_90%_10%,rgba(59,130,246,.12),transparent_36%),#07111b] p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaBasketball className="mr-1 inline" />{new Date(run.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Show what happened.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Upload directly from your phone. Your clip or photo set appears in RCL Social and stays attached to this Run Room. Joined players and the host can earn one verified +35 REP highlight reward during the Run highlight window.</p>
        </section>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#07111b] p-2">
          <button type="button" onClick={() => switchMode('clip')} className={`rounded-xl border px-4 py-3 text-left ${mode === 'clip' ? 'border-rcl-orange/35 bg-rcl-orange/[.08]' : 'border-transparent text-white/40'}`}><span className="flex items-center gap-2 text-xs font-black uppercase"><FaVideo />Drop a Clip</span><small className="mt-1 block text-[10px] text-white/30">One video · up to 50 MB</small></button>
          <button type="button" onClick={() => switchMode('moment')} className={`rounded-xl border px-4 py-3 text-left ${mode === 'moment' ? 'border-rcl-blue/35 bg-rcl-blue/[.08]' : 'border-transparent text-white/40'}`}><span className="flex items-center gap-2 text-xs font-black uppercase"><FaCamera />Post Photos</span><small className="mt-1 block text-[10px] text-white/30">Up to {SOCIAL_MAX_IMAGES} photos</small></button>
        </div>

        <form onSubmit={publish} className="overflow-hidden rounded-3xl border border-white/10 bg-[#08131e]">
          <div className="space-y-5 p-5 sm:p-7">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Caption / context</label>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1600} rows={4} placeholder={mode === 'clip' ? 'What happened on this play?' : 'What is the story behind these photos?'} className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/15 p-4 text-base leading-7 outline-none placeholder:text-white/20 focus:border-rcl-blue/40" />
              <p className="mt-1 text-right text-[10px] font-bold text-white/20">{body.length}/1600</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3"><label className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Native media</label>{files.length > 0 && <button type="button" onClick={() => setFiles([])} className="text-[10px] font-black uppercase text-rcl-orange">Clear all</button>}</div>
              {!previews.length ? <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 grid min-h-52 w-full place-items-center rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.025] p-6 text-center transition hover:border-rcl-blue/50"><span><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rcl-blue/10 text-xl text-rcl-blue">{mode === 'clip' ? <FaVideo /> : <FaImage />}</span><strong className="mt-3 block text-sm">{mode === 'clip' ? 'Choose a video from your phone' : 'Choose photos from your phone'}</strong><small className="mt-1 block text-xs leading-5 text-white/35">{mode === 'clip' ? 'MP4, WebM, MOV or Ogg · max 50 MB' : `JPG, PNG, GIF, WebP or AVIF · up to ${SOCIAL_MAX_IMAGES} photos`}</small></span></button> : <div className={`mt-2 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>{previews.map((preview, index) => <div key={`${preview.name}-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">{preview.type.startsWith('video/') ? <video src={preview.url} controls playsInline className="max-h-[560px] w-full object-contain" /> : <img src={preview.url} alt={`Selected media ${index + 1}`} className="aspect-square h-full w-full object-cover" />}<button type="button" onClick={() => removeFile(index)} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white" aria-label={`Remove ${preview.name}`}><FaXmark /></button></div>)}</div>}
              <input ref={fileInputRef} type="file" className="hidden" accept={mode === 'clip' ? SOCIAL_VIDEO_ACCEPT : SOCIAL_IMAGE_ACCEPT} multiple={mode === 'moment'} onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} />
              {mode === 'moment' && files.length > 0 && files.length < SOCIAL_MAX_IMAGES && <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/55">+ Add more photos</button>}
            </div>

            {participant ? <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-4 text-xs leading-5 text-white/50"><b className="text-emerald-300">Verified participant.</b> If this post falls inside the Run highlight window and you have not already claimed it, RCL will automatically award the +35 REP highlight bonus after publishing.</div> : <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-white/40">You can still contribute media to this Run Tape. The REP highlight reward is reserved for the Run host or joined players.</div>}

            {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/[.05] p-4 text-sm text-red-100">{error}</p>}
            {progress && <p className="text-xs font-black uppercase tracking-wider text-rcl-blue">{progress}</p>}

            <button disabled={busy || !files.length} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-rcl-orange px-5 py-4 text-sm font-black uppercase tracking-wider text-black disabled:opacity-45">{busy ? progress || 'Publishing…' : <><FaBasketball />Publish to Run Tape</>}</button>
          </div>
        </form>
      </Container>
    </main>
  );
}
