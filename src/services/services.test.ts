import { beforeEach, describe, expect, it } from 'vitest';
import { cleanName, displayName, escapeHtml, isProfane } from './names.ts';
import { LocalLeaderboardService, validateEntry } from './leaderboard.ts';
import { telemetry, cassHint } from '../engine/telemetry.ts';
import { getPlanet } from '../data/planets.ts';
import { suggestedBuild } from '../engine/suggest.ts';
import { requirements } from '../engine/mission.ts';
import { getPart } from '../data/components.ts';
import { PLANET_FACTS } from '../data/planet-facts.ts';
import { PLANETS } from '../data/planets.ts';

describe('engineer names', () => {
  it('trims, limits to 20 characters and rejects empty names', () => {
    expect(cleanName('  Ada   Lovelace ').value).toBe('Ada Lovelace');
    expect(cleanName('   ').ok).toBe(false);
    expect(cleanName('x'.repeat(21)).ok).toBe(false);
    expect(cleanName('x'.repeat(20)).ok).toBe(true);
  });
  it('filters profanity, including simple leetspeak, without blocking real names', () => {
    expect(isProfane('sh1t head')).toBe(true);
    expect(cleanName('fuckface').ok).toBe(false);
    expect(isProfane('Dickens')).toBe(false);
    expect(isProfane('Scunthorpe')).toBe(false);
    expect(displayName('b1tch')).toBe('Space Cadet');
    expect(displayName('Rocket Riley')).toBe('Rocket Riley');
  });
  it('rejects angle brackets and escapes HTML', () => {
    expect(cleanName('<script>').ok).toBe(false);
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  });
});

describe('leaderboard (local)', () => {
  beforeEach(() => localStorage.clear());
  it('validates entries like the database policy', () => {
    expect(validateEntry({ name: 'Ada', difficulty: 'easy', avg_score: 500, attempts: 10 })).toBeNull();
    expect(validateEntry({ name: 'Ada', difficulty: 'easy', avg_score: 500, attempts: 9 })).toMatch(/10/);
    expect(validateEntry({ name: 'Ada', difficulty: 'easy', avg_score: 1400.1, attempts: 10 })).toMatch(/range/);
    expect(validateEntry({ name: 'Ada', difficulty: 'nightmare' as never, avg_score: 1, attempts: 10 })).toMatch(/difficulty/);
  });
  it('stores, sorts and filters by difficulty', async () => {
    const svc = new LocalLeaderboardService();
    await svc.submit({ name: 'Low', difficulty: 'easy', avg_score: 100.04, attempts: 10 });
    await svc.submit({ name: 'High', difficulty: 'easy', avg_score: 900, attempts: 10 });
    await svc.submit({ name: 'Hard one', difficulty: 'hard', avg_score: 500, attempts: 10 });
    expect((await svc.list('all')).map((e) => e.name)).toEqual(['High', 'Hard one', 'Low']);
    expect((await svc.list('hard')).map((e) => e.name)).toEqual(['Hard one']);
    expect((await svc.list('easy'))[1].avg_score).toBe(100);
    await expect(svc.submit({ name: '', difficulty: 'easy', avg_score: 1, attempts: 10 })).rejects.toThrow();
  });
});

describe('workshop telemetry', () => {
  const planet = getPlanet('proxima-cen-b')!;
  it('starts empty and tells you to drag parts', () => {
    const s = telemetry({}, planet, 'easy', 0);
    expect(cassHint(s).text).toMatch(/Drag parts/);
  });
  it('flags a rocket that is too heavy to lift off', () => {
    const s = telemetry({ pod: 'pod-quad', engine: 'eng-hydro2', tank0: 'tank-hydro', tank1: 'tank-hydro', tank2: 'tank-hydro', drive: 'drv-hop', comms: 'com-whisper' }, planet, 'easy', 0);
    expect(s.find((x) => x.id === 'twr')!.level).toBe('bad');
    expect(cassHint(s).text).toMatch(/Too heavy to lift off/);
  });
  it('marks simplified checks as automatic at Cadet level', () => {
    const s = telemetry({ comms: 'com-whisper' }, planet, 'easy', 0);
    expect(s.find((x) => x.id === 'comms')!.level).toBe('auto');
    expect(s.find((x) => x.id === 'heat')!.level).toBe('auto');
  });
  it('suggested build fills exactly 3 slots with a drive that covers the round trip', () => {
    const d = suggestedBuild(planet);
    expect(Object.keys(d)).toHaveLength(3);
    const drive = getPart(d.drive) as { rangeLy: number };
    expect(drive.rangeLy).toBeGreaterThanOrEqual(requirements(planet).driveRangeLy);
  });
});

describe('planet facts', () => {
  it('every shown fact has a NASA source', () => {
    for (const p of PLANETS) {
      const f = PLANET_FACTS[p.id];
      expect(f, p.id).toBeDefined();
      if (f.fact) expect(f.source, p.id).toMatch(/^https:\/\/([a-z0-9-]+\.)*(nasa\.gov|caltech\.edu)\//);
      else expect(f.removed, p.id).toBeTruthy();
    }
  });
});
