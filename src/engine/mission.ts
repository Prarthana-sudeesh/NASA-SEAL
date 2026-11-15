import type { Planet, Difficulty } from '../data/types.ts';
import { A } from './constants.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { resolveParts, rocketStats, type Design, type RocketStats } from './rocket.ts';
import { scoreMission, type ScoreBreakdown } from './score.ts';

export const PHASES = ['Launch', 'Transit', 'Arrival', 'Surface/Orbit', 'Return', 'Home'] as const;
export type PhaseName = (typeof PHASES)[number];

export type FailureCause =
  | 'no_thrust'
  | 'too_heavy'
  | 'pressure'
  | 'orbit_fuel'
  | 'drive_short'
  | 'comms'
  | 'radiation'
  | 'heat_planet'
  | 'planet_dv'
  | 'drive_return'
  | 'return_dv'
  | 'reentry';

/** Phase index at which each cause stops the mission. */
export const CAUSE_PHASE: Record<FailureCause, number> = {
  no_thrust: 0,
  too_heavy: 0,
  pressure: 0,
  orbit_fuel: 0,
  drive_short: 1,
  comms: 1,
  radiation: 2,
  heat_planet: 2,
  planet_dv: 3,
  drive_return: 4,
  return_dv: 4,
  reentry: 5,
};

export interface Check {
  id: string;
  label: string;
  phase: number;
  /** 'auto' = simplified at this difficulty and passed automatically. */
  status: 'pass' | 'fail' | 'auto';
  have: string;
  need: string;
  /** Plain-English sentence: what happened and what to change. */
  advice: string;
  cause?: FailureCause;
  scienceLink?: { label: string; url: string };
}

export interface Requirements {
  /** Earth surface → orbit, with margin. Compared with Δv at climbing Isp. */
  earthLegKms: number;
  /** Δv needed at the planet (landing, or orbit insertion + departure), with margin. Vacuum Isp. */
  planetLegKms: number;
  /** Take-off from the surface after refuelling (land missions only), with margin. */
  ascentLegKms: number;
  /** Everything from the last refuel until home, with margin. Vacuum Isp. */
  returnLegKms: number;
  /** Largest deep-space leg (the one that decides the deep-space rocket power needed). */
  deepNeededKms: number;
  driveRangeLy: number;
  commsRangeLy: number;
  shieldTempK: number;
  breakdown: { label: string; kms: number; leg: 'earth' | 'deep' }[];
}

export function requirements(planet: Planet): Requirements {
  const v = planet.orbitalSpeedKms.value;
  const m = A.marginFactor;
  const earthLegKms = A.earthLaunchKms * m;
  let planetLegKms: number, ascentLegKms: number, returnLegKms: number;
  let parts: { label: string; kms: number; leg: 'deep' }[];
  if (planet.missionType === 'land') {
    const landing = A.landingBurnFraction * v;
    const ascent = A.ascentFactor * v;
    parts = [
      { label: 'Landing burn', kms: landing, leg: 'deep' },
      { label: 'Take-off from the planet (after refuelling)', kms: ascent, leg: 'deep' },
    ];
    planetLegKms = landing * m;
    ascentLegKms = ascent * m;
    returnLegKms = (ascent + A.returnCorrectionKms) * m;
  } else {
    const ins = A.orbitBurnFraction * v;
    parts = [
      { label: 'Orbit insertion', kms: ins, leg: 'deep' },
      { label: 'Orbit departure', kms: ins, leg: 'deep' },
    ];
    planetLegKms = 2 * ins * m;
    ascentLegKms = 0;
    returnLegKms = (2 * ins + A.returnCorrectionKms) * m;
  }
  return {
    earthLegKms,
    planetLegKms,
    ascentLegKms,
    returnLegKms,
    deepNeededKms: Math.max(planetLegKms, ascentLegKms, returnLegKms),
    driveRangeLy: planet.distanceLy.value * A.driveRoundTrip,
    commsRangeLy: planet.distanceLy.value,
    shieldTempK: planet.tempK.value,
    breakdown: [
      { label: 'Earth launch to orbit', kms: A.earthLaunchKms, leg: 'earth' },
      ...parts,
      { label: 'Earth return correction', kms: A.returnCorrectionKms, leg: 'deep' },
    ],
  };
}

export interface Blocker {
  id: string;
  message: string;
}

