import { DIFFICULTIES } from './config.ts';
import { getPlanet, PLANETS } from '../data/planets.ts';
import { EMPTY_COLLECTION, postcardFacts, recordFlight, recordPuzzle } from './collection.ts';
import { crewLine } from './crew.ts';
import { checks, simulate, type Build } from './engine.ts';
import { EVENTS, EVENT_IDS, pickEvent } from './events.ts';
import { makePuzzle, puzzlePoints, seededRandom } from './puzzles.ts';
import { holder, rolesOf, ROLE_ORDER } from './team.ts';
import { resetGameStore, useGame } from '../store/gameStore.ts';

const GOOD: Build = {
  payload: 'payload-capsule',
  antenna: 'antenna-low',
  body: 'body-medium',
  hull: 'hull-aluminium',
  engine: 'engine-small',
  crew: 1,
};
const DIALS = { fuel: 72, thrust: 66, pressure: 1 };

describe('surprise emergencies', () => {
  it('every event has three options and a valid answer', () => {
    for (const id of EVENT_IDS) {
      const e = EVENTS[id];
      expect(e.options).toHaveLength(3);
      expect(e.answer).toBeGreaterThanOrEqual(0);
      expect(e.answer).toBeLessThan(3);
    }
  });

  it('picks the same event for the same flight, and sometimes none', () => {
    expect(pickEvent('run:1')).toBe(pickEvent('run:1'));
    const picks = Array.from({ length: 200 }, (_, i) => pickEvent(`r${i}:3`));
    expect(picks.some((p) => p === null)).toBe(true);
    expect(new Set(picks.filter(Boolean)).size).toBe(EVENT_IDS.length);
  });

  it('adds emergency points only when there was an emergency', () => {
    const planet = getPlanet('proxima-cen-b')!;
    const none = simulate(GOOD, DIALS, planet, 'easy', null, null);
    const good = simulate(GOOD, DIALS, planet, 'easy', null, true);
    const bad = simulate(GOOD, DIALS, planet, 'easy', null, false);
    expect(none.breakdown.some((b) => b.label === 'Emergency call')).toBe(false);
    expect(good.total).toBeGreaterThan(bad.total);
    expect(bad.total).toBe(none.total);
  });

  it('resolving an emergency rescores the flight', () => {
    resetGameStore();
    const s = useGame.getState();
    s.signIn({ username: 'Ace', email: 'ace@x.org' });
    s.choosePlanet('proxima-cen-b');
    s.setBuild(GOOD);
    s.setDials(DIALS);
    // Launch until a flight has an emergency.
    let a = useGame.getState().launch();
    for (let i = 0; i < 9 && !a?.event; i++) a = useGame.getState().launch();
    expect(a?.event).toBeDefined();
    const before = a!.result.total;
    useGame.getState().resolveEvent(EVENTS[a!.event!.id].answer);
    const after = useGame.getState().run!.attempts.at(-1)!;
    expect(after.event!.resolved).toBe(true);
    expect(after.result.total).toBeGreaterThan(before);
  });
});

describe('team mode', () => {
  it('shares all four roles among the players', () => {
    for (let n = 1; n <= 4; n++) {
      const team = { members: Array.from({ length: n }, (_, i) => `P${i}`) };
      const all = team.members.flatMap((_, i) => rolesOf(team, i));
      expect(all.sort()).toEqual([...ROLE_ORDER].sort());
    }
    expect(holder({ members: ['A', 'B'] }, 'comms')).toBe('A');
    expect(holder({ members: ['A'] }, 'comms')).toBeNull();
  });

  it('remembers who flew the mission', () => {
    resetGameStore();
    const s = useGame.getState();
    s.signIn({ username: 'Ace', email: 'ace@x.org' });
    s.setTeam(['Ace', 'Sam', 'Lee']);
    s.choosePlanet('proxima-cen-b');
    s.setBuild(GOOD);
    s.setDials(DIALS);
    expect(useGame.getState().launch()!.team).toEqual(['Ace', 'Sam', 'Lee']);
  });
});

describe('fix my rocket', () => {
  it('makes a solvable puzzle with one clear culprit for every planet', () => {
    const planets = Object.values(DIFFICULTIES).flatMap((d) => d.planets);
    for (const [i, id] of [...planets, ...planets, ...planets].entries()) {
      const planet = getPlanet(id)!;
      const p = makePuzzle(planet, seededRandom(7 + i * 101));
      expect(p, id).not.toBeNull();
      // Broken as given…
      expect(checks(p!.build, p!.dials, planet).some((c) => !c.ok)).toBe(true);
      // …and fixed by swapping only the faulty part.
      const fixed = { ...p!.build, [p!.faulty]: p!.fix };
      expect(checks(fixed, p!.dials, planet).every((c) => c.ok)).toBe(true);
    }
  });

  it('rewards speed', () => {
    expect(puzzlePoints(true, 10)).toBeGreaterThan(puzzlePoints(true, 2));
    expect(puzzlePoints(false, 30)).toBe(0);
  });
});

describe('crew', () => {
  it('has a line for every moment, and the probe talks when there is no crew', () => {
    expect(crewLine(3, 'launch').speaker).toBe('Milo');
    expect(crewLine(1, 'launch').speaker).toBe('Cmdr. Kai');
    expect(crewLine(0, 'launch').probe).toBe(true);
    expect(crewLine(2, 'journey', 'fuel').text).toMatch(/empty/i);
  });
});

describe('collection', () => {
  const planet = getPlanet('proxima-cen-b')!;
  const flight = (key: string, success = true) => ({
    key,
    planet,
    difficulty: 'easy' as const,
    crew: 1,
    result: simulate(GOOD, success ? DIALS : { ...DIALS, fuel: 5 }, planet, 'easy'),
    quizCorrect: true,
    emergencyHandled: true,
    teamSize: 2,
  });

  it('unlocks a postcard, a crew photo and badges once per flight', () => {
    const out = recordFlight(EMPTY_COLLECTION, flight('a:1'))!;
    expect(out.unlocks.postcard).toBe('proxima-cen-b');
    expect(out.unlocks.photo).toBe(true);
    expect(out.unlocks.badges).toEqual(expect.arrayContaining(['first-flight', 'team-player']));
    expect(recordFlight(out.next, flight('a:1'))).toBeNull();
    const again = recordFlight(out.next, flight('a:2'))!;
    expect(again.unlocks.postcard).toBeNull();
    expect(again.unlocks.badges).not.toContain('first-flight');
  });

  it('gives no postcard when the rocket never landed', () => {
    const out = recordFlight(EMPTY_COLLECTION, flight('b:1', false))!;
    expect(out.unlocks.postcard).toBeNull();
    expect(out.unlocks.photo).toBe(false);
  });

  it('awards Fix-it Pro for a perfect workshop', () => {
    expect(recordPuzzle(EMPTY_COLLECTION, 900, 5, 5).badges).toContain('fix-it-pro');
    expect(recordPuzzle(EMPTY_COLLECTION, 300, 3, 5).badges).toHaveLength(0);
  });

  it('writes three facts for every planet postcard', () => {
    for (const p of PLANETS) expect(postcardFacts(p)).toHaveLength(3);
  });
});
