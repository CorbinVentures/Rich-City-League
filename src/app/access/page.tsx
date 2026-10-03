import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaLock, FaShieldHalved } from 'react-icons/fa6';

export const metadata = {
  title: 'Coming Soon | Rich City Hoops',
  description: 'Rich City Hoops is temporarily in a member-only preview while the next release is being built.',
  robots: { index: false, follow: false },
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; profile?: string; inactive?: string }>;
}) {
  const { next, profile, inactive } = await searchParams;
  const destination = safeNextPath(next);
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(destination)}`;

  return <main className="relative grid min-h-svh place-items-center overflow-hidden bg-[#F6F9FC] px-5 py-12 text-[#0F2547]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_5%,rgba(59,130,246,.13),transparent_30%),radial-gradient(circle_at_8%_88%,rgba(15,37,71,.08),transparent_34%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[.22] [background-image:linear-gradient(rgba(59,130,246,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.12)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

    <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#D9E4EF] bg-white/95 p-6 shadow-[0_28px_90px_rgba(15,37,71,.14)] backdrop-blur-xl sm:p-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent" />

      <div className="mb-9 flex items-center justify-between gap-4 border-b border-[#E7EEF5] pb-6">
        <div>
          <div className="text-lg font-black uppercase tracking-[.12em]">Rich City <span className="text-[#3B82F6]">League</span></div>
          <div className="mt-1 text-xs font-black uppercase tracking-[.22em] text-[#64748B]">Richmond basketball · 804</div>
        </div>
        <div className="grid h-12 w-16 place-items-center rounded-xl border border-[#D9E4EF] bg-[#EDF4FA] text-lg font-black italic text-[#0F2547]">RCH</div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-[#2563EB]"><FaLock /> Member-only preview</div>

      <h1 className="mt-5 text-balance font-display text-4xl font-black uppercase leading-[.92] sm:text-6xl">Coming soon.<br/><span className="text-[#3B82F6]">We&apos;re still building.</span></h1>
      <p className="mt-5 text-sm leading-7 text-[#64748B] sm:text-base">Public access is temporarily closed while we keep polishing the next version of the platform. Existing Rich City League members can still sign in and use the site while development continues.</p>

      {(profile || inactive) && <div className="mt-6 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm leading-6 text-[#92400E]">
        {inactive
          ? 'This account is not currently active for the member preview.'
          : 'This preview is limited to member accounts that were already active before the temporary wall went up.'}
      </div>}

      <Link href={signInHref} className="mt-8 flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#3B82F6] px-5 py-4 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_14px_35px_rgba(59,130,246,.24)] transition hover:-translate-y-0.5 hover:bg-[#2563EB]">
        <FaShieldHalved /> Member sign in <FaArrowRight />
      </Link>

      <div className="mt-7 grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[#D9E4EF] bg-[#F8FBFE] p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDF4FA] text-[#3B82F6]"><FaBasketball /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#0F2547]">New accounts are paused</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">When the public launch reopens, new players, coaches and fans will be able to join again.</p>
        </div>
      </div>

      <p className="mt-7 text-center text-xs leading-5 text-[#94A3B8]">Already a member? Your existing login is all you need.</p>
    </section>
  </main>;
}
