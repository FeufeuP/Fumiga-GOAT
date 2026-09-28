#!/usr/bin/env python3
"""Repara os sprites de maçãs e correntes (entrega de ajustes de 2026-09-28).

Contexto: os originais aprovados de art-source/ (gitignorados) não estão mais
disponíveis; os únicos artefatos são os preparados em game/assets/ui/. Este
script transforma esses preparados em place:

  macas     limpa o fundo violeta residual (crescimento de região a partir das
            bordas pela cor de fundo estimada), restaura pixels de arte que a
            limpeza anterior apagou (alfa 0 com RGB de arte), mede o CORPO de
            cada maçã (erosão + maior componente) e normaliza todos para o
            mesmo tamanho de corpo, ampliando o quadro final para 960x960 (3x).

  correntes reconstrói os três sprites de corrente/cadeado, que estavam
            fragmentados (elos viraram ruído semitransparente), em pixel art
            sólida com a paleta cobre/âmbar já usada no jogo:
              correntes_deserto  cadeado padrão (todos os frutos bloqueados)
              correntes_cadeados variante bronze (aposentada no desenho)
              correntes_tranca   selo da Pálida: corrente com três cadeados

Uso:
  python3 tools/repair_fruit_sprites.py all [--dir DIR]
  python3 tools/repair_fruit_sprites.py macas [--dir DIR]
  python3 tools/repair_fruit_sprites.py correntes [--dir DIR]

--dir DIR opera em outra pasta (padrão: game/assets/ui) — usado nos testes
visuais antes de gravar o resultado final.
"""
import argparse
import collections
import colorsys
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

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


# ------------------------------------------------------------- correntes ---
class RDraw:
    """Envolve ImageDraw arredondando coordenadas (PIL moderno exige int)."""

    def __init__(self, base):
        self._d = base

    def __getattr__(self, name):
        fn = getattr(self._d, name)

        def wrap(*args, **kw):
            args = [self._c(a) for a in args]
            kw = {k: (self._c(v) if k in ("width", "radius") else v) for k, v in kw.items()}
            return fn(*args, **kw)
        return wrap

    @staticmethod
    def _c(a):
        if isinstance(a, (list, tuple)):
            return [RDraw._c(x) for x in a]
        if isinstance(a, float):
            return int(round(a))
        return a


PALETTES = {
    # cobre/âmbar quente do deserto — o padrão de todos os frutos bloqueados
    "deserto": dict(base="#c9782c", light="#f0b45c", shine="#ffd98f",
                    dark="#5c2410", edge="#3c1608", gem="#7fd4c8", gem2="#c8f0e8"),
    # bronze aposentado (mesma família quente, mais acinzentado)
    "cadeados": dict(base="#a87848", light="#d8b078", shine="#f0d8a0",
                     dark="#4c2c14", edge="#2e1a0c", gem="#e8a03c", gem2="#ffd479"),
    # selo da Pálida: bronze escuro com luz roxa pálida
    "tranca": dict(base="#8c6038", light="#c09048", shine="#e8c888",
                   dark="#301818", edge="#1e0e0e", gem="#b9a0d8", gem2="#e0d0f0"),
}


def ring(dr, cx, cy, rx, ry, bar, pal):
    """Elo de corrente: anel oval com furo e brilho no topo."""
    bar = max(3, int(bar))
    dr.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=pal["base"])
    dr.ellipse([cx - rx + bar, cy - ry + bar, cx + rx - bar, cy + ry - bar], fill=(0, 0, 0, 0))
    dr.arc([cx - rx, cy - ry, cx + rx, cy + ry], 180, 360, fill=pal["light"], width=bar)
    dr.arc([cx - rx, cy - ry, cx + rx, cy + ry], 0, 180, fill=pal["dark"], width=bar)


def chain_band(dr, y, x0, x1, s, pal):
    """Corrente horizontal: elos alternados (em pé / deitado) sobre a linha y."""
    pitch = 40 * s
    x = x0
    i = 0
    while x <= x1:
        if i % 2 == 0:
            ring(dr, x, y, 17 * s, 26 * s, 8 * s, pal)      # em pé
        else:
            ring(dr, x, y, 26 * s, 17 * s, 8 * s, pal)      # deitado
        x += pitch
        i += 1


