export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Cadet',
  medium: 'Engineer',
  hard: 'Flight Director',
};

/** One row of the NASA Exoplanet Archive pscomppars table, as fetched. null = not measured. */
export interface ArchiveRow {
  pl_name: string;
  hostname: string | null;
  sy_dist: number | null;
  pl_rade: number | null;
  pl_bmasse: number | null;
  pl_bmassprov: string | null;
  pl_eqt: number | null;
  pl_orbper: number | null;
  pl_orbsmax: number | null;
  st_spectype: string | null;
  sy_snum: number | null;
  sy_pnum: number | null;
  discoverymethod: string | null;
  disc_year: number | null;
  disc_facility: string | null;
}

export type MissionType = 'land' | 'orbit';

/** A value the game uses, and where it came from. */
export type Provenance = 'nasa' | 'calculated' | 'assumption';

export interface Sourced<T = number> {
  value: T;
  provenance: Provenance;
  /** Short note: the fallback assumption, or "estimated" for a mass from a mass–radius relation. */
  note?: string;
}

export interface Planet {
  id: string;
  officialName: string;
  nickname: string;
  iauName?: string;
  tier: Difficulty;
  archive: ArchiveRow;
  // Derived (calculated from NASA data, or game assumption when not measured)
  distanceLy: Sourced;
  radiusEarth: Sourced;
  massEarth: Sourced;
  massEstimated: boolean;
  gravityG: Sourced;
  orbitalSpeedKms: Sourced;
  tempK: Sourced;
  missionType: MissionType;
  typeLabel: string;
  typeReason: string;
  lavaSurface: boolean;
  overviewUrl: string;
  catalogSearchUrl: string;
}
