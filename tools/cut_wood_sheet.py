#!/usr/bin/env python3
"""Recorta as 4 peças da spritesheet de botões (chroma azul -> alfa).

Separa por COMPONENTE CONECTADO (não por quadrantes): a folha pode ter as
peças fora do centro das células. ImagemMagick faz a análise; o Pillow
recorta. Ferramenta de desenvolvimento.
"""
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art-source/botoes-madeira-v2"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/fumiga-shot/pecas")
OUT.mkdir(parents=True, exist_ok=True)
SHEET = sys.argv[2] if len(sys.argv) > 2 else "spritesheet_botoes_v2.png"


def unchroma(im):
    im = im.convert("RGB")
    w, h = im.size
    out = Image.new("RGBA", (w, h))
    src, dst = im.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if b > 90 and b > r * 1.35 and b > g * 1.35:
                a = 255 - int(min(255, (b - max(r, g)) * 2.2))
                dst[x, y] = (r, g, min(b, max(r, g)), max(0, min(255, a)))
            else:
                dst[x, y] = (r, g, b, 255)
    alpha = out.getchannel("A").point(lambda v: 0 if v < 30 else (255 if v > 226 else v))
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
    return out


sheet = unchroma(Image.open(SRC / SHEET))
sheet.save(OUT / "_sheet_alpha.png")

# componentes conectados via ImageMagick
res = subprocess.run(
    ["convert", str(OUT / "_sheet_alpha.png"), "-alpha", "extract", "-define",
     "connected-components:verbose=true", "-connected-components", "8", "null:"],
    capture_output=True, text=True)
boxes = []
import re
for line in res.stdout.splitlines():
    m = re.match(r"\s*\d+:\s*(\d+)x(\d+)\+(\d+)\+(\d+)\s+\S+\s+(\d+)\s", line)
    if not m:
        continue
    w, h, x, y, area = (int(v) for v in m.groups())
    if area > 3000:
        boxes.append((area, x, y, w, h))
sw, sh = sheet.size
boxes = [b for b in boxes if not (b[3] >= sw * 0.99 and b[4] >= sh * 0.99)]
names = {}
for area, x, y, w, h in boxes:
    right = x + w / 2 > sw / 2
    bottom = y + h / 2 > sh / 2
    name = ("cartao" if bottom else "pequena") if right else ("media" if not bottom else "pequena")
    if not right and not bottom:
        name = "grande"
    elif right and not bottom:
        name = "media"
    elif not right and bottom:
        name = "pequena"
    else:
        name = "cartao"
    names[name] = (x, y, w, h)
for name in ("grande", "media", "pequena", "cartao"):
    if name not in names:
        raise SystemExit("faltou " + name)
    x, y, w, h = names[name]
    piece = sheet.crop((x, y, x + w, y + h))
    piece.save(OUT / f"{name}.png")
    print(f"  {name}: {w}x{h}  proporcao {w/h:.3f}")

if len(boxes) > 4:
    for area, x, y, w, h in boxes[4:8]:
        print(f"  (extra) {w}x{h} @ {x},{y}")
