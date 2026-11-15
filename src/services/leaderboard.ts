import type { Difficulty } from '../data/types.ts';
import { cleanName } from './names.ts';
import { LAUNCHES_PER_RUN } from '../store/game.ts';
import { MAX_PER_LAUNCH } from '../engine/score.ts';

export interface LeaderboardEntry {
  id: string;
  name: string;
  difficulty: Difficulty;
  avg_score: number;
  attempts: number;
  created_at: string;
}

export interface NewEntry {
  name: string;
  difficulty: Difficulty;
  avg_score: number;
  attempts: number;
}

export interface LeaderboardService {
  kind: 'supabase' | 'local';
  list(difficulty: Difficulty | 'all', limit?: number): Promise<LeaderboardEntry[]>;
  submit(entry: NewEntry): Promise<LeaderboardEntry>;
  /** Live updates (Supabase realtime). Returns an unsubscribe function. */
  subscribe?(onChange: () => void): () => void;
}

/** Same rules as the database policy (supabase/schema.sql). */
export function validateEntry(e: NewEntry): string | null {
  const n = cleanName(e.name);
  if (!n.ok) return n.error!;
  if (!['easy', 'medium', 'hard'].includes(e.difficulty)) return 'Unknown difficulty.';
  if (e.attempts !== LAUNCHES_PER_RUN) return `A run must have exactly ${LAUNCHES_PER_RUN} launches.`;
  if (!(e.avg_score >= 0 && e.avg_score <= MAX_PER_LAUNCH)) return 'Score out of range.';
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ── localStorage implementation ────────────────────────────────────
const KEY = 'starbound.leaderboard.v1';

export class LocalLeaderboardService implements LeaderboardService {
  kind = 'local' as const;
  private read(): LeaderboardEntry[] {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  async list(difficulty: Difficulty | 'all', limit = 50) {
    return this.read()
      .filter((e) => difficulty === 'all' || e.difficulty === difficulty)
      .sort((a, b) => b.avg_score - a.avg_score || a.created_at.localeCompare(b.created_at))
      .slice(0, limit);
  }
  async submit(e: NewEntry) {
    const err = validateEntry(e);
    if (err) throw new Error(err);
    const entry: LeaderboardEntry = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: cleanName(e.name).value,
      difficulty: e.difficulty,
      avg_score: round1(e.avg_score),
      attempts: e.attempts,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify([...this.read(), entry]));
    return entry;
  }
}

// ── Supabase implementation ────────────────────────────────────────
export class SupabaseLeaderboardService implements LeaderboardService {
  kind = 'supabase' as const;
  private client: Promise<import('@supabase/supabase-js').SupabaseClient>;
  constructor(url: string, anonKey: string) {
    this.client = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, anonKey, { auth: { persistSession: false } }));
  }
  async list(difficulty: Difficulty | 'all', limit = 50) {
    const c = await this.client;
    let q = c.from('leaderboard').select('id,name,difficulty,avg_score,attempts,created_at').order('avg_score', { ascending: false }).order('created_at').limit(limit);
    if (difficulty !== 'all') q = q.eq('difficulty', difficulty);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, avg_score: Number(r.avg_score) })) as LeaderboardEntry[];
  }
  async submit(e: NewEntry) {
    const err = validateEntry(e);
    if (err) throw new Error(err);
    const c = await this.client;
    const row = { name: cleanName(e.name).value, difficulty: e.difficulty, avg_score: round1(e.avg_score), attempts: e.attempts };
    const { data, error } = await c.from('leaderboard').insert(row).select().single();
    if (error) throw new Error(error.message);
    return { ...data, avg_score: Number(data.avg_score) } as LeaderboardEntry;
  }
  subscribe(onChange: () => void) {
    let unsub = () => {};
    void this.client.then((c) => {
      const ch = c
        .channel('leaderboard-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, () => onChange())
        .subscribe();
      unsub = () => void c.removeChannel(ch);
    });
    return () => unsub();
  }
}

// ── Factory ────────────────────────────────────────────────────────
export const OFFLINE_FLAG = 'starbound.forceOffline';

let cached: LeaderboardService | null = null;
export function getLeaderboard(): LeaderboardService {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  let forced = false;
  try {
    forced = localStorage.getItem(OFFLINE_FLAG) === '1';
  } catch {
    /* ignore */
  }
  const wantRemote = !!url && !!key && !forced;
  if (cached && (cached.kind === 'supabase') === wantRemote) return cached;
  cached = wantRemote ? new SupabaseLeaderboardService(url!, key!) : new LocalLeaderboardService();
  return cached;
}
export function supabaseConfigured() {
  return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
}
