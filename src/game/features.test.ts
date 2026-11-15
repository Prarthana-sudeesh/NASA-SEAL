import { DIFFICULTIES } from './config.ts';
import { getPlanet, PLANETS } from '../data/planets.ts';
import { EMPTY_COLLECTION, postcardFacts, recordFlight, recordPuzzle } from './collection.ts';
import { crewLine } from './crew.ts';
import { checks, simulate, type Build } from './engine.ts';
import { EVENT_SECONDS, HAZARDS, HAZARD_IDS, planHazards, questionOf } from './events.ts';
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

describe('space hazards', () => {
  it('every question is well formed, and NASA facts carry a NASA source', () => {
    for (const id of HAZARD_IDS) {
      const h = HAZARDS[id];
      expect(h.questions.length).toBeGreaterThan(0);
      expect(h.questions.some((q) => q.level === 1)).toBe(true);
      for (const q of h.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
        if (q.source) expect(q.source.url).toMatch(/^https:\/\/[a-z.]*nasa\.gov\//);
      }
    }
    for (const id of ['blackhole', 'asteroids', 'gravity', 'aliens', 'debris'] as const)
      expect(HAZARDS[id].questions.every((q) => q.source)).toBe(true);
  });

  it('plans the same hazards for the same flight', () => {
    const all = ['journey', 'approach', 'return'] as const;
    expect(planHazards('run:1', 'hard', 1, [...all])).toEqual(
      planHazards('run:1', 'hard', 1, [...all]),
    );
  });

  it('gets harder with the level: more hazards and harder questions', () => {
    const all = ['journey', 'approach', 'return'] as const;
    const avg = (d: 'easy' | 'medium' | 'hard') => {
      let n = 0;
      let lvl = 0;
      for (let i = 0; i < 300; i++) {
        const evs = planHazards(`s${i}`, d, 1 + (i % 10), [...all]);
        n += evs.length;
        lvl += evs.reduce((s, e) => s + questionOf(e).level, 0);
      }
      return { count: n / 300, level: lvl / Math.max(1, n) };
    };
    const e = avg('easy');
    const m = avg('medium');
    const h = avg('hard');
    expect(e.count).toBeLessThan(m.count);
    expect(m.count).toBeLessThan(h.count);
    expect(e.level).toBe(1);
    expect(h.level).toBeGreaterThan(m.level);
    expect(EVENT_SECONDS.hard).toBeLessThan(EVENT_SECONDS.easy);
  });

  it('only uses stages the rocket reaches, one hazard per stage, no repeats', () => {
    for (let i = 0; i < 200; i++) {
      const evs = planHazards(`x${i}`, 'hard', 8, ['journey', 'approach']);
      expect(evs.every((e) => e.stage === 'journey' || e.stage === 'approach')).toBe(true);
      expect(new Set(evs.map((e) => e.stage)).size).toBe(evs.length);
      expect(new Set(evs.map((e) => e.id)).size).toBe(evs.length);
      for (const e of evs) {
        expect(HAZARDS[e.id].stages).toContain(e.stage);
        expect([...e.order].sort()).toEqual(questionOf(e).options.map((_, k) => k));
      }
    }
    expect(planHazards('none', 'hard', 1, [])).toEqual([]);
  });

  it('adds hazard points only when there were hazards', () => {
    const planet = getPlanet('proxima-cen-b')!;
    const none = simulate(GOOD, DIALS, planet, 'easy', null, null);
    const good = simulate(GOOD, DIALS, planet, 'easy', null, { handled: 2, total: 2 });
    const bad = simulate(GOOD, DIALS, planet, 'easy', null, { handled: 0, total: 2 });
    expect(none.breakdown.some((b) => b.label.startsWith('Space hazard'))).toBe(false);
    expect(good.total).toBeGreaterThan(bad.total);
    expect(bad.total).toBe(none.total);
  });

  it('answering hazards rescores the flight', () => {
    resetGameStore();
    const s = useGame.getState();
    s.signIn({ username: 'Ace', email: 'ace@x.org' });
    s.choosePlanet('proxima-cen-b');
    s.setBuild(GOOD);
    s.setDials(DIALS);
    let a = useGame.getState().launch()!;
    for (let i = 0; i < 9 && !a.events; i++) a = useGame.getState().launch()!;
    expect(a.events!.length).toBeGreaterThanOrEqual(1);
    const before = a.result.total;
    a.events!.forEach((e, i) => useGame.getState().resolveEvent(i, questionOf(e).answer));
    const after = useGame.getState().run!.attempts.at(-1)!;
    expect(after.events!.every((e) => e.resolved)).toBe(true);
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
    hazards: [{ id: 'blackhole', handled: true }],
    teamSize: 2,
  });

  it('unlocks a postcard, a crew photo and badges once per flight', () => {
    const out = recordFlight(EMPTY_COLLECTION, flight('a:1'))!;
    expect(out.unlocks.postcard).toBe('proxima-cen-b');
    expect(out.unlocks.photo).toBe(true);
    expect(out.unlocks.badges).toEqual(
      expect.arrayContaining(['first-flight', 'team-player', 'black-hole-survivor']),
    );
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
