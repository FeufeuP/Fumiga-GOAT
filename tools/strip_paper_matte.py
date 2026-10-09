#!/usr/bin/env python3
"""Remove the flat cream matte around the HUD paintings, keeping only the art.

The paper HUD paintings were authored on an opaque cream sheet. Everything that
touches the image border and stays within tolerance of that sheet colour is
background: it is flood filled away and the remaining boundary pixels are
un-matted (the cream is divided out of the antialiased edge) so the frames do
not keep a pale halo when drawn over the world.

The interior of a frame is never touched: the flood fill only reaches pixels
connected to the border, so the paper surface a panel needs for its text stays
opaque. Pillow is an authoring dependency, never a runtime dependency.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import hashlib
import json
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# Pieces that carry a cream matte. The ember icon is art on a sheet too.
TARGETS = [
    'game/assets/ui/paper/panel.png',
    'game/assets/ui/paper/button.png',
    'game/assets/ui/paper/card.png',
    'game/assets/ui/paper/banner.png',
    'game/assets/ui/paper/health.png',
    'game/assets/ui/paper/minimap.png',
    'game/assets/ui/paper/pause.png',
    'game/assets/ui/paper/tooltip.png',
    'game/assets/sprites/icons/ember.png',
]

# Colour distance (euclidean, 0..441) at which a pixel stops being matte.
SOLID = 96.0   # fully opaque art
CLEAR = 58.0   # fully transparent matte (absorbs the painted drop shadow)


def border_colour(px, w, h):
    """Median-ish matte colour sampled from the four borders."""
    samples = []
    for x in range(w):
        samples.append(px[x, 0])
        samples.append(px[x, h - 1])
    for y in range(h):
        samples.append(px[0, y])
        samples.append(px[w - 1, y])
    samples.sort(key=lambda c: c[0] + c[1] + c[2])
    return samples[len(samples) // 2][:3]


def strip(path: Path) -> dict:
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    px = img.load()
    br, bg_, bb = border_colour(px, w, h)

    def dist(c):
        dr, dg, db = c[0] - br, c[1] - bg_, c[2] - bb
        return (dr * dr + dg * dg + db * db) ** .5

    # Flood fill the matte from the border. Only pixels connected to the edge
    # become transparent, so enclosed paper interiors are preserved.
    outside = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not outside[y * w + x] and dist(px[x, y]) < SOLID:
                outside[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not outside[y * w + x] and dist(px[x, y]) < SOLID:
                outside[y * w + x] = 1
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not outside[ny * w + nx]:
                if dist(px[nx, ny]) < SOLID:
                    outside[ny * w + nx] = 1
                    queue.append((nx, ny))

    cleared = 0
    feathered = 0
    span = SOLID - CLEAR
    for y in range(h):
        row = y * w
        for x in range(w):
            if not outside[row + x]:
                continue
            r, g, b, a = px[x, y]
            d = dist((r, g, b))
            if d <= CLEAR:
                px[x, y] = (r, g, b, 0)
                cleared += 1
                continue
            alpha = (d - CLEAR) / span
            alpha = max(0.0, min(1.0, alpha))
            # Un-matte: recover the real colour behind the cream blend.
            ur = (r - br * (1 - alpha)) / alpha
            ug = (g - bg_ * (1 - alpha)) / alpha
            ub = (b - bb * (1 - alpha)) / alpha
            px[x, y] = (
                int(max(0, min(255, round(ur)))),
                int(max(0, min(255, round(ug)))),
                int(max(0, min(255, round(ub)))),
                int(round(alpha * 255)),
            )
            feathered += 1

    img.save(path, optimize=True)
    data = path.read_bytes()
    return {
        'path': str(path.relative_to(ROOT)),
        'size': [w, h],
        'matte': [br, bg_, bb],
        'cleared_px': cleared,
        'feathered_px': feathered,
        'transparent_ratio': round(cleared / (w * h), 4),
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'mode': 'RGBA',
    }


def main(argv):
    targets = argv[1:] or TARGETS
    report = [strip(ROOT / t) for t in targets]
    out = ROOT / 'docs/arte/hud-sem-fundo.json'
    out.write_text(json.dumps(
        {'date': '2026-10-09',
         'scope': 'matte removal only: flood filled cream background, art and '
                  'enclosed paper interiors untouched',
         'solid_threshold': SOLID, 'clear_threshold': CLEAR,
         'pieces': report}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(sys.argv)
