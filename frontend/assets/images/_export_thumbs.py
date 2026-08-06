"""Export ready-to-use app icon thumbnails (PNG) to public/brand/."""
import os
from PIL import Image, ImageDraw
import numpy as np

INK = (35, 35, 51)
STOPS_T = [0.0, 0.5, 1.0]
STOPS_C = [(235, 208, 138), (197, 160, 89), (154, 123, 60)]
SPROCKETS = [19, 29, 39, 49, 59, 69]
OUT = "/app/frontend/public/brand"


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


def icon(size, coverage=0.62, bg=INK, rounded=False):
    fsz = int(size * coverage)
    grad = gold_gradient(fsz)
    fmask = frame_f_mask(fsz)
    off = (size - fsz) // 2
    if bg is None:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        img.paste(grad.convert("RGBA"), (off, off), fmask)
    else:
        img = Image.new("RGB", (size, size), bg).convert("RGBA")
        img.paste(grad.convert("RGBA"), (off, off), fmask)
    if rounded and bg is not None:
        m = Image.new("L", (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size, size], radius=int(size * 0.225), fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), m)
        return out
    return img


os.makedirs(OUT, exist_ok=True)
exports = {
    "frameflow-icon-1024.png": icon(1024, 0.62, INK),               # store icon (square, ink bg)
    "frameflow-icon-512.png": icon(512, 0.62, INK),
    "frameflow-icon-rounded-1024.png": icon(1024, 0.62, INK, rounded=True),  # pre-rounded preview
    "frameflow-icon-transparent-1024.png": icon(1024, 0.62, None),  # gold F, transparent bg
    "frameflow-mark-gold-1024.png": icon(1024, 0.82, None),         # tighter mark only
    "frameflow-favicon-256.png": icon(256, 0.66, INK),
}
for name, im in exports.items():
    im.save(os.path.join(OUT, name))
    print("saved", name, im.size, im.mode)
