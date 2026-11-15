// Fetches the game's planets from the NASA Exoplanet Archive (NExScI/Caltech, operated for NASA)
// TAP service and writes src/data/planets.json. Run with: npm run fetch-planets
//
// The game never fetches at runtime: it ships the committed snapshot so it works offline.
// Planets that can't be found are dropped and reported. No value is ever invented here.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANET_LIST } from '../src/data/planetList.ts';

const TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const TABLE = 'pscomppars';
const COLUMNS = [
  'pl_name',
  'hostname',
  'sy_dist',
  'pl_rade',
  'pl_bmasse',
  'pl_bmassprov',
  'pl_eqt',
  'pl_orbper',
  'pl_orbsmax',
  'st_spectype',
  'sy_snum',
  'sy_pnum',
  'discoverymethod',
  'disc_year',
  'disc_facility',
] as const;

type Row = Record<(typeof COLUMNS)[number], string | number | null>;

async function tap(query: string): Promise<Row[]> {
  const url = `${TAP}?query=${encodeURIComponent(query)}&format=json`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Row[];
    } catch (err) {
      console.warn(`  attempt ${attempt} failed: ${(err as Error).message}`);
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  return [];
}

/** Case, space, hyphen and apostrophe-insensitive key (Teegarden's vs Teegardens, "Cen b" vs "Cen  b"). */
export const tolerantKey = (s: string) => s.toLowerCase().replace(/[\s'’`\-_.]/g, '');

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const wanted = PLANET_LIST.map((p) => p.officialName);
  console.log(`Querying ${TABLE} for ${wanted.length} planets…`);
  const exact = await tap(
    `select ${COLUMNS.join(',')} from ${TABLE} where pl_name in (${wanted.map(quote).join(',')})`,
  );
  const byName = new Map(exact.map((r) => [String(r.pl_name), r]));

  const missing = wanted.filter((n) => !byName.has(n));
  const tolerantMatches: string[] = [];
  if (missing.length) {
    console.log(`No exact match for ${missing.length}; trying tolerant matching…`);
    const all = await tap(`select pl_name from ${TABLE}`);
    const index = new Map(all.map((r) => [tolerantKey(String(r.pl_name)), String(r.pl_name)]));
    const resolved = missing
      .map((n) => [n, index.get(tolerantKey(n))] as const)
      .filter((x): x is readonly [string, string] => !!x[1]);
    if (resolved.length) {
      const rows = await tap(
        `select ${COLUMNS.join(',')} from ${TABLE} where pl_name in (${resolved.map((x) => quote(x[1])).join(',')})`,
      );
      for (const [asked, found] of resolved) {
        const row = rows.find((r) => r.pl_name === found);
        if (row) {
          byName.set(asked, row);
          tolerantMatches.push(`${asked} → ${found}`);
        }
      }
    }
  }

  const notFound = wanted.filter((n) => !byName.has(n));
  const planets = PLANET_LIST.filter((p) => byName.has(p.officialName)).map((p) => ({
    id: p.id,
    archive: byName.get(p.officialName)!,
  }));

  const out = {
    source: 'NASA Exoplanet Archive',
    sourceUrl: 'https://exoplanetarchive.ipac.caltech.edu/',
    table: TABLE,
    columns: COLUMNS,
    retrievedAt: new Date().toISOString().slice(0, 10),
    placeholder: false,
    planets,
  };
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/planets.json');
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

  console.log(`\nWrote ${planets.length}/${wanted.length} planets to src/data/planets.json`);
  if (tolerantMatches.length) console.log('Tolerant matches:\n  ' + tolerantMatches.join('\n  '));
  if (notFound.length) {
    console.log('NOT FOUND (dropped from the game, no data invented):\n  ' + notFound.join('\n  '));
  }
  for (const { id, archive } of planets) {
    const gaps = COLUMNS.filter((c) => archive[c] === null || archive[c] === '');
    if (gaps.length) console.log(`  ${id}: not measured → ${gaps.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('\nFetch failed:', (err as Error).message);
  console.error('Keep the committed planets.json and re-run later: npm run fetch-planets');
  process.exit(1);
});
