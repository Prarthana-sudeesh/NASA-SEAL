import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CutscenePlan, Segment } from '../engine/cutscenes.ts';
import { duckMusic, haptic, play as playSfx } from '../audio/audio.ts';
import { useSettings } from '../store/settings.ts';
import { CAPTIONS, HAPTICS, clipSrc, loadManifest, posterSrc, type Cue, type Manifest } from './manifest.ts';
import { TvStatic } from './TvStatic.tsx';

export interface CutscenePlayerProps {
  plan: CutscenePlan;
  calm: boolean;
  onCue?: (cue: Cue, segIndex: number) => void;
  onSegment?: (segIndex: number, seg: Segment) => void;
  /** Playback reached the end (after any end effect has started). */
  onEnd: () => void;
  onSkip: () => void;
}

const SWAP_POLL_MS = 40;

/**
 * Plays a sequence of clips seamlessly with two stacked <video> elements (double buffer): while one
 * plays, the next is loaded and paused on its first frame; it is only brought to the front once it is
 * actually playing, so the previous clip's last frame stays visible and there is never a black flash.
 */
export function CutscenePlayer({ plan, calm, onCue, onSegment, onEnd, onSkip }: CutscenePlayerProps) {
  const vids = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [front, setFront] = useState(0);
  const [segIndex, setSegIndex] = useState(0);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [caption, setCaption] = useState('');
  const [stamp, setStamp] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [mirrored, setMirrored] = useState<[boolean, boolean]>([false, false]);
  const segRef = useRef(0);
  const firedCues = useRef(new Set<string>());
  const endedRef = useRef(false);
  const mutedFallback = useRef(false);
  const muted = useSettings((s) => s.muted);
  const master = useSettings((s) => s.master);
  const sfxVol = useSettings((s) => s.sfx);

  const segs = plan.segments;

  // Duck the ambient music while the cutscene plays.
  useEffect(() => {
    duckMusic(true);
    return () => duckMusic(false);
  }, []);

  useEffect(() => {
    loadManifest().then(setManifest, (e: Error) => setError(e.message));
  }, []);

  // Keep the video volume in line with the SFX bus.
  useEffect(() => {
    for (const v of vids) {
      if (!v.current) continue;
      v.current.volume = Math.max(0, Math.min(1, master * sfxVol));
      v.current.muted = muted || mutedFallback.current;
    }
  });

  const prepare = useCallback(
    (slot: number, seg: Segment | undefined) => {
      const el = vids[slot].current;
      if (!el || !seg || !manifest) return;
      const src = clipSrc(manifest, seg.clip, calm);
      if (!el.src.endsWith(src.replace(/^\.\//, ''))) {
        el.src = src;
        el.poster = posterSrc(manifest, seg.clip, calm);
        el.load();
      } else {
        el.currentTime = 0;
      }
      el.pause();
      setMirrored((m) => {
        const n: [boolean, boolean] = [...m];
        n[slot] = !!seg.mirror;
        return n;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifest, calm],
  );

  const tryPlay = useCallback(async (el: HTMLVideoElement) => {
    el.muted = useSettings.getState().muted || mutedFallback.current;
    try {
      await el.play();
    } catch {
      // Autoplay with sound rejected: retry muted and offer "Tap for sound".
      mutedFallback.current = true;
      el.muted = true;
      setNeedsTap(true);
      try {
        await el.play();
      } catch {
        /* still blocked; the poster frame stays visible */
      }
    }
  }, []);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setCaption('');
    onEnd();
  }, [onEnd]);

  /** Bring segment i to the front: play it, swap when it is really playing, preload i+1 behind. */
  const startSegment = useCallback(
    (i: number) => {
      const slot = i % 2;
      const el = vids[slot].current;
      if (!el) return;
      segRef.current = i;
      setSegIndex(i);
      onSegment?.(i, segs[i]);
      let swapped = false;
      const swap = () => {
        if (swapped) return;
        swapped = true;
        setFront(slot);
        // Load the following segment into the other buffer.
        prepare(1 - slot, segs[i + 1]);
      };
      el.addEventListener('playing', () => (el.readyState >= 2 ? swap() : undefined), { once: true });
      // Fallback in case 'playing' is missed: swap as soon as a frame is decoded.
      const started = performance.now();
      const poll = () => {
        if (swapped) return;
        if (el.readyState >= 2 || performance.now() - started > 2000) swap();
        else setTimeout(poll, SWAP_POLL_MS);
      };
      setTimeout(poll, SWAP_POLL_MS);
      void tryPlay(el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segs, prepare, tryPlay, onSegment],
  );

  // Kick off once the manifest is in.
  useEffect(() => {
    if (!manifest) return;
    endedRef.current = false;
    firedCues.current.clear();
    prepare(0, segs[0]);
    prepare(1, segs[1]);
    const t = setTimeout(() => startSegment(0), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, plan]);

  // Handle 'ended' on the front video.
  const onEnded = useCallback(
    (slot: number) => {
      const i = segRef.current;
      if (slot !== i % 2 || endedRef.current) return;
      const next = i + 1;
      if (next >= segs.length) return finish();
      // Success: stamp "Mission accomplished" between arrival and the return journey.
      if (plan.midStamp && segs[i].clip === 'planet') {
        setStamp(plan.midStamp);
        playSfx('part_snap');
        setTimeout(() => {
          setStamp(null);
          startSegment(next);
        }, 1900);
        return;
      }
      startSegment(next);
    },
    [segs, plan.midStamp, startSegment, finish],
  );

  // Frame loop: cues, captions, stopAt.
  useEffect(() => {
    if (!manifest) return;
    let raf = 0;
    const tick = () => {
      const i = segRef.current;
      const seg = segs[i];
      const el = vids[i % 2].current;
      if (el && seg && !endedRef.current) {
        const t = el.currentTime;
        for (const cue of manifest[seg.clip].cues) {
          const key = `${i}:${cue.type}:${cue.t}`;
          if (t >= cue.t && !firedCues.current.has(key)) {
            firedCues.current.add(key);
            if (!calm || cue.type !== 'rumble') haptic(HAPTICS[cue.type]);
            onCue?.(cue, i);
          }
        }
        const caps = CAPTIONS[seg.clip].filter((c) => t >= c.t);
        setCaption(caps.length ? caps[caps.length - 1].text : '');
        if (seg.stopAt !== undefined && t >= seg.stopAt) {
          el.pause();
          finish();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, segs, calm, onCue, finish]);

  // Skip: Esc or Space.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const unmute = () => {
    mutedFallback.current = false;
    setNeedsTap(false);
    for (const v of vids) if (v.current) v.current.muted = useSettings.getState().muted;
  };

  const seg = segs[segIndex];
  const effectClass = ended ? (plan.endEffect === 'sputter' ? 'fx-sputter' : plan.endEffect === 'freeze-zoom' ? 'fx-freeze-zoom' : '') : '';

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-testid="cutscene" data-segment={segIndex} data-ended={ended}>
      <div className={`absolute inset-0 ${effectClass}`}>
        {[0, 1].map((slot) => (
          <video
            key={slot}
            ref={vids[slot]}
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              zIndex: front === slot ? 2 : 1,
              transform: mirrored[slot] ? 'scaleX(-1)' : undefined,
            }}
            playsInline
            preload="auto"
            aria-hidden="true"
            onEnded={() => onEnded(slot)}
            onError={() => setError('A cutscene clip failed to load.')}
          />
        ))}
      </div>

      {ended && plan.endEffect === 'static' && <TvStatic calm={calm} />}

      {seg?.label && !ended && (
        <div className="absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-full border-[3px] border-ink bg-cyan px-5 py-1 font-display text-lg font-bold text-ink shadow-[3px_3px_0_#000]">
          {seg.label}
        </div>
      )}

      {stamp && (
        <div className="absolute inset-0 z-20 grid place-items-center">
          <div className="sticker -rotate-3 bg-plume px-8 py-5 text-center font-display text-3xl font-bold text-ink md:text-5xl">
            {stamp}
          </div>
        </div>
      )}

      {/* Caption track */}
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
        {!ended && (
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
