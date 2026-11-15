import { useEffect, useState } from 'react';
import { useCalm } from '../store/settings.ts';

const LAYERS = [
  { density: 1 / 5200, r: [0.5, 0.9], speed: 5 },
  { density: 1 / 11000, r: [0.9, 1.4], speed: 11 },
  { density: 1 / 26000, r: [1.4, 2.1], speed: 22 },
];
const COLORS = ['#FFF6E5', '#FFF6E5', '#FFF6E5', '#FFF6E5', '#5CE1FF', '#FFC94A'];

interface Layer {
  url: string;
  w: number;
  h: number;
  seconds: number;
}

async function paintLayer(w: number, h: number, i: number): Promise<Layer> {
  const L = LAYERS[i];
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const n = Math.round(w * h * L.density);
  for (let k = 0; k < n; k++) {
    g.globalAlpha = 0.45 + Math.random() * 0.55;
    g.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, L.r[0] + Math.random() * (L.r[1] - L.r[0]), 0, Math.PI * 2);
    g.fill();
  }
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
  return { url: blob ? URL.createObjectURL(blob) : c.toDataURL(), w, h, seconds: w / L.speed };
}

/**
 * Parallax starfield. Each layer is painted ONCE into an image; CSS then slides it sideways with a
 * transform, which the browser's compositor does without repainting (smooth even on slow machines).
 * Static in Calm mode.
 */
export function Starfield() {
  const calm = useCalm();
  const [layers, setLayers] = useState<Layer[]>([]);
  useEffect(() => {
    let cancelled = false;
    let made: Layer[] = [];
    const build = async () => {
      const w = Math.max(window.innerWidth, 320);
      const h = Math.max(window.innerHeight, 320);
      const next = await Promise.all(LAYERS.map((_, i) => paintLayer(w, h, i)));
      if (cancelled) return next.forEach((l) => URL.revokeObjectURL(l.url));
      made.forEach((l) => URL.revokeObjectURL(l.url));
      made = next;
      setLayers(next);
    };
    void build();
    let t = 0;
    let lastW = window.innerWidth;
    const onResize = () => {
      clearTimeout(t);
      // Only rebuild on real width changes (mobile toolbars change the height constantly).
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth;
      t = window.setTimeout(build, 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      made.forEach((l) => URL.revokeObjectURL(l.url));
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 20%, rgb(224 64 160 / 0.16), transparent 70%), radial-gradient(55% 45% at 85% 75%, rgb(92 225 255 / 0.12), transparent 70%), radial-gradient(40% 35% at 70% 10%, rgb(232 100 44 / 0.08), transparent 70%), #0B1026',
        }}
      />
      {layers.map((l, i) => (
        <div
          key={l.url}
          className={calm ? '' : 'star-drift'}
          style={
            {
              position: 'absolute',
              top: 0,
              left: 0,
              height: l.h,
              width: l.w * 2,
              backgroundImage: `url(${l.url})`,
              backgroundSize: `${l.w}px ${l.h}px`,
              backgroundRepeat: 'repeat-x',
              '--drift': `-${l.w}px`,
              animationDuration: `${l.seconds}s`,
              // 1 px per step: the layer only changes (and is re-composited) when it actually moves.
              animationTimingFunction: `steps(${Math.round(l.w)})`,
              opacity: i === 0 ? 0.85 : 1,
            } as React.CSSProperties
          }
        />
      ))}
      {!calm && <div className="shooting-star" />}
    </div>
  );
}
