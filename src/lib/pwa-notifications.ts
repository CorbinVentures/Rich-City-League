export const RCL_VAPID_PUBLIC_KEY = 'BIq2X4p8Z87hbAU_USzplk1uXeQbRAnfgJvvB5J9fhZzWSGX9bMKi3TECu6ASd8i9K-lZPFW2uNn9PnqP3j_SDg';

export type AppAlertState = 'unsupported' | 'not-installed' | 'default' | 'denied' | 'granted';

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function getAppAlertState(): AppAlertState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isiOS && !isStandalonePWA()) return 'not-installed';
  return Notification.permission;
}

export async function syncAppBadge(count: number) {
  if (typeof window === 'undefined') return;
  const safeCount = Math.max(0, Math.floor(count || 0));
  const badgeNavigator = navigator as BadgeNavigator;

  try {
    if (safeCount > 0 && badgeNavigator.setAppBadge) await badgeNavigator.setAppBadge(safeCount);
    else if (safeCount === 0 && badgeNavigator.clearAppBadge) await badgeNavigator.clearAppBadge();
    else if (safeCount === 0 && badgeNavigator.setAppBadge) await badgeNavigator.setAppBadge(0);
  } catch {
    // Badging is progressive enhancement. The in-app unread count remains authoritative.
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller || registration.active;
      worker?.postMessage({ type: 'RCL_BADGE_COUNT', count: safeCount });
    } catch {
      // The service worker may still be installing on first launch.
    }
  }
}

async function saveSubscription(db: any, subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error('Push subscription keys are unavailable.');

  const { error } = await db.rpc('register_web_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export async function enableAppAlerts(db: any) {
  if (typeof window === 'undefined') throw new Error('App notifications are unavailable.');
  const state = getAppAlertState();
  if (state === 'unsupported') throw new Error('This browser does not support RCL app notifications.');
  if (state === 'not-installed') throw new Error('Add RCL to your Home Screen first, then enable notifications from the app.');

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(RCL_VAPID_PUBLIC_KEY),
    });
  }
  await saveSubscription(db, subscription);
  return subscription;
}

export async function rebindExistingAppAlerts(db: any) {
  if (typeof window === 'undefined' || getAppAlertState() !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    await saveSubscription(db, subscription);
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeLocalAppAlerts() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    // A stale server endpoint is pruned automatically after a failed push.
  }
}
