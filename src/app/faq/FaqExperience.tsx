'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FaArrowRight, FaMagnifyingGlass, FaPlus, FaMinus } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { faqCategories, faqItems, historyTimeline, type FaqCategory } from '@/lib/faq-data';

const featureCards = [
  { eyebrow: 'READY TO PLAY?', title: 'Registration, evaluations, tryouts, and the draft.', href: '/register', label: 'GET STARTED' },
  { eyebrow: 'COACHES CORNER', title: 'Resources, responsibilities, and opportunities.', href: '/coaches', label: 'LEARN MORE' },
  { eyebrow: 'WATCH & FOLLOW', title: 'Highlights, stories, photos, and RCL media.', href: '/media', label: 'EXPLORE MEDIA' },
  { eyebrow: 'STILL HAVE QUESTIONS?', title: 'Start with the official registration channel.', href: '/register', label: 'CONTACT RCL' },
];

export function FaqExperience() {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('GENERAL');
  const [query, setQuery] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(faqItems[0]?.question ?? null);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return faqItems.filter((item) => {
      const inCategory = item.category === activeCategory;
      const searchable = [item.question, item.answer, item.category, ...item.keywords].join(' ').toLowerCase();
      return inCategory && (!normalized || searchable.includes(normalized));
    });
  }, [activeCategory, query]);

  return (
    <main className="faq-page min-h-screen pb-24 text-white lg:pb-0">
      <section className="faq-hero">
        <Container maxWidth="xl" className="relative z-10 py-16 sm:py-24">
          <nav aria-label="Breadcrumb" className="faq-breadcrumb"><Link href="/">HOME</Link><span>→</span><span>RCL</span><span>→</span><span className="text-white">FAQ</span></nav>
          <div className="mt-16 max-w-3xl">
            <p className="rcl-kicker">RICH CITY LEAGUE · RICHMOND, VIRGINIA</p>
            <h1 className="rcl-display mt-5 text-6xl uppercase leading-[.86] sm:text-8xl">Frequently<br /><span className="text-rcl-orange">Asked Questions</span></h1>
            <p className="mt-7 font-display text-xl font-bold uppercase tracking-wide text-white sm:text-3xl">Every question. <span className="text-rcl-orange">A bigger purpose.</span></p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Learn how Richmond basketball connects through the RCL — then find your way into the game, the community, and the next chapter.</p>
            <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-slate-400">LEARN. JOIN. COMPETE. BELONG. <span className="text-rcl-orange">·</span> RICHMOND BASKETBALL SINCE 2010.</p>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-8">
        <section aria-label="Search frequently asked questions" className="faq-search-panel">
          <label htmlFor="faq-search" className="sr-only">Search FAQs</label>
          <FaMagnifyingGlass className="text-rcl-orange" aria-hidden="true" />
          <input id="faq-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH FAQs..." />
          {query && <button type="button" onClick={() => setQuery('')} className="faq-clear">CLEAR</button>}
          <span className="hidden text-[10px] font-black tracking-widest text-slate-500 sm:block">SEARCH</span>
        </section>

        <nav aria-label="FAQ categories" className="faq-categories mt-8">
          {faqCategories.map((category) => (
            <button key={category} type="button" onClick={() => { setActiveCategory(category); setOpenQuestion(null); }} className={activeCategory === category ? 'active' : ''} aria-pressed={activeCategory === category}>{category}</button>
          ))}
        </nav>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
          <section aria-labelledby="faq-list-heading">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div><p className="rcl-kicker">RCL INFORMATION HUB</p><h2 id="faq-list-heading" className="rcl-display mt-2 text-4xl uppercase sm:text-5xl">{activeCategory} <span className="text-rcl-orange">FAQs</span></h2></div>
              <span className="hidden text-xs text-slate-500 sm:block">{visibleItems.length} {visibleItems.length === 1 ? 'answer' : 'answers'}</span>
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-400">{activeCategory === 'GENERAL' ? 'Quick answers to the most common questions about the RCL.' : `Explore what the RCL has published about ${activeCategory.toLowerCase()}.`}</p>
            <div className="faq-list">
              {visibleItems.map((item) => {
                const isOpen = openQuestion === item.question;
                const answerId = `answer-${item.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
                return <article key={item.question} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <h3><button type="button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setOpenQuestion(isOpen ? null : item.question)}><span>{item.question}</span>{isOpen ? <FaMinus aria-hidden="true" /> : <FaPlus aria-hidden="true" />}</button></h3>
                  <div id={answerId} role="region" className="faq-answer" hidden={!isOpen}><p>{item.answer}</p></div>
                </article>;
              })}
              {!visibleItems.length && <div className="faq-empty"><p>No questions have been published in this category yet.</p><button type="button" onClick={() => setQuery('')}>CLEAR SEARCH</button></div>}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="faq-story-panel">
              <p className="rcl-kicker">OUR STORY</p><h2 className="rcl-display mt-3 text-4xl uppercase">Built in Richmond.<br /><span className="text-rcl-orange">Since 2010.</span></h2>
              <p className="mt-5 text-sm leading-6 text-slate-300">RCL is an evolving Richmond basketball and community movement. We keep the record honest: confirmed history stays visible, and unverified milestones wait for official confirmation.</p>
              <div className="mt-7 space-y-5">{historyTimeline.map((event) => <div key={event.year} className="faq-timeline"><span>{event.year}</span><div><h3>{event.title}</h3><p>{event.body}</p></div></div>)}</div>
            </section>
            <section className="faq-numbers">
              <p className="rcl-kicker">BY THE NUMBERS</p><p className="mt-4 text-4xl font-black text-white">2010</p><p className="mt-1 text-xs font-black uppercase tracking-[.18em] text-slate-400">RCL STORY BEGINS</p>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">Other league totals are omitted until they are verified by RCL administration.</p>
            </section>
          </aside>
        </div>

        <section aria-labelledby="explore-heading" className="mt-20">
          <p className="rcl-kicker">GO DEEPER</p><h2 id="explore-heading" className="rcl-display mt-2 text-4xl uppercase sm:text-5xl">Explore <span className="text-rcl-orange">More</span></h2><p className="mt-3 text-sm text-slate-400">Dive deeper into everything RCL has to offer.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featureCards.map((card) => <Link href={card.href} key={card.eyebrow} className="faq-feature-card"><p className="text-[10px] font-black tracking-[.18em] text-rcl-orange">{card.eyebrow}</p><h3 className="mt-5 font-display text-xl font-black uppercase leading-tight">{card.title}</h3><span className="mt-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-300">{card.label} <FaArrowRight /></span></Link>)}</div>
        </section>

        <section className="faq-closing mt-20"><p className="rcl-kicker">RICH CITY LEAGUE</p><h2 className="rcl-display mt-4 text-5xl uppercase sm:text-7xl">More than a league.<br /><span className="text-rcl-orange">A stronger Richmond.</span></h2><p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">The city is the court. Find your place in the RCL.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="rcl-button">REGISTER NOW <FaArrowRight className="ml-2 inline" /></Link><Link href="/city" className="faq-outline-button">EXPLORE RCL</Link><Link href="/register" className="faq-outline-button">CONTACT RCL</Link></div></section>
      </Container>
    </main>
  );
}
