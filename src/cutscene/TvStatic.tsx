import { useEffect, useRef } from 'react';

/** "Signal lost" TV static. Calm mode: slower, softer noise (no strobing either way). */
export function TvStatic({ calm }: { calm: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const w = (c.width = 192);
    const h = (c.height = 108);
    const img = ctx.createImageData(w, h);
    let raf = 0;
    let last = 0;
    let fade = 0;
    const step = calm ? 220 : 70; // ms per frame
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < step) return;
      last = now;
      fade = Math.min(1, fade + 0.08);
      for (let i = 0; i < w * h; i++) {
        const row = Math.floor(i / w);
        const v = (Math.random() * 200 + 30) * (row % 3 === 0 ? 0.7 : 1);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v * 1.05;
        img.data[i * 4 + 3] = 255 * fade * (calm ? 0.75 : 0.92);
      }
      ctx.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [calm]);
  return <canvas ref={ref} className="absolute inset-0 z-[5] h-full w-full [image-rendering:pixelated]" aria-hidden="true" />;
}
