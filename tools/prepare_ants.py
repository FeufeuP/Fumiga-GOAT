#!/usr/bin/env python3
# ==============================================================================
# FUMIGA-GOAT — pipeline de sprites das FORMIGAS
#
# As artes-fonte (formigas/gen-*.png, ~700px de altura) são pixel art de alta
# resolução com bordas suavizadas. O pipeline antigo jogava tudo para 22-44 px
# com "-filter point": a redução por amostragem crua descartava pixels inteiros
# e a arte saía picotada, com franjas claras nas bordas — era por isso que as
# formigas pareciam manchas na tela.
#
# Aqui cada sprite passa por:
#   1. RECORTE pelo alpha (sem moldura transparente sobrando);
#   2. REDUÇÃO encadeada BOX -> LANCZOS em alpha PRÉ-MULTIPLICADO (sem halo
#      claro: a cor não "puxa" o RGB do fundo transparente) com gama no alpha
#      para preservar o miolo sólido;
#   3. LIMPEZA DA FRANJA: os pixels de borda escurecem rumo a um marrom escuro,
#      matando o serrilhado claro herdado do antialias da fonte;
#   4. REALCE (cor/contraste/brilho) para a formiga se destacar do chão escuro;
#   5. CONTORNO de 1px quase-preto + LUZ de topo âmbar (volume).
#
# As classes derivadas (coletora jade, batedora turquesa, curandeira alva,
# bombeira em brasa) nascem da operária/soldado com matiz/saturação em HSV —
# o "-modulate" do ImageMagick estourava as cores claras.
#
# Uso:  python3 tools/prepare_ants.py            (grava game/assets/sprites/ants)
#       python3 tools/prepare_ants.py --preview  (folha de contato em /tmp)
# Requer: Pillow + numpy
# ==============================================================================
import os
import sys
import math
import colorsys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "formigas")
OUT = os.path.join(ROOT, "game", "assets", "sprites", "ants")

# --------------------------------------------------------------- intensidade --
OUTLINE_DARK = (12, 7, 16)      # contorno
FRINGE_DARK = (26, 14, 22)      # cor que substitui a franja clara
RIM = (255, 219, 158)           # luz de topo (ombro superior-esquerdo)
EDGE_GAMMA = 0.80               # <1 engrossa o miolo sólido
FRINGE_POW = 1.5                # curva de escurecimento da borda

# ------------------------------------------------------------- tabela da arte -
# nome de saída -> (arquivo fonte, altura final em px)
ANTS = {
    "worker":    ("gen-4d3ea505-a3ec-4de8-b7a9-dbd72d194464.png", 38),
    "soldier":   ("gen-1e856e81-6689-4fac-ad52-cc38b9d8e3c7.png", 56),
    "spitter":   ("gen-31f4c985-4828-4f6b-b3ba-0a62d916e42f.png", 50),
    "tank":      ("gen-474c2946-54af-4f66-8840-84bac5714930.png", 64),
    "queen":     ("gen-70743d19-eeb2-4027-b93a-8c3ec1f599a7.png", 152),
    "e_runner":  ("gen-f0b8f676-2347-4149-8649-a865599db323.png", 36),
    "e_swarm":   ("gen-6a5cd3cd-5ec4-4ce8-be03-1292d3529de8.png", 42),
    "e_warrior": ("gen-56160a10-922e-4c41-b97e-781930b8ecdc.png", 56),
    "e_spitter": ("gen-56df2381-ab9e-4c70-b7de-5beef7e37bd2.png", 54),
    "e_reaper":  ("gen-78c7edb1-d4b6-4343-a2e9-834e7a8bd66c.png", 52),
    "e_matron":  ("gen-686ee82a-5469-4aa3-86c7-37a4cf797843.png", 86),
    "e_sentinel":("gen-1573e56b-2049-49a6-b04d-571d2167ba4c.png", 68),
}

