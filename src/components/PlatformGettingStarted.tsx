'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FaArrowLeft, FaArrowRight, FaBasketball, FaBell, FaCompass,
  FaHouse, FaMedal, FaPeopleGroup, FaPlay, FaTrophy, FaUser,
} from 'react-icons/fa6';

type TourAction = { href: string; label: string };
type TourStep = {
  shortLabel: string;
  title: string;
  description: string;
  tip: string;
  icon: IconType;
  actions: TourAction[];
};

const tourSteps: TourStep[] = [
  {
    shortLabel: 'Profile',
    title: 'Set up your basketball identity',
    description: 'Add a display name, photo, bio, and location so other players can recognize you. Your profile is the home for your RCH identity.',
    tip: 'You can change your profile details and visibility from the profile editor.',
    icon: FaUser,
    actions: [{ href: '/profile', label: 'Set up my profile' }],
  },
  {
    shortLabel: 'Home feed',
    title: 'Make the home feed yours',
    description: 'The social feed brings basketball updates into one place. Follow what is happening, share a moment from the court, and join the conversation.',
    tip: 'A photo or video from a Run can also become a highlight on your basketball profile.',
    icon: FaHouse,
    actions: [{ href: '/social', label: 'Open the home feed' }],
  },
  {
    shortLabel: 'Discover',
    title: 'Find people and basketball around Virginia',
    description: 'Use Discover to find players, coaches, teams, organizations, stories, and new opportunities across the RCH network.',
    tip: 'Use search when you already know the player, team, or organization you want to find.',
    icon: FaCompass,
    actions: [{ href: '/discover', label: 'Explore RCH' }, { href: '/search', label: 'Search basketball' }],
  },
  {
    shortLabel: 'Runs',
    title: 'Find a game or host your own',
    description: 'Runs helps you find pickup games, check the location and format, join a roster, or set up a game for other players.',
    tip: 'Open the Runs tutorials for focused walkthroughs on finding a Run, hosting pickup, and completing a game.',
    icon: FaBasketball,
    actions: [{ href: '/runs', label: 'Open Runs' }],
  },
  {
    shortLabel: 'Your people',
    title: 'Build your crew and join communities',
    description: 'Find the players you want to run with, build a crew, and join basketball communities connected to local courts and neighborhoods.',
    tip: 'Crews and communities help you stay connected between games.',
    icon: FaPeopleGroup,
    actions: [{ href: '/crews?intent=mine', label: 'Open Crews' }, { href: '/communities', label: 'Browse communities' }],
  },
  {
    shortLabel: 'Watch + follow',
    title: 'Follow the action on RCH TV and in the League',
    description: 'Watch basketball stories, highlights, and live coverage on RCH TV. Follow Rich City League for teams, schedules, games, and season updates.',
    tip: 'You can return to either section from the app menu at any time.',
    icon: FaPlay,
    actions: [{ href: '/media', label: 'Watch RCH TV' }, { href: '/league', label: 'Open Rich City League' }],
  },
  {
    shortLabel: 'Your progress',
    title: 'Keep track of your basketball activity',
    description: 'Check your My Hoops dashboard, review REP and badges, and keep up with messages and notifications from across the platform.',
    tip: 'Verified games and eligible Run activity are what count toward official competitive progress.',
    icon: FaMedal,
    actions: [
      { href: '/my-hoops', label: 'Open My Hoops' },
      { href: '/badges', label: 'View REP + badges' },
      { href: '/messages', label: 'Messages' },
      { href: '/notifications', label: 'Notifications' },
    ],
  },
];

const storageKey = 'rch-platform-get-started-step-v1';

