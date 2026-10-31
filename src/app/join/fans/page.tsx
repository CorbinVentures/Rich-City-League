import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Get closer to your basketball community | Join Rich City Hoops',
  description: 'Join the Rich City Hoops Virginia basketball community free.',
  alternates: { canonical: '/join/fans' },
};

export default function Page() { return <RCHAudienceJoinPage audience="fans" />; }