# tintas das classes derivadas: (matiz em voltas, saturação, valor)
TINTS = {
    "gatherer": dict(hue=0.44, sat=0.80, val=1.06),   # jade
    "scout":    dict(hue=0.54, sat=1.05, val=1.12),   # turquesa veloz
    "healer":   dict(hue=0.02, sat=0.18, val=1.55),   # alva
    "bomber":   dict(hue=-0.05, sat=1.45, val=1.08),  # brasa
}


# ------------------------------------------------------------------ helpers --
def trim_alpha(im, pad=2):
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    return im.crop((max(0, x0 - pad), max(0, y0 - pad),
                    min(im.width, x1 + pad), min(im.height, y1 + pad)))


def _split(im):
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255.0
    return a[..., :3] * al, al  # cor pré-multiplicada, alpha 0..1


def _join(rgb_pre, alpha):
    al = np.clip(alpha, 0, 1)
    rgb = np.where(al > 1e-4, rgb_pre / np.maximum(al, 1e-4), 0.0)
    out = np.concatenate([np.clip(rgb, 0, 255), al * 255.0], axis=2)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def resize_premul(im, out_h, gamma=EDGE_GAMMA):
    """Reduz preservando a cor: BOX em cadeia + LANCZOS, tudo pré-multiplicado."""
    w, h = im.size
    tw = max(1, round(w * out_h / h))
    pre, al = _split(im)
    work = _join(pre, al)
    while work.height > out_h * 2:
        nh = max(1, work.height // 2)
        work = work.resize((max(1, round(work.width * nh / work.height)), nh), Image.BOX)
    work = work.resize((tw, out_h), Image.LANCZOS)
    pre, al = _split(work)
    # gama no alpha (engrossa o miolo sólido) mantendo a cor: a cor
    # pré-multiplicada acompanha a variação do alpha.
    new_al = np.power(al, gamma)
    scale = np.where(al > 1e-6, new_al / np.maximum(al, 1e-6), 0.0)
    return _join(pre * scale, new_al)


def clean_fringe(im, dark=FRINGE_DARK, power=FRINGE_POW):
    """Escurece a franja clara das bordas (antialias da arte-fonte)."""
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255.0
    t = np.power(np.clip(1.0 - al, 0, 1), power)   # 0 no miolo, 1 na borda
    col = a[..., :3]
    d = np.array(dark, dtype=np.float32)
    col = col * (1 - t * 0.95) + d * (t * 0.95)
    out = np.concatenate([col, a[..., 3:4]], axis=2)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def hsv_tint(im, hue=0.0, sat=1.0, val=1.0):
    """Tinge mantendo o sombreado (a matiz dá a volta em 1.0)."""
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # matiz
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hh = np.zeros_like(mx)
    d = np.maximum(mx - mn, 1e-6)
    m1 = (mx == r); m2 = (mx == g) & ~m1; m3 = ~m1 & ~m2
    hh[m1] = ((g - b)[m1] / d[m1]) % 6
    hh[m2] = ((b - r)[m2] / d[m2]) + 2
    hh[m3] = ((r - g)[m3] / d[m3]) + 4
    hh = (hh / 6 + hue) % 1.0
    s = np.clip(s * sat, 0, 1)
    v = np.clip(v * val, 0, 1)
    # volta para RGB
    i = np.floor(hh * 6).astype(np.int32) % 6
    f = hh * 6 - np.floor(hh * 6)
    p = v * (1 - s); q = v * (1 - s * f); tt = v * (1 - s * (1 - f))
    out = np.zeros_like(rgb)
    for idx, (rr, gg, bb) in enumerate([(v, tt, p), (q, v, p), (p, v, tt),
                                        (p, q, v), (tt, p, v), (v, p, q)]):
        m = i == idx
        out[..., 0][m] = rr[m]; out[..., 1][m] = gg[m]; out[..., 2][m] = bb[m]
    out = np.where((al > 0)[..., None], out, 0)
    res = np.concatenate([out * 255.0, al[..., None] * 255.0], axis=2)
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), "RGBA")


