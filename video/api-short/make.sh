#!/usr/bin/env bash
# Build the final Short: render frames, synthesize audio, mix and mux.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

[[ -f out/frames.mp4 ]] || python3 render.py
python3 audio.py

ffmpeg -y -hide_banner -loglevel error \
  -i out/frames.mp4 -i voiceover.mp3 -i out/music.wav -i out/sfx.wav \
  -filter_complex "
    [1:a]aresample=44100,aformat=channel_layouts=stereo,
         highpass=f=80,equalizer=f=3500:t=q:w=1.2:g=3,
         acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=3dB,
         asplit=2[voice][key];
    [2:a]volume=0.30[mus];
    [mus][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[ducked];
    [3:a]volume=0.42[fx];
    [voice][ducked][fx]amix=inputs=3:normalize=0:duration=longest,
         loudnorm=I=-14:TP=-1.0:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -t 59.2 \
  out/what-is-an-api-short.mp4

echo "-> out/what-is-an-api-short.mp4"
