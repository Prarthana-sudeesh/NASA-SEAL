// Three quick mini-games for beating space hazards. Each reports a win or loss once.
// Difficulty (`power`) speeds them up; the parent owns the countdown timer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { gameSfx } from './hazardSound.ts';
import type { HazardId } from './hazards.ts';

export interface GameProps {
  hazard: HazardId;
  /** 1 = gentle; grows with difficulty and launch number. */
  power: number;
  /** True while the clock is running. When it ends with no result, the parent decides. */
  active: boolean;
  onResult: (won: boolean) => void;
  /** Dodge: lives. Shield: hits needed. */
  amount: number;
}

/** Calls fn every animation frame with the seconds since the last frame. */
function useFrame(fn: (dt: number) => void, on: boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ref.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

// ───────────────────────── Dodge: steer the rocket away from incoming objects ─────────────────────────

const DODGE_LOOK: Record<string, { items: string[]; label: string }> = {
  aliens: { items: ['🛸'], label: 'Dodge the alien ships and their lasers!' },
  asteroids: { items: ['🪨', '☄️'], label: 'Weave between the asteroids!' },
  debris: { items: ['🛰️', '🔩', '⚙️'], label: 'Swerve around the space junk!' },
};

interface Thing {
  id: number;
  x: number;
  y: number;
  vy: number;
  wob: number;
  icon: string;
  laser: boolean;
}

export function DodgeGame({ hazard, power, active, onResult, amount }: GameProps) {
  const look = DODGE_LOOK[hazard] ?? DODGE_LOOK.asteroids;
  const [, render] = useState(0);
  const st = useRef({ x: 0.5, things: [] as Thing[], spawn: 0.4, lives: amount, hurt: 0, t: 0, n: 0, left: false, right: false, target: null as number | null });
  const done = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useFrame((dt) => {
    const s = st.current;
    if (done.current) return;
    s.t += dt;
    const speed = 0.62;
    if (s.left) s.x -= speed * dt;
    if (s.right) s.x += speed * dt;
    if (s.target !== null) s.x += Math.max(-speed * dt * 1.4, Math.min(speed * dt * 1.4, s.target - s.x));
    s.x = Math.max(0.06, Math.min(0.94, s.x));
    s.spawn -= dt;
    if (s.spawn <= 0) {
      s.spawn = (0.85 / power) * (0.6 + Math.random() * 0.8);
      const alien = hazard === 'aliens';
      s.things.push({
        id: s.n++,
        x: 0.06 + Math.random() * 0.88,
        y: -0.1,
        vy: (0.32 + Math.random() * 0.18) * power,
        wob: alien ? 0.18 + Math.random() * 0.2 : 0,
        icon: look.items[Math.floor(Math.random() * look.items.length)],
        laser: false,
      });
      // Alien ships also fire fast lasers straight down.
      if (alien && Math.random() < 0.5) {
        s.things.push({ id: s.n++, x: 0.06 + Math.random() * 0.88, y: -0.05, vy: 0.9 * power, wob: 0, icon: '', laser: true });
      }
    }
    for (const t of s.things) {
      t.y += t.vy * dt;
      if (t.wob) t.x += Math.sin(s.t * 3 + t.id) * t.wob * dt;
    }
    s.hurt = Math.max(0, s.hurt - dt);
    for (const t of s.things) {
      const hitY = t.y > 0.78 && t.y < 0.95;
      const hitX = Math.abs(t.x - s.x) < (t.laser ? 0.045 : 0.075);
      if (hitY && hitX && s.hurt <= 0) {
        t.y = 2;
        s.lives -= 1;
        s.hurt = 0.8;
        gameSfx('hit');
        if (s.lives <= 0) {
          done.current = true;
          onResult(false);
        }
      }
    }
    s.things = s.things.filter((t) => t.y < 1.1);
    render((n) => n + 1);
  }, active);

  // Surviving to the end of the clock is a win.
  useEffect(() => {
    if (!active && !done.current && st.current.t > 0.5) {
      done.current = true;
      onResult(st.current.lives > 0);
    }
  }, [active, onResult]);

  useEffect(() => {
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) st.current.left = down;
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) st.current.right = down;
      else return;
      st.current.target = null;
      e.preventDefault();
    };
    const dn = key(true);
    const up = key(false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const pointer = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    st.current.target = (e.clientX - r.left) / r.width;
  };
  const s = st.current;
  const hold = (dir: 'left' | 'right', on: boolean) => () => {
    st.current[dir] = on;
    st.current.target = null;
  };

  return (
    <div data-testid="game-dodge">
      <p className="mb-2 text-center font-bold text-cream">{look.label} Use ← → keys, drag, or the buttons.</p>
      <div
        ref={box}
        className="relative h-56 touch-none overflow-hidden rounded-xl border-[3px] border-ink bg-[radial-gradient(ellipse_at_50%_0%,#1d2752,#05070f)] md:h-64"
        onPointerDown={pointer}
        onPointerMove={(e) => e.buttons && pointer(e)}
      >
        {s.things.map((t) =>
          t.laser ? (
            <div key={t.id} className="absolute h-7 w-1.5 -translate-x-1/2 rounded-full bg-go shadow-[0_0_10px_#5BD982]" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }} />
          ) : (
            <span key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 select-none text-3xl" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, transform: `translate(-50%,-50%) rotate(${(s.t * 90 + t.id * 40) % 360}deg)` }} aria-hidden="true">
              {t.icon}
            </span>
          ),
        )}
        <span
          className={`absolute bottom-[6%] -translate-x-1/2 select-none text-4xl transition-opacity ${s.hurt > 0 ? 'opacity-40' : ''}`}
          style={{ left: `${s.x * 100}%` }}
          role="img"
          aria-label="Your rocket"
        >
          🚀
        </span>
        <div className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 font-bold" aria-label={`${Math.max(0, s.lives)} lives left`}>
          {'❤️'.repeat(Math.max(0, s.lives))}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-3">
        {(['left', 'right'] as const).map((d) => (
          <button
            key={d}
            className="btn bg-cyan px-6 py-2 text-2xl text-ink"
            aria-label={`Steer ${d}`}
            onPointerDown={hold(d, true)}
            onPointerUp={hold(d, false)}
            onPointerLeave={hold(d, false)}
            onPointerCancel={hold(d, false)}
          >
            {d === 'left' ? '◀' : '▶'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Thrust: tap fast to climb out of a gravity well ─────────────────────────

export function ThrustGame({ hazard, power, active, onResult }: GameProps) {
  const [v, setV] = useState(0.3);
  const val = useRef(0.3);
  const done = useRef(false);
  const what = hazard === 'blackhole' ? 'black hole' : 'planet’s gravity';

  const finish = useCallback(
    (won: boolean) => {
      if (done.current) return;
      done.current = true;
      onResult(won);
    },
    [onResult],
  );

  useFrame((dt) => {
    if (done.current) return;
    // The pull gets stronger the deeper you are.
    val.current -= dt * (0.1 + 0.08 * (1 - val.current)) * power;
    if (val.current <= 0) {
      val.current = 0;
      finish(false);
    }
    setV(val.current);
  }, active);

  const boost = useCallback(() => {
    if (done.current || !active) return;
    val.current = Math.min(1, val.current + 0.055);
    gameSfx('tap');
    if (val.current >= 1) {
      finish(true);
    }
    setV(val.current);
  }, [active, finish]);

  useEffect(() => {
    if (!active && !done.current) finish(false);
  }, [active, finish]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!e.repeat) boost();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [boost]);

  return (
    <div data-testid="game-thrust">
      <p className="mb-2 text-center font-bold text-cream">Tap BOOST (or Space) fast to fire the engines and escape the {what}!</p>
      <div className="relative h-16 overflow-hidden rounded-xl border-[3px] border-ink bg-[linear-gradient(90deg,#000_0%,#3b1a5a_35%,#1d2752_70%,#5BD982_100%)]">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-3xl" aria-hidden="true">
          {hazard === 'blackhole' ? '🕳️' : '🪐'}
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-display font-bold text-ink">SAFE</span>
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 text-4xl" style={{ left: `${8 + v * 80}%` }} role="img" aria-label={`Escape progress ${Math.round(v * 100)} percent`}>
          🚀
        </span>
      </div>
      <div className="mt-3 flex justify-center">
        <button className="btn bg-orange px-10 py-4 font-display text-3xl text-cream active:scale-95" onPointerDown={boost} data-testid="boost">
          🔥 BOOST
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Shield: press when the needle is in the green zone ─────────────────────────

export function ShieldGame({ hazard, power, active, onResult, amount }: GameProps) {
  const [, render] = useState(0);
  const st = useRef({ p: 0, dir: 1, zone: 0.5, hits: 0, flash: '' as '' | 'good' | 'bad' });
  const done = useRef(false);
  const width = Math.max(0.1, 0.24 / Math.sqrt(power));

  useFrame((dt) => {
    const s = st.current;
    s.p += s.dir * dt * 0.75 * power;
    if (s.p >= 1) {
      s.p = 1;
      s.dir = -1;
    } else if (s.p <= 0) {
      s.p = 0;
      s.dir = 1;
    }
    render((n) => n + 1);
  }, active && !done.current);

  const press = useCallback(() => {
    if (done.current || !active) return;
    const s = st.current;
    if (Math.abs(s.p - s.zone) <= width / 2) {
      s.hits += 1;
      s.flash = 'good';
      gameSfx('good');
      if (s.hits >= amount) {
        done.current = true;
        onResult(true);
        return;
      }
    } else {
      // A miss drains one charge, so mashing the button doesn't work.
      s.hits = Math.max(0, s.hits - 1);
      s.flash = 'bad';
      gameSfx('miss');
    }
    s.zone = width / 2 + Math.random() * (1 - width);
    setTimeout(() => (st.current.flash = ''), 250);
  }, [active, amount, onResult, width]);

  useEffect(() => {
    if (!active && !done.current) {
      done.current = true;
      onResult(false);
    }
  }, [active, onResult]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) press();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [press]);

  const s = st.current;
  return (
    <div data-testid="game-shield">
      <p className="mb-2 text-center font-bold text-cream">
        {hazard === 'quasar' ? 'Time the shield pulses to block the quasar beam!' : 'Time the shields to block the radiation!'} Press SHIELD (or Space) when the needle is in the green. {s.hits}/{amount}
      </p>
      <div className={`relative h-14 rounded-xl border-[3px] border-ink bg-space ${s.flash === 'good' ? 'ring-4 ring-go' : s.flash === 'bad' ? 'ring-4 ring-danger' : ''}`}>
        <div className="absolute inset-y-0 rounded-md bg-go/80" style={{ left: `${(s.zone - width / 2) * 100}%`, width: `${width * 100}%` }} />
        <div className="absolute inset-y-[-6px] w-1.5 -translate-x-1/2 rounded bg-cream shadow-[0_0_8px_#fff]" style={{ left: `${s.p * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-center gap-1" aria-hidden="true">
        {Array.from({ length: amount }, (_, i) => (
          <span key={i} className={`h-4 w-8 rounded border-2 border-ink ${i < s.hits ? 'bg-cyan' : 'bg-panel-2'}`} />
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <button className="btn bg-cyan px-10 py-4 font-display text-3xl text-ink active:scale-95" onPointerDown={press} data-testid="shield">
          🛡️ SHIELD
        </button>
      </div>
    </div>
  );
}
