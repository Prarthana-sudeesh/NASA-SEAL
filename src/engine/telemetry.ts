import type { Difficulty, Planet } from '../data/types.ts';
import { A } from './constants.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { requirements } from './mission.ts';
import { resolveParts, rocketStats, type Design } from './rocket.ts';
import { crewMultiplier } from './score.ts';

export type Level = 'good' | 'warn' | 'bad' | 'auto' | 'empty';

export interface Stat {
  id: string;
  label: string;
  friendly: string;
  value: string;
  target: string;
  level: Level;
  /** 0..1+ gauge fill (have ÷ need). */
  ratio: number;
  hint: string;
  explain: { what: string; why: string; formula: string };
}

const f1 = (n: number) => n.toFixed(1);
const tonnes = (kg: number) => `${(kg / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} t`;

export function telemetry(design: Design, planet: Planet, difficulty: Difficulty, crew: number): Stat[] {
  const cfg = DIFFICULTIES[difficulty];
  const p = resolveParts(design);
  const s = rocketStats(design, crew);
  const req = requirements(planet);
  const dist = planet.distanceLy.value;
  const hasEngine = !!p.engine;
  const hasTanks = p.tanks.length > 0;
  const out: Stat[] = [];

  out.push({
    id: 'mass', label: 'Total mass', friendly: 'How heavy', value: tonnes(s.wetMassKg), target: `pad limit ${tonnes(A.maxLaunchMassKg)}`,
    level: s.wetMassKg === 0 ? 'empty' : s.wetMassKg > A.maxLaunchMassKg ? 'bad' : s.wetMassKg > A.maxLaunchMassKg * 0.9 ? 'warn' : 'good',
    ratio: s.wetMassKg / A.maxLaunchMassKg,
    hint: s.wetMassKg > A.maxLaunchMassKg ? 'Too heavy for the launch pad! Use fewer or smaller tanks.' : 'Mass is fine.',
    explain: { what: 'Everything on the pad: parts, crew and all the propellant.', why: 'Heavier rockets need more thrust to lift off and more fuel to speed up.', formula: 'm₀ = parts + crew + propellant' },
  });

  const over = s.cost > cfg.budget;
  out.push({
    id: 'cost', label: 'Cost', friendly: 'Money spent', value: `$${s.cost}M`, target: `budget $${cfg.budget}M`,
    level: s.cost === 0 ? 'empty' : over ? 'bad' : s.cost > cfg.budget * 0.9 ? 'warn' : 'good',
    ratio: s.cost / cfg.budget,
    hint: over ? (cfg.overBudgetBlocksLaunch ? 'Over budget: Flight Directors can’t launch until it fits.' : 'Over budget: you can fly, but you’ll get no budget points.') : 'Within budget.',
    explain: { what: 'The total price of every part.', why: 'Spending less (while still succeeding) earns budget points.', formula: 'cost = Σ part prices' },
  });

  out.push({
    id: 'twr', label: 'Thrust-to-weight', friendly: 'Lift-off power', value: hasEngine ? s.twr.toFixed(2) : '—', target: `≥ ${A.minTwr}`,
    level: !hasEngine || !hasTanks ? 'empty' : s.twr < A.minTwr ? 'bad' : s.twr < 1.3 || s.twr > 3 ? 'warn' : 'good',
    ratio: s.twr / A.minTwr,
    hint: s.twr < A.minTwr ? 'Too heavy to lift off. Try a stronger engine or fewer tanks.' : s.twr > 3 ? 'Loads of lift-off power: a smaller engine could save money.' : s.twr < 1.3 ? 'Only just enough lift-off power. It will fly, but a little more thrust gives a better score.' : 'Enough push to leave the pad.',
    explain: { what: 'How hard the engine pushes compared with the rocket’s weight.', why: 'Below 1 the rocket can’t even rise; real rockets launch at about 1.2–1.5.', formula: 'TWR = thrust ÷ (m₀ × 9.81)' },
  });

  const dvEarthOk = s.dvKms >= req.earthLegKms;
  out.push({
    id: 'dv_earth', label: 'Δv to orbit', friendly: 'Rocket power: Earth launch', value: `${f1(s.dvKms)} km/s`, target: `need ${f1(req.earthLegKms)}`,
    level: !hasEngine || !hasTanks ? 'empty' : !s.propellantMatch ? 'bad' : !dvEarthOk ? 'bad' : s.dvKms < req.earthLegKms * 1.04 ? 'warn' : 'good',
    ratio: s.dvKms / req.earthLegKms,
    hint: !s.propellantMatch ? 'Your tanks hold a different propellant from your engine! Match them.' : !dvEarthOk ? 'Not enough power to reach orbit. Add a tank or pick a higher-Isp engine.' : s.dvKms < req.earthLegKms * 1.04 ? 'Only just enough power to reach orbit: very little to spare.' : 'Enough power to reach Earth orbit.',
    explain: { what: 'Δv (“delta-v”) is how much the rocket can change its speed.', why: 'Getting from the ground to orbit costs about 9.4 km/s including losses.', formula: 'Δv = Isp × 9.81 × ln(m₀ ÷ m_f), per tank, dropping empty tanks' },
  });

  const deepOk = s.dvVacKms >= req.deepNeededKms;
  out.push({
    id: 'dv_deep', label: 'Δv in space', friendly: planet.missionType === 'land' ? 'Rocket power: landing & take-off' : 'Rocket power: orbit survey', value: `${f1(s.dvVacKms)} km/s`, target: `need ${f1(req.deepNeededKms)}`,
    level: !hasEngine || !hasTanks ? 'empty' : !s.propellantMatch || !deepOk ? 'bad' : s.dvVacKms < req.deepNeededKms * 1.04 ? 'warn' : 'good',
    ratio: s.dvVacKms / req.deepNeededKms,
    hint: !deepOk ? `The trip from orbit needs ${f1(req.deepNeededKms)} km/s. Add a tank, lighten the payload, or use a higher-Isp engine.` : s.dvVacKms < req.deepNeededKms * 1.04 ? 'Only just enough power for the planet and the trip home.' : 'Enough power for the planet and the trip home.',
    explain: { what: 'Δv after refuelling in Earth orbit, using the engine’s vacuum Isp.', why: planet.missionType === 'land' ? 'Taking off from a planet costs about 1.2 × its orbital speed.' : 'Entering and leaving orbit costs a little Δv each.', formula: 'Δv = Isp_vac × 9.81 × ln(m₀ ÷ m_f)' },
  });

  const range = p.drive?.rangeLy ?? 0;
  out.push({
    id: 'drive', label: 'Drive range', friendly: 'Deep-Space Drive reach', value: p.drive ? `${range.toLocaleString('en-US')} ly` : '—', target: `need ${Math.ceil(req.driveRangeLy).toLocaleString('en-US')} ly`,
    level: !p.drive ? 'empty' : range < req.driveRangeLy ? 'bad' : range > req.driveRangeLy * 8 ? 'warn' : 'good',
    ratio: range / req.driveRangeLy,
    hint: range < dist ? 'This drive can’t even reach the planet. Pick a longer-range drive.' : range < req.driveRangeLy ? 'You’d get there but not back! Pick a longer-range drive.' : range > req.driveRangeLy * 8 ? 'Way more range than needed: a cheaper drive would do.' : 'Range covers the round trip.',
    explain: { what: 'How far the imaginary interstellar drive can take you in total.', why: 'It must cover the distance twice: there and back.', formula: 'range ≥ 2 × distance' },
  });

  const comms = p.comms?.rangeLy ?? 0;
  out.push({
    id: 'comms', label: 'Comms range', friendly: 'Talk to Earth', value: p.comms ? `${comms.toLocaleString('en-US')} ly` : '—', target: `need ${f1(dist)} ly`,
    level: !p.comms ? 'empty' : !cfg.checks.comms ? 'auto' : comms < dist ? 'bad' : 'good',
    ratio: comms / dist,
    hint: !cfg.checks.comms ? 'Comms are simplified at Cadet level.' : comms < dist ? 'Mission Control won’t hear you out there. Fit a longer-range dish.' : 'Mission Control will hear you.',
    explain: { what: 'How far your antenna can send messages home.', why: `Even at light speed, a message from here takes ${f1(dist)} years to reach Earth!`, formula: 'comms range ≥ distance' },
  });

  const heatChecked = cfg.checks.heat;
  const shieldT = p.shield?.maxTempK ?? 0;
  out.push({
    id: 'heat', label: 'Shield rating', friendly: 'Heat protection', value: p.shield ? `${shieldT.toLocaleString('en-US')} K` : 'none', target: `planet ${Math.round(req.shieldTempK).toLocaleString('en-US')} K + re-entry`,
    level: !heatChecked ? 'auto' : !p.shield ? 'bad' : shieldT < req.shieldTempK || !p.shield.reentryRated ? 'bad' : 'good',
    ratio: shieldT / Math.max(1, req.shieldTempK),
    hint: !heatChecked ? 'Heat is simplified at Cadet level.' : !p.shield ? 'No shield! You need one for the planet and for re-entry at home.' : !p.shield.reentryRated ? 'That shield can’t survive Earth re-entry.' : shieldT < req.shieldTempK ? 'The planet is hotter than your shield can take.' : 'Shield can take the heat.',
    explain: { what: 'The hottest temperature your shield can handle.', why: 'Hot planets and coming home through Earth’s air both heat the ship.', formula: 'shield ≥ planet temperature, and re-entry rated' },
  });

  const liquid = p.engine && p.engine.propellant !== 'solid';
  const prsOk = !liquid || (!!p.pressure && p.pressure.suits.includes(p.engine!.propellant) && p.pressure.capacityKg >= s.propellantKg);
  out.push({
    id: 'pressure', label: 'Tank pressure', friendly: 'Pressure system', value: p.pressure ? `${Math.round((s.propellantKg / p.pressure.capacityKg) * 100)}% used` : liquid ? 'none' : 'not needed',
    target: liquid ? `holds ${tonnes(s.propellantKg)}` : 'solid fuel',
    level: !cfg.checks.pressure ? 'auto' : prsOk ? 'good' : 'bad',
    ratio: p.pressure ? s.propellantKg / p.pressure.capacityKg : liquid ? 2 : 0,
    hint: !cfg.checks.pressure ? 'Pressure is simplified below Flight Director level.' : prsOk ? 'Tanks stay pressurised.' : !p.pressure ? 'Liquid tanks need a pressure system!' : !p.pressure.suits.includes(p.engine!.propellant) ? 'That pressure system doesn’t suit your propellant.' : 'Too much propellant for this pressure system.',
    explain: { what: 'Gas that pushes fuel out of the tanks into the engine.', why: 'Without it the fuel stops flowing and thin tanks can buckle.', formula: 'capacity ≥ propellant mass; type must suit the tanks' },
  });

  if (cfg.checks.radiation) {
    const rad = p.shield?.radiation ?? 0;
    out.push({
      id: 'radiation', label: 'Radiation', friendly: 'Crew protection', value: `rating ${rad}`, target: crew > 0 ? `need ${A.crewRadiationMin}` : 'no crew',
      level: crew === 0 ? 'good' : rad >= A.crewRadiationMin ? 'good' : 'bad', ratio: rad / A.crewRadiationMin,
      hint: crew > 0 && rad < A.crewRadiationMin ? 'Your crew needs a shield with radiation rating 2 or more.' : 'Crew are protected.',
      explain: { what: 'How well the shield blocks cosmic rays.', why: 'Long trips through deep space expose astronauts to harmful radiation.', formula: 'crewed → rating ≥ 2' },
    });
  }

  const m = crewMultiplier(true, crew);
  out.push({
    id: 'crew', label: 'Astronaut gamble', friendly: 'Crew multiplier', value: `×${m.toFixed(1)} / ×${crewMultiplier(false, crew).toFixed(2)}`, target: 'win / lose',
    level: crew === 0 ? 'good' : 'warn', ratio: m / 1.4,
    hint: crew === 0 ? 'No crew: safe, but no bonus.' : `${crew} astronaut${crew > 1 ? 's' : ''}: score × ${m.toFixed(1)} if it works, × ${crewMultiplier(false, crew).toFixed(2)} if it fails.`,
    explain: { what: 'Astronauts multiply your score, for better or worse.', why: 'Crewed missions are worth more, but failures cost more.', formula: 'success × (1 + 0.1 × crew); failure × (1 − 0.15 × crew)' },
  });
  return out;
}

/** Cass's one-line hint: the most urgent problem first. */
export function cassHint(stats: Stat[]): { text: string; mood: 'happy' | 'worried' | 'thinking' } {
  const order: Level[] = ['bad', 'warn'];
  for (const lvl of order) {
    const s = stats.find((x) => x.level === lvl && x.id !== 'crew');
    if (s) return { text: s.hint, mood: lvl === 'bad' ? 'worried' : 'thinking' };
  }
  if (stats.some((s) => s.level === 'empty')) return { text: 'Drag parts from the drawer onto the glowing slots to build your rocket.', mood: 'happy' };
  return { text: 'Looking great! Head to the pre-launch check when you’re ready.', mood: 'happy' };
}
