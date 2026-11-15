import { describe, expect, it } from 'vitest';
import { PLANETS, derivePlanet, getPlanet, parsecsToLy, surfaceGravityG, orbitalSpeedKms, massKind } from '../data/planets.ts';
import { PLANET_LIST } from '../data/planetList.ts';
import type { ArchiveRow, Difficulty } from '../data/types.ts';
import { getPart, type TankPart, type EnginePart } from '../data/components.ts';
import { A, G0 } from './constants.ts';
import { evaluateMission, launchBlockers, requirements, type FailureCause } from './mission.ts';
import { rocketStats, tsiolkovskyKms, type Design } from './rocket.ts';
import { crewMultiplier, runAverage, MAX_PER_LAUNCH, CAUSE_CREDIT } from './score.ts';
import { OUTCOMES, OUTCOME_SAMPLE_CAUSE, outcomeFor, planCutscene } from './cutscenes.ts';

const P = (id: string) => getPlanet(id)!;

/** A synthetic planet: everything measured, with chosen distance, temperature and orbital speed. */
function fakePlanet(opts: { ly?: number; T?: number; vKms?: number; land?: boolean }) {
  const R = opts.land === false ? 3 : 1;
  const v = opts.vKms ?? 7.9;
  const M = R * (v / 7.9) ** 2; // v = 7.9 √(M/R)
  const row: ArchiveRow = {
    pl_name: 'Test b', hostname: 'Test', sy_dist: (opts.ly ?? 10) / 3.2616, pl_rade: R, pl_bmasse: M, pl_bmassprov: 'Mass',
    pl_eqt: opts.T ?? 280, pl_orbper: 10, pl_orbsmax: 0.05, st_spectype: 'M3 V', sy_snum: 1, sy_pnum: 1,
    discoverymethod: 'Transit', disc_year: 2020, disc_facility: 'Test',
  };
  return derivePlanet({ ...PLANET_LIST[0], id: 'test-b', officialName: 'Test b', nickname: 'Testy' }, row);
}

/** A rocket that succeeds on Proxima Cen b at Cadet. */
const GOOD: Design = {
  pod: 'pod-probe', engine: 'eng-hydro2', drive: 'drv-hop', comms: 'com-whisper',
  tank0: 'tank-hydro', tank1: 'tank-hydro', tank2: 'tank-hydro-s',
  pressure: 'prs-autogen', shield: 'shd-cork',
};

describe('planet data and derived values', () => {
  it('loads all 19 planets from the archive snapshot', () => {
    expect(PLANETS).toHaveLength(19);
    for (const p of PLANETS) expect(p.distanceLy.provenance).not.toBe('assumption');
  });
  it('converts parsecs to light-years', () => {
    expect(parsecsToLy(1)).toBeCloseTo(3.2616, 6);
    expect(P('proxima-cen-b').distanceLy.value).toBeCloseTo(4.24, 1);
  });
  it('computes gravity and orbital speed from mass and radius', () => {
    expect(surfaceGravityG(1, 1)).toBe(1);
    expect(surfaceGravityG(8, 2)).toBe(2);
    expect(orbitalSpeedKms(1, 1)).toBeCloseTo(7.9, 6);
    expect(orbitalSpeedKms(4, 1)).toBeCloseTo(15.8, 6);
  });
  it('classifies mass provenance', () => {
    expect(massKind('Mass')).toBe('measured');
    expect(massKind('Msini')).toBe('minimum');
    expect(massKind('M-R relationship')).toBe('estimated');
  });
  it('applies the 1.6 Earth-radius rule and overrides', () => {
    expect(P('trappist-1-e').missionType).toBe('land');
    expect(P('kelt-9-b').missionType).toBe('orbit');
    expect(P('55-cnc-e').typeLabel).toBe('Probably rocky');
    expect(P('55-cnc-e').missionType).toBe('orbit');
  });
});

