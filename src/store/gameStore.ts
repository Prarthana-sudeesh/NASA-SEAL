// Game state: signed-in player, campaign (10 launches), current planet, build and dials.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getPlanet } from '../data/planets.ts';
import { ATTEMPTS_PER_RUN, DIFFICULTIES, type Difficulty } from '../game/config.ts';
import {
  DEFAULT_DIALS,
  EMPTY_BUILD,
  launchBlocks,
  quizFor,
  simulate,
  STAGES,
  type Build,
  type Dials,
  type Result,
} from '../game/engine.ts';
import { handled, planHazards, type FlightEvent, type HazardId } from '../game/events.ts';
import { MAX_TEAM, type Team } from '../game/team.ts';
import { safeStorage, setStorageNotice, uid } from './persistence.ts';

export type Screen =
  | 'login'
  | 'mission'
  | 'build'
  | 'launch'
  | 'result'
  | 'summary'
  | 'leaderboard'
  | 'puzzle'
  | 'collection';

export interface Player {
  username: string;
  email: string;
}

export interface Attempt {
  n: number;
  planetId: string;
  build: Build;
  dials: Dials;
  result: Result;
  quiz: { id: string; correct: boolean } | null;
  /** Surprise hazards during the flight (absent if none happened). */
  events?: FlightEvent[];
  /** Older saves: a single emergency. */
  event?: { id: HazardId; choice: number | null; resolved: boolean };
  /** Team members who flew this mission (team mode only). */
  team?: string[];
  /** Leaderboard entry this mission was posted as. */
  postedEntryId?: string;
  /** Lifetime mission number (counts every difficulty). */
  total?: number;
  at: string;
}

export interface Run {
  id: string;
  difficulty: Difficulty;
  attempts: Attempt[];
  startedAt: string;
  submittedEntryId: string | null;
}

export type BuildStep = 'parts' | 'quiz' | 'dials';

/** The player's quiz answer for the upcoming mission. */
export interface QuizAnswer {
  planetId: string;
  mission: number;
  choice: number;
}

export interface GameState {
  screen: Screen;
  player: Player | null;
  briefed: boolean;
  difficulty: Difficulty;
  run: Run | null;
  planetId: string | null;
  build: Build;
  dials: Dials;
  step: BuildStep;
  quiz: QuizAnswer | null;
  launchesWatched: number;
  team: Team | null;
  /** Missions flown in total, across every difficulty. Never resets when switching levels. */
  missionsFlown: number;

  go: (s: Screen) => void;
  signIn: (p: Player) => void;
  signOut: () => void;
  setBriefed: () => void;
  chooseDifficulty: (d: Difficulty) => void;
  choosePlanet: (id: string) => void;
  setBuild: (b: Build) => void;
  setDials: (d: Partial<Dials>) => void;
  setStep: (s: BuildStep) => void;
  answerQuiz: (choice: number) => void;
  /** Mission number the next launch will be. */
  nextMissionNumber: () => number;
  launch: () => Attempt | null;
  markWatched: () => void;
  next: () => void;
  newCampaign: () => void;
  markSubmitted: (id: string) => void;
  /** Remember that mission `n` of the current campaign was posted to the leaderboard. */
  markPosted: (n: number, id: string) => void;
  /** Answer hazard number `index` on the current flight (choice null = ran out of time). */
  resolveEvent: (index: number, choice: number | null) => void;
  /** Start team mode with these player names (first = signed-in player), or null for solo. */
  setTeam: (members: string[] | null) => void;
}

const newRun = (difficulty: Difficulty): Run => ({
  id: uid(),
  difficulty,
  attempts: [],
  startedAt: new Date().toISOString(),
  submittedEntryId: null,
});

