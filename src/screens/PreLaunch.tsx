import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/game.ts';
import { getPlanet } from '../data/planets.ts';
import { evaluateMission, launchBlockers } from '../engine/mission.ts';
import { outcomeFor } from '../engine/cutscenes.ts';
import { primeSequence, prefetchSequence } from '../cutscene/sequences.ts';
import { LAUNCHES_PER_RUN } from '../store/game.ts';
import { telemetry, type Level } from '../engine/telemetry.ts';
import { rocketStats } from '../engine/rocket.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { crewMultiplier } from '../engine/score.ts';
import { Button } from '../ui/Button.tsx';
import { Card, Redirect, ScreenTitle } from '../ui/bits.tsx';
import { CassSays } from '../ui/Cass.tsx';
import { play, unlockAudio } from '../audio/audio.ts';
import { useCalm } from '../store/settings.ts';
import { Gauge } from '../ui/Gauge.tsx';

const STATIONS: { name: string; stat: string }[] = [
  { name: 'Booster', stat: 'twr' },
  { name: 'Structures', stat: 'mass' },
  { name: 'Propulsion', stat: 'dv_earth' },
  { name: 'Flight dynamics', stat: 'dv_deep' },
  { name: 'Deep-Space Drive', stat: 'drive' },
  { name: 'Comms', stat: 'comms' },
  { name: 'Thermal', stat: 'heat' },
  { name: 'Tank pressure', stat: 'pressure' },
  { name: 'Budget', stat: 'cost' },
];

const goFor = (l: Level) => l === 'good' || l === 'auto' || l === 'warn';

