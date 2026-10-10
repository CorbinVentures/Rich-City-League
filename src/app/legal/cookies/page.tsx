import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Cookie & Storage Policy',
  description: 'How Rich City Hoops uses cookies, local storage and similar browser technologies.',
  alternates: { canonical: '/legal/cookies' },
};

export default function CookiesPolicy() {
  return <main className="min-h-screen bg-rcl-black text-white">
    <Container maxWidth="lg" className="py-14 prose prose-invert">
      <h1>Rich City Hoops Cookie &amp; Storage Policy</h1>
      <p><b>Effective: October 5, 2026</b></p>
      <p>This policy explains how Rich City Hoops (“RCH”) uses cookies, local storage, service-worker caches and similar browser technologies across the website and installable app.</p>

      <h2>Necessary account and security storage</h2>
      <p>RCH and its authentication providers use browser storage and cookies when needed to keep you signed in, maintain a secure session, complete account recovery and help prevent unauthorized access. Disabling necessary storage can prevent authenticated features from working.</p>

      <h2>Preferences and app experience</h2>
      <p>RCH may store preferences on your device so the service can remember interface choices and support installable-app features. The progressive web app may also cache selected static files so navigation remains fast and updated versions can be detected reliably.</p>

      <h2>Payments and external services</h2>
      <p>If paid features are enabled and you choose to use them, payment checkout may be provided on a payment processor&apos;s hosted pages. That provider may use its own necessary security and payment technologies under its own privacy and cookie policies.</p>

      <h2>Analytics and advertising</h2>
      <p>RCH may use operational logs and aggregate service measurements to understand reliability, security and product performance. If optional advertising or analytics technologies that require additional consent are introduced, RCH will provide the controls and disclosures required for that use.</p>

      <h2>Your choices</h2>
      <p>You can control browser cookies and site storage through your browser or device settings. Clearing storage may sign you out, reset preferences, remove cached app files or require RCH to rebuild local app data.</p>

      <h2>Changes</h2>
      <p>We may update this policy as the platform or its service providers change. The effective date above identifies the current version.</p>

      <p><Link href="/legal">← Legal &amp; Safety</Link></p>
    </Container>
  </main>;
}
