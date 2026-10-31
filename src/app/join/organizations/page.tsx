import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Grow the game under your own name | Join Rich City Hoops',
  description: 'Join the Rich City Hoops Virginia basketball community free.',
  alternates: { canonical: '/join/organizations' },
};

export default function Page() { return <RCHAudienceJoinPage audience="organizations" />; }
