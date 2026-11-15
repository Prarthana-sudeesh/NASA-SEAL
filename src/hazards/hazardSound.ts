// Synthesised sound for the space hazards: a looping background sound per hazard, an alarm sting when
// one appears, and small effects for the mini-games. Runs on Howler's audio context, so it obeys the
// game's master volume and mute. Adapted from the Secondary-prototype branch (src/game/sound.ts).
import { Howler } from 'howler';
import { useSettings } from '../store/settings.ts';
import type { HazardId } from './hazards.ts';

function ctx(): { a: AudioContext; out: GainNode } | null {
  const a = Howler.ctx;
  const master = (Howler as unknown as { masterGain?: GainNode }).masterGain;
  if (!a || !master) return null;
  if (a.state === 'suspended') void a.resume();
  const out = a.createGain();
  out.gain.value = Math.max(0, Math.min(1, useSettings.getState().sfx));
  out.connect(master);
  return { a, out };
}

let brownBuf: AudioBuffer | null = null;
function brown(a: AudioContext): AudioBuffer {
  if (brownBuf && brownBuf.sampleRate === a.sampleRate) return brownBuf;
  const len = a.sampleRate * 2;
  brownBuf = a.createBuffer(1, len, a.sampleRate);
  const d = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return brownBuf;
}
let whiteBuf: AudioBuffer | null = null;
function white(a: AudioContext): AudioBuffer {
  if (whiteBuf && whiteBuf.sampleRate === a.sampleRate) return whiteBuf;
  const len = a.sampleRate * 2;
  whiteBuf = a.createBuffer(1, len, a.sampleRate);
  const d = whiteBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return whiteBuf;
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  to?: number;
  at?: number;
  dur?: number;
  vol?: number;
  attack?: number;
}

function tone(a: AudioContext, bus: AudioNode, o: ToneOpts) {
  const t0 = a.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  vol?: number;
  type?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  brownian?: boolean;
}

function burst(a: AudioContext, bus: AudioNode, o: NoiseOpts) {
  const t0 = a.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.3;
  const src = a.createBufferSource();
  src.buffer = o.brownian ? brown(a) : white(a);
  const f = a.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.setValueAtTime(o.freq ?? 1000, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  f.Q.value = o.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** One-shot effect, cleaned up after it finishes. */
function oneShot(fn: (a: AudioContext, bus: AudioNode) => void, ms = 2500) {
  const c = ctx();
  if (!c) return;
  fn(c.a, c.out);
  window.setTimeout(() => c.out.disconnect(), ms);
}

/** Starts the hazard's own looping sound; returns a stop function. */
export function hazardLoop(kind: HazardId): () => void {
  const c = ctx();
  if (!c) return () => {};
  const { a, out } = c;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(1, a.currentTime + 0.6);
  g.connect(out);
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  const every = (ms: () => number, fn: () => void) => {
    const run = () => {
      fn();
      timers.push(window.setTimeout(run, ms()));
    };
    timers.push(window.setTimeout(run, ms()));
  };
  const osc = (type: OscillatorType, freq: number, vol: number) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const og = a.createGain();
    og.gain.value = vol;
    o.connect(og).connect(g);
    o.start();
    nodes.push(o);
    return o;
  };
  const lfo = (target: AudioParam, rate: number, depth: number) => {
    const l = a.createOscillator();
    l.frequency.value = rate;
    const lg = a.createGain();
    lg.gain.value = depth;
    l.connect(lg).connect(target);
    l.start();
    nodes.push(l);
  };

  switch (kind) {
    case 'blackhole': {
      // Deep rumble and a slow, sinking whoosh, like being pulled in.
      const src = a.createBufferSource();
      src.buffer = brown(a);
      src.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 160;
      const ng = a.createGain();
      ng.gain.value = 0.35;
      src.connect(f).connect(ng).connect(g);
      src.start();
      nodes.push(src);
      const sub = osc('sine', 36, 0.3);
      lfo(sub.frequency, 0.25, 6);
      every(() => 2600, () => tone(a, g, { type: 'sine', freq: 95, to: 30, dur: 1.6, vol: 0.25, attack: 0.2 }));
      break;
    }
    case 'asteroids':
      // Rocks thudding and cracking past the hull.
      every(
        () => 350 + Math.random() * 700,
        () => {
          burst(a, g, { type: 'lowpass', freq: 180 + Math.random() * 200, dur: 0.3, vol: 0.35, brownian: true });
          if (Math.random() < 0.4) burst(a, g, { type: 'highpass', freq: 2400, dur: 0.05, vol: 0.1 });
        },
      );
      break;
    case 'gravity': {
      // A wobbling drone that swells, like the ship straining against the pull.
      const o = osc('triangle', 70, 0.12);
      lfo(o.frequency, 0.4, 25);
      every(() => 2200, () => burst(a, g, { type: 'bandpass', freq: 200, to: 1800, dur: 1.6, vol: 0.08, q: 3 }));
      break;
    }
    case 'aliens': {
      // Wobbly sci-fi warble, plus laser zaps.
      const o = osc('sine', 660, 0.08);
      lfo(o.frequency, 6, 14);
      const notes = [523, 659, 784, 698, 880, 587];
      every(() => 450, () => o.frequency.setTargetAtTime(notes[Math.floor(Math.random() * notes.length)], a.currentTime, 0.12));
      every(() => 700 + Math.random() * 600, () => tone(a, g, { type: 'sawtooth', freq: 1800, to: 220, dur: 0.22, vol: 0.06 }));
      break;
    }
    case 'debris':
      // Metal pinging and scraping.
      every(
        () => 300 + Math.random() * 500,
        () =>
          Math.random() < 0.5
            ? burst(a, g, { type: 'bandpass', freq: 500, to: 3500, dur: 0.3, vol: 0.15, q: 4 })
            : tone(a, g, { type: 'square', freq: 1700 + Math.random() * 600, dur: 0.05, vol: 0.035 }),
      );
      break;
    case 'quasar': {
      // A high, shimmering hum that pulses with the beam.
      const o1 = osc('sine', 880, 0.05);
      const o2 = osc('sine', 1320, 0.035);
      lfo(o1.frequency, 0.6, 40);
      lfo(o2.frequency, 0.9, 60);
      every(() => 1600, () => burst(a, g, { type: 'bandpass', freq: 3000, to: 600, dur: 1.2, vol: 0.09, q: 6 }));
      break;
    }
    case 'flare': {
      // Crackling radiation hiss over a slow siren.
      every(() => 80 + Math.random() * 140, () => burst(a, g, { type: 'highpass', freq: 3000 + Math.random() * 3000, dur: 0.03, vol: 0.06 }));
      let hi = false;
      every(
        () => 700,
        () => {
          hi = !hi;
          tone(a, g, { type: 'triangle', freq: hi ? 740 : 560, dur: 0.6, vol: 0.05, attack: 0.1 });
        },
      );
      break;
    }
  }

  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    const t = a.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    window.setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }
      g.disconnect();
      out.disconnect();
    }, 700);
  };
}

