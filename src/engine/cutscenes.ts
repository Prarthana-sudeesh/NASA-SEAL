import type { FailureCause } from './mission.ts';

export type ClipId = 'launch' | 'cruising' | 'explosion' | 'planet';

export interface Segment {
  clip: ClipId;
  /** Pause at this time (s) and hold the frame. */
  stopAt?: number;
  mirror?: boolean;
  label?: string;
}

export type EndEffect = 'freeze-zoom' | 'sputter' | 'static' | 'none';

export interface CutscenePlan {
  outcome: Outcome;
  segments: Segment[];
  /** Overlay effect applied after the last segment. */
  endEffect: EndEffect;
  overlay: string;
  /** Shown between the planet arrival and the return journey on success. */
  midStamp?: string;
  sound: 'fail_womp' | 'success_fanfare';
}

export type Outcome = 'no_thrust' | 'explosion' | 'out_of_fuel' | 'signal_lost' | 'planet_fail' | 'return_fail' | 'success';

export const OUTCOMES: Outcome[] = ['no_thrust', 'explosion', 'out_of_fuel', 'signal_lost', 'planet_fail', 'return_fail', 'success'];

export function outcomeFor(cause: FailureCause | null): Outcome {
  switch (cause) {
    case null:
      return 'success';
    case 'no_thrust':
      return 'no_thrust';
    case 'too_heavy':
    case 'pressure':
      return 'explosion';
    case 'orbit_fuel':
    case 'drive_short':
      return 'out_of_fuel';
    case 'comms':
      return 'signal_lost';
    case 'radiation':
    case 'heat_planet':
    case 'planet_dv':
      return 'planet_fail';
    case 'drive_return':
    case 'return_dv':
    case 'reentry':
      return 'return_fail';
  }
}

const CAUSE_TEXT: Record<FailureCause, string> = {
  no_thrust: 'We didn’t leave the pad!',
  too_heavy: 'Rapid unscheduled disassembly',
  pressure: 'Rapid unscheduled disassembly',
  orbit_fuel: 'Out of fuel',
  drive_short: 'Out of fuel',
  comms: 'Signal lost',
  radiation: 'Radiation dose too high: mission aborted',
  heat_planet: 'Too hot! The shield couldn’t take the heat',
  planet_dv: 'Not enough rocket power at the planet',
  drive_return: 'The drive ran out of range on the way home',
  return_dv: 'Out of fuel on the way home',
  reentry: 'Re-entry heat was too much for the capsule',
};

/** Outcome → cutscene sequence (brief section 6.2). */
export function planCutscene(cause: FailureCause | null, nickname: string): CutscenePlan {
  const outcome = outcomeFor(cause);
  const RETURN: Segment = { clip: 'cruising', mirror: true, label: 'Return journey' };
  switch (outcome) {
    case 'no_thrust':
      return { outcome, segments: [{ clip: 'launch', stopAt: 1.2 }], endEffect: 'freeze-zoom', overlay: CAUSE_TEXT.no_thrust, sound: 'fail_womp' };
    case 'explosion':
      return { outcome, segments: [{ clip: 'launch' }, { clip: 'explosion' }], endEffect: 'none', overlay: CAUSE_TEXT[cause!], sound: 'fail_womp' };
    case 'out_of_fuel':
      return { outcome, segments: [{ clip: 'launch' }, { clip: 'cruising', stopAt: 3.5 }], endEffect: 'sputter', overlay: CAUSE_TEXT[cause!], sound: 'fail_womp' };
    case 'signal_lost':
      return { outcome, segments: [{ clip: 'launch' }, { clip: 'cruising' }], endEffect: 'static', overlay: CAUSE_TEXT.comms, sound: 'fail_womp' };
    case 'planet_fail':
      return { outcome, segments: [{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }], endEffect: 'none', overlay: CAUSE_TEXT[cause!], sound: 'fail_womp' };
    case 'return_fail':
      return { outcome, segments: [{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }, RETURN], endEffect: 'none', overlay: CAUSE_TEXT[cause!], sound: 'fail_womp' };
    case 'success':
      return {
        outcome,
        segments: [{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }, RETURN],
        endEffect: 'none',
        overlay: 'Splashdown! Welcome home!',
        midStamp: `Mission accomplished at ${nickname}!`,
        sound: 'success_fanfare',
      };
  }
}

/** A representative cause per outcome, for the debug panel's "force outcome". */
export const OUTCOME_SAMPLE_CAUSE: Record<Outcome, FailureCause | null> = {
  no_thrust: 'no_thrust',
  explosion: 'too_heavy',
  out_of_fuel: 'orbit_fuel',
  signal_lost: 'comms',
  planet_fail: 'heat_planet',
  return_fail: 'return_dv',
  success: null,
};
