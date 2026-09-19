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
      body { background: radial-gradient(circle at 15% -10%, rgba(255,107,26,.11), transparent 28rem), radial-gradient(circle at 90% 12%, rgba(77,163,255,.09), transparent 30rem), var(--rcl-bg) !important; color: #f5f1e8; }
      body::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: .055; background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.25) 0 1px, transparent 1px 9px); }
      main { position: relative; isolation: isolate; }
      main::before { content: ''; position: absolute; inset: 0 0 auto; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,107,26,.65), rgba(77,163,255,.45), transparent); pointer-events: none; }
      h1, h2, h3, h4, .font-display { letter-spacing: -.025em; }
      h1, h2 { text-shadow: 0 8px 35px rgba(0,0,0,.35); }
      button, a { transition: transform .18s ease, border-color .18s ease, background-color .18s ease, color .18s ease, box-shadow .18s ease; }
      input, textarea, select { background: rgba(255,255,255,.035) !important; border-color: var(--rcl-line) !important; border-radius: 14px !important; }
      input:focus, textarea:focus, select:focus { border-color: rgba(255,107,26,.55) !important; box-shadow: 0 0 0 3px rgba(255,107,26,.08); }
      [class*="rounded-lg"][class*="border"], [class*="rounded-xl"][class*="border"], [class*="rounded-2xl"][class*="border"] { border-color: var(--rcl-line) !important; }
      [class*="bg-white/[.04]"], [class*="bg-white/[.035]"], [class*="bg-white/[.03]"] { background: rgba(255,255,255,.028) !important; }
      header.sticky { background: rgba(5,7,11,.82) !important; border-bottom-color: rgba(255,255,255,.08) !important; box-shadow: 0 14px 50px rgba(0,0,0,.38) !important; backdrop-filter: blur(22px) saturate(135%); }
      header.sticky > div { min-height: 68px; }
      header.sticky a[href="/"] div:first-child { border-radius: 12px !important; box-shadow: 0 0 28px rgba(255,107,26,.12) !important; }
      header.sticky nav a { border-radius: 10px; }
      header.sticky nav a:hover { background: rgba(255,255,255,.045); transform: translateY(-1px); }
      section { scroll-margin-top: 90px; }
      .rcl-world { background: transparent !important; }
      .rcl-hero, .city-hero { border-bottom: 1px solid var(--rcl-line); background: radial-gradient(circle at 76% 35%, rgba(255,107,26,.16), transparent 24rem), radial-gradient(circle at 60% 85%, rgba(77,163,255,.12), transparent 28rem), linear-gradient(145deg, #101a28 0%, #080d15 56%, #05070b 100%) !important; }
      .rcl-hero::after, .city-hero::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, transparent 0 70%, rgba(255,255,255,.035) 70% 70.2%, transparent 70.2%), repeating-linear-gradient(135deg, transparent 0 80px, rgba(255,255,255,.025) 81px 82px); mix-blend-mode: screen; }
      .rcl-button, [class*="bg-rcl-orange"] { box-shadow: 0 12px 35px rgba(255,107,26,.16); }
      .rcl-panel, .rcl-game-card, .rcl-news-card, .city-dashboard, .city-section, .lab-panel, .lab-workout { background: linear-gradient(145deg, rgba(16,24,36,.9), rgba(8,13,21,.88)) !important; border-color: rgba(255,255,255,.085) !important; box-shadow: 0 24px 70px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025) !important; }
      .rcl-destination { background: linear-gradient(145deg, rgba(17,30,45,.9), rgba(7,12,20,.95)) !important; }
      .city-feature, .city-tile { border-color: rgba(255,255,255,.08) !important; }
      .city-court { background: linear-gradient(145deg, rgba(255,107,26,.78), rgba(74,32,13,.82)) !important; }
      nav[aria-label="Primary mobile navigation"] { background: rgba(5,7,11,.9) !important; border-top-color: rgba(255,255,255,.09) !important; backdrop-filter: blur(24px) saturate(145%); }
      nav[aria-label="Primary mobile navigation"] a, nav[aria-label="Primary mobile navigation"] button { min-height: 60px; }

      /* Cinematic Draft Platform */
      .rcl-draft-platform { background: radial-gradient(circle at 50% 0%, rgba(255,107,26,.055), transparent 34rem), #05070b; }
      .rcl-draft-hero { min-height: 31rem; background: radial-gradient(circle at 72% 50%, rgba(255,107,26,.18), transparent 20rem), linear-gradient(145deg, #101d2d, #070b12 62%, #05070b); border-bottom: 1px solid rgba(255,255,255,.08); }
      .rcl-draft-hero-grid { position: absolute; inset: 0; opacity: .2; background: linear-gradient(90deg, transparent 0 70%, rgba(255,255,255,.07) 70% 70.15%, transparent 70.15%), repeating-linear-gradient(135deg, transparent 0 5rem, rgba(77,163,255,.05) 5.05rem 5.12rem); }
      .rcl-draft-live-card { min-width: 15rem; border: 1px solid rgba(255,107,26,.3); border-radius: 1.25rem; background: rgba(7,12,19,.78); padding: 1.25rem; box-shadow: 0 24px 70px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04); }
      .rcl-draft-live-card strong { display:block; margin-top:.55rem; font-family:Impact, sans-serif; font-size:1.8rem; text-transform:uppercase; }
      .rcl-draft-live-card small { display:block; margin-top:.2rem; color:#7f8b9a; font-size:.7rem; text-transform:uppercase; letter-spacing:.12em; }
      .rcl-draft-live-card b { font-family:Impact, sans-serif; font-size:2.7rem; color:var(--rcl-orange); }
      .rcl-draft-live-card span:last-child { color:#7f8b9a; font-size:.65rem; text-transform:uppercase; letter-spacing:.14em; }
      .rcl-draft-stat-strip { display:grid; grid-template-columns:repeat(4,1fr); overflow:hidden; border:1px solid rgba(255,255,255,.09); border-radius:1rem; background:rgba(10,16,25,.92); box-shadow:0 20px 55px rgba(0,0,0,.3); }
      .rcl-draft-stat-strip > div { padding:1rem 1.2rem; border-right:1px solid rgba(255,255,255,.07); }
      .rcl-draft-stat-strip > div:last-child { border-right:0; }
      .rcl-draft-stat-strip span { display:block; color:#657384; font-size:.58rem; font-weight:900; letter-spacing:.18em; }
      .rcl-draft-stat-strip strong { display:block; margin-top:.25rem; font-family:Impact, sans-serif; font-size:1.5rem; }
      .rcl-draft-workspace { display:grid; grid-template-columns:1fr 1.35fr 1.15fr; gap:.8rem; }
      .rcl-draft-module { min-width:0; border:1px solid rgba(255,255,255,.085); border-radius:1rem; background:linear-gradient(145deg,rgba(13,23,35,.96),rgba(5,10,17,.96)); padding:1rem; box-shadow:0 20px 60px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025); }
      .rcl-draft-module:hover { border-color:rgba(255,107,26,.28); }
      .rcl-module-heading { display:flex; align-items:center; gap:.65rem; margin-bottom:1rem; }
      .rcl-module-heading small { display:block; color:#657384; font-size:.55rem; font-weight:900; letter-spacing:.18em; }
      .rcl-module-heading h2 { margin-top:.12rem; font-size:1rem; font-weight:900; text-transform:uppercase; }
      .rcl-module-icon { display:grid; width:2rem; height:2rem; place-items:center; border:1px solid rgba(255,107,26,.25); border-radius:.55rem; background:rgba(255,107,26,.08); color:var(--rcl-orange); }
      .rcl-draft-countdown { margin:1rem 0; border-radius:.75rem; background:linear-gradient(145deg,rgba(255,107,26,.12),rgba(0,0,0,.16)); padding:1rem; }
      .rcl-draft-countdown > span { color:var(--rcl-orange); font-size:.55rem; font-weight:900; letter-spacing:.16em; }
      .rcl-draft-countdown > strong { display:block; margin-top:.3rem; font-size:.9rem; text-transform:uppercase; }
      .rcl-draft-countdown > div { display:grid; grid-template-columns:1fr 1fr; margin-top:.8rem; gap:.3rem 1rem; }
      .rcl-draft-countdown b { font-family:Impact,sans-serif; font-size:1.8rem; }
      .rcl-draft-countdown small { color:#68788a; font-size:.52rem; letter-spacing:.12em; }
      .rcl-draft-primary,.rcl-draft-secondary { display:flex; min-height:2.7rem; align-items:center; justify-content:center; gap:.45rem; border-radius:.65rem; padding:.7rem .8rem; font-size:.58rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
      .rcl-draft-primary { background:var(--rcl-orange); color:#080a0e; box-shadow:0 10px 30px rgba(255,107,26,.18); }
      .rcl-draft-secondary { margin-top:.5rem; border:1px solid rgba(255,255,255,.14); color:#b8c3cf; background:rgba(255,255,255,.025); }
      .rcl-draft-secondary:hover { border-color:rgba(255,107,26,.4); color:white; }
      .rcl-draft-board input { width:100%; margin-bottom:.55rem; padding:.65rem .75rem; color:white; outline:none; font-size:.7rem; }
      .rcl-filter-row { display:flex; gap:.3rem; overflow-x:auto; padding-bottom:.45rem; }
      .rcl-filter-row button { border-radius:999px; background:rgba(255,255,255,.055); padding:.35rem .55rem; color:#718094; font-size:.52rem; font-weight:900; }
      .rcl-filter-row button.active { background:var(--rcl-orange); color:#080a0e; }
      .rcl-prospect-list { max-height:20rem; overflow:auto; }
      .rcl-prospect-list > button { display:grid; width:100%; grid-template-columns:1.8rem 2rem 1fr auto; align-items:center; gap:.5rem; border-bottom:1px solid rgba(255,255,255,.045); padding:.55rem .35rem; text-align:left; color:white; }
      .rcl-prospect-list > button:hover,.rcl-prospect-list > button.selected { background:rgba(255,107,26,.08); }
      .rcl-rank { color:var(--rcl-orange); font-size:.68rem; font-weight:900; }
      .rcl-prospect-avatar { display:grid; width:1.8rem; height:1.8rem; place-items:center; overflow:hidden; border-radius:50%; background:#162232; color:#9ba8b6; font-size:.6rem; font-weight:900; }
      .rcl-prospect-avatar img { width:100%; height:100%; object-fit:cover; }
      .rcl-prospect-name { min-width:0; overflow:hidden; font-size:.65rem; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .rcl-prospect-name small { display:block; margin-top:.12rem; color:#68788a; font-size:.48rem; text-transform:uppercase; }
      .rcl-prospect-list > button > b { color:#d8e1e8; font-size:.68rem; }
      .rcl-on-clock { border:1px solid rgba(255,107,26,.2); border-radius:.8rem; background:rgba(255,107,26,.06); padding:.8rem; }
      .rcl-on-clock span { color:var(--rcl-orange); font-size:.52rem; font-weight:900; letter-spacing:.16em; }
      .rcl-on-clock strong { display:block; margin-top:.2rem; font-family:Impact,sans-serif; font-size:2.2rem; }
      .rcl-on-clock small { color:#718094; font-size:.55rem; }
      .rcl-selected-player { margin:1rem 0; border-left:2px solid var(--rcl-orange); padding:.6rem .7rem; }
      .rcl-selected-player strong { display:block; font-size:1rem; text-transform:uppercase; }
      .rcl-selected-player span { color:#7f8b9a; font-size:.58rem; }
      .rcl-empty-pick { min-height:5.4rem; display:grid; place-items:center; border:1px dashed rgba(255,255,255,.1); border-radius:.75rem; color:#667586; font-size:.65rem; text-align:center; }
      .rcl-player-photo { height:8.5rem; overflow:hidden; border-radius:.7rem; background:linear-gradient(145deg,#17283a,#080d14); display:grid; place-items:center; color:var(--rcl-orange); font-family:Impact,sans-serif; font-size:4rem; }
      .rcl-player-photo img { width:100%; height:100%; object-fit:cover; }
      .rcl-player-preview h3 { margin-top:.8rem; font-size:1.1rem; font-weight:900; text-transform:uppercase; }
      .rcl-player-preview > p { color:#7f8b9a; font-size:.58rem; text-transform:uppercase; letter-spacing:.08em; }
      .rcl-player-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:.3rem; margin:1rem 0; }
      .rcl-player-metrics span { border:1px solid rgba(255,255,255,.06); padding:.5rem; color:#657384; font-size:.45rem; text-align:center; }
      .rcl-player-metrics b { display:block; color:white; font-size:.68rem; }
      .rcl-preview-empty { min-height:14rem; display:grid; place-items:center; align-content:center; gap:.5rem; color:#647487; text-align:center; }
      .rcl-preview-empty svg { color:var(--rcl-orange); font-size:1.8rem; }
      .rcl-preview-empty strong { color:white; font-size:.85rem; text-transform:uppercase; }
      .rcl-preview-empty span { font-size:.6rem; }
      .rcl-roster-mini { margin:1rem 0; }
      .rcl-roster-mini > div { display:grid; grid-template-columns:1.4rem 1fr auto; gap:.4rem; border-bottom:1px solid rgba(255,255,255,.05); padding:.55rem 0; }
      .rcl-roster-mini b { color:var(--rcl-orange); font-size:.6rem; }
      .rcl-roster-mini span { overflow:hidden; font-size:.58rem; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .rcl-roster-mini small { color:#657384; font-size:.48rem; }
      .rcl-draft-feature { display:flex; align-items:center; gap:.7rem; border:1px solid rgba(255,255,255,.065); border-radius:.85rem; background:rgba(10,17,27,.75); padding:.9rem; }
      .rcl-draft-feature svg { color:#b8c7d5; font-size:1rem; }
      .rcl-draft-feature strong,.rcl-draft-feature span { display:block; }
      .rcl-draft-feature strong { font-size:.62rem; text-transform:uppercase; }
      .rcl-draft-feature span { margin-top:.18rem; color:#667586; font-size:.5rem; }
      .rcl-pick-history { overflow:hidden; border:1px solid rgba(255,255,255,.08); border-radius:1rem; background:rgba(8,14,22,.86); }
      .rcl-pick-history > div { display:grid; grid-template-columns:3rem 1.2fr 1.4fr .8fr; gap:1rem; align-items:center; border-bottom:1px solid rgba(255,255,255,.05); padding:.8rem 1rem; }
      .rcl-pick-history > div:last-child { border-bottom:0; }
      .rcl-pick-history > div.current { background:rgba(255,107,26,.08); }
      .rcl-pick-history > div > b { color:var(--rcl-orange); }
      .rcl-pick-history strong { font-size:.7rem; text-transform:uppercase; }
      .rcl-pick-history small { color:#667586; font-size:.55rem; }
      @media (max-width: 1023px) {
        .rcl-draft-workspace { grid-template-columns:1fr 1fr; }
        .rcl-draft-hub { grid-column:span 1; }
        .rcl-draft-board { grid-column:span 1; }
        .rcl-team-selection { grid-column:span 1; }
        .rcl-player-preview { grid-column:span 1; }
        .rcl-my-team { grid-column:span 2; }
      }
      @media (max-width: 639px) {
        .rcl-draft-hero { min-height:24rem; }
        .rcl-draft-live-card { width:100%; min-width:0; }
        .rcl-draft-stat-strip { grid-template-columns:repeat(2,1fr); }
        .rcl-draft-stat-strip > div:nth-child(2) { border-right:0; }
        .rcl-draft-stat-strip > div:nth-child(-n+2) { border-bottom:1px solid rgba(255,255,255,.07); }
        .rcl-draft-workspace { grid-template-columns:1fr; }
        .rcl-draft-hub,.rcl-draft-board,.rcl-team-selection,.rcl-player-preview,.rcl-my-team { grid-column:span 1; }
        .rcl-draft-feature { min-height:4.2rem; }
        .rcl-pick-history > div { grid-template-columns:2.4rem 1fr auto; gap:.55rem; }
        .rcl-pick-history > div > small { display:none; }
        .rcl-draft-platform { padding-bottom:6rem; }
      }

      @media (max-width: 639px) {
        header.sticky { height:4.5rem !important; min-height:4.5rem !important; }
        header.sticky > div { height:4.5rem !important; min-height:4.5rem !important; padding-left:1rem !important; padding-right:1rem !important; gap:.5rem !important; }
        header.sticky .rcl-brand { display:flex !important; flex:1 1 auto !important; width:auto !important; max-width:11rem !important; min-width:0 !important; gap:.55rem !important; overflow:visible !important; }
        header.sticky .rcl-brand-mark { width:2.35rem !important; height:2.35rem !important; border-radius:.7rem !important; }
        header.sticky .rcl-brand > div:last-child span:nth-child(1), header.sticky .rcl-brand > div:last-child span:nth-child(2) { display:inline !important; font-size:.6rem !important; line-height:1 !important; letter-spacing:.12em !important; white-space:nowrap !important; }
        header.sticky .rcl-brand > div:last-child span:nth-child(2)::before { content:' '; }
        header.sticky .rcl-brand > div:last-child span:nth-child(3) { display:none !important; }
        header.sticky .rcl-mobile-actions { display:flex !important; flex:0 0 auto !important; gap:.35rem !important; }
        header.sticky .rcl-mobile-actions a, header.sticky .rcl-mobile-actions button { width:2.45rem !important; height:2.45rem !important; }
        header.sticky > div > div:last-child { display:none !important; }
        nav[aria-label="Primary mobile navigation"] { min-height:4.75rem !important; padding-bottom:max(env(safe-area-inset-bottom),.35rem) !important; }
        nav[aria-label="Primary mobile navigation"] > div { min-height:4.25rem !important; height:4.25rem !important; padding-left:.35rem !important; padding-right:.35rem !important; }
        nav[aria-label="Primary mobile navigation"] a { min-height:4rem !important; height:4rem !important; gap:.3rem !important; padding-top:.35rem !important; padding-bottom:.35rem !important; border-radius:.8rem !important; }
        nav[aria-label="Primary mobile navigation"] a svg { width:1.25rem !important; height:1.25rem !important; }
        nav[aria-label="Primary mobile navigation"] a span { font-size:.56rem !important; line-height:1 !important; letter-spacing:.14em !important; }
        .rcl-world { padding-bottom:5rem !important; }
        .rcl-world .rcl-hero { min-height:calc(100svh - 9.5rem) !important; height:calc(100svh - 9.5rem) !important; max-height:44rem !important; }
      }
      @media (min-width:640px) and (max-width:1023px) { .rcl-hero,.city-hero { min-height:34rem; } }
      @media screen and (orientation:landscape) and (max-height:520px) and (pointer:coarse) {
        header.sticky { height:4.25rem !important; min-height:4.25rem !important; }
        header.sticky > div { height:4.25rem !important; min-height:4.25rem !important; }
        header.sticky .rcl-brand, header.sticky .rcl-mobile-actions { display:flex !important; }
        header.sticky > div > div:last-child { display:none !important; }
        header.sticky nav { display:none !important; }
        nav[aria-label="Primary mobile navigation"] { min-height:4.25rem !important; padding-bottom:max(env(safe-area-inset-bottom),.25rem) !important; }
        nav[aria-label="Primary mobile navigation"] > div { min-height:3.9rem !important; height:3.9rem !important; }
        nav[aria-label="Primary mobile navigation"] a { min-height:3.65rem !important; height:3.65rem !important; }
      }

      /* ===== GLOBAL BASKETBALL BRAND ENFORCEMENT ===== */
      :root {
        --rcl-court-orange: #ff4f16;
        --rcl-court-blue: #159fff;
        --rcl-court-bg: #03070d;
        --rcl-court-panel: #071522;
        --rcl-court-text: #f6f8fb;
        --rcl-court-muted: #7d90a3;
      }

      /* Every route inherits the same arena/court atmosphere. */
      .rcl-platform-root {
        background:
          radial-gradient(circle at 88% 8%, rgba(21,159,255,.045), transparent 25rem),
          radial-gradient(circle at 8% 82%, rgba(255,79,22,.04), transparent 23rem),
          linear-gradient(90deg, transparent 0 49.8%, rgba(255,79,22,.018) 49.9% 50.1%, transparent 50.2%);
      }

      .rcl-platform-root main {
        color: var(--rcl-court-text);
      }

      .rcl-platform-root main::after {
        content: "";
        position: absolute;
        top: 2.5rem;
        right: -11rem;
        width: 30rem;
        height: 30rem;
        border: 1px solid rgba(255,79,22,.035);
        border-radius: 50%;
        box-shadow: 0 0 0 4rem rgba(21,159,255,.018), 0 0 0 9rem rgba(255,255,255,.01);
        pointer-events: none;
        z-index: -1;
      }

      /* Remove legacy light surfaces that can escape the RCL visual system. */
      .rcl-platform-root [class~="bg-white"],
      .rcl-platform-root [class~="bg-gray-50"],
      .rcl-platform-root [class~="bg-gray-100"],
      .rcl-platform-root [class~="bg-slate-50"],
      .rcl-platform-root [class~="bg-zinc-50"],
      .rcl-platform-root [class~="bg-neutral-50"] {
        background: linear-gradient(145deg, rgba(14,24,37,.96), rgba(5,9,15,.98)) !important;
        color: var(--rcl-court-text) !important;
      }

      .rcl-platform-root [class~="text-black"],
      .rcl-platform-root [class~="text-gray-900"],
      .rcl-platform-root [class~="text-gray-800"],
      .rcl-platform-root [class~="text-gray-700"],
      .rcl-platform-root [class~="text-slate-900"],
      .rcl-platform-root [class~="text-zinc-900"] {
        color: var(--rcl-court-text) !important;
      }

      .rcl-platform-root [class~="text-gray-500"],
      .rcl-platform-root [class~="text-gray-600"],
      .rcl-platform-root [class~="text-slate-500"],
      .rcl-platform-root [class~="text-slate-600"],
      .rcl-platform-root [class~="text-zinc-500"],
      .rcl-platform-root [class~="text-zinc-600"] {
        color: var(--rcl-court-muted) !important;
      }

      .rcl-platform-root [class~="border-gray-200"],
      .rcl-platform-root [class~="border-gray-300"],
      .rcl-platform-root [class~="border-slate-200"],
      .rcl-platform-root [class~="border-zinc-200"],
      .rcl-platform-root [class~="border-neutral-200"] {
        border-color: rgba(255,255,255,.09) !important;
      }

      /* Shared form language: broadcast controls rather than generic web forms. */
      .rcl-platform-root input,
      .rcl-platform-root textarea,
      .rcl-platform-root select {
        color: var(--rcl-court-text) !important;
        background:
          linear-gradient(145deg, rgba(11,23,36,.96), rgba(4,9,15,.96)) !important;
        border-color: rgba(21,159,255,.18) !important;
      }

      .rcl-platform-root input::placeholder,
      .rcl-platform-root textarea::placeholder {
        color: #65798d !important;
      }

      .rcl-platform-root select option {
        background: #071522 !important;
        color: #f6f8fb !important;
      }

      /* Tables / scoreboards / lists get an RCL broadcast treatment. */
      .rcl-platform-root table thead {
        background: linear-gradient(90deg, rgba(255,79,22,.08), rgba(21,159,255,.045)) !important;
      }

      .rcl-platform-root table th {
        color: #7d90a3 !important;
        font-weight: 900 !important;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .rcl-platform-root table tbody tr {
        border-color: rgba(255,255,255,.07) !important;
      }

      .rcl-platform-root table tbody tr:hover {
        background: rgba(255,79,22,.045) !important;
      }

      /* Generic bordered blocks become dark arena modules without changing their data. */
      .rcl-platform-root [class*="border-white/10"],
      .rcl-platform-root [class*="border-white/15"] {
        border-color: rgba(255,255,255,.09) !important;
      }

      .rcl-platform-root .font-display,
      .rcl-platform-root h1,
      .rcl-platform-root h2,
      .rcl-platform-root h3 {
        font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
        text-transform: uppercase;
        letter-spacing: -.02em;
      }

      /* Orange = live/attention. Blue = navigation/action. */
      .rcl-platform-root [class*="text-rcl-gold"],
      .rcl-platform-root [class*="text-rcl-orange"] {
        color: var(--rcl-court-orange) !important;
      }

      .rcl-platform-root [class*="bg-rcl-gold"],
      .rcl-platform-root [class*="bg-rcl-red"] {
        background: linear-gradient(135deg, var(--rcl-court-orange), #d93d0b) !important;
        color: #05070b !important;
      }

      .rcl-platform-root [class*="border-rcl-gold"],
      .rcl-platform-root [class*="border-rcl-red"] {
        border-color: rgba(255,79,22,.45) !important;
      }

      /* Give every route a subtle basketball broadcast kicker when it has a main heading. */
      .rcl-platform-root main > :first-child {
        border-top-color: rgba(255,79,22,.22);
      }

      /* Mobile: keep the court motif quiet and preserve usable content space. */
      @media (max-width: 639px) {
        .rcl-platform-root main::after {
          top: 6rem;
          right: -16rem;
          width: 28rem;
          height: 28rem;
          opacity: .75;
        }
      }
    `}</style>
  );
}
