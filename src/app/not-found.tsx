import { PageState } from '@/components/PageState';

export default function NotFound() {
  return <PageState eyebrow="Page not found · 404" title="This page is out of bounds.">
    <p>The link may have changed, or this page is no longer available. Head home or explore the league to find your next stop.</p>
  </PageState>;
}
