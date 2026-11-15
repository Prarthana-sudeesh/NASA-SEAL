// Surprise hazards during the flight. Each one asks the crew a question; the right call earns points
// and a lesson. Space-science facts are taken from the NASA pages listed in SOURCES (retrieved
// November 2026). The alien spaceship is the one made-up hazard, and the game says so.
import type { Difficulty } from './config.ts';
import type { Stage } from './engine.ts';
import type { Role } from './team.ts';

export type HazardId =
  | 'blackhole'
  | 'asteroids'
  | 'gravity'
  | 'aliens'
  | 'debris'
  | 'flare'
  | 'meteoroid'
  | 'signal'
  | 'glitch'
  | 'drift'
  | 'power';

/** Back-compat name used by older saves and code. */
export type EventId = HazardId;

/** What the background shows while the hazard is on screen. */
export type HazardScene = 'blackhole' | 'asteroids' | 'gravity' | 'aliens' | 'debris' | 'alarm';

export interface Source {
  name: string;
  url: string;
}

export const SOURCES = {
  blackHoles: {
    name: 'NASA Science: Black Holes',
    url: 'https://science.nasa.gov/universe/black-holes/',
  },
  blackHoleTypes: {
    name: 'NASA Science: Black Hole Types',
    url: 'https://science.nasa.gov/universe/black-holes/types/',
  },
  blackHoleAnatomy: {
    name: 'NASA Science: Black Hole Anatomy',
    url: 'https://science.nasa.gov/universe/black-holes/anatomy/',
  },
  asteroids: {
    name: 'NASA Science: Asteroids',
    url: 'https://science.nasa.gov/solar-system/asteroids/',
  },
  dart: {
    name: 'NASA Science: DART mission',
    url: 'https://science.nasa.gov/mission/dart/',
  },
  gravityAssist: {
    name: 'NASA Basics of Space Flight, Chapter 4',
    url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/',
  },
  debris: {
    name: 'NASA Orbital Debris Program Office FAQ',
    url: 'https://orbitaldebris.jsc.nasa.gov/faq/',
  },
  searchForLife: {
    name: 'NASA Science: The Search for Life',
    url: 'https://science.nasa.gov/exoplanets/search-for-life/',
  },
  goldenRecord: {
    name: 'NASA Science: Golden Record Contents',
    url: 'https://science.nasa.gov/mission/voyager/golden-record-contents/',
  },
} satisfies Record<string, Source>;

export interface Question {
  /** 1 = Easy, 2 = Medium, 3 = Hard. */
  level: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: number;
  explain: string;
  source?: Source;
}

export interface Hazard {
  id: HazardId;
  icon: string;
  title: string;
  alert: string;
  role: Role;
  scene: HazardScene;
  /** Flight stages where it can happen. */
  stages: Stage[];
  questions: Question[];
  good: string;
  bad: string;
  /** Made-up for fun (not real science). */
  fiction?: boolean;
  /** Real space hazards are picked more often than ship malfunctions. */
  weight: number;
}