describe('Tsiolkovsky rocket equation', () => {
  it('matches a hand calculation', () => {
    // 300 s × 9.81 m/s² × ln(100/50) = 2943 × 0.693147 = 2039.96 m/s
    expect(tsiolkovskyKms(300, 100_000, 50_000)).toBeCloseTo(2.03996, 4);
    expect(tsiolkovskyKms(450, 10, 1)).toBeCloseTo((450 * 9.81 * Math.log(10)) / 1000, 9);
  });
  it('a one-tank rocket equals Isp × g₀ × ln(m₀/m_f) exactly', () => {
    const d: Design = { ...GOOD, tank1: null, tank2: null };
    const s = rocketStats(d, 0);
    const eng = getPart(d.engine) as EnginePart;
    const expected = (eng.ispS * G0 * Math.log(s.wetMassKg / s.dryMassKg)) / 1000;
    expect(s.dvKms).toBeCloseTo(expected, 9);
    expect(s.dvNoStagingKms).toBeCloseTo(expected, 9);
  });
  it('dropping empty tanks gives more Δv than keeping them', () => {
    const s = rocketStats(GOOD, 0);
    expect(s.stages).toHaveLength(3);
    expect(s.dvKms).toBeGreaterThan(s.dvNoStagingKms);
    expect(s.dvVacKms).toBeGreaterThan(s.dvKms); // vacuum Isp is higher
  });
  it('adds astronaut mass', () => {
    const d: Design = { ...GOOD, pod: 'pod-quad' };
    expect(rocketStats(d, 3).wetMassKg - rocketStats(d, 0).wetMassKg).toBe(3 * A.crewMassKg);
  });
  it('gives zero Δv when tanks do not match the engine', () => {
    const s = rocketStats({ ...GOOD, tank0: 'tank-kero-s' }, 0);
    expect(s.propellantMatch).toBe(false);
    expect(s.dvKms).toBe(0);
  });
});

describe('lift-off thrust-to-weight edge', () => {
  /** Find the crew-free payload mass that makes TWR exactly 1.2 by scaling a tank. */
  function twrCheck(twr: number) {
    const engine = getPart('eng-hydro2') as EnginePart;
    const tank = getPart('tank-hydro') as TankPart;
    const base = rocketStats({ ...GOOD, tank1: null, tank2: null }, 0);
    // Wet mass that gives this TWR: m = T / (TWR × g)
    const m = (engine.thrustKN * 1000) / (twr * G0);
    const saved = tank.propellantKg;
    tank.propellantKg = saved + (m - base.wetMassKg);
    try {
      return evaluateMission({ ...GOOD, tank1: null, tank2: null }, P('proxima-cen-b'), 'easy', 0);
    } finally {
      tank.propellantKg = saved;
    }
  }
  it('passes at exactly 1.2', () => {
    const r = twrCheck(1.2);
    expect(r.stats.twr).toBeCloseTo(1.2, 9);
    expect(r.checks.find((c) => c.id === 'twr')!.status).toBe('pass');
  });
  it('fails just below 1.2', () => {
    const r = twrCheck(1.19);
    expect(r.checks.find((c) => c.id === 'twr')!.status).toBe('fail');
    expect(r.failure!.cause).toBe('no_thrust');
  });
});

