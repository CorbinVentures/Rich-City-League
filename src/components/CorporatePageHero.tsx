import type { ReactNode } from 'react';
import { Container } from '@/components/Container';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';

type CorporatePageHeroProps = {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  assetKey?: string;
};

export function CorporatePageHero({ eyebrow, title, accent, description, actions, meta, assetKey }: CorporatePageHeroProps) {
  return (
    <header className="relative overflow-hidden border-b border-rcl-blue/12 bg-[#071018]/88 text-white">
      {assetKey ? <ContentAssetBackground assetKey={assetKey} opacity={0.035} /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,9,13,.98),rgba(5,9,13,.92)_55%,rgba(7,16,24,.76)),radial-gradient(circle_at_88%_0%,rgba(145,206,242,.08),transparent_34%)]" />
      <Container maxWidth="xl" className="relative py-6 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-blue/65">{eyebrow}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl">{title}</h1>
              {accent ? <span className="text-sm font-medium text-white/38 sm:text-base">{accent}</span> : null}
            </div>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{description}</p> : null}
            {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {meta ? <div className="min-w-0 shrink-0">{meta}</div> : null}
        </div>
      </Container>
    </header>
  );
}
