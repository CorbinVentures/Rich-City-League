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
  return <header className="rcl-client-page-hero relative overflow-hidden border-b border-[#D9E4EF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F9FC_100%)] text-[#0F2547]">
    {assetKey ? <ContentAssetBackground assetKey={assetKey} opacity={0.022} /> : null}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(59,130,246,.10),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(100,116,139,.08),transparent_36%)]" />
    <Container maxWidth="xl" className="relative py-6 sm:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-orange">{eyebrow}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl">{title}</h1>
            {accent ? <span className="text-sm font-medium text-[#64748B] sm:text-base">{accent}</span> : null}
          </div>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">{description}</p> : null}
          {actions ? <div className="mt-4 flex min-w-0 flex-wrap gap-2 [&>*]:min-w-0 [&>*]:max-w-full">{actions}</div> : null}
        </div>
        {meta ? <div className="w-full min-w-0 lg:w-auto lg:max-w-[42%] lg:shrink-0">{meta}</div> : null}
      </div>
    </Container>
  </header>;
}