/** Things that stop the rocket being launched at all (shown on the pre-launch check). */
export function launchBlockers(design: Design, difficulty: Difficulty, crew: number): Blocker[] {
  const p = resolveParts(design);
  const stats = rocketStats(design, crew);
  const out: Blocker[] = [];
  if (!p.pod) out.push({ id: 'pod', message: 'Add a payload pod.' });
  if (!p.engine) out.push({ id: 'engine', message: 'Add a launch engine.' });
  if (!p.drive) out.push({ id: 'drive', message: 'Add a Deep-Space Drive.' });
  if (p.tanks.length === 0) out.push({ id: 'tank', message: 'Add at least one fuel tank.' });
  if (!p.comms) out.push({ id: 'comms', message: 'Add a comms dish.' });
  if (p.engine && p.tanks.length && !stats.propellantMatch)
    out.push({ id: 'propellant', message: 'Every fuel tank must hold the same propellant as the engine.' });
  if (p.pod && crew > p.pod.seats)
    out.push({ id: 'seats', message: `Only ${p.pod.seats} seat${p.pod.seats === 1 ? '' : 's'} in this pod.` });
  if (DIFFICULTIES[difficulty].overBudgetBlocksLaunch && stats.cost > DIFFICULTIES[difficulty].budget)
    out.push({ id: 'budget', message: 'Over budget: Flight Directors must stay within budget.' });
  return out;
}

export interface MissionResult {
  success: boolean;
  /** First failure, or null on success. */
  failure: { cause: FailureCause; phase: number; check: Check } | null;
  /** Phase index where the mission stopped (0 Launch … 5 Home); 6 = completed. */
  failedPhase: number;
  checks: Check[];
  stats: RocketStats;
  req: Requirements;
  score: ScoreBreakdown;
  crew: number;
  planetId: string;
  difficulty: Difficulty;
}

const f1 = (n: number) => n.toFixed(1);
const fint = (n: number) => Math.round(n).toLocaleString('en-US');
const tonnes = (kg: number) => `${fint(kg / 1000)} t`;

export const SCIENCE = {
  rocketEquation: { label: 'NASA Glenn: the ideal rocket equation', url: 'https://www.grc.nasa.gov/www/k-12/rocket/rktpow.html' },
  thrustWeight: { label: 'NASA Glenn: thrust-to-weight ratio', url: 'https://www.grc.nasa.gov/www/k-12/rocket/fwrat.html' },
  isp: { label: 'NASA Glenn: specific impulse', url: 'https://www.grc.nasa.gov/www/k-12/rocket/specimp.html' },
  interstellar: { label: 'NASA: Voyager, our farthest spacecraft', url: 'https://science.nasa.gov/mission/voyager/' },
  dsn: { label: 'NASA Deep Space Network', url: 'https://www.nasa.gov/communicating-with-missions/dsn/' },
  heatShield: { label: 'NASA: heat shields', url: 'https://www.nasa.gov/humans-in-space/orion-spacecraft/' },
  radiation: { label: 'NASA: space radiation', url: 'https://www.nasa.gov/hrp/radiation/' },
};

