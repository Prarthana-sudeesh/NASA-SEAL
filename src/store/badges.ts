// Achievement badges, earned on this device. Newly earned badges pop up as a toast in the top-right
// corner and live on the 🏅 shelf in the top bar. Idea and several badges from the Secondary-prototype branch.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../data/types.ts';
import type { HazardId, HazardResult } from '../hazards/hazards.ts';

export type BadgeId =
  | 'first-flight'
  | 'round-trip'
  | 'hz-aliens'
  | 'hz-blackhole'
  | 'hz-gravity'
  | 'hz-asteroids'
  | 'hz-debris'
  | 'hz-quasar'
  | 'hz-flare'
  | 'quiz-whiz'
  | 'ace-pilot'
  | 'hazard-hero'
  | 'director-grit';

export interface BadgeInfo {
  id: BadgeId;
  icon: string;
  name: string;
  how: string;
}

export const BADGES: BadgeInfo[] = [
  { id: 'first-flight', icon: '🚀', name: 'First Flight', how: 'Finish your first launch.' },
  { id: 'round-trip', icon: '🌍', name: 'Round Trip', how: 'Fly to a planet and splash down safely back home.' },
  { id: 'hz-aliens', icon: '🛸', name: 'Close Encounter', how: 'You met an alien spaceship and got away!' },
  { id: 'hz-blackhole', icon: '🕳️', name: 'Event Horizon Escapee', how: 'Escape the pull of a black hole.' },
  { id: 'hz-gravity', icon: '🪐', name: 'Gravity Breaker', how: 'Break free of a giant planet’s gravity.' },
  { id: 'hz-asteroids', icon: '☄️', name: 'Rock Dodger', how: 'Make it through an asteroid swarm.' },
  { id: 'hz-debris', icon: '🛰️', name: 'Junk Jockey', how: 'Dodge a cloud of space debris.' },
  { id: 'hz-quasar', icon: '💫', name: 'Quasar Gazer', how: 'Survive a quasar’s beam.' },
  { id: 'hz-flare', icon: '☀️', name: 'Storm Chaser', how: 'Shelter from a solar flare.' },
  { id: 'quiz-whiz', icon: '🧠', name: 'Quiz Whiz', how: 'Answer 5 hazard quizzes correctly.' },
  { id: 'ace-pilot', icon: '🕹️', name: 'Ace Pilot', how: 'Win 5 hazard mini-games.' },
  { id: 'hazard-hero', icon: '🦸', name: 'Hazard Hero', how: 'Beat 3 hazards on one flight.' },
  { id: 'director-grit', icon: '🎖️', name: 'Director’s Nerve', how: 'Beat a hazard on Flight Director.' },
];

export const badgeInfo = (id: BadgeId) => BADGES.find((b) => b.id === id)!;

const HAZARD_BADGE: Record<HazardId, BadgeId> = {
  aliens: 'hz-aliens',
  blackhole: 'hz-blackhole',
  gravity: 'hz-gravity',
  asteroids: 'hz-asteroids',
  debris: 'hz-debris',
  quasar: 'hz-quasar',
  flare: 'hz-flare',
};

interface BadgeState {
  earned: Partial<Record<BadgeId, string>>;
  quizWins: number;
  gameWins: number;
  /** Badges waiting to pop up (not persisted). */
  toasts: BadgeId[];
  award: (id: BadgeId) => void;
  /** Call after each hazard is resolved. */
  hazardDone: (r: HazardResult, d: Difficulty) => void;
  /** Call when a flight's cutscene ends. */
  flightDone: (success: boolean, hazards: HazardResult[]) => void;
  dismiss: () => void;
}

export const useBadges = create<BadgeState>()(
  persist(
    (set, get) => ({
      earned: {},
      quizWins: 0,
      gameWins: 0,
      toasts: [],
      award: (id) => {
        if (get().earned[id]) return;
        set({ earned: { ...get().earned, [id]: new Date().toISOString() }, toasts: [...get().toasts, id] });
      },
      hazardDone: (r, d) => {
        if (!r.won) return;
        const s = get();
        const quizWins = s.quizWins + (r.mode === 'quiz' ? 1 : 0);
        const gameWins = s.gameWins + (r.mode === 'game' ? 1 : 0);
        set({ quizWins, gameWins });
        s.award(HAZARD_BADGE[r.id]);
        if (quizWins >= 5) get().award('quiz-whiz');
        if (gameWins >= 5) get().award('ace-pilot');
        if (d === 'hard') get().award('director-grit');
      },
      flightDone: (success, hazards) => {
        get().award('first-flight');
        if (success) get().award('round-trip');
        if (hazards.filter((h) => h.won).length >= 3) get().award('hazard-hero');
      },
      dismiss: () => set({ toasts: get().toasts.slice(1) }),
    }),
    {
      name: 'orbitaluprise.badges.v1',
      partialize: (s) => ({ earned: s.earned, quizWins: s.quizWins, gameWins: s.gameWins }),
    },
  ),
);
