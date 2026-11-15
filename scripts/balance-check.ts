// Exhaustive balance check: every legal rocket on every planet at its own difficulty.
// Prints whether each mission can be won within budget, the cheapest winning cost, and the best score.
// Run with: npm run balance-check   (exits 1 if any planet is unwinnable within its budget)
import { COMMS, DRIVES, ENGINES, PODS, PRESSURE, SHIELDS, TANKS } from '../src/data/components.ts';
import { PLANETS } from '../src/data/planets.ts';
import { DIFFICULTIES } from '../src/engine/difficulty.ts';
import { evaluateMission, launchBlockers, requirements } from '../src/engine/mission.ts';
import type { Design } from '../src/engine/rocket.ts';

let bad = 0;
for (const planet of PLANETS) {
  const diff = planet.tier;
  const budget = DIFFICULTIES[diff].budget;
  let wins = 0;
  let winsInBudget = 0;
  let cheapest = Infinity;
  let best = { total: 0, desc: '' };
  let total = 0;
  for (const engine of ENGINES) {
    const tanks = TANKS.filter((t) => t.propellant === engine.propellant);
    const opt = [null, ...tanks];
    for (const t0 of tanks)
      for (const t1 of opt)
        for (const t2 of opt) {
          if (!t1 && t2) continue;
          for (const pod of PODS)
            for (const drive of DRIVES)
              for (const comms of COMMS)
                for (const pressure of [null, ...PRESSURE])
                  for (const shield of [null, ...SHIELDS])
                    for (let crew = 0; crew <= pod.seats; crew++) {
                      const design: Design = {
                        pod: pod.id, engine: engine.id, drive: drive.id, comms: comms.id,
                        tank0: t0.id, tank1: t1?.id ?? null, tank2: t2?.id ?? null,
                        pressure: pressure?.id ?? null, shield: shield?.id ?? null,
                      };
                      if (launchBlockers(design, diff, crew).length) continue;
                      total++;
                      const r = evaluateMission(design, planet, diff, crew);
                      if (!r.success) continue;
                      wins++;
                      if (r.stats.cost <= budget) winsInBudget++;
                      cheapest = Math.min(cheapest, r.stats.cost);
                      if (r.score.total > best.total)
                        best = {
                          total: r.score.total,
                          desc: `${engine.name} + ${[t0, t1, t2].filter(Boolean).map((t) => t!.name).join('/')} · ${pod.name} ×${crew} · $${r.stats.cost}M · Δv ${r.stats.dvKms.toFixed(1)}/${r.req.earthLegKms.toFixed(1)} vac ${r.stats.dvVacKms.toFixed(1)}/${r.req.deepNeededKms.toFixed(1)}`,
                        };
                    }
        }
  }
  const req = requirements(planet);
  const ok = winsInBudget > 0;
  if (!ok) bad++;
  console.log(
    `${ok ? '✓' : '✗'} [${DIFFICULTIES[diff].label.padEnd(15)}] ${planet.officialName.padEnd(18)} ${planet.missionType.padEnd(5)} deep ${req.deepNeededKms.toFixed(1).padStart(4)} km/s` +
      ` | wins ${String(winsInBudget).padStart(6)}/${String(total).padStart(6)} in budget (${wins} any) | cheapest $${cheapest}M of $${budget}M | best ${best.total}\n      ${best.desc}`,
  );
}
process.exit(bad ? 1 : 0);
