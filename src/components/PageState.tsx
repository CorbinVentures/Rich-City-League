import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageState({ eyebrow, title, children, action }: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return <main className="rcl-page-state">
    <section className="rcl-page-state-card">
      <p className="text-sm font-bold uppercase tracking-widest text-rcl-orange">{eyebrow}</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
      <div className="mt-4 max-w-lg text-base leading-7 text-slate-300">{children}</div>
      <div className="mt-8 flex flex-wrap gap-3">
        {action}
        <Link className="rcl-state-link" href="/">Back to home</Link>
        <Link className="rcl-state-link" href="/explore">Explore RCL</Link>
      </div>
    </section>
  </main>;
}
