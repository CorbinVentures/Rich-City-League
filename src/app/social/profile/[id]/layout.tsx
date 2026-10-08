import type { ReactNode } from 'react';
import { ProfileExposureBeacon } from '@/components/ProfileExposureBeacon';

export default async function SocialProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><ProfileExposureBeacon subjectType="profile" subjectId={id} metricType="profile_view" />{children}</>;
}
