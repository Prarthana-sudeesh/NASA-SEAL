/** ?debug=1 shows the demo/debug panel (also in production builds, but only with the flag). */
export function isDebug(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}
