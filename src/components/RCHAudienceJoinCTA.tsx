'use client';
import Link from 'next/link';
import { trackRchConversion } from '@/lib/analytics/conversion';

export function RCHAudienceJoinCTA({ href, context }: { href: string; context: string }) {
  return <Link href={href} onClick={() => trackRchConversion('join_click', context)}
    className="inline-flex min-h-12 items-center rounded-xl bg-rose-600 px-6 text-sm font-black text-white hover:bg-rose-500">
    Create Free Profile <span aria-hidden="true" className="ml-3">→</span>
  </Link>;
}
