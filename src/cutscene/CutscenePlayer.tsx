import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CutscenePlan, Outcome } from '../engine/cutscenes.ts';
import { duckMusic, haptic, play as playSfx } from '../audio/audio.ts';
import { useSettings } from '../store/settings.ts';
import { HAPTICS, type Cue } from './captions.ts';
import { SEQUENCES, phaseOf, sequencePoster, sequenceSrc, videoHost } from './sequences.ts';
import { TvStatic } from './TvStatic.tsx';

export interface CutscenePlayerProps {
  plan: CutscenePlan;
  calm: boolean;
  /** false = load and wait (during the countdown); true = play. */
  playing: boolean;
  onCue?: (cue: Cue) => void;
  onPhase?: (phase: number) => void;
  onEnd: () => void;
  onSkip: () => void;
}

/**
 * Plays one pre-rendered sequence file (scripts/build-cutscenes.ts). All clips, the mirrored return
 * journey and the success hold are already joined inside the file, so playback is a single video:
 * no swapping between clips, no black frames, unbroken sound.
 */
export function CutscenePlayer({ plan, calm, playing, onCue, onPhase, onEnd, onSkip }: CutscenePlayerProps) {
  const outcome: Outcome = plan.outcome;
  const seq = SEQUENCES[outcome];
  const box = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState('');
  const [label, setLabel] = useState<string | undefined>();
  const [stamp, setStamp] = useState(false);
  const [ended, setEnded] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = useSettings((s) => s.muted);
  const volume = useSettings((s) => Math.max(0, Math.min(1, s.master * s.sfx)));
  const cb = useRef({ onCue, onPhase, onEnd });
  cb.current = { onCue, onPhase, onEnd };

  // Attach the shared video element and load this sequence.
  useLayoutEffect(() => {
    const v = videoHost();
    v.className = 'absolute inset-0 h-full w-full object-contain';
    v.style.transform = '';
    const src = sequenceSrc(outcome, calm);
    if (!v.src.endsWith(src.replace(/^\.\//, ''))) {
      v.src = src;
      v.poster = sequencePoster(outcome, calm);
      v.load();
    }
    v.currentTime = 0;
    box.current?.appendChild(v);
    const onErr = () => setError('The cutscene video could not be loaded.');
    v.addEventListener('error', onErr);
    return () => {
      v.removeEventListener('error', onErr);
      v.pause();
      v.remove();
    };
  }, [outcome, calm]);

  useEffect(() => {
    const v = videoHost();
    v.volume = volume;
    v.muted = muted || needsTap;
  }, [muted, volume, needsTap]);

  useEffect(() => {
    duckMusic(true);
    return () => duckMusic(false);
  }, []);

  // Play + event loop. Only touches React state when something visible changes.
  useEffect(() => {
    if (!playing) return;
    const v = videoHost();
    let cueIdx = 0;
    let capText = '';
    let entryIdx = -1;
    let done = false;
    let raf = 0;
    const finish = () => {
      if (done) return;
      done = true;
      setEnded(true);
      setCaption('');
      setLabel(undefined);
      setStamp(false);
      cb.current.onEnd();
    };
    const step = () => {
      const t = v.currentTime;
      while (cueIdx < seq.cues.length && t >= seq.cues[cueIdx].t) {
        const c = seq.cues[cueIdx++];
        if (!calm || c.type !== 'rumble') haptic(HAPTICS[c.type]);
        cb.current.onCue?.(c);
      }
      let cap = '';
      for (const c of seq.captions) if (t >= c.t) cap = c.text;
      if (cap !== capText) {
        capText = cap;
        setCaption(cap);
      }
      const i = seq.timeline.findIndex((e) => t >= e.start && t < e.end);
      if (i !== -1 && i !== entryIdx) {
        entryIdx = i;
        const e = seq.timeline[i];
        setLabel(e.label);
        setStamp(!!e.hold && !!plan.midStamp);
        if (e.hold && plan.midStamp) playSfx('part_snap');
        cb.current.onPhase?.(phaseOf(e));
      }
    };
    const loop = () => {
      step();
      if (!done) raf = requestAnimationFrame(loop);
    };
    const onEnded = () => {
      step();
      finish();
    };
    v.addEventListener('ended', onEnded);
    v.currentTime = 0;
    v.muted = useSettings.getState().muted;
    v.play().catch(() => {
      // Sound blocked by the browser: play muted and offer "Tap for sound".
      setNeedsTap(true);
      v.muted = true;
      v.play().catch(() => setError('Your browser blocked the video. Tap Skip to see the report.'));
    });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener('ended', onEnded);
    };
  }, [playing, seq, calm, plan.midStamp]);

  // Skip: Esc or Space (layout effect so a fast key press is never lost).
  useLayoutEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, onSkip]);

  const unmute = () => {
    setNeedsTap(false);
    const v = videoHost();
    v.muted = useSettings.getState().muted;
    void v.play().catch(() => {});
  };

  const effectClass = ended ? (plan.endEffect === 'sputter' ? 'fx-sputter' : plan.endEffect === 'freeze-zoom' ? 'fx-freeze-zoom' : '') : '';

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-testid="cutscene" data-ended={ended} data-outcome={outcome}>
      <div ref={box} className={`absolute inset-0 ${effectClass}`} />

      {ended && plan.endEffect === 'static' && <TvStatic calm={calm} />}

      {label && !ended && (
        <div className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full border-[3px] border-ink bg-cyan px-5 py-1 font-display text-lg font-bold text-ink shadow-[3px_3px_0_#000]">
          {label}
        </div>
      )}

      {stamp && plan.midStamp && (
        <div className="absolute inset-0 z-20 grid place-items-center p-4">
          <div className="stamp-in sticker -rotate-3 bg-plume px-8 py-5 text-center font-display text-3xl font-bold text-ink md:text-5xl">{plan.midStamp}</div>
        </div>
      )}

      {caption && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/75 px-4 py-1.5 font-mono text-base text-cream md:text-lg" aria-hidden="true">
          {caption}
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {caption}
      </div>

      <div className="absolute bottom-5 right-5 z-30 flex gap-3">
        {needsTap && (
          <button className="btn bg-plume px-4 py-2 text-ink" onClick={unmute}>
            🔊 Tap for sound
          </button>
        )}
        {playing && !ended && (
          <button className="btn bg-cream px-5 py-2 text-ink" onClick={onSkip} aria-keyshortcuts="Escape Space">
            Skip ⏭
          </button>
        )}
      </div>

      {error && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-space/90 p-6 text-center">
          <div>
            <p className="mb-4 text-lg">{error}</p>
            <button className="btn bg-orange px-5 py-2 text-cream" onClick={onSkip}>
              See the mission report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
