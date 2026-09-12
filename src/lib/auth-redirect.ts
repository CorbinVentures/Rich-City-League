const INTERNAL_URL_BASE = 'https://rcl.invalid';

export function getSafeNextPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(value) || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }

  try {
    const destination = new URL(value, INTERNAL_URL_BASE);
    if (destination.origin !== INTERNAL_URL_BASE || !destination.pathname.startsWith('/')) {
      return '/dashboard';
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/dashboard';
  }
}
