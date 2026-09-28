'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, background: '#07090d', color: '#f6f8fb', fontFamily: 'Arial, sans-serif' }}>
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <section style={{ width: '100%', maxWidth: '36rem', lineHeight: 1.6 }}>
        <p style={{ color: '#ff6b1a', fontWeight: 700 }}>RICH CITY LEAGUE</p>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2 }}>We&apos;re having trouble loading RCL.</h1>
        <p>Please try again. If this continues, come back in a few minutes.</p>
        <button type="button" onClick={reset} style={{ background: '#ff6b1a', color: '#07090d', border: 0, borderRadius: 10, padding: '1rem 1.5rem', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
      </section>
    </main>
  </body></html>;
}
