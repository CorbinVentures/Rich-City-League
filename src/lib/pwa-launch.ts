/** Small, branded screen for document loads; route changes only display it when slow. */
export const RCH_LAUNCH_ROUTE_DELAY_MS = 325;
export const RCH_LAUNCH_FALLBACK_MS = 4000;
export const RCH_LAUNCH_MIN_DISPLAY_MS = 250;

/** A document-load intro begins before React hydrates. Do not block account recovery. */
export const PWA_LAUNCH_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  if (/^\\/auth(?:\\/|$)/.test(location.pathname)) return;
  root.dataset.rchLaunch = 'active';
  window.setTimeout(() => { root.dataset.rchLaunch = 'done'; }, ${RCH_LAUNCH_FALLBACK_MS});
})();`;

export function isLaunchContentReady(root: ParentNode): boolean {
  const content = root.querySelector('#rcl-content');
  return Boolean(content?.querySelector('main') && !content.querySelector('[aria-busy="true"], [data-rch-launch-pending="true"]'));
}
