import { COMMS, DRIVES, PRESSURE, SHIELDS, type Part } from '../data/components.ts';
import type { Difficulty, Planet } from '../data/types.ts';
import { A } from './constants.ts';
import { DIFFICULTIES } from './difficulty.ts';
import type { FailureCause, Requirements } from './mission.ts';
import { resolveParts, type Design, type RocketStats } from './rocket.ts';

export const MAX_BASE = 1000;
export const MAX_PER_LAUNCH = 1400; // 1000 × (1 + 0.1 × 4 crew)

/** Partial mission credit by how far the flight got. */
export const CAUSE_CREDIT: Record<FailureCause, number> = {
  no_thrust: 0,
  too_heavy: 0,
  pressure: 0,
  orbit_fuel: 50,
  drive_short: 50,
  comms: 50,
  radiation: 150,
  heat_planet: 150,
  planet_dv: 150,
  drive_return: 250,
  return_dv: 250,
  reentry: 350,
};
export const SUCCESS_CREDIT = 400;

export interface ScoreLine {
  id: 'mission' | 'performance' | 'budget' | 'suitability' | 'resources';
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface ScoreBreakdown {
  lines: ScoreLine[];
  base: number;
  multiplier: number;
  total: number;
}

/** Astronaut multiplier: success × (1 + 0.1 × crew); failure × (1 − 0.15 × crew), never below 0. */
export function crewMultiplier(success: boolean, crew: number): number {
  return success ? 1 + 0.1 * crew : Math.max(0, 1 - 0.15 * crew);
}

/** 1 inside [lo, hi], falling linearly to 0 at zeroLo / zeroHi. */
export function plateau(x: number, zeroLo: number, lo: number, hi: number, zeroHi: number): number {
  if (x <= zeroLo || x >= zeroHi) return 0;
  if (x < lo) return (x - zeroLo) / (lo - zeroLo);
  if (x > hi) return (zeroHi - x) / (zeroHi - hi);
  return 1;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Suitability of one part: 25 if it meets the need and is the cheapest catalogue option that does,
 * 12 if it meets the need but a cheaper part would also have worked, 0 if it doesn't meet the need.
 */
function suit<T extends Part>(chosen: T | undefined, options: T[], meets: (p: T | undefined) => boolean): number {
  if (!meets(chosen)) return 0;
  const cheapest = Math.min(...[undefined, ...options].filter((o) => meets(o)).map((o) => o?.cost ?? 0));
  return (chosen?.cost ?? 0) <= cheapest ? 25 : 12;
}

export interface ScoreInput {
  design: Design;
  planet: Planet;
  difficulty: Difficulty;
  crew: number;
  stats: RocketStats;
  req: Requirements;
  success: boolean;
  cause: FailureCause | null;
}

export function scoreMission(i: ScoreInput): ScoreBreakdown {
  const { stats: s, req } = i;
  const p = resolveParts(i.design);
  const budget = DIFFICULTIES[i.difficulty].budget;

  // Mission (400)
  const mission = i.success ? SUCCESS_CREDIT : CAUSE_CREDIT[i.cause!];

  // Performance margin (200): Δv close to what's needed (full marks for 0–25% spare), TWR 1.3–2.0.
  // The tighter of the two legs decides the ratio.
  const dvRatio = Math.min(s.dvKms / req.earthLegKms, req.deepNeededKms > 0 ? s.dvVacKms / req.deepNeededKms : Infinity);
  const dvPts = 100 * plateau(dvRatio, 0.7, 1.0, 1.25, 2.0);
  const twrPts = 100 * plateau(s.twr, 1.0, 1.3, 2.0, 4.0);
  const performance = dvPts + twrPts;

  // Budget efficiency (200): 200 if you spend ≤ 50% of budget, falling to 60 at 100%; 0 if over.
  const used = s.cost / budget;
  const budgetPts = used > 1 ? 0 : used <= 0.5 ? 200 : 200 - 140 * ((used - 0.5) / 0.5);

  // Component suitability (100): drive, comms, shield, pressure each 25.
  const dist = i.planet.distanceLy.value;
  const crewed = i.crew > 0;
  const liquid = !!p.engine && p.engine.propellant !== 'solid';
  const suitability =
    suit(p.drive, DRIVES, (d) => (d?.rangeLy ?? 0) >= req.driveRangeLy) +
    suit(p.comms, COMMS, (c) => (c?.rangeLy ?? 0) >= dist) +
    suit(p.shield, SHIELDS, (sh) => !!sh && sh.reentryRated && sh.maxTempK >= req.shieldTempK && (!crewed || sh.radiation >= A.crewRadiationMin)) +
    suit(p.pressure, PRESSURE, (pr) =>
      liquid ? !!pr && pr.suits.includes(p.engine!.propellant) && pr.capacityKg >= s.propellantKg : !pr,
    );

  // Resource balance (100): no empty seats (50) + little propellant wasted (50).
  const seats = p.pod?.seats ?? 0;
  const seatPts = seats === 0 ? (i.crew === 0 ? 50 : 0) : 50 * Math.min(1, i.crew / seats);
  const spare = s.dvKms > 0 ? 1 - 1 / Math.max(dvRatio, 1e-9) : -1;
  const fuelPts = spare < 0 ? 0 : 50 * plateau(spare, -1, 0, 0.15, 0.5);
  const resources = seatPts + fuelPts;

  const lines: ScoreLine[] = [
    {
      id: 'mission', label: 'Mission progress', points: mission, max: SUCCESS_CREDIT,
      detail: i.success ? 'Out and home again!' : 'Partial credit for how far the flight got.',
    },
    {
      id: 'performance', label: 'Performance margin', points: round1(performance), max: 200,
      detail: `Rocket power ${(dvRatio * 100).toFixed(0)}% of need (best 100–125%), lift-off power ${s.twr.toFixed(2)} (best 1.3–2.0).`,
    },
    {
      id: 'budget', label: 'Budget efficiency', points: round1(budgetPts), max: 200,
      detail: used > 1 ? `Over budget: $${s.cost}M of $${budget}M.` : `Spent $${s.cost}M of $${budget}M.`,
    },
    {
      id: 'suitability', label: 'Right part for the job', points: suitability, max: 100,
      detail: 'Drive, comms, shield and pressure system: full marks for the cheapest part that does the job.',
    },
    {
      id: 'resources', label: 'Resource balance', points: round1(resources), max: 100,
      detail: 'Seats filled, and little propellant left unused.',
    },
  ];
  const base = round1(lines.reduce((t, l) => t + l.points, 0));
  const multiplier = crewMultiplier(i.success, i.crew);
  const total = round1(Math.min(MAX_PER_LAUNCH, Math.max(0, base * multiplier)));
  return { lines, base, multiplier, total };
}

/** Run score: average of the launches so far, one decimal place. */
export function runAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  return round1(scores.reduce((a, b) => a + b, 0) / scores.length);
}
