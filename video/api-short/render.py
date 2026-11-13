#!/usr/bin/env python3
"""Render the "What is an API?" YouTube Short (1080x1920, 30fps).

All motion graphics are drawn procedurally with Pillow and piped to ffmpeg.
Usage:  python3 render.py            -> out/frames.mp4 (silent video)
        python3 render.py --still 12.0 -> out/still_12.0.png (preview one frame)
"""
import math
import os
import random
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from timeline import CAPTIONS, DURATION, FPS

W, H = 1080, 1920
OUT = os.path.join(os.path.dirname(__file__), "out")

# ---------- palette ----------
BG_TOP = (8, 10, 24)
BG_BOT = (22, 6, 40)
CYAN = (0, 229, 255)
PINK = (255, 61, 129)
LIME = (182, 255, 59)
YELLOW = (255, 214, 10)
RED = (255, 59, 48)
WHITE = (255, 255, 255)
GREY = (150, 160, 190)

FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT_SB = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
FONT_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-ExtraBold.ttf"
FONT_EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"


@lru_cache(maxsize=None)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(maxsize=None)
def emoji(ch, size):
    f = ImageFont.truetype(FONT_EMOJI, 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((80, 80), ch, font=f, embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox())
    s = size / max(im.size)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)


# ---------- easing ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def back_out(x, s=1.9):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def lerp(a, b, x):
    return a + (b - a) * x


def mix(c1, c2, x):
    return tuple(int(lerp(a, b, x)) for a, b in zip(c1, c2))


def alpha(c, a):
    return (*c[:3], int(255 * clamp(a)))


# ---------- background ----------
@lru_cache(maxsize=1)
def base_bg():
    g = Image.new("RGB", (1, H))
    for y in range(H):
        g.putpixel((0, y), mix(BG_TOP, BG_BOT, y / H))
    return g.resize((W, H))


random.seed(7)
PARTICLES = [(random.uniform(0, W), random.uniform(0, H), random.uniform(1.5, 4),
              random.uniform(10, 40), random.choice([CYAN, PINK, LIME])) for _ in range(70)]


def draw_background(img, t, accent):
    img.paste(base_bg())
    d = ImageDraw.Draw(img, "RGBA")
    # perspective-ish moving grid on the lower part
    horizon = 1180
    off = (t * 120) % 120
    for i in range(14):
        y = horizon + ((i * 120 + off) ** 1.35) / 9
        if y > H:
            break
        d.line([(0, y), (W, y)], fill=alpha(accent, 0.10 + 0.10 * (y - horizon) / (H - horizon)), width=2)
    for i in range(-10, 11):
        x0 = W / 2 + i * 40
        x1 = W / 2 + i * 260
        d.line([(x0, horizon), (x1, H)], fill=alpha(accent, 0.10), width=2)
    # drifting particles
    for (x, y, r, sp, c) in PARTICLES:
        yy = (y - t * sp) % H
        tw = 0.25 + 0.25 * math.sin(t * 2 + x)
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=alpha(c, tw))
    # vignette-ish radial glow behind the stage
    return d


