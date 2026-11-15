import snapshot from './planets.json' with { type: 'json' };
import { PLANET_LIST } from './planetList.ts';
import type { ArchiveRow, Planet, Sourced } from './types.ts';

export const PARSEC_TO_LY = 3.2616;
/** Gameplay rule: radius ≤ 1.6 Earth radii → probably rocky (land); larger → probably gas/ice-rich (orbit). */
export const ROCKY_RADIUS_LIMIT = 1.6;

/** Fallbacks used only when the archive has no value. Shown in "Game assumptions". */
export const FALLBACK = {
  tempK: 300,
  radiusEarth: 1,
  massEarth: 1,
  distancePc: 10,
} as const;

export const DATA_SOURCE = {
  name: snapshot.source,
  url: snapshot.sourceUrl,
  table: snapshot.table,
  retrievedAt: snapshot.retrievedAt,
  placeholder: snapshot.placeholder,
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function sourced(value: number | null, fallback: number, what: string): Sourced {
  return value === null
    ? { value: fallback, provenance: 'assumption', note: `${what} not measured; the game assumes ${fallback}` }
    : { value, provenance: 'nasa' };
}

export function overviewUrl(plName: string) {
  return `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(plName)}`;
}
export function catalogSearchUrl(plName: string) {
  return `https://science.nasa.gov/exoplanets/exoplanet-catalog/?search=${encodeURIComponent(plName)}`;
}

/** Light-years = parsecs × 3.2616 */
export const parsecsToLy = (pc: number) => pc * PARSEC_TO_LY;
/** Surface gravity in Earth g = M / R² (both in Earth units). */
export const surfaceGravityG = (massEarth: number, radiusEarth: number) => massEarth / radiusEarth ** 2;
/** Speed to orbit just above the surface, km/s ≈ 7.9 × √(M / R). Earth = 7.9 km/s. */
export const orbitalSpeedKms = (massEarth: number, radiusEarth: number) => 7.9 * Math.sqrt(massEarth / radiusEarth);

/** True when pl_bmassprov says the mass is not a direct measurement. */
export function massKind(prov: string | null): 'measured' | 'minimum' | 'estimated' {
  if (!prov) return 'estimated';
  const p = prov.toLowerCase();
  if (p.includes('m-r') || p.includes('relation')) return 'estimated';
  if (p.includes('sin')) return 'minimum';
  return 'measured';
}

export function derivePlanet(entry: (typeof PLANET_LIST)[number], a: ArchiveRow): Planet {
  const pc = sourced(num(a.sy_dist), FALLBACK.distancePc, 'Distance');
  const R = sourced(num(a.pl_rade), FALLBACK.radiusEarth, 'Radius');
  const M = sourced(num(a.pl_bmasse), FALLBACK.massEarth, 'Mass');
  const T = sourced(num(a.pl_eqt), FALLBACK.tempK, 'Temperature');
  const mk = massKind(a.pl_bmassprov);
  if (M.provenance === 'nasa') {
    if (mk === 'estimated') M.note = 'estimated from the planet’s size (mass–radius relation), not measured';
    if (mk === 'minimum') M.note = 'minimum mass (M sin i): the true mass may be higher';
  }
  const derivedProv = (...xs: Sourced[]) => (xs.some((x) => x.provenance === 'assumption') ? 'assumption' : 'calculated');

  const byRule = R.value <= ROCKY_RADIUS_LIMIT ? 'rocky' : 'gas';
  const type = entry.typeOverride === 'auto' ? byRule : entry.typeOverride;
  const typeReason =
    entry.typeOverride === 'auto'
      ? `Game rule: radius ${R.value.toFixed(2)} Earth radii is ${byRule === 'rocky' ? 'at or under' : 'over'} 1.6, so it is treated as ${byRule === 'rocky' ? 'probably rocky' : 'probably gas/ice-rich with no solid surface'}.`
      : `Game override: treated as rocky (NASA describes it as likely covered in magma).`;
  const reason = entry.orbitOnly ? `${typeReason} ${entry.orbitOnly}` : typeReason;

  return {
    id: entry.id,
    officialName: a.pl_name,
    nickname: entry.nickname,
    iauName: entry.iauName,
    tier: entry.tier,
    archive: a,
    distanceLy: { value: parsecsToLy(pc.value), provenance: derivedProv(pc), note: pc.note },
    radiusEarth: R,
    massEarth: M,
    massEstimated: mk !== 'measured',
    gravityG: { value: surfaceGravityG(M.value, R.value), provenance: derivedProv(M, R) },
    orbitalSpeedKms: { value: orbitalSpeedKms(M.value, R.value), provenance: derivedProv(M, R) },
    tempK: T,
    missionType: type === 'rocky' && !entry.orbitOnly ? 'land' : 'orbit',
    typeLabel: type === 'rocky' ? 'Probably rocky' : 'Probably gas/ice-rich',
    typeReason: reason,
    lavaSurface: !!entry.lavaSurface,
    overviewUrl: overviewUrl(a.pl_name),
    catalogSearchUrl: catalogSearchUrl(a.pl_name),
  };
}

const rows = new Map(snapshot.planets.map((p) => [p.id, p.archive as unknown as ArchiveRow]));

export const PLANETS: Planet[] = PLANET_LIST.filter((e) => rows.has(e.id)).map((e) => derivePlanet(e, rows.get(e.id)!));

export const getPlanet = (id: string) => PLANETS.find((p) => p.id === id);
