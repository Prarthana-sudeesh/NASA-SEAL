import type { Difficulty, Planet } from '../data/types.ts';
import { requirements } from './mission.ts';
import { DIFFICULTIES } from './difficulty.ts';

export interface Challenge {
  label: string;
  level: 1 | 2 | 3;
  why: string;
}

/** A short, difficulty-appropriate "challenge" tag for a planet card. */
export function planetChallenge(p: Planet, difficulty: Difficulty): Challenge {
  const req = requirements(p);
  const cfg = DIFFICULTIES[difficulty];
  const ly = p.distanceLy.value;
  const tags: Challenge[] = [];
  if (p.missionType === 'land' && req.deepNeededKms > 12.3)
    tags.push({ label: 'Heavy-gravity landing', level: 3, why: `Taking off again needs ${req.deepNeededKms.toFixed(1)} km/s.` });
  else if (p.missionType === 'land' && req.deepNeededKms > 11)
    tags.push({ label: 'Tricky take-off', level: 2, why: `Taking off again needs ${req.deepNeededKms.toFixed(1)} km/s.` });
  if (cfg.checks.heat && p.tempK.value > 2800) tags.push({ label: 'Needs imaginary armour', level: 3, why: `About ${Math.round(p.tempK.value)} K: hotter than any real shield.` });
  else if (cfg.checks.heat && p.tempK.value > 1800) tags.push({ label: 'Scorching', level: 2, why: `About ${Math.round(p.tempK.value)} K.` });
  if (ly > 1500) tags.push({ label: 'Edge of range', level: 3, why: `${Math.round(ly)} light-years away.` });
  else if (ly > 150) tags.push({ label: 'Long haul', level: 2, why: `${Math.round(ly)} light-years away.` });
  if (p.missionType === 'orbit') tags.push({ label: 'Orbit survey', level: 1, why: 'No solid surface: survey it from orbit.' });
  if (!tags.length) tags.push({ label: ly < 15 ? 'Close neighbour' : 'Friendly first trip', level: 1, why: `${ly.toFixed(1)} light-years, mild temperature.` });
  return tags.sort((a, b) => b.level - a.level)[0];
}
