'use client';

import { useEffect } from 'react';

export type ExposureMetricType = 'profile_view' | 'passport_view' | 'profile_share' | 'media_view';
export type ExposureSubjectType = 'profile' | 'player';

export function ProfileExposureBeacon({ subjectType, subjectId, metricType }: { subjectType: ExposureSubjectType; subjectId: string; metricType: ExposureMetricType }) {
  useEffect(() => {
    if (!subjectId) return;
    const controller = new AbortController();
    void fetch('/api/membership/exposure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectType, subjectId, metricType }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [metricType, subjectId, subjectType]);
  return null;
}
