// Rocket parts. Stats are modelled on real hardware where real hardware exists (the "realWorld"
// line says which); parts that can't exist today carry fictional: true and show an "Imaginary tech" badge.
// Costs are game money in millions of dollars ($M) and are simplified, not real prices.

export type Category = 'payload' | 'thrusters' | 'tanks' | 'comms' | 'pressure' | 'shield';
export type SlotId = 'pod' | 'engine' | 'drive' | 'tank0' | 'tank1' | 'tank2' | 'comms' | 'pressure' | 'shield';
export type Propellant = 'solid' | 'kerolox' | 'hydrolox';

interface Base {
  id: string;
  name: string;
  category: Category;
  cost: number; // $M
  massKg: number;
  description: string;
  funDescription: string;
  realWorld?: string;
  fictional?: boolean;
}

export interface PodPart extends Base {
  kind: 'pod';
  seats: number;
  lifeSupport: boolean;
}
export interface EnginePart extends Base {
  kind: 'engine';
  thrustKN: number;
  /** Average specific impulse during the climb from Earth (between sea-level and vacuum values). */
  ispS: number;
  /** Vacuum specific impulse, used for burns in space after refuelling in orbit. */
  ispVacS: number;
  propellant: Propellant;
}
export interface DrivePart extends Base {
  kind: 'drive';
  rangeLy: number;
  fictional: true;
}
export interface TankPart extends Base {
  kind: 'tank';
  propellantKg: number;
  /** Empty tank mass. massKg = dry mass (what's left after the propellant burns). */
  propellant: Propellant;
}
export interface CommsPart extends Base {
  kind: 'comms';
  rangeLy: number;
}
export interface PressurePart extends Base {
  kind: 'pressure';
  /** Propellant types it can pressurise. */
  suits: Propellant[];
  /** Most propellant (kg) it can keep pressurised. */
  capacityKg: number;
  pressurisation: string;
}
export interface ShieldPart extends Base {
  kind: 'shield';
  maxTempK: number;
  reentryRated: boolean;
  /** 0 = none, 3 = best. Crewed Flight Director missions need 2 or more. */
  radiation: number;
}

export type Part = PodPart | EnginePart | DrivePart | TankPart | CommsPart | PressurePart | ShieldPart;

export const PODS: PodPart[] = [
  {
    id: 'pod-probe', kind: 'pod', name: 'Peekaboo Probe', category: 'payload', cost: 15, massKg: 1500,
    seats: 0, lifeSupport: false,
    description: 'Robotic science probe with cameras and sensors. No room for people.',
    funDescription: 'A brave little robot that goes where people can’t (yet).',
    realWorld: 'Similar in mass to NASA’s Juno or New Horizons-class probes (0.5–3.6 t).',
  },
  {
    id: 'pod-duo', kind: 'pod', name: 'Buddy Capsule', category: 'payload', cost: 55, massKg: 5000,
    seats: 2, lifeSupport: true,
    description: 'Two-seat capsule with life support.',
    funDescription: 'Cosy for two. Bring snacks.',
    realWorld: 'Between NASA’s Gemini (3.8 t, 2 seats) and Apollo command module (5.8 t, 3 seats).',
  },
  {
    id: 'pod-quad', kind: 'pod', name: 'Family Explorer', category: 'payload', cost: 95, massKg: 9500,
    seats: 4, lifeSupport: true,
    description: 'Four-seat deep-space capsule with life support.',
    funDescription: 'Room for the whole crew and a tiny window each.',
    realWorld: 'Close to NASA’s Orion crew module (about 9–10 t, 4 seats).',
  },
];

