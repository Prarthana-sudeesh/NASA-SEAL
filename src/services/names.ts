// Engineer-name rules: 1–20 characters, trimmed, a basic profanity filter (also applied when
// displaying names from the leaderboard), and HTML-escaped wherever it is put into markup.

const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'pussy', 'asshole', 'bastard', 'slut', 'whore', 'nigger', 'nigga',
  'retard', 'nazi', 'penis', 'vagina', 'wank', 'twat', 'dick', 'cock', 'fag', 'rape', 'porn',
];
// Short words that appear inside ordinary names (Dickens, Hitchcock, Scunthorpe…) only match as whole words.
const WHOLE_WORD_ONLY = new Set(['dick', 'cock', 'fag', 'rape', 'porn', 'cunt', 'twat']);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

export function normalise(s: string) {
  return s.toLowerCase().split('').map((c) => LEET[c] ?? c).join('');
}

export function isProfane(name: string): boolean {
  const n = normalise(name);
  const squashed = n.replace(/[^a-z]/g, '');
  const words = n.split(/[^a-z]+/).filter(Boolean);
  return BLOCKED.some((w) => (WHOLE_WORD_ONLY.has(w) ? words.includes(w) : squashed.includes(w)));
}

export interface NameResult {
  ok: boolean;
  value: string;
  error?: string;
}

export function cleanName(input: string): NameResult {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length < 1) return { ok: false, value, error: 'Please type a name.' };
  if (value.length > 20) return { ok: false, value, error: 'Names can be at most 20 characters.' };
  if (/[<>]/.test(value)) return { ok: false, value, error: 'Please leave out < and >.' };
  if (isProfane(value)) return { ok: false, value, error: 'Let’s pick a friendlier name.' };
  return { ok: true, value };
}

/** For displaying names from other players. */
export function displayName(name: string): string {
  const v = name.trim().slice(0, 20);
  return isProfane(v) ? 'Space Cadet' : v;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
