import type { ClipId } from '../engine/cutscenes.ts';

export interface Cue {
  t: number;
  type: 'ignition' | 'rumble' | 'warning' | 'spark' | 'explosion' | 'arrival_chime';
  strength: number;
  until?: number;
}

export interface ClipMeta {
  file: string;
  calmFile: string;
  poster: string;
  frames: number;
  fps: number;
  duration: number;
  cues: Cue[];
}

export type Manifest = Record<ClipId, ClipMeta>;

const BASE = import.meta.env.BASE_URL;
/** cutscenes.json uses site-absolute paths ("/cutscenes/x.mp4"); make them work under any base path. */
export const asset = (p: string) => `${BASE}${p.replace(/^\//, '')}`;

let manifest: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  manifest ??= fetch(asset('cutscenes/cutscenes.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`cutscenes.json: HTTP ${r.status}`);
      return r.json() as Promise<Manifest>;
    })
    .catch((e) => {
      manifest = null;
      throw e;
    });
  return manifest;
}

export function clipSrc(m: Manifest, clip: ClipId, calm: boolean) {
  return asset(calm ? m[clip].calmFile : m[clip].file);
}

export function posterSrc(m: Manifest, clip: ClipId, calm: boolean) {
  return calm ? asset(`cutscenes/calm/${clip}_poster.jpg`) : asset(m[clip].poster);
}

const preloaded = new Set<string>();
/** Warm the browser cache for all four clips (called when the player enters the workshop). */
export async function preloadClips(calm: boolean) {
  try {
    const m = await loadManifest();
    for (const clip of Object.keys(m) as ClipId[]) {
      const src = clipSrc(m, clip, calm);
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      void fetch(src).catch(() => preloaded.delete(src));
    }
  } catch {
    /* offline or missing: the player falls back to loading on demand */
  }
}

/** Captions for every clip (overlay track). Times in seconds. */
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
export const HAPTICS: Record<Cue['type'], number[]> = {
  ignition: [70],
  rumble: [30, 40, 30, 40, 30, 40, 30, 40, 30, 40],
  warning: [80, 90, 80, 90, 80],
  spark: [35],
  explosion: [220, 60, 320],
  arrival_chime: [20],
};