export function evaluateMission(design: Design, planet: Planet, difficulty: Difficulty, crew: number): MissionResult {
  const cfg = DIFFICULTIES[difficulty];
  const p = resolveParts(design);
  const s = rocketStats(design, crew);
  const req = requirements(planet);
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);
  const auto = (on: boolean, pass: boolean) => (!on ? 'auto' : pass ? 'pass' : 'fail');
  const dist = planet.distanceLy.value;

  // ── Launch ───────────────────────────────────────────────
  const massOk = s.wetMassKg <= A.maxLaunchMassKg;
  add({
    id: 'mass', label: 'Launch mass', phase: 0, status: massOk ? 'pass' : 'fail',
    have: tonnes(s.wetMassKg), need: `at most ${tonnes(A.maxLaunchMassKg)}`, cause: 'too_heavy',
    advice: massOk
      ? `At ${tonnes(s.wetMassKg)} the rocket was within the pad’s ${tonnes(A.maxLaunchMassKg)} limit.`
      : `At ${tonnes(s.wetMassKg)} the rocket was heavier than the pad and structure can take (${tonnes(A.maxLaunchMassKg)}). Use fewer or smaller tanks.`,
  });
  const twrOk = s.twr >= A.minTwr;
  add({
    id: 'twr', label: 'Lift-off power (thrust-to-weight)', phase: 0, status: twrOk ? 'pass' : 'fail',
    have: `TWR ${s.twr.toFixed(2)}`, need: `at least ${A.minTwr.toFixed(2)}`, cause: 'no_thrust',
    advice: twrOk
      ? `Your engine pushed ${s.twr.toFixed(2)}× the rocket’s weight, enough to climb away from the pad.`
      : `Your engine pushed only ${s.twr.toFixed(2)}× the rocket’s weight but needed ${A.minTwr.toFixed(2)}×. Pick a stronger engine or carry fewer or smaller tanks.`,
    scienceLink: SCIENCE.thrustWeight,
  });
  const liquid = p.engine && p.engine.propellant !== 'solid';
  const prsSuits = !liquid
    ? true
    : !!p.pressure && p.pressure.suits.includes(p.engine!.propellant) && p.pressure.capacityKg >= s.propellantKg;
  add({
    id: 'pressure', label: 'Pressure system', phase: 0, status: auto(cfg.checks.pressure, prsSuits),
    have: p.pressure ? `${p.pressure.name}: ${tonnes(p.pressure.capacityKg)}` : 'none',
    need: !liquid ? 'none needed (solid fuel)' : `suits ${p.engine!.propellant}, holds ${tonnes(s.propellantKg)}`,
    cause: 'pressure',
    advice: !cfg.checks.pressure
      ? 'Simplified at this level: pressure systems pass automatically.'
      : prsSuits
        ? 'Tank pressure held steady all the way up.'
        : !p.pressure
          ? 'Liquid-fuel tanks need a pressure system or the fuel stops flowing and the tanks buckle. Add one that suits your propellant.'
          : !p.pressure.suits.includes(p.engine!.propellant)
            ? `The ${p.pressure.name} doesn’t work with ${p.engine!.propellant} tanks. Pick a pressure system that suits them.`
            : `The ${p.pressure.name} holds ${tonnes(p.pressure.capacityKg)} but your tanks hold ${tonnes(s.propellantKg)}. Fit a bigger pressure system or fewer tanks.`,
  });
  const orbitOk = s.dvKms >= req.earthLegKms;
  add({
    id: 'dv_earth', label: 'Rocket power to reach Earth orbit', phase: 0, status: orbitOk ? 'pass' : 'fail',
    have: `${f1(s.dvKms)} km/s`, need: `${f1(req.earthLegKms)} km/s`, cause: 'orbit_fuel',
    advice: orbitOk
      ? `Your rocket had ${f1(s.dvKms)} km/s of power; reaching orbit needed ${f1(req.earthLegKms)} km/s.`
      : `Your rocket had ${f1(s.dvKms)} km/s of power but reaching Earth orbit needed ${f1(req.earthLegKms)} km/s. Add a fuel tank or pick a more efficient engine (higher Isp).`,
    scienceLink: SCIENCE.rocketEquation,
  });

  // ── Transit ──────────────────────────────────────────────
  const driveOut = (p.drive?.rangeLy ?? 0) >= dist;
  add({
    id: 'drive_out', label: 'Deep-Space Drive: getting there', phase: 1, status: driveOut ? 'pass' : 'fail',
    have: `${fint(p.drive?.rangeLy ?? 0)} ly range`, need: `${f1(dist)} ly one way`, cause: 'drive_short',
    advice: driveOut
      ? `The drive covered the ${f1(dist)} light-years to ${planet.nickname}.`
      : `The drive’s range is ${fint(p.drive?.rangeLy ?? 0)} light-years, but ${planet.nickname} is ${f1(dist)} light-years away. Pick a longer-range drive.`,
    scienceLink: SCIENCE.interstellar,
  });
  const commsOk = (p.comms?.rangeLy ?? 0) >= req.commsRangeLy;
  add({
    id: 'comms', label: 'Comms range', phase: 1, status: auto(cfg.checks.comms, commsOk),
    have: `${fint(p.comms?.rangeLy ?? 0)} ly`, need: `${f1(req.commsRangeLy)} ly`, cause: 'comms',
    advice: !cfg.checks.comms
      ? 'Simplified at this level: comms pass automatically.'
      : commsOk
        ? `Mission Control could hear you all the way out (each message still takes ${f1(dist)} years to arrive at light speed!).`
        : `Your dish reaches ${fint(p.comms?.rangeLy ?? 0)} light-years but the planet is ${f1(dist)} away, so Mission Control lost the signal. Fit a longer-range dish.`,
    scienceLink: SCIENCE.dsn,
  });

  // ── Arrival ──────────────────────────────────────────────
  const radNeeded = cfg.checks.radiation && crew > 0;
  const radOk = (p.shield?.radiation ?? 0) >= A.crewRadiationMin;
  add({
    id: 'radiation', label: 'Crew radiation protection', phase: 2, status: !radNeeded ? 'auto' : radOk ? 'pass' : 'fail',
    have: `rating ${p.shield?.radiation ?? 0}`, need: crew > 0 ? `rating ${A.crewRadiationMin}+` : 'not needed (no crew)',
    cause: 'radiation',
    advice: !cfg.checks.radiation
      ? 'Simplified at this level: radiation passes automatically.'
      : crew === 0
        ? 'No crew on board, so radiation protection wasn’t needed.'
        : radOk
          ? 'The crew stayed safe from cosmic rays on the long trip.'
          : `Your shield’s radiation rating is ${p.shield?.radiation ?? 0}, but a crewed trip needs ${A.crewRadiationMin} or more. Fit a better shield or fly without crew.`,
    scienceLink: SCIENCE.radiation,
  });
  const heatChecked = cfg.checks.heat || (planet.lavaSurface && planet.missionType === 'land');
  const heatOk = (p.shield?.maxTempK ?? 0) >= req.shieldTempK;
  add({
    id: 'heat', label: 'Shield vs planet temperature', phase: 2, status: auto(heatChecked, heatOk),
    have: p.shield ? `${fint(p.shield.maxTempK)} K` : 'no shield', need: `${fint(req.shieldTempK)} K`, cause: 'heat_planet',
    advice: !heatChecked
      ? 'Simplified at this level: heat passes automatically.'
      : heatOk
        ? `Your shield handles ${fint(p.shield!.maxTempK)} K; ${planet.nickname} is about ${fint(req.shieldTempK)} K.`
        : `${planet.nickname} is about ${fint(req.shieldTempK)} K but your shield handles only ${fint(p.shield?.maxTempK ?? 0)} K. Fit a shield rated for more heat.`,
    scienceLink: SCIENCE.heatShield,
  });

  // ── Surface / orbit ──────────────────────────────────
  const opName = planet.missionType === 'land' ? 'landing and take-off' : 'orbit survey';
  const planetNeed = Math.max(req.planetLegKms, req.ascentLegKms);
  const planetOk = s.dvVacKms >= planetNeed;
  add({
    id: 'dv_planet', label: `Rocket power for the ${opName}`, phase: 3, status: planetOk ? 'pass' : 'fail',
    have: `${f1(s.dvVacKms)} km/s`, need: `${f1(planetNeed)} km/s`, cause: 'planet_dv',
    advice: planetOk
      ? `The ${opName} needed ${f1(planetNeed)} km/s and your refuelled rocket had ${f1(s.dvVacKms)} km/s.`
      : `Your rocket had ${f1(s.dvVacKms)} km/s of power in space but the ${opName} needed ${f1(planetNeed)} km/s. Add a fuel tank, lighten the payload, or pick a more efficient engine (higher Isp).`,
    scienceLink: SCIENCE.rocketEquation,
  });

  // ── Return ───────────────────────────────────────────────
  const driveBack = (p.drive?.rangeLy ?? 0) >= req.driveRangeLy;
  add({
    id: 'drive_back', label: 'Deep-Space Drive: coming home', phase: 4, status: driveBack ? 'pass' : 'fail',
    have: `${fint(p.drive?.rangeLy ?? 0)} ly range`, need: `${f1(req.driveRangeLy)} ly round trip`, cause: 'drive_return',
    advice: driveBack
      ? 'The drive had enough range for the round trip.'
      : `The drive reached the planet but its ${fint(p.drive?.rangeLy ?? 0)} light-year range can’t cover the ${f1(req.driveRangeLy)} light-year round trip. Pick a longer-range drive.`,
  });
  const returnOk = s.dvVacKms >= req.returnLegKms;
  add({
    id: 'dv_return', label: 'Rocket power for the trip home', phase: 4, status: returnOk ? 'pass' : 'fail',
    have: `${f1(s.dvVacKms)} km/s`, need: `${f1(req.returnLegKms)} km/s`, cause: 'return_dv',
    advice: returnOk
      ? 'There was enough fuel left for the course corrections home.'
      : `The rocket ran dry on the way home: it had ${f1(s.dvVacKms)} km/s and needed ${f1(req.returnLegKms)} km/s in total after refuelling. One more tank or a higher-Isp engine would do it.`,
  });

  // ── Home ─────────────────────────────────────────────────
  const reentryOk = !!p.shield?.reentryRated;
  add({
    id: 'reentry', label: 'Earth re-entry heat shield', phase: 5, status: auto(cfg.checks.heat, reentryOk),
    have: p.shield ? (p.shield.reentryRated ? `${p.shield.name} (re-entry rated)` : `${p.shield.name} (not re-entry rated)`) : 'no shield',
    need: 're-entry rated shield', cause: 'reentry',
    advice: !cfg.checks.heat
      ? 'Simplified at this level: re-entry passes automatically.'
      : reentryOk
        ? 'The heat shield glowed bright and kept everyone cool through re-entry.'
        : 'Coming home at high speed heats the capsule to thousands of degrees. Fit a re-entry rated heat shield (Cork-n-Silica or better).',
    scienceLink: SCIENCE.heatShield,
  });

  // First failure in flight order (checks are already in order).
  const firstFail = checks.find((c) => c.status === 'fail');
  const failure = firstFail ? { cause: firstFail.cause!, phase: CAUSE_PHASE[firstFail.cause!], check: firstFail } : null;
  const success = !failure;
  const failedPhase = failure ? failure.phase : PHASES.length;

  const score = scoreMission({ design, planet, difficulty, crew, stats: s, req, success, cause: failure?.cause ?? null });
  return { success, failure, failedPhase, checks, stats: s, req, score, crew, planetId: planet.id, difficulty };
}
