'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { FaArrowRight, FaXmark } from 'react-icons/fa6';
import { isNavigationActive, type RCLNavGroup } from '@/lib/rcl-navigation';

/** A native modal keeps keyboard focus inside navigation and restores it on close. */
export function NavigationDrawer({ open, onClose, groups, pathname }: {
  open: boolean;
  onClose: () => void;
  groups: RCLNavGroup[];
  pathname: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  return (
    <dialog ref={dialogRef} className="rcl-navigation-dialog" aria-labelledby={headingId}
      onCancel={onClose} onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="rcl-navigation-panel">
        <div className="rcl-navigation-heading">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rcl-orange">Rich City League</p>
            <h2 id={headingId} className="mt-1 text-2xl font-bold">Navigate RCL</h2>
            <p className="mt-2 max-w-xs text-sm leading-5 text-white/45">Everything stays available, organized around how members actually use the platform.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation"><FaXmark aria-hidden="true" /></button>
        </div>
        <nav aria-label="All Rich City League destinations" className="rcl-navigation-groups">
          {groups.map(group => (
            <section key={group.label} className="rcl-navigation-group" aria-label={group.label}>
              <div className="rcl-navigation-group-heading">
                <div><b>{group.label}</b><small>{group.description}</small></div>
              </div>
              <div className="rcl-navigation-group-links">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={onClose} aria-current={isNavigationActive(pathname, href) ? 'page' : undefined}>
                    <Icon aria-hidden="true" /><span>{label}</span><FaArrowRight className="rcl-navigation-arrow" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="rcl-navigation-utility">
          <Link href="/explore" onClick={onClose}>Explore the full platform</Link>
          <Link href="/settings" onClick={onClose}>Account settings</Link>
        </div>
      </div>
    </dialog>
  );
}
