import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../../data/types.ts';
import { DIFFICULTY_IDS } from '../../data/types.ts';
import { getLeaderboardService } from '../../services/leaderboard/index.ts';
import { LEADERBOARD_LIMIT, sortEntries } from '../../services/leaderboard/LeaderboardService.ts';
import { useGame } from '../../store/gameStore.ts';
import { PLANETS } from '../../data/planets.ts';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import { useSettings } from '../../store/settingsStore.ts';
import { DIFFICULTIES, type Difficulty } from '../config.ts';
import { Pill, TopMenu } from '../ui/Hud.tsx';
import { CommandCenter, Stage, WallScreen } from '../ui/Scenery.tsx';

const DIFF_STYLE: Record<Difficulty, string> = {
  easy: 'bg-ok/25 text-ok',
  medium: 'bg-warn/25 text-warn',
  hard: 'bg-bad/30 text-[#ff8a8a]',
};

type Load =
  { s: 'loading' } | { s: 'ready'; rows: LeaderboardEntry[] } | { s: 'error'; msg: string };

export function Leaderboard() {
  const { difficulty, go, run } = useGame();
  const mine = useSettings((s) => s.myEntryIds);
  const [tab, setTab] = useState<Difficulty | 'all'>('all');
  const [load, setLoad] = useState<Load>({ s: 'loading' });
  const [reload, setReload] = useState(0);
  const [kind, setKind] = useState<'shared' | 'local' | 'remote' | null>(null);

  useEffect(() => {
    let alive = true;
    setLoad({ s: 'loading' });
    getLeaderboardService()
      .then((svc) => {
        if (alive) setKind(svc.kind);
        // "All" merges the three difficulty boards into one.
        return tab === 'all'
          ? Promise.all(DIFFICULTY_IDS.map((d) => svc.list(d, LEADERBOARD_LIMIT))).then((lists) =>
              sortEntries(lists.flat()).slice(0, LEADERBOARD_LIMIT),
            )
          : svc.list(tab, LEADERBOARD_LIMIT);
      })
      .then((rows) => alive && setLoad({ s: 'ready', rows }))
      .catch(
        (e: unknown) =>
          alive &&
          setLoad({
            s: 'error',
            msg: e instanceof Error ? e.message : 'Could not load the leaderboard.',
          }),
      );
    return () => {
      alive = false;
    };
  }, [tab, reload]);

  const back =
    run && run.attempts.length >= 10 && run.difficulty === difficulty ? 'summary' : 'mission';
  const tabLabel = tab === 'all' ? 'All difficulties' : DIFFICULTIES[tab].label;
  return (
    <Stage>
      <CommandCenter>
        <TopMenu />
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="title-font outlined absolute left-1/2 top-[3%] -translate-x-1/2 text-[clamp(20px,3.6vw,50px)]"
        >
          🏆 LEADERBOARD
        </motion.h1>
        <WallScreen
          title="Best missions · top 20"
          className="left-1/2 top-[15%] h-[72%] w-[70%] -translate-x-1/2"
        >
          <div className="flex h-full flex-col gap-[2%] text-[clamp(8px,0.95vw,13px)]">
            <div className="flex gap-2" role="group" aria-label="Difficulty">
              <Pill active={tab === 'all'} onClick={() => setTab('all')}>
                All
              </Pill>
              {DIFFICULTY_IDS.map((d) => (
                <Pill key={d} active={tab === d} onClick={() => setTab(d)}>
                  {DIFFICULTIES[d].label}
                </Pill>
              ))}
              <button type="button" className="ml-auto underline" onClick={() => go(back)}>
                ◂ Back
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={load.s === 'loading'}>
              {load.s === 'loading' && <p>Loading…</p>}
              {load.s === 'error' && (
                <p role="alert" className="text-bad">
                  ✕ {load.msg}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setReload((r) => r + 1)}
                  >
                    Retry
                  </button>
                </p>
              )}
              {load.s === 'ready' && load.rows.length === 0 && (
                <p className="text-[#9fd8e6]">
                  No {tab === 'all' ? '' : `${DIFFICULTIES[tab].label} `}missions yet. Fly just one
                  mission to get on the board!
                </p>
              )}
              {load.s === 'ready' && load.rows.length > 0 && (
                <table className="w-full">
                  <caption className="sr-only">{tabLabel} leaderboard</caption>
                  <thead>
                    <tr className="text-left text-[#5ff3ff]">
                      <th className="py-1 font-normal">#</th>
                      <th className="py-1 font-normal">Player</th>
                      <th className="py-1 text-right font-normal">Score</th>
                      <th className="py-1 pl-3 font-normal">Planet</th>
                      <th className="py-1 font-normal">Difficulty</th>
                      <th className="py-1 text-center font-normal">Result</th>
                      <th className="py-1 font-normal">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {load.rows.map((e, i) => {
                      const me = mine.includes(e.id);
                      return (
                        <motion.tr
                          key={e.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className={`border-t border-[#5ff3ff]/15 ${me ? 'bg-[#ffe24a]/20' : ''}`}
                          aria-current={me ? 'true' : undefined}
                        >
                          <td className="py-1 font-bold">
                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                          </td>
                          <td className="py-1 font-semibold">
                            {e.name}
                            {me && (
                              <span className="ml-1 rounded bg-[#ffe24a] px-1 text-[10px] text-[#0b0f1e]">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-1 text-right font-bold text-[#ffb35a] tabular-nums">
                            {e.average}
                          </td>
                          <td
                            className="max-w-[16vw] truncate py-1 pl-3"
                            title={e.planet ?? e.planetsVisited.join(', ')}
                          >
                            {(() => {
                              const p = PLANETS.find((x) => x.name === e.planet);
                              return (
                                <span className="inline-flex items-center gap-1">
                                  {p && <PlanetVisual planet={p} size={16} decorative />}
                                  {e.planet ?? `${e.planetsVisited.length} planets (campaign)`}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[clamp(8px,0.8vw,11px)] font-bold ${DIFF_STYLE[e.difficulty]}`}
                            >
                              {DIFFICULTIES[e.difficulty].label}
                            </span>
                          </td>
                          <td
                            className="py-1 text-center"
                            aria-label={
                              e.success === undefined ? '' : e.success ? 'Round trip' : 'Failed'
                            }
                          >
                            {e.success === undefined ? '·' : e.success ? '✅' : '❌'}
                          </td>
                          <td className="py-1 text-[#9fd8e6]">
                            {new Date(e.date).toLocaleDateString()}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-[#9fd8e6]">
              {kind === 'shared' || kind === 'remote'
                ? '🌐 Shared online leaderboard: everyone playing this game sees it. Each player’s best mission per difficulty. Emails are never shown.'
                : 'Every mission counts! Your best score for each planet and difficulty is saved on this device. Emails are never shown.'}
            </p>
          </div>
        </WallScreen>
      </CommandCenter>
    </Stage>
  );
}
