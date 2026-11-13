#!/usr/bin/env python3
"""Synthesize an original music bed + sound effects for the Short.

Writes out/music.wav and out/sfx.wav (44.1 kHz stereo float).
The music is a 100 BPM synthwave loop (A minor: Am-F-C-G) built from
scratch with numpy, so there are no licensing issues.
"""
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

from timeline import DURATION

SR = 44100
N = int(SR * (DURATION + 0.5))
OUT = os.path.join(os.path.dirname(__file__), "out")
rng = np.random.default_rng(3)

BPM = 100
BEAT = 60 / BPM


def t_arr(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f, t):
    return 2 * ((f * t) % 1.0) - 1


# ---------------- instruments ----------------
def kick():
    t = t_arr(0.45)
    f = 45 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * 0.9 + 0.15 * np.sin(ph * 2) * np.exp(-t * 30)


def snare():
    t = t_arr(0.3)
    n = bp(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return 0.55 * n + 0.35 * tone


def hat(open_=False):
    t = t_arr(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (12 if open_ else 70)) * 0.35


def pad_chord(notes, dur):
    t = t_arr(dur)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.12, 0.0, 0.12):
            s += saw(note(m + det), t + rng.uniform(0, 1))
    s = lp(s / (len(notes) * 3), 1800)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3)
    return s * e


def bass_note(m, dur):
    t = t_arr(dur)
    s = saw(note(m), t) * 0.6 + np.sin(2 * np.pi * note(m) * t) * 0.6
    return lp(s, 500) * env(len(t), 0.005, dur * 0.6)


def pluck(m, dur=0.35):
    t = t_arr(dur)
    s = saw(note(m), t) + 0.5 * saw(note(m + 12), t)
    return lp(s, 3500) * env(len(t), 0.002, 0.12) * 0.5


# ---------------- music ----------------
def music():
    L = np.zeros(N)
    R = np.zeros(N)
    drums = np.zeros(N)
    # A minor progression, one chord per bar (4 beats)
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    roots = [33, 29, 36, 31]
    arp_pat = [0, 1, 2, 1, 2, 0, 1, 2]
    bar = 4 * BEAT
    nbars = int(DURATION / bar) + 2
    K, S, Hc, Ho = kick(), snare(), hat(), hat(True)
    for b in range(nbars):
        t0 = b * bar
        ci = b % 4
        # sections: intro (sparse) 0-5.5s, drop at 5.5s, breakdown 48.7-54.5, outro build
        def full(t):
            return 5.5 <= t < 48.7 or t >= 54.5
        pc = pad_chord(prog[ci], bar)
        place(L, pc, t0, 0.16)
        place(R, pc[::-1] * 0 + pc, t0 + 0.012, 0.16)
        for beat in range(4):
            tb = t0 + beat * BEAT
            if full(tb):
                place(drums, K, tb, 0.85)
                if beat in (1, 3):
                    place(drums, S, tb, 0.45)
                place(drums, Hc, tb + BEAT / 2, 0.5)
                place(drums, Ho if beat == 3 else Hc, tb + BEAT * 0.75, 0.3)
                place(L, bass_note(roots[ci], BEAT * 0.45), tb + BEAT / 2, 0.45)
                place(R, bass_note(roots[ci], BEAT * 0.45), tb + BEAT / 2, 0.45)
            elif tb < 5.5:
                if beat == 0:
                    place(drums, K, tb, 0.6)
            # arp on 8ths everywhere except the very beginning
            for k in range(2):
                ta = tb + k * BEAT / 2
                if ta < 1.2:
                    continue
                m = prog[ci][arp_pat[(beat * 2 + k) % 8]] + 12
                pl = pluck(m)
                place(L, pl, ta, 0.20 if k == 0 else 0.12)
                place(R, pl, ta + 0.18, 0.12 if k == 0 else 0.20)  # ping-pong echo
    # sidechain pump on melodic content following the kick
    pump = np.ones(N)
    for b in range(nbars * 4):
        tb = b * BEAT
        if 5.5 <= tb < 48.7 or tb >= 54.5:
            i = int(tb * SR)
            seg = 1 - 0.6 * np.exp(-np.arange(int(BEAT * SR)) / (0.09 * SR))
            j = min(N, i + len(seg))
            if i < N:
                pump[i:j] = seg[: j - i]
    L, R = L * pump + drums, R * pump + drums
    # fade out tail
    fade = np.ones(N)
    fo = int(1.0 * SR)
    fade[-fo:] = np.linspace(1, 0, fo)
    return np.stack([L * fade, R * fade], 1)


