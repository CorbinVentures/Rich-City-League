'use client';

/**
 * Final semantic brand layer. Renders after RCLVisualSystem so legacy accent
 * utilities resolve to the cool, trustworthy basketball palette.
 */
export function RCLRuntimeFinish(){
  return <style jsx global>{`
    :root {
      --rcl-orange:#2F6FAF!important;
      --rcl-gold:#2F6FAF!important;
      --rcl-blue:#53789A!important;
      --rcl-court-orange:#2F6FAF!important;
      --rcl-basket-orange:#2F6FAF!important;
      --rcl-orange-corporate:#2F6FAF!important;
      --rcl-vip-gold:#C9A45C!important;
      --rcl-vip-gold-light:#E4CA93!important;
      --rcl-vip-gold-deep:#7A5C20!important;
    }

    html body { background:#F3F6F9!important; color:#162331!important; }
    body main::before,body main::after { display:none!important; }

    body [class*="text-orange-"],
    body [class*="text-[#ff4f16"],
    body [class*="text-[#FF4F16"],
    body [class*="text-[#ff6b1a"],
    body [class*="text-[#f97316"],
    body [class*="text-[#f5921e"] { color:#2F6FAF!important; }

    body [class*="bg-orange-"],
    body [class*="bg-[#ff4f16"],
    body [class*="bg-[#FF4F16"],
    body [class*="bg-[#ff6b1a"],
    body [class*="bg-[#f97316"],
    body [class*="bg-[#f5921e"] { background:#2F6FAF!important; color:#fff!important; }

    body [class*="border-orange-"],
    body [class*="border-[#ff4f16"],
    body [class*="border-[#FF4F16"],
    body [class*="border-[#ff6b1a"],
    body [class*="border-[#f97316"],
    body [class*="border-[#f5921e"] { border-color:rgba(47,111,175,.40)!important; }

    .rcl-vip-chip,
    .rcl-social-identity:not(.is-system) .rcl-social-identity-copy b > i,
    [title="RCL VIP verified member"] {
      border-color:rgba(201,164,92,.48)!important;
      background:#FBF6E9!important;
      color:#7A5C20!important;
      box-shadow:none!important;
    }

    .rcl-social-identity:not(.is-system) .rcl-social-identity-copy b > i::before {
      content:'◆';
      color:#C9A45C;
      font-size:8px;
    }

    .rcl-rep-avatar.is-vip {
      box-shadow:0 0 0 2px rgba(201,164,92,.28)!important;
    }
  `}</style>;
}
