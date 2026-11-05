export function tapHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
}
