'use client';

/**
 * Safe global foundation for the social-first RCL brand.
 * The shell and social surfaces are light; competition/media pages may
 * deliberately keep dark presentation until they are migrated individually.
 */
export function RCLVisualSystem(){
  return <style jsx global>{`
    :root {
      --rcl-canvas:#F7F5F1;
      --rcl-surface:#FFFFFF;
      --rcl-surface-2:#F1EEE8;
      --rcl-line:#E3DDD3;
      --rcl-text:#1B1C1E;
      --rcl-text-2:#5F6368;
      --rcl-muted:#8A8F96;
      --rcl-orange:#B85C38;
      --rcl-gold:#C9A45C;
      --rcl-blue:#64748B;
      --rcl-success:#4D8B67;
      --rcl-danger:#B54B55;
      --rcl-charcoal:#1B1C1E;
      --rcl-cream:#F7F5F1;
    }

    html { background:var(--rcl-canvas); color-scheme:light; scroll-behavior:smooth; }
    body { background:var(--rcl-canvas)!important; color:var(--rcl-text)!important; }
    body::before { display:none!important; }
    main { position:relative; isolation:isolate; }
    body main::before,body main::after { display:none!important; }
    h1,h2,h3,h4,.font-display { letter-spacing:-.025em; text-shadow:none!important; }
    button,a { transition:background-color .16s ease,border-color .16s ease,color .16s ease,opacity .16s ease,transform .16s ease,box-shadow .16s ease; }
    button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible {
      outline:2px solid rgba(184,92,56,.55);
      outline-offset:3px;
    }

    .rcl-platform-root { min-width:0; }
    section { scroll-margin-top:84px; }

    body :where(.text-rcl-orange) { color:var(--rcl-orange)!important; }
    body :where(.text-rcl-gold) { color:var(--rcl-gold)!important; }
    body :where(.text-rcl-blue) { color:var(--rcl-blue)!important; }
    body :where(.bg-rcl-orange) { background:var(--rcl-orange)!important; color:#fff!important; box-shadow:none!important; }
    body :where(.bg-rcl-gold) { background:var(--rcl-gold)!important; color:#221A0D!important; box-shadow:none!important; }

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
