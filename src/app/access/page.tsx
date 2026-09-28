import Link from 'next/link';
import { FaArrowRight, FaLock, FaShieldHalved } from 'react-icons/fa6';

export const metadata = {
  title: 'Private Preview',
  description: 'Rich City League private preview access.',
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="relative grid min-h-svh place-items-center overflow-hidden bg-[#03070d] px-5 py-12 text-white">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_4%,rgba(255,79,22,.16),transparent_32%),radial-gradient(circle_at_12%_82%,rgba(21,159,255,.14),transparent_34%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(21,159,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(21,159,255,.18)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
    <section className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-rcl-blue/20 bg-[#071522]/90 p-6 shadow-[0_28px_90px_rgba(0,0,0,.48)] backdrop-blur-xl sm:p-9">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rcl-orange to-transparent" />
      <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="text-lg font-black uppercase tracking-[.12em]">Rich City <span className="text-rcl-blue">League</span></div>
          <div className="mt-1 text-xs font-black uppercase tracking-[.24em] text-white/40">Richmond, Virginia · 804</div>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 text-sm font-black text-rcl-blue">RCL</div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/20 bg-rcl-orange/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-rcl-orange"><FaLock /> Private preview</div>
      <h1 className="mt-4 text-balance font-display text-4xl font-black uppercase leading-[.92] sm:text-5xl">The next era of<br/><span className="text-rcl-blue">Richmond basketball.</span></h1>
      <p className="mt-5 text-sm leading-6 text-white/60">RCL is currently open to current members and invited guests while the platform is in private preview. Use your access password, referral link, or existing RCL account.</p>

      <form action="/api/preview-access" method="post" className="mt-8 space-y-3">
        <label htmlFor="password" className="block text-xs font-black uppercase tracking-[.18em] text-white/55">Preview password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Enter access password" className="h-14 w-full rounded-xl border border-rcl-blue/20 bg-black/25 px-4 text-base outline-none transition placeholder:text-white/30 focus:border-rcl-blue/60 focus:ring-2 focus:ring-rcl-blue/10" />
        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm font-bold text-red-300">That password isn&apos;t valid. Try again.</p>}
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-rcl-orange text-sm font-black uppercase tracking-[.08em] text-black transition hover:-translate-y-0.5 hover:brightness-110">Enter Rich City League <FaArrowRight /></button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-black uppercase tracking-[.16em] text-white/30"><span className="h-px flex-1 bg-white/10"/><span>Current member?</span><span className="h-px flex-1 bg-white/10"/></div>
      <Link href="/auth/sign-in" className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-rcl-blue/25 bg-rcl-blue/5 px-4 py-4 text-sm font-black uppercase transition hover:border-rcl-blue/60 hover:bg-rcl-blue/10"><FaShieldHalved className="text-rcl-blue" /> Sign in to your account</Link>
      <p className="mt-7 text-center text-xs leading-5 text-white/35">Private preview access is temporary. Public access is planned after September 30.</p>
    </section>
  </main>;
}
