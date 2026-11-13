"""Caption timeline: each phrase is pinned to a speech segment found with
ffmpeg silencedetect (noise=-35dB, d=0.15) on voiceover.mp3. Word times are
interpolated inside each segment by character length."""

FPS = 30
DURATION = 59.2

# (segment_start, segment_end, phrase)
SEGMENTS = [
    (0.00, 2.69, "You've used over fifty APIs today."),
    (3.14, 5.13, "And you probably don't even know what one is."),
    (5.80, 6.59, "Open a weather app."),
    (7.23, 9.16, "Your phone has no idea it's raining."),
    (9.50, 10.72, "So it asks a server."),
    (11.42, 13.35, "That question is called a REQUEST."),
    (13.90, 15.37, "The answer is a RESPONSE."),
    (15.91, 16.99, "And the messenger in between?"),
    (17.57, 18.44, "That's the API."),
    (19.45, 20.19, "Think of a restaurant."),
    (20.68, 21.27, "You're the app."),
    (21.74, 22.97, "The kitchen is the server."),
    (23.36, 24.04, "The waiter"),
    (24.23, 25.08, "is the API."),
    (25.75, 27.06, "You never walk into the kitchen."),
    (27.36, 28.49, "You just order from the menu."),
    (29.07, 29.87, "Log in with Google?"),
    (30.36, 30.93, "API."),
    (31.52, 32.20, "Pay online?"),
    (32.68, 33.25, "API."),
    (33.74, 34.90, "Your ride moving on a map?"),
    (35.50, 36.07, "API."),
    (36.80, 38.45, "AI chatbots inside your apps?"),
    (38.78, 39.68, "Also an API."),
    (40.17, 41.51, "And when things go wrong:"),
    (42.02, 43.25, "200 means okay."),
    (43.68, 45.40, "404 means not found."),
    (45.91, 48.06, "500 means the kitchen is on fire."),
    (48.79, 51.40, "APIs are why two people in a bedroom"),
    (51.40, 53.93, "can build what used to take a thousand engineers."),
    (54.63, 56.60, "Follow, and next time"),
    (56.60, 59.00, "I'll show you how to build your own API in sixty seconds."),
]

# spoken-length weights for tokens written as digits
SPOKEN = {"200": "two hundred", "404": "four oh four", "500": "five hundred"}

HIGHLIGHT = {
    "API.": (182, 255, 59), "API": (182, 255, 59), "APIS": (182, 255, 59), "API?": (182, 255, 59),
    "REQUEST.": (0, 229, 255), "RESPONSE.": (255, 61, 129),
    "200": (182, 255, 59), "404": (255, 214, 10), "500": (255, 59, 48), "FIRE.": (255, 59, 48),
    "FOLLOW,": (255, 61, 129),
}


def build():
    caps = []
    for i, (a, b, phrase) in enumerate(SEGMENTS):
        toks = phrase.upper().split()
        weights = [len(SPOKEN.get(t, t)) + 2 for t in toks]
        tot = sum(weights)
        words, cur = [], a
        for tok, w in zip(toks, weights):
            dur = (b - a) * w / tot
            words.append({"text": tok, "start": cur, "end": cur + dur, "hi": HIGHLIGHT.get(tok)})
            cur += dur
        nxt = SEGMENTS[i + 1][0] if i + 1 < len(SEGMENTS) else DURATION
        caps.append({"start": a, "end": min(nxt, b + 0.6), "words": words})
    return caps


CAPTIONS = build()
