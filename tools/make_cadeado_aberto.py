#!/usr/bin/env python3
"""Reproduz `game/assets/ui/cadeado aberto.png` a partir do cadeado fechado.

A versão aberta usa 100% da arte original do `cadeado fechado.png`: o corpo é
copiado intacto e a haste (arco + pernas) é recortada, rotacionada 90° no
sentido horário (nearest-neighbor, sem blur/jaggies) e repousada com a perna
dobradiça sobre a faixa de cobre, à direita — pose "escancarada" escolhida pelo
usuário em 2026-09-29.

Uso: python3 tools/make_cadeado_aberto.py
Só roda com Pillow disponível; é ferramenta de arte, não depende de execução.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "game/assets/ui/cadeado fechado.png"
DST = ROOT / "game/assets/ui/cadeado aberto.png"

BODY_TOP = 204  # primeira linha da faixa de cobre (topo do corpo)
CUT = 196       # acima disso tudo é haste; abaixo, só as pernas continuam
PIVOT = (360, BODY_TOP)   # dobradiça: topo da perna direita
OFFSET = (-20, 0)         # encaixe da haste rotacionada sobre a faixa


def _leg_runs(px, w, y=150):
    row = [x for x in range(w) if px[x, y][3] > 0]
    runs, start, prev = [], row[0], row[0]
    for x in row[1:]:
        if x != prev + 1:
            runs.append((start, prev))
            start = x
        prev = x
    runs.append((start, prev))
    return runs


def main():
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    runs = _leg_runs(px, w)

    shackle = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sp, bp = shackle.load(), body.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] == 0:
                continue
            if y < CUT:
                sp[x, y] = p
            elif y < BODY_TOP:
                # só as pernas; descarta a linha de outline da faixa de cobre
                if any(a - 2 <= x <= b + 2 for a, b in runs):
                    sp[x, y] = p
            else:
                bp[x, y] = p

    rot = shackle.rotate(-90, resample=Image.NEAREST, center=PIVOT, expand=True)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(body)
    out.alpha_composite(rot, OFFSET)
    out.save(DST)
    print(f"salvo {DST.relative_to(ROOT)} {out.size} {out.mode}")


if __name__ == "__main__":
    main()
