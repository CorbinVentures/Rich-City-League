'use client';

import type { ReactNode } from 'react';
import { Container } from '@/components/Container';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';

type Props = {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  assetKey?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function ClientPageHero({ eyebrow, title, accent, description, assetKey, meta, actions }: Props) {
  return <section className="relative overflow-hidden border-b border-rcl-blue/20 bg-[linear-gradient(115deg,#071522_0%,#03070d_62%,#07111b_100%)] text-white">
    {assetKey ? <ContentAssetBackground assetKey={assetKey} opacity={0.12} /> : null}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,13,.96),rgba(3,7,13,.80)_48%,rgba(3,7,13,.52)),radial-gradient(circle_at_82%_12%,rgba(255,79,22,.15),transparent_28%),radial-gradient(circle_at_12%_60%,rgba(21,159,255,.12),transparent_30%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(21,159,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(21,159,255,.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
    <Container maxWidth="xl" className="relative py-12 sm:py-16 lg:py-20">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">{eyebrow}</p>
          <h1 className="mt-4 text-balance font-display text-4xl font-black uppercase leading-[.88] tracking-[-.025em] sm:text-6xl">{title}{accent ? <><br/><span className="text-rcl-blue">{accent}</span></> : null}</h1>
          {description ? <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">{description}</p> : null}
          {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
    </Container>
  </section>;
}
