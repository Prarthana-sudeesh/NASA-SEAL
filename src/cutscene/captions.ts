import type { ClipId } from '../engine/cutscenes.ts';

export type CueType = 'ignition' | 'rumble' | 'warning' | 'spark' | 'explosion' | 'arrival_chime';

export interface Cue {
  t: number;
  type: CueType;
  strength: number;
  until?: number;
}

/** Captions for every clip (shown as an overlay track). Times in seconds from the clip's start. */
export const CAPTIONS: Record<ClipId, { t: number; text: string }[]> = {
  launch: [
    { t: 0, text: '[countdown hiss]' },
    { t: 0.08, text: '[engines ignite]' },
    { t: 0.7, text: '[engines roar]' },
  ],
  cruising: [
    { t: 0, text: '[rumbling climb]' },
    { t: 1.4, text: '[engines hum through space]' },
  ],
  explosion: [
    { t: 0, text: '[rumbling climb]' },
    { t: 1.4, text: '[engines hum]' },
    { t: 3.45, text: '[alarm beeping]' },
    { t: 4.333, text: '[spark]' },
    { t: 4.417, text: '[explosion]' },
  ],
  planet: [
    { t: 0, text: '[gliding towards the planet]' },
    { t: 0.55, text: '[arrival chime]' },
  ],
};

/** Vibration patterns per cue type (ms on/off). */
export const HAPTICS: Record<CueType, number[]> = {
  ignition: [70],
  rumble: [30, 40, 30, 40, 30, 40, 30, 40, 30, 40],
  warning: [80, 90, 80, 90, 80],
  spark: [35],
  explosion: [220, 60, 320],
  arrival_chime: [20],
};
