export default function Loading() {
  return <main className="rcl-page-state" aria-busy="true">
    <div className="w-full max-w-3xl" role="status">
      <p className="mb-6 text-sm font-bold uppercase tracking-widest text-rcl-orange">Loading Rich City League…</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-10 w-2/3 rounded-xl bg-white/10" />
        <div className="h-5 w-full rounded-lg bg-white/5" />
        <div className="h-5 w-4/5 rounded-lg bg-white/5" />
        <div className="mt-8 h-56 rounded-2xl border border-white/10 bg-white/5" />
      </div>
    </div>
  </main>;
}
