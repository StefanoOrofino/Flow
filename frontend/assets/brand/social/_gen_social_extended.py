"""One-off: EXTENDED brand pack — light backgrounds, monochrome, vertical lockup,
Instagram post/story. Reuses the Frame-F geometry. Outputs to this folder."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
INK = (12, 12, 14)
CREAM = (247, 245, 239)
INK_TEXT = (35, 35, 51)
GOLD = (197, 160, 89)
STOPS_T = [0.0, 0.5, 1.0]
STOPS_C = [(235, 208, 138), (197, 160, 89), (154, 123, 60)]
SPROCKETS = [19, 29, 39, 49, 59, 69]
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def gold_gradient(size):
    yv, xv = np.mgrid[0:size, 0:size]
    t = (xv + yv) / (2 * (size - 1))
    r = np.interp(t, STOPS_T, [c[0] for c in STOPS_C])
    g = np.interp(t, STOPS_T, [c[1] for c in STOPS_C])
    b = np.interp(t, STOPS_T, [c[2] for c in STOPS_C])
    return Image.fromarray(np.dstack([r, g, b]).astype("uint8"), "RGB")


def mark_mask(size, coverage=0.9):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    span = size * coverage
    scale = span / 100.0
    ox = (size - span) / 2.0
    oy = (size - span) / 2.0

    def rr(x, y, w, h, r, fill):
        d.rounded_rectangle([ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale],
                            radius=max(1, r * scale), fill=fill)
    rr(20, 14, 24, 72, 3, 255)
    rr(42, 15, 42, 16, 3, 255)
    rr(42, 42, 30, 16, 3, 255)
    for yy in SPROCKETS:
        rr(23.5, yy, 4, 5, 1, 0)
        rr(36.5, yy, 4, 5, 1, 0)
    return mask


def render_mark(size, coverage=0.9, solid=None):
    fill = Image.new("RGB", (size, size), solid) if solid else gold_gradient(size)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.paste(fill.convert("RGB"), (0, 0), mark_mask(size, coverage))
    return img


def glow(sz, cx, cy, radius, color=GOLD, alpha=110):
    g = Image.new("RGBA", sz, (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (alpha,))
    return g.filter(ImageFilter.GaussianBlur(radius * 0.35))


def save(img, name):
    img.convert("RGBA").save(os.path.join(OUT, name)) if name.endswith(".png") and img.mode == "RGBA" else img.save(os.path.join(OUT, name))
    print("saved", name, img.size)


# ---- Monochrome flat marks (transparent) ----
save(render_mark(1024, 0.9, solid=GOLD), "mark_flat_gold_1024.png")
save(render_mark(1024, 0.9, solid=(255, 255, 255)), "mark_white_1024.png")
save(render_mark(1024, 0.9, solid=INK_TEXT), "mark_ink_1024.png")

# ---- Mark on cream (light) ----
def on_bg(size, coverage, bg, solid=None, glw=False, gcol=GOLD):
    c = Image.new("RGBA", (size, size), bg + (255,))
    if glw:
        c.alpha_composite(glow((size, size), size // 2, size // 2, int(size * 0.42), color=gcol, alpha=90))
    c.alpha_composite(render_mark(size, coverage, solid=solid))
    return c.convert("RGB")

save(on_bg(2048, 0.6, CREAM), "mark_gold_cream_2048.png")
save(on_bg(1080, 0.52, CREAM), "profile_light_1080.png")


def wordmark(draw, x, y, h, main_color, gold=GOLD):
    fm = ImageFont.truetype(SERIF, h)
    draw.text((x, y), "FrameFlow", font=fm, fill=main_color)
    fs = ImageFont.truetype(SANS, int(h * 0.30))
    draw.text((x + 4, y + int(h * 1.02)), "S T U D I O", font=fs, fill=gold)


# ---- Horizontal lockup on cream ----
def lockup_h(w, h, bg, main_color):
    img = Image.new("RGBA", (w, h), bg + (255,))
    ms = int(h * 0.72)
    img.alpha_composite(render_mark(ms, 0.82), (int(h * 0.28), (h - ms) // 2))
    wordmark(ImageDraw.Draw(img), int(h * 0.28) + ms + int(h * 0.22), int(h * 0.30), int(h * 0.34), main_color)
    return img.convert("RGB")

save(lockup_h(2400, 700, CREAM, INK_TEXT), "lockup_horizontal_light_2400.png")


# ---- Vertical lockup (mark above wordmark), dark + light ----
def lockup_v(size, bg, main_color, glw=False):
    img = Image.new("RGBA", (size, size), bg + (255,))
    if glw:
        img.alpha_composite(glow((size, size), size // 2, int(size * 0.38), int(size * 0.34), alpha=80))
    ms = int(size * 0.42)
    img.alpha_composite(render_mark(ms, 0.85), ((size - ms) // 2, int(size * 0.16)))
    d = ImageDraw.Draw(img)
    fm = ImageFont.truetype(SERIF, int(size * 0.14))
    word = "FrameFlow"
    d.text(((size - d.textlength(word, font=fm)) // 2, int(size * 0.64)), word, font=fm, fill=main_color)
    fs = ImageFont.truetype(SANS, int(size * 0.05))
    sub = "S T U D I O"
    d.text(((size - d.textlength(sub, font=fs)) // 2, int(size * 0.80)), sub, font=fs, fill=GOLD)
    return img.convert("RGB")

save(lockup_v(1600, INK, CREAM, glw=True), "lockup_vertical_dark_1600.png")
save(lockup_v(1600, CREAM, INK_TEXT), "lockup_vertical_light_1600.png")


# ---- Instagram square post 1080 (dark + light) ----
def ig_post(bg, main_color, glw):
    size = 1080
    img = Image.new("RGBA", (size, size), bg + (255,))
    if glw:
        img.alpha_composite(glow((size, size), size // 2, int(size * 0.40), int(size * 0.36), alpha=80))
    ms = int(size * 0.34)
    img.alpha_composite(render_mark(ms, 0.85), ((size - ms) // 2, int(size * 0.20)))
    d = ImageDraw.Draw(img)
    fm = ImageFont.truetype(SERIF, int(size * 0.115))
    word = "FrameFlow Studio"
    d.text(((size - d.textlength(word, font=fm)) // 2, int(size * 0.60)), word, font=fm, fill=main_color)
    ft = ImageFont.truetype(SANS, int(size * 0.042))
    tag = "AI pre-production for filmmakers"
    d.text(((size - d.textlength(tag, font=ft)) // 2, int(size * 0.74)), tag, font=ft, fill=GOLD)
    return img.convert("RGB")

save(ig_post(INK, CREAM, True), "instagram_post_dark_1080.png")
save(ig_post(CREAM, INK_TEXT, False), "instagram_post_light_1080.png")


# ---- Instagram / TikTok story 1080x1920 (dark) ----
def ig_story():
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), INK + (255,))
    wash = gold_gradient(max(w, h)).resize((w, h)).convert("RGBA"); wash.putalpha(16)
    img.alpha_composite(wash)
    img.alpha_composite(glow((w, h), w // 2, int(h * 0.40), int(w * 0.45), alpha=70))
    ms = int(w * 0.42)
    img.alpha_composite(render_mark(ms, 0.85), ((w - ms) // 2, int(h * 0.30)))
    d = ImageDraw.Draw(img)
    fm = ImageFont.truetype(SERIF, int(w * 0.11))
    word = "FrameFlow"
    d.text(((w - d.textlength(word, font=fm)) // 2, int(h * 0.56)), word, font=fm, fill=CREAM)
    fs = ImageFont.truetype(SANS, int(w * 0.045))
    d.text(((w - d.textlength("S T U D I O", font=fs)) // 2, int(h * 0.65)), "S T U D I O", font=fs, fill=GOLD)
    ft = ImageFont.truetype(SANS, int(w * 0.038))
    tag = "AI pre-production for filmmakers"
    d.text(((w - d.textlength(tag, font=ft)) // 2, int(h * 0.72)), tag, font=ft, fill=(200, 195, 185))
    return img.convert("RGB")

save(ig_story(), "instagram_story_dark_1080x1920.png")

print("DONE — extended brand pack in", OUT)
