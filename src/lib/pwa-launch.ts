/** Installed PWA launch shows the entire 4-second film; route navigation stays fast. */
export const RCH_LAUNCH_ROUTE_DELAY_MS = 325;
export const RCH_LAUNCH_FALLBACK_MS = 4000;
export const RCH_LAUNCH_BOOT_FALLBACK_MS = 12000;
export const RCH_LAUNCH_MIN_DISPLAY_MS = 250;

/** A document-load intro begins before React hydrates. Do not block account recovery. */
export const PWA_LAUNCH_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  if (/^\\/auth(?:\\/|$)/.test(location.pathname)) return;
  const nav = navigator;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  const mobile = /iPhone|iPad|iPod|Android|Mobile/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  if (!standalone || !mobile) return;
  root.dataset.rchLaunch = 'active';
  root.dataset.rchLaunchBoot = 'pending';
  window.setTimeout(() => {
    // Fail safe only if React never mounts or the video stalls.
    if (root.dataset.rchLaunchBoot === 'pending') {
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
    }
  }, ${RCH_LAUNCH_BOOT_FALLBACK_MS});
})();`;

export function isLaunchContentReady(root: ParentNode): boolean {
  const content = root.querySelector('#rcl-content');
  return Boolean(content?.querySelector('main') && !content.querySelector('[aria-busy="true"], [data-rch-launch-pending="true"]'));
}