def padlock(dr, cx, cy, s, pal):
    """Cadeado fechado: arco encaixa no corpo, fechadura e cristal."""
    bw, bh = 116 * s, 96 * s
    top = cy - bh / 2
    bar = 16 * s
    # arco: pernas descem DENTRO do corpo (sem vão)
    dr.arc([cx - 46 * s, top - 84 * s, cx + 46 * s, top + 108 * s], 180, 360,
           fill=pal["dark"], width=int(bar))
    dr.arc([cx - 46 * s, top - 84 * s, cx + 46 * s, top + 108 * s], 195, 345,
           fill=pal["light"], width=int(bar * .45))
    # corpo
    dr.rounded_rectangle([cx - bw / 2, top, cx + bw / 2, top + bh], radius=14 * s,
                         fill=pal["base"])
    dr.rounded_rectangle([cx - bw / 2, top, cx + bw / 2, top + bh], radius=14 * s,
                         outline=pal["edge"], width=max(2, int(5 * s)))
    # brilho do topo
    dr.rounded_rectangle([cx - bw / 2 + 12 * s, top + 10 * s,
                          cx + bw / 2 - 12 * s, top + 30 * s], radius=8 * s,
                         fill=pal["light"])
    # fechadura
    kx, ky = cx, top + bh * .46
    dr.ellipse([kx - 13 * s, ky - 16 * s, kx + 13 * s, ky + 10 * s], fill=pal["dark"])
    dr.polygon([(kx - 6 * s, ky), (kx + 6 * s, ky),
                (kx + 9 * s, ky + 30 * s), (kx - 9 * s, ky + 30 * s)], fill=pal["dark"])
    dr.ellipse([kx - 5 * s, ky - 9 * s, kx + 5 * s, ky + 1 * s], fill=pal["gem"])
    # cristal do tema no canto superior direito do corpo
    gx, gy, gs = cx + bw / 2 - 22 * s, top + 22 * s, 11 * s
    dr.polygon([(gx, gy - gs), (gx + gs * .75, gy), (gx, gy + gs), (gx - gs * .75, gy)],
               fill=pal["gem"])
    dr.line([(gx, gy - gs), (gx + gs * .75, gy)], fill=pal["gem2"], width=max(1, int(2 * s)))


def draw_lock_sprite(kind, size, out_path, style):
    pal = PALETTES[kind]
    img = Image.new("RGBA", (size * 4, size * 4), (0, 0, 0, 0))
    dr = RDraw(ImageDraw.Draw(img))
    s = size / 320 * 4  # supersampling 4x sobre o desenho-base de 320
    if style == "lock":
        # cadeado central com a corrente passando por trás
        chain_band(dr, 190 * s, -24 * s, 344 * s, s, pal)
        padlock(dr, 160 * s, 186 * s, 1.0 * s, pal)
    else:
        # selo da Pálida: corrente de ponta a ponta, três cadeados pendurados nela
        chain_band(dr, 120 * s, -30 * s, 350 * s, s, pal)
        for cx in (55, 160, 265):
            padlock(dr, cx * s, 200 * s, .62 * s, pal)
    out = img.resize((size, size), Image.LANCZOS)
    out.save(out_path, optimize=True)


def clean_correntes(d):
    draw_lock_sprite("deserto", 320, os.path.join(d, "correntes_deserto.png"), "lock")
    print("  correntes_deserto.png  -> 320x320 (cadeado padrao, cobre/ambar)")
    draw_lock_sprite("cadeados", 320, os.path.join(d, "correntes_cadeados.png"), "lock")
    print("  correntes_cadeados.png -> 320x320 (bronze, aposentado no desenho)")
    draw_lock_sprite("tranca", 512, os.path.join(d, "correntes_tranca.png"), "bar")
    print("  correntes_tranca.png   -> 512x512 (selo da Palida, tres cadeados)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["all", "macas", "correntes"])
    ap.add_argument("--dir", default=os.path.join("game", "assets", "ui"))
    args = ap.parse_args()
    if args.cmd in ("all", "macas"):
        print("macas:")
        clean_macas(args.dir)
    if args.cmd in ("all", "correntes"):
        print("correntes:")
        clean_correntes(args.dir)


if __name__ == "__main__":
    main()