export const HAZARDS: Record<HazardId, Hazard> = {
  blackhole: {
    id: 'blackhole',
    icon: '🕳️',
    title: 'BLACK HOLE AHEAD!',
    alert:
      'Long-range sensors spot a black hole! The stars behind it look bent and smeared, and a hot glowing disk swirls around it.',
    role: 'engineer',
    scene: 'blackhole',
    stages: ['journey'],
    weight: 3,
    good: 'You curved around it at a safe distance and watched its glowing disk swirl. Amazing!',
    bad: 'You flew much too close! The rocket’s instruments went wild before you pulled away.',
    questions: [
      {
        level: 1,
        question: 'What’s the safest thing to do?',
        options: [
          'Fly straight into it to see what’s inside',
          'Keep a safe distance and steer around it',
          'Switch off the engines and drift toward it',
        ],
        answer: 1,
        explain:
          'Nothing that crosses a black hole’s event horizon can escape, not even light. But NASA says black holes don’t suck in other matter: from far enough away, their gravity acts just like any other object with the same mass.',
        source: SOURCES.blackHoles,
      },
      {
        level: 2,
        question:
          'What is the boundary around a black hole called, where nothing, not even light, can escape?',
        options: [
          'The accretion disk',
          'The event horizon',
          'The asteroid belt',
          'The ozone layer',
        ],
        answer: 1,
        explain:
          'It’s the event horizon. NASA explains that inside it, the speed needed to escape is faster than light, which is as fast as anything can go.',
        source: SOURCES.blackHoleAnatomy,
      },
      {
        level: 2,
        question: 'Do black holes suck in everything around them, like a cosmic vacuum cleaner?',
        options: [
          'Yes, they suck in the whole galaxy',
          'No. From far enough away, their gravity acts like any object with the same mass',
          'Only things made of metal',
          'Only on Tuesdays',
        ],
        answer: 1,
        explain:
          'NASA says black holes are not cosmic vacuum cleaners. From far enough away, their gravitational effects are just like those of other objects of the same mass.',
        source: SOURCES.blackHoles,
      },
      {
        level: 3,
        question:
          'The supermassive black hole at the center of our Milky Way is called Sagittarius A*. How massive is it?',
        options: [
          'About as massive as Earth',
          'About as massive as the Sun',
          '4 million times the mass of the Sun',
          '66 billion times the mass of the Sun',
        ],
        answer: 2,
        explain:
          'NASA says Sagittarius A* is 4 million times the mass of the Sun. The most massive black hole observed, TON 618, is 66 billion times the Sun’s mass!',
        source: SOURCES.blackHoleTypes,
      },
      {
        level: 3,
        question: 'The nearest known black hole is called Gaia BH1. About how far away is it?',
        options: [
          'About 15 light-years',
          'About 1,500 light-years',
          'About 15 million light-years',
          'It’s inside our solar system',
        ],
        answer: 1,
        explain:
          'NASA lists Gaia BH1 as the nearest known black hole, about 1,500 light-years away. Phew, nowhere near Earth!',
        source: SOURCES.blackHoles,
      },
    ],
  },
  asteroids: {
    id: 'asteroids',
    icon: '☄️',
    title: 'ASTEROID SWARM!',
    alert: 'Rocks ahead! A swarm of asteroids is tumbling across our path.',
    role: 'engineer',
    scene: 'asteroids',
    stages: ['journey', 'approach', 'return'],
    weight: 3,
    good: 'You weaved through the rocks without a single scratch!',
    bad: 'Clunk! A small rock dented the hull. Nothing broke, but that was close.',
    questions: [
      {
        level: 1,
        question: 'Quick! What should the pilot do?',
        options: [
          'Slow down and steer carefully between the rocks',
          'Speed up and hope for the best',
          'Close your eyes',
        ],
        answer: 0,
        explain:
          'Careful steering keeps the ship safe. Back home, NASA’s Planetary Defense Coordination Office finds and tracks asteroids that could ever come near Earth.',
        source: SOURCES.asteroids,
      },
      {
        level: 1,
        question: 'Where do most asteroids in our solar system orbit the Sun?',
        options: ['Between Mars and Jupiter', 'Between Earth and the Moon', 'Inside the Sun'],
        answer: 0,
        explain:
          'NASA says most asteroids orbit the Sun between Mars and Jupiter, in the main asteroid belt. They are rocky leftovers from when the solar system formed, about 4.6 billion years ago.',
        source: SOURCES.asteroids,
      },
      {
        level: 2,
        question: 'In 2022, NASA’s DART spacecraft crashed into an asteroid on purpose. Why?',
        options: [
          'To mine it for gold',
          'To test a way to change an asteroid’s motion, to help protect Earth',
          'It was an accident',
          'To take a selfie',
        ],
        answer: 1,
        explain:
          'DART was the first mission to test asteroid deflection by changing an asteroid’s motion with a kinetic impact. It hit the moonlet Dimorphos on Sept. 26, 2022.',
        source: SOURCES.dart,
      },
      {
        level: 3,
        question: 'Which asteroid moonlet did NASA’s DART spacecraft hit?',
        options: ['Bennu', 'Vesta', 'Dimorphos, which orbits Didymos', 'Ceres'],
        answer: 2,
        explain:
          'Dimorphos is just 530 feet (160 meters) across. It orbits a larger, 2,560-foot (780-meter) asteroid called Didymos.',
        source: SOURCES.dart,
      },
      {
        level: 3,
        question: 'Vesta is the largest asteroid. About how wide is it?',
        options: ['10 meters', '530 kilometers', '5,300 kilometers', 'Bigger than Earth'],
        answer: 1,
        explain:
          'Vesta is about 329 miles (530 kilometers) across. NASA says the total mass of all asteroids combined is less than that of Earth’s Moon.',
        source: SOURCES.asteroids,
      },
    ],
  },
  gravity: {
    id: 'gravity',
    icon: '🪐',
    title: 'GRAVITY PULL!',
    alert: 'We’re flying past a giant planet, and its gravity is tugging us off course!',
    role: 'engineer',
    scene: 'gravity',
    stages: ['journey'],
    weight: 3,
    good: 'Wheee! You swung around the planet like a slingshot and picked up speed.',
    bad: 'Fighting the pull the whole way burned lots of extra fuel.',
    questions: [
      {
        level: 1,
        question: 'What should we do?',
        options: [
          'Fight it with full engine power the whole way',
          'Use its gravity to slingshot around it and pick up speed',
          'Turn around and go home',
        ],
        answer: 1,
        explain:
          'That’s called a gravity assist! NASA’s Voyager, Galileo and Cassini spacecraft used planets’ gravity during flybys to slingshot farther into space.',
        source: SOURCES.gravityAssist,
      },
      {
        level: 2,
        question:
          'What is it called when a spacecraft flies close past a planet to change its speed and direction?',
        options: ['A gravity assist', 'A moonwalk', 'An event horizon', 'A countdown'],
        answer: 0,
        explain:
          'A gravity assist. The planet’s gravity pulls the spacecraft along, and it leaves with extra speed relative to the Sun.',
        source: SOURCES.gravityAssist,
      },
      {
        level: 3,
        question: 'When Jupiter gave Voyager 2 a speed boost, what happened to Jupiter?',
        options: [
          'Nothing at all',
          'It lost a tiny bit of its orbital energy',
          'It was pulled out of its orbit',
          'It sped up too',
        ],
        answer: 1,
        explain:
          'NASA explains that as Jupiter sped up the spacecraft, the spacecraft tugged on Jupiter, causing the massive planet to actually lose some of its orbital energy. Just a tiny bit!',
        source: SOURCES.gravityAssist,
      },
      {
        level: 3,
        question: 'After Jupiter, which planets also gave Voyager 2 a gravity assist?',
        options: ['Mercury and Venus', 'Saturn and Uranus', 'Earth and Mars', 'Pluto and the Moon'],
        answer: 1,
        explain: 'NASA says the gravity-assist technique was repeated at Saturn and Uranus.',
        source: SOURCES.gravityAssist,
      },
    ],
  },
  aliens: {
    id: 'aliens',
    icon: '👽',
    title: 'UNKNOWN SPACESHIP!',
    alert:
      'A glowing saucer is flashing its lights at us! (This one is just for fun: no one has ever really met aliens.)',
    role: 'comms',
    scene: 'aliens',
    stages: ['journey', 'approach'],
    weight: 2,
    fiction: true,
    good: 'The saucer flashed its lights back, did a loop-the-loop and zoomed away. New friends!',
    bad: 'The saucer looked confused and zipped off. Maybe next time!',
    questions: [
      {
        level: 1,
        question: 'Comms, how should we say hello?',
        options: [
          'Play them the greetings from the Voyager Golden Record',
          'Hide under the seats',
          'Honk the horn really loudly',
        ],
        answer: 0,
        explain:
          'NASA’s two Voyager spacecraft each carry a Golden Record with spoken greetings in 55 languages, 115 pictures and the sounds of Earth, just in case someone out there finds it.',
        source: SOURCES.goldenRecord,
      },
      {
        level: 1,
        question: 'In real life, has NASA found evidence of life beyond Earth?',
        options: [
          'Yes, aliens visit every week',
          'Not yet. So far there’s no evidence of life beyond Earth, but scientists keep searching',
          'Yes, on the Moon',
        ],
        answer: 1,
        explain:
          'NASA says that so far, we have no evidence of life beyond Earth. But our galaxy likely holds at least 100 billion planets, so scientists keep looking!',
        source: SOURCES.searchForLife,
      },
      {
        level: 2,
        question:
          'Scientists search for life on planets in a star’s “habitable zone”. What is that?',
        options: [
          'The part of a planet where the most aliens live',
          'The distance from a star where liquid water could exist on a planet’s surface',
          'The part of the rocket where the crew lives',
          'A place with no gravity',
        ],
        answer: 1,
        explain:
          'NASA describes the habitable zone as the distance from a star at which liquid water could exist on the surface.',
        source: SOURCES.searchForLife,
      },
      {
        level: 3,
        question: 'The Voyager Golden Record has spoken greetings in how many languages?',
        options: ['5', '55', '555', 'Only English'],
        answer: 1,
        explain:
          'Fifty-five languages, from ancient Akkadian to modern Wu Chinese. The record also holds 115 images and sounds like surf, wind, thunder, birds and whales.',
        source: SOURCES.goldenRecord,
      },
    ],
  },
  debris: {
    id: 'debris',
    icon: '🛰️',
    title: 'SPACE JUNK!',
    alert: 'Pieces of old satellites and rockets are zooming toward us in Earth orbit!',
    role: 'chief',
    scene: 'debris',
    stages: ['journey', 'return'],
    weight: 3,
    good: 'You dodged the junk. Mission Control gave you a big thumbs up!',
    bad: 'A tiny fleck chipped a window. At those speeds, even small pieces pack a punch!',
    questions: [
      {
        level: 1,
        question: 'What should we do?',
        options: [
          'Fire the thrusters to move out of the way',
          'Try to catch it',
          'Keep going straight and hope',
        ],
        answer: 0,
        explain:
          'That’s just what the International Space Station does. If tracked debris may come close and the chance of hitting it is more than 1 in 10,000, the station normally moves out of the way.',
        source: SOURCES.debris,
      },
      {
        level: 2,
        question: 'About how fast does space junk travel in low Earth orbit?',
        options: [
          'About as fast as a bicycle',
          'About as fast as a car on the highway',
          'About 7 to 8 kilometers per second',
          'It doesn’t move at all',
        ],
        answer: 2,
        explain:
          'NASA says debris in low Earth orbit moves at about 7 to 8 kilometers per second: roughly 15,700 to 17,900 mph!',
        source: SOURCES.debris,
      },
      {
        level: 3,
        question: 'About how many large, trackable objects orbit Earth?',
        options: ['About 50', 'About 500', 'About 50,000', 'About 50 billion'],
        answer: 2,
        explain:
          'NASA says approximately 50,000 large, trackable objects orbit Earth, plus an estimated 100 million millimeter-sized pieces of debris.',
        source: SOURCES.debris,
      },
    ],
  },
  // Ship malfunctions (general spaceflight know-how).
  flare: {
    id: 'flare',
    icon: '☀️',
    title: 'SOLAR FLARE!',
    alert: 'A burst of radiation from the star is racing toward the ship.',
    role: 'chief',
    scene: 'alarm',
    stages: ['journey', 'approach', 'return'],
    weight: 0.6,
    good: 'Everyone sheltered behind the shielding. The storm passed safely!',
    bad: 'The crew took an extra dose of radiation. They will be fine, but it was risky.',
    questions: [
      {
        level: 1,
        question: 'What should the crew do?',
        options: [
          'Open the hatches to let the heat out',
          'Move into the most shielded part of the ship',
          'Point the antenna at the star to watch it',
        ],
        answer: 1,
        explain:
          'Radiation can harm astronauts, so crews shelter in the most shielded part of their spacecraft during solar storms.',
      },
    ],
  },
  meteoroid: {
    id: 'meteoroid',
    icon: '💥',
    title: 'MICROMETEOROID HIT!',
    alert: 'A speck of space rock punched a tiny hole in a fuel line. Fuel is leaking!',
    role: 'engineer',
    scene: 'alarm',
    stages: ['journey', 'approach', 'return'],
    weight: 0.6,
    good: 'Leak sealed, fuel rerouted. Nice save!',
    bad: 'Some fuel leaked away before the line was shut. That was close!',
    questions: [
      {
        level: 1,
        question: 'How do we fix it?',
        options: [
          'Fire the engines at full power to get there faster',
          'Ignore it. It’s only a tiny hole',
          'Close the valve and send fuel through the backup line',
        ],
        answer: 2,
        explain:
          'Spacecraft have valves and backup lines so a leak can be shut off. Burning harder would only waste more fuel.',
      },
    ],
  },
  signal: {
    id: 'signal',
    icon: '📡',
    title: 'SIGNAL LOST!',
    alert: 'Mission Control can’t hear us. The antenna has drifted off target.',
    role: 'comms',
    scene: 'alarm',
    stages: ['journey', 'approach', 'return'],
    weight: 0.6,
    good: 'Contact restored! Mission Control says hi.',
    bad: 'It took hours to find Earth again. Mission Control was very worried.',
    questions: [
      {
        level: 1,
        question: 'How do we reconnect?',
        options: [
          'Use the star tracker to aim the antenna back at Earth',
          'Switch every system off and wait',
          'Send the message again, but louder',
        ],
        answer: 0,
        explain:
          'Spacecraft find their direction by looking at known stars. Over such huge distances, the antenna must be aimed very precisely.',
      },
    ],
  },
  glitch: {
    id: 'glitch',
    icon: '💻',
    title: 'COMPUTER GLITCH!',
    alert: 'The flight computer froze. A cosmic ray flipped a bit in its memory.',
    role: 'scientist',
    scene: 'alarm',
    stages: ['journey', 'approach', 'return'],
    weight: 0.6,
    good: 'Backup computer online. Everything is running smoothly.',
    bad: 'The rocket tumbled for a while before the computer recovered. Everyone is dizzy!',
    questions: [
      {
        level: 1,
        question: 'What’s the fix?',
        options: [
          'Switch to the backup flight computer',
          'Hit the computer until it works',
          'Fly with no computer at all',
        ],
        answer: 0,
        explain:
          'Spacecraft carry backup computers and switch over when one fails. Space radiation can upset electronics.',
      },
    ],
  },
  drift: {
    id: 'drift',
    icon: '🧭',
    title: 'OFF COURSE!',
    alert: 'A small push from the thrusters went wrong and we’re drifting off our path.',
    role: 'engineer',
    scene: 'alarm',
    stages: ['journey', 'return'],
    weight: 0.6,
    good: 'Back on course with a gentle nudge. Textbook flying!',
    bad: 'The course fix took far more fuel and time than it should have.',
    questions: [
      {
        level: 1,
        question: 'How do we get back on track?',
        options: [
          'Do nothing. We’ll get there anyway',
          'Fire the main engine at full power for an hour',
          'Do a short, careful burn with the small steering thrusters',
        ],
        answer: 2,
        explain:
          'Missions make small course-correction burns. A tiny push early on saves a lot of fuel later.',
      },
    ],
  },
  power: {
    id: 'power',
    icon: '🔋',
    title: 'POWER DROP!',
    alert: 'The batteries are running low after a long time in the dark.',
    role: 'chief',
    scene: 'alarm',
    stages: ['journey', 'approach', 'return'],
    weight: 0.6,
    good: 'Power saved. The batteries are charging back up.',
    bad: 'The ship went dark for a while. Brrr, it got cold in there!',
    questions: [
      {
        level: 1,
        question: 'How do we save power?',
        options: [
          'Switch off systems we don’t need right now',
          'Turn on every light so we can find the problem',
          'Shut down life support',
        ],
        answer: 0,
        explain:
          'When power is short, crews switch off anything they don’t need. Life support always stays on!',
      },
    ],
  },
};

