#!/usr/bin/env python3
"""1280x720 thumbnail: big contrast, 3 words max, one clear visual idea."""
import os

from PIL import Image, ImageDraw, ImageFilter

import render as R

W, H = 1280, 720
img = Image.new("RGBA", (W, H))
g = Image.new("RGB", (1, H))
for y in range(H):
    g.putpixel((0, y), R.mix(R.BG_TOP, R.BG_BOT, y / H))
img.paste(g.resize((W, H)))
d = ImageDraw.Draw(img, "RGBA")
for i in range(0, W, 64):
    d.line([(i, 0), (i, H)], fill=R.mix(R.BG_TOP, R.CYAN, 0.10), width=2)
for j in range(0, H, 64):
    d.line([(0, j), (W, j)], fill=R.mix(R.BG_TOP, R.CYAN, 0.10), width=2)

gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(gl)
# phone -> API -> server
R.rrect(gd, [70, 250, 250, 590], 34, outline=R.CYAN + (255,), width=10)
R.rrect(gd, [1030, 270, 1220, 350], 16, outline=R.PINK + (255,), width=8)
R.rrect(gd, [1030, 370, 1220, 450], 16, outline=R.PINK + (255,), width=8)
R.rrect(gd, [1030, 470, 1220, 550], 16, outline=R.PINK + (255,), width=8)
gd.line([(260, 420), (1020, 420)], fill=R.YELLOW + (255,), width=10)
R.rrect(gd, [450, 320, 830, 520], 44, fill=R.YELLOW + (255,))
blur = gl.filter(ImageFilter.GaussianBlur(22))
img.alpha_composite(blur)
img.alpha_composite(blur)
img.alpha_composite(gl)
d = ImageDraw.Draw(img, "RGBA")
d.text((640, 420), "API", font=R.font(R.FONT_BLACK, 150), fill=(10, 10, 20), anchor="mm")
R.paste_emoji(img, "🌦️", 160, 420, 110)
for k, y in enumerate([310, 410, 510]):
    for j in range(3):
        d.ellipse([1180 - j * 28 - 9, y - 9, 1180 - j * 28 + 9, y + 9], fill=R.LIME)
# headline
d.text((575, 135), "EXPLAINED IN 60s", font=R.font(R.FONT_BLACK, 104), fill=R.WHITE,
       anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))
R.pill(d, 640, 640, "YOU USE 50+ A DAY", R.PINK, 54, txt=R.WHITE)
R.paste_emoji(img, "🤯", 1175, 125, 135, rot=-10)
out = os.path.join(os.path.dirname(__file__), "out", "thumbnail.png")
img.convert("RGB").save(out)
print(out)