# ---------------- sfx ----------------
def whoosh(dur=0.45, up=True):
    t = t_arr(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    # sweep a band-pass by chunks
    chunks = 24
    for c in range(chunks):
        a, b = c * len(t) // chunks, (c + 1) * len(t) // chunks
        x = c / chunks if up else 1 - c / chunks
        f = 300 + 5000 * x ** 2
        out[a:b] = bp(n, f * 0.7, min(f * 1.4, 18000))[a:b]
    e = np.sin(np.pi * t / dur) ** 2
    return out * e * 0.8


def pop():
    t = t_arr(0.12)
    f = 900 * np.exp(-t * 30) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.7


def thud():
    return kick() * 0.9 + lp(rng.standard_normal(int(0.45 * SR)), 300) * env(int(0.45 * SR), 0.001, 0.08) * 0.6


def ding(f=1320):
    t = t_arr(0.9)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 5) * 0.4


def buzzer():
    t = t_arr(0.45)
    return lp(np.sign(np.sin(2 * np.pi * 110 * t)) * 0.3, 1500) * np.minimum(1, (0.45 - t) / 0.05)


def alarm():
    t = t_arr(1.0)
    f = 700 + 300 * np.sign(np.sin(2 * np.pi * 4 * t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    boom = thud()
    s[: len(boom)] += boom
    return s * np.minimum(1, (1.0 - t) / 0.2)


def tick():
    t = t_arr(0.03)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 200) * 0.4


def riser(dur=1.2):
    t = t_arr(dur)
    f = 200 * (8 ** (t / dur))
    s = saw(1, t) * 0  # placeholder for shape
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15 + hp(rng.standard_normal(len(t)), 2000) * 0.15 * (t / dur)
    return s * (t / dur) ** 2


def sfx():
    s = np.zeros(N)
    # counter ticks in the hook
    for k in range(18):
        place(s, tick(), 0.05 + k * 0.075, 0.8)
    place(s, thud(), 3.1, 0.8)          # giant "?"
    for c in [5.55, 11.3, 19.3, 29.0, 40.0, 48.7, 54.5]:
        place(s, whoosh(), c - 0.25, 0.55)   # scene cuts
    place(s, pop(), 9.5, 0.6)           # server enters
    place(s, whoosh(0.6, True), 11.45, 0.35)  # request
    place(s, whoosh(0.6, False), 13.95, 0.35)  # response
    place(s, thud(), 17.5, 0.9)         # API reveal
    for at in [20.68, 21.74, 23.36]:
        place(s, pop(), at, 0.6)        # restaurant cards
    place(s, buzzer(), 26.3, 0.35)      # red X
    for at in [29.0, 31.42, 33.64, 36.7]:
        place(s, whoosh(0.35), at - 0.1, 0.3)  # card swipes
    for at in [30.36, 32.68, 35.50, 38.78]:
        place(s, thud(), at, 0.75)      # API stamps
    place(s, ding(), 42.02, 0.8)        # 200
    place(s, buzzer(), 43.68, 0.5)      # 404
    place(s, alarm(), 45.91, 0.7)       # 500
    for k in range(10):
        place(s, tick(), 50.3 + k * 0.28, 0.5)  # dots filling
    place(s, riser(1.3), 53.3, 0.8)
    place(s, ding(990), 54.6, 0.6)      # FOLLOW button
    return np.stack([s, s], 1)


def save(name, x, peak=0.9):
    x = x / (np.abs(x).max() + 1e-9) * peak
    wavfile.write(os.path.join(OUT, name), SR, x.astype(np.float32))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    save("music.wav", music())
    save("sfx.wav", sfx())
    print("wrote music.wav, sfx.wav")
