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
      className="fixed right-4 top-[5.25rem] z-40 inline-flex items-center gap-2 rounded-full border border-rcl-orange/40 bg-black/90 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rcl-orange shadow-[0_0_20px_rgba(255,107,26,0.15)] backdrop-blur-md transition hover:border-rcl-orange hover:bg-rcl-orange hover:text-black"
      aria-label="Open administrator control center"
    >
      <FaShieldHalved />
      <span className="hidden sm:inline">Admin Controls</span>
      <FaGear />
    </Link>
  );
}
