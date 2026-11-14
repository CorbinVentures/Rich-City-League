'use client';

import { useEffect, useRef, useState } from 'react';

const SYB_CHANNEL_ID = 'UCwmdw7192t3UhKAsr3_Tv_g';
const SYB_UPLOADS_PLAYLIST_ID = 'UUwmdw7192t3UhKAsr3_Tv_g';
const SYB_LIVE_EMBED_URL = 'https://www.youtube.com/embed/live_stream?channel=' + SYB_CHANNEL_ID + '&autoplay=1&mute=1&playsinline=1&rel=0';
const SYB_LATEST_EMBED_URL = 'https://www.youtube.com/embed/videoseries?list=' + SYB_UPLOADS_PLAYLIST_ID + '&index=0&autoplay=1&mute=1&playsinline=1&rel=0';
const SYB_LIVE_START_AT = Date.parse('2026-11-14T16:00:00.000Z');
const SYB_CHANNEL_LIVE_URL = 'https://www.youtube.com/@supportyourbrothers/live';
const SYB_CHANNEL_VIDEOS_URL = 'https://www.youtube.com/@supportyourbrothers/videos';

type YouTubePlayer = {
  destroy: () => void;
  loadPlaylist: (options: { listType: 'playlist'; list: string; index: number }) => void;
};

type YouTubePlayerEvent = {
  data: number;
  target: YouTubePlayer;
};

type YouTubeApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onError: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
      };
    }
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const fail = () => {
      youtubeApiPromise = null;
      reject(new Error('The YouTube player API did not load.'));
    };

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else fail();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

function withYouTubeApiIdentity(url: string, origin: string) {
  return url + '&enablejsapi=1&origin=' + encodeURIComponent(origin);
}

type SybLiveStreamProps = {
  variant?: 'runs' | 'tv';
};

export function SybLiveStream({ variant = 'runs' }: SybLiveStreamProps) {
  const [playerReady, setPlayerReady] = useState(false);
  const [embedOrigin, setEmbedOrigin] = useState('');
  const [playerApiReady, setPlayerApiReady] = useState(false);
  const [showingLatest, setShowingLatest] = useState(false);
  const playerIframeRef = useRef<HTMLIFrameElement>(null);
  const fallbackStartedRef = useRef(false);
  const isRuns = variant === 'runs';
  const headingId = isRuns ? 'syb-runs-live-heading' : 'syb-tv-live-heading';

  useEffect(() => {
    setEmbedOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const delay = SYB_LIVE_START_AT - Date.now();
    if (delay <= 0) {
      setPlayerReady(true);
      return;
    }

    const timer = window.setTimeout(() => setPlayerReady(true), delay);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const iframe = playerIframeRef.current;
    if (!playerReady || !embedOrigin || !iframe) return;

    let active = true;
    let player: YouTubePlayer | null = null;

    const showLatest = (target?: YouTubePlayer) => {
      if (fallbackStartedRef.current) return;
      fallbackStartedRef.current = true;

      try {
        target?.loadPlaylist({ listType: 'playlist', list: SYB_UPLOADS_PLAYLIST_ID, index: 0 });
        setPlayerApiReady(Boolean(target));
      } catch {
        setPlayerApiReady(false);
      }

      setShowingLatest(true);
    };

    void loadYouTubeIframeApi()
      .then((youtube) => {
        if (!active) return;

        try {
          player = new youtube.Player(iframe, {
            events: {
              onError: (event) => showLatest(event.target),
              onStateChange: (event) => {
                if (event.data === 0) showLatest(event.target);
              },
            },
          });
          setPlayerApiReady(true);
        } catch {
          setShowingLatest(true);
        }
      })
      .catch(() => {
        if (active) setShowingLatest(true);
      });

    return () => {
      active = false;
      player?.destroy();
    };
  }, [playerReady, embedOrigin]);

  const liveEmbedUrl = embedOrigin ? withYouTubeApiIdentity(SYB_LIVE_EMBED_URL, embedOrigin) : '';
  const latestEmbedUrl = embedOrigin ? withYouTubeApiIdentity(SYB_LATEST_EMBED_URL, embedOrigin) : '';

  return (
    <section
      aria-labelledby={headingId}
      className={isRuns
        ? 'border-y border-[#383838] bg-[#090909] text-white'
        : 'mx-5 mb-5 rounded-2xl border border-white/10 bg-black/40 text-white sm:mx-7'}
    >
      <div className={isRuns ? 'mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6' : 'p-4 sm:p-5'}>
        <div className="grid gap-4 lg:grid-cols-[.62fr_1.38fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#c9c9c9]">SYBHOOPS · Official 1v1 feed</p>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/70">
                {showingLatest ? 'Latest video' : playerReady ? 'YouTube Live' : 'Today · 11:00 AM ET'}
              </span>
            </div>
            <h2 id={headingId} className="mt-2 font-display text-2xl font-black uppercase leading-tight sm:text-3xl">
              {showingLatest
                ? 'Watch the latest SYBHOOPS video.'
                : playerReady
                  ? 'Watch the SYBHOOPS stream.'
                  : 'SYBHOOPS goes live at 11.'}
            </h2>
            <a
              href={showingLatest ? SYB_CHANNEL_VIDEOS_URL : SYB_CHANNEL_LIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-white/20 px-3 text-[10px] font-black uppercase tracking-wider text-white/80 transition hover:border-white/50 hover:text-white"
            >
              {showingLatest ? 'More SYBHOOPS videos ↗' : 'Open SYBHOOPS on YouTube ↗'}
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <div className="aspect-video">
              {playerReady && embedOrigin ? (
                <iframe
                  ref={playerIframeRef}
                  key="sybhoops-live-channel"
                  className="h-full w-full"
                  src={showingLatest && !playerApiReady ? latestEmbedUrl : liveEmbedUrl}
                  title={showingLatest ? 'Latest SYBHOOPS video' : 'SYBHOOPS official live stream'}
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="autoplay; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div role="status" className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,#252525,#080808_70%)] px-4 text-center">
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-[.2em] text-white/70">SYBHOOPS · 11:00 AM ET</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/45">The stream player connects automatically at start.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
