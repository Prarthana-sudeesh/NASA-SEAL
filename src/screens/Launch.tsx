import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useGame } from '../store/game.ts';
import { useCalm } from '../store/settings.ts';
import { getPlanet } from '../data/planets.ts';
import { evaluateMission, PHASES } from '../engine/mission.ts';
import { planCutscene, OUTCOME_SAMPLE_CAUSE, type Segment } from '../engine/cutscenes.ts';
import { CutscenePlayer } from '../cutscene/CutscenePlayer.tsx';
import type { Cue } from '../cutscene/manifest.ts';
import { play, haptic } from '../audio/audio.ts';
import { Button } from '../ui/Button.tsx';
import { Gauge } from '../ui/Gauge.tsx';
import { Redirect, announce } from '../ui/bits.tsx';
import { celebrate } from '../ui/confetti.ts';
import { Splashdown } from './Splashdown.tsx';

export function StatusTracker({ phase, failedAt, flash, glow }: { phase: number; failedAt: number | null; flash: boolean; glow: boolean }) {
  return (
    <ol
      className={`sticker-sm flex flex-wrap items-center justify-center gap-1 bg-panel/90 px-2 py-1.5 text-xs font-bold backdrop-blur transition md:gap-2 md:text-sm ${flash ? 'bg-danger/90' : ''} ${glow ? 'shadow-[0_0_30px_8px_rgba(92,225,255,0.55)]' : ''}`}
      aria-label="Mission status"
      data-testid="tracker"
    >
      {PHASES.map((name, i) => {
        const failed = failedAt === i;
        const done = failedAt === null ? i < phase : i < failedAt;
        const current = failedAt === null && i === phase;
        return (
          <li key={name} className="flex items-center gap-1 md:gap-2">
            <span
              className={`rounded-full border-2 border-ink px-2 py-0.5 ${failed ? 'bg-danger text-ink' : done ? 'bg-go text-ink' : current ? 'bg-plume text-ink' : 'bg-space text-muted'}`}
              aria-current={current ? 'step' : undefined}
            >
              {failed ? '✗ ' : done ? '✓ ' : ''}
              {name}
            </span>
            {i < PHASES.length - 1 && <span className="text-muted" aria-hidden="true">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function phaseForSegment(seg: Segment): number {
  if (seg.clip === 'launch' || seg.clip === 'explosion') return 0;
  if (seg.clip === 'planet') return 2;
  return seg.mirror ? 4 : 1;
}

export function Launch() {
  const { attempts, difficulty, go, forcedOutcome, setForcedOutcome } = useGame();
  const calm = useCalm();
  const last = attempts[attempts.length - 1];
  const planet = last ? getPlanet(last.planetId) : undefined;
  const result = useMemo(() => (last && planet ? evaluateMission(last.design, planet, difficulty ?? 'easy', last.crew) : null), [last, planet, difficulty]);
  const [forced] = useState(forcedOutcome);
  useEffect(() => {
    if (forcedOutcome) setForcedOutcome(null);
  }, [forcedOutcome, setForcedOutcome]);

  const cause = forced ? OUTCOME_SAMPLE_CAUSE[forced] : (result?.failure?.cause ?? null);
  const plan = useMemo(() => (planet ? planCutscene(cause, planet.nickname) : null), [cause, planet]);

  const [stage, setStage] = useState<'countdown' | 'playing' | 'ended'>('countdown');
  const [count, setCount] = useState(10);
  const [phase, setPhase] = useState(0);
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [glow, setGlow] = useState(false);
  const [spike, setSpike] = useState(false);

  // Countdown: beep each second, GO at zero.
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (count === 0) {
      play('countdown_go');
      haptic(60);
      const t = setTimeout(() => setStage('playing'), 500);
      return () => clearTimeout(t);
    }
    play('countdown_beep');
    announce(String(count));
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, count]);

  // Esc / Space skips the countdown (the cutscene player handles them after that).
  useLayoutEffect(() => {
    if (stage !== 'countdown') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        setCount(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]);

  const onSegment = useCallback((_i: number, seg: Segment) => setPhase(phaseForSegment(seg)), []);
  const onCue = useCallback((cue: Cue) => {
    if (cue.type === 'warning') {
      setSpike(true);
      setTimeout(() => setSpike(false), 900);
    }
    if (cue.type === 'explosion') {
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    if (cue.type === 'arrival_chime') {
      setGlow(true);
      setTimeout(() => setGlow(false), 1000);
    }
  }, []);
  const onEnd = useCallback(() => {
    setStage('ended');
    if (!plan) return;
    play(plan.sound);
    if (plan.outcome === 'success') {
      setPhase(PHASES.length);
      void celebrate('success');
    } else {
      const fp = forced ? phaseFromOutcome(plan.outcome) : (result?.failedPhase ?? 0);
      setFailedAt(fp);
    }
    announce(plan.overlay);
  }, [plan, result, forced]);

  if (!last || !planet || !plan || !result) return <Redirect to="title" />;

  return (
    <div className="absolute inset-0 bg-black" data-testid="launch-screen" data-outcome={plan.outcome}>
      {stage !== 'countdown' && (
        <CutscenePlayer plan={plan} calm={calm} onCue={onCue} onSegment={onSegment} onEnd={onEnd} onSkip={() => go('report')} />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
        <StatusTracker phase={phase} failedAt={failedAt} flash={flash} glow={glow} />
      </div>
      {stage === 'playing' && (
        <div className="pointer-events-none absolute right-4 top-20 z-30 hidden rounded-2xl bg-panel/80 p-2 md:block">
          <Gauge value={spike ? 1.25 : 0.55} label="tank pressure" spike={spike} danger={spike} size={120} />
        </div>
      )}

      <AnimatePresence>
        {stage === 'countdown' && (
          <motion.div className="absolute inset-0 z-20 grid place-items-center bg-space" exit={{ opacity: 0 }}>
            <div className="text-center">
              <p className="mb-2 font-display text-2xl text-cyan">
                {planet.nickname} · launch {last.n}/10
              </p>
              <motion.p
                key={count}
                initial={calm ? false : { scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-[clamp(7rem,28vw,18rem)] font-bold leading-none text-plume"
                style={{ WebkitTextStroke: '4px #05070F', textShadow: '8px 8px 0 #E8642C' }}
                aria-hidden="true"
                data-testid="countdown"
              >
                {count === 0 ? 'GO!' : count}
              </motion.p>
              <div className="pointer-events-auto mt-6">
                <Button variant="ghost" onClick={() => setCount(0)}>
                  Skip countdown
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {stage === 'ended' && plan.outcome === 'success' && <Splashdown nickname={planet.nickname} onContinue={() => go('report')} />}
      {stage === 'ended' && plan.outcome !== 'success' && (
        <motion.div className="absolute inset-0 z-40 grid place-items-center bg-black/45 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <motion.p
              initial={calm ? false : { scale: 2.2, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="sticker inline-block bg-danger px-8 py-4 font-display text-[clamp(2rem,6vw,4.5rem)] font-bold text-ink"
              role="status"
              data-testid="overlay"
            >
              {plan.overlay}
            </motion.p>
            {forced && <p className="mt-3 text-sm text-plume">Debug: forced cutscene. The report shows the real result.</p>}
            <div className="mt-8">
              <Button size="lg" onClick={() => go('report')} data-testid="to-report">
                See why it happened →
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function phaseFromOutcome(o: string) {
  return { no_thrust: 0, explosion: 0, out_of_fuel: 0, signal_lost: 1, planet_fail: 2, return_fail: 4 }[o] ?? 0;
}
