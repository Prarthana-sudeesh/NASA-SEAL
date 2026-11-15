// Saved collections: postcards, badges, crew photos. One per player name, on this device only.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  EMPTY_COLLECTION,
  recordFlight,
  recordPuzzle,
  type BadgeId,
  type Collection,
  type FlightRecord,
  type Unlocks,
} from '../game/collection.ts';
import { useGame } from './gameStore.ts';
import { safeStorage } from './persistence.ts';

interface CollectionState {
  /** Player name (lower case) → that player's collection. */
  players: Record<string, Collection>;
  /** What the most recent flight unlocked, for the mission report. */
  lastUnlocks: Unlocks | null;
  addFlight: (player: string, f: FlightRecord) => void;
  addPuzzle: (player: string, points: number, correct: number, rounds: number) => BadgeId[];
}

const id = (player: string) => player.trim().toLowerCase();

export const useCollections = create<CollectionState>()(
  persist(
    (set, get) => ({
      players: {},
      lastUnlocks: null,
      addFlight: (player, f) => {
        const mine = get().players[id(player)] ?? EMPTY_COLLECTION;
        const out = recordFlight(mine, f);
        if (out)
          set((s) => ({
            players: { ...s.players, [id(player)]: out.next },
            lastUnlocks: out.unlocks,
          }));
      },
      addPuzzle: (player, points, correct, rounds) => {
        const mine = get().players[id(player)] ?? EMPTY_COLLECTION;
        const out = recordPuzzle(mine, points, correct, rounds);
        set((s) => ({ players: { ...s.players, [id(player)]: out.next } }));
        return out.badges;
      },
    }),
    {
      name: 'rocket-builder:collection',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ players: s.players, lastUnlocks: s.lastUnlocks }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CollectionState> | undefined;
        if (!p || typeof p !== 'object' || !p.players || typeof p.players !== 'object')
          return current;
        return { ...current, players: p.players, lastUnlocks: p.lastUnlocks ?? null };
      },
    },
  ),
);

/** The signed-in player's collection. */
export function useMyCollection(): Collection {
  const name = useGame((s) => s.player?.username ?? '');
  return useCollections((s) => s.players[id(name)]) ?? EMPTY_COLLECTION;
}