def boost(im, color=1.16, contrast=1.12, bright=1.06):
    al = im.getchannel("A")
    rgb = ImageEnhance.Brightness(
        ImageEnhance.Contrast(
            ImageEnhance.Color(im.convert("RGB")).enhance(color)
        ).enhance(contrast)
    ).enhance(bright).convert("RGBA")
    rgb.putalpha(al)
    return rgb


def outline(im, dark=OUTLINE_DARK, rim=RIM, rim_alpha=0.42, thickness=1):
    """Contorno escuro de 1px + luz de topo (leitura em qualquer fundo)."""
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3] / 255.0
    h, w = al.shape
    pad = thickness
    # padding evita que o deslocamento "dê a volta" (np.roll) e suje as bordas
    p = np.pad(al, pad, mode="constant")
    solid = p > 0.30
    grown = np.zeros_like(solid)
    for dy in range(-thickness, thickness + 1):
        for dx in range(-thickness, thickness + 1):
            if dx * dx + dy * dy > thickness * thickness + 0.1:
                continue
            grown |= np.roll(np.roll(solid, dy, axis=0), dx, axis=1)
    ring = grown & ~solid
    # luz de topo: só a parte de cima-esquerda do contorno
    lit = ring & ~(np.roll(solid, 1, axis=0) & np.roll(solid, 1, axis=1))
    if pad:
        ring = ring[pad:-pad, pad:-pad]
        lit = lit[pad:-pad, pad:-pad]
    canvas = np.zeros((h, w, 4), dtype=np.float32)
    canvas[..., :3] = np.array(dark, dtype=np.float32)
    canvas[..., 3] = np.where(ring, 235.0, 0.0)
    rim_col = np.array(rim, dtype=np.float32)
    sel = ring & lit
    canvas[..., 0][sel] = canvas[..., 0][sel] * (1 - rim_alpha) + rim_col[0] * rim_alpha
    canvas[..., 1][sel] = canvas[..., 1][sel] * (1 - rim_alpha) + rim_col[1] * rim_alpha
    canvas[..., 2][sel] = canvas[..., 2][sel] * (1 - rim_alpha) + rim_col[2] * rim_alpha
    under = Image.fromarray(canvas.astype(np.uint8), "RGBA")
    return Image.alpha_composite(under, im)


def build(src_name, out_h, tint=None, outline_on=True):
    im = Image.open(os.path.join(SRC, src_name)).convert("RGBA")
    im = trim_alpha(im)
    im = resize_premul(im, out_h)
    im = clean_fringe(im)
    if tint:
        im = hsv_tint(im, **tint)
    im = boost(im)
    if outline_on:
        im = outline(im)
    return im


# ------------------------------------------------------------------- driver --
def main():
    preview = "--preview" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    made = []

    for name, (src, h) in ANTS.items():
        img = build(src, h)
        img.save(os.path.join(OUT, name + ".png"))
        made.append((name, img))
        print("  ant  %-11s %-8s %dx%d" % (name, src[4:12], img.width, img.height))

    for name, base, h, tint in [
        ("gatherer", "worker", 38, TINTS["gatherer"]),
        ("scout", "worker", 40, TINTS["scout"]),
        ("healer", "worker", 42, TINTS["healer"]),
        ("bomber", "soldier", 58, TINTS["bomber"]),
    ]:
        img = build(ANTS[base][0], h, tint)
        img.save(os.path.join(OUT, name + ".png"))
        made.append((name, img))
        print("  ant  %-11s (tinta de %s)" % (name, base))

    if preview:
        cell = 230
        cols = 6
        rows = math.ceil(len(made) / cols)
        sheet = Image.new("RGBA", (cols * cell, rows * cell), (24, 17, 32, 255))
        for i, (name, img) in enumerate(made):
            scale = min(3.0, (cell - 40) / img.height)
            big = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.NEAREST)
            sheet.alpha_composite(big, ((i % cols) * cell + (cell - big.width) // 2,
                                        (i // cols) * cell + (cell - big.height) // 2))
        dest = "/tmp/ants-preview.png"
        sheet.save(dest)
        print("  folha de contato:", dest)
    print("  %d sprites gravados" % len(made))


if __name__ == "__main__":
    main()
