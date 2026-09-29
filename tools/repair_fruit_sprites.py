#!/usr/bin/env python3
"""Repara os sprites das maçãs (entrega de ajustes de 2026-09-28).

Contexto: os originais aprovados de art-source/ (gitignorados) não estão mais
disponíveis; os únicos artefatos são os preparados em game/assets/ui/. Este
script transforma esses preparados em place:

  macas     limpa o fundo violeta residual (crescimento de região a partir das
            bordas pela cor de fundo estimada), restaura pixels de arte que a
            limpeza anterior apagou (alfa 0 com RGB de arte), mede o CORPO de
            cada maçã (erosão + maior componente) e normaliza todos para o
            mesmo tamanho de corpo, ampliando o quadro final para 960x960 (3x).

Uso:
  python3 tools/repair_fruit_sprites.py macas [--dir DIR]

--dir DIR opera em outra pasta (padrão: game/assets/ui) — usado nos testes
visuais antes de gravar o resultado final.
"""
import argparse
import collections
import colorsys
import os
import sys

from PIL import Image, ImageFilter

MACAS = ["planicie", "floresta", "pantano", "deserto", "outono", "gelo", "palida"]
CANVAS = 960          # quadro final das maçãs (3x dos 320 atuais)
MINF_BODY = 9         # erosão para isolar o corpo (mata trigo/broto/goteiras)
MINF_BODY_PANTANO = 13  # pântano: goteiras de veneno mais grossas
BODY_MARGIN = 8       # desfaz a erosão na estimativa do diâmetro

# ------------------------------------------------------------------ cor ----
def dist(c1, c2):
    return sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])) ** .5


def hsv_of(rgb):
    return colorsys.rgb_to_hsv(*(v / 255 for v in rgb[:3]))


def violet_bg_like(rgb):
    """Fundo violeta: matiz roxo-azulado, escuro, com saturação visível."""
    r, g, b = rgb[:3]
    h, s, v = hsv_of((r, g, b))
    deg = h * 360
    return 225 <= deg <= 345 and s >= .08 and v <= .35


def flood_clear(img, bg_est, tol=34):
    """Alfa=0 em tudo que é cor de fundo e toca a moldura (crescimento de região)."""
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q = collections.deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        if a == 0 or (dist((r, g, b), bg_est) <= tol and violet_bg_like((r, g, b))):
            px[x, y] = (r, g, b, 0)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    q.append((nx, ny))


def clear_bg_pockets(img, bg_est, tol=34):
    """Remove bolsões de fundo PRESOS entre detalhes da arte (a inundação a
    partir da borda não os alcança). Só a cor de fundo pura: qualquer sombra
    de arte distante de bg_est sobrevive."""
    w, h = img.size
    px = img.load()
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and dist((r, g, b), bg_est) <= tol and violet_bg_like((r, g, b)):
                px[x, y] = (r, g, b, 0)
                n += 1
    return n


def estimate_bg(img):
    """Cor de fundo dominante: mediana dos violetas escuros da imagem."""
    px = img.load()
    w, h = img.size
    acc = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if violet_bg_like((r, g, b)):
                acc.append((r, g, b))
    if len(acc) < 50:
        return None
    acc.sort()
    return acc[len(acc) // 2]


def restore_erased(img, bg_est, tol=70):
    """Restaura arte apagada: alfa≈0 com RGB de arte (não-fundo) encostado em arte.

    Criterio conservador para nao virar ruido: so fragmentos claros/acromaticos
    (metal, fumaca, neve) bem longe da cor de fundo, e precisam tocar um pixel
    com alfa alto (fazem parte da arte, nao poeira solta no fundo)."""
    w, h = img.size
    px = img.load()
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a >= 8 or not (r | g | b):
                continue
            h_, s_, v_ = hsv_of((r, g, b))
            achro = s_ < .18 and v_ > .25
            if not achro:
                continue
            touch = False
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] >= 96:
                        touch = True
                        break
                if touch:
                    break
            if touch:
                px[x, y] = (r, g, b, 255)
                n += 1
    return n


