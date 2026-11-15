import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../data/types.ts';
import type { FailureCause } from '../engine/mission.ts';
import type { Design } from '../engine/rocket.ts';
import type { SlotId } from '../data/components.ts';
import type { Outcome } from '../engine/cutscenes.ts';

export const LAUNCHES_PER_RUN = 10;

export type Screen =
  | 'title'
  | 'briefing'
  | 'difficulty'
  | 'destinations'
  | 'brief'
  | 'workshop'
  | 'prelaunch'
  | 'launch'
  | 'report'
  | 'progress'
  | 'summary'
  | 'leaderboard'
  | 'settings'
  | 'cutscene-test';

export interface Attempt {
  n: number;
  planetId: string;
  design: Design;
  crew: number;
  score: number;
  success: boolean;
  cause: FailureCause | null;
  at: string;
}

export interface GameState {
  screen: Screen;
  /** Screen to go back to from Settings / Leaderboard. */
  returnTo: Screen;
  engineerName: string;
  briefingDone: boolean;
  difficulty: Difficulty | null;
  planetId: string | null;
  design: Design;
  crew: number;
  attempts: Attempt[];
  /** Leaderboard entry ids submitted from this device (highlighted). */
  myEntryIds: string[];
  submittedRunKey: string | null;
  /** Debug only: plays this outcome's cutscene on the next launch. Never persisted. */
  forcedOutcome: Outcome | null;

  go: (screen: Screen) => void;
  open: (screen: 'settings' | 'leaderboard') => void;
  back: () => void;
  setName: (name: string) => void;
  finishBriefing: () => void;
  chooseDifficulty: (d: Difficulty) => void;
  choosePlanet: (id: string) => void;
  placePart: (slot: SlotId, partId: string | null) => void;
  setDesign: (d: Design) => void;
  setCrew: (n: number) => void;
  recordAttempt: (a: Omit<Attempt, 'n' | 'at'>) => Attempt;
  newRun: () => void;
  resetAll: () => void;
  markSubmitted: (entryId: string, runKey: string) => void;
  setForcedOutcome: (o: Outcome | null) => void;
  fillRandomRun: () => void;
}

const fresh = {
  screen: 'title' as Screen,
  returnTo: 'title' as Screen,
  engineerName: '',
  briefingDone: false,
  difficulty: null,
  planetId: null,
  design: {} as Design,
  crew: 0,
  attempts: [] as Attempt[],
  myEntryIds: [] as string[],
  submittedRunKey: null,
  forcedOutcome: null,
};

/** A stable key for the current run, so the same run can't be submitted twice. */
export function runKey(attempts: Attempt[], difficulty: Difficulty | null) {
  return `${difficulty}:${attempts[0]?.at ?? ''}:${attempts.length}`;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...fresh,
      go: (screen) => set({ screen }),
      open: (screen) => {
        const cur = get().screen;
        set({ returnTo: cur === 'settings' || cur === 'leaderboard' ? get().returnTo : cur, screen });
      },
      back: () => set({ screen: get().returnTo || 'title' }),
      setName: (engineerName) => set({ engineerName }),
      finishBriefing: () => set({ briefingDone: true }),
      chooseDifficulty: (difficulty) => {
        const s = get();
        // Changing difficulty starts a new run.
        if (s.difficulty !== difficulty) set({ difficulty, attempts: [], planetId: null, design: {}, crew: 0, submittedRunKey: null });
      },
      choosePlanet: (planetId) => set({ planetId }),
      placePart: (slot, partId) => set({ design: { ...get().design, [slot]: partId } }),
      setDesign: (design) => set({ design }),
      setCrew: (crew) => set({ crew: Math.max(0, Math.min(4, crew)) }),
      recordAttempt: (a) => {
        const attempt: Attempt = { ...a, n: get().attempts.length + 1, at: new Date().toISOString() };
        set({ attempts: [...get().attempts, attempt].slice(0, LAUNCHES_PER_RUN) });
        return attempt;
      },
      newRun: () => set({ attempts: [], planetId: null, submittedRunKey: null, screen: 'difficulty' }),
      resetAll: () => set({ ...fresh }),
      markSubmitted: (entryId, key) => set({ myEntryIds: [...get().myEntryIds, entryId], submittedRunKey: key }),
      setForcedOutcome: (forcedOutcome) => set({ forcedOutcome }),
      fillRandomRun: () => {
        const at = Date.now();
        const attempts: Attempt[] = Array.from({ length: LAUNCHES_PER_RUN }, (_, i) => {
          const success = Math.random() > 0.35;
          return {
            n: i + 1, planetId: 'proxima-cen-b', design: get().design, crew: 0, success, cause: success ? null : 'orbit_fuel',
            score: Math.round((success ? 600 + Math.random() * 500 : Math.random() * 300) * 10) / 10,
            at: new Date(at + i * 1000).toISOString(),
          };
        });
        set({ attempts, difficulty: get().difficulty ?? 'easy', submittedRunKey: null });
      },
    }),
    {
      name: 'starbound.run.v1',
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { forcedOutcome, screen, ...rest } = s;
        // Resume on a safe screen: never mid-cutscene.
        const safe: Screen = screen === 'launch' || screen === 'cutscene-test' ? 'report' : screen;
        return { ...rest, screen: safe };
      },
    },
  ),
);