/** Warning sting when a hazard appears. */
export function hazardAlarm() {
  oneShot((a, bus) => {
    for (let i = 0; i < 3; i++) {
      tone(a, bus, { type: 'square', freq: 880, at: i * 0.32, dur: 0.16, vol: 0.07 });
      tone(a, bus, { type: 'square', freq: 660, at: i * 0.32 + 0.16, dur: 0.16, vol: 0.07 });
    }
  });
}

export type GameSfx = 'hit' | 'tap' | 'good' | 'miss' | 'win' | 'lose' | 'tick' | 'splash';

/** Small effects for the quizzes and mini-games. */
export function gameSfx(name: GameSfx) {
  oneShot((a, bus) => {
    switch (name) {
      case 'hit':
        burst(a, bus, { type: 'lowpass', freq: 600, to: 80, dur: 0.4, vol: 0.5, brownian: true });
        tone(a, bus, { type: 'square', freq: 200, to: 60, dur: 0.25, vol: 0.08 });
        break;
      case 'tap':
        burst(a, bus, { type: 'bandpass', freq: 400, to: 1600, dur: 0.12, vol: 0.18, q: 2 });
        break;
      case 'good':
        tone(a, bus, { type: 'triangle', freq: 880, dur: 0.1, vol: 0.12 });
        tone(a, bus, { type: 'triangle', freq: 1320, at: 0.08, dur: 0.14, vol: 0.12 });
        break;
      case 'miss':
        tone(a, bus, { type: 'square', freq: 180, dur: 0.18, vol: 0.06 });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => tone(a, bus, { type: 'triangle', freq: f, at: i * 0.09, dur: 0.25, vol: 0.14 }));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => tone(a, bus, { type: 'sawtooth', freq: f, at: i * 0.14, dur: 0.3, vol: 0.06 }));
        break;
      case 'splash':
        // Deep plunge, a rush of white water, then droplets pattering back down.
        burst(a, bus, { type: 'lowpass', freq: 900, to: 120, dur: 0.7, vol: 0.6, brownian: true });
        burst(a, bus, { type: 'bandpass', freq: 1800, to: 500, dur: 1.4, vol: 0.25, q: 0.8 });
        tone(a, bus, { type: 'sine', freq: 140, to: 50, dur: 0.5, vol: 0.25 });
        for (let i = 0; i < 14; i++) burst(a, bus, { at: 0.4 + Math.random() * 1.2, type: 'highpass', freq: 2500 + Math.random() * 2500, dur: 0.05, vol: 0.06 });
        break;
      case 'tick':
        tone(a, bus, { type: 'sine', freq: 1500, dur: 0.04, vol: 0.05 });
        break;
    }
  });
}
