// Surprise emergencies during the journey. The right call earns bonus points and a lesson.
import type { Difficulty } from './config.ts';
import type { Role } from './team.ts';

export type EventId = 'flare' | 'meteoroid' | 'signal' | 'glitch' | 'drift' | 'power';

export interface MissionEvent {
  id: EventId;
  icon: string;
  title: string;
  alert: string;
  role: Role;
  options: string[];
  answer: number;
  /** Why the right answer is right (shown whatever the player picked). */
  explain: string;
  good: string;
  bad: string;
}

export const EVENTS: Record<EventId, MissionEvent> = {
  flare: {
    id: 'flare',
    icon: '☀️',
    title: 'SOLAR FLARE!',
    alert: 'A burst of radiation from the star is racing toward the ship.',
    role: 'chief',
    options: [
      'Open the hatches to let the heat out',
      'Move the crew into the most shielded part of the ship',
      'Point the antenna at the star to watch it',
    ],
    answer: 1,
    explain:
      'Radiation can harm astronauts. During solar storms, crews on the International Space Station shelter in the most shielded parts of the station.',
    good: 'Everyone sheltered behind the shielding. The storm passed safely!',
    bad: 'The crew took an extra dose of radiation. They will be fine, but it was risky.',
  },
  meteoroid: {
    id: 'meteoroid',
    icon: '☄️',
    title: 'MICROMETEOROID HIT!',
    alert: 'A speck of space rock punched a tiny hole in a fuel line. Fuel is leaking!',
    role: 'engineer',
    options: [
      'Fire the engines at full power to get there faster',
      "Ignore it. It's only a tiny hole",
      'Close the valve and send fuel through the backup line',
    ],
    answer: 2,
    explain:
      'Spacecraft have valves and backup lines so a leak can be shut off. Burning harder would only waste more fuel.',
    good: 'Leak sealed, fuel rerouted. Nice save!',
    bad: 'Some fuel leaked away before the line was shut. That was close!',
  },
  signal: {
    id: 'signal',
    icon: '📡',
    title: 'SIGNAL LOST!',
    alert: "Mission Control can't hear us. The antenna has drifted off target.",
    role: 'comms',
    options: [
      'Use the star tracker to aim the antenna back at Earth',
      'Switch every system off and wait',
      'Send the message again, but louder',
    ],
    answer: 0,
    explain:
      'Spacecraft find their direction by looking at known stars with a star tracker. Over such huge distances, the antenna must be aimed very precisely.',
    good: 'Contact restored! Mission Control says hi.',
    bad: 'It took hours to find Earth again. Mission Control was very worried.',
  },
  glitch: {
    id: 'glitch',
    icon: '💻',
    title: 'COMPUTER GLITCH!',
    alert: 'The flight computer froze. A cosmic ray flipped a bit in its memory.',
    role: 'scientist',
    options: [
      'Switch to the backup flight computer',
      'Hit the computer until it works',
      'Let the rocket fly with no computer at all',
    ],
    answer: 0,
    explain:
      'Cosmic rays really can flip bits in computer memory, so spacecraft carry backup computers and switch over when one fails.',
    good: 'Backup computer online. Everything is running smoothly.',
    bad: 'The rocket tumbled for a while before the computer recovered. Everyone is dizzy!',
  },
  drift: {
    id: 'drift',
    icon: '🧭',
    title: 'OFF COURSE!',
    alert: 'Gravity from a passing star has nudged us off our path.',
    role: 'engineer',
    options: [
      "Do nothing. Space is empty, we'll get there anyway",
      'Fire the main engine at full power for an hour',
      'Do a short, careful burn with the small steering thrusters',
    ],
    answer: 2,
    explain:
      'Real missions make small course-correction burns. A tiny push early on saves a lot of fuel later.',
    good: 'Back on course with a gentle nudge. Textbook flying!',
    bad: 'The course fix took far more fuel and time than it should have.',
  },
  power: {
    id: 'power',
    icon: '🔋',
    title: 'POWER DROP!',
    alert: 'The batteries are running low after a long time in the dark.',
    role: 'chief',
    options: [
      'Switch off systems we do not need right now',
      'Turn on every light so we can find the problem',
      'Shut down life support to save power',
    ],
    answer: 0,
    explain:
      'When power is short, crews switch off anything they do not need. Life support always stays on!',
    good: 'Power saved. The batteries are charging back up.',
    bad: 'The ship went dark for a while. Brrr, it got cold in there!',
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** Seconds the team has to decide. */
export const EVENT_SECONDS: Record<Difficulty, number> = { easy: 15, medium: 12, hard: 8 };

/** Chance that a flight has an emergency. */
export const EVENT_CHANCE = 0.7;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic pick for a flight (so a reload shows the same emergency). */
export function pickEvent(seed: string): EventId | null {
  const h = hash(seed);
  if ((h % 1000) / 1000 >= EVENT_CHANCE) return null;
  return EVENT_IDS[(h >>> 10) % EVENT_IDS.length];
}
