import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useCalm } from '../store/settings.ts';
import { Button } from '../ui/Button.tsx';
import { gameSfx } from '../hazards/hazardSound.ts';

/** Seconds until the capsule hits the water. */
const SPLASH_AT = 2.4;

// Spray thrown up by the splash: fixed so the animation is the same every time.
const DROPS = Array.from({ length: 22 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const spread = 40 + ((i * 53) % 260);
  return { dx: side * spread, up: 120 + ((i * 97) % 220), r: 6 + ((i * 7) % 9), d: 0.9 + ((i * 13) % 5) / 10 };
});

/** Splashdown celebration: capsule under parachutes drops into the sea. Drawn in the sticker style. */
export function Splashdown({ nickname, onContinue }: { nickname: string; onContinue: () => void }) {
  const calm = useCalm();
  useEffect(() => {
    const t = setTimeout(() => gameSfx('splash'), calm ? 0 : SPLASH_AT * 1000);
    return () => clearTimeout(t);
  }, [calm]);
  return (
    <motion.div className="absolute inset-0 z-40 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="splashdown">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(#FFB070 0%, #FF8A5C 30%, #E040A0 62%, #3C6CC4 63%, #1D3A7A 100%)' }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="1240" cy="420" r="120" fill="#FFC94A" stroke="#05070F" strokeWidth="5" />
        {[0].map((i) => (
          <motion.path
            key={i}
            d={`M 0 ${600 + i * 70} Q 200 ${580 + i * 70} 400 ${600 + i * 70} T 800 ${600 + i * 70} T 1200 ${600 + i * 70} T 1600 ${600 + i * 70} V 900 H 0 Z`}
            fill={['#3C6CC4', '#2B52A0', '#1D3A7A'][i]}
            stroke="#05070F"
            strokeWidth="4"
            animate={calm ? undefined : { x: [0, -40 + i * 20, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {/* Recovery boat sails in after the splash */}
        <motion.g
          initial={calm ? { x: 0 } : { x: -900 }}
          animate={calm ? { x: 0 } : { x: 0, y: [0, -6, 0] }}
          transition={calm ? { duration: 0 } : { x: { delay: SPLASH_AT + 0.6, duration: 2.6, ease: 'easeOut' }, y: { delay: SPLASH_AT + 0.6, duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <g transform="translate(330 636)">
            <path d="M -110 0 L 110 0 L 80 44 L -90 44 Z" fill="#E8642C" stroke="#05070F" strokeWidth="5" />
            <rect x="-50" y="-40" width="80" height="40" rx="6" fill="#FFF6E5" stroke="#05070F" strokeWidth="5" />
            <rect x="-38" y="-30" width="22" height="16" fill="#5CE1FF" stroke="#05070F" strokeWidth="3" />
            <rect x="-6" y="-30" width="22" height="16" fill="#5CE1FF" stroke="#05070F" strokeWidth="3" />
            <line x1="60" y1="0" x2="60" y2="-80" stroke="#05070F" strokeWidth="5" />
            <path d="M 60 -80 L 100 -68 L 60 -56 Z" fill="#FFC94A" stroke="#05070F" strokeWidth="3" />
          </g>
        </motion.g>

        {/* Capsule and parachutes */}
        <motion.g initial={calm ? { y: 0 } : { y: -640 }} animate={{ y: 0 }} transition={{ duration: calm ? 0 : SPLASH_AT, ease: [0.3, 0.6, 0.6, 1] }}>
          <g transform="translate(800 446)">
            <motion.g
              animate={calm ? undefined : { y: [0, 0, 28, -6, 10, 4], rotate: [-5, 4, 0, -3, 2, 0] }}
              transition={{ duration: SPLASH_AT + 1.4, times: [0, 0.4, 0.66, 0.78, 0.9, 1], ease: 'easeInOut' }}
              style={{ originX: '0px', originY: '170px' }}
            >
              {/* Gentle bobbing on the waves once it has landed */}
              <motion.g
                animate={calm ? undefined : { y: [0, 8, 0], rotate: [0, 2.5, 0, -2.5, 0] }}
                transition={{ delay: SPLASH_AT + 1.4, duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ originX: '0px', originY: '200px' }}
              >
                {/* Chutes let go on impact and drift away on the breeze */}
                <motion.g
                  animate={calm ? { opacity: 0 } : { x: [0, 0, 260], y: [0, 0, 130], rotate: [0, 0, 24], opacity: [1, 1, 0] }}
                  transition={{ duration: SPLASH_AT + 2.2, times: [0, SPLASH_AT / (SPLASH_AT + 2.2), 1], ease: 'easeIn' }}
                >
                  {[-90, 0, 90].map((dx, i) => (
                    <g key={i}>
                      <path d={`M ${dx - 62} -112 Q ${dx} -192 ${dx + 62} -112 Z`} fill={['#E8642C', '#FFF6E5', '#E8642C'][i]} stroke="#05070F" strokeWidth="5" />
                      <line x1={dx - 62} y1="-112" x2="-20" y2="120" stroke="#05070F" strokeWidth="2" />
                      <line x1={dx + 62} y1="-112" x2="20" y2="120" stroke="#05070F" strokeWidth="2" />
                    </g>
                  ))}
                </motion.g>
                <path d="M -60 230 L -40 120 Q 0 95 40 120 L 60 230 Z" fill="#FFF6E5" stroke="#05070F" strokeWidth="5" />
                <circle cx="0" cy="170" r="16" fill="#5CE1FF" stroke="#05070F" strokeWidth="4" />
                {/* flotation collar inflates after landing */}
                <motion.ellipse
                  cx="0"
                  cy="228"
                  rx="78"
                  ry="14"
                  fill="#FFC94A"
                  stroke="#05070F"
                  strokeWidth="4"
                  initial={calm ? false : { scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: calm ? 0 : SPLASH_AT + 0.5, duration: 0.5, type: 'spring' }}
                  style={{ originX: '0px', originY: '228px' }}
                />
              </motion.g>
            </motion.g>
          </g>
        </motion.g>

        {/* Front waves hide the capsule's base so it floats in the sea */}
        {[1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M 0 ${600 + i * 70} Q 200 ${580 + i * 70} 400 ${600 + i * 70} T 800 ${600 + i * 70} T 1200 ${600 + i * 70} T 1600 ${600 + i * 70} V 900 H 0 Z`}
            fill={['#3C6CC4', '#2B52A0', '#1D3A7A'][i]}
            stroke="#05070F"
            strokeWidth="4"
            animate={calm ? undefined : { x: [0, -40 + i * 20, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {!calm && (
          <>
            {/* Splash rings spreading out */}
            {[0, 0.35, 0.7].map((d, i) => (
              <motion.ellipse
                key={i}
                cx="800"
                cy="680"
                rx="120"
                ry="26"
                fill="none"
                stroke="#FFF6E5"
                strokeWidth={8 - i * 2}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.4 + i * 0.4, 2 + i * 0.5] }}
                transition={{ delay: SPLASH_AT - 0.05 + d, duration: 1.6 }}
                style={{ originX: '800px', originY: '680px' }}
              />
            ))}
            {/* Column of white water */}
            <motion.path
              d="M 720 680 Q 740 590 770 630 Q 790 550 810 620 Q 840 570 850 640 Q 870 600 880 680 Z"
              fill="#FFF6E5"
              stroke="#05070F"
              strokeWidth="4"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 2.2, 0], scaleX: [0.6, 1.5, 1.8], opacity: [0, 1, 0] }}
              transition={{ delay: SPLASH_AT - 0.05, duration: 1.1, ease: 'easeOut' }}
              style={{ originX: '800px', originY: '680px' }}
            />
            {/* Spray droplets arcing up and falling back */}
            {DROPS.map((p, i) => (
              <motion.circle
                key={i}
                cx="800"
                cy="670"
                r={p.r}
                fill={i % 3 ? '#FFF6E5' : '#9FDFFF'}
                stroke="#05070F"
                strokeWidth="2"
                initial={{ opacity: 0 }}
                animate={{ x: [0, p.dx * 0.6, p.dx], y: [0, -p.up, 30], opacity: [1, 1, 0] }}
                transition={{ delay: SPLASH_AT, duration: p.d, times: [0, 0.45, 1], ease: 'easeOut' }}
              />
            ))}
            {/* Seagulls circling overhead */}
            {[0, 1].map((i) => (
              <motion.path
                key={i}
                d="M -18 0 Q -9 -10 0 0 Q 9 -10 18 0"
                fill="none"
                stroke="#05070F"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ x: 1700 + i * 120, y: 220 + i * 50 }}
                animate={{ x: [1700 + i * 120, -100], y: [220 + i * 50, 180 + i * 40, 230 + i * 50] }}
                transition={{ delay: SPLASH_AT + 0.8 + i * 0.7, duration: 14, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          </>
        )}
      </svg>
      <div className="absolute inset-x-0 top-6 text-center md:top-8">
        <motion.p
          initial={calm ? false : { scale: 0.3, rotate: 10, opacity: 0 }}
          animate={{ scale: 1, rotate: -3, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12, delay: calm ? 0 : SPLASH_AT + 0.2 }}
          className="sticker inline-block bg-go px-6 py-2 font-display text-[clamp(1.8rem,5vw,3.6rem)] font-bold text-ink"
          role="status"
          data-testid="overlay"
        >
          MISSION SUCCESS!
        </motion.p>
        <p className="mt-3 font-display text-xl text-cream md:text-2xl" style={{ textShadow: '2px 2px 0 #000' }}>
          Splashdown! Welcome home from {nickname}.
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-10 text-center">
        <Button size="lg" variant="secondary" onClick={onContinue} data-testid="to-report">
          Mission report →
        </Button>
      </div>
    </motion.div>
  );
}