export function PlatformGettingStarted() {
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved < tourSteps.length) setStepIndex(saved);
    } catch {
      // The guide still works when browser storage is unavailable.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, String(stepIndex));
    } catch {
      // Progress is optional; navigation remains available.
    }
  }, [ready, stepIndex]);

  const current = tourSteps[stepIndex];
  const Icon = current.icon;
  const lastStep = stepIndex === tourSteps.length - 1;
  const progress = Math.round(((stepIndex + 1) / tourSteps.length) * 100);

  return (
    <main className="min-h-svh bg-[#090909] px-4 pb-28 pt-8 text-white sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,#292929,#0c0c0c_62%)] p-5 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#c7c7c7]">RCH · Player start guide</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">Start here. Make RCH yours.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8c8c8] sm:text-base">
                A guided tour of the full platform: set up your profile, find your people, get on the court, and follow Virginia basketball.
              </p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-xs font-bold text-[#dedede]">
              {tourSteps.length} quick steps
            </span>
          </div>
        </header>

        <section className="mt-6" aria-label="Platform tour progress">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#bfbfbf]">
            <span>YOUR TOUR</span>
            <span>STEP {String(stepIndex + 1).padStart(2, '0')} OF {String(tourSteps.length).padStart(2, '0')}</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Platform guide progress"
            aria-valuemin={1}
            aria-valuemax={tourSteps.length}
            aria-valuenow={stepIndex + 1}
          >
            <div className="h-full rounded-full bg-[#d6d6d6] transition-[width] duration-300" style={{ width: String(progress) + '%' }} />
          </div>
        </section>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Choose a tour step">
          {tourSteps.map((item, index) => (
            <button
              key={item.shortLabel}
              type="button"
              aria-current={stepIndex === index ? 'step' : undefined}
              onClick={() => setStepIndex(index)}
              className={'min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ' + (
                stepIndex === index
                  ? 'border-[#c8c8c8] bg-white/[.1] text-white'
                  : 'border-white/10 bg-white/[.025] text-[#b9b9b9] hover:border-white/25 hover:text-white'
              )}
            >
              <span className="mr-2 text-[10px] text-[#858585]">{String(index + 1).padStart(2, '0')}</span>
              {item.shortLabel}
            </button>
          ))}
        </nav>

        <section className="mt-4 grid overflow-hidden rounded-3xl border border-white/10 bg-[#151515] md:grid-cols-[.82fr_1.18fr]" aria-labelledby="rch-tour-step-title" aria-live="polite">
          <div className="flex min-h-56 flex-col justify-between border-b border-white/10 bg-[linear-gradient(145deg,#272727,#111111_70%)] p-6 md:min-h-[350px] md:border-b-0 md:border-r">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.2em] text-[#b9b9b9]">
              <span>Rich City Hoops</span><span>Tour {String(stepIndex + 1).padStart(2, '0')}</span>
            </div>
            <div className="mt-8">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-black/25 text-3xl text-[#eeeeee]">
                <Icon aria-hidden="true" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#bdbdbd]">{current.shortLabel}</p>
              <p className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{current.title}</p>
            </div>
          </div>
          <div className="p-5 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#bdbdbd]">Step {stepIndex + 1}</p>
            <h2 id="rch-tour-step-title" className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{current.title}</h2>
            <p className="mt-4 text-sm leading-6 text-[#d0d0d0] sm:text-base">{current.description}</p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#bcbcbc]">Quick tip</p>
              <p className="mt-1 text-sm leading-6 text-[#d0d0d0]">{current.tip}</p>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {current.actions.map(action => (
                <Link key={action.href} href={action.href} className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[.05] px-4 py-3 text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/[.09]">
                  {action.label}<FaArrowRight aria-hidden="true" className="shrink-0 text-[#c8c8c8]" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111111] p-4">
          <button
            type="button"
            onClick={() => setStepIndex(index => Math.max(0, index - 1))}
            disabled={stepIndex === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-[#dddddd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaArrowLeft aria-hidden="true" /> Previous
          </button>
          <button type="button" onClick={() => setStepIndex(0)} className="min-h-11 px-3 text-xs font-bold text-[#bdbdbd] hover:text-white">
            Start over
          </button>
          {lastStep ? (
            <Link href="/social" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d0d0d0] px-4 text-sm font-black text-black">
              Go to your home feed <FaArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex(index => Math.min(tourSteps.length - 1, index + 1))}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d0d0d0] px-4 text-sm font-black text-black"
            >
              Next step <FaArrowRight aria-hidden="true" />
            </button>
          )}
        </footer>
        <p className="mt-4 text-center text-xs leading-5 text-[#a8a8a8]">
          Reopen this guide anytime from the app menu. For pickup details, the Runs page has its own focused tutorials.
        </p>
      </div>
    </main>
  );
}
