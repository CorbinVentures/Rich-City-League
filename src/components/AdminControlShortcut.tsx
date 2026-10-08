'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGear, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

export function AdminControlShortcut() {
  const pathname = usePathname();
  const { profile } = useAuth();
  if (profile?.role !== 'admin' || pathname.startsWith('/admin/control-center')) return null;

  return (
    <Link
      href="/admin/control-center"
      className="fixed right-4 top-[5.25rem] z-40 inline-flex items-center gap-2 rounded-xl border border-rcl-blue/25 bg-[#07111b]/90 px-3 py-2 text-xs font-semibold tracking-wide text-rcl-blue shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-rcl-blue/45 hover:bg-rcl-blue/10 hover:text-white"
      aria-label="Open administrator control center"
    >
      <FaShieldHalved />
      <span className="hidden sm:inline">Admin controls</span>
      <FaGear />
    </Link>
  );
}
