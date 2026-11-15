import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  /** 'auto' follows prefers-reduced-motion. */
  calm: 'auto' | 'on' | 'off';
  haptics: boolean;
  textScale: 1 | 1.15 | 1.3;
  autoExplain: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  master: 0.9,
  music: 0.5,
  sfx: 0.8,
  muted: false,
  calm: 'auto' as const,
  haptics: true,
  textScale: 1 as const,
  autoExplain: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'starbound.settings.v1' },
  ),
);

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function isCalm(s: Pick<SettingsState, 'calm'> = useSettings.getState()): boolean {
  return s.calm === 'on' || (s.calm === 'auto' && prefersReducedMotion());
}

export function useCalm(): boolean {
  const calm = useSettings((s) => s.calm);
  return isCalm({ calm });
}
