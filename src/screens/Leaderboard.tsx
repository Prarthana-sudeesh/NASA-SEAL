import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../store/game.ts';
import { getLeaderboard, type LeaderboardEntry } from '../services/leaderboard.ts';
import { displayName } from '../services/names.ts';
import type { Difficulty } from '../data/types.ts';
import { DIFFICULTY_LABEL } from '../data/types.ts';
import { Button } from '../ui/Button.tsx';
import { ScreenTitle } from '../ui/bits.tsx';
import { play } from '../audio/audio.ts';

type Tab = 'all' | Difficulty;
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'easy', label: 'Cadet' },
  { id: 'medium', label: 'Engineer' },
  { id: 'hard', label: 'Flight Director' },
];
const BADGE: Record<Difficulty, string> = { easy: 'bg-go text-ink', medium: 'bg-plume text-ink', hard: 'bg-danger text-ink' };
const PODIUM = ['bg-plume', 'bg-cream', 'bg-orange'];

export default function Leaderboard() {
  const { back, myEntryIds } = useGame();
  const [tab, setTab] = useState<Tab>('all');
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [err, setErr] = useState('');
  const svc = getLeaderboard();

  const load = useCallback(() => {
    setErr('');
    svc.list(tab, 50).then(setRows, (e: Error) => {
      setErr(e.message);
      setRows([]);
    });
  }, [svc, tab]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);
  useEffect(() => svc.subscribe?.(load), [svc, load]);

  const top = rows?.slice(0, 3) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ScreenTitle kicker="Hall of engineers" title="Leaderboard">
          Average score over a full run of 10 launches.
        </ScreenTitle>
        <div className="mb-6 flex items-center gap-3">
          {svc.kind === 'local' ? (
            <span className="rounded-full border-2 border-ink bg-amber px-3 py-1 text-sm font-extrabold text-ink" data-testid="offline-badge">
              Offline: scores saved on this device only
            </span>
          ) : (
            <span className="rounded-full border-2 border-ink bg-go px-3 py-1 text-sm font-extrabold text-ink">● Live leaderboard</span>
          )}
          <Button variant="ghost" onClick={back}>
            ← Back
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Difficulty">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              play('ui_click');
              setTab(t.id);
            }}
            className={`rounded-xl border-[3px] border-ink px-4 py-2 font-display text-lg font-bold ${tab === t.id ? 'bg-magenta text-cream shadow-[3px_3px_0_#000]' : 'bg-panel-2 text-cream'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {top.length > 0 && (
        <div className="mb-8 flex items-end justify-center gap-3 md:gap-6" aria-hidden="true">
          {[1, 0, 2].map((i) => {
            const e = top[i];
            if (!e) return <div key={i} className="w-28 md:w-44" />;
            const h = ['h-40', 'h-28', 'h-20'][i];
            return (
              <div key={e.id} className="flex w-28 flex-col items-center md:w-44">
                <p className="max-w-full truncate font-display text-lg font-bold">{displayName(e.name)}</p>
                <p className="font-mono text-plume">{e.avg_score.toFixed(1)}</p>
                <div className={`sticker mt-1 grid w-full place-items-center ${h} ${PODIUM[i]} font-display text-4xl font-bold text-ink`}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sticker overflow-x-auto bg-panel">
        <table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">Leaderboard, {TABS.find((t) => t.id === tab)!.label}</caption>
          <thead className="border-b-[3px] border-ink bg-panel-2 font-display">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Average score (10 launches)</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody data-testid="lb-rows">
            {rows === null && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  {err ? `Couldn’t load the leaderboard: ${err}` : 'No runs yet. Be the first!'}
                </td>
              </tr>
            )}
            {rows?.map((e, i) => {
              const mine = myEntryIds.includes(e.id);
              return (
                <tr key={e.id} className={`border-b border-white/10 ${mine ? 'bg-magenta/25 font-bold' : i % 2 ? 'bg-space/30' : ''}`} aria-current={mine ? 'true' : undefined}>
                  <td className="px-4 py-2 font-mono text-lg">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                  <td className="px-4 py-2">
                    {displayName(e.name)}
                    {mine && <span className="ml-2 rounded bg-magenta px-1.5 text-xs text-cream">you</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-lg text-plume">{e.avg_score.toFixed(1)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-sm font-extrabold ${BADGE[e.difficulty]}`}>{DIFFICULTY_LABEL[e.difficulty]}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
