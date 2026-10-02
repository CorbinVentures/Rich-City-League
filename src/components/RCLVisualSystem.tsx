'use client';

/**
 * Global visual foundation for the social-first RCL brand.
 * Calm neutrals are the default; competition/media surfaces may opt into dark presentation.
 */
export function RCLVisualSystem(){
  return <style jsx global>{`
    :root {
      --rcl-canvas:#F7F5F1;
      --rcl-surface:#FFFFFF;
      --rcl-surface-soft:#F1EEE8;
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
    main::before, main::after { display:none!important; }
    h1,h2,h3,h4,.font-display { letter-spacing:-.025em; text-shadow:none!important; }
    button,a { transition:background-color .16s ease,border-color .16s ease,color .16s ease,opacity .16s ease,transform .16s ease,box-shadow .16s ease; }
    button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible { outline:2px solid rgba(184,92,56,.55); outline-offset:3px; }

    .rcl-platform-root { background:var(--rcl-canvas)!important; color:var(--rcl-text); }
    .rcl-platform-root main { color:var(--rcl-text); }

    .rcl-platform-root input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
    .rcl-platform-root textarea,
    .rcl-platform-root select {
      background:#fff!important;
      border-color:var(--rcl-line)!important;
      color:var(--rcl-text)!important;
      box-shadow:none!important;
    }
    .rcl-platform-root input::placeholder,.rcl-platform-root textarea::placeholder { color:#9A9DA2!important; }
    .rcl-platform-root select option { background:#fff!important; color:var(--rcl-text)!important; }

    .rcl-platform-root [class~="text-white"] { color:var(--rcl-text)!important; }
    .rcl-platform-root [class*="text-white/"] { color:var(--rcl-text-2)!important; }
    .rcl-platform-root [class*="border-white/"] { border-color:var(--rcl-line)!important; }
    .rcl-platform-root [class*="bg-white/"] { background:rgba(27,28,30,.035)!important; }

    .rcl-platform-root [class*="bg-[#03070d]"],
    .rcl-platform-root [class*="bg-[#05070b]"],
    .rcl-platform-root [class*="bg-[#05080d]"],
    .rcl-platform-root [class*="bg-[#07111b]"],
    .rcl-platform-root [class*="bg-[#08111b]"],
    .rcl-platform-root [class*="bg-[#09131e]"],
    .rcl-platform-root [class*="bg-[#10141a]"],
    .rcl-platform-root [class*="bg-[#101722]"] {
      background:var(--rcl-surface)!important;
    }

    .rcl-platform-root [class~="bg-gray-50"],
    .rcl-platform-root [class~="bg-gray-100"],
    .rcl-platform-root [class~="bg-slate-50"],
    .rcl-platform-root [class~="bg-zinc-50"],
    .rcl-platform-root [class~="bg-neutral-50"] {
      background:var(--rcl-surface-soft)!important;
      color:var(--rcl-text)!important;
    }

    .rcl-platform-root [class~="text-gray-900"],
    .rcl-platform-root [class~="text-gray-800"],
    .rcl-platform-root [class~="text-gray-700"],
    .rcl-platform-root [class~="text-slate-900"],
    .rcl-platform-root [class~="text-zinc-900"] { color:var(--rcl-text)!important; }

    .rcl-platform-root [class~="text-gray-500"],
    .rcl-platform-root [class~="text-gray-600"],
    .rcl-platform-root [class~="text-slate-500"],
    .rcl-platform-root [class~="text-slate-600"],
    .rcl-platform-root [class~="text-zinc-500"],
    .rcl-platform-root [class~="text-zinc-600"] { color:var(--rcl-text-2)!important; }

    body :where(.text-rcl-orange) { color:var(--rcl-orange)!important; }
    body :where(.text-rcl-gold) { color:var(--rcl-gold)!important; }
    body :where(.text-rcl-blue) { color:var(--rcl-blue)!important; }
    body :where(.bg-rcl-orange) { background:var(--rcl-orange)!important; color:#fff!important; box-shadow:none!important; }
    body :where(.bg-rcl-gold) { background:var(--rcl-gold)!important; color:#221A0D!important; box-shadow:none!important; }
    body :where(.bg-rcl-blue) { background:var(--rcl-blue)!important; color:#fff!important; box-shadow:none!important; }

    .rcl-platform-root table { background:#fff; }
    .rcl-platform-root table thead { background:var(--rcl-surface-soft)!important; }
    .rcl-platform-root table th { color:var(--rcl-muted)!important; font-weight:800!important; letter-spacing:.06em; text-transform:uppercase; }
    .rcl-platform-root table tbody tr { border-color:var(--rcl-line)!important; }
    .rcl-platform-root table tbody tr:hover { background:#FBFAF8!important; }

    section { scroll-margin-top:84px; }

    /* Media can stay cinematic inside the otherwise calm product. */
    .rcl-dark-media,.rcl-dark-media * { color:#fff; }
    .rcl-dark-media [class*="text-white/"] { color:rgba(255,255,255,.65)!important; }
    .rcl-dark-media [class*="border-white/"] { border-color:rgba(255,255,255,.14)!important; }
  `}</style>;
}
