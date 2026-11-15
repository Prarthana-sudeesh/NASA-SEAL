// Team mode: up to four players share one device. Each role owns part of the mission.
import type { SlotKind } from './config.ts';

export type Role = 'engineer' | 'scientist' | 'comms' | 'chief';

export const ROLE_ORDER: Role[] = ['engineer', 'scientist', 'comms', 'chief'];

export const ROLES: Record<Role, { title: string; icon: string; owns: string }> = {
  engineer: {
    title: 'Flight Engineer',
    icon: '🔧',
    owns: 'Thruster, fuel tank, and the fuel and thrust dials',
  },
  scientist: {
    title: 'Mission Scientist',
    icon: '🔬',
    owns: 'Payload, crew and the science check',
  },
  comms: { title: 'Comms Officer', icon: '📡', owns: 'Antenna, and staying in touch with Earth' },
  chief: {
    title: 'Safety & Budget Chief',
    icon: '🛡️',
    owns: 'Hull, pressure seal and the budget',
  },
};

/** Who decides each rocket part. */
export const SLOT_ROLE: Record<SlotKind, Role> = {
  payload: 'scientist',
  antenna: 'comms',
  body: 'engineer',
  hull: 'chief',
  engine: 'engineer',
};

export const DIAL_ROLE = { fuel: 'engineer', thrust: 'engineer', pressure: 'chief' } as const;

export const MAX_TEAM = 4;

export interface Team {
  /** Player names; the first is the signed-in player. */
  members: string[];
}

/** Roles held by member `i`. With fewer than four players, people take more than one role. */
export function rolesOf(team: Team, i: number): Role[] {
  const n = Math.max(1, team.members.length);
  return ROLE_ORDER.filter((_, r) => r % n === i);
}

/** Name of the player who holds `role`, or null outside team mode. */
export function holder(team: Team | null | undefined, role: Role): string | null {
  if (!team || team.members.length < 2) return null;
  return team.members[ROLE_ORDER.indexOf(role) % team.members.length] ?? null;
}

/** "Sam (Flight Engineer)" or null outside team mode. */
export function whoDecides(team: Team | null | undefined, role: Role): string | null {
  const name = holder(team, role);
  return name ? `${ROLES[role].icon} ${name} (${ROLES[role].title})` : null;
}
