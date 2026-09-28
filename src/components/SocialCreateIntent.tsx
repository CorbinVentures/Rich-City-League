'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function SocialCreateIntent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wantsComposer = searchParams.get('compose') === '1';

  useEffect(() => {
    if (pathname !== '/social' || !wantsComposer) return;

    let cancelled = false;
    let attempt = 0;
    let timer: number | null = null;

    const open = () => {
      if (cancelled) return;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button.rcl-social-create'));
      const createButton = buttons.find((button) => /create/i.test(button.textContent ?? '')) ?? buttons[0];
      if (createButton) {
        createButton.click();
        window.history.replaceState({}, '', '/social');
        return;
      }
      attempt += 1;
      if (attempt < 30) timer = window.setTimeout(open, 100);
    };

    timer = window.setTimeout(open, 50);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [pathname, wantsComposer]);

  return null;
}
