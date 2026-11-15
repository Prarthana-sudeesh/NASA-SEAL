// Pre-renders every outcome's cutscene sequence (brief §6.2) into ONE seamless video file, so the
// game plays a single <video> per launch: no clip swapping, no black frames, continuous sound.
//
//   npm run build-cutscenes        (needs ffmpeg on PATH)
//
// Inputs:  exo-game-assets/clips/{shaken,calm}/{launch,cruising,explosion,planet}.mp4  (the artist's clips)
//          public/cutscenes/cutscenes.json                                              (durations + cue points)
// Outputs: public/cutscenes/seq/{outcome}.mp4, public/cutscenes/seq/calm/{outcome}.mp4, posters,
//          src/data/sequences.json (timeline, absolute cue and caption times per sequence)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTCOMES, OUTCOME_SAMPLE_CAUSE, planCutscene, type ClipId } from '../src/engine/cutscenes.ts';
import { CAPTIONS, type Cue } from '../src/cutscene/captions.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1280;
const H = 720;
const FPS = 24;
/** How long the success sequence holds on the planet for the "Mission accomplished" stamp. */
export const HOLD_S = 1.625; // exactly 39 frames at 24 fps

const meta = JSON.parse(readFileSync(resolve(ROOT, 'public/cutscenes/cutscenes.json'), 'utf8')) as Record<
  ClipId,
  { frames: number; fps: number; cues: Cue[] }
>;
const clipDur = (c: ClipId) => meta[c].frames / meta[c].fps;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export interface TimelineEntry {
  clip: ClipId;
  start: number;
  end: number;
  mirror?: boolean;
  label?: string;
  /** Frozen frame (success stamp). */
  hold?: boolean;
}

const out: Record<string, unknown> = {};
mkdirSync(resolve(ROOT, 'public/cutscenes/seq/calm'), { recursive: true });

for (const outcome of OUTCOMES) {
  const plan = planCutscene(OUTCOME_SAMPLE_CAUSE[outcome], 'X');
  const timeline: TimelineEntry[] = [];
  const cues: (Cue & { t: number })[] = [];
  const captions: { t: number; text: string }[] = [];
  let t = 0;
  for (const seg of plan.segments) {
    const len = seg.stopAt ?? clipDur(seg.clip);
    timeline.push({ clip: seg.clip, start: r3(t), end: r3(t + len), ...(seg.mirror ? { mirror: true } : {}), ...(seg.label ? { label: seg.label } : {}) });
    for (const c of meta[seg.clip].cues) if (c.t < len) cues.push({ ...c, t: r3(t + c.t), ...(c.until !== undefined ? { until: r3(t + Math.min(c.until, len)) } : {}) });
    for (const c of CAPTIONS[seg.clip]) if (c.t < len) captions.push({ t: r3(t + c.t), text: c.text });
    t += len;
    if (plan.midStamp && seg.clip === 'planet') {
      timeline.push({ clip: 'planet', start: r3(t), end: r3(t + HOLD_S), hold: true });
      t += HOLD_S;
    }
  }

  for (const calm of [false, true]) {
    const dir = calm ? 'calm' : 'shaken';
    const args: string[] = ['-v', 'error', '-y'];
    const parts: string[] = [];
    let n = 0;
    for (const e of timeline.filter((x) => !x.hold)) {
      args.push('-i', resolve(ROOT, `exo-game-assets/clips/${dir}/${e.clip}.mp4`));
      const len = e.end - e.start;
      const holdAfter = timeline.find((x) => x.hold && x.start === e.end);
      let v = `[${n}:v]trim=0:${len},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H}:flags=lanczos,setsar=1`;
      if (e.mirror) v += ',hflip';
      if (holdAfter) v += `,tpad=stop_mode=clone:stop_duration=${HOLD_S}`;
      let a = `[${n}:a]atrim=0:${len},asetpts=PTS-STARTPTS,aresample=48000`;
      a += holdAfter ? `,apad=whole_dur=${r3(len + HOLD_S)}` : `,apad=whole_dur=${r3(len)}`;
      parts.push(`${v}[v${n}]`, `${a}[a${n}]`);
      n++;
    }
    const inputs = Array.from({ length: n }, (_, i) => `[v${i}][a${i}]`).join('');
    const graph = `${parts.join(';')};${inputs}concat=n=${n}:v=1:a=1[v][a]`;
    const file = resolve(ROOT, `public/cutscenes/seq/${calm ? 'calm/' : ''}${outcome}.mp4`);
    args.push(
      '-filter_complex', graph, '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '23', '-profile:v', 'high', '-level', '4.0',
      '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', file,
    );
    execFileSync('ffmpeg', args, { stdio: 'inherit' });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-frames:v', '1', '-q:v', '4', file.replace(/\.mp4$/, '_poster.jpg')]);
  }
  const rel = (calm: boolean) => `cutscenes/seq/${calm ? 'calm/' : ''}${outcome}`;
  out[outcome] = {
    file: `${rel(false)}.mp4`,
    calmFile: `${rel(true)}.mp4`,
    poster: `${rel(false)}_poster.jpg`,
    calmPoster: `${rel(true)}_poster.jpg`,
    duration: r3(t),
    bytes: statSync(resolve(ROOT, `public/${rel(false)}.mp4`)).size,
    calmBytes: statSync(resolve(ROOT, `public/${rel(true)}.mp4`)).size,
    timeline,
    cues,
    captions,
  };
  console.log(`${outcome.padEnd(12)} ${r3(t)}s  ${(out[outcome] as { bytes: number }).bytes / 1000 | 0} kB / calm ${(out[outcome] as { calmBytes: number }).calmBytes / 1000 | 0} kB`);
}

writeFileSync(
  resolve(ROOT, 'src/data/sequences.json'),
  JSON.stringify({ width: W, height: H, fps: FPS, holdSeconds: HOLD_S, sequences: out }, null, 2) + '\n',
);
console.log('Wrote src/data/sequences.json');