export function PreLaunch() {
  const { planetId, difficulty, design, crew, go, recordAttempt, attempts } = useGame();
  const calm = useCalm();
  const planet = planetId ? getPlanet(planetId) : undefined;
  const d = difficulty ?? 'easy';
  const cfg = DIFFICULTIES[d];
  const stats = useMemo(() => (planet ? telemetry(design, planet, d, crew) : []), [design, planet, d, crew]);
  const blockers = launchBlockers(design, d, crew);
  const s = rocketStats(design, crew);
  const [polled, setPolled] = useState(calm ? STATIONS.length : 0);

  // Warm the cache with the cutscene this rocket will most likely get.
  useEffect(() => {
    if (!planet || blockers.length) return;
    prefetchSequence(outcomeFor(evaluateMission(design, planet, d, crew).failure?.cause ?? null), calm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet?.id, calm]);

  useEffect(() => {
    if (calm) return;
    setPolled(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setPolled(i);
      play('ui_hover');
      if (i >= STATIONS.length) clearInterval(id);
    }, 260);
    return () => clearInterval(id);
  }, [calm]);

  if (!planet) return <Redirect to="destinations" />;
  const byId = Object.fromEntries(stats.map((x) => [x.id, x]));
  const nogo = STATIONS.filter((st) => byId[st.stat] && !goFor(byId[st.stat].level));
  const prs = byId.pressure;

  return (
    <div>
      <ScreenTitle kicker="Pre-launch check" title={`Go / No-Go for ${planet.nickname}`}>
        Mission Control polls every station. You can still fly with a NO-GO, but expect trouble!
      </ScreenTitle>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Card tiltKey="poll" as="section" className="p-5">
          <h2 className="mb-3 font-display text-2xl text-cyan">Mission Control poll</h2>
          <ul className="grid gap-2 sm:grid-cols-2" aria-live="polite">
            {STATIONS.map((st, i) => {
              const stat = byId[st.stat];
              const shown = i < polled;
              const ok = stat ? goFor(stat.level) : true;
              return (
                <li key={st.name} className="flex items-center justify-between rounded-xl bg-space/70 px-3 py-2" data-testid={`poll-${st.stat}`}>
                  <span className="font-bold">{st.name}</span>
                  {shown ? (
                    <motion.span
                      initial={calm ? false : { scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`rounded-lg border-2 border-ink px-2 font-display font-bold ${ok ? (stat?.level === 'auto' ? 'bg-panel-2 text-cream' : 'bg-go text-ink') : 'bg-danger text-ink'}`}
                    >
                      {ok ? (stat?.level === 'auto' ? 'GO (auto)' : 'GO') : 'NO-GO'}
                    </motion.span>
                  ) : (
                    <span className="text-muted">…</span>
                  )}
                </li>
              );
            })}
          </ul>
          {polled >= STATIONS.length && (
            <p className="mt-4 font-display text-xl" role="status">
              {blockers.length ? '⛔ Launch blocked: fix the items below.' : nogo.length ? `⚠️ ${nogo.length} station${nogo.length > 1 ? 's' : ''} NO-GO. Launching anyway is your call.` : '✅ All stations GO!'}
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card tiltKey="checklist" as="section" className="p-5">
            <h2 className="mb-2 font-display text-2xl text-plume">Checklist</h2>
            <ul className="space-y-1.5">
              {[
                { ok: !blockers.some((b) => ['pod', 'engine', 'drive', 'tank', 'comms'].includes(b.id)), text: 'All required parts fitted' },
                { ok: !blockers.some((b) => b.id === 'propellant'), text: 'Tanks match the engine’s propellant' },
                { ok: !blockers.some((b) => b.id === 'seats'), text: 'A seat for every astronaut' },
                { ok: s.cost <= cfg.budget, text: `Within budget ($${s.cost}M of $${cfg.budget}M)${!cfg.overBudgetBlocksLaunch && s.cost > cfg.budget ? ': allowed, but no budget points' : ''}` },
              ].map((c) => (
                <li key={c.text} className="flex gap-2">
                  <span aria-hidden="true">{c.ok ? '✅' : '❌'}</span>
                  <span>
                    <span className="sr-only">{c.ok ? 'Done: ' : 'Not done: '}</span>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
            {blockers.length > 0 && (
              <ul className="mt-3 list-disc pl-5 font-bold text-danger" role="alert">
                {blockers.map((b) => (
                  <li key={b.id}>{b.message}</li>
                ))}
              </ul>
            )}
          </Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card tiltKey="gauge" as="section" className="flex flex-col items-center p-4">
              <h2 className="font-display text-lg">Tank pressure</h2>
              <Gauge value={prs && prs.level !== 'auto' ? Math.min(1.3, prs.ratio) : 0} label={prs?.level === 'auto' ? 'not checked at this level' : (prs?.value ?? '')} danger={prs?.level === 'bad'} />
            </Card>
            <Card tiltKey="crew" as="section" className="p-4">
              <h2 className="font-display text-lg">Crew gamble</h2>
              <p className="text-3xl" aria-label={`${crew} astronauts`}>
                {crew ? '🧑‍🚀'.repeat(crew) : '🤖'}
              </p>
              <p className="font-mono">
                Success <b className="text-go">×{crewMultiplier(true, crew).toFixed(1)}</b> · Failure <b className="text-danger">×{crewMultiplier(false, crew).toFixed(2)}</b>
              </p>
            </Card>
          </div>
          <div className="sticker-sm bg-panel p-3">
            <div className="mb-1 flex justify-between font-bold">
              <span>Budget</span>
              <span className="font-mono">${s.cost}M / ${cfg.budget}M</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-space">
              <div className="h-full" style={{ width: `${Math.min(100, (s.cost / cfg.budget) * 100)}%`, background: s.cost > cfg.budget ? '#FF5A5F' : '#FFC94A' }} />
            </div>
          </div>
        </div>
      </div>

      {cfg.hints !== 'none' && nogo.length > 0 && polled >= STATIONS.length && (
        <CassSays className="mt-6 max-w-3xl" mood="worried" text={byId[nogo[0].stat].hint} />
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Button variant="ghost" onClick={() => go('workshop')}>
          ← Back to workshop
        </Button>
        <Button
          size="lg"
          variant="go"
          disabled={blockers.length > 0}
          sound={blockers.length ? 'error' : 'ui_click'}
          onClick={() => {
            unlockAudio();
            if (attempts.length >= LAUNCHES_PER_RUN) return go('summary');
            // Record now, so a refresh mid-cutscene can't re-roll or double-count the launch.
            const r = evaluateMission(design, planet, d, crew);
            recordAttempt({ planetId: planet.id, design, crew, score: r.score.total, success: r.success, cause: r.failure?.cause ?? null });
            // Load the cutscene and unlock sound inside this tap (Safari needs a tap to allow sound).
            const forced = useGame.getState().forcedOutcome;
            primeSequence(forced ?? outcomeFor(r.failure?.cause ?? null), calm);
            go('launch');
          }}
          data-testid="launch"
        >
          🚀 LAUNCH
        </Button>
      </div>
    </div>
  );
}
