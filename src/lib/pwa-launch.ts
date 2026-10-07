/** Runs before hydration so every page load starts with the Rich City Hoops intro. */
export const PWA_LAUNCH_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  if (/^\\/auth(?:\\/|$)/.test(location.pathname)) return;
  root.dataset.rchLaunch = 'active';
  window.setTimeout(() => { root.dataset.rchLaunch = 'done'; }, 6000);
})();`;

export function isLaunchContentReady(root: ParentNode): boolean {
  const content = root.querySelector('#rcl-content');
  return Boolean(content?.querySelector('main') && !content.querySelector('[aria-busy="true"], [data-rch-launch-pending="true"]'));
}
