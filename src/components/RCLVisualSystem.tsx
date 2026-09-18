'use client';

export function RCLVisualSystem() {
  return (
    <style jsx global>{`
      :root {
        --rcl-bg: #05070b;
        --rcl-surface: #0b1018;
        --rcl-surface-2: #101824;
        --rcl-line: rgba(255,255,255,.09);
        --rcl-muted: #7f8b9a;
        --rcl-orange: #ff6b1a;
      }
      html { background: var(--rcl-bg); scroll-behavior: smooth; }
      body {
        background:
          radial-gradient(circle at 15% -10%, rgba(255,107,26,.11), transparent 28rem),
          radial-gradient(circle at 90% 12%, rgba(77,163,255,.09), transparent 30rem),
          var(--rcl-bg) !important;
        color: #f5f1e8;
      }
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: -1;
        opacity: .055;
        background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.25) 0 1px, transparent 1px 9px);
      }
      main { position: relative; isolation: isolate; }
      main::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,107,26,.65), rgba(77,163,255,.45), transparent);
        pointer-events: none;
      }
      h1, h2, h3, h4, .font-display { letter-spacing: -.025em; }
      h1, h2 { text-shadow: 0 8px 35px rgba(0,0,0,.35); }
      button, a { transition: transform .18s ease, border-color .18s ease, background-color .18s ease, color .18s ease, box-shadow .18s ease; }
      button:hover, a:hover { }
      input, textarea, select {
        background: rgba(255,255,255,.035) !important;
        border-color: var(--rcl-line) !important;
        border-radius: 14px !important;
      }
      input:focus, textarea:focus, select:focus { border-color: rgba(255,107,26,.55) !important; box-shadow: 0 0 0 3px rgba(255,107,26,.08); }
      [class*="rounded-lg"][class*="border"], [class*="rounded-xl"][class*="border"], [class*="rounded-2xl"][class*="border"] {
        border-color: var(--rcl-line) !important;
      }
      [class*="bg-white/[.04]"], [class*="bg-white/[.035]"], [class*="bg-white/[.03]"] { background: rgba(255,255,255,.028) !important; }
      [class*="shadow-[0_1rem_3rem"] { box-shadow: 0 22px 70px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.025) !important; }
      header.sticky {
        background: rgba(5,7,11,.82) !important;
        border-bottom-color: rgba(255,255,255,.08) !important;
        box-shadow: 0 14px 50px rgba(0,0,0,.38) !important;
        backdrop-filter: blur(22px) saturate(135%);
      }
      header.sticky > div { min-height: 68px; }
      header.sticky a[href="/"] div:first-child {
        border-radius: 12px !important;
        box-shadow: 0 0 28px rgba(255,107,26,.12) !important;
      }
      header.sticky nav a { border-radius: 10px; }
      header.sticky nav a:hover { background: rgba(255,255,255,.045); transform: translateY(-1px); }
      section { scroll-margin-top: 90px; }
      .rcl-world { background: transparent !important; }
      .rcl-hero, .city-hero {
        border-bottom: 1px solid var(--rcl-line);
        background:
          radial-gradient(circle at 76% 35%, rgba(255,107,26,.16), transparent 24rem),
          radial-gradient(circle at 60% 85%, rgba(77,163,255,.12), transparent 28rem),
          linear-gradient(145deg, #101a28 0%, #080d15 56%, #05070b 100%) !important;
      }
      .rcl-hero::after, .city-hero::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(90deg, transparent 0 70%, rgba(255,255,255,.035) 70% 70.2%, transparent 70.2%), repeating-linear-gradient(135deg, transparent 0 80px, rgba(255,255,255,.025) 81px 82px);
        mix-blend-mode: screen;
      }
      .rcl-button, [class*="bg-rcl-orange"] {
        box-shadow: 0 12px 35px rgba(255,107,26,.16);
      }
      .rcl-button:hover, [class*="bg-rcl-orange"]:hover { box-shadow: 0 16px 42px rgba(255,107,26,.28); }
      .rcl-panel, .rcl-game-card, .rcl-news-card, .city-dashboard, .city-section, .lab-panel, .lab-workout {
        background: linear-gradient(145deg, rgba(16,24,36,.9), rgba(8,13,21,.88)) !important;
        border-color: rgba(255,255,255,.085) !important;
        box-shadow: 0 24px 70px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025) !important;
      }
      .rcl-panel:hover, .rcl-game-card:hover, .rcl-news-card:hover, .city-tile:hover, .city-feature:hover {
        border-color: rgba(255,107,26,.42) !important;
        box-shadow: 0 25px 80px rgba(0,0,0,.3), 0 0 30px rgba(255,107,26,.055) !important;
      }
      .rcl-destination { background: linear-gradient(145deg, rgba(17,30,45,.9), rgba(7,12,20,.95)) !important; }
      .rcl-destination:hover { border-color: rgba(255,107,26,.45) !important; box-shadow: 0 18px 50px rgba(0,0,0,.28); }
      .city-feature, .city-tile { border-color: rgba(255,255,255,.08) !important; }
      .city-feature { background: linear-gradient(145deg, rgba(20,52,78,.86), rgba(7,13,22,.96)) !important; }
      .city-court { background: linear-gradient(145deg, rgba(255,107,26,.78), rgba(74,32,13,.82)) !important; }
      .city-league { background: linear-gradient(145deg, rgba(35,117,184,.72), rgba(8,22,38,.95)) !important; }
      .city-lab { background: linear-gradient(145deg, rgba(18,92,127,.72), rgba(6,20,32,.95)) !important; }
      nav[aria-label="Primary mobile navigation"] {
        background: rgba(5,7,11,.9) !important;
        border-top-color: rgba(255,255,255,.09) !important;
        backdrop-filter: blur(24px) saturate(145%);
      }
      nav[aria-label="Primary mobile navigation"] a, nav[aria-label="Primary mobile navigation"] button { min-height: 60px; }
      nav[aria-label="Primary mobile navigation"] a[aria-current="page"], nav[aria-label="Primary mobile navigation"] a.text-rcl-orange { background: rgba(255,107,26,.07); }
      @media (max-width: 639px) {
        header.sticky > div { min-height: 62px; }
        h1 { font-size: clamp(2.4rem, 13vw, 4rem); }
        h2 { font-size: clamp(1.45rem, 7vw, 2rem); }
        .rcl-hero, .city-hero { min-height: 31rem; }
      }
      @media (min-width: 640px) and (max-width: 1023px) {
        .rcl-hero, .city-hero { min-height: 34rem; }
      }
    \`}</style>
  );
}
