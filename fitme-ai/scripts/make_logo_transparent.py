"""One-off asset cleanup: strip the solid black background from the brand logo
and replace it with real transparency, then trim empty margins, so the logo
blends on any themed (light/dark) surface.

Source: public/brand/logo-original.png (raw export on an opaque black canvas).
Output: public/brand/logo.png (transparent, trimmed).

Pipeline:
1. Edge flood-fill the near-black background connected to the image border.
2. De-fringe: fade dark, near-neutral anti-aliased edge pixels so there is no
   black halo on light backgrounds.
3. Trim transparent margins.

Usage: py scripts/make_logo_transparent.py
"""

from collections import deque
from pathlib import Path

from PIL import Image

BRAND = Path(__file__).resolve().parent.parent / "public" / "brand"
SRC = BRAND / "logo-original.png"
OUT = BRAND / "logo.png"

BG_MAX = 44          # a pixel is background if its brightest channel <= this
FRINGE_MAX = 110     # edge pixels darker than this get faded
FRINGE_SAT = 60      # ...only when near-neutral (low saturation)


def is_background(px) -> bool:
    return max(px[0], px[1], px[2]) <= BG_MAX


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = bytearray(w * h)
    q = deque()

    def consider(x: int, y: int) -> None:
        i = y * w + x
        if visited[i]:
            return
        visited[i] = 1
        if is_background(px[x, y]):
            q.append((x, y))

    for x in range(w):
        consider(x, 0)
        consider(x, h - 1)
    for y in range(h):
        consider(0, y)
        consider(w - 1, y)

    removed = 0
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        removed += 1
        if x > 0:
            consider(x - 1, y)
        if x < w - 1:
            consider(x + 1, y)
        if y > 0:
            consider(x, y - 1)
        if y < h - 1:
            consider(x, y + 1)

    # De-fringe: fade dark near-neutral pixels touching transparency.
    for _ in range(2):
        edits = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                touches_bg = (
                    (x > 0 and px[x - 1, y][3] == 0)
                    or (x < w - 1 and px[x + 1, y][3] == 0)
                    or (y > 0 and px[x, y - 1][3] == 0)
                    or (y < h - 1 and px[x, y + 1][3] == 0)
                )
                if not touches_bg:
                    continue
                brightest = max(r, g, b)
                sat = brightest - min(r, g, b)
                if brightest <= FRINGE_MAX and sat <= FRINGE_SAT:
                    na = max(0, min(255, int(255 * brightest / FRINGE_MAX)))
                    if na < a:
                        edits.append((x, y, r, g, b, na))
        for x, y, r, g, b, na in edits:
            px[x, y] = (r, g, b, na)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    img.save(OUT)
    print(f"removed {removed} bg px; cropped to {img.size}")


if __name__ == "__main__":
    main()
