"""Procedural sound design for the four cutscenes + a UI sound pack.
All sounds are synthesised from scratch (no samples), 48 kHz.
"""
import json, os, sys
import numpy as np
from scipy import signal
import soundfile as sf
import pyloudnorm as pyln

SR = 48000
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def t_axis(dur): return np.arange(int(round(dur * SR))) / SR
def white(n, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    return r.standard_normal(n)
def brown(n, seed=None):
    b = np.cumsum(white(n, seed)); b = signal.sosfilt(signal.butter(2, 18, 'hp', fs=SR, output='sos'), b)
    return b / (np.abs(b).max() + 1e-9)
def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, kind, fs=SR, output='sos'), x)
def env_interp(t, pts):
    xs, ys = zip(*pts); return np.interp(t, xs, ys)
def svf_lp(x, fc):
    """time-varying lowpass (Chamberlin SVF), fc array in Hz"""
    lp = bp = 0.0; q = 0.7; out = np.empty_like(x)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    for i in range(len(x)):
        hp = x[i] - lp - q * bp; bp += f[i] * hp; lp += f[i] * bp; out[i] = lp
    return out
def crackle(n, density, seed):
    r = np.random.default_rng(seed)
    imp = (r.random(n) < density / SR).astype(float) * r.uniform(0.3, 1, n) * np.sign(r.standard_normal(n))
    burst = r.standard_normal(int(0.003 * SR)) * np.exp(-np.linspace(0, 6, int(0.003 * SR)))
    return filt(np.convolve(imp, burst)[:n], 'bandpass', [700, 6000])
def stereo(l, r): return np.stack([l, r], 1)
def pan(x, p):  # p in [-1,1] scalar or array
    a = (np.asarray(p) + 1) * np.pi / 4
    return stereo(x * np.cos(a), x * np.sin(a))
def roar(n, seed):
    """rocket engine: sub rumble + mid roar + crackle, stereo-decorrelated"""
    out = []
    for s in (seed, seed + 100):
        sub = filt(brown(n, s), 'lowpass', 120, 4) * 1.4
        mid = filt(white(n, s + 1), 'bandpass', [180, 1400]) * 0.35
        hiss = filt(white(n, s + 2), 'bandpass', [2000, 7000]) * 0.05
        out.append(sub + mid + hiss)
    return stereo(*out)
def bell(f, dur, decay=1.2, amp=1.0):
    t = t_axis(dur); y = np.zeros_like(t)
    for ratio, a in [(1, 1), (2.76, .45), (5.4, .25), (8.93, .12)]:
        y += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * decay * ratio ** .5)
    return amp * y * (1 - np.exp(-t * 400))
def pad(dur, freqs, seed=1, bright=900):
    t = t_axis(dur); y = np.zeros((len(t), 2))
    r = np.random.default_rng(seed)
    for f in freqs:
        for ch in range(2):
            det = 1 + r.uniform(-0.004, 0.004)
            ph = r.uniform(0, 2 * np.pi)
            lfo = 1 + 0.25 * np.sin(2 * np.pi * r.uniform(.05, .2) * t + ph)
            saw = signal.sawtooth(2 * np.pi * f * det * t + ph) * 0.5 + np.sin(2 * np.pi * f * det * t + ph)
            y[:, ch] += saw * lfo
    for ch in range(2): y[:, ch] = filt(y[:, ch], 'lowpass', bright, 2)
    return y / np.abs(y).max()
def whoosh(dur, f0, f1, p0, p1, seed):
    t = t_axis(dur); n = len(t)
    fc = np.geomspace(f0, f1, n)
    x = svf_lp(white(n, seed), fc) - svf_lp(white(n, seed), fc * 0.35)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return pan(x * e, np.linspace(p0, p1, n))
def place(buf, snd, at):
    i = int(at * SR); j = min(len(buf), i + len(snd)); buf[i:j] += snd[:j - i]
