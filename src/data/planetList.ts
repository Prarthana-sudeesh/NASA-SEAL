import type { Difficulty } from './types.ts';

/** Planet type the game uses for the mission plan. 'auto' = derived from radius (see planets.ts). */
export type TypeOverride = 'auto' | 'rocky' | 'gas';

export interface PlanetListEntry {
  id: string;
  /** Exactly as the NASA Exoplanet Archive spells pl_name. */
  officialName: string;
  /** Mission nickname, made up for this game. */
  nickname: string;
  /** IAU-approved proper name, where one exists. */
  iauName?: string;
  tier: Difficulty;
  typeOverride: TypeOverride;
  /** Extra rule: landing on the surface needs shield ≥ this planet's temperature even on Cadet/Engineer. */
  lavaSurface?: boolean;
  /** Force an orbit survey even for a rocky world, with the reason shown to the player. */
  orbitOnly?: string;
}

export const PLANET_LIST: PlanetListEntry[] = [
  // Cadet: close, small, temperate; land and return
  { id: 'proxima-cen-b', officialName: 'Proxima Cen b', nickname: 'The Next-Door Neighbour', tier: 'easy', typeOverride: 'auto' },
  { id: 'ross-128-b', officialName: 'Ross 128 b', nickname: 'The Quiet Neighbour', tier: 'easy', typeOverride: 'auto' },
  { id: 'teegarden-b', officialName: "Teegarden's Star b", nickname: "Teegarden's Twin", tier: 'easy', typeOverride: 'auto' },
  { id: 'trappist-1-e', officialName: 'TRAPPIST-1 e', nickname: 'Sister Seven', tier: 'easy', typeOverride: 'auto' },
  { id: 'lhs-1140-b', officialName: 'LHS 1140 b', nickname: 'The Super Sibling', tier: 'easy', typeOverride: 'auto' },
  { id: 'toi-700-d', officialName: 'TOI-700 d', nickname: "TESS's Treasure", tier: 'easy', typeOverride: 'auto' },
  // Engineer: farther, mixed types, orbit surveys appear
  { id: 'kepler-186-f', officialName: 'Kepler-186 f', nickname: 'First Cousin', tier: 'medium', typeOverride: 'auto' },
  { id: 'kepler-452-b', officialName: 'Kepler-452 b', nickname: "Earth's Big Cousin", tier: 'medium', typeOverride: 'auto' },
  { id: 'kepler-22-b', officialName: 'Kepler-22 b', nickname: 'Goldilocks Giant', tier: 'medium', typeOverride: 'auto' },
  { id: 'k2-18-b', officialName: 'K2-18 b', nickname: 'The Methane Mist', tier: 'medium', typeOverride: 'auto' },
  { id: 'gj-1214-b', officialName: 'GJ 1214 b', nickname: 'The Hazy One', tier: 'medium', typeOverride: 'auto' },
  { id: 'kepler-16-b', officialName: 'Kepler-16 b', nickname: 'Double Sunset', tier: 'medium', typeOverride: 'auto' },
  // Flight Director: extreme heat, giants, far away
  { id: 'kelt-9-b', officialName: 'KELT-9 b', nickname: 'The Scorcher', tier: 'hard', typeOverride: 'auto' },
  { id: 'wasp-12-b', officialName: 'WASP-12 b', nickname: 'The Doomed Egg', tier: 'hard', typeOverride: 'auto' },
  { id: 'wasp-76-b', officialName: 'WASP-76 b', nickname: 'Iron Rain', tier: 'hard', typeOverride: 'auto' },
  { id: 'hd-189733-b', officialName: 'HD 189733 b', nickname: 'Glass Storm', tier: 'hard', typeOverride: 'auto' },
  { id: '55-cnc-e', officialName: '55 Cnc e', nickname: 'Lava World', iauName: 'Janssen', tier: 'hard', typeOverride: 'rocky', lavaSurface: true,
    orbitOnly: 'About 8 Earth masses: taking off again would need roughly 20 km/s, more than any chemical rocket can give (a real result: spaceflight from super-Earths is very hard). Mission Control orders an orbit survey instead.' },
  { id: '51-peg-b', officialName: '51 Peg b', nickname: 'The Pioneer', iauName: 'Dimidium', tier: 'hard', typeOverride: 'auto' },
  { id: 'hd-209458-b', officialName: 'HD 209458 b', nickname: 'The Comet Planet', iauName: 'Osiris', tier: 'hard', typeOverride: 'auto' },
];
