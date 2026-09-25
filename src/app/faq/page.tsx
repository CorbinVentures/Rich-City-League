import type { Metadata } from 'next';
import { FaqExperience } from './FaqExperience';
import { faqItems } from '@/lib/faq-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Rich City League FAQ | Richmond Basketball League | RCL',
  description: "Learn everything about the Rich City League — registration, basketball tryouts, player evaluations, the RCL draft, teams, coaches, schedules, rules, fantasy basketball, social features, news, media, and the league's Richmond history since 2011.",
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Rich City League FAQ | Richmond Basketball League | RCL',
    description: 'The official RCL information hub for Richmond basketball players, coaches, fans, and community members.',
    url: '/faq',
  },
};

export default function FaqPage() {
  const faqSchema = faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }));
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqSchema },
    { '@context': 'https://schema.org', '@type': 'SportsOrganization', name: 'Rich City League', url: 'https://richcityhoops.com', sport: 'Basketball', address: { '@type': 'PostalAddress', addressLocality: 'Richmond', addressRegion: 'VA', addressCountry: 'US' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://richcityhoops.com/' }, { '@type': 'ListItem', position: 2, name: 'RCL', item: 'https://richcityhoops.com/' }, { '@type': 'ListItem', position: 3, name: 'FAQ', item: 'https://richcityhoops.com/faq' }] },
  ];
  return <><FaqExperience /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
