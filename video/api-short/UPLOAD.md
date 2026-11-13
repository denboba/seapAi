# YouTube upload kit: "What is an API?" (Short)

**File:** `what-is-an-api-short.mp4` (1080×1920, 30 fps, 59.2 s, H.264/AAC, −14 LUFS)
**Thumbnail (for long-form/Community post use):** `thumbnail.png` (1280×720)

## Title (pick one; the first is the main pick)
1. You Use 50 APIs a Day and Don't Know What They Are 🤯
2. What Is an API? Explained in 60 Seconds
3. APIs Explained Like You're Ordering Food 🍝

## Description
```
You've used 50+ APIs today. Here's what an API actually is, in 60 seconds. 🍽️

📱 Your app = the customer
🤵 The API = the waiter
👨‍🍳 The server = the kitchen

Plus: what 200, 404 and 500 really mean (one of them means the kitchen is on fire 🔥).

Follow for part 2: build your own API in 60 seconds.

#api #coding #programming #webdevelopment #techexplained #learntocode #shorts
```

## Tags
api, what is an api, api explained, apis for beginners, rest api, http status codes,
404 error, learn to code, programming for beginners, web development, software engineering,
tech explained, coding shorts

## Pinned comment (drives replies, which helps the algorithm)
> Which API do you use the most without realizing it? 👇 Wrong answers only 😅

## Posting checklist
- Upload as a **Short** (vertical, under 60 s, already met).
- Pick the frame at **0:17** (the yellow "API" reveal) or **0:01** (the "50+" counter) as the Shorts cover.
- Post when your audience is most active; for a new channel try **Tue–Thu, 12:00–15:00 local**.
- Reply to the first 20 comments within the first hour.
- Ship part 2 ("Build your own API in 60 seconds") within 2–4 days. The CTA promises it.

## Why it's built this way
- **Hook in under 1 s:** a big number counting up plus a provocative claim ("you don't even know what one is").
- **Pattern interrupt every 2–4 s:** a scene cut, a stamp, a code reveal or a status code, with whoosh/pop SFX on each.
- **Word-by-word captions:** most Shorts are watched muted, so the keywords are color-coded.
- **One sticky analogy** (restaurant/waiter) that viewers can repeat in the comments.
- **Retention progress bar** plus an end CTA that promises a payoff for following.
- **Loop-friendly ending:** the last line flows back into the "50 APIs" hook.

## Rebuild
```bash
cd video/api-short && rm -f out/frames.mp4 && ./make.sh
```
Requires Python 3 with Pillow, numpy and scipy, plus ffmpeg. The voiceover (`voiceover.mp3`) is an
ElevenLabs "Liam" voice generated through vidIQ. Music and SFX are synthesized from scratch in
`audio.py` (royalty-free, original).
