// Postcards, badges and crew photos the player collects. Pure logic (no React, no storage).
import type { Planet } from '../data/types.ts';
import { DIFFICULTIES, type Difficulty } from './config.ts';
import { STAGES, type Result } from './engine.ts';
import { crewNames } from './crew.ts';

export type BadgeId =
  | 'first-flight'
  | 'penny-pincher'
  | 'heat-shield-hero'
  | 'full-house'
  | 'perfect-mission'
  | 'quiz-whiz'
  | 'cool-head'
  | 'team-player'
  | 'fix-it-pro'
  | 'postcard-collector'
  | 'grand-tour'
  | 'black-hole-survivor'
  | 'hazard-hero';

export interface BadgeInfo {
  id: BadgeId;
  icon: string;
  name: string;
  how: string;
}

export const BADGES: BadgeInfo[] = [
  { id: 'first-flight', icon: '🚀', name: 'First Flight', how: 'Complete your first mission.' },
  {
    id: 'penny-pincher',
    icon: '🪙',
    name: 'Penny Pincher',
    how: 'Succeed while spending no more than 75% of the budget.',
  },
  {
    id: 'heat-shield-hero',
    icon: '🔥',
    name: 'Heat Shield Hero',
    how: 'Succeed on a planet hotter than 1,000 K.',
  },
  {
    id: 'full-house',
    icon: '👨‍🚀',
    name: 'Full House',
    how: 'Bring home the biggest crew allowed on Medium or Hard.',
  },
  {
    id: 'perfect-mission',
    icon: '💯',
    name: 'Ace Engineer',
    how: 'Score 1,000 points or more in one mission.',
  },
  { id: 'quiz-whiz', icon: '🧠', name: 'Quiz Whiz', how: 'Answer 5 science checks correctly.' },
  { id: 'cool-head', icon: '🧊', name: 'Cool Head', how: 'Handle 3 space hazards correctly.' },
  {
    id: 'team-player',
    icon: '🤝',
    name: 'Team Player',
    how: 'Complete a mission in team mode.',
  },
  { id: 'fix-it-pro', icon: '🔧', name: 'Fix-it Pro', how: 'Fix all 5 rockets in Fix my rocket.' },
  {
    id: 'postcard-collector',
    icon: '💌',
    name: 'Postcard Collector',
    how: 'Collect postcards from 5 different planets.',
  },
  { id: 'grand-tour', icon: '🌌', name: 'Grand Tour', how: 'Collect all 15 planet postcards.' },
  {
    id: 'black-hole-survivor',
    icon: '🕳️',
    name: 'Black Hole Survivor',
    how: 'Make the right call when a black hole appears.',
  },
  {
    id: 'hazard-hero',
    icon: '🦸',
    name: 'Hazard Hero',
    how: 'Handle all three hazards on one Hard flight.',
  },
];

export interface Photo {
  planetId: string;
  crew: string[];
  date: string;
}

export interface Collection {
  /** planet id → date first collected */
  postcards: Record<string, string>;
  badges: Partial<Record<BadgeId, string>>;
  photos: Photo[];
  quizCorrect: number;
  emergencies: number;
  puzzleBest: number;
  /** Flights already counted (run id + mission number). */
  seen: string[];
}

export const EMPTY_COLLECTION: Collection = {
  postcards: {},
  badges: {},
  photos: [],
  quizCorrect: 0,
  emergencies: 0,
  puzzleBest: 0,
  seen: [],
};

export interface Unlocks {
  key: string;
  badges: BadgeId[];
  postcard: string | null;
  photo: boolean;
}

export interface FlightRecord {
  key: string;
  planet: Planet;
  difficulty: Difficulty;
  crew: number;
  result: Result;
  quizCorrect: boolean;
  /** Each hazard on the flight and whether the crew handled it. */
  hazards: { id: string; handled: boolean }[];
  teamSize: number;
}

/** Landed means the landing stage was cleared. */
export const landed = (r: Result) => r.stagesCleared > STAGES.indexOf('landing');

const TOTAL_PLANETS = Object.values(DIFFICULTIES).reduce((n, d) => n + d.planets.length, 0);

function award(c: Collection, out: BadgeId[], id: BadgeId, when: boolean, date: string) {
  if (when && !c.badges[id]) {
    c.badges[id] = date;
    out.push(id);
  }
}

