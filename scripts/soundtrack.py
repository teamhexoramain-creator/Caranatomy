"""
Procedural, royalty-free soundtrack for the anatomy video.

Music: 120 BPM dark electronic bed in D minor (pad, sub bass, kick, clap, hats,
plucked arpeggio) arranged around the storyboard sections. SFX (risers,
impacts, whooshes, UI blips, x-ray scan, turbo spool, V6 rev + blow-off) are
placed on the cue list exported from src/story.js.

Usage: python3 scripts/soundtrack.py build/<ep>/cues.json build/<ep>/soundtrack.wav
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(35)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def saw(freq, t, harmonics=14):
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * freq * k * t) / k
    return out * (2 / np.pi)


def note(n):
    """MIDI note -> Hz"""
    return 440.0 * 2 ** ((n - 69) / 12)


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, at, gain=1.0, pan=0.0):
        i0 = int(at * SR)
        if i0 >= self.n:
            return
        sig = sig[: self.n - i0]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i0:i0 + len(sig)] += sig * gain * l * 1.414
        self.R[i0:i0 + len(sig)] += sig * gain * r * 1.414

    def add_st(self, l, r, at, gain=1.0):
        i0 = int(at * SR)
        m = min(len(l), self.n - i0)
        self.L[i0:i0 + m] += l[:m] * gain
        self.R[i0:i0 + m] += r[:m] * gain


# ------------------------------------------------------------------ instruments
def kick(dur=0.45):
    t = t_axis(dur)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s += 0.25 * hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 120)
    return np.tanh(s * 1.6)


def clap(dur=0.3):
    t = t_axis(dur)
    nz = bp(rng.standard_normal(len(t)), 900, 4500)
    env = np.exp(-t * 18) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0))
    return nz * env * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3


def hat(dur=0.08, open_=False):
    t = t_axis(dur if not open_ else 0.25)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (60 if not open_ else 14))


def pluck(freq, dur=0.35):
    t = t_axis(dur)
    s = saw(freq, t, 18)
    cutoff_env = np.exp(-t * 14)
    # crude time-varying low-pass: blend a dark and a bright copy
    bright, dark = lp(s, 4500), lp(s, 700)
    return (dark + (bright - dark) * cutoff_env) * np.exp(-t * 6)


def pad_chord(notes, dur, bright=900):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for n in notes:
        for det in (-0.12, 0.0, 0.11):
            s += saw(note(n + det), t + rng.random(), 10)
    s = lp(s / (len(notes) * 3), bright)
    a = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 0.9)
    return s * np.clip(a, 0, 1)


def sub(freq, dur):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 2.5)
    return np.tanh(1.3 * s) * env


# ------------------------------------------------------------------ sfx
def riser(dur, lo=300, hi=6000):
    t = t_axis(dur)
    nz = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    seg = 2048
    for i in range(0, len(t), seg):
        k = i / len(t)
        f = lo * (hi / lo) ** (k ** 1.6)
        chunk = bp(nz[max(0, i - 4096):i + seg], f * 0.7, min(f * 1.4, SR / 2 - 100))
        out[i:i + seg] = chunk[-len(out[i:i + seg]):]
    env = (t / dur) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(80 + 400 * (t / dur) ** 2) / SR) * 0.3
    return (out * 0.8 + tone) * env


def impact(dur=2.6):
    t = t_axis(dur)
    f = 32 + 70 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    crack = lp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 9) * 0.5
    tail = lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 1.6) * 0.25
    return np.tanh((boom * 1.3 + crack + tail) * 1.2)


def whoosh(dur=1.1, lo=200, hi=3000):
    t = t_axis(dur)
    nz = rng.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    a = bp(nz, lo, hi)
    b = bp(nz, lo * 3, min(hi * 3, 20000))
    k = t / dur
    return (a * (1 - k) + b * k) * env


def blip():
    t = t_axis(0.16)
    s = np.sin(2 * np.pi * 1500 * t) * (t < 0.05) + np.sin(2 * np.pi * 2250 * t) * ((t > 0.07) & (t < 0.12))
    return s * 0.5 * np.exp(-t * 8)


def scan(dur):
    t = t_axis(dur)
    k = t / dur
    f = 600 + 2000 * k
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t))
    nz = bp(rng.standard_normal(len(t)), 2500, 9000) * 0.5
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    beeps = np.zeros_like(t)
    for b in np.arange(0.1, dur, 0.25):
        m = (t > b) & (t < b + 0.03)
        beeps[m] += np.sin(2 * np.pi * 3200 * t[m]) * 0.4
    return (tone * 0.25 + nz * 0.3 + beeps) * env


def lights_on():
    t = t_axis(1.4)
    click = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 90)
    hum = (np.sin(2 * np.pi * 100 * t) + 0.4 * np.sin(2 * np.pi * 200 * t)) * np.minimum(1, t / 0.2) * np.exp(-t * 2.5) * 0.25
    zap = np.sin(2 * np.pi * np.cumsum(2000 + 3000 * np.exp(-t * 10)) / SR) * np.exp(-t * 25) * 0.2
    return click * 0.8 + hum + zap


def turbo(dur=2.2):
    t = t_axis(dur)
    k = np.clip(t / (dur * 0.7), 0, 1)
    f = 1800 + 5200 * k ** 1.5
    flutter = 1 + 0.03 * np.sin(2 * np.pi * 13 * t)
    whistle = np.sin(2 * np.pi * np.cumsum(f * flutter) / SR)
    air = bp(rng.standard_normal(len(t)), 3000, 9000)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.25)
    return (whistle * 0.35 + air * 0.35 * k) * env


def v6_rev(dur=2.8):
    """Very rough twin-turbo V6 blip: rpm sweep, firing-order harmonics, saturation."""
    t = t_axis(dur)
    rpm = np.interp(t, [0, 0.15, 0.75, 1.4, dur], [1100, 1300, 6800, 2200, 1000])
    fire = rpm / 60 * 3                    # 3 firing events per revolution
    ph = 2 * np.pi * np.cumsum(fire / 3) / SR  # crank-cycle phase
    s = np.zeros_like(t)
    amps = {1: 0.25, 2: 0.4, 3: 1.0, 4: 0.3, 6: 0.55, 9: 0.25, 12: 0.12}
    for h, a in amps.items():
        s += a * np.sin(h * ph + rng.random() * 6)
    s = np.tanh(s * 2.2)
    rough = lp(rng.standard_normal(len(t)), 1500) * (0.5 + 0.5 * np.sin(3 * ph)) * 0.35
    out = lp(s + rough, 2600)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.4)
    load = np.interp(t, [0, 0.7, 0.85, dur], [0.7, 1.0, 0.55, 0.45])
    sig = out * env * load
    # turbo blow-off after the lift
    bo_t = t - 0.85
    m = bo_t > 0
    bo = np.zeros_like(t)
    bo[m] = bp(rng.standard_normal(m.sum()), 1800, 7000) * np.exp(-bo_t[m] * 3.5) * 0.45
    return sig * 0.8 + bo


# ------------------------------------------------------------------ arrangement
def build(cues, dur=50.0, transpose=0):
    mix = Mix(dur)
    music = Mix(dur)
    beat = 0.5
    grid0 = 8.9 % beat
    sections = {"intro": (0, 6.2), "scan": (6.2, 8.9), "groove": (8.9, 38.9), "break": (38.9, 43.6), "outro": (43.6, dur)}
    prog = [[n + transpose for n in c] for c in [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]]]  # Dm Bb F C
    roots = [r + transpose for r in [38, 34, 41, 36]]
    bar = beat * 4
    # pads over the whole piece (two bars per chord)
    tt = 0.0
    i = 0
    while tt < dur:
        brightness = 700 if tt < 8.9 else (1200 if tt < 38.9 else 900)
        music.add(pad_chord(prog[i % 4], bar * 2 + 0.9, brightness), tt, 0.22, 0)
        tt += bar * 2
        i += 1
    kick_env = np.zeros(mix.n)
    beats = np.arange(grid0, dur, beat)
    for bi, b in enumerate(beats):
        chord = int(b // (bar * 2)) % 4
        in_groove = sections["groove"][0] - 0.01 <= b < sections["groove"][1]
        in_scan = sections["scan"][0] <= b < sections["scan"][1]
        in_outro = b >= sections["outro"][0]
        if in_groove:
            mix_k = kick()
            music.add(mix_k, b, 0.9)
            i0 = int(b * SR)
            kick_env[i0:i0 + int(0.25 * SR)] = np.maximum(kick_env[i0:i0 + int(0.25 * SR)], np.exp(-np.arange(min(int(0.25 * SR), mix.n - i0)) / SR * 14)[: len(kick_env[i0:i0 + int(0.25 * SR)])])
            if bi % 2 == 1:
                music.add(clap(), b, 0.35, 0.1)
            music.add(sub(note(roots[chord] - 12), 0.45), b + beat / 2, 0.55)
            music.add(sub(note(roots[chord] - 12), 0.3), b + beat * 0.75, 0.3)
        if in_groove or in_scan:
            music.add(hat(), b + beat / 2, 0.18 if in_groove else 0.1, 0.35)
            music.add(hat(), b, 0.08, -0.3)
        if b < 6.2 and bi % 2 == 0:
            music.add(sub(note(roots[chord] - 12), 0.9), b, 0.35)
        if in_outro and b < sections["outro"][0] + 0.3:
            music.add(kick(), b, 0.9)
    # plucked arpeggio with ping-pong delay (scan + groove + break)
    arp_l, arp_r = np.zeros(mix.n), np.zeros(mix.n)
    step = beat / 4
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    for si, s in enumerate(np.arange(sections["scan"][0] + grid0, sections["break"][1] - 1.0, step)):
        chord = int(s // (bar * 2)) % 4
        notes = prog[chord]
        n = notes[pattern[si % len(pattern)]] + 12
        g = 0.12 if s < 8.9 else (0.16 if s < 38.9 else 0.1)
        p = pluck(note(n), 0.3)
        i0 = int(s * SR)
        m = min(len(p), mix.n - i0)
        arp_l[i0:i0 + m] += p[:m] * g
        arp_r[i0:i0 + m] += p[:m] * g
    d = int(beat * 0.75 * SR)
    dl, dr = np.zeros(mix.n), np.zeros(mix.n)
    dl[d:] += arp_r[:-d] * 0.45
    dr[2 * d:] += arp_l[:-2 * d] * 0.35
    music.L += arp_l + dl
    music.R += arp_r + dr
    # sidechain ducking from the kick
    duck = 1 - 0.55 * kick_env
    music.L *= duck
    music.R *= duck
    # outro: final sustained chord with gentle fade
    music.add(pad_chord([n + transpose for n in [38, 50, 57, 62, 65]], 6.6, 1500), 43.6, 0.3)
    fade = np.ones(mix.n)
    tail = int(1.2 * SR)
    fade[-tail:] = np.linspace(1, 0, tail) ** 1.5
    mix.L += music.L * fade * 0.9
    mix.R += music.R * fade * 0.9

    for c in cues:
        typ, at = c["type"], c["t"]
        if typ == "rise":
            mix.add(riser(1.5, 200, 7000), at, 0.35)
        elif typ == "lights":
            mix.add(lights_on(), at, 0.6)
        elif typ == "impact":
            mix.add(impact(), at, 0.75)
        elif typ == "scan":
            mix.add(scan(c["dur"] + 0.3), at, 0.45, -0.2)
        elif typ == "whoosh":
            mix.add_st(whoosh(1.4, 150, 2500), whoosh(1.4, 180, 2800), at - 0.5, 0.5)
        elif typ == "whoosh-small":
            mix.add(whoosh(0.7, 400, 5000), at - 0.25, 0.28, 0.3)
        elif typ == "blip":
            mix.add(blip(), at, 0.3, -0.25)
        elif typ == "turbo":
            mix.add(turbo(2.4), at, 0.38, 0.15)
        elif typ == "rev":
            mix.add(v6_rev(2.8), at, 0.65)
    # gentle master: low-cut, soft clip, normalise
    L, R = hp(mix.L, 28), hp(mix.R, 28)
    peak = max(np.abs(L).max(), np.abs(R).max())
    L, R = np.tanh(L / peak * 1.4) / np.tanh(1.4), np.tanh(R / peak * 1.4) / np.tanh(1.4)
    return np.stack([L, R], axis=1) * 0.89


def main():
    global rng
    data = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    music = {}
    if isinstance(data, dict):  # {duration, music: {seed, transpose}, cues}
        cues, dur, music = data["cues"], float(data["duration"]), data.get("music", {})
    else:
        cues, dur = data, float(sys.argv[3]) if len(sys.argv) > 3 else 50.0
    rng = np.random.default_rng(music.get("seed", 35))
    audio = build(cues, dur, music.get("transpose", 0))
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {out} ({len(audio)/SR:.1f}s)")


if __name__ == "__main__":
    main()
