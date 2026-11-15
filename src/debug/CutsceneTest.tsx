import { useCallback, useMemo, useState } from 'react';
import { useGame } from '../store/game.ts';
import { useCalm } from '../store/settings.ts';
import { CutscenePlayer } from '../cutscene/CutscenePlayer.tsx';
import { planCutscene, OUTCOME_SAMPLE_CAUSE, type Outcome, type Segment } from '../engine/cutscenes.ts';
import { StatusTracker } from '../screens/Launch.tsx';
import { Splashdown } from '../screens/Splashdown.tsx';
import { play } from '../audio/audio.ts';
import type { Cue } from '../cutscene/manifest.ts';

/** Debug: play one outcome's sequence on its own, to check every sequence end to end. */
export default function CutsceneTest() {
  const go = useGame((s) => s.go);
  const calm = useCalm();
  const outcome = (sessionStorage.getItem('starbound.testOutcome') ?? 'success') as Outcome;
  const plan = useMemo(() => planCutscene(OUTCOME_SAMPLE_CAUSE[outcome], 'Testy'), [outcome]);
  const [ended, setEnded] = useState(false);
  const [phase, setPhase] = useState(0);
  const [cues, setCues] = useState<string[]>([]);
  const [segs, setSegs] = useState<string[]>([]);
  const onSegment = useCallback((_i: number, s: Segment) => {
    setSegs((x) => [...x, `${s.clip}${s.mirror ? '(mirror)' : ''}${s.stopAt ? `@${s.stopAt}` : ''}`]);
    setPhase(s.clip === 'planet' ? 2 : s.clip === 'cruising' ? (s.mirror ? 4 : 1) : 0);
  }, []);
  const onCue = useCallback((c: Cue) => setCues((x) => [...x, c.type]), []);
  const onEnd = useCallback(() => {
    setEnded(true);
    play(plan.sound);
  }, [plan]);
  return (
    <div className="absolute inset-0 bg-black" data-testid="cutscene-test" data-outcome={outcome} data-ended={ended} data-segments={segs.join(',')}>
      <CutscenePlayer plan={plan} calm={calm} onCue={onCue} onSegment={onSegment} onEnd={onEnd} onSkip={() => go('title')} />
      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
        <StatusTracker phase={ended && outcome === 'success' ? 6 : phase} failedAt={ended && outcome !== 'success' ? phase : null} flash={false} glow={false} />
      </div>
      <div className="absolute bottom-3 left-3 z-50 rounded bg-black/70 p-2 font-mono text-xs text-cream">
        <div>outcome: {outcome}</div>
        <div>segments: {segs.join(' → ')}</div>
        <div>cues: {cues.join(', ')}</div>
        {ended && <div>ended · overlay: {plan.overlay}</div>}
        <button className="pointer-events-auto mt-1 underline" onClick={() => go('title')}>
          back
        </button>
      </div>
      {ended && outcome === 'success' && <Splashdown nickname="Testy" onContinue={() => go('title')} />}
      {ended && outcome !== 'success' && (
        <div className="absolute inset-0 z-40 grid place-items-center">
          <p className="sticker bg-danger px-8 py-4 font-display text-5xl font-bold text-ink" data-testid="overlay">
            {plan.overlay}
          </p>
        </div>
      )}
    </div>
  );
}
