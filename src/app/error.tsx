'use client';

import { PageState } from '@/components/PageState';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageState eyebrow="Rich City League" title="We couldn't load this page."
    action={<button type="button" className="rcl-state-link rcl-state-primary" onClick={reset}>Try again</button>}>
    <p>Please try again in a moment. You can also return to the home page while we get things back on court.</p>
  </PageState>;
}
