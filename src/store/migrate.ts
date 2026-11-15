// The game was renamed from STARBOUND to Orbital Uprise. Carry saved progress, settings and the
// device leaderboard across to the new storage keys once. Must run before the stores are created.
const MOVES: [string, string][] = [
  ['starbound.run.v1', 'orbitaluprise.run.v1'],
  ['starbound.settings.v1', 'orbitaluprise.settings.v1'],
  ['starbound.leaderboard.v1', 'orbitaluprise.leaderboard.v1'],
];
try {
  for (const [from, to] of MOVES) {
    const v = localStorage.getItem(from);
    if (v !== null && localStorage.getItem(to) === null) localStorage.setItem(to, v);
    if (v !== null) localStorage.removeItem(from);
  }
} catch {
  /* storage unavailable (private mode): nothing to migrate */
}
export {};
