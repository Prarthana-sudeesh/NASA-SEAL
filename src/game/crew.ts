// The astronauts: three personalities who chat during the flight.
import type { CheckId, Stage } from './engine.ts';

export type Trait = 'calm' | 'worrier' | 'joker';

export interface CrewMember {
  name: string;
  trait: Trait;
  role: string;
  suit: string;
}

export const CREW: CrewMember[] = [
  { name: 'Cmdr. Kai', trait: 'calm', role: 'Commander', suit: '#ffb35a' },
  { name: 'Rosa', trait: 'worrier', role: 'Pilot', suit: '#5ff3ff' },
  { name: 'Milo', trait: 'joker', role: 'Engineer', suit: '#3ddc84' },
];

export type Moment = 'countdown' | Stage | 'event' | 'home';

type Lines = Record<Trait, string>;

const MOMENTS: Record<Moment, Lines> = {
  countdown: {
    calm: 'All systems green. Let’s fly.',
    worrier: 'Did everyone pack snacks? I packed extra snacks.',
    joker: 'Is it too late to ask where the bathroom is?',
  },
  launch: {
    calm: 'Smooth lift-off. Nice work, team.',
    worrier: 'We’re going up! We’re really going up!',
    joker: 'Wheee! Best rollercoaster ever.',
  },
  journey: {
    calm: 'Long way to go. Keep an eye on the fuel.',
    worrier: 'How many light-years is it again? Actually, don’t tell me.',
    joker: 'Are we there yet? …Are we there yet?',
  },
  approach: {
    calm: 'Planet in sight. Stay sharp.',
    worrier: 'It’s beautiful. And a little bit scary.',
    joker: 'Window seat! I called the window seat!',
  },
  landing: {
    calm: 'Touchdown. Gently does it.',
    worrier: 'Solid ground! I could hug it.',
    joker: 'One small step for me, one giant leap for my lunchbox.',
  },
  ascent: {
    calm: 'Engines up. Time to go home.',
    worrier: 'Please work, please work, please work…',
    joker: 'Bye, planet! We’ll send a postcard.',
  },
  return: {
    calm: 'Earth in sight. Prepare for splashdown.',
    worrier: 'Clouds! I’ve never been so happy to see clouds.',
    joker: 'Home sweet home. Who’s making dinner?',
  },
  event: {
    calm: 'Stay calm. Pick the right fix.',
    worrier: 'Oh no, oh no, oh no!',
    joker: 'Plot twist!',
  },
  home: {
    calm: 'Mission complete. Proud of every one of you.',
    worrier: 'We made it! I wasn’t worried. Okay, I was a little worried.',
    joker: 'Let’s do that again. Tomorrow. After a nap.',
  },
};

const FAILURES: Record<CheckId, Lines> = {
  'twr-earth': {
    calm: 'We’re too heavy. Abort!',
    worrier: 'Why aren’t we going up?!',
    joker: 'I think we need a bigger push.',
  },
  comms: {
    calm: 'Mission Control, do you read? …Anyone?',
    worrier: 'They can’t hear us! The antenna can’t reach!',
    joker: 'Hello? Is this thing on?',
  },
  fuel: {
    calm: 'Fuel’s gone. We needed more for the trip home.',
    worrier: 'The gauge says empty! It says EMPTY!',
    joker: 'Next time I’m packing a spare can of fuel.',
  },
  heat: {
    calm: 'Hull’s too hot. This metal can’t take it!',
    worrier: 'It’s getting really, really warm in here!',
    joker: 'Who turned the oven on?',
  },
  'pressure-low': {
    calm: 'Outside pressure is crushing the cabin!',
    worrier: 'The walls are creaking!',
    joker: 'I feel like a squeezed juice box.',
  },
  'pressure-high': {
    calm: 'Seal pressure’s too high for this hull!',
    worrier: 'Something just went POP!',
    joker: 'That’s what happens when you over-blow a balloon.',
  },
  'twr-planet': {
    calm: 'Gravity’s too strong. We can’t lift off.',
    worrier: 'We’re stuck! We’re stranded!',
    joker: 'Guess we live here now. Nice view, at least.',
  },
};

const PROBE: Record<Moment | 'fail', string> = {
  countdown: 'BEEP. All systems nominal.',
  launch: 'BOOP. Altitude increasing.',
  journey: 'Calculating… calculating… still far away.',
  approach: 'Target planet detected. Taking pictures.',
  landing: 'Touchdown. Sampling soil. Mmm, data.',
  ascent: 'Returning to Earth with science.',
  return: 'Earth detected. Opening parachute.',
  event: 'WARNING. WARNING. Human help needed.',
  home: 'Mission complete. Robot happy.',
  fail: 'ERROR. ERROR. Mission failed. Sad beep.',
};

/** Which crew member speaks at each moment (wraps round for smaller crews). */
const SPEAKER: Record<Moment | 'fail', number> = {
  countdown: 0,
  launch: 2,
  journey: 1,
  approach: 0,
  landing: 2,
  ascent: 1,
  return: 0,
  event: 1,
  home: 2,
  fail: 1,
};

export interface CrewLine {
  speaker: string;
  text: string;
  probe: boolean;
}

/** What the crew says at a moment of the flight. `failed` is the check that just failed, if any. */
export function crewLine(crew: number, moment: Moment, failed: CheckId | null = null): CrewLine {
  const key = failed ? 'fail' : moment;
  if (crew <= 0) return { speaker: 'Probe', text: PROBE[key], probe: true };
  const who = CREW[SPEAKER[key] % Math.min(crew, CREW.length)];
  const text = failed ? FAILURES[failed][who.trait] : MOMENTS[moment][who.trait];
  return { speaker: who.name, text, probe: false };
}

export const crewNames = (crew: number) => CREW.slice(0, crew).map((c) => c.name);
