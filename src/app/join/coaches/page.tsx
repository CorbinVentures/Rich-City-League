import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Build your basketball network | Join Rich City Hoops',
  description: 'Join the Rich City Hoops Virginia basketball community free.',
  alternates: { canonical: '/join/coaches' },
};

export default function Page() { return <RCHAudienceJoinPage audience="coaches" />; }