export const ENGINES: EnginePart[] = [
  {
    id: 'eng-solid', kind: 'engine', name: 'Sparky Solid Booster', category: 'thrusters', cost: 30, massKg: 6000,
    thrustKN: 5000, ispS: 250, ispVacS: 268, propellant: 'solid',
    description: 'Solid-fuel motor: huge, cheap push but low efficiency (Isp 250 s climbing, 268 s in space). Needs solid fuel segments.',
    funDescription: 'A giant firework. Loud, simple, can’t be switched off!',
    realWorld: 'The Space Shuttle’s solid boosters had Isp of about 242 s at sea level and 268 s in vacuum.',
  },
  {
    id: 'eng-kero9', kind: 'engine', name: 'Kero Nine-Pack', category: 'thrusters', cost: 100, massKg: 5000,
    thrustKN: 7600, ispS: 295, ispVacS: 311, propellant: 'kerolox',
    description: 'Nine kerosene/liquid-oxygen engines firing together (Isp 295 s climbing, 311 s in space).',
    funDescription: 'Nine engines in a ring. Teamwork makes the rocket work.',
    realWorld: 'Like a Falcon 9 first stage: nine Merlin engines, about 7,600 kN, Isp 282 s at sea level and 311 s in vacuum.',
  },
  {
    id: 'eng-hydro2', kind: 'engine', name: 'HydroLox Hero', category: 'thrusters', cost: 150, massKg: 7000,
    thrustKN: 4560, ispS: 420, ispVacS: 452, propellant: 'hydrolox',
    description: 'Two hydrogen/liquid-oxygen engines: the most efficient chemical rockets (Isp 420 s climbing, 452 s in space).',
    funDescription: 'Burns the lightest stuff in the universe. Super efficient, super pricey.',
    realWorld: 'Two RS-25-class engines (each about 2,280 kN and 3.5 t; Isp 366 s at sea level, 452 s in vacuum).',
  },
  {
    id: 'eng-hydro4', kind: 'engine', name: 'HydroLox Quad Squad', category: 'thrusters', cost: 260, massKg: 14000,
    thrustKN: 9120, ispS: 420, ispVacS: 452, propellant: 'hydrolox',
    description: 'Four hydrogen/liquid-oxygen engines: double the push of the Hero, same efficiency.',
    funDescription: 'Four super-efficient engines. The heavy lifter.',
    realWorld: 'NASA’s SLS core stage flies four RS-25 engines.',
  },
];

export const DRIVES: DrivePart[] = [
  {
    id: 'drv-hop', kind: 'drive', name: 'Pocket Hopper Drive', category: 'thrusters', cost: 25, massKg: 500,
    rangeLy: 30, fictional: true,
    description: 'Imaginary interstellar drive. Range 30 light-years in total.',
    funDescription: 'Hops to the closest stars and back.',
  },
  {
    id: 'drv-stride', kind: 'drive', name: 'Star Strider Drive', category: 'thrusters', cost: 60, massKg: 1000,
    rangeLy: 300, fictional: true,
    description: 'Imaginary interstellar drive. Range 300 light-years in total.',
    funDescription: 'Long legs for long trips.',
  },
  {
    id: 'drv-leap', kind: 'drive', name: 'Galaxy Leaper Drive', category: 'thrusters', cost: 110, massKg: 1500,
    rangeLy: 1500, fictional: true,
    description: 'Imaginary interstellar drive. Range 1,500 light-years in total.',
    funDescription: 'Leaps across a whole patch of the Milky Way.',
  },
  {
    id: 'drv-loop', kind: 'drive', name: 'Infinity Loop Drive', category: 'thrusters', cost: 180, massKg: 2500,
    rangeLy: 4000, fictional: true,
    description: 'Imaginary interstellar drive. Range 4,000 light-years in total.',
    funDescription: 'Goes further than any other drive in the workshop.',
  },
];