def finish(y, lufs, name, fade_in=0.004, fade_out=0.02):
    meter = pyln.Meter(SR)
    m = y if len(y) > 0.5 * SR else np.tile(y, (int(np.ceil(0.5 * SR / len(y))) + 1, 1))
    y = y * 10 ** ((lufs - meter.integrated_loudness(m)) / 20)
    y = np.tanh(y * 1.1) / 1.1                       # soft limiter
    pk = np.abs(y).max()
    if pk > 0.89: y *= 0.89 / pk                       # ~ -1 dBFS ceiling
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    if fi: y[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo: y[-fo:] *= np.linspace(1, 0, fo)[:, None]
    sf.write(os.path.join(OUT, name), y.astype(np.float32), SR, subtype='FLOAT')
    return y

# ---------------- CUTSCENES ----------------
DUR = {'launch': 1.875, 'cruising': 4.708333, 'explosion': 5.5, 'planet': 1.208333}

# LAUNCH: ignition thump at 0.08 s, roar builds to full by the end
t = t_axis(DUR['launch']); n = len(t)
y = roar(n, 10) * env_interp(t, [(0, 0), (0.08, 0.25), (0.5, 0.55), (1.875, 1.0)])[:, None]
cr = crackle(n, 900, 11) * env_interp(t, [(0, 0), (0.3, 0.2), (1.875, 0.9)])
y += stereo(cr, crackle(n, 900, 111) * env_interp(t, [(0, 0), (0.3, 0.2), (1.875, 0.9)])) * 0.5
ign_t = t_axis(0.5)
ign = np.sin(2 * np.pi * np.cumsum(np.geomspace(90, 35, len(ign_t))) / SR) * np.exp(-ign_t * 7)
ign += filt(white(len(ign_t), 12), 'lowpass', 900) * np.exp(-ign_t * 12) * 0.6
place(y, pan(ign, 0) * 1.0, 0.08)
# rising roar sweep for excitement
sweep = svf_lp(white(n, 13), np.geomspace(300, 2500, n)) * env_interp(t, [(0, 0), (1.875, 0.35)])
y += stereo(sweep, sweep)
launch = finish(y, -14, 'launch.wav')

# CRUISING: roar carried over from launch fades to a hum as the shuttle flies off; whoosh L->R
def cruise_bed(dur, seed):
    t = t_axis(dur); n = len(t)
    y = roar(n, seed) * env_interp(t, [(0, 1.0), (0.6, 0.55), (1.6, 0.18), (dur, 0.12)])[:, None]
    cr = crackle(n, 600, seed + 1) * env_interp(t, [(0, 0.8), (1.0, 0.15), (dur, 0.05)])
    y += stereo(cr, crackle(n, 600, seed + 51) * env_interp(t, [(0, 0.8), (1.0, 0.15), (dur, 0.05)])) * 0.5
    w = whoosh(1.8, 250, 3500, -0.8, 0.3, seed + 2) * 0.9
    place(y, w, 0.0)
    hum_t = t; hum = (np.sin(2 * np.pi * 55 * hum_t) + 0.4 * np.sin(2 * np.pi * 110.5 * hum_t))
    y += stereo(hum, hum) * env_interp(t, [(0, 0), (1.2, 0.08), (dur, 0.08)])[:, None]
    p = pad(dur, [130.81, 196.0, 293.66, 329.63], seed + 3, 700)   # Cmaj9-ish, airy
    y += p * env_interp(t, [(0, 0), (1.5, 0.05), (dur, 0.09)])[:, None]
    return y
cruising = finish(cruise_bed(DUR['cruising'], 20), -19, 'cruising.wav')

# EXPLOSION: same cruise bed, then warning beeps + sputter, spark crack at 4.333, boom at 4.417
t = t_axis(DUR['explosion']); n = len(t)
y = cruise_bed(DUR['explosion'], 20)
y *= env_interp(t, [(0, 1), (4.3, 1), (4.42, 0.3), (5.5, 0.2)])[:, None]
for bt in (3.45, 3.75, 4.05):                       # playful "uh-oh" alarm
    bd = t_axis(0.13); b = signal.square(2 * np.pi * 988 * bd) * 0.25 + np.sin(2 * np.pi * 988 * bd)
    b = filt(b, 'lowpass', 3500) * np.minimum(1, (0.13 - bd) * 60) * np.minimum(1, bd * 300)
    place(y, pan(b, 0.15) * 0.18, bt)
sp_t = t_axis(0.6)                                   # engine sputter
sput = filt(white(len(sp_t), 30), 'bandpass', [150, 900]) * (signal.square(2 * np.pi * 14 * sp_t) > 0) * np.exp(-sp_t * 2)
place(y, pan(sput, 0) * 0.5, 3.7)
ck_t = t_axis(0.12)                                  # spark crack
crack = filt(white(len(ck_t), 31), 'highpass', 1800) * np.exp(-ck_t * 55)
place(y, pan(crack, 0.1) * 1.4, 4.333)
bt = t_axis(DUR['explosion'] - 4.417); bn = len(bt)  # BOOM
sub = np.sin(2 * np.pi * np.cumsum(np.geomspace(75, 26, bn)) / SR) * np.exp(-bt * 2.2) * (1 - np.exp(-bt * 300))
body_l = svf_lp(white(bn, 32), np.geomspace(5000, 120, bn)) * np.exp(-bt * 2.6)
body_r = svf_lp(white(bn, 33), np.geomspace(5000, 120, bn)) * np.exp(-bt * 2.6)
crunch = np.tanh(filt(white(bn, 34), 'bandpass', [300, 2500]) * 4) * np.exp(-bt * 9) * 0.35
debris = crackle(bn, 1400, 35) * np.exp(-bt * 3.0)
boom = stereo(body_l, body_r) * 1.2 + stereo(sub, sub) * 1.5 + stereo(crunch, crunch) + stereo(debris, crackle(bn, 1400, 36) * np.exp(-bt * 3.0)) * 0.6
place(y, boom, 4.417)
explosion = finish(y, -14, 'explosion.wav')

# PLANET: shuttle glides right->left into the planet; magical swell + arrival chime
t = t_axis(DUR['planet']); n = len(t)
y = roar(n, 40) * 0.12
y += whoosh(DUR['planet'], 400, 2600, 0.7, -0.6, 41) * 0.9
y += pad(DUR['planet'], [261.63, 329.63, 392.0, 493.88, 587.33], 42, 1600) * env_interp(t, [(0, 0), (1.0, 0.45), (1.208, 0.5)])[:, None]
for i, f in enumerate([1046.5, 1318.5, 1568.0]):
    place(y, pan(bell(f, 0.6, 3.0, 0.22), -0.3 + 0.3 * i), 0.55 + i * 0.12)
planet = finish(y, -18, 'planet.wav', fade_out=0.03)

# ---------------- UI PACK ----------------
def tone(f0, f1, dur, wave='sine', decay=8.0, attack=0.003):
    tt = t_axis(dur); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(tt))) / SR
    w = {'sine': np.sin(ph), 'square': signal.square(ph), 'saw': signal.sawtooth(ph), 'tri': signal.sawtooth(ph, 0.5)}[wave]
    return w * np.exp(-tt * decay) * np.minimum(1, tt / attack)
