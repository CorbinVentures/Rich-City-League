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
        --rcl-vip-gold: #d8b65c;
        --rcl-vip-gold-light: #f6dda0;
        --rcl-vip-gold-deep: #6f5314;
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

      /* Warm color is reserved for true VIP status only. */
      .rcl-vip-chip,
      .rcl-social-identity:not(.is-system) .rcl-social-identity-copy b > i,
      [title="RCL VIP verified member"] {
        display: inline-flex !important;
        align-items: center !important;
        gap: .34rem !important;
        flex: 0 0 auto !important;
        margin-left: .45rem !important;
        padding: .28rem .58rem !important;
        border: 1px solid rgba(216,182,92,.58) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(115deg, rgba(61,45,10,.98), rgba(134,98,20,.96) 44%, rgba(76,56,13,.98)) !important;
        color: #f6dda0 !important;
        box-shadow:
          inset 0 1px 0 rgba(255,245,210,.18),
          0 0 0 1px rgba(216,182,92,.08),
          0 4px 16px rgba(0,0,0,.22) !important;
        font-style: normal !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        letter-spacing: .13em !important;
        text-transform: uppercase !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
      }

      .rcl-social-identity:not(.is-system) .rcl-social-identity-copy b > i::before {
        content: '◆';
        color: #f6dda0;
        font-size: 8px;
        line-height: 1;
      }

      [title="RCL VIP verified member"] > span:first-child {
        width: 1rem !important;
        height: 1rem !important;
        display: grid !important;
        place-items: center !important;
        flex: 0 0 auto !important;
        border: 1px solid rgba(246,221,160,.55) !important;
        border-radius: 999px !important;
        background: linear-gradient(145deg, #f6dda0, #c89b34) !important;
        color: #241a05 !important;
        font-size: 9px !important;
        font-weight: 950 !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.35) !important;
      }

      .rcl-rep-avatar.is-vip {
        box-shadow:
          0 0 0 1px rgba(216,182,92,.62),
          0 0 0 4px rgba(216,182,92,.08),
          0 10px 28px rgba(0,0,0,.24) !important;
      }

      .rcl-social-profile.is-vip .rcl-profile-rep-ring > div {
        border-color: rgba(216,182,92,.76) !important;
        box-shadow: 0 0 0 3px rgba(216,182,92,.10) !important;
      }

      .rcl-social-profile.is-vip .rcl-profile-rep-ring > em {
        border-color: #05080d !important;
        background: linear-gradient(145deg, #f6dda0, #c89b34) !important;
        color: #241a05 !important;
      }

      @media (max-width: 640px) {
        .rcl-social-identity:not(.is-system) .rcl-social-identity-copy b > i,
        [title="RCL VIP verified member"] {
          margin-left: .32rem !important;
          padding: .24rem .48rem !important;
          font-size: 9px !important;
          letter-spacing: .11em !important;
        }
      }
    `}</style>
  );
}