/** Old name, kept so existing imports keep working. */
export const EVENTS = HAZARDS;
export const HAZARD_IDS = Object.keys(HAZARDS) as HazardId[];
export const EVENT_IDS = HAZARD_IDS;

/** Seconds the crew has to decide. */
export const EVENT_SECONDS: Record<Difficulty, number> = { easy: 15, medium: 13, hard: 11 };

export const TIER: Record<Difficulty, 1 | 2 | 3> = { easy: 1, medium: 2, hard: 3 };

/** One hazard on one flight. */
export interface FlightEvent {
  id: HazardId;
  /** Index into the hazard's questions. */
  q: number;
  stage: Stage;
  /** Display order of the options (original indices). */
  order: number[];
  /** Original index of the chosen option; null = ran out of time. */
  choice: number | null;
  resolved: boolean;
}

export const questionOf = (e: Pick<FlightEvent, 'id' | 'q'>): Question =>
  HAZARDS[e.id].questions[e.q] ?? HAZARDS[e.id].questions[0];

export const handled = (e: FlightEvent) =>
  e.resolved && e.choice !== null && e.choice === questionOf(e).answer;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How many hazards a flight gets: harder levels and later missions bring more. */
export function hazardCount(difficulty: Difficulty, mission: number, r: () => number): number {
  const late = mission >= 6 ? 0.25 : 0;
  if (difficulty === 'easy') return r() < 0.75 + late ? 1 : 0;
  if (difficulty === 'medium') return 1 + (r() < 0.45 + late ? 1 : 0);
  return 2 + (r() < 0.5 + late ? 1 : 0);
}

