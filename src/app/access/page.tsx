import Link from 'next/link';

export const metadata = {
  title: 'Private Preview | Rich City League',
  description: 'Rich City League private preview access.',
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#05070b] px-5 py-12 text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.18),transparent_36%),radial-gradient(circle_at_15%_80%,rgba(14,165,233,.12),transparent_32%)]" />
    <section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div><div className="text-2xl font-black tracking-tight">RICH CITY <span className="text-rcl-gold">LEAGUE</span></div><div className="mt-1 text-[10px] font-black uppercase tracking-[.28em] text-white/35">804 · Richmond, Virginia</div></div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-rcl-gold/30 bg-rcl-gold/10 font-black text-rcl-gold">RCL</div>
      </div>
      <p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Private Preview</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase leading-none sm:text-5xl">We&apos;re building<br/>the next era.</h1>
      <p className="mt-5 text-sm leading-6 text-white/55">RCL is currently open to current members and invited guests while we finish the new platform. Enter your access password below, use your referral link, or sign in with your existing RCL account.</p>
      <form action="/api/preview-access" method="post" className="mt-8 space-y-3">
        <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[.2em] text-white/45">Preview password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Enter access password" className="h-14 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-base outline-none transition placeholder:text-white/25 focus:border-rcl-gold/60" />
        {error && <p role="alert" className="text-sm font-bold text-red-400">That password isn&apos;t valid. Try again.</p>}
        <button type="submit" className="h-14 w-full rounded-2xl bg-rcl-gold text-sm font-black uppercase tracking-[.08em] text-black transition hover:brightness-110">Enter Rich City League</button>
      </form>
      <div className="my-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-white/25"><span className="h-px flex-1 bg-white/10"/><span>Current member?</span><span className="h-px flex-1 bg-white/10"/></div>
      <Link href="/auth/sign-in" className="flex h-13 items-center justify-center rounded-2xl border border-white/15 px-4 py-4 text-sm font-black uppercase transition hover:border-rcl-blue/60 hover:bg-rcl-blue/5">Sign in to your account</Link>
      <p className="mt-7 text-center text-[11px] leading-5 text-white/30">Private beta access is temporary. Full public access is planned after September 30.</p>
    </section>
  </main>;
}