/** Count a finished flight. Returns the new collection and what was unlocked (null if already counted). */
export function recordFlight(
  prev: Collection,
  f: FlightRecord,
  date = new Date().toISOString(),
): { next: Collection; unlocks: Unlocks } | null {
  if (prev.seen.includes(f.key)) return null;
  const c: Collection = {
    ...prev,
    postcards: { ...prev.postcards },
    badges: { ...prev.badges },
    photos: [...prev.photos],
    seen: [...prev.seen, f.key].slice(-200),
    quizCorrect: prev.quizCorrect + (f.quizCorrect ? 1 : 0),
    emergencies: prev.emergencies + f.hazards.filter((h) => h.handled).length,
  };
  const r = f.result;
  let postcard: string | null = null;
  if (landed(r) && !c.postcards[f.planet.id]) {
    c.postcards[f.planet.id] = date;
    postcard = f.planet.id;
  }
  let photo = false;
  if (r.success && f.crew > 0) {
    c.photos = [{ planetId: f.planet.id, crew: crewNames(f.crew), date }, ...c.photos].slice(0, 30);
    photo = true;
  }
  const badges: BadgeId[] = [];
  const cfg = DIFFICULTIES[f.difficulty];
  award(c, badges, 'first-flight', r.success, date);
  award(c, badges, 'penny-pincher', r.success && r.cost <= cfg.budget * 0.75, date);
  award(c, badges, 'heat-shield-hero', r.success && f.planet.eqTempK.value > 1000, date);
  award(c, badges, 'full-house', r.success && cfg.maxCrew >= 2 && f.crew >= cfg.maxCrew, date);
  award(c, badges, 'perfect-mission', r.total >= 1000, date);
  award(c, badges, 'quiz-whiz', c.quizCorrect >= 5, date);
  award(c, badges, 'cool-head', c.emergencies >= 3, date);
  award(c, badges, 'team-player', r.success && f.teamSize >= 2, date);
  award(
    c,
    badges,
    'black-hole-survivor',
    f.hazards.some((h) => h.id === 'blackhole' && h.handled),
    date,
  );
  award(c, badges, 'hazard-hero', f.hazards.length >= 3 && f.hazards.every((h) => h.handled), date);
  const cards = Object.keys(c.postcards).length;
  award(c, badges, 'postcard-collector', cards >= 5, date);
  award(c, badges, 'grand-tour', cards >= TOTAL_PLANETS, date);
  return { next: c, unlocks: { key: f.key, badges, postcard, photo } };
}

/** Record a Fix-my-rocket session. */
export function recordPuzzle(
  prev: Collection,
  points: number,
  correct: number,
  rounds: number,
  date = new Date().toISOString(),
): { next: Collection; badges: BadgeId[] } {
  const c: Collection = {
    ...prev,
    badges: { ...prev.badges },
    puzzleBest: Math.max(prev.puzzleBest, points),
  };
  const badges: BadgeId[] = [];
  award(c, badges, 'fix-it-pro', correct >= rounds, date);
  return { next: c, badges };
}

/** Three fun, true facts for a planet's postcard (from NASA Exoplanet Archive values). */
export function postcardFacts(p: Planet): string[] {
  const g = p.surfaceGravityG.value;
  const weigh =
    g > 1.1
      ? `You'd weigh ${g.toFixed(1)}× as much as on Earth. Heavy legs!`
      : g < 0.9
        ? `You'd weigh only ${g.toFixed(1)}× your Earth weight. Bouncy!`
        : 'You’d weigh about the same as on Earth.';
  const days = p.orbitalPeriodDays.value;
  const year =
    days === null
      ? `It was discovered in ${p.discoveryYear.value} using the ${p.discoveryMethod.value.toLowerCase()} method.`
      : days < 365
        ? `A whole year here lasts just ${days < 10 ? days.toFixed(1) : Math.round(days)} Earth days. Lots of birthdays!`
        : `A year here lasts ${Math.round(days)} Earth days.`;
  const ly = p.distanceLy.value;
  const light = `The light you see from its star left ${ly < 10 ? ly.toFixed(1) : Math.round(ly)} years ago.`;
  const c = Math.round(p.eqTempK.value - 273);
  const temp = `It's about ${c} °C (${Math.round(p.eqTempK.value)} K).`;
  return [weigh, year, c > 150 || c < -60 ? temp : light];
}
