// Reserved spots for the team's own animations. Each slot renders nothing until an animation is
// registered in ./registry.ts, so adding one later needs no changes to the screens.
import type { ComponentType } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { ANIMATIONS } from './registry.ts';

export type AnimationSlotId = 'mission-intro' | 'lift-off' | 'emergency' | 'landing' | 'homecoming';

/** Props every slot animation receives. */
export interface SlotAnimationProps {
  /** True when the player asked for less motion: show a still frame or a simple fade instead. */
  reduced: boolean;
}

export type SlotAnimation = ComponentType<SlotAnimationProps>;

/** Where each slot appears, for reference. */
export const SLOT_INFO: Record<AnimationSlotId, string> = {
  'mission-intro': 'Mission Control, over the planet hologram',
  'lift-off': 'Launch screen, while the rocket leaves Earth',
  emergency: 'Launch screen, behind the emergency panel',
  landing: 'Launch screen, at touchdown on the planet',
  homecoming: 'Launch screen, after a safe splashdown',
};

export function AnimationSlot({ id, className = '' }: { id: AnimationSlotId; className?: string }) {
  const reduced = useReducedMotion();
  const Anim = ANIMATIONS[id];
  if (!Anim) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      data-animation-slot={id}
      aria-hidden="true"
    >
      <Anim reduced={reduced} />
    </div>
  );
}
