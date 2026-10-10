/** Lightweight nonverbal suspense fallback under the full-screen RCH video. */
export default function Loading() {
  return (
    <main className="rcl-page-state" aria-busy="true" aria-label="Loading Rich City Hoops">
      <div className="w-full max-w-3xl" role="status" aria-label="Loading page">
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="h-10 w-2/3 rounded-xl bg-[#E2EAF4]" />
          <div className="h-5 w-full rounded-lg bg-[#E2EAF4]" />
          <div className="h-5 w-4/5 rounded-lg bg-[#E2EAF4]" />
          <div className="mt-8 h-56 rounded-2xl border border-[#E2EAF4] bg-[#F1F5FA]" />
        </div>
      </div>
    </main>
  );
}
