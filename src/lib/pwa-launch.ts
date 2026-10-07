/** Runs before hydration so the installed app does not flash its page chrome. */
export const PWA_LAUNCH_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!standalone || /^\\/auth(?:\\/|$)/.test(location.pathname)) return;
  try {
    if (sessionStorage.getItem('rch-launch-v1')) return;
    sessionStorage.setItem('rch-launch-v1', '1');
  } catch { /* Restricted storage must not prevent launch. */ }
  root.dataset.rchLaunch = 'active';
  window.setTimeout(() => { root.dataset.rchLaunch = 'done'; }, 6000);
})();`;

export function isLaunchContentReady(root: ParentNode): boolean {
  const content = root.querySelector('#rcl-content');
  return Boolean(content?.querySelector('main') && !content.querySelector('[aria-busy="true"], [data-rch-launch-pending="true"]'));
}
