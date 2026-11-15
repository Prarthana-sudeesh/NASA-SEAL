import { motion, useMotionValue, useSpring, useTransform, animate } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { useCalm } from '../store/settings.ts';
import type { Provenance } from '../data/types.ts';
import { useGame, type Screen } from '../store/game.ts';

/** Deterministic hand-placed tilt (±1.5°) from a key. */
export function tiltFor(key: string, max = 1.5) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 2 * max;
}

export function Card({
  children,
  className = '',
  tiltKey,
  hover = false,
  as = 'div',
  ...rest
}: { children: ReactNode; className?: string; tiltKey?: string; hover?: boolean; as?: 'div' | 'section' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  const calm = useCalm();
  const tilt = tiltKey && !calm ? tiltFor(tiltKey) : 0;
  const M = motion[as];
  return (
    <M
      className={`sticker bg-panel ${className}`}
      initial={false}
      style={{ rotate: tilt }}
      whileHover={hover && !calm ? { y: -6, rotate: tilt * -1.4, scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      {...(rest as object)}
    >
      {children}
    </M>
  );
}

const PROV: Record<Provenance, { label: string; cls: string }> = {
  nasa: { label: 'NASA data', cls: 'bg-cyan text-ink' },
  calculated: { label: 'Calculated from NASA data', cls: 'bg-plume text-ink' },
  assumption: { label: 'Game assumption', cls: 'bg-magenta text-cream' },
};

export function ProvBadge({ p, short = false }: { p: Provenance; short?: boolean }) {
  const v = PROV[p];
  return (
    <span className={`inline-block rounded-full border-2 border-ink px-2 py-0 text-[0.7rem] font-extrabold uppercase tracking-wide ${v.cls}`} title={v.label}>
      {short ? (p === 'nasa' ? 'NASA' : p === 'calculated' ? 'Calc' : 'Game') : v.label}
    </span>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-bold ${className}`}>{children}</span>;
}

export function ImaginaryBadge() {
  return (
    <span className="inline-block -rotate-2 rounded-md border-2 border-ink bg-magenta px-1.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-cream" title="This part can't be built with today's technology">
      ✨ Imaginary tech
    </span>
  );
}

/** Number that springs/counts towards its value. */
export function CountUp({ value, decimals = 0, className = '', onTick }: { value: number; decimals?: number; className?: string; onTick?: () => void }) {
  const calm = useCalm();
  const [shown, setShown] = useState(calm ? value : 0);
  useEffect(() => {
    if (calm) {
      setShown(value);
      return;
    }
    const controls = animate(shown, value, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => {
        setShown(v);
        onTick?.();
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, calm]);
  return <span className={`tnum ${className}`}>{shown.toFixed(decimals)}</span>;
}

/** Live number that animates small changes (telemetry). */
export function LiveNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 180, damping: 24 });
  const text = useTransform(spring, (v) => v.toFixed(decimals));
  useEffect(() => mv.set(value), [mv, value]);
  return <motion.span className="tnum">{text}</motion.span>;
}

// ── ARIA live announcements ────────────────────────────────────────
const useAnnounce = create<{ msg: string; n: number; say: (m: string) => void }>((set, get) => ({
  msg: '',
  n: 0,
  say: (msg) => set({ msg, n: get().n + 1 }),
}));
export const announce = (m: string) => useAnnounce.getState().say(m);
export function LiveRegion() {
  const { msg, n } = useAnnounce();
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" key={n}>
      {msg}
    </div>
  );
}

export function ScreenTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {kicker && <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan">{kicker}</p>}
      <h1 className="font-display text-4xl font-bold text-cream md:text-5xl">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-lg text-muted">{children}</div>}
    </header>
  );
}

export function ExtLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`font-bold text-cyan underline decoration-2 underline-offset-2 hover:text-plume ${className}`}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span> ↗
    </a>
  );
}

export function useStableShuffle<T>(xs: T[], seed: string) {
  return useMemo(() => {
    const out = [...xs];
    let h = 7;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
    for (let i = out.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) | 0;
      const j = Math.abs(h) % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [xs, seed]);
}

/** Navigate after render (never set state during render). */
export function Redirect({ to }: { to: Screen }) {
  useEffect(() => {
    useGame.getState().go(to);
  }, [to]);
  return null;
}
