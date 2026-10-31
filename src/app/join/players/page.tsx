import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Your next game starts here | Join Rich City Hoops',
  description: 'Join the Rich City Hoops Virginia basketball community free.',
  alternates: { canonical: '/join/players' },
};

export default function Page() { return <RCHAudienceJoinPage audience="players" />; }
