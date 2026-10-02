'use client';

/**
 * Final semantic brand layer. Renders after RCLVisualSystem so legacy accent
 * utilities resolve to the new calm basketball palette.
 */
export function RCLRuntimeFinish(){
  return <style jsx global>{`
    :root {
      --rcl-orange:#B85C38!important;
      --rcl-gold:#C9A45C!important;
      --rcl-blue:#64748B!important;
      --rcl-court-orange:#B85C38!important;
      --rcl-basket-orange:#B85C38!important;
      --rcl-orange-corporate:#B85C38!important;
      --rcl-vip-gold:#C9A45C!important;
      --rcl-vip-gold-light:#E4CA93!important;
      --rcl-vip-gold-deep:#7A5C20!important;
    }

    html body { background:#F7F5F1!important; color:#1B1C1E!important; }
    body main::before,body main::after { display:none!important; }

    body [class*="text-orange-"],
    body [class*="text-[#ff4f16"],
    body [class*="text-[#FF4F16"],
    body [class*="text-[#ff6b1a"],
    body [class*="text-[#f97316"],
    body [class*="text-[#f5921e"] { color:#B85C38!important; }

    body [class*="bg-orange-"],
    body [class*="bg-[#ff4f16"],
    body [class*="bg-[#FF4F16"],
    body [class*="bg-[#ff6b1a"],
    body [class*="bg-[#f97316"],
    body [class*="bg-[#f5921e"] { background:#B85C38!important; color:#fff!important; }

    body [class*="border-orange-"],
    body [class*="border-[#ff4f16"],
    body [class*="border-[#FF4F16"],
    body [class*="border-[#ff6b1a"],
    body [class*="border-[#f97316"],
    body [class*="border-[#f5921e"] { border-color:rgba(184,92,56,.40)!important; }

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
