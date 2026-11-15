import data from '../data/sequences.json' with { type: 'json' };
import type { ClipId, Outcome } from '../engine/cutscenes.ts';
import type { Cue } from './captions.ts';

export interface TimelineEntry {
  clip: ClipId;
  start: number;
  end: number;
  mirror?: boolean;
  label?: string;
  hold?: boolean;
}

export interface Sequence {
  file: string;
  calmFile: string;
  poster: string;
  calmPoster: string;
  duration: number;
  timeline: TimelineEntry[];
  cues: Cue[];
  captions: { t: number; text: string }[];
}

export const SEQUENCES = data.sequences as unknown as Record<Outcome, Sequence>;

const BASE = import.meta.env.BASE_URL;
export const asset = (p: string) => `${BASE}${p.replace(/^\//, '')}`;

export const sequenceSrc = (o: Outcome, calm: boolean) => asset(calm ? SEQUENCES[o].calmFile : SEQUENCES[o].file);
export const sequencePoster = (o: Outcome, calm: boolean) => asset(calm ? SEQUENCES[o].calmPoster : SEQUENCES[o].poster);

/** Status-tracker phase for a timeline entry. */
export function phaseOf(e: TimelineEntry): number {
  if (e.hold) return 3;
  if (e.clip === 'launch' || e.clip === 'explosion') return 0;
  if (e.clip === 'planet') return 2;
  return e.mirror ? 4 : 1;
}

// ── One shared <video> element ─────────────────────────────────────
// Safari only allows a video to play with sound if play() was first called during a tap.
// The LAUNCH tap "primes" this element; the launch screen then plays it 10 s later with sound.
let host: HTMLVideoElement | null = null;

export function videoHost(): HTMLVideoElement {
  if (!host) {
    host = document.createElement('video');
    host.playsInline = true;
    host.setAttribute('playsinline', '');
    host.setAttribute('webkit-playsinline', '');
    host.preload = 'auto';
    host.disableRemotePlayback = true;
    host.setAttribute('aria-hidden', 'true');
  }
  return host;
}

/** Call inside the LAUNCH click handler: loads the sequence and unlocks sound playback. */
export function primeSequence(o: Outcome, calm: boolean) {
  const v = videoHost();
  const src = sequenceSrc(o, calm);
  if (!v.src.endsWith(src.replace(/^\.\//, ''))) {
    v.src = src;
    v.poster = sequencePoster(o, calm);
  }
  v.muted = false;
  v.currentTime = 0;
  const p = v.play();
  if (p) p.then(() => { v.pause(); v.currentTime = 0; }, () => { /* will retry muted later */ });
}

/** Warm the cache (pre-launch screen): fetch the likely sequence file. */
export function prefetchSequence(o: Outcome, calm: boolean) {
  void fetch(sequenceSrc(o, calm)).catch(() => {});
}
