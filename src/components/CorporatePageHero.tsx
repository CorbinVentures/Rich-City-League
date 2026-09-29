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
    <section className="relative overflow-hidden border-b border-rcl-blue/15 bg-[linear-gradient(115deg,#09131d_0%,#05090d_62%,#07111b_100%)] text-white">
      {assetKey ? <ContentAssetBackground assetKey={assetKey} opacity={0.08} /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(145,206,242,.09),transparent_30%),radial-gradient(circle_at_12%_60%,rgba(95,169,213,.07),transparent_34%)]" />
      <Container maxWidth="xl" className="relative py-11 sm:py-14 lg:py-16">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-rcl-blue/80">{eyebrow}</p>
            <h1 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-.04em] sm:text-5xl lg:text-6xl">
              {title}{accent ? <><br /><span className="text-[#c7e8fb]">{accent}</span></> : null}
            </h1>
            {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">{description}</p> : null}
            {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {meta ? <div className="min-w-0 shrink-0">{meta}</div> : null}
        </div>
      </Container>
    </section>
  );
}