export const TANKS: TankPart[] = [
  {
    id: 'tank-solid', kind: 'tank', name: 'Sparky Fuel Segment', category: 'tanks', cost: 18, massKg: 14000,
    propellantKg: 120000, propellant: 'solid',
    description: 'Solid propellant segment: 120 t of fuel in a heavy 14 t steel case.',
    funDescription: 'Packed like a giant crayon of rocket fuel.',
    realWorld: 'Solid booster cases are heavy: about 10–15% of the propellant mass.',
  },
  {
    id: 'tank-kero-s', kind: 'tank', name: 'Kero Tank Mini', category: 'tanks', cost: 10, massKg: 2500,
    propellantKg: 60000, propellant: 'kerolox',
    description: 'Kerosene + liquid oxygen tank: 60 t of propellant, 2.5 t empty.',
    funDescription: 'Small, cheap and light.',
    realWorld: 'Aluminium-lithium kerosene tanks weigh about 4% of their propellant.',
  },
  {
    id: 'tank-kero-l', kind: 'tank', name: 'Kero Tank Mega', category: 'tanks', cost: 25, massKg: 7500,
    propellantKg: 220000, propellant: 'kerolox',
    description: 'Kerosene + liquid oxygen tank: 220 t of propellant, 7.5 t empty.',
    funDescription: 'A swimming pool of fuel on its end.',
    realWorld: 'Bigger tanks are a bit more efficient: about 3.4% of their propellant.',
  },
  {
    id: 'tank-hydro-s', kind: 'tank', name: 'HydroLox Mini', category: 'tanks', cost: 15, massKg: 2200,
    propellantKg: 30000, propellant: 'hydrolox',
    description: 'Small liquid hydrogen + oxygen tank: 30 t of propellant, 2.2 t empty. Good as a top tank.',
    funDescription: 'A little chilly top-up tank.',
    realWorld: 'Close to NASA’s Centaur upper stage (about 21 t of propellant, 2.2 t empty).',
  },
  {
    id: 'tank-hydro', kind: 'tank', name: 'HydroLox Hold-All', category: 'tanks', cost: 40, massKg: 8000,
    propellantKg: 150000, propellant: 'hydrolox',
    description: 'Liquid hydrogen + oxygen tank: 150 t of propellant, 8 t empty.',
    funDescription: 'Hydrogen is so fluffy it needs a really big, chilly tank.',
    realWorld: 'Hydrogen is very low-density, so its tanks are bulkier (about 4–10% of propellant).',
  },
];

export const COMMS: CommsPart[] = [
  {
    id: 'com-whisper', kind: 'comms', name: 'Whisper Antenna', category: 'comms', cost: 5, massKg: 200,
    rangeLy: 15, fictional: true,
    description: 'Small antenna. Game range 15 light-years.',
    funDescription: 'Talks to Earth from the nearest stars.',
  },
  {
    id: 'com-bigear', kind: 'comms', name: 'Big Ear Dish', category: 'comms', cost: 18, massKg: 600,
    rangeLy: 200, fictional: true,
    description: 'High-gain dish. Game range 200 light-years.',
    funDescription: 'A giant ear pointed at home.',
  },
  {
    id: 'com-laser', kind: 'comms', name: 'Laser Lighthouse', category: 'comms', cost: 45, massKg: 1200,
    rangeLy: 2500, fictional: true,
    description: 'Laser communicator. Game range 2,500 light-years.',
    funDescription: 'Sends messages home on a beam of light.',
    realWorld: 'NASA’s Deep Space Optical Communications test on Psyche sent laser data from 0.0000033 light-years away.',
  },
];

export const PRESSURE: PressurePart[] = [
  {
    id: 'prs-helium', kind: 'pressure', name: 'Helium Puffer', category: 'pressure', cost: 8, massKg: 500,
    suits: ['kerolox', 'hydrolox'], capacityKg: 250000, pressurisation: 'Helium bottles',
    description: 'Helium bottles that keep liquid tanks pressurised. Up to 250 t of propellant.',
    funDescription: 'Puffs helium in so the fuel flows out smoothly.',
    realWorld: 'Most liquid rockets use helium pressurant (Falcon 9, Saturn V).',
  },
  {
    id: 'prs-helium-xl', kind: 'pressure', name: 'Helium Mega Bottles', category: 'pressure', cost: 20, massKg: 1500,
    suits: ['kerolox', 'hydrolox'], capacityKg: 700000, pressurisation: 'Helium bottles',
    description: 'Large helium system for liquid tanks. Up to 700 t of propellant.',
    funDescription: 'Lots of balloons’ worth of helium.',
  },
  {
    id: 'prs-autogen', kind: 'pressure', name: 'Warm-Gas Recycler', category: 'pressure', cost: 15, massKg: 300,
    suits: ['hydrolox'], capacityKg: 1000000, pressurisation: 'Autogenous (heated propellant gas)',
    description: 'Feeds warmed hydrogen and oxygen gas back into the tanks. Hydrogen/LOX only.',
    funDescription: 'Uses the rocket’s own fuel to push fuel. Clever!',
    realWorld: 'The Space Shuttle’s external tank was pressurised with gas tapped from its own engines.',
  },
];

