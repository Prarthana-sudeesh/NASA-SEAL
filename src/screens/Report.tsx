import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useGame, LAUNCHES_PER_RUN } from '../store/game.ts';
import { useCalm } from '../store/settings.ts';
import { getPlanet } from '../data/planets.ts';
import { evaluateMission, PHASES, type MissionResult } from '../engine/mission.ts';
import { ASSUMPTIONS, G0 } from '../engine/constants.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { Button } from '../ui/Button.tsx';
import { Card, CountUp, ExtLink, Redirect } from '../ui/bits.tsx';
import { CassSays } from '../ui/Cass.tsx';
import { play } from '../audio/audio.ts';
import { HAZARDS } from '../hazards/hazards.ts';

function ScoreLines({ r }: { r: MissionResult }) {
  const calm = useCalm();
  const [shown, setShown] = useState(calm ? r.score.lines.length + 2 : 0);
  useEffect(() => {
    if (calm) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i > r.score.lines.length + 1) clearInterval(id);
    }, 700);
    return () => clearInterval(id);
  }, [calm, r]);
  const tick = () => play('score_tick');
  return (
    <div>
      <ul className="space-y-2">
        {r.score.lines.map((l, i) => (
          <motion.li key={l.id} initial={false} animate={{ opacity: i < shown ? 1 : 0.15 }} className="rounded-xl bg-space/70 px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold">{l.label}</span>
              <span className="font-mono text-xl font-bold text-plume">
                {i < shown ? <CountUp value={l.points} decimals={l.points % 1 ? 1 : 0} onTick={tick} /> : 0}
                <span className="text-sm text-muted"> / {l.max}</span>
              </span>
            </div>
            <p className="text-sm text-muted">{l.detail}</p>
          </motion.li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t-2 border-white/10 pt-4">
        <div className="font-mono text-lg">
          Base <b>{r.score.base.toFixed(1)}</b> × crew <b className={r.score.multiplier >= 1 ? 'text-go' : 'text-danger'}>{r.score.multiplier.toFixed(2)}</b>
          <span className="block text-sm text-muted">
            {r.crew} astronaut{r.crew === 1 ? '' : 's'}: {r.success ? 'success × (1 + 0.1 × crew)' : 'failure × (1 − 0.15 × crew)'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase text-muted">Launch score</p>
          <p className="font-display text-6xl font-bold text-plume" data-testid="launch-score">
            {shown > r.score.lines.length ? <CountUp value={r.score.total} decimals={1} onTick={tick} /> : '…'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MathsPanel({ r }: { r: MissionResult }) {
  const s = r.stats;
  const t = (kg: number) => `${(kg / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} t`;
  return (
    <details className="sticker-sm bg-panel p-4">
      <summary className="cursor-pointer font-display text-xl text-cyan">📐 How the maths works</summary>
      <div className="mt-3 space-y-4 text-[0.97rem]">
        <section>
          <h3 className="font-display text-lg text-plume">Rocket power (Tsiolkovsky rocket equation)</h3>
          <p className="font-mono text-cyan">Δv = Isp × g₀ × ln(m₀ ÷ m_f), g₀ = {G0} m/s²</p>
          <p>Each tank is burned in turn and dropped when empty (like the Space Shuttle’s external tank). Your stages:</p>
          <ol className="mt-1 list-decimal pl-6 font-mono text-sm">
            {s.stages.map((st, i) => (
              <li key={i}>
                {st.tankName}: {s.isp} s × 9.81 × ln({t(st.m0Kg)} ÷ {t(st.mfKg)}) = {st.dvKms.toFixed(2)} km/s
              </li>
            ))}
          </ol>
          <p className="mt-1 font-mono text-sm">
            Total climbing Δv = {s.dvKms.toFixed(2)} km/s (Isp {s.isp} s) · in space = {s.dvVacKms.toFixed(2)} km/s (vacuum Isp {s.ispVac} s)
            {s.stages.length > 1 && ` · without dropping tanks it would be ${s.dvNoStagingKms.toFixed(2)} km/s`}
          </p>
        </section>
        <section>
          <h3 className="font-display text-lg text-plume">Lift-off power</h3>
          <p className="font-mono text-sm">
            TWR = thrust ÷ (m₀ × g₀) = {s.thrustKN.toLocaleString('en-US')} kN ÷ ({t(s.wetMassKg)} × 9.81) = {s.twr.toFixed(2)} (need ≥ {ASSUMPTIONS.minTwr.value})
          </p>
        </section>
        <section>
          <h3 className="font-display text-lg text-plume">What this trip needed</h3>
          <ul className="font-mono text-sm">
            {r.req.breakdown.map((b) => (
              <li key={b.label}>
                {b.label}: {b.kms.toFixed(2)} km/s {b.leg === 'earth' ? '(Earth launch)' : '(after refuelling)'}
              </li>
            ))}
            <li>+ 10% safety margin → Earth launch {r.req.earthLegKms.toFixed(2)} km/s, deep space {r.req.deepNeededKms.toFixed(2)} km/s</li>
          </ul>
        </section>
        <section>
          <h3 className="font-display text-lg text-plume">Game assumptions</h3>
          <ul className="list-disc space-y-1 pl-6">
            {Object.values(ASSUMPTIONS).map((a) => (
              <li key={a.label}>
                <b>{a.label}:</b> {a.why}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}

export function Report() {
  const { attempts, difficulty, go } = useGame();
  const last = attempts[attempts.length - 1];
  const planet = last ? getPlanet(last.planetId) : undefined;
  const r = useMemo(() => (last && planet ? evaluateMission(last.design, planet, difficulty ?? 'easy', last.crew) : null), [last, planet, difficulty]);
  const calm = useCalm();
  if (!last || !planet || !r) return <Redirect to="title" />;
  const done = attempts.length >= LAUNCHES_PER_RUN;
  const firstFail = r.failure?.check;
  const shown = r.checks;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <motion.div
          initial={calm ? false : { scale: 2.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: -5, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 13 }}
          className={`rounded-2xl border-[5px] px-6 py-3 font-display text-4xl font-bold tracking-wider md:text-5xl ${r.success ? 'border-go text-go' : 'border-danger text-danger'}`}
          style={{ boxShadow: '5px 5px 0 #000' }}
          data-testid="stamp"
        >
          {r.success ? 'MISSION SUCCESS' : 'MISSION LOST'}
        </motion.div>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan">
            Mission report · launch {last.n}/{LAUNCHES_PER_RUN} · {DIFFICULTIES[difficulty ?? 'easy'].label}
          </p>
          <h1 tabIndex={-1} className="font-display text-4xl font-bold outline-none">
            {planet.nickname} <span className="font-mono text-xl text-muted">{planet.officialName}</span>
          </h1>
          <p className="text-muted">
            {r.success ? 'Out and home again. Every phase complete.' : `Stopped at: ${PHASES[r.failedPhase]}. ${firstFail?.label}.`}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <Card tiltKey="score" as="section" className="p-5">
          <h2 className="mb-3 font-display text-2xl text-plume">Score</h2>
          <ScoreLines r={r} />
          {!!last.hazards?.length && (
            <div className="mt-4 rounded-xl bg-space/70 p-3" data-testid="hazard-summary">
              <p className="font-display text-lg text-cyan">Space hazards</p>
              <ul className="mt-1 space-y-0.5">
                {last.hazards.map((h, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {HAZARDS[h.id].icon} {HAZARDS[h.id].title.replace(/!$/, '')} <span className="text-sm text-muted">({h.mode === 'quiz' ? 'quiz' : 'mini-game'})</span>
                    </span>
                    <span className={`font-bold ${h.won ? 'text-go' : 'text-danger'}`}>{h.won ? 'Cleared' : 'Missed'}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t-2 border-white/10 pt-2 font-mono">
                <span>Hazard points</span>
                <b className={(last.hazardPoints ?? 0) >= 0 ? 'text-go' : 'text-danger'}>
                  {(last.hazardPoints ?? 0) >= 0 ? '+' : ''}
                  {(last.hazardPoints ?? 0).toFixed(1)}
                </b>
              </p>
              <p className="flex justify-between font-mono text-lg">
                <span>Launch total</span>
                <b className="text-plume">{last.score.toFixed(1)}</b>
              </p>
            </div>
          )}
        </Card>
        <Card tiltKey="why" as="section" className="p-5">
          <h2 className="mb-3 font-display text-2xl text-cyan">Why it happened</h2>
          <CassSays
            className="mb-4"
            mood={r.success ? 'cheer' : 'thinking'}
            text={r.success ? 'Brilliant flying! Can you do it cheaper, or with a crew for a bigger score?' : `Good try! The key problem: ${firstFail!.advice}`}
          />
          <ul className="space-y-2" data-testid="checks">
            {shown.map((c) => {
              const first = c === firstFail;
              const notReached = !!r.failure && c.phase > r.failure.phase;
              return (
                <li key={c.id} className={`rounded-xl px-3 py-2 ${first ? 'bg-danger/20 ring-2 ring-danger' : 'bg-space/70'} ${notReached ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-lg" aria-hidden="true">
                      {c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚪'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        <span className="sr-only">{c.status === 'pass' ? 'Passed: ' : c.status === 'fail' ? 'Failed: ' : 'Automatic pass: '}</span>
                        {c.label}{' '}
                        <span className="font-mono text-sm font-normal text-muted">
                          {c.have} · needed {c.need}
                        </span>
                        {notReached && <span className="ml-1 text-xs text-muted">(not reached; would have been {c.status === 'fail' ? 'a problem too' : 'fine'})</span>}
                      </p>
                      <p className="text-[0.95rem]">{c.advice}</p>
                      {c.scienceLink && (first || c.status === 'fail') && (
                        <p className="text-sm">
                          Real science: <ExtLink href={c.scienceLink.url}>{c.scienceLink.label}</ExtLink>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-8">
        <MathsPanel r={r} />
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Button size="lg" onClick={() => go(done ? 'summary' : 'progress')} data-testid="next">
          {done ? 'See run summary 🏁' : 'Run progress →'}
        </Button>
      </div>
    </div>
  );
}
