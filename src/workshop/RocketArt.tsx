import { motion, AnimatePresence } from 'motion/react';
import { resolveParts, type Design } from '../engine/rocket.ts';
import type { Propellant } from '../data/components.ts';
import { useCalm } from '../store/settings.ts';

const W = 220;
const CX = W / 2;

const TANK_COLOR: Record<Propellant, { body: string; band: string }> = {
  solid: { body: '#E9E4DA', band: '#9AA0B5' },
  kerolox: { body: '#FFF6E5', band: '#E8642C' },
  hydrolox: { body: '#E8642C', band: '#B9441A' },
};

/** The rocket drawn from its actual parts: tanks stack, engine bells change with thrust. */
export function RocketArt({ design, crew, height = 560 }: { design: Design; crew: number; height?: number }) {
  const p = resolveParts(design);
  const calm = useCalm();
  const pop = calm ? {} : { initial: { scale: 0.4, opacity: 0 }, animate: { scale: [1.15, 0.92, 1], opacity: 1 }, exit: { scale: 0.3, opacity: 0 }, transition: { duration: 0.45 } };

  // Build from the top down.
  const parts: React.ReactNode[] = [];
  let y = 12;
  const bodyW = 92;

  // Pod / nose
  const podH = !p.pod ? 70 : p.pod.seats === 0 ? 64 : p.pod.seats === 2 ? 84 : 100;
  if (p.pod) {
    const seats = p.pod.seats;
    parts.push(
      <motion.g key={`pod-${p.pod.id}`} {...pop} style={{ originX: `${CX}px`, originY: `${y + podH}px` }}>
        <path d={`M ${CX} ${y} C ${CX + 22} ${y + 10}, ${CX + bodyW / 2} ${y + podH * 0.55}, ${CX + bodyW / 2} ${y + podH} L ${CX - bodyW / 2} ${y + podH} C ${CX - bodyW / 2} ${y + podH * 0.55}, ${CX - 22} ${y + 10}, ${CX} ${y} Z`} fill="#FFF6E5" stroke="#05070F" strokeWidth="3" />
        <path d={`M ${CX - bodyW / 2 + 4} ${y + podH - 12} L ${CX + bodyW / 2 - 4} ${y + podH - 12}`} stroke="#E8642C" strokeWidth="7" />
        {seats === 0 ? (
          <circle cx={CX} cy={y + podH * 0.55} r="9" fill="#5CE1FF" stroke="#05070F" strokeWidth="3" />
        ) : (
          Array.from({ length: seats }, (_, i) => {
            const wx = CX + (i - (seats - 1) / 2) * 17;
            const filled = i < crew;
            return (
              <g key={i}>
                <circle cx={wx} cy={y + podH * 0.58} r="7" fill={filled ? '#FFC94A' : '#5CE1FF'} stroke="#05070F" strokeWidth="2.5" />
                {filled && <circle cx={wx} cy={y + podH * 0.58 - 1} r="3" fill="#05070F" />}
              </g>
            );
          })
        )}
      </motion.g>,
    );
  } else {
    parts.push(<Ghost key="g-pod" y={y} h={podH} label="Payload pod" nose />);
  }

  // Comms dish on the nose side
  if (p.comms) {
    const r = p.comms.id === 'com-whisper' ? 8 : p.comms.id === 'com-bigear' ? 14 : 11;
    const laser = p.comms.id === 'com-laser';
    parts.push(
      <motion.g key={`com-${p.comms.id}`} {...pop}>
        <line x1={CX + bodyW / 2 - 6} y1={y + podH * 0.7} x2={CX + bodyW / 2 + 20} y2={y + podH * 0.42} stroke="#05070F" strokeWidth="3" />
        {laser ? (
          <rect x={CX + bodyW / 2 + 12} y={y + podH * 0.3} width="20" height="14" rx="3" fill="#5CE1FF" stroke="#05070F" strokeWidth="3" />
        ) : (
          <path d={`M ${CX + bodyW / 2 + 20 - r} ${y + podH * 0.42 - r} A ${r} ${r} 0 0 0 ${CX + bodyW / 2 + 20 + r} ${y + podH * 0.42 + r} Z`} fill="#B9C0E0" stroke="#05070F" strokeWidth="3" />
        )}
      </motion.g>,
    );
  }
  y += podH;

  // Shield band
  if (p.shield) {
    const col = { 'shd-blanket': '#E6C25A', 'shd-cork': '#A0663A', 'shd-pica': '#3A3A44', 'shd-forge': '#E040A0' }[p.shield.id] ?? '#555';
    parts.push(
      <motion.rect key={`shd-${p.shield.id}`} {...pop} x={CX - bodyW / 2 - 6} y={y - 2} width={bodyW + 12} height="14" rx="6" fill={col} stroke="#05070F" strokeWidth="3" />,
    );
    y += 12;
  }

  // Drive section
  const driveH = 34;
  if (p.drive) {
    const big = p.drive.rangeLy >= 1500;
    parts.push(
      <motion.g key={`drv-${p.drive.id}`} {...pop}>
        <rect x={CX - bodyW / 2} y={y} width={bodyW} height={driveH} fill="#151C3B" stroke="#05070F" strokeWidth="3" />
        <ellipse cx={CX} cy={y + driveH / 2} rx={bodyW / 2 + (big ? 18 : 10)} ry="8" fill="none" stroke="#E040A0" strokeWidth="5" />
        <ellipse cx={CX} cy={y + driveH / 2} rx={bodyW / 2 + (big ? 18 : 10)} ry="8" fill="none" stroke="#05070F" strokeWidth="1.5" />
        <circle cx={CX} cy={y + driveH / 2} r="6" fill="#5CE1FF">
          {!calm && <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />}
        </circle>
      </motion.g>,
    );
  } else parts.push(<Ghost key="g-drv" y={y} h={driveH} label="Drive" />);
  y += driveH;

  // Pressure bottles (drawn beside the tanks later)
  const prsY = y + 10;

  // Tanks: top (tank2) to bottom (tank0)
  const tankSlots = (['tank2', 'tank1', 'tank0'] as const).map((s) => ({ slot: s, part: resolveParts({ tank0: design[s] }).tanks[0] }));
  for (const { slot, part } of tankSlots) {
    if (!part) {
      if (slot === 'tank0') {
        parts.push(<Ghost key="g-tank0" y={y} h={70} label="Fuel tank" />);
        y += 70;
      }
      continue;
    }
    const h = Math.round(26 + Math.sqrt(part.propellantKg / 1000) * 7.2);
    const c = TANK_COLOR[part.propellant];
    const w = part.propellant === 'solid' ? bodyW - 6 : bodyW;
    parts.push(
      <motion.g key={`${slot}-${part.id}`} {...pop} style={{ originX: `${CX}px`, originY: `${y + h}px` }}>
        <rect x={CX - w / 2} y={y} width={w} height={h} rx="6" fill={c.body} stroke="#05070F" strokeWidth="3" />
        <rect x={CX - w / 2 + 3} y={y + 6} width={w - 6} height="7" fill={c.band} />
        {part.propellant === 'solid' && <line x1={CX - w / 2} y1={y + h / 2} x2={CX + w / 2} y2={y + h / 2} stroke="#05070F" strokeWidth="2" />}
        <rect x={CX - w / 2 + 8} y={y + 18} width="8" height={Math.max(8, h - 30)} rx="4" fill="#FFFFFF" opacity="0.35" />
      </motion.g>,
    );
    y += h;
  }
  if (p.pressure) {
    parts.push(
      <motion.g key={`prs-${p.pressure.id}`} {...pop}>
        {[0, 1, p.pressure.id === 'prs-helium-xl' ? 2 : -1].filter((i) => i >= 0).map((i) => (
          <circle key={i} cx={CX - bodyW / 2 - 12} cy={prsY + i * 22} r="9" fill="#5BD982" stroke="#05070F" strokeWidth="3" />
        ))}
      </motion.g>,
    );
  }

  // Fins
  parts.push(
    <g key="fins">
      <path d={`M ${CX - bodyW / 2} ${y - 46} L ${CX - bodyW / 2 - 26} ${y + 4} L ${CX - bodyW / 2} ${y} Z`} fill="#E040A0" stroke="#05070F" strokeWidth="3" />
      <path d={`M ${CX + bodyW / 2} ${y - 46} L ${CX + bodyW / 2 + 26} ${y + 4} L ${CX + bodyW / 2} ${y} Z`} fill="#E040A0" stroke="#05070F" strokeWidth="3" />
    </g>,
  );

  // Engine bells
  if (p.engine) {
    const n = p.engine.id === 'eng-kero9' ? 3 : p.engine.id === 'eng-hydro4' ? 4 : p.engine.id === 'eng-hydro2' ? 2 : 1;
    const bellW = Math.min(bodyW / n - 2, 22 + Math.sqrt(p.engine.thrustKN / n) * 0.55);
    const bellH = 22 + Math.sqrt(p.engine.thrustKN / n) * 0.35;
    parts.push(
      <motion.g key={`eng-${p.engine.id}`} {...pop} style={{ originX: `${CX}px`, originY: `${y}px` }}>
        {Array.from({ length: n }, (_, i) => {
          const bx = CX + (i - (n - 1) / 2) * (bodyW / n);
          return (
            <path key={i} d={`M ${bx - bellW * 0.25} ${y} L ${bx + bellW * 0.25} ${y} L ${bx + bellW / 2} ${y + bellH} L ${bx - bellW / 2} ${y + bellH} Z`} fill="#3A4170" stroke="#05070F" strokeWidth="3" />
          );
        })}
      </motion.g>,
    );
    y += bellH;
  } else {
    parts.push(<Ghost key="g-eng" y={y} h={36} label="Engine" bell />);
    y += 36;
  }
  const total = y + 14;
  const scale = Math.min(1, height / total);

  return (
    <svg viewBox={`0 0 ${W} ${total}`} width={W * scale} height={total * scale} role="img" aria-label="Your rocket" className="overflow-visible">
      <AnimatePresence>{parts}</AnimatePresence>
    </svg>
  );
}

function Ghost({ y, h, label, nose, bell }: { y: number; h: number; label: string; nose?: boolean; bell?: boolean }) {
  const w = 92;
  const d = nose
    ? `M ${CX} ${y} C ${CX + 22} ${y + 10}, ${CX + w / 2} ${y + h * 0.55}, ${CX + w / 2} ${y + h} L ${CX - w / 2} ${y + h} C ${CX - w / 2} ${y + h * 0.55}, ${CX - 22} ${y + 10}, ${CX} ${y} Z`
    : bell
      ? `M ${CX - 12} ${y} L ${CX + 12} ${y} L ${CX + 26} ${y + h} L ${CX - 26} ${y + h} Z`
      : `M ${CX - w / 2} ${y} h ${w} v ${h} h ${-w} Z`;
  return (
    <g opacity="0.75">
      <path d={d} fill="rgba(92,225,255,0.06)" stroke="#5CE1FF" strokeWidth="2" strokeDasharray="6 5" />
      <text x={CX} y={y + h / 2 + 5} textAnchor="middle" fontSize="12" fill="#5CE1FF" fontFamily="Space Mono, monospace">
        {label}
      </text>
    </g>
  );
}