/**
 * Plan a flight's hazards. Deterministic for a seed (so a reload shows the same ones), different
 * for every flight. Only stages the rocket actually reaches are used.
 */
export function planHazards(
  seed: string,
  difficulty: Difficulty,
  mission: number,
  reachable: Stage[],
): FlightEvent[] {
  const r = rng(seed);
  const tier = TIER[difficulty];
  const want = hazardCount(difficulty, mission, r);
  const stages = (['journey', 'approach', 'return'] as Stage[]).filter((s) =>
    reachable.includes(s),
  );
  const out: FlightEvent[] = [];
  const used = new Set<HazardId>();
  for (const stage of stages) {
    if (out.length >= want) break;
    // Leave room: on a 1-hazard flight, pick the stage at random rather than always the first.
    if (want - out.length < stages.length - stages.indexOf(stage) && r() < 0.4) continue;
    const pool = HAZARD_IDS.filter((id) => !used.has(id) && HAZARDS[id].stages.includes(stage));
    if (!pool.length) continue;
    const total = pool.reduce((s, id) => s + HAZARDS[id].weight, 0);
    let pick = r() * total;
    let id = pool[0];
    for (const p of pool) {
      pick -= HAZARDS[p].weight;
      if (pick <= 0) {
        id = p;
        break;
      }
    }
    used.add(id);
    const qs = HAZARDS[id].questions;
    // Prefer questions at this level, else the hardest one below it.
    let candidates = qs.map((q, i) => ({ q, i })).filter((x) => x.q.level === tier);
    if (!candidates.length) {
      const best = Math.max(...qs.filter((q) => q.level <= tier).map((q) => q.level), 1);
      candidates = qs.map((q, i) => ({ q, i })).filter((x) => x.q.level === best);
    }
    const q = candidates[Math.floor(r() * candidates.length)].i;
    const n = qs[q].options.length;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    out.push({ id, q, stage, order, choice: null, resolved: false });
  }
  return out;
}

/** Kept for older code paths: a single deterministic pick, or null. */
export function pickEvent(seed: string): HazardId | null {
  const ev = planHazards(seed, 'easy', 1, ['journey'])[0];
  return ev ? ev.id : null;
}