const initial = {
  screen: 'login' as Screen,
  player: null,
  briefed: false,
  difficulty: 'easy' as Difficulty,
  run: null,
  planetId: DIFFICULTIES.easy.planets[0],
  build: EMPTY_BUILD,
  dials: DEFAULT_DIALS,
  step: 'parts' as BuildStep,
  quiz: null as QuizAnswer | null,
  launchesWatched: 0,
  team: null as Team | null,
  missionsFlown: 0,
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      go: (screen) => set({ screen }),
      signIn: (player) => set({ player, screen: 'mission' }),
      signOut: () => set({ ...initial }),
      setBriefed: () => set({ briefed: true }),
      chooseDifficulty: (difficulty) => {
        const { run } = get();
        set({
          difficulty,
          planetId: DIFFICULTIES[difficulty].planets[0],
          run:
            run && run.difficulty === difficulty && run.attempts.length < ATTEMPTS_PER_RUN
              ? run
              : null,
          build: {
            ...get().build,
            crew: Math.min(get().build.crew, DIFFICULTIES[difficulty].maxCrew),
          },
        });
      },
      choosePlanet: (planetId) => set({ planetId }),
      setBuild: (build) => set({ build }),
      setDials: (d) => set((s) => ({ dials: { ...s.dials, ...d } })),
      setStep: (step) => set({ step }),
      nextMissionNumber: () => {
        const { run, difficulty } = get();
        return run && run.difficulty === difficulty && run.attempts.length < ATTEMPTS_PER_RUN
          ? run.attempts.length + 1
          : 1;
      },
      answerQuiz: (choice) => {
        const { planetId } = get();
        if (!planetId) return;
        set({ quiz: { planetId, mission: get().nextMissionNumber(), choice } });
      },
      launch: () => {
        const { planetId, build, dials, difficulty } = get();
        const planet = getPlanet(planetId);
        if (!planet || launchBlocks(build, difficulty).length) return null;
        let run = get().run;
        if (!run || run.difficulty !== difficulty || run.attempts.length >= ATTEMPTS_PER_RUN)
          run = newRun(difficulty);
        const n = run.attempts.length + 1;
        const q = quizFor(planet, n);
        const answer = get().quiz;
        const answered =
          answer && answer.planetId === planet.id && answer.mission === n ? answer.choice : null;
        const correct = answered === null ? null : answered === q.answer;
        const first = simulate(build, dials, planet, difficulty, correct);
        // Hazards strike only on stages the rocket reaches (and never before it leaves Earth).
        const failIdx = first.failedAt ? STAGES.indexOf(first.failedAt) : STAGES.length;
        const reachable = STAGES.filter((_, i) => i >= 1 && i <= failIdx);
        const events = planHazards(`${run.id}:${n}`, difficulty, n, reachable);
        const result = events.length
          ? simulate(build, dials, planet, difficulty, correct, {
              handled: 0,
              total: events.length,
            })
          : first;
        const team = get().team;
        const attempt: Attempt = {
          n,
          planetId: planet.id,
          build,
          dials,
          result,
          quiz: correct === null ? null : { id: q.id, correct },
          ...(events.length ? { events } : {}),
          ...(team && team.members.length > 1 ? { team: team.members } : {}),
          total: get().missionsFlown + 1,
          at: new Date().toISOString(),
        };
        set({
          run: { ...run, attempts: [...run.attempts, attempt] },
          screen: 'launch',
          quiz: null,
          missionsFlown: get().missionsFlown + 1,
        });
        return attempt;
      },
      markWatched: () => set((s) => ({ launchesWatched: s.launchesWatched + 1 })),
      next: () => {
        set({
          screen: 'mission',
          step: 'parts',
        });
      },
      newCampaign: () =>
        set((s) => ({ run: newRun(s.difficulty), screen: 'mission', step: 'parts' })),
      markSubmitted: (id) => set((s) => (s.run ? { run: { ...s.run, submittedEntryId: id } } : {})),
      markPosted: (n, id) =>
        set((s) =>
          s.run
            ? {
                run: {
                  ...s.run,
                  attempts: s.run.attempts.map((a) =>
                    a.n === n ? { ...a, postedEntryId: id } : a,
                  ),
                },
              }
            : {},
        ),
      resolveEvent: (index, choice) => {
        const run = get().run;
        const a = run?.attempts.at(-1);
        const planet = getPlanet(a?.planetId);
        const ev = a?.events?.[index];
        if (!run || !a?.events || !ev || ev.resolved || !planet) return;
        const events = a.events.map((e, i) => (i === index ? { ...e, choice, resolved: true } : e));
        const updated: Attempt = {
          ...a,
          events,
          result: simulate(
            a.build,
            a.dials,
            planet,
            run.difficulty,
            a.quiz ? a.quiz.correct : null,
            {
              handled: events.filter(handled).length,
              total: events.length,
            },
          ),
        };
        set({ run: { ...run, attempts: [...run.attempts.slice(0, -1), updated] } });
      },
      setTeam: (members) =>
        set({
          team: members && members.length > 1 ? { members: members.slice(0, MAX_TEAM) } : null,
        }),
    }),
    {
      name: 'rocket-builder:v2',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        screen: s.screen,
        player: s.player,
        briefed: s.briefed,
        difficulty: s.difficulty,
        run: s.run,
        planetId: s.planetId,
        build: s.build,
        dials: s.dials,
        step: s.step,
        quiz: s.quiz,
        launchesWatched: s.launchesWatched,
        team: s.team,
        missionsFlown: s.missionsFlown,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        if (!isValid(persisted)) {
          setStorageNotice('Your saved progress looked damaged, so a fresh game was started.');
          return current;
        }
        const p = persisted as Partial<GameState>;
        const screen =
          p.screen === 'launch' ? 'result' : p.screen === 'summary' ? 'mission' : p.screen;
        // Older saves had no lifetime counter: start from the missions in the saved campaign.
        if (typeof p.missionsFlown !== 'number') p.missionsFlown = p.run?.attempts.length ?? 0;
        return { ...current, ...p, screen: p.player ? (screen ?? 'mission') : 'login' };
      },
    },
  ),
);

function isValid(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const s = p as Partial<GameState>;
  if (s.player && (typeof s.player.username !== 'string' || typeof s.player.email !== 'string'))
    return false;
  if (!s.build || typeof s.build.crew !== 'number') return false;
  if (!s.dials || typeof s.dials.fuel !== 'number') return false;
  if (s.difficulty && !(s.difficulty in DIFFICULTIES)) return false;
  if (
    s.run &&
    (!Array.isArray(s.run.attempts) ||
      s.run.attempts.some((a) => typeof a?.result?.total !== 'number'))
  )
    return false;
  return true;
}

export const currentAttempt = (run: Run | null) => run?.attempts.at(-1);

/** Testing helper. */
export function resetGameStore() {
  useGame.setState({ ...initial });
}
