"""One-off: export the FRAME F brand mark as a high-resolution SOCIAL MEDIA pack.

Outputs to assets/brand/social/:
  - mark_gold_transparent_{512,1024,2048}.png  (F only, transparent bg)
  - mark_gold_dark_2048.png                     (F on cinematic ink)
  - profile_dark_1080.png / _2048.png           (square profile pic, gold glow)
  - icon_tile_1024.png                          (rounded-square app-icon style)
  - lockup_horizontal_dark_2400.png / _transparent_2400.png
  - banner_x_1500x500.png                       (X / Twitter header)
  - banner_linkedin_1584x396.png                (LinkedIn cover)
  - cover_1200x630.png                          (generic social / OG)
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
INK = (12, 12, 14)            # cinematic near-black (#0C0C0E)
INK_TILE = (26, 26, 34)       # slightly lifted tile bg
CREAM = (245, 241, 232)
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
    """Frame-F silhouette mask (L), centred, occupying `coverage` of the canvas."""
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


def render_mark(size, coverage=0.9):
    """Gold Frame-F on a transparent square canvas."""
    grad = gold_gradient(size).convert("RGBA")
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.paste(grad, (0, 0), mark_mask(size, coverage))
    return img


def glow_layer(size, cx, cy, radius, color=GOLD, alpha=120):
    g = Image.new("RGBA", (size, size) if isinstance(size, int) else size, (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (alpha,))
    return g.filter(ImageFilter.GaussianBlur(radius * 0.35))


def rounded_tile(size, radius_frac, bg):
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size, size], radius=int(size * radius_frac), fill=255)
    base = Image.new("RGBA", (size, size), bg + (255,))
    tile.paste(base, (0, 0), m)
    return tile, m


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p)
    print("saved", name, img.size)


# ---- 1. Mark only, transparent ----
for s in (512, 1024, 2048):
    save(render_mark(s, 0.9), f"mark_gold_transparent_{s}.png")

# ---- 2. Mark on ink ----
def on_ink(size, coverage, bg=INK, glow=True):
    canvas = Image.new("RGBA", (size, size), bg + (255,))
    if glow:
        canvas.alpha_composite(glow_layer(size, size // 2, size // 2, int(size * 0.42)))
    canvas.alpha_composite(render_mark(size, coverage))
    return canvas.convert("RGB")

save(on_ink(2048, 0.62), "mark_gold_dark_2048.png")

# ---- 3. Profile pics (square, safe for circular crop) ----
save(on_ink(1080, 0.52), "profile_dark_1080.png")
save(on_ink(2048, 0.52), "profile_dark_2048.png")

# ---- 4. App-icon style rounded tile ----
def icon_tile(size, radius_frac=0.225, bg=INK_TILE):
    tile, m = rounded_tile(size, radius_frac, bg)
    tile.alpha_composite(glow_layer(size, size // 2, size // 2, int(size * 0.4), alpha=90))
    tile.alpha_composite(render_mark(size, 0.6))
    # re-clip to rounded corners
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(tile, (0, 0), m)
    return out

save(icon_tile(1024), "icon_tile_1024.png")

# ---- Wordmark helper ----
def draw_wordmark(draw, x, y, h, color=CREAM):
    """Draw 'FrameFlow' (serif) + 'STUDIO' (spaced sans) starting at baseline area."""
    f_main = ImageFont.truetype(SERIF, h)
    draw.text((x, y), "FrameFlow", font=f_main, fill=color)
    w = draw.textlength("FrameFlow", font=f_main)
    f_sub = ImageFont.truetype(SANS, int(h * 0.30))
    sub = "S T U D I O"
    draw.text((x + 4, y + int(h * 1.02)), sub, font=f_sub, fill=GOLD)
    return w


# ---- 5. Horizontal lockup ----
def lockup(w, h, transparent):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0) if transparent else INK + (255,))
    if not transparent:
        img.alpha_composite(glow_layer((w, h), int(w * 0.18), h // 2, int(h * 0.55), alpha=70))
    mark_s = int(h * 0.72)
    mk = render_mark(mark_s, 0.82)
    my = (h - mark_s) // 2
    mx = int(h * 0.28)
    img.alpha_composite(mk, (mx, my))
    d = ImageDraw.Draw(img)
    txt_h = int(h * 0.34)
    tx = mx + mark_s + int(h * 0.22)
    ty = int(h * 0.30)
    draw_wordmark(d, tx, ty, txt_h, color=CREAM if not transparent else GOLD)
    return img

save(lockup(2400, 700, False), "lockup_horizontal_dark_2400.png")
save(lockup(2400, 700, True), "lockup_horizontal_transparent_2400.png")

# ---- 6. Banners / covers ----
def banner(w, h, tagline=True):
    img = Image.new("RGBA", (w, h), INK + (255,))
    # diagonal gradient wash
    wash = gold_gradient(max(w, h)).resize((w, h)).convert("RGBA")
    wash.putalpha(22)
    img.alpha_composite(wash)
    img.alpha_composite(glow_layer((w, h), int(w * 0.5), int(h * 0.42), int(h * 0.6), alpha=60))
    mark_s = int(h * 0.42)
    mk = render_mark(mark_s, 0.85)
    d = ImageDraw.Draw(img)
    # centered logo + wordmark row
    f_main = ImageFont.truetype(SERIF, int(h * 0.20))
    word = "FrameFlow Studio"
    tw = d.textlength(word, font=f_main)
    total = mark_s + int(h * 0.12) + tw
    sx = int((w - total) // 2)
    my = int(h * 0.20)
    mk_y = int((h // 2) - mark_s // 2 - (int(h * 0.06) if tagline else 0))
    img.alpha_composite(mk, (sx, mk_y))
    d.text((sx + mark_s + int(h * 0.12), (h // 2) - int(h * 0.12) - (int(h * 0.06) if tagline else 0)),
           word, font=f_main, fill=CREAM)
    if tagline:
        f_tag = ImageFont.truetype(SANS, int(h * 0.075))
        tag = "AI pre-production for filmmakers"
        d.text(((w - d.textlength(tag, font=f_tag)) // 2, int(h * 0.66)), tag, font=f_tag, fill=(197, 160, 89))
    return img.convert("RGB")

save(banner(1500, 500), "banner_x_1500x500.png")
save(banner(1584, 396), "banner_linkedin_1584x396.png")
save(banner(1200, 630), "cover_1200x630.png")

print("DONE — social logo pack generated in", OUT)
