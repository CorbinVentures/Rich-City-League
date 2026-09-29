'use client';

/**
 * Runtime visual authority layer.
 *
 * RCLVisualSystem injects legacy styled-jsx after global stylesheets. This
 * component intentionally renders immediately after it so the current brand
 * palette wins the final cascade without rewriting every legacy surface at
 * once.
 */
export function RCLRuntimeFinish() {
  return (
    <style jsx global>{`
      :root {
        --rcl-orange: #91cef2 !important;
        --rcl-gold: #91cef2 !important;
        --rcl-court-orange: #91cef2 !important;
        --rcl-basket-orange: #91cef2 !important;
        --rcl-orange-corporate: #91cef2 !important;
      }

      html body {
        background:
          linear-gradient(121deg, transparent 0 35%, rgba(221,236,244,.035) 35.1%, transparent 35.35%),
          radial-gradient(circle at 84% -2%, rgba(145,206,242,.065), transparent 28rem),
          linear-gradient(180deg, #070d13 0%, #05090d 58%, #04070a 100%) !important;
      }

      body main::before {
        background: linear-gradient(90deg, transparent, rgba(145,206,242,.28), transparent) !important;
      }

      /* Legacy semantic utility names now resolve to institutional ice blue. */
      body :where(.text-rcl-orange, .text-rcl-gold) {
        color: #91cef2 !important;
      }

      body :where(.bg-rcl-orange, .bg-rcl-gold) {
        background: linear-gradient(145deg, #c7e8fb, #8fcbed) !important;
        color: #071018 !important;
      }

      body :where(.border-rcl-orange, .border-rcl-gold) {
        border-color: rgba(145,206,242,.34) !important;
      }

      body [class*="text-orange-"],
      body [class*="text-[#ff4f16"],
      body [class*="text-[#FF4F16"],
      body [class*="text-[#ff6b1a"],
      body [class*="text-[#f97316"],
      body [class*="text-[#f5921e"] {
        color: #91cef2 !important;
      }

      body [class*="bg-orange-"],
      body [class*="bg-[#ff4f16"],
      body [class*="bg-[#FF4F16"],
      body [class*="bg-[#ff6b1a"],
      body [class*="bg-[#f97316"],
      body [class*="bg-[#f5921e"] {
        background: linear-gradient(145deg, #c7e8fb, #8fcbed) !important;
        color: #071018 !important;
      }

      body [class*="border-orange-"],
      body [class*="border-[#ff4f16"],
      body [class*="border-[#FF4F16"],
      body [class*="border-[#ff6b1a"],
      body [class*="border-[#f97316"],
      body [class*="border-[#f5921e"] {
        border-color: rgba(145,206,242,.34) !important;
      }

      /* Legacy visual-system accents that used hard-coded orange values. */
      .rcl-hero,
      .city-hero,
      .rcl-draft-hero {
        background:
          radial-gradient(circle at 76% 28%, rgba(145,206,242,.075), transparent 24rem),
          linear-gradient(145deg, #0b1722 0%, #070d14 58%, #05090d 100%) !important;
      }

      .city-court {
        background: linear-gradient(145deg, rgba(145,206,242,.30), rgba(24,56,76,.72)) !important;
      }

      .rcl-draft-platform {
        background: radial-gradient(circle at 50% 0%, rgba(145,206,242,.04), transparent 34rem), #05090d !important;
      }

      :where(.rcl-draft-live-card,.rcl-module-icon,.rcl-on-clock,.rcl-draft-countdown) {
        border-color: rgba(145,206,242,.22) !important;
      }

      :where(.rcl-module-icon,.rcl-on-clock,.rcl-draft-countdown) {
        background: rgba(145,206,242,.055) !important;
      }

      :where(.rcl-draft-live-card b,.rcl-module-icon,.rcl-draft-countdown > span,.rcl-rank,.rcl-on-clock span,.rcl-player-photo) {
        color: #91cef2 !important;
      }

      :where(.rcl-draft-primary,.rcl-filter-row button.active) {
        background: linear-gradient(145deg, #c7e8fb, #8fcbed) !important;
        color: #071018 !important;
        box-shadow: none !important;
      }

      :where(.rcl-draft-module:hover,.rcl-draft-secondary:hover) {
        border-color: rgba(145,206,242,.34) !important;
      }

      /* Warm color remains reserved for true VIP status only. */
      .rcl-vip-chip {
        border-color: rgba(245,221,160,.48) !important;
        background: linear-gradient(135deg, rgba(83,61,15,.96), rgba(176,132,37,.92) 46%, rgba(92,68,18,.96)) !important;
        color: #fff1c4 !important;
      }

      .rcl-vip-chip :where(svg,i) {
        color: #f5dda0 !important;
      }
    `}</style>
  );
}