export const SHIELDS: ShieldPart[] = [
  {
    id: 'shd-blanket', kind: 'shield', name: 'Space Blanket', category: 'shield', cost: 4, massKg: 200,
    maxTempK: 450, reentryRated: false, radiation: 1,
    description: 'Multi-layer insulation. Handles 450 K. Not a re-entry heat shield.',
    funDescription: 'A shiny emergency blanket for your rocket.',
    realWorld: 'Multi-layer insulation wraps almost every NASA spacecraft.',
  },
  {
    id: 'shd-cork', kind: 'shield', name: 'Cork-n-Silica Shield', category: 'shield', cost: 15, massKg: 1500,
    maxTempK: 1800, reentryRated: true, radiation: 1,
    description: 'Ablative heat shield. Handles 1,800 K and Earth re-entry.',
    funDescription: 'Slowly chars away to keep you cool. Like a toasted marshmallow!',
    realWorld: 'Cork-silica ablators (SLA-561V) protected NASA’s Mars landers.',
  },
  {
    id: 'shd-pica', kind: 'shield', name: 'PICA Pro Shield', category: 'shield', cost: 40, massKg: 2500,
    maxTempK: 2800, reentryRated: true, radiation: 2,
    description: 'Carbon ablator with radiation shelter. Handles 2,800 K and Earth re-entry.',
    funDescription: 'Tough carbon armour. Also blocks lots of space radiation.',
    realWorld: 'PICA (phenolic-impregnated carbon ablator) was invented at NASA Ames and flew on Stardust and Mars Science Laboratory.',
  },
  {
    id: 'shd-forge', kind: 'shield', name: 'Star-Forge Plating', category: 'shield', cost: 85, massKg: 4000,
    maxTempK: 5000, reentryRated: true, radiation: 3, fictional: true,
    description: 'Imaginary super-material. Handles 5,000 K, best radiation protection.',
    funDescription: 'Could take a dip in a star. Not invented yet!',
  },
];

export const ALL_PARTS: Part[] = [...PODS, ...ENGINES, ...DRIVES, ...TANKS, ...COMMS, ...PRESSURE, ...SHIELDS];
const BY_ID = new Map<string, Part>(ALL_PARTS.map((p) => [p.id, p]));

export function getPart(id: string | null | undefined): Part | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export interface SlotDef {
  id: SlotId;
  label: string;
  kind: Part['kind'];
  required: boolean;
}

export const SLOTS: SlotDef[] = [
  { id: 'pod', label: 'Payload pod', kind: 'pod', required: true },
  { id: 'comms', label: 'Comms dish', kind: 'comms', required: true },
  { id: 'shield', label: 'Heat & radiation shield', kind: 'shield', required: false },
  { id: 'drive', label: 'Deep-Space Drive', kind: 'drive', required: true },
  { id: 'pressure', label: 'Pressure system', kind: 'pressure', required: false },
  { id: 'tank2', label: 'Fuel tank 3', kind: 'tank', required: false },
  { id: 'tank1', label: 'Fuel tank 2', kind: 'tank', required: false },
  { id: 'tank0', label: 'Fuel tank 1', kind: 'tank', required: true },
  { id: 'engine', label: 'Launch engine', kind: 'engine', required: true },
];

export const PROPELLANT_LABEL: Record<Propellant, string> = {
  solid: 'Solid fuel',
  kerolox: 'Kerosene + liquid oxygen',
  hydrolox: 'Liquid hydrogen + oxygen',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  payload: 'Payload',
  thrusters: 'Thrusters',
  tanks: 'Fuel tanks',
  comms: 'Comms',
  pressure: 'Pressure',
  shield: 'Shields',
};
