"""One-off: render the FRAME F brand mark to app icon / adaptive / favicon PNGs."""
from PIL import Image, ImageDraw
import numpy as np

INK = (35, 35, 51)
STOPS_T = [0.0, 0.5, 1.0]
STOPS_C = [(235, 208, 138), (197, 160, 89), (154, 123, 60)]
SPROCKETS = [19, 29, 39, 49, 59, 69]


def gold_gradient(size):
    yv, xv = np.mgrid[0:size, 0:size]
    t = (xv + yv) / (2 * (size - 1))
    r = np.interp(t, STOPS_T, [c[0] for c in STOPS_C])
    g = np.interp(t, STOPS_T, [c[1] for c in STOPS_C])
    b = np.interp(t, STOPS_T, [c[2] for c in STOPS_C])
    arr = np.dstack([r, g, b]).astype("uint8")
    return Image.fromarray(arr, "RGB")


def make_mask(size, coverage):
    """Frame-F silhouette mask (L) centred, occupying `coverage` of the canvas."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    span = size * coverage
    scale = span / 100.0
    ox = (size - span) / 2.0
    oy = (size - span) / 2.0

    def rr(x, y, w, h, r, fill):
        d.rounded_rectangle([ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale],
                            radius=max(1, r * scale), fill=fill)

    rr(20, 14, 24, 72, 3, 255)   # filmstrip stem
    rr(42, 15, 42, 16, 3, 255)   # top arm
    rr(42, 42, 30, 16, 3, 255)   # mid arm
    for yy in SPROCKETS:          # punch sprocket holes
        rr(23.5, yy, 4, 5, 1, 0)
        rr(36.5, yy, 4, 5, 1, 0)
    return mask


def save_icon(path, size, coverage, bg):
    grad = gold_gradient(size)
    mask = make_mask(size, coverage)
    if bg is None:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        img.paste(grad.convert("RGBA"), (0, 0), mask)
    else:
        img = Image.new("RGB", (size, size), bg)
        img.paste(grad, (0, 0), mask)
    img.save(path)
    print("saved", path, size, "cov", coverage, "bg", bg)


# App icon (iOS/store) — ink bg, F at 62%.
save_icon("icon.png", 1024, 0.62, INK)
# Android adaptive foreground — transparent bg, smaller (safe zone), backgroundColor set in app.json.
save_icon("adaptive-icon.png", 1024, 0.46, None)
# Favicon — ink bg, slightly larger F for tiny sizes.
save_icon("favicon.png", 256, 0.66, INK)
