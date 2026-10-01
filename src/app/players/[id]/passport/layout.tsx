import type { ReactNode } from 'react';
import { ProfileExposureBeacon } from '@/components/ProfileExposureBeacon';

export default async function PlayerPassportLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><ProfileExposureBeacon subjectType="player" subjectId={id} metricType="passport_view" />{children}</>;
}
