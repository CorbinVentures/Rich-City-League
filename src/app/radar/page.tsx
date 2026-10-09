import { redirect } from 'next/navigation';

// Retain old shared links without keeping an unused court-browsing page.
export default function FormerRadarPage() {
  redirect('/runs');
}
