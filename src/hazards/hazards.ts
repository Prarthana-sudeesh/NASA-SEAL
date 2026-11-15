// Space hazards that interrupt the flight cutscene. Each one is beaten with EITHER a quick quiz OR a
// mini-game (picked at random), against a timer. Science facts come from the NASA pages in SOURCES.
// The alien spaceship is the one made-up hazard, and the game says so.
// Ported from the Secondary-prototype branch (src/game/events.ts), plus the quasar.
import type { Difficulty } from '../data/types.ts';
import { LAUNCHES_PER_RUN } from '../store/game.ts';

/** 0 on the first launch of a run, 1 on the last. */
const progress = (launch: number) => Math.max(0, Math.min(1, (launch - 1) / Math.max(1, LAUNCHES_PER_RUN - 1)));

export type HazardId = 'blackhole' | 'gravity' | 'aliens' | 'asteroids' | 'debris' | 'flare' | 'quasar';
export type HazardSceneKind = HazardId | 'alarm';
export type MiniGame = 'dodge' | 'thrust' | 'shield';
export type Mode = 'quiz' | 'game';

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
  flares: {
    name: 'NASA Science: Solar Flares',
    url: 'https://science.nasa.gov/sun/solar-storms-and-flares/',
  },
  quasars: {
    name: 'NASA Science: Black Hole Types',
    url: 'https://science.nasa.gov/universe/black-holes/types/',
  },
} satisfies Record<string, Source>;

export interface Question {
  /** 1 = Cadet, 2 = Engineer, 3 = Flight Director. */
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
  scene: HazardSceneKind;
  questions: Question[];
  good: string;
  bad: string;
  /** Made-up for fun (not real science). */
  fiction?: boolean;
}

