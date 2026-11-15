import {
  getPart,
  type DrivePart,
  type CommsPart,
  type EnginePart,
  type PodPart,
  type PressurePart,
  type ShieldPart,
  type SlotId,
  type TankPart,
} from '../data/components.ts';
import { A, G0 } from './constants.ts';

export type Design = Partial<Record<SlotId, string | null>>;

export const TANK_SLOTS = ['tank0', 'tank1', 'tank2'] as const;

export interface Parts {
  pod?: PodPart;
  engine?: EnginePart;
  drive?: DrivePart;
  tanks: TankPart[]; // bottom (tank0) first
  comms?: CommsPart;
  pressure?: PressurePart;
  shield?: ShieldPart;
}

function pick<K extends string>(design: Design, slot: SlotId, kind: K) {
  const p = getPart(design[slot]);
  return p && p.kind === kind ? p : undefined;
}

export function resolveParts(design: Design): Parts {
  return {
    pod: pick(design, 'pod', 'pod') as PodPart | undefined,
    engine: pick(design, 'engine', 'engine') as EnginePart | undefined,
    drive: pick(design, 'drive', 'drive') as DrivePart | undefined,
    tanks: TANK_SLOTS.map((s) => pick(design, s, 'tank') as TankPart | undefined).filter((t): t is TankPart => !!t),
    comms: pick(design, 'comms', 'comms') as CommsPart | undefined,
    pressure: pick(design, 'pressure', 'pressure') as PressurePart | undefined,
    shield: pick(design, 'shield', 'shield') as ShieldPart | undefined,
  };
}

/** Tsiolkovsky rocket equation, km/s: Δv = Isp × g₀ × ln(m₀ / m_f). */
export function tsiolkovskyKms(ispS: number, m0: number, mf: number): number {
  if (m0 <= 0 || mf <= 0 || m0 < mf) return 0;
  return (ispS * G0 * Math.log(m0 / mf)) / 1000;
}

export interface StageResult {
  tankName: string;
  m0Kg: number;
  mfKg: number;
  dvKms: number;
}

export interface RocketStats {
  cost: number;
  /** Everything that is never dropped: pod, crew, engine, drive, comms, pressure, shield. */
  coreMassKg: number;
  crewMassKg: number;
  propellantKg: number;
  tankDryKg: number;
  /** m₀: fully fuelled lift-off mass */
  wetMassKg: number;
  /** m_f: dry mass with every tank still attached (what the plain one-stage formula uses) */
  dryMassKg: number;
  thrustKN: number;
  isp: number;
  /** Lift-off thrust-to-weight = thrust / (m₀ × g₀) */
  twr: number;
  /** Δv with empty tanks dropped one by one (bottom first). Equals the one-stage formula for a single tank. */
  dvKms: number;
  /** Same staging with vacuum Isp: the burns after refuelling in Earth orbit happen in space. */
  dvVacKms: number;
  ispVac: number;
  /** Δv if no tank were dropped: Isp × g₀ × ln(m₀/m_f). Shown for comparison. */
  dvNoStagingKms: number;
  stages: StageResult[];
  propellantMatch: boolean;
}

export function rocketStats(design: Design, crew: number): RocketStats {
  const p = resolveParts(design);
  const crewMassKg = crew * A.crewMassKg;
  const fixed = [p.pod, p.engine, p.drive, p.comms, p.pressure, p.shield];
  const coreMassKg = fixed.reduce((s, x) => s + (x?.massKg ?? 0), 0) + crewMassKg;
  const propellantKg = p.tanks.reduce((s, t) => s + t.propellantKg, 0);
  const tankDryKg = p.tanks.reduce((s, t) => s + t.massKg, 0);
  const wetMassKg = coreMassKg + propellantKg + tankDryKg;
  const dryMassKg = coreMassKg + tankDryKg;
  const cost = [...fixed, ...p.tanks].reduce((s, x) => s + (x?.cost ?? 0), 0);
  const thrustKN = p.engine?.thrustKN ?? 0;
  const isp = p.engine?.ispS ?? 0;
  const ispVac = p.engine?.ispVacS ?? 0;
  const propellantMatch = !!p.engine && p.tanks.every((t) => t.propellant === p.engine!.propellant);

  // Drop-tank staging: burn tank0, drop its empty shell, then tank1, …  (engine stays on).
  const stages: StageResult[] = [];
  let m = wetMassKg;
  let dv = 0;
  let dvVac = 0;
  for (const t of p.tanks) {
    const m0 = m;
    const mf = m - t.propellantKg;
    const sdv = propellantMatch ? tsiolkovskyKms(isp, m0, mf) : 0;
    stages.push({ tankName: t.name, m0Kg: m0, mfKg: mf, dvKms: sdv });
    dv += sdv;
    dvVac += propellantMatch ? tsiolkovskyKms(ispVac, m0, mf) : 0;
    m = mf - t.massKg;
  }

  return {
    cost,
    coreMassKg,
    crewMassKg,
    propellantKg,
    tankDryKg,
    wetMassKg,
    dryMassKg,
    thrustKN,
    isp,
    twr: wetMassKg > 0 ? (thrustKN * 1000) / (wetMassKg * G0) : 0,
    dvKms: dv,
    dvVacKms: dvVac,
    ispVac,
    dvNoStagingKms: propellantMatch ? tsiolkovskyKms(isp, wetMassKg, dryMassKg) : 0,
    stages,
    propellantMatch,
  };
}