describe('every failure branch', () => {
  const cases: { cause: FailureCause; design: Design; planet: ReturnType<typeof fakePlanet>; diff: Difficulty; crew?: number }[] = [
    { cause: 'no_thrust', design: { ...GOOD, tank2: 'tank-hydro', pod: 'pod-quad' }, planet: fakePlanet({}), diff: 'easy' },
    { cause: 'too_heavy', design: { ...GOOD, engine: 'eng-kero9', tank0: 'tank-kero-l', tank1: 'tank-kero-l', tank2: 'tank-kero-l', pressure: 'prs-helium-xl' }, planet: fakePlanet({}), diff: 'easy' },
    { cause: 'pressure', design: { ...GOOD, pressure: null }, planet: fakePlanet({}), diff: 'hard' },
    { cause: 'pressure', design: { ...GOOD, engine: 'eng-kero9', tank0: 'tank-kero-l', tank1: 'tank-kero-s', tank2: 'tank-kero-s', pressure: 'prs-autogen' }, planet: fakePlanet({}), diff: 'hard' },
    { cause: 'orbit_fuel', design: { ...GOOD, tank1: null, tank2: null }, planet: fakePlanet({}), diff: 'easy' },
    { cause: 'drive_short', design: GOOD, planet: fakePlanet({ ly: 40 }), diff: 'easy' },
    { cause: 'comms', design: GOOD, planet: fakePlanet({ ly: 20 }), diff: 'medium' },
    { cause: 'radiation', design: { ...GOOD, pod: 'pod-duo' }, planet: fakePlanet({}), diff: 'hard', crew: 1 },
    { cause: 'heat_planet', design: GOOD, planet: fakePlanet({ T: 2000 }), diff: 'medium' },
    { cause: 'planet_dv', design: GOOD, planet: fakePlanet({ vKms: 12 }), diff: 'easy' },
    { cause: 'drive_return', design: GOOD, planet: fakePlanet({ ly: 20 }), diff: 'easy' },
    { cause: 'reentry', design: { ...GOOD, shield: 'shd-blanket' }, planet: fakePlanet({}), diff: 'medium' },
  ];
  for (const c of cases) {
    it(`${c.cause} (${c.diff})`, () => {
      const r = evaluateMission(c.design, c.planet, c.diff, c.crew ?? 0);
      expect(r.success).toBe(false);
      expect(r.failure!.cause).toBe(c.cause);
      expect(r.score.lines[0].points).toBe(CAUSE_CREDIT[c.cause]);
    });
  }
  it('return_dv: enough for the take-off but not the trip home', () => {
    const dvVac = rocketStats(GOOD, 0).dvVacKms;
    // Pick v so the ascent leg fits but ascent + 0.3 km/s correction does not.
    const v = (dvVac / A.marginFactor - A.returnCorrectionKms / 2) / A.ascentFactor;
    const r = evaluateMission(GOOD, fakePlanet({ vKms: v }), 'easy', 0);
    expect(r.failure!.cause).toBe('return_dv');
  });
  it('success on a real planet', () => {
    const r = evaluateMission(GOOD, P('proxima-cen-b'), 'easy', 0);
    expect(r.failure).toBeNull();
    expect(r.success).toBe(true);
    expect(r.score.lines[0].points).toBe(400);
  });
  it('Cadet auto-passes comms, heat, pressure and radiation', () => {
    const r = evaluateMission({ ...GOOD, comms: 'com-whisper', shield: null, pressure: null }, fakePlanet({ ly: 14, T: 900 }), 'easy', 0);
    for (const id of ['comms', 'heat', 'pressure', 'radiation', 'reentry']) expect(r.checks.find((c) => c.id === id)!.status).toBe('auto');
    expect(r.success).toBe(true);
  });
  it('checks are reported in flight order and the first failure wins', () => {
    const r = evaluateMission({ ...GOOD, tank1: null, tank2: null, drive: null }, fakePlanet({ ly: 40 }), 'easy', 0);
    expect(r.failure!.cause).toBe('orbit_fuel');
    const phases = r.checks.map((c) => c.phase);
    expect([...phases].sort((a, b) => a - b)).toEqual(phases);
  });
});

describe('launch blockers', () => {
  it('requires the core parts', () => {
    const ids = launchBlockers({}, 'easy', 0).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['pod', 'engine', 'drive', 'tank', 'comms']));
  });
  it('blocks more crew than seats and mismatched propellant', () => {
    expect(launchBlockers(GOOD, 'easy', 1).map((b) => b.id)).toContain('seats');
    expect(launchBlockers({ ...GOOD, tank1: 'tank-kero-s' }, 'easy', 0).map((b) => b.id)).toContain('propellant');
  });
  it('blocks over-budget launches only for Flight Directors', () => {
    const pricey: Design = { ...GOOD, drive: 'drv-loop', shield: 'shd-forge', comms: 'com-laser', engine: 'eng-hydro4', pod: 'pod-quad' };
    expect(rocketStats(pricey, 0).cost).toBeGreaterThan(600);
    expect(launchBlockers(pricey, 'hard', 0).map((b) => b.id)).toContain('budget');
    expect(launchBlockers(pricey, 'medium', 0).map((b) => b.id)).not.toContain('budget');
  });
});

