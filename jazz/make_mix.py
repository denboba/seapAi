#!/usr/bin/env python3
"""Build a long seamless jazz mix from the audio files in jazz/tracks/.

Tracks are shuffled into a playlist (no track plays twice in a row),
crossfaded into each other, and the result is cut to the target length
with a gentle fade-out.

Usage: python3 jazz/make_mix.py [hours] [crossfade_seconds]
"""
import json, random, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TRACKS = sorted(p for p in (HERE / "tracks").iterdir()
                if p.suffix.lower() in {".wav", ".mp3", ".m4a", ".flac", ".ogg"})
HOURS = float(sys.argv[1]) if len(sys.argv) > 1 else 4
XFADE = float(sys.argv[2]) if len(sys.argv) > 2 else 6
TARGET = HOURS * 3600
OUT = HERE / f"winter_jazz_{HOURS:g}h.mp3"

def duration(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "json", str(p)])
    return float(json.loads(out)["format"]["duration"])

if not TRACKS:
    sys.exit("Put audio files in jazz/tracks/ first.")
durs = {p: duration(p) for p in TRACKS}
print(f"{len(TRACKS)} tracks, {sum(durs.values())/60:.1f} unique minutes")

# Playlist: repeated shuffles, never the same track twice in a row.
rng = random.Random(7)
playlist, total = [], 0.0
while total < TARGET + 60:
    order = TRACKS[:]
    rng.shuffle(order)
    if playlist and len(order) > 1 and order[0] == playlist[-1]:
        order[0], order[-1] = order[-1], order[0]
    for p in order:
        playlist.append(p)
        total += durs[p] - XFADE
        if total >= TARGET + 60:
            break
print(f"playlist: {len(playlist)} plays")

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    # Normalize each unique track once (same format + loudness).
    norm = {}
    for i, p in enumerate(TRACKS):
        q = tmp / f"n{i}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p),
            "-af", "loudnorm=I=-18:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "2",
            str(q)], check=True)
        norm[p] = q
    # Crossfade in chunks of 20 tracks to keep ffmpeg filter graphs small.
    def xfade_chain(inputs, out):
        args = ["ffmpeg", "-v", "error", "-y"]
        for f in inputs:
            args += ["-i", str(f)]
        if len(inputs) == 1:
            subprocess.run(args + ["-c", "copy", str(out)], check=True); return
        graph, last = [], "[0:a]"
        for k in range(1, len(inputs)):
            lbl = f"[x{k}]"
            graph.append(f"{last}[{k}:a]acrossfade=d={XFADE}:c1=tri:c2=tri{lbl}")
            last = lbl
        subprocess.run(args + ["-filter_complex", ";".join(graph), "-map", last,
                               str(out)], check=True)
    chunks = []
    for c in range(0, len(playlist), 20):
        out = tmp / f"c{c}.wav"
        xfade_chain([norm[p] for p in playlist[c:c+20]], out)
        chunks.append(out)
        print(f"  chunk {len(chunks)} done")
    full = tmp / "full.wav"
    xfade_chain(chunks, full)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(full), "-t", str(TARGET),
        "-af", f"afade=t=in:d=3,afade=t=out:st={TARGET-10}:d=10",
        "-c:a", "libmp3lame", "-b:a", "192k", str(OUT)], check=True)
print(f"done: {OUT} ({duration(OUT)/3600:.2f} h)")
