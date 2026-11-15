import { useAnimationControls } from 'framer-motion';
import { useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

/**
 * Camera shake for a game screen. Put `controls` on a full-size motion.div and call
 * `shake(strength, seconds)`. Strength is in pixels. Nothing moves with reduced motion on.
 */
export function useShake() {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const shake = useCallback(
    (strength = 8, seconds = 0.5) => {
      if (reduced) return;
      const steps = Math.max(5, Math.round(seconds * 24));
      const wobble = (k: number) =>
        Array.from({ length: steps }, (_, i) =>
          i === steps - 1 ? 0 : (Math.random() * 2 - 1) * strength * k * (1 - i / steps),
        );
      void controls.start({
        x: wobble(1),
        y: wobble(0.8),
        rotate: wobble(0.06),
        transition: { duration: seconds, ease: 'linear' },
      });
    },
    [controls, reduced],
  );
  return { controls, shake };
}