describe('requirements', () => {
  it('Earth launch is 9.4 km/s plus 10% margin', () => {
    expect(requirements(P('proxima-cen-b')).earthLegKms).toBeCloseTo(10.34, 6);
  });
  it('land missions: take-off is 1.2 × orbital speed plus margin', () => {
    const p = P('proxima-cen-b');
    const r = requirements(p);
    expect(r.ascentLegKms).toBeCloseTo(1.2 * p.orbitalSpeedKms.value * 1.1, 6);
    expect(r.returnLegKms).toBeCloseTo((1.2 * p.orbitalSpeedKms.value + 0.3) * 1.1, 6);
  });
  it('drive needs twice the distance', () => {
    const p = P('kepler-22-b');
    expect(requirements(p).driveRangeLy).toBeCloseTo(2 * p.distanceLy.value, 6);
  });
});

describe('outcome → cutscene mapping (brief 6.2)', () => {
  it('maps causes to outcomes', () => {
    expect(outcomeFor('no_thrust')).toBe('no_thrust');
    expect(outcomeFor('too_heavy')).toBe('explosion');
    expect(outcomeFor('pressure')).toBe('explosion');
    expect(outcomeFor('orbit_fuel')).toBe('out_of_fuel');
    expect(outcomeFor('drive_short')).toBe('out_of_fuel');
    expect(outcomeFor('comms')).toBe('signal_lost');
    expect(outcomeFor('heat_planet')).toBe('planet_fail');
    expect(outcomeFor('planet_dv')).toBe('planet_fail');
    expect(outcomeFor('radiation')).toBe('planet_fail');
    expect(outcomeFor('return_dv')).toBe('return_fail');
    expect(outcomeFor('drive_return')).toBe('return_fail');
    expect(outcomeFor('reentry')).toBe('return_fail');
    expect(outcomeFor(null)).toBe('success');
  });
  const seq = (o: (typeof OUTCOMES)[number]) => planCutscene(OUTCOME_SAMPLE_CAUSE[o], 'Testy').segments;
  it('builds each sequence exactly', () => {
    expect(seq('no_thrust')).toEqual([{ clip: 'launch', stopAt: 1.2 }]);
    expect(seq('explosion')).toEqual([{ clip: 'launch' }, { clip: 'explosion' }]);
    expect(seq('out_of_fuel')).toEqual([{ clip: 'launch' }, { clip: 'cruising', stopAt: 3.5 }]);
    expect(seq('signal_lost')).toEqual([{ clip: 'launch' }, { clip: 'cruising' }]);
    expect(seq('planet_fail')).toEqual([{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }]);
    const ret = { clip: 'cruising', mirror: true, label: 'Return journey' };
    expect(seq('return_fail')).toEqual([{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }, ret]);
    expect(seq('success')).toEqual([{ clip: 'launch' }, { clip: 'cruising' }, { clip: 'planet' }, ret]);
  });
  it('end effects, overlays and sounds', () => {
    expect(planCutscene('no_thrust', 'X')).toMatchObject({ endEffect: 'freeze-zoom', overlay: 'We didn’t leave the pad!', sound: 'fail_womp' });
    expect(planCutscene('too_heavy', 'X').overlay).toBe('Rapid unscheduled disassembly');
    expect(planCutscene('orbit_fuel', 'X')).toMatchObject({ endEffect: 'sputter', overlay: 'Out of fuel' });
    expect(planCutscene('comms', 'X')).toMatchObject({ endEffect: 'static', overlay: 'Signal lost' });
    expect(planCutscene(null, 'Testy')).toMatchObject({ midStamp: 'Mission accomplished at Testy!', sound: 'success_fanfare' });
  });
});