def glow(img, layer, radius=18, strength=1.0):
    """Add a neon bloom: blur a downscaled copy of `layer` and composite it under the crisp layer."""
    small = layer.resize((W // 4, H // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(radius / 4))
    big = small.resize((W, H), Image.BILINEAR)
    if strength != 1.0:
        a = big.getchannel("A").point(lambda v: min(255, int(v * strength)))
        big.putalpha(a)
    img.alpha_composite(big)
    img.alpha_composite(big)
    img.alpha_composite(layer)


# ---------- reusable drawing ----------
def text_c(d, xy, s, size, fill, path=FONT_XB, anchor="mm", stroke=0, stroke_fill=(0, 0, 0)):
    d.text(xy, s, font=font(path, size), fill=fill, anchor=anchor,
           stroke_width=stroke, stroke_fill=stroke_fill)


def paste_emoji(img, ch, cx, cy, size, a=1.0, rot=0):
    e = emoji(ch, int(max(4, size)))
    if rot:
        e = e.rotate(rot, resample=Image.BICUBIC, expand=True)
    if a < 1:
        e = e.copy()
        e.putalpha(e.getchannel("A").point(lambda v: int(v * clamp(a))))
    img.alpha_composite(e, (int(cx - e.width / 2), int(cy - e.height / 2)))


def rrect(d, box, r, fill=None, outline=None, width=4):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)


def phone(d, cx, cy, s, col, a=1.0):
    w, h = 230 * s, 420 * s
    rrect(d, [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], 38 * s, fill=alpha((18, 22, 44), a),
          outline=alpha(col, a), width=int(7 * s))
    rrect(d, [cx - 35 * s, cy - h / 2 + 18 * s, cx + 35 * s, cy - h / 2 + 30 * s], 6 * s, fill=alpha(col, a * 0.8))


def server(d, cx, cy, s, col, t, a=1.0):
    w, uh = 250 * s, 95 * s
    for i in range(3):
        y = cy - 1.5 * uh + i * (uh + 12 * s)
        rrect(d, [cx - w / 2, y, cx + w / 2, y + uh], 16 * s, fill=alpha((18, 22, 44), a),
              outline=alpha(col, a), width=int(6 * s))
        for k in range(3):
            on = (math.sin(t * 9 + i * 2 + k) > 0)
            c = LIME if on else (40, 60, 40)
            x = cx + w / 2 - 34 * s - k * 30 * s
            d.ellipse([x - 8 * s, y + uh / 2 - 8 * s, x + 8 * s, y + uh / 2 + 8 * s], fill=alpha(c, a))
        d.line([(cx - w / 2 + 28 * s, y + uh / 2), (cx - 10 * s, y + uh / 2)], fill=alpha(col, a * 0.6),
               width=int(8 * s))


def pill(d, cx, cy, label, col, size=46, a=1.0, txt=(10, 10, 20), path=FONT_BLACK, padx=34, pady=18):
    f = font(path, size)
    l, tp, r, b = d.textbbox((0, 0), label, font=f, anchor="lt")
    w, h = r - l + 2 * padx, b - tp + 2 * pady
    rrect(d, [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], h / 2, fill=alpha(col, a))
    d.text((cx, cy), label, font=f, fill=alpha(txt, a), anchor="mm")
    return w, h


def stamp_api(img, cx, cy, p, col=LIME, label="API ✓"):
    """Rubber-stamp slam-in: overshoot scale + slight rotation."""
    if p <= 0:
        return
    sc = 2.2 - 1.2 * ease_out(clamp(p * 2.5))
    layer = Image.new("RGBA", (520, 220), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    rrect(ld, [10, 10, 510, 210], 30, outline=col + (255,), width=14)
    ld.text((260, 112), label.replace(" ✓", ""), font=font(FONT_BLACK, 130), fill=col + (255,), anchor="mm")
    layer = layer.resize((int(520 * sc * 0.75), int(220 * sc * 0.75)), Image.BICUBIC).rotate(
        -8, expand=True, resample=Image.BICUBIC)
    a = clamp(p * 4)
    layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))


# ---------- scenes ----------
# Each scene draws onto `img` (RGBA, crisp) and `gl` (RGBA, neon layer that gets bloom).
# Times are absolute seconds in the voiceover (see timeline.py).

