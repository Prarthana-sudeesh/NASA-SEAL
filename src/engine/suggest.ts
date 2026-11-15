import { DRIVES } from '../data/components.ts';
import type { Planet } from '../data/types.ts';
import { requirements } from './mission.ts';
import type { Design } from './rocket.ts';

/** Cadet "suggested build": fills 3 slots (engine, first tank, drive). The rest is up to the player. */
export function suggestedBuild(planet: Planet): Design {
  const req = requirements(planet);
  const drive = [...DRIVES].sort((a, b) => a.cost - b.cost).find((d) => d.rangeLy >= req.driveRangeLy) ?? DRIVES[DRIVES.length - 1];
  return { engine: 'eng-hydro2', tank0: 'tank-hydro', drive: drive.id };
}
