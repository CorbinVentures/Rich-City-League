import type { ReactNode } from 'react';
import { Container } from '@/components/Container';

type CorporatePageHeroProps = {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function CorporatePageHero({ eyebrow, title, accent, description, actions, meta }: CorporatePageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-rcl-blue/20 bg-[linear-gradient(115deg,#071522_0%,#03070d_62%,#07111b_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,79,22,.15),transparent_28%),radial-gradient(circle_at_12%_60%,rgba(21,159,255,.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(21,159,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(21,159,255,.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <Container maxWidth="xl" className="relative py-14 sm:py-16 lg:py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">{eyebrow}</p>
            <h1 className="mt-4 text-balance font-display text-5xl font-black uppercase leading-[.88] tracking-[-.025em] sm:text-6xl lg:text-7xl">
              {title}{accent ? <><br /><span className="text-rcl-blue">{accent}</span></> : null}
            </h1>
            {description ? <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">{description}</p> : null}
            {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
      </Container>
    </section>
  );
}