def scene_hook(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    # orbiting app icons
    icons = ["📱", "🌦️", "💳", "🗺️", "🎵", "💬", "🛒", "🔐"]
    for i, ch in enumerate(icons):
        ap = prog(t, 0.15 * i, 0.4)
        if ap <= 0:
            continue
        ang = t * 0.9 + i * (2 * math.pi / len(icons))
        r = 420
        x = W / 2 + r * math.cos(ang)
        y = 540 + 0.42 * r * math.sin(ang)
        paste_emoji(img, ch, x, y, 130 * back_out(ap), a=ap)
    # counter 0 -> 50+ in the first 1.3s
    n = int(50 * ease_out(prog(t, 0.0, 1.4)))
    pulse = 1 + 0.06 * math.sin(t * 14) * (1 - prog(t, 1.4, 0.6))
    size = int(380 * pulse)
    txt = f"{n}+" if n >= 50 else f"{n}"
    text_c(g, (W / 2, 560), txt, size, CYAN, FONT_BLACK)
    text_c(d, (W / 2, 560), txt, size, WHITE, FONT_BLACK)
    text_c(d, (W / 2, 820), "APIs USED TODAY", 74, YELLOW, FONT_BLACK)
    # second beat: "and you don't know what one is" -> giant ?
    qp = prog(t, 3.1, 0.35)
    if qp > 0:
        d.rectangle([0, 0, W, 1150], fill=(8, 10, 24, int(255 * qp)))
        if qp >= 1:
            gl.paste((0, 0, 0, 0), (0, 0, W, H))  # drop the counter's glow
        g = ImageDraw.Draw(gl, "RGBA")
        s = int(520 * back_out(qp))
        text_c(g, (W / 2, 560), "?", s, PINK, FONT_BLACK)
        text_c(d, (W / 2, 560), "?", s, WHITE, FONT_BLACK)
        text_c(d, (W / 2, 900), "WHAT IS AN API?", int(80 * ease_out(qp)) + 1, PINK, FONT_BLACK)


def scene_weather(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    p = ease_out(prog(t, 5.6, 0.5))
    # phone slides from left to center
    px = lerp(-200, W / 2 - (260 * ease_in_out(prog(t, 9.4, 0.6))), p)
    phone(g, px, 640, 1.25, CYAN)
    phone(d, px, 640, 1.25, CYAN)
    # weather app inside phone
    paste_emoji(img, "🌦️", px, 560, 170)
    text_c(d, (px, 720), "??°", 90, WHITE, FONT_BLACK)
    # "no idea it's raining"
    rp = prog(t, 7.2, 0.4)
    if rp > 0 and t < 9.6:
        bob = 10 * math.sin(t * 6)
        paste_emoji(img, "🤷", px + 210, 380 + bob, 150 * back_out(rp), a=rp)
    # rain
    if t > 7.2:
        for i in range(36):
            x = (i * 97 + 31) % W
            y = ((t * 900 + i * 213) % 1100)
            d.line([(x, y), (x - 10, y + 40)], fill=alpha(CYAN, 0.35), width=4)
    # asks a server
    sp = prog(t, 9.5, 0.5)
    if sp > 0:
        sx = lerp(W + 250, W / 2 + 260, ease_out(sp))
        server(g, sx, 640, 1.0, PINK, t)
        server(d, sx, 640, 1.0, PINK, t)
        text_c(d, (sx, 880), "SERVER", 52, PINK, FONT_BLACK)
        # dotted question line
        lp = prog(t, 9.9, 0.6)
        x0, x1 = px + 150, sx - 140
        for k in range(int(14 * lp)):
            x = lerp(x0, x1, k / 13)
            g.ellipse([x - 7, 633, x + 7, 647], fill=YELLOW)
        if lp >= 1:
            pill(d, (x0 + x1) / 2, 560, "?", YELLOW, 60)


def scene_reqres(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    lx, rx, cy = 230, W - 230, 600
    phone(g, lx, cy, 1.0, CYAN)
    phone(d, lx, cy, 1.0, CYAN)
    paste_emoji(img, "🌦️", lx, cy - 30, 120)
    server(g, rx, cy, 0.85, PINK, t)
    server(d, rx, cy, 0.85, PINK, t)
    text_c(d, (lx, cy + 260), "YOUR APP", 44, CYAN, FONT_BLACK)
    text_c(d, (rx, cy + 260), "SERVER", 44, PINK, FONT_BLACK)
    # wire
    g.line([(lx + 130, cy), (rx - 130, cy)], fill=alpha(GREY, 0.5), width=6)

    # request packet (top lane) 11.4 -> 13.3
    rq = prog(t, 11.45, 1.4)
    if 0 < rq and t < 13.9:
        x = lerp(lx + 130, rx - 130, ease_in_out(rq))
        pill(g, x, cy - 110, "REQUEST →", CYAN, 40)
        pill(d, x, cy - 110, "REQUEST →", CYAN, 40)
    if rq > 0.15:
            text_c(d, (W / 2, 330), "GET /weather?city=london", 44, CYAN, FONT_MONO)
    # response packet (bottom lane) 13.9 -> 15.3
    rs = prog(t, 13.95, 1.3)
    if 0 < rs and t < 15.9:
        x = lerp(rx - 130, lx + 130, ease_in_out(rs))
        pill(g, x, cy + 110, "← RESPONSE", PINK, 40)
        pill(d, x, cy + 110, "← RESPONSE", PINK, 40)
    if rs > 0.15:
            text_c(d, (W / 2, 1000), '{ "temp": 12, "rain": true }', 44, PINK, FONT_MONO)
    if rs >= 1:
            text_c(d, (lx, cy + 60), "12°", 64, WHITE, FONT_BLACK)
    # the messenger in between -> API
    ap = prog(t, 17.5, 0.35)
    mp = prog(t, 15.9, 0.5)
    if mp > 0:
        hl = 0.5 + 0.5 * math.sin(t * 8)
        rrect(g, [W / 2 - 120, cy - 70, W / 2 + 120, cy + 70], 30, outline=alpha(YELLOW, 0.6 + 0.4 * hl), width=8)
        if ap <= 0:
            text_c(d, (W / 2, cy), "???", 60, YELLOW, FONT_BLACK)
    if ap > 0:
        sc = back_out(ap)
        rrect(g, [W / 2 - 150 * sc, cy - 90 * sc, W / 2 + 150 * sc, cy + 90 * sc], 34, fill=YELLOW)
        rrect(d, [W / 2 - 150 * sc, cy - 90 * sc, W / 2 + 150 * sc, cy + 90 * sc], 34, fill=YELLOW)
        text_c(d, (W / 2, cy), "API", int(110 * sc) + 1, (10, 10, 20), FONT_BLACK)
        text_c(d, (W / 2, 220), "THE MESSENGER", 70, YELLOW, FONT_BLACK)


def scene_restaurant(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    title_p = ease_out(prog(t, 19.45, 0.4)) * (1 - prog(t, 25.6, 0.25) + prog(t, 27.3, 0.3))
    text_c(d, (W / 2, 230 - 40 * (1 - title_p)), "THE RESTAURANT", 78, alpha(WHITE, title_p), FONT_BLACK)
    paste_emoji(img, "🍽️", W / 2, 360, 110 * title_p + 1, a=title_p)
    cols = [  # (x, emoji, label, sub, color, appear time)
        (190, "🧑", "YOU", "= the app", CYAN, 20.68),
        (540, "🤵", "WAITER", "= the API", YELLOW, 23.36),
        (890, "👨‍🍳", "KITCHEN", "= the server", PINK, 21.74),
    ]
    cy = 680
    for x, ch, lab, sub, col, at in cols:
        p = prog(t, at, 0.45)
        if p <= 0:
            continue
        sc = back_out(p)
        rrect(g, [x - 150, cy - 170, x + 150, cy + 210], 36, outline=alpha(col, p), width=7)
        rrect(d, [x - 150, cy - 170, x + 150, cy + 210], 36, fill=alpha((18, 22, 44), 0.9 * p),
              outline=alpha(col, p), width=5)
        paste_emoji(img, ch, x, cy - 40, 170 * sc)
        text_c(d, (x, cy + 105), lab, 46, alpha(col, p), FONT_BLACK)
        text_c(d, (x, cy + 160), sub, 34, alpha(WHITE, p), FONT_SB)
    # "you never walk into the kitchen": arc from you -> kitchen with red X
    np_ = prog(t, 25.75, 0.6)
    if np_ > 0 and t < 27.36:
        steps = int(30 * np_)
        pts = [(lerp(190, 890, k / 30), 500 - 120 * math.sin(math.pi * k / 30)) for k in range(steps + 1)]
        if len(pts) > 1:
            d.line(pts, fill=alpha(RED, 0.9), width=10)
        if np_ >= 1:
            xs = back_out(prog(t, 26.3, 0.3))
            s = 80 * xs
            g.line([(540 - s, 380 - s), (540 + s, 380 + s)], fill=RED, width=26)
            g.line([(540 - s, 380 + s), (540 + s, 380 - s)], fill=RED, width=26)
            d.line([(540 - s, 380 - s), (540 + s, 380 + s)], fill=RED, width=18)
            d.line([(540 - s, 380 + s), (540 + s, 380 - s)], fill=RED, width=18)
    # "you just order from the menu": menu flies you -> waiter -> kitchen, food comes back
    mp = prog(t, 27.36, 1.4)
    if mp > 0:
        x = lerp(190, 890, ease_in_out(clamp(mp * 1.6)))
        paste_emoji(img, "📜", x, 950, 100)
        text_c(d, (W / 2, 1040), "MENU = DOCUMENTATION", 44, YELLOW, FONT_BLACK)
        fp = prog(t, 28.3, 0.7)
        if fp > 0:
            x2 = lerp(890, 190, ease_in_out(fp))
            paste_emoji(img, "🍝", x2, 470, 100)


def scene_examples(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    items = [  # (start, api_stamp_time, emoji, title, color)
        (29.07, 30.36, "🔐", "LOG IN WITH GOOGLE", CYAN),
        (31.52, 32.68, "💳", "PAY ONLINE", LIME),
        (33.74, 35.50, "🚗", "RIDE ON A MAP", YELLOW),
        (36.80, 38.78, "🤖", "AI CHATBOTS", PINK),
    ]
    cur = None
    for it in items:
        if t >= it[0] - 0.1:
            cur = it
    if cur is None:
        return
    st, at, ch, title, col = cur
    p = prog(t, st - 0.1, 0.35)
    xoff = (1 - ease_out(p)) * W
    # card
    cx = W / 2 + xoff
    rrect(d, [cx - 400, 300, cx + 400, 1000], 60, fill=(20, 24, 50, 235), outline=col + (255,), width=8)
    paste_emoji(img, ch, cx, 560, 280 * back_out(p) + 1)
    text_c(d, (cx, 830), title, 64, WHITE, FONT_BLACK)
    # mini UI flourish per card
    if ch == "🚗":
        for k in range(8):
            yy = 420 + k * 50
            d.line([(cx - 330, yy), (cx + 330, yy)], fill=alpha(GREY, 0.10), width=2)
        tpos = prog(t, st, 2.0)
        paste_emoji(img, "📍", cx - 300 + 600 * tpos, 420, 60)
    stamp_api(img, cx + 170, 400, prog(t, at, 0.5), col, "API")
    # counter of examples top
    idx = items.index(cur) + 1
    text_c(d, (W / 2, 200), f"EVERYDAY APIs  {idx}/4", 46, alpha(GREY, 0.9), FONT_BLACK)


def scene_status(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    # shake when 500 hits
    shake = 0
    if t > 45.91:
        k = 1 - prog(t, 45.91, 0.9)
        shake = 18 * k * math.sin(t * 70)
    ox = shake
    # terminal window
    p = ease_out(prog(t, 40.1, 0.4))
    top = 260 + 60 * (1 - p)
    rrect(d, [80 + ox, top, W - 80 + ox, top + 820], 40, fill=(12, 14, 30, int(245 * p)),
          outline=alpha(GREY, 0.6 * p), width=4)
    for i, c in enumerate([RED, YELLOW, LIME]):
        d.ellipse([130 + i * 50 + ox, top + 40, 160 + i * 50 + ox, top + 70], fill=alpha(c, p))
    text_c(d, (W / 2 + ox, top + 55), "status codes", 36, alpha(GREY, p), FONT_MONO)
    text_c(d, (W / 2 + ox, top + 150), "WHEN THINGS GO WRONG", 52, alpha(WHITE, p), FONT_BLACK)
    rows = [
        (42.02, "200", "OK", LIME, "👍"),
        (43.68, "404", "NOT FOUND", YELLOW, "🔍"),
        (45.91, "500", "SERVER ERROR", RED, "🔥"),
    ]
    for i, (at, code, msg, col, ch) in enumerate(rows):
        rp = prog(t, at, 0.4)
        if rp <= 0:
            continue
        y = top + 290 + i * 190
        x = 140 + ox + (1 - ease_out(rp)) * -300
        a = rp
        text_c(g, (x, y), code, 120, alpha(col, a), FONT_MONO, anchor="lm")
        text_c(d, (x, y), code, 120, alpha(col, a), FONT_MONO, anchor="lm")
        text_c(d, (x + 300, y), msg, 50, alpha(WHITE, a), FONT_BLACK, anchor="lm")
        paste_emoji(img, ch, W - 170 + ox, y, 100 * back_out(rp), a=a)
    # fire overlay for 500
    fp = prog(t, 46.6, 0.4)
    if fp > 0:
        for k in range(7):
            fx = 140 + k * 135 + ox
            fy = 1130 - 20 * math.sin(t * 10 + k)
            paste_emoji(img, "🔥", fx, fy, 120 * back_out(fp))
        text_c(d, (W / 2 + ox, 1250 - 1000), "", 10, WHITE)


def scene_scale(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    p = prog(t, 48.8, 0.4)
    # left: 2 people
    text_c(d, (W / 2, 210), "2 PEOPLE + APIs", 70, alpha(CYAN, p), FONT_BLACK)
    paste_emoji(img, "🧑‍💻", W / 2 - 90, 380, 160 * back_out(p) + 1)
    paste_emoji(img, "👩‍💻", W / 2 + 90, 380, 160 * back_out(p) + 1)
    text_c(d, (W / 2, 520), "=", 90, alpha(WHITE, p), FONT_BLACK)
    # grid of 1000 dots fills up
    fp = prog(t, 50.3, 2.8)
    n = int(1000 * ease_in_out(fp))
    cols, size, gap = 40, 14, 22
    x0 = W / 2 - cols * gap / 2 + gap / 2
    y0 = 600
    for i in range(n):
        r, c = divmod(i, cols)
        x, y = x0 + c * gap, y0 + r * gap
        g.ellipse([x - size / 2, y - size / 2, x + size / 2, y + size / 2], fill=PINK)
    text_c(d, (W / 2, 1200 - 40), f"{n:,} ENGINEERS", 70, alpha(PINK, p), FONT_BLACK)


def scene_cta(img, gl, t):
    d = ImageDraw.Draw(img, "RGBA")
    g = ImageDraw.Draw(gl, "RGBA")
    p = prog(t, 54.6, 0.4)
    sc = back_out(p)
    beat = 1 + 0.05 * max(0, math.sin(t * 2 * math.pi * 1.0)) ** 8
    w, h = 560 * sc * beat, 170 * sc * beat
    cy = 520
    rrect(g, [W / 2 - w / 2, cy - h / 2, W / 2 + w / 2, cy + h / 2], h / 2, fill=PINK)
    rrect(d, [W / 2 - w / 2, cy - h / 2, W / 2 + w / 2, cy + h / 2], h / 2, fill=PINK)
    text_c(d, (W / 2, cy), "FOLLOW", int(92 * sc * beat) + 1, WHITE, FONT_BLACK)
    # tapping finger
    tp = prog(t, 55.4, 0.4)
    if tp > 0:
        tap = 14 * max(0, math.sin(t * 2 * math.pi))
        paste_emoji(img, "👆", W / 2 + 200, cy + 150 + tap, 150 * back_out(tp))
    np_ = prog(t, 56.0, 0.5)
    if np_ > 0:
        text_c(d, (W / 2, 800), "NEXT VIDEO:", 50, alpha(GREY, np_), FONT_BLACK)
        text_c(g, (W / 2, 880), "BUILD YOUR OWN API", 74, alpha(YELLOW, np_), FONT_BLACK)
        text_c(d, (W / 2, 880), "BUILD YOUR OWN API", 74, alpha(YELLOW, np_), FONT_BLACK)
        text_c(d, (W / 2 - 40, 970), "IN 60 SECONDS", 60, alpha(WHITE, np_), FONT_BLACK)
        paste_emoji(img, "⏱️", W / 2 + 250, 968, 70, a=np_)


SCENES = [  # (start, end, fn, accent)
    (0.0, 5.55, scene_hook, CYAN),
    (5.55, 11.3, scene_weather, CYAN),
    (11.3, 19.3, scene_reqres, YELLOW),
    (19.3, 29.0, scene_restaurant, YELLOW),
    (29.0, 40.0, scene_examples, LIME),
    (40.0, 48.7, scene_status, RED),
    (48.7, 54.5, scene_scale, PINK),
    (54.5, DURATION + 1, scene_cta, PINK),
]
CUTS = [s[0] for s in SCENES[1:]]


# ---------- captions ----------
def draw_captions(img, t):
    cap = None
    for c in CAPTIONS:
        if c["start"] - 0.05 <= t < c["end"]:
            cap = c
    if cap is None:
        return
    d = ImageDraw.Draw(img, "RGBA")
    words = cap["words"]
    size = 92
    f = font(FONT_BLACK, size)
    space = d.textlength(" ", font=f)
    # wrap into lines of max width
    maxw = W - 140
    lines, line, lw = [], [], 0
    for wd in words:
        ww = d.textlength(wd["text"], font=f)
        if line and lw + space + ww > maxw:
            lines.append((line, lw))
            line, lw = [], 0
        lw = lw + (space if line else 0) + ww
        line.append((wd, ww))
    if line:
        lines.append((line, lw))
    lh = size * 1.18
    y = 1440 - (len(lines) - 1) * lh / 2
    pop = back_out(prog(t, cap["start"] - 0.05, 0.18))
    for ln, lw in lines:
        x = W / 2 - lw / 2
        for wd, ww in ln:
            active = wd["start"] <= t < wd["end"]
            said = t >= wd["start"]
            col = YELLOW if active else (WHITE if said else (210, 210, 225))
            if wd.get("hi") and said:
                col = wd["hi"]
            s = size
            if active:
                s = int(size * (1.0 + 0.12 * (1 - prog(t, wd["start"], 0.15))))
            s = int(s * (0.85 + 0.15 * pop))
            ff = font(FONT_BLACK, s)
            d.text((x + ww / 2, y), wd["text"], font=ff, fill=col, anchor="mm",
                   stroke_width=10, stroke_fill=(0, 0, 0))
            x += ww + space
        y += lh


def draw_hud(img, t):
    d = ImageDraw.Draw(img, "RGBA")
    # retention progress bar
    p = clamp(t / DURATION)
    d.rectangle([0, 0, W, 12], fill=(255, 255, 255, 40))
    d.rectangle([0, 0, W * p, 12], fill=YELLOW + (255,))
    # flash on cuts
    for c in CUTS:
        fp = (t - c) / 0.18
        if 0 <= fp < 1:
            d.rectangle([0, 0, W, H], fill=(255, 255, 255, int(110 * (1 - fp))))


def render_frame(i):
    t = i / FPS
    scene = SCENES[0]
    for s in SCENES:
        if s[0] <= t < s[1]:
            scene = s
    img = Image.new("RGBA", (W, H))
    draw_background(img, t, scene[3])
    stage = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    scene[2](stage, gl, t)
    # punch-in zoom at each cut
    zoom = 1.0
    since = t - scene[0]
    if since < 0.35 and scene[0] > 0:
        zoom = 1.0 + 0.08 * (1 - ease_out(since / 0.35))
    zoom *= 1.0 + 0.012 * math.sin(t * 0.8)  # slow breathing
    if abs(zoom - 1) > 1e-3:
        def zoomed(layer):
            zw, zh = int(W * zoom), int(H * zoom)
            z = layer.resize((zw, zh), Image.BILINEAR)
            l, tp = (zw - W) // 2, int((zh - H) * 0.32)
            return z.crop((l, tp, l + W, tp + H))
        stage, gl = zoomed(stage), zoomed(gl)
    glow(img, gl, radius=26)
    img.alpha_composite(stage)
    draw_captions(img, t)
    draw_hud(img, t)
    return img.convert("RGB").tobytes()


def main():
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 2 and sys.argv[1] == "--still":
        for ts in sys.argv[2:]:
            t = float(ts)
            buf = render_frame(int(round(t * FPS)))
            Image.frombytes("RGB", (W, H), buf).save(os.path.join(OUT, f"still_{t:05.2f}.png"))
        return
    n = int(math.ceil(DURATION * FPS))
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
        os.path.join(OUT, "frames.mp4")], stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for k, buf in enumerate(pool.imap(render_frame, range(n), chunksize=4)):
            ff.stdin.write(buf)
            if k % 150 == 0:
                print(f"frame {k}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("done", n, "frames")


if __name__ == "__main__":
    main()
