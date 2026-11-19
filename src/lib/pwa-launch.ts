export const RCH_LAUNCH_MURAL = '/brand/richmond-hoops-mural-v1.webp';
export const RCH_LAUNCH_EXCLUDED_PATH = /^\/(?:auth|command|sites|portal\/scorebook|account\/security|profile\/reset-password)(?:\/|$)/;

export const RCH_LAUNCH_ROUTE_DELAY_MS = 325;
export const RCH_LAUNCH_FALLBACK_MS = 4000;
export const RCH_LAUNCH_BOOT_FALLBACK_MS = 12000;
export const RCH_LAUNCH_MIN_DISPLAY_MS = 250;

/** A document-load intro begins before React hydrates. Do not block account recovery. */
export const PWA_LAUNCH_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  const nav = navigator;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  const mobile = /iPhone|iPad|iPod|Android|Mobile/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const app = standalone && mobile;
  if (app) root.dataset.rchLaunchMode = 'app';
  if (${RCH_LAUNCH_EXCLUDED_PATH}.test(location.pathname)) return;
  if (/[?#&](?:code=|token_hash=|access_token=|type=recovery)/.test(location.search + location.hash)) return;
  // Runs owns its game entrance and active rooms.
  if (/^\\/runs(?:\\/|$)/.test(location.pathname)) {
    root.dataset.rchLaunch = 'done';
    root.dataset.rchLaunchBoot = 'done';
    return;
  }
  // Web visitors see the mural once at a platform entrance. Deep links go straight to their page.
  if (!app) {
    if (location.pathname !== '/' && !/^\\/social\\/?$/.test(location.pathname)) return;
    try {
      const key = 'rch.launch.mural.seen';
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch { return; }
  }
  root.dataset.rchLaunch = 'active';
  root.dataset.rchLaunchBoot = 'pending';
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.href = '${RCH_LAUNCH_MURAL}';
  preload.fetchPriority = 'high';
  preload.onload = () => { root.dataset.rchMuralReady = 'true'; };
  document.head.appendChild(preload);
  window.setTimeout(() => {
    // Fail safe if React never mounts, the image fails, or the page stalls.
    if (root.dataset.rchLaunchBoot === 'pending') {
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
    }
  }, ${RCH_LAUNCH_BOOT_FALLBACK_MS});
})();`;

export function isLaunchContentReady(root: ParentNode, installedApp = true): boolean {
  const content = root.querySelector(installedApp ? '#rcl-content' : '#rch-public-content');
  return Boolean(content?.querySelector('main') && !content.querySelector('[aria-busy="true"], [data-rch-launch-pending="true"]'));
}

/** Only start the reveal after the page is ready and its minimum hold is complete. */
export function canDismissLaunch(
  contentReady: boolean,
  isBoot: boolean,
  bootHoldFinished: boolean,
  routeCanDismiss: boolean,
): boolean {
  return contentReady && (isBoot ? bootHoldFinished : routeCanDismiss);
}
