import type { Difficulty } from '../data/types.ts';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  tagline: string;
  budget: number; // $M
  checks: {
    comms: boolean;
    heat: boolean;
    pressure: boolean;
    radiation: boolean;
  };
  overBudgetBlocksLaunch: boolean;
  hints: 'strong' | 'on-request' | 'none';
  suggestedBuild: boolean;
  newHere: string[];
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Cadet',
    tagline: 'Close, small, mild worlds. Land and come home.',
    budget: 800,
    checks: { comms: false, heat: false, pressure: false, radiation: false },
    overBudgetBlocksLaunch: false,
    hints: 'strong',
    suggestedBuild: true,
    newHere: ['Lift-off power, rocket power and drive range', 'Cass gives strong hints', '“Suggested build” fills 3 slots'],
  },
  medium: {
    id: 'medium',
    label: 'Engineer',
    tagline: 'Farther worlds, orbit surveys, and real heat and comms limits.',
    budget: 650,
    checks: { comms: true, heat: true, pressure: false, radiation: false },
    overBudgetBlocksLaunch: false,
    hints: 'on-request',
    suggestedBuild: false,
    newHere: ['Comms range and heat shields now matter', 'Orbit surveys of gas-rich worlds', 'Hints on request only'],
  },
  hard: {
    id: 'hard',
    label: 'Flight Director',
    tagline: 'Scorching giants and lava worlds. Every system counts.',
    budget: 600,
    checks: { comms: true, heat: true, pressure: true, radiation: true },
    overBudgetBlocksLaunch: true,
    hints: 'none',
    suggestedBuild: false,
    newHere: ['Pressure systems must match your tanks', 'Crew need radiation protection', 'Over budget? Launch is blocked'],
  },
};
