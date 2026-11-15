// One module owns all sound: lazy unlock on the first gesture, separate music and SFX buses,
// volumes stored with the settings (localStorage), global mute (key M).
import { Howl, Howler } from 'howler';
import { useSettings } from '../store/settings.ts';

export type Sfx =
  | 'ui_click'
  | 'ui_hover'
  | 'part_pickup'
  | 'part_snap'
  | 'part_remove'
  | 'error'
  | 'countdown_beep'
  | 'countdown_go'
  | 'score_tick'
  | 'success_fanfare'
  | 'fail_womp'
  | 'leaderboard_chime';

const BASE_GAIN: Record<Sfx, number> = {
  ui_click: 0.7,
  ui_hover: 0.18,
  part_pickup: 0.8,
  part_snap: 0.9,
  part_remove: 0.8,
  error: 0.7,
  countdown_beep: 0.8,
  countdown_go: 0.9,
  score_tick: 0.45,
  success_fanfare: 0.9,
  fail_womp: 0.85,
  leaderboard_chime: 0.85,
};

const url = (p: string) => `${import.meta.env.BASE_URL}${p}`;

let sfx: Partial<Record<Sfx, Howl>> = {};
let music: Howl | null = null;
let unlocked = false;
let wantMusic = false;
let duck = 1;
let lastTick = 0;

function bus() {
  const s = useSettings.getState();
  return { music: s.music, sfx: s.sfx, master: s.muted ? 0 : s.master };
}

function ensureLoaded() {
  if (music) return;
  music = new Howl({ src: [url('sfx/ambient_loop.wav')], loop: true, html5: false, volume: 0, preload: true });
  for (const k of Object.keys(BASE_GAIN) as Sfx[]) {
    sfx[k] = new Howl({ src: [url(`sfx/${k}.wav`)], html5: false, preload: true, volume: BASE_GAIN[k] });
  }
}

function applyVolumes(fadeMs = 0) {
  const b = bus();
  Howler.volume(b.master);
  if (music) {
    const target = b.music * duck;
    if (fadeMs > 0 && music.playing()) music.fade(music.volume(), target, fadeMs);
    else music.volume(target);
  }
}

/** Call from any user gesture. Safe to call repeatedly. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  ensureLoaded();
  if (!unlocked) {
    unlocked = true;
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }
  applyVolumes();
  if (wantMusic && music && !music.playing()) music.play();
}

export function startMusic() {
  wantMusic = true;
  if (unlocked && music && !music.playing()) {
    music.play();
    applyVolumes();
  }
}

export function stopMusic() {
  wantMusic = false;
  music?.stop();
}

/** Duck the music during cutscenes (~15%), restore afterwards. */
export function duckMusic(on: boolean) {
  duck = on ? 0.15 : 1;
  applyVolumes(400);
}

export function play(name: Sfx) {
  if (!unlocked) return;
  if (name === 'ui_hover' && !window.matchMedia?.('(hover: hover)').matches) return;
  if (name === 'score_tick') {
    const now = performance.now();
    if (now - lastTick < 50) return; // ≤ 20 per second
    lastTick = now;
  }
  const h = sfx[name];
  if (!h) return;
  h.volume(BASE_GAIN[name] * bus().sfx);
  h.play();
}

export function toggleMute() {
  const s = useSettings.getState();
  s.set({ muted: !s.muted });
}

/** Vibration on supporting devices (Android). iOS Safari has no navigator.vibrate: fail silently. */
export function haptic(pattern: number | number[]) {
  const s = useSettings.getState();
  if (!s.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function sfxVolume() {
  const b = bus();
  return b.master * b.sfx;
}

// Keep Howler in sync with the settings store.
useSettings.subscribe(() => applyVolumes(150));

export function installAudioUnlock() {
  const once = () => unlockAudio();
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('keydown', once);
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) toggleMute();
  });
}

/** For tests. */
export function _reset() {
  sfx = {};
  music = null;
  unlocked = false;
}