def ui(name, mono, lufs=-20):
    finish(stereo(mono, mono), lufs, name, fade_in=0.001, fade_out=0.005)

ui('ui_click.wav', tone(1400, 900, 0.06, 'tri', 50))
ui('ui_hover.wav', tone(2400, 2600, 0.025, 'sine', 120) * 0.5, -28)
ui('part_pickup.wav', tone(420, 760, 0.12, 'tri', 22))
thud = tone(160, 70, 0.18, 'sine', 25) + filt(white(int(.18 * SR), 50), 'highpass', 3000) * np.exp(-t_axis(.18) * 90) * 0.5
thud[int(.02 * SR):] += tone(1800, 1750, 0.16, 'sine', 30)[: len(thud) - int(.02 * SR)] * 0.35
ui('part_snap.wav', thud, -17)
ui('part_remove.wav', tone(700, 280, 0.16, 'tri', 18))
err = np.concatenate([tone(196, 190, 0.12, 'square', 6), np.zeros(int(.04 * SR)), tone(165, 160, 0.18, 'square', 6)])
ui('error.wav', filt(err, 'lowpass', 1500), -20)
ui('countdown_beep.wav', tone(880, 880, 0.16, 'sine', 10) + 0.3 * tone(1760, 1760, 0.16, 'sine', 14), -18)
go = tone(1318.5, 1318.5, 0.9, 'sine', 3.5) + 0.4 * tone(659.25, 659.25, 0.9, 'tri', 3.0) + 0.2 * tone(2637, 2637, 0.9, 'sine', 6)
ui('countdown_go.wav', go, -16)
ui('score_tick.wav', tone(2093, 2093, 0.05, 'sine', 70) + 0.4 * tone(3136, 3136, 0.05, 'sine', 90), -24)
lb = np.zeros(int(1.0 * SR)); place_m = lambda b, s, at: b.__setitem__(slice(int(at*SR), int(at*SR)+len(s)), b[int(at*SR):int(at*SR)+len(s)] + s[:len(b)-int(at*SR)])
place_m(lb, bell(1046.5, 0.9, 2.5), 0); place_m(lb, bell(1568, 0.8, 2.5), 0.12)
ui('leaderboard_chime.wav', lb, -18)
fan = np.zeros(int(2.0 * SR))
for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    place_m(fan, bell(f, 1.6 - i * 0.12, 1.8) + 0.5 * tone(f, f, 1.6 - i * 0.12, 'tri', 3), i * 0.11)
for i in range(10):
    place_m(fan, bell(rng.uniform(2000, 4200), 0.4, 6, 0.15), 0.5 + i * 0.07)
