'use client';

import { useEffect, useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type ExposureType = 'impression' | 'organization_view' | 'event_view' | 'outbound_click' | 'share' | 'media_view' | 'save' | 'follow';

type ExposureContext = {
  organizationId: string;
  eventType: ExposureType;
  surface: string;
  eventId?: string | null;
  promotionId?: string | null;
  campaignId?: string | null;
  destinationUrl?: string | null;
};

function payload(context: ExposureContext) {
  return {
    p_organization_id: context.organizationId,
    p_event_type: context.eventType,
    p_surface: context.surface,
    p_event_id: context.eventId ?? null,
    p_promotion_id: context.promotionId ?? null,
    p_campaign_id: context.campaignId ?? null,
    p_destination_url: context.destinationUrl ?? null,
  };
}

function dedupeKey(context: ExposureContext) {
  return [
    'rcl-network-exposure',
    context.eventType,
    context.surface,
    context.organizationId,
    context.eventId ?? '',
    context.promotionId ?? '',
    context.campaignId ?? '',
  ].join(':');
}

function claimSessionEvent(context: ExposureContext) {
  try {
    const key = dedupeKey(context);
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    // Analytics should never block the experience when browser storage is unavailable.
  }
  return true;
}

export function NetworkExposureTracker(context: ExposureContext) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!claimSessionEvent(context)) return;
    void (supabase as any).rpc('record_network_exposure_event', payload(context));
  }, [context.campaignId, context.destinationUrl, context.eventId, context.eventType, context.organizationId, context.promotionId, context.surface, supabase]);

  return null;
}

export function NetworkImpression({
  children,
  className,
  organizationId,
  surface,
  eventId,
  promotionId,
  campaignId,
}: {
  children: ReactNode;
  className?: string;
  organizationId: string;
  surface: string;
  eventId?: string | null;
  promotionId?: string | null;
  campaignId?: string | null;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || sent.current) return;

    const context: ExposureContext = {
      organizationId,
      eventType: 'impression',
      surface,
      eventId,
      promotionId,
      campaignId,
    };

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (!visible || sent.current) return;
      sent.current = true;
      observer.disconnect();
      if (!claimSessionEvent(context)) return;
      void (supabase as any).rpc('record_network_exposure_event', payload(context));
    }, { threshold: [0.5] });

    observer.observe(node);
    return () => observer.disconnect();
  }, [campaignId, eventId, organizationId, promotionId, surface, supabase]);

  return <div ref={rootRef} className={className}>{children}</div>;
}

export function TrackedNetworkLink({
  href,
  children,
  className,
  target = '_blank',
  rel = 'noreferrer',
  organizationId,
  surface,
  eventId,
  promotionId,
  campaignId,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  organizationId: string;
  surface: string;
  eventId?: string | null;
  promotionId?: string | null;
  campaignId?: string | null;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    void (supabase as any).rpc('record_network_exposure_event', payload({
      organizationId,
      eventType: 'outbound_click',
      surface,
      eventId,
      promotionId,
      campaignId,
      destinationUrl: href,
    }));
  };

  return <a href={href} className={className} target={target} rel={rel} onClick={handleClick}>{children}</a>;
}
