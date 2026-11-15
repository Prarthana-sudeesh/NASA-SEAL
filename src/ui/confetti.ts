import { isCalm } from '../store/settings.ts';

/** Lazy-loaded confetti. Calm mode: a small, slow burst. */
export async function celebrate(kind: 'success' | 'leaderboard' = 'success') {
  const { default: confetti } = await import('canvas-confetti');
  const calm = isCalm();
  const colors = ['#E8642C', '#FFC94A', '#E040A0', '#5CE1FF', '#FFF6E5', '#5BD982'];
  if (calm) {
    confetti({ particleCount: 40, spread: 60, startVelocity: 25, gravity: 1.2, ticks: 120, colors, disableForReducedMotion: false });
    return;
  }
  const burst = (x: number) => confetti({ particleCount: kind === 'leaderboard' ? 90 : 130, spread: 75, startVelocity: 48, origin: { x, y: 0.7 }, colors, scalar: 1.1 });
  burst(0.25);
  setTimeout(() => burst(0.75), 180);
  setTimeout(() => burst(0.5), 380);
}