def largest_component(mask, w, h):
    lab = [[0] * w for _ in range(h)]
    best = None
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0][x0] and not lab[y0][x0]:
                q = collections.deque([(x0, y0)])
                lab[y0][x0] = 1
                minx = maxx = x0
                miny = maxy = y0
                n = 0
                while q:
                    x, y = q.popleft()
                    n += 1
                    minx = min(minx, x); maxx = max(maxx, x)
                    miny = min(miny, y); maxy = max(maxy, y)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not lab[ny][nx]:
                            lab[ny][nx] = 1
                            q.append((nx, ny))
                if best is None or n > best[0]:
                    best = (n, minx, miny, maxx, maxy)
    return best


def body_diameter(img):
    """Diâmetro do corpo da maçã: maior varredura horizontal do núcleo erodido.

    Broto, goteira de veneno, fumaça e trigo são estruturas FINAS: somem na
    erosão ou não formam a varredura larga da esfera do fruto."""
    a = img.getchannel("A")
    k = MINF_BODY if img.size[0] <= 320 else MINF_BODY * 3
    er = a.filter(ImageFilter.MinFilter(k))
    er = er.point(lambda v: 255 if v > 128 else 0)
    w, h = er.size
    mask = [[er.getpixel((x, y)) > 0 for x in range(w)] for y in range(h)]
    best = largest_component(mask, w, h)
    if not best:
        return None
    _, miny, _, _, maxy = (best[0], best[2], best[1], best[4], best[3])
    miny, maxy = best[2], best[4]
    # varredura REAL (sem erosão) na faixa vertical do corpo
    wide = 0
    op = a.point(lambda v: 255 if v > 200 else 0)
    for y in range(miny, maxy + 1):
        run = 0
        for x in range(w + 1):
            if x < w and op.getpixel((x, y)):
                run += 1
                wide = max(wide, run)
            else:
                run = 0
    return wide


# ---------------------------------------------------------------- maçãs ----
def clean_macas(d):
    infos = {}
    for name in MACAS:
        path = os.path.join(d, "maca_%s.png" % name)
        img = Image.open(path).convert("RGBA")
        bg = estimate_bg(img)
        if bg:
            flood_clear(img, bg)
            clear_bg_pockets(img, bg)
            restored = restore_erased(img, bg)
        else:
            restored = restore_erased(img, (0, 0, 0))
        dia = body_diameter(img)
        content = img.getchannel("A").point(lambda v: 255 if v > 8 else 0)
        bbox = content.getbbox()
        cdim = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
        infos[name] = (img, dia, restored, bbox, cdim)
        print("  maca_%-9s fundo=%s corpo≈%s px restaurados=%d"
              % (name, "#%02x%02x%02x" % bg if bg else "nenhum", dia, restored))
    dias = sorted(i[1] for i in infos.values() if i[1])
    target320 = dias[len(dias) // 2]  # mediana: tamanho de corpo igual para todas
    alvo = 3 * target320
    # o alvo cai ate TODA a arte caber sem cortar (fita do outono, goteiras...)
    for img, dia, _, bbox, cdim in infos.values():
        if dia and cdim:
            alvo = min(alvo, (CANVAS - 8) * dia / cdim)
    alvo = int(alvo)
    print("  corpo alvo em 960x960: %d px (3x da mediana %d, limitado pelo maior detalhe)"
          % (alvo, target320))
    for name in MACAS:
        img, dia, _, bbox, cdim = infos[name]
        if not dia:
            continue
        k = alvo / dia
        cw, ch = bbox[2] - bbox[0], bbox[3] - bbox[1]
        max_dim = max(cw, ch) * k
        if max_dim > CANVAS - 8:
            k = (CANVAS - 8) / max(cw, ch)
        sw, sh = max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k))
        scaled = img.resize((sw, sh), Image.LANCZOS)
        out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        cx = (bbox[0] + bbox[2]) / 2 * k
        cy = (bbox[1] + bbox[3]) / 2 * k
        out.alpha_composite(scaled, (round(CANVAS / 2 - cx), round(CANVAS / 2 - cy)))
        out.save(os.path.join(d, "maca_%s.png" % name), optimize=True)
        print("  maca_%-9s -> 960x960 escala=%.3f corpo final≈%d" % (name, k, dia * k))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["macas"])
    ap.add_argument("--dir", default=os.path.join("game", "assets", "ui"))
    args = ap.parse_args()
    print("macas:")
    clean_macas(args.dir)


if __name__ == "__main__":
    main()