ui('success_fanfare.wav', fan, -15)
womp = np.zeros(int(1.6 * SR))                       # playful sad trombone "womp womp"
for i, (a, b, d) in enumerate([(392, 370, .32), (370, 349, .32), (349, 330, .32), (330, 290, .65)]):
    s = tone(a, b, d, 'saw', 1.5, 0.02); s *= 1 + 0.15 * np.sin(2 * np.pi * 6 * t_axis(d)) * (i == 3)
    place_m(womp, filt(s, 'lowpass', 1100) * np.minimum(1, (d - t_axis(d)) * 20), [0, .34, .68, 1.0][i])
ui('fail_womp.wav', womp, -17)

# ambient menu loop, 24 s, seamless
L, XF = 24.0, 2.0
p = pad(L + XF, [65.41, 98.0, 146.83, 196.0, 293.66, 329.63], 60, 600)
tt = t_axis(L + XF)
p *= (0.8 + 0.2 * np.sin(2 * np.pi * tt / (L / 2)))[:, None]
for k in range(9):                                  # sparse twinkles
    f = rng.choice([1046.5, 1174.7, 1318.5, 1568.0, 1760.0])
    place(p, pan(bell(f, 1.5, 1.5, 0.08), rng.uniform(-.7, .7)), rng.uniform(0.5, L - 2))
n_l, n_x = int(L * SR), int(XF * SR)
loop = p[:n_l].copy(); fade = np.linspace(0, 1, n_x)[:, None]
loop[:n_x] = loop[:n_x] * fade + p[n_l:n_l + n_x] * (1 - fade)
finish(loop, -26, 'ambient_loop.wav', fade_in=0, fade_out=0)
print('ok')
