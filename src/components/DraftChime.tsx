'use client';

import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'rcl_draft_chime_enabled';

function playDraftChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    master.connect(context.destination);

    const notes = [261.63, 329.63, 392, 523.25];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.08;
      oscillator.type = index === 3 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(index === 3 ? 0.12 : 0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.45);
    });

    window.setTimeout(() => void context.close(), 1400);
  } catch {
    // Audio is enhancement only; never interrupt the site.
  }
}

export function DraftChime() {
  const played = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === 'off') return;

    const play = () => {
      if (played.current) return;
      played.current = true;
      playDraftChime();
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
      window.removeEventListener('touchstart', play);
    };

    // Try immediately. Browsers may block audible autoplay.
    playDraftChime();
    played.current = true;

    // If autoplay is blocked, the first real gesture will still unlock the experience.
    window.addEventListener('pointerdown', play, { once: true, passive: true });
    window.addEventListener('keydown', play, { once: true });
    window.addEventListener('touchstart', play, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
      window.removeEventListener('touchstart', play);
    };
  }, []);

  return null;
}
