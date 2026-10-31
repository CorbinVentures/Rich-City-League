import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Your basketball stories deserve a stage | Join Rich City Hoops',
  description: 'Join the Rich City Hoops Virginia basketball community free.',
  alternates: { canonical: '/join/creators' },
};

export default function Page() { return <RCHAudienceJoinPage audience="creators" />; }
