"""Per-frame camera shake -> ffmpeg sendcmd files, then render web (1080p) + master (4K) clips with the synth audio."""
import json, os, subprocess, sys
import numpy as np

SRC, AUD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 24
ZOOM = 1.08
W4, H4 = 3840, 2160
SW, SH = 4148, 2334          # 3840*1.08, 2160*1.08 rounded to even
MX, MY = (SW - W4) // 2, (SH - H4) // 2
CLIPS = {'launch': 45, 'cruising': 113, 'explosion': 132, 'planet': 29}
os.makedirs(OUT, exist_ok=True); os.makedirs(OUT + '/web', exist_ok=True); os.makedirs(OUT + '/master', exist_ok=True)

def interp(t, pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def rumble(n, seed, smooth=0.45):
    r = np.random.default_rng(seed); v = r.standard_normal((n, 3))
    for i in range(1, n): v[i] = smooth * v[i - 1] + (1 - smooth) * v[i]   # keep it punchy but not pure jitter
    return v / (v.std(0) + 1e-9)
def jolt(t, at, amp, freq=9.0, tau=0.35, seed=0):
    r = np.random.default_rng(seed); ang = r.uniform(0, 2 * np.pi)
    d = np.clip(t - at, 0, None); on = (t >= at)
    s = np.sin(2 * np.pi * freq * d + np.pi / 2) * np.exp(-d / tau) * amp * on
    return np.stack([s * np.cos(ang), s * np.sin(ang), s * 0.5], 1)
def float_(t, amp, start=0.0):
    k = np.clip((t - start) / 1.0, 0, 1) * amp
    return np.stack([np.sin(2 * np.pi * .35 * t) * k, np.sin(2 * np.pi * .27 * t + 1) * k * .7, np.zeros_like(t)], 1)

cues = {}
def profile(name, n):
    t = np.arange(n) / FPS
    if name == 'launch':
        a = interp(t, [(0, 0), (0.08, 6), (0.6, 7), (1.875, 16)])
        s = rumble(n, 1) * a[:, None] + jolt(t, 0.08, 8, 10, 0.2, 1)
        cues[name] = [{'t': 0.08, 'type': 'ignition', 'strength': 0.6}, {'t': 1.0, 'type': 'rumble', 'strength': 0.8, 'until': 1.875}]
    elif name in ('cruising', 'explosion'):
        a = interp(t, [(0, 14), (0.6, 8), (1.6, 2), (t[-1], 1.2)])
        if name == 'explosion':
            a = a + interp(t, [(0, 0), (3.4, 0), (3.7, 3), (4.3, 4), (4.33, 0), (t[-1], 0)])
            a = a + interp(t, [(0, 0), (4.41, 0), (4.42, 18), (5.0, 6), (t[-1], 2)])
        s = rumble(n, 2) * a[:, None] + float_(t, 3, 1.0)
        if name == 'explosion':
            s += jolt(t, 4.333, 6, 14, 0.12, 3) + jolt(t, 4.417, 32, 7, 0.45, 4)
            cues[name] = [{'t': 3.45, 'type': 'warning', 'strength': 0.3}, {'t': 4.333, 'type': 'spark', 'strength': 0.5},
                          {'t': 4.417, 'type': 'explosion', 'strength': 1.0}]
        else:
            cues[name] = [{'t': 0.0, 'type': 'rumble', 'strength': 0.6, 'until': 1.2}]
    else:  # planet
        a = interp(t, [(0, 1.5), (t[-1], 5)])
        s = rumble(n, 5) * a[:, None] + float_(t, 2, 0)
        cues[name] = [{'t': 0.55, 'type': 'arrival_chime', 'strength': 0.2}]
    x = np.clip(s[:, 0] * 2, -MX + 4, MX - 4)        # 1080-ref px -> 4K px
    ang = s[:, 2] * 0.0009                            # radians (~0.05 deg per unit; 32 -> ~1.6 deg peak)
    ang = np.clip(ang, -0.03, 0.03)
    rot_margin = np.abs(np.sin(ang)) * SW / 2 + 2
    y = np.clip(s[:, 1] * 2, -(MY - rot_margin), MY - rot_margin)
    return x, y, ang

for name, n in CLIPS.items():
    x, y, ang = profile(name, n)
    cmd = os.path.join(OUT, f'{name}.cmd')
    with open(cmd, 'w') as f:
        for i in range(n):
            f.write(f"{i / FPS:.5f} [enter] rotate@r a {ang[i]:.5f}, crop@c x {int(round(MX + x[i]))}, crop@c y {int(round(MY + y[i]))};\n")
    src = [p for p in os.listdir(SRC) if p.endswith(f'rocket{name}.mp4')][0]
    vf = (f"scale={SW}:{SH}:flags=lanczos,sendcmd=f={cmd},rotate@r=0:fillcolor=black,"
          f"crop@c={W4}:{H4}:{MX}:{MY},split=2[m][w];[w]scale=1920:1080:flags=lanczos[wo]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(SRC, src), '-i', os.path.join(AUD, f'{name}.wav'),
                    '-filter_complex', f"[0:v]{vf}", '-map', '[m]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', f'{OUT}/master/{name}_4k.mp4',
                    '-map', '[wo]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', f'{OUT}/web/{name}.mp4'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{OUT}/web/{name}.mp4', '-frames:v', '1', '-q:v', '3', f'{OUT}/web/{name}_poster.jpg'], check=True)
    os.remove(cmd)
    print(name, 'done')

meta = {k: {'file': f'/cutscenes/{k}.mp4', 'poster': f'/cutscenes/{k}_poster.jpg', 'frames': n, 'fps': FPS,
            'duration': round(n / FPS, 4), 'cues': cues[k]} for k, n in CLIPS.items()}
json.dump(meta, open(f'{OUT}/web/cutscenes.json', 'w'), indent=2)
