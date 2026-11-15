import { useEffect, useRef } from 'react';
import { useCalm } from '../store/settings.ts';

interface Star {
  x: number;
  y: number;
  r: number;
  layer: number;
  tw: number;
  hue: number;
}

/** Multi-layer parallax starfield: slow drift, twinkle, a rare shooting star. Static in Calm mode. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  const calm = useCalm();
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / (calm ? 5200 : 3600));
      stars = Array.from({ length: n }, () => {
        const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
        return { x: Math.random() * w, y: Math.random() * h, r: [0.6, 1.1, 1.8][layer] * (0.7 + Math.random() * 0.6), layer, tw: Math.random() * Math.PI * 2, hue: Math.random() };
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const speed = [4, 9, 18]; // px per second, by layer
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let last = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!calm) {
          s.x -= speed[s.layer] * dt;
          if (s.x < -2) s.x = w + 2;
          s.tw += dt * (1 + s.layer);
        }
        const a = calm ? 0.75 : 0.55 + 0.45 * Math.sin(s.tw);
        ctx.globalAlpha = a;
        ctx.fillStyle = s.hue > 0.92 ? '#FFC94A' : s.hue > 0.84 ? '#5CE1FF' : '#FFF6E5';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!calm) {
        if (!shoot && Math.random() < dt * 0.06) {
          shoot = { x: Math.random() * w, y: Math.random() * h * 0.4, vx: -(400 + Math.random() * 300), vy: 160 + Math.random() * 120, life: 1 };
        }
        if (shoot) {
          shoot.x += shoot.vx * dt;
          shoot.y += shoot.vy * dt;
          shoot.life -= dt * 1.3;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
          g.addColorStop(0, 'rgba(255,246,229,0.9)');
          g.addColorStop(1, 'rgba(255,246,229,0)');
          ctx.globalAlpha = Math.max(0, shoot.life);
          ctx.strokeStyle = g;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
          ctx.stroke();
          if (shoot.life <= 0) shoot = null;
        }
      }
      ctx.globalAlpha = 1;
      if (!calm) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [calm]);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 20%, rgb(224 64 160 / 0.16), transparent 70%), radial-gradient(55% 45% at 85% 75%, rgb(92 225 255 / 0.12), transparent 70%), radial-gradient(40% 35% at 70% 10%, rgb(232 100 44 / 0.08), transparent 70%), #0B1026',
        }}
      />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
