'use client';

/**
 * Safe global foundation for the social-first RCL brand.
 * The shell and social surfaces are light; competition/media pages may
 * deliberately keep dark presentation until they are migrated individually.
 */
export function RCLVisualSystem(){
  return <style jsx global>{`
    :root {
      --rcl-canvas:#F3F6F9;
      --rcl-surface:#FFFFFF;
      --rcl-surface-2:#E9EFF5;
      --rcl-line:#D3DDE7;
      --rcl-text:#162331;
      --rcl-text-2:#526273;
      --rcl-muted:#657688;
      --rcl-orange:#2F6FAF;
      --rcl-gold:#2F6FAF;
      --rcl-blue:#53789A;
      --rcl-success:#3D7E6D;
      --rcl-danger:#B65362;
      --rcl-charcoal:#162331;
      --rcl-cream:#F3F6F9;
    }

    html { background:var(--rcl-canvas); color-scheme:light; scroll-behavior:smooth; }
    body { background:var(--rcl-canvas)!important; color:var(--rcl-text)!important; }
    body::before { display:none!important; }
    main { position:relative; isolation:isolate; }
    body main::before,body main::after { display:none!important; }
    h1,h2,h3,h4,.font-display { letter-spacing:-.025em; text-shadow:none!important; }
    button,a { transition:background-color .16s ease,border-color .16s ease,color .16s ease,opacity .16s ease,transform .16s ease,box-shadow .16s ease; }
    button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible {
      outline:2px solid rgba(47,111,175,.55);
      outline-offset:3px;
    }

    .rcl-platform-root { min-width:0; }
    section { scroll-margin-top:84px; }

    body :where(.text-rcl-orange) { color:var(--rcl-orange)!important; }
    body :where(.text-rcl-gold) { color:var(--rcl-gold)!important; }
    body :where(.text-rcl-blue) { color:var(--rcl-blue)!important; }
    body :where(.bg-rcl-orange) { background:var(--rcl-orange)!important; color:#fff!important; box-shadow:none!important; }
    body :where(.bg-rcl-gold) { background:var(--rcl-gold)!important; color:#fff!important; box-shadow:none!important; }

      /* Cinematic Draft Platform */
      .rcl-draft-platform { background: radial-gradient(circle at 50% 0%, rgba(47,111,175,.055), transparent 34rem), #05070b; }
      .rcl-draft-hero { min-height: 31rem; background: radial-gradient(circle at 72% 50%, rgba(47,111,175,.18), transparent 20rem), linear-gradient(145deg, #101d2d, #070b12 62%, #05070b); border-bottom: 1px solid rgba(255,255,255,.08); }
      .rcl-draft-hero-grid { position: absolute; inset: 0; opacity: .2; background: linear-gradient(90deg, transparent 0 70%, rgba(255,255,255,.07) 70% 70.15%, transparent 70.15%), repeating-linear-gradient(135deg, transparent 0 5rem, rgba(77,163,255,.05) 5.05rem 5.12rem); }
      .rcl-draft-live-card { min-width: 15rem; border: 1px solid rgba(47,111,175,.3); border-radius: 1.25rem; background: rgba(7,12,19,.78); padding: 1.25rem; box-shadow: 0 24px 70px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04); }
      .rcl-draft-live-card strong { display:block; margin-top:.55rem; font-family:Impact, sans-serif; font-size:1.8rem; text-transform:uppercase; }
      .rcl-draft-live-card small { display:block; margin-top:.2rem; color:#7f8b9a; font-size: .75rem; text-transform:uppercase; letter-spacing:.12em; }
      .rcl-draft-live-card b { font-family:Impact, sans-serif; font-size:2.7rem; color:var(--rcl-orange); }
      .rcl-draft-live-card span:last-child { color:#7f8b9a; font-size: .75rem; text-transform:uppercase; letter-spacing:.14em; }
      .rcl-draft-stat-strip { display:grid; grid-template-columns:repeat(4,1fr); overflow:hidden; border:1px solid rgba(255,255,255,.09); border-radius:1rem; background:rgba(10,16,25,.92); box-shadow:0 20px 55px rgba(0,0,0,.3); }
      .rcl-draft-stat-strip > div { padding:1rem 1.2rem; border-right:1px solid rgba(255,255,255,.07); }
      .rcl-draft-stat-strip > div:last-child { border-right:0; }
      .rcl-draft-stat-strip span { display:block; color:#657384; font-size: .75rem; font-weight:900; letter-spacing:.18em; }
      .rcl-draft-stat-strip strong { display:block; margin-top:.25rem; font-family:Impact, sans-serif; font-size:1.5rem; }
      .rcl-draft-workspace { display:grid; grid-template-columns:1fr 1.35fr 1.15fr; gap:.8rem; }
      .rcl-draft-module { min-width:0; border:1px solid rgba(255,255,255,.085); border-radius:1rem; background:linear-gradient(145deg,rgba(13,23,35,.96),rgba(5,10,17,.96)); padding:1rem; box-shadow:0 20px 60px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025); }
      .rcl-draft-module:hover { border-color:rgba(47,111,175,.28); }
      .rcl-module-heading { display:flex; align-items:center; gap:.65rem; margin-bottom:1rem; }
      .rcl-module-heading small { display:block; color:#657384; font-size: .75rem; font-weight:900; letter-spacing:.18em; }
      .rcl-module-heading h2 { margin-top:.12rem; font-size:1rem; font-weight:900; text-transform:uppercase; }
      .rcl-module-icon { display:grid; width:2rem; height:2rem; place-items:center; border:1px solid rgba(47,111,175,.25); border-radius:.55rem; background:rgba(47,111,175,.08); color:var(--rcl-orange); }
      .rcl-draft-countdown { margin:1rem 0; border-radius:.75rem; background:linear-gradient(145deg,rgba(47,111,175,.12),rgba(0,0,0,.16)); padding:1rem; }
      .rcl-draft-countdown > span { color:var(--rcl-orange); font-size: .75rem; font-weight:900; letter-spacing:.16em; }
      .rcl-draft-countdown > strong { display:block; margin-top:.3rem; font-size:.9rem; text-transform:uppercase; }
      .rcl-draft-countdown > div { display:grid; grid-template-columns:1fr 1fr; margin-top:.8rem; gap:.3rem 1rem; }
      .rcl-draft-countdown b { font-family:Impact,sans-serif; font-size:1.8rem; }
      .rcl-draft-countdown small { color:#68788a; font-size: .75rem; letter-spacing:.12em; }
      .rcl-draft-primary,.rcl-draft-secondary { display:flex; min-height:2.7rem; align-items:center; justify-content:center; gap:.45rem; border-radius:.65rem; padding:.7rem .8rem; font-size: .75rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
      .rcl-draft-primary { background:var(--rcl-orange); color:#fff; box-shadow:0 10px 30px rgba(47,111,175,.18); }
      .rcl-draft-secondary { margin-top:.5rem; border:1px solid rgba(255,255,255,.14); color:#b8c3cf; background:rgba(255,255,255,.025); }
      .rcl-draft-secondary:hover { border-color:rgba(47,111,175,.4); color:white; }
      .rcl-draft-board input { width:100%; margin-bottom:.55rem; padding:.65rem .75rem; color:white; outline:none; font-size: .75rem; }
      .rcl-filter-row { display:flex; gap:.3rem; overflow-x:auto; padding-bottom:.45rem; }
      .rcl-filter-row button { border-radius:999px; background:rgba(255,255,255,.055); padding:.35rem .55rem; color:#718094; font-size: .75rem; font-weight:900; }
      .rcl-filter-row button.active { background:var(--rcl-orange); color:#fff; }
      .rcl-prospect-list { max-height:20rem; overflow:auto; }
      .rcl-prospect-list > button { display:grid; width:100%; grid-template-columns:1.8rem 2rem 1fr auto; align-items:center; gap:.5rem; border-bottom:1px solid rgba(255,255,255,.045); padding:.55rem .35rem; text-align:left; color:white; }
      .rcl-prospect-list > button:hover,.rcl-prospect-list > button.selected { background:rgba(47,111,175,.08); }
      .rcl-rank { color:var(--rcl-orange); font-size: .75rem; font-weight:900; }
      .rcl-prospect-avatar { display:grid; width:1.8rem; height:1.8rem; place-items:center; overflow:hidden; border-radius:50%; background:#162232; color:#9ba8b6; font-size: .75rem; font-weight:900; }
      .rcl-prospect-avatar img { width:100%; height:100%; object-fit:cover; }
      .rcl-prospect-name { min-width:0; overflow:hidden; font-size: .75rem; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .rcl-prospect-name small { display:block; margin-top:.12rem; color:#68788a; font-size: .75rem; text-transform:uppercase; }
      .rcl-prospect-list > button > b { color:#d8e1e8; font-size: .75rem; }
      .rcl-on-clock { border:1px solid rgba(47,111,175,.2); border-radius:.8rem; background:rgba(47,111,175,.06); padding:.8rem; }
      .rcl-on-clock span { color:var(--rcl-orange); font-size: .75rem; font-weight:900; letter-spacing:.16em; }
      .rcl-on-clock strong { display:block; margin-top:.2rem; font-family:Impact,sans-serif; font-size:2.2rem; }
      .rcl-on-clock small { color:#718094; font-size: .75rem; }
      .rcl-selected-player { margin:1rem 0; border-left:2px solid var(--rcl-orange); padding:.6rem .7rem; }
      .rcl-selected-player strong { display:block; font-size:1rem; text-transform:uppercase; }
      .rcl-selected-player span { color:#7f8b9a; font-size: .75rem; }
      .rcl-empty-pick { min-height:5.4rem; display:grid; place-items:center; border:1px dashed rgba(255,255,255,.1); border-radius:.75rem; color:#667586; font-size: .75rem; text-align:center; }
      .rcl-player-photo { height:8.5rem; overflow:hidden; border-radius:.7rem; background:linear-gradient(145deg,#17283a,#080d14); display:grid; place-items:center; color:var(--rcl-orange); font-family:Impact,sans-serif; font-size:4rem; }
      .rcl-player-photo img { width:100%; height:100%; object-fit:cover; }
      .rcl-player-preview h3 { margin-top:.8rem; font-size:1.1rem; font-weight:900; text-transform:uppercase; }
      .rcl-player-preview > p { color:#7f8b9a; font-size: .75rem; text-transform:uppercase; letter-spacing:.08em; }
      .rcl-player-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:.3rem; margin:1rem 0; }
      .rcl-player-metrics span { border:1px solid rgba(255,255,255,.06); padding:.5rem; color:#657384; font-size: .75rem; text-align:center; }
      .rcl-player-metrics b { display:block; color:white; font-size: .75rem; }
      .rcl-preview-empty { min-height:14rem; display:grid; place-items:center; align-content:center; gap:.5rem; color:#647487; text-align:center; }
      .rcl-preview-empty svg { color:var(--rcl-orange); font-size:1.8rem; }
      .rcl-preview-empty strong { color:white; font-size:.85rem; text-transform:uppercase; }
      .rcl-preview-empty span { font-size: .75rem; }
      .rcl-roster-mini { margin:1rem 0; }
      .rcl-roster-mini > div { display:grid; grid-template-columns:1.4rem 1fr auto; gap:.4rem; border-bottom:1px solid rgba(255,255,255,.05); padding:.55rem 0; }
      .rcl-roster-mini b { color:var(--rcl-orange); font-size: .75rem; }
      .rcl-roster-mini span { overflow:hidden; font-size: .75rem; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .rcl-roster-mini small { color:#657384; font-size: .75rem; }
      .rcl-draft-feature { display:flex; align-items:center; gap:.7rem; border:1px solid rgba(255,255,255,.065); border-radius:.85rem; background:rgba(10,17,27,.75); padding:.9rem; }
      .rcl-draft-feature svg { color:#b8c7d5; font-size:1rem; }
      .rcl-draft-feature strong,.rcl-draft-feature span { display:block; }
      .rcl-draft-feature strong { font-size: .75rem; text-transform:uppercase; }
      .rcl-draft-feature span { margin-top:.18rem; color:#667586; font-size: .75rem; }
      .rcl-pick-history { overflow:hidden; border:1px solid rgba(255,255,255,.08); border-radius:1rem; background:rgba(8,14,22,.86); }
      .rcl-pick-history > div { display:grid; grid-template-columns:3rem 1.2fr 1.4fr .8fr; gap:1rem; align-items:center; border-bottom:1px solid rgba(255,255,255,.05); padding:.8rem 1rem; }
      .rcl-pick-history > div:last-child { border-bottom:0; }
      .rcl-pick-history > div.current { background:rgba(47,111,175,.08); }
      .rcl-pick-history > div > b { color:var(--rcl-orange); }
      .rcl-pick-history strong { font-size: .75rem; text-transform:uppercase; }
      .rcl-pick-history small { color:#667586; font-size: .75rem; }
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

    .rcl-social-world input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
    .rcl-social-world textarea,
    .rcl-social-world select,
    .rcl-navigation-panel input,
    .rcl-navigation-panel textarea,
    .rcl-navigation-panel select {
      background:#fff!important;
      border-color:var(--rcl-line)!important;
      color:var(--rcl-text)!important;
      box-shadow:none!important;
    }
    .rcl-social-world input::placeholder,.rcl-social-world textarea::placeholder { color:#9A9DA2!important; }

    .rcl-dark-media,.rcl-dark-media * { color:#fff; }
    .rcl-dark-media [class*="text-white/"] { color:rgba(255,255,255,.65)!important; }
    .rcl-dark-media [class*="border-white/"] { border-color:rgba(255,255,255,.14)!important; }
  `}</style>;
}
