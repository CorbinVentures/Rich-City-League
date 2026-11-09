/** Installed PWA cold launch shows the championship belt reveal; route navigation stays fast. */
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
  // Runs has its own lightweight game entrance; do not stack the general
  // championship-belt reveal over the game title screen or an active Run room.
  if (/^\\/runs(?:\\/|$)/.test(location.pathname)) {
    root.dataset.rchLaunch = 'done';
    root.dataset.rchLaunchBoot = 'done';
    return;
  }
  root.dataset.rchLaunch = 'active';
  root.dataset.rchLaunchBoot = 'pending';
  window.setTimeout(() => {
    // Fail safe if React never mounts, the image fails, or the page stalls.
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

/** Only start the reveal after the page is ready and its minimum hold is complete. */
export function canDismissLaunch(
  contentReady: boolean,
  isBoot: boolean,
  bootHoldFinished: boolean,
  routeCanDismiss: boolean,
): boolean {
  return contentReady && (isBoot ? bootHoldFinished : routeCanDismiss);
}