export const HAZARDS: Record<HazardId, Hazard> = {
  blackhole: {
    id: 'blackhole',
    icon: '🕳️',
    title: 'BLACK HOLE AHEAD!',
    alert:
      'Long-range sensors spot a black hole! The stars behind it look bent and smeared, and a hot glowing disk swirls around it.',
    scene: 'blackhole',
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
  gravity: {
    id: 'gravity',
    icon: '🪐',
    title: 'GRAVITY PULL!',
    alert: 'We’re flying past a giant planet, and its gravity is tugging us off course!',
    scene: 'gravity',
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
      'An unknown spaceship is closing in fast and firing lasers at us! (This one is just for fun: no one has ever really met aliens.)',
    scene: 'aliens',
    fiction: true,
    good: 'You out-flew the saucer! It did a loop-the-loop and zoomed away.',
    bad: 'Zap! A laser scorched the hull before the saucer zipped off.',
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
  asteroids: {
    id: 'asteroids',
    icon: '☄️',
    title: 'ASTEROID SWARM!',
    alert: 'Rocks ahead! A swarm of asteroids is tumbling across our path.',
    scene: 'asteroids',
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
  debris: {
    id: 'debris',
    icon: '🛰️',
    title: 'SPACE JUNK!',
    alert: 'Pieces of old satellites and rockets are zooming toward us in Earth orbit!',
    scene: 'debris',
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
  flare: {
    id: 'flare',
    icon: '☀️',
    title: 'SOLAR FLARE!',
    alert: 'A burst of radiation from the star is racing toward the ship.',
    scene: 'flare',
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
      {
        level: 2,
        question: 'What is a solar flare?',
        options: [
          'A sudden, intense burst of radiation from a star',
          'A small comet that hits the Sun',
          'A rocket used to signal for help',
          'A cloud of dust around a planet',
        ],
        answer: 0,
        explain:
          'NASA describes a solar flare as an intense burst of radiation coming from the release of magnetic energy associated with sunspots.',
        source: SOURCES.flares,
      },
      {
        level: 3,
        question: 'Light from a flare on our Sun reaches Earth in about how long?',
        options: ['8 seconds', 'About 8 minutes', 'About 8 hours', 'About 8 days'],
        answer: 1,
        explain:
          'Sunlight takes about 8 minutes to cross the 150 million km to Earth, so a flare’s flash arrives that fast. NASA’s Solar Dynamics Observatory watches the Sun for flares all the time.',
        source: SOURCES.flares,
      },
    ],
  },

  quasar: {
    id: 'quasar',
    icon: '💫',
    title: 'QUASAR BEAM!',
    alert:
      'A quasar, the blazing core of a faraway galaxy, is sweeping a beam of radiation across our path!',
    scene: 'quasar',
    good: 'Shields held and you slipped out of the beam. What a light show!',
    bad: 'The beam scrambled some instruments before you got clear.',
    questions: [
      {
        level: 1,
        question: 'A super-bright beam is heading our way. What should we do?',
        options: [
          'Fly straight into the beam',
          'Raise the shields and steer out of the beam',
          'Switch off all the lights',
        ],
        answer: 1,
        explain:
          'Quasars are some of the brightest objects in the universe. Their beams carry huge amounts of radiation, so shielding and distance keep a crew safe.',
        source: SOURCES.quasars,
      },
      {
        level: 2,
        question: 'What powers a quasar?',
        options: [
          'A star exploding as a supernova',
          'Gas swirling into a supermassive black hole at a galaxy’s center',
          'Thousands of planets reflecting starlight',
          'A giant cloud of ice',
        ],
        answer: 1,
        explain:
          'A quasar is an active galactic nucleus: gas heats up to millions of degrees as it spirals into a supermassive black hole, and shines brighter than the whole galaxy around it.',
        source: SOURCES.quasars,
      },
      {
        level: 3,
        question: 'The word “quasar” is short for…',
        options: [
          'Quick star',
          'Quasi-stellar radio source',
          'Quantum space ray',
          'Quiet solar array',
        ],
        answer: 1,
        explain:
          'Astronomers in the 1960s found star-like points that gave off strong radio waves, so they called them quasi-stellar radio sources: quasars. They turned out to be billions of light-years away.',
        source: SOURCES.quasars,
      },
    ],
  },
};

export const HAZARD_IDS = Object.keys(HAZARDS) as HazardId[];

/** Which mini-game beats which hazard. */
export const GAME_FOR: Record<HazardId, MiniGame> = {
  aliens: 'dodge',
  asteroids: 'dodge',
  debris: 'dodge',
  blackhole: 'thrust',
  gravity: 'thrust',
  quasar: 'shield',
  flare: 'shield',
};

export interface HazardConfig {
  tier: 1 | 2 | 3;
  quizSeconds: number;
  gameSeconds: number;
  /** Lives in the dodge game. */
  lives: number;
  /** Good timing presses needed in the shield game. */
  shieldHits: number;
  reward: number;
  penalty: number;
}

export const HAZARD_CONFIG: Record<Difficulty, HazardConfig> = {
  easy: { tier: 1, quizSeconds: 25, gameSeconds: 12, lives: 3, shieldHits: 3, reward: 15, penalty: 5 },
  medium: { tier: 2, quizSeconds: 18, gameSeconds: 15, lives: 3, shieldHits: 4, reward: 25, penalty: 10 },
  hard: { tier: 3, quizSeconds: 12, gameSeconds: 18, lives: 2, shieldHits: 5, reward: 40, penalty: 20 },
};

/** How hard the mini-games play: grows with difficulty and with every launch in the run. */
export function intensity(d: Difficulty, launch: number): number {
  const base = { easy: 1, medium: 1.4, hard: 1.85 }[d];
  return base * (1 + progress(launch) * 0.5);
}

/** Seconds on the clock: a little less with every launch in the run. */
export function secondsFor(d: Difficulty, mode: Mode, launch: number): number {
  const c = HAZARD_CONFIG[d];
  const s = mode === 'quiz' ? c.quizSeconds : c.gameSeconds;
  return mode === 'quiz' ? Math.max(8, Math.round(s - progress(launch) * 5)) : s;
}

/** One hazard planned for one flight. */
export interface PlannedHazard {
  id: HazardId;
  mode: Mode;
  /** Video time (s) where the flight pauses for it. */
  at: number;
  /** Quiz: index into the hazard's questions and the shuffled option order. */
  q: number;
  order: number[];
}

export interface HazardResult {
  id: HazardId;
  mode: Mode;
  won: boolean;
}

/** How many hazards a flight gets: harder levels and later launches bring more. */
export function hazardCount(d: Difficulty, launch: number, r: () => number): number {
  const late = progress(launch) >= 0.5 ? 0.3 : 0;
  if (d === 'easy') return 1 + (r() < late ? 1 : 0);
  if (d === 'medium') return 1 + (r() < 0.4 + late ? 1 : 0);
  return 2 + (r() < 0.35 + late ? 1 : 0);
}

interface Stretch {
  start: number;
  end: number;
  ret: boolean;
}

/** Points in the video where the rocket is cruising through space (never during lift-off or landing). */
export function hazardSlots(timeline: { clip: string; start: number; end: number; label?: string }[]): number[] {
  const cruise: Stretch[] = timeline
    .filter((e) => e.clip === 'cruising')
    .map((e) => ({ start: e.start, end: e.end, ret: !!e.label }));
  const out = cruise.find((c) => !c.ret);
  const back = cruise.find((c) => c.ret);
  const slots: number[] = [];
  if (out) slots.push(out.start + 1.0);
  if (back) slots.push(back.start + 1.4);
  if (out && out.end - out.start > 3) slots.push(out.start + (out.end - out.start) * 0.7);
  return slots;
}

/** Plan a flight's hazards at random. No hazard repeats within a flight. */
export function planHazards(d: Difficulty, launch: number, slots: number[], r: () => number = Math.random): PlannedHazard[] {
  const want = Math.min(slots.length, hazardCount(d, launch, r));
  const pool = [...HAZARD_IDS];
  const tier = HAZARD_CONFIG[d].tier;
  const out: PlannedHazard[] = [];
  for (let k = 0; k < want; k++) {
    const id = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const qs = HAZARDS[id].questions;
    let cands = qs.map((q, i) => ({ q, i })).filter((x) => x.q.level === tier);
    if (!cands.length) {
      const best = Math.max(...qs.filter((q) => q.level <= tier).map((q) => q.level), 1);
      cands = qs.map((q, i) => ({ q, i })).filter((x) => x.q.level === best);
    }
    const q = cands[Math.floor(r() * cands.length)].i;
    const order = qs[q].options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    out.push({ id, mode: r() < 0.5 ? 'quiz' : 'game', at: slots[k], q, order });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Score change from a flight's hazards. */
export function hazardPoints(d: Difficulty, results: HazardResult[]): number {
  const c = HAZARD_CONFIG[d];
  return results.reduce((s, x) => s + (x.won ? c.reward : -c.penalty), 0);
}
