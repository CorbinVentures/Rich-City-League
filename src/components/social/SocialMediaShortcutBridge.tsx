'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { SOCIAL_MEDIA_ACCEPT } from '@/lib/social-media';

export function SocialMediaShortcutBridge() {
  const pathname = usePathname();
  const shortcutInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname !== '/social') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;

      const label = button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
      if (label !== 'media') return;

      // Keep the existing React click handler intact so the post composer opens,
      // but open the native picker from the same user gesture.
      shortcutInputRef.current?.click();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  const forwardSelectedFile = (file: File) => {
    let attempts = 0;

    const attachToComposer = () => {
      attempts += 1;
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
      const composerInput = inputs.find((input) => input !== shortcutInputRef.current && input.accept === SOCIAL_MEDIA_ACCEPT);

      if (composerInput) {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        composerInput.files = transfer.files;
        composerInput.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      if (attempts < 20) window.setTimeout(attachToComposer, 50);
    };

    attachToComposer();
  };

  return (
    <input
      ref={shortcutInputRef}
      type="file"
      accept={SOCIAL_MEDIA_ACCEPT}
      className="hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) forwardSelectedFile(file);
        event.currentTarget.value = '';
      }}
    />
  );
}
