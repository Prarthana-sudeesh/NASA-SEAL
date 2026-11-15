// "Fix my rocket": a working rocket with one wrong part. Find the part before time runs out.
import type { Planet } from '../data/types.ts';
import { getPart, partsOf, type AntennaPart, type HullPart, type SlotKind } from './config.ts';
import {
  checks,
  requiredSeal,
  type Build,
  type Check,
  type CheckId,
  type Dials,
} from './engine.ts';

export interface Puzzle {
  planetId: string;
  build: Build;
  dials: Dials;
  faulty: SlotKind;
  /** The part that would make the rocket work again. */
  fix: string;
  failed: Check[];
}

/** Which part is to blame for each failed check (only checks with a single clear culprit). */
const CULPRIT: Partial<Record<CheckId, SlotKind>> = {
  comms: 'antenna',
  heat: 'hull',
  'pressure-high': 'hull',
  'twr-earth': 'engine',
  'twr-planet': 'engine',
};
const BREAKABLE: SlotKind[] = ['antenna', 'hull', 'engine'];

export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Comfortable dial settings that pass every check, or null (coarse search, with a safety margin). */
function workingDials(build: Build, planet: Planet): Dials | null {
  const pressure = requiredSeal(planet);
  const ok = (d: Dials) => checks(build, d, planet).every((c) => c.ok);
  for (let thrust = 0; thrust <= 100; thrust += 2) {
    for (let fuel = 0; fuel <= 100; fuel += 2) {
      const d = { fuel, thrust, pressure };
      if (!ok(d)) continue;
      const roomy = { fuel: Math.min(100, fuel + 6), thrust: Math.min(100, thrust + 4), pressure };
      return ok(roomy) ? roomy : d;
    }
  }
  return null;
}

function combos(): Build[] {
  const out: Build[] = [];
  for (const payload of partsOf('payload'))
    for (const antenna of partsOf('antenna'))
      for (const body of partsOf('body'))
        for (const hull of partsOf('hull'))
          for (const engine of partsOf('engine'))
            out.push({
              payload: payload.id,
              antenna: antenna.id,
              body: body.id,
              hull: hull.id,
              engine: engine.id,
              crew: 'seats' in payload && payload.seats > 0 ? 1 : 0,
            });
  return out;
}
const ALL = combos();

/** Build a puzzle for a planet, or null if none can be made. */
export function makePuzzle(planet: Planet, rand: () => number): Puzzle | null {
  // Skip designs that can never work here (wrong antenna range, hull too weak or too cool).
  const T = planet.eqTempK.value;
  const seal = requiredSeal(planet);
  const possible = ALL.filter((b) => {
    const antenna = getPart(b.antenna) as AntennaPart;
    const hull = getPart(b.hull) as HullPart;
    return planet.distanceLy.value < antenna.rangeLy && T <= hull.maxK && seal <= hull.strengthAtm;
  });
  for (const build of shuffle(possible, rand)) {
    const dials = workingDials(build, planet);
    if (!dials) continue;
    for (const slot of shuffle(BREAKABLE, rand)) {
      for (const alt of shuffle(partsOf(slot), rand)) {
        if (alt.id === build[slot]) continue;
        const broken = { ...build, [slot]: alt.id };
        const failed = checks(broken, dials, planet).filter((c) => !c.ok);
        if (failed.length && failed.every((c) => CULPRIT[c.id] === slot)) {
          return {
            planetId: planet.id,
            build: broken,
            dials,
            faulty: slot,
            fix: build[slot]!,
            failed,
          };
        }
      }
    }
  }
  return null;
}

export const PUZZLE_ROUNDS = 5;
export const PUZZLE_SECONDS = { easy: 30, medium: 25, hard: 20 } as const;

/** Points for a round: 100 for the right part plus 5 per second left. */
export const puzzlePoints = (correct: boolean, secondsLeft: number) =>
  correct ? 100 + Math.max(0, Math.round(secondsLeft)) * 5 : 0;
