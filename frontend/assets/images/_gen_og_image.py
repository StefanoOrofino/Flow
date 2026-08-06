"""Generate the Open Graph / social preview image (1200x630) for FrameFlow."""
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

W, H = 1200, 630
BG = (12, 12, 14)
GOLD = (197, 160, 89)
STOPS_T = [0.0, 0.5, 1.0]
STOPS_C = [(235, 208, 138), (197, 160, 89), (154, 123, 60)]
SPROCKETS = [19, 29, 39, 49, 59, 69]
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def gold_gradient(size):
    yv, xv = np.mgrid[0:size, 0:size]
    t = (xv + yv) / (2 * (size - 1))
    r = np.interp(t, STOPS_T, [c[0] for c in STOPS_C])
    g = np.interp(t, STOPS_T, [c[1] for c in STOPS_C])
    b = np.interp(t, STOPS_T, [c[2] for c in STOPS_C])
    return Image.fromarray(np.dstack([r, g, b]).astype("uint8"), "RGB")


def frame_f_mask(size):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    s = size / 100.0

    def rr(x, y, w, h, r, fill):
        d.rounded_rectangle([x * s, y * s, (x + w) * s, (y + h) * s], radius=max(1, r * s), fill=fill)

    rr(20, 14, 24, 72, 3, 255)
    rr(42, 15, 42, 16, 3, 255)
    rr(42, 42, 30, 16, 3, 255)
    for yy in SPROCKETS:
        rr(23.5, yy, 4, 5, 1, 0)
        rr(36.5, yy, 4, 5, 1, 0)
    return m


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# subtle gold hairline border
draw.rectangle([1, 1, W - 2, H - 2], outline=(40, 34, 22), width=2)

# logo tile (ink rounded square + gradient F), centered near top
TILE = 190
tile = Image.new("RGB", (TILE, TILE), (23, 19, 16))
mask_r = Image.new("L", (TILE, TILE), 0)
ImageDraw.Draw(mask_r).rounded_rectangle([0, 0, TILE, TILE], radius=int(TILE * 0.225), fill=255)
fsz = int(TILE * 0.64)
grad = gold_gradient(fsz)
fmask = frame_f_mask(fsz)
tile.paste(grad, ((TILE - fsz) // 2, (TILE - fsz) // 2), fmask)
tile_rounded = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
tile_rounded.paste(tile, (0, 0), mask_r)
img.paste(tile_rounded, ((W - TILE) // 2, 70), tile_rounded)

title_font = ImageFont.truetype(SERIF, 82)
tag_font = ImageFont.truetype(SANS, 34)
kick_font = ImageFont.truetype(SANS_B, 24)


def center_text(y, text, font, fill, spacing=0):
    if spacing:
        total = sum(draw.textlength(ch, font=font) + spacing for ch in text) - spacing
        x = (W - total) / 2
        for ch in text:
            draw.text((x, y), ch, font=font, fill=fill)
            x += draw.textlength(ch, font=font) + spacing
    else:
        w = draw.textlength(text, font=font)
        draw.text(((W - w) / 2, y), text, font=font, fill=fill)


center_text(300, "FrameFlow Studio", title_font, (247, 245, 239))
center_text(410, "AI pre-production suite for filmmakers", tag_font, (170, 168, 160))
center_text(505, "S C R I P T   \u00b7   S T O R Y B O A R D   \u00b7   S H O T   L I S T", kick_font, GOLD, spacing=1)

os.makedirs("/app/frontend/public", exist_ok=True)
img.save("/app/frontend/public/og-image.png", quality=90)
print("saved /app/frontend/public/og-image.png", img.size)