describe('score', () => {
  it('astronaut multiplier', () => {
    expect(crewMultiplier(true, 0)).toBe(1);
    expect(crewMultiplier(true, 4)).toBeCloseTo(1.4, 9);
    expect(crewMultiplier(false, 2)).toBeCloseTo(0.7, 9);
    expect(crewMultiplier(false, 4)).toBeCloseTo(0.4, 9);
    expect(crewMultiplier(false, 7)).toBe(0);
  });
  it('stays within 0–1000 base and 0–1400 per launch for many random rockets', () => {
    const ids = (kind: string) => ['pod', 'engine', 'drive', 'tank', 'comms', 'pressure', 'shield'].includes(kind);
    expect(ids('pod')).toBe(true);
    let rnd = 42;
    const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const choose = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    const pods = ['pod-probe', 'pod-duo', 'pod-quad'];
    const engines = ['eng-solid', 'eng-kero9', 'eng-hydro2', 'eng-hydro4'];
    const tanks: Record<string, string[]> = { 'eng-solid': ['tank-solid'], 'eng-kero9': ['tank-kero-s', 'tank-kero-l'], 'eng-hydro2': ['tank-hydro', 'tank-hydro-s'], 'eng-hydro4': ['tank-hydro', 'tank-hydro-s'] };
    let maxSeen = 0;
    for (let i = 0; i < 3000; i++) {
      const engine = choose(engines);
      const pod = choose(pods);
      const d: Design = {
        pod, engine, drive: choose(['drv-hop', 'drv-stride', 'drv-leap', 'drv-loop']), comms: choose(['com-whisper', 'com-bigear', 'com-laser']),
        tank0: choose(tanks[engine]), tank1: rand() > 0.3 ? choose(tanks[engine]) : null, tank2: rand() > 0.5 ? choose(tanks[engine]) : null,
        pressure: choose([null, 'prs-helium', 'prs-helium-xl', 'prs-autogen']), shield: choose([null, 'shd-blanket', 'shd-cork', 'shd-pica', 'shd-forge']),
      };
      const seats = (getPart(pod) as { seats: number }).seats;
      const crew = Math.floor(rand() * (seats + 1));
      const r = evaluateMission(d, choose(PLANETS), choose(['easy', 'medium', 'hard'] as Difficulty[]), crew);
      expect(r.score.base).toBeGreaterThanOrEqual(0);
      expect(r.score.base).toBeLessThanOrEqual(1000);
      expect(r.score.total).toBeGreaterThanOrEqual(0);
      expect(r.score.total).toBeLessThanOrEqual(MAX_PER_LAUNCH);
      maxSeen = Math.max(maxSeen, r.score.total);
    }
    expect(maxSeen).toBeGreaterThan(0);
  });
  it('a successful crewed flight earns the multiplier', () => {
    const d: Design = { ...GOOD, pod: 'pod-duo', drive: 'drv-stride' };
    const r0 = evaluateMission(d, P('trappist-1-e'), 'easy', 0);
    const r2 = evaluateMission(d, P('trappist-1-e'), 'easy', 2);
    expect(r2.success).toBe(true);
    expect(r2.score.multiplier).toBeCloseTo(1.2, 9);
    expect(r2.score.total).toBeCloseTo(Math.round(r2.score.base * 1.2 * 10) / 10, 6);
    expect(r0.score.multiplier).toBe(1);
  });
  it('10-launch average to one decimal place', () => {
    expect(runAverage([])).toBe(0);
    expect(runAverage([1000, 900, 800, 700, 600, 500, 400, 300, 200, 101])).toBe(550.1);
    expect(runAverage([333.33, 333.33, 333.34])).toBe(333.3);
    expect(runAverage(Array(10).fill(1400))).toBe(1400);
  });
});
