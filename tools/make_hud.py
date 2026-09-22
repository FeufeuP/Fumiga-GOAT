#!/usr/bin/env python3
# ============================================================================
# FUMIGA — gerador dos SPRITESHEETS do HUD LORE (FASE 1 da Mega Atualização)
#
# Gera, em game/assets/sprites/hud/, as folhas de sprite que o HUD orgânico usa:
#   hud_panels.png   6 peles de painel (quitina/cera), 9-slice de 12px por bioma
#   hud_gaster.png   8 tiras do gaster da Rainha Silenciosa (6 biomas + vazio + ferido)
#   hud_crown.png    4 quadros da coroa de fungo/seda da Silenciosa
#   hud_icons.png    12 colunas x 2 linhas de 14px: comidas, cristais, marcas e anéis
#   hud_ant.png      2 tamanhos x 4 quadros da irmã que anda na trilha de feromônio
#
# Estilo: pixel art de contorno duro (mesma leitura dos sprites do jogo),
# paleta violeta/âmbar do FUMIGA, nada de traço humanoide (Regra 8).
# Sem dependências: escreve PNG RGBA na mão (zlib + struct). Uso:
#   python3 tools/make_hud.py
# ============================================================================
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "game", "assets", "sprites", "hud")

# ------------------------------------------------------------------ paleta ---
OUTLINE = (13, 10, 22, 255)          # mesmo contorno duro dos sprites do jogo
INK = (26, 20, 48, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

# pele de cada bioma: (base clara, base média, base escura, acento, brilho)
BIOMES = [
    ("planicie", (58, 78, 50), (48, 66, 42), (36, 52, 32), (127, 214, 160), (255, 212, 121)),
    ("floresta", (44, 68, 52), (36, 56, 42), (28, 44, 34), (109, 183, 255), (191, 255, 168)),
    ("pantano",  (44, 66, 66), (33, 48, 49), (26, 39, 40), (55, 230, 200), (127, 214, 255)),
    ("deserto",  (86, 68, 46), (74, 58, 40), (58, 46, 31), (255, 179, 71), (255, 212, 121)),
    ("outono",   (76, 58, 42), (61, 47, 34), (48, 37, 28), (255, 154, 92), (255, 212, 121)),
    ("gelo",     (74, 84, 106), (58, 66, 84), (46, 53, 68), (232, 244, 255), (127, 214, 255)),
]

# gaster por bioma: (corpo claro, corpo médio, corpo escuro, veia)
GASTER = [
    ("planicie", (255, 212, 121), (255, 179, 71), (196, 122, 40), (127, 214, 160)),
    ("floresta", (224, 200, 255), (143, 111, 214), (86, 66, 140), (109, 183, 255)),
    ("pantano",  (176, 255, 240), (55, 230, 200), (28, 138, 122), (127, 214, 255)),
    ("deserto",  (255, 212, 121), (255, 179, 71), (176, 106, 34), (255, 212, 121)),
    ("outono",   (255, 200, 150), (255, 154, 92), (168, 82, 40), (255, 212, 121)),
    ("gelo",     (240, 250, 255), (200, 230, 255), (122, 160, 200), (127, 214, 255)),
]
GASTER_EMPTY = (34, 26, 52)
GASTER_HURT = ((255, 122, 106), (255, 77, 90), (163, 46, 58), (42, 10, 18))

# cristais de essência (pólen de memória) por bioma
ESSENCE = [
    ("planicie", (255, 212, 121), (255, 247, 220)),
    ("floresta", (199, 125, 255), (240, 224, 255)),
    ("pantano",  (127, 214, 255), (224, 248, 255)),
    ("deserto",  (255, 154, 92), (255, 226, 190)),
    ("outono",   (255, 212, 121), (255, 240, 200)),
    ("gelo",     (232, 244, 255), (255, 255, 255)),
]

# ------------------------------------------------------------------- canvas ---
class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = bytearray(w * h * 4)

    def set(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            if len(c) == 3:
                c = (c[0], c[1], c[2], 255)
            i = (y * self.w + x) * 4
            self.px[i:i + 4] = bytes(c)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 4
            return tuple(self.px[i:i + 4])
        return CLEAR

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.set(xx, yy, c)

    def hline(self, y, x0, x1, c):
        for x in range(int(x0), int(x1) + 1):
            self.set(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(int(y0), int(y1) + 1):
            self.set(x, y, c)

    def ell(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                dx = (x - cx) / max(0.5, rx)
                dy = (y - cy) / max(0.5, ry)
                if dx * dx + dy * dy <= 1.0:
                    self.set(x, y, c)

    def shade_band(self, y0, y1, x0, x1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                p = self.get(x, y)
                if p[3] > 0:
                    self.set(x, y, c)

    def outline(self, color=OUTLINE, diagonals=True):
        """Contorno duro de 1px em volta da silhueta (como no assado dos sprites)."""
        dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        if diagonals:
            dirs += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        marks = []
        for y in range(self.h):
            for x in range(self.w):
                if self.get(x, y)[3] != 0:
                    continue
                for dx, dy in dirs:
                    if self.get(x + dx, y + dy)[3] > 0:
                        marks.append((x, y))
                        break
        for x, y in marks:
            self.set(x, y, color)

    def blit(self, src, ox, oy):
        for y in range(src.h):
            for x in range(src.w):
                p = src.get(x, y)
                if p[3] > 0:
                    self.set(ox + x, oy + y, p)

    def clip(self, x, y, w, h):
        """Recorta uma sub-imagem (para montar folhas)."""
        out = Cv(w, h)
        for yy in range(h):
            for xx in range(w):
                out.set(xx, yy, self.get(x + xx, y + yy))
        return out


def write_png(path, cv):
    raw = bytearray()
    for y in range(cv.h):
        raw.append(0)
        raw.extend(cv.px[y * cv.w * 4:(y + 1) * cv.w * 4])
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", cv.w, cv.h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("  %-34s %dx%d  %d KB" % (os.path.basename(path), cv.w, cv.h, len(png) // 1024))


# ------------------------------------------------------------ painel 9-slice --
SLICE = 12


def panel_peel(biome):
    """Peça 9-slice 36x36 da quitina/cera de um bioma (fatias de 12px).

    As nove fatias são preenchidas: a cutícula usa coordenadas absolutas com
    período 6 (divide 12), então as fatias emendam sem costura em qualquer
    tamanho de painel.
    """
    light, mid, dark, accent, hi = biome[1], biome[2], biome[3], biome[4], biome[5]
    N = SLICE * 3
    cv = Cv(N, N)

    # 1. casca cheia (quitina base)
    cv.rect(0, 0, N, N, mid)

    # 2. cutícula de inseto: placas em losango, contínuas entre as fatias
    for y in range(4, N - 4):
        for x in range(4, N - 4):
            on = ((x + y) % 6 < 3) and ((x - y) % 6 < 3)
            if not on:
                cv.set(x, y, darker(mid))

    # 3. cantos chanfrados de 3px
    for i in range(3):
        for j in range(3 - i):
            cv.set(i, j, CLEAR)
            cv.set(N - 1 - i, j, CLEAR)
            cv.set(i, N - 1 - j, CLEAR)
            cv.set(N - 1 - i, N - 1 - j, CLEAR)

    # 4. rim: luz de cera em cima/à esquerda, sombra embaixo/à direita
    for x in range(3, N - 3):
        cv.set(x, 2, inkify(light))
        cv.set(x, 3, light)
        cv.set(x, N - 4, darker(dark))
        cv.set(x, N - 3, darker(dark))
    for y in range(3, N - 3):
        cv.set(2, y, inkify(light))
        cv.set(3, y, light)
        cv.set(N - 4, y, darker(dark))
        cv.set(N - 3, y, darker(dark))

    # 5. brilho de cera: pixels de acento no canto de luz
    cv.set(5, 4, hi)
    cv.set(6, 4, accent)
    cv.set(4, 5, accent)

    cv.outline(OUTLINE)
    return cv


def inkify(c):
    return (int(c[0] * 0.72), int(c[1] * 0.72), int(c[2] * 0.72), 255)


def lighter(c, k=0.18):
    return (min(255, int(c[0] + 255 * k)), min(255, int(c[1] + 255 * k)),
            min(255, int(c[2] + 255 * k)), 255)


def darker(c, k=0.82):
    return (int(c[0] * k), int(c[1] * k), int(c[2] * k), 255)


def make_panels():
    sheet = Cv(SLICE * 3, SLICE * 3 * len(BIOMES))
    for i, biome in enumerate(BIOMES):
        sheet.blit(panel_peel(biome), 0, i * SLICE * 3)
    write_png(os.path.join(OUT, "hud_panels.png"), sheet)


# -------------------------------------------------------------------- gaster --
GA_W, GA_H = 64, 16


def gaster_strip(fill, empty=False, hurt=None):
    """Tira do gaster 64x16: casco vazio, gaster cheio ou gaster ferido."""
    cv = Cv(GA_W, GA_H)
    cx, cy = GA_W / 2 - 0.5, GA_H / 2 - 0.5
    rx, ry = GA_W / 2 - 1.5, GA_H / 2 - 1.5
    if empty:
        cv.ell(cx, cy, rx, ry, (34, 26, 52, 255))
        cv.shade_band(2, 4, 0, GA_W, (44, 34, 64, 255))
        cv.shade_band(GA_H - 4, GA_H - 3, 0, GA_W, (22, 16, 36, 255))
        cv.outline(OUTLINE)
        return cv
    light, mid, dark, vein = hurt or fill
    cv.ell(cx, cy, rx, ry, dark)
    cv.ell(cx - 1, cy + 0.5, rx - 3, ry - 1.5, mid)
    cv.ell(cx - 2, cy - 0.5, rx - 7, ry - 3.0, light)
    cv.shade_band(3, 4, 4, GA_W - 5, (255, 255, 255, 70))       # brilho de seiva
    cv.shade_band(GA_H - 3, GA_H - 3, 6, GA_W - 7, inkify(dark))
    # veias correndo pelo gaster
    for vx in (14, 30, 46):
        for y in range(4, GA_H - 3):
            cv.set(vx + (1 if (y // 3) % 2 else 0), y, vein)
    # encaixe da coroa (o istmo por onde a coroa de fungo se prende)
    cv.rect(GA_W // 2 - 2, 0, 4, 2, inkify(dark))
    cv.outline(OUTLINE)
    return cv


def make_gaster():
    sheet = Cv(GA_W, GA_H * (len(GASTER) + 2))
    for i, g in enumerate(GASTER):
        sheet.blit(gaster_strip((g[1], g[2], g[3], g[4])), 0, i * GA_H)
    sheet.blit(gaster_strip(None, empty=True), 0, len(GASTER) * GA_H)
    sheet.blit(gaster_strip(None, hurt=GASTER_HURT), 0, (len(GASTER) + 1) * GA_H)
    write_png(os.path.join(OUT, "hud_gaster.png"), sheet)


# --------------------------------------------------------------------- coroa --
CR_W, CR_H = 26, 12


def crown_frame(frame):
    """Coroa da Rainha Silenciosa: 3 picos de fungo + fio de seda da Tecelã."""
    cv = Cv(CR_W, CR_H)
    cap_h = (9, 7, 6, 8)[frame]              # o chapéu do fungo respira
    glow = (255, 212, 121, 255) if frame % 2 == 0 else (255, 236, 186, 255)
    stem = (222, 214, 200, 255)
    cap = (255, 196, 96, 255)
    cap_hi = glow
    for i, cx in enumerate((5, 13, 21)):
        top = 2 + abs(i - 1)
        stem_w = 1 if i != 1 else 2
        for y in range(top + 2, CR_H - 1):
            cv.rect(cx, y, stem_w, 1, stem)
        r = 3 if i != 1 else 4
        cv.ell(cx, top + 1, r, max(1, r - 1), cap)
        cv.ell(cx - 1, top, r - 1, max(1, r - 2), cap_hi)
        if i == 1:
            cv.set(cx, top - 1, glow)
            cv.set(cx + 1, top - 1, glow)
    # fio de seda ligando os três picos (a Tecelã costura a coroa)
    for x in range(6, 21):
        y = 4 + (1 if x % 5 == 0 else 0)
        if cv.get(x, y)[3] == 0:
            cv.set(x, y, (245, 245, 255, 200))
    cv.outline(OUTLINE)
    return cv


def make_crown():
    sheet = Cv(CR_W * 4, CR_H)
    for f in range(4):
        sheet.blit(crown_frame(f), f * CR_W, 0)
    write_png(os.path.join(OUT, "hud_crown.png"), sheet)


# ------------------------------------------------------------------- ícones ----
IC = 14
ICONS_ROW0 = ["trevo", "cogumelo", "alga", "semente", "outono", "gelo"] + [e[0] for e in ESSENCE]
ICONS_ROW1 = ["anel", "anel_seiva", "marca_comida", "marca_perigo", "quitina",
              "dither", "mel", "seda", "esporo", "coroa_fungo", "formiga", "estrela"]

FOOD_BY_KIND = {
    "trevo": ((78, 122, 66), (191, 255, 168), (63, 122, 60)),
    "cogumelo": ((143, 111, 214), (224, 200, 255), (201, 188, 232)),
    "alga": ((47, 122, 106), (127, 240, 216), (28, 74, 68)),
    "semente": ((216, 164, 74), (255, 230, 168), (122, 98, 42)),
    "outono": ((224, 136, 56), (255, 212, 121), (110, 64, 34)),
    "gelo": ((159, 196, 232), (232, 244, 255), (74, 84, 112)),
}


def icon_trevo(cv):
    m, l, d = FOOD_BY_KIND["trevo"]
    for cx, cy in ((4, 4), (9, 4), (6, 7), (4, 9), (9, 9)):
        cv.ell(cx, cy, 2, 2, m)
        cv.set(cx - 1, cy - 1, l)
    cv.vline(6, 8, 12, d)
    cv.ell(6, 12, 2, 1, (58, 92, 52, 255))


def icon_cogumelo(cv):
    m, l, s = FOOD_BY_KIND["cogumelo"]
    cv.ell(6, 5, 4, 3, m)
    cv.ell(5, 4, 3, 2, l)
    cv.rect(5, 7, 2, 5, (222, 214, 232, 255))
    cv.rect(5, 9, 2, 1, inkify(s))


def icon_alga(cv):
    m, l, d = FOOD_BY_KIND["alga"]
    for x0 in (3, 6, 9):
        for y in range(2, 13):
            cv.set(x0 + (1 if (y // 3) % 2 else 0), y, m if y % 2 else d)
    cv.set(4, 4, l)
    cv.set(7, 7, l)
    cv.set(10, 5, l)


def icon_semente(cv):
    m, l, s = FOOD_BY_KIND["semente"]
    cv.ell(6, 6, 3, 4, m)
    cv.ell(5, 5, 2, 2, l)
    cv.vline(6, 10, 12, s)
    cv.set(7, 11, s)


def icon_outono(cv):
    m, l, s = FOOD_BY_KIND["outono"]
    cv.ell(6, 5, 4, 3, m)
    cv.ell(5, 4, 3, 2, l)
    cv.set(4, 9, m)
    cv.set(8, 9, m)
    cv.set(6, 8, s)
    cv.vline(6, 9, 12, s)


def icon_gelo(cv):
    m, l, s = FOOD_BY_KIND["gelo"]
    cv.vline(6, 2, 12, m)
    cv.hline(6, 2, 11, m)
    for i in range(4):
        cv.set(3 + i, 4 + i, m)
        cv.set(9 - i, 4 + i, m)
        cv.set(3 + i, 10 - i, m)
        cv.set(9 - i, 10 - i, m)
    cv.set(6, 6, l)
    cv.set(5, 5, l)
    cv.set(7, 7, s)


def icon_crystal(cv, color, hi):
    """Cristal geométrico do pólen de memória (hexágono facetado)."""
    cv.vline(6, 1, 12, color)
    for y in range(2, 12):
        half = 1 if y < 3 or y > 10 else 3
        cv.hline(y, 6 - half, 6 + half, color)
    cv.rect(5, 4, 2, 5, hi)
    cv.set(6, 2, WHITE)
    cv.set(6, 11, inkify(color))
    cv.set(9, 5, inkify(color))
    cv.set(3, 5, inkify(color))


def icon_anel(cv, seiva=False):
    ring = (56, 44, 88, 255)
    for a in range(0, 360, 6):
        r = 5
        x = int(6 + r * math.cos(math.radians(a)) + 0.5)
        y = int(6 + r * math.sin(math.radians(a)) + 0.5)
        cv.set(x, y, ring)
        cv.set(x, y + 1, ring)
    if seiva:
        for a in range(0, 200, 6):
            x = int(6 + 5 * math.cos(math.radians(a)) + 0.5)
            y = int(6 + 5 * math.sin(math.radians(a)) + 0.5)
            cv.set(x, y, (255, 212, 121, 255))
            cv.set(x, y + 1, (255, 179, 71, 255))


def icon_marca(cv, color):
    for cx, y in ((4, 4), (6, 7), (9, 3)):
        cv.set(cx, y, color)
        cv.set(cx, y + 1, color)
        cv.set(cx - 1, y + 1, color)
        cv.set(cx + 1, y + 1, color)
        cv.set(cx, y + 2, inkify(color))


def icon_quitina(cv, biome):
    mid, dark, accent, hi = biome[2], biome[3], biome[4], biome[5]
    for y in range(1, 13):
        for x in range(1, 13):
            on = ((x + y) % 6 < 3) and ((x - y) % 6 < 3)
            cv.set(x, y, mid if on else dark)
    cv.hline(1, 1, 12, lighter(mid))
    cv.set(3, 3, hi)
    cv.set(10, 10, accent)


def icon_dither(cv):
    for y in range(1, 13):
        for x in range(1, 13):
            if (x + y) % 2 == 0:
                cv.set(x, y, (42, 32, 66, 200))
            elif (x % 4 == 0 and y % 3 == 0):
                cv.set(x, y, (232, 244, 255, 60))


def icon_mel(cv):
    cv.ell(6, 7, 4, 5, (255, 179, 71, 255))
    cv.ell(5, 5, 2, 2, (255, 236, 186, 255))
    cv.set(5, 11, (196, 122, 40, 255))
    cv.hline(3, 3, 9, (255, 212, 121, 255))


def icon_seda(cv):
    for y in range(2, 12):
        x = 4 + (y % 4)
        cv.set(x, y, (245, 245, 255, 220))
        cv.set(x + 1, y, (206, 214, 236, 190))
    cv.set(9, 5, (255, 255, 255, 255))


def icon_esporo(cv):
    for cx, cy, r in ((4, 5, 2), (9, 8, 2), (6, 11, 1)):
        cv.ell(cx, cy, r, r, (191, 255, 168, 255))
        cv.set(cx - 1, cy - 1, (240, 255, 230, 255))


def icon_coroa_fungo(cv):
    c = crown_frame(0).clip(3, 0, 14, 12)
    cv.blit(c, 0, 1)


def icon_formiga(cv):
    m = (55, 230, 200, 255)
    cv.ell(4, 7, 2, 2, m)
    cv.set(6, 7, m)
    cv.ell(9, 7, 2, 2, m)
    cv.set(11, 9, m)
    cv.set(3, 10, (28, 138, 122, 255))
    cv.set(8, 10, (28, 138, 122, 255))


def icon_estrela(cv):
    cv.vline(6, 2, 11, (255, 247, 220, 255))
    cv.hline(6, 2, 11, (255, 247, 220, 255))
    cv.set(4, 4, (255, 212, 121, 255))
    cv.set(8, 4, (255, 212, 121, 255))
    cv.set(4, 8, (255, 212, 121, 255))
    cv.set(8, 8, (255, 212, 121, 255))


def make_icons():
    sheet = Cv(IC * 12, IC * 2)
    fns = [icon_trevo, icon_cogumelo, icon_alga, icon_semente, icon_outono, icon_gelo]
    for i, fn in enumerate(fns):
        cv = Cv(IC, IC)
        fn(cv)
        cv.outline(OUTLINE, diagonals=False)
        sheet.blit(cv, i * IC, 0)
    for i, (name, color, hi) in enumerate(ESSENCE):
        cv = Cv(IC, IC)
        icon_crystal(cv, color + (255,), hi + (255,))
        cv.outline(OUTLINE, diagonals=False)
        sheet.blit(cv, (6 + i) * IC, 0)
    for i, name in enumerate(ICONS_ROW1):
        cv = Cv(IC, IC)
        if name == "anel":
            icon_anel(cv, False)
        elif name == "anel_seiva":
            icon_anel(cv, True)
        elif name == "marca_comida":
            icon_marca(cv, (127, 214, 160, 255))
        elif name == "marca_perigo":
            icon_marca(cv, (255, 77, 90, 255))
        elif name == "quitina":
            icon_quitina(cv, BIOMES[0])
        elif name == "dither":
            icon_dither(cv)
        elif name == "mel":
            icon_mel(cv)
        elif name == "seda":
            icon_seda(cv)
        elif name == "esporo":
            icon_esporo(cv)
        elif name == "coroa_fungo":
            icon_coroa_fungo(cv)
        elif name == "formiga":
            icon_formiga(cv)
        else:
            icon_estrela(cv)
        cv.outline(OUTLINE, diagonals=False)
        sheet.blit(cv, i * IC, IC)
    write_png(os.path.join(OUT, "hud_icons.png"), sheet)


# ------------------------------------------------------- irmã da trilha -------
AN_W, AN_H = 14, 10


# estilos da irmã da trilha: 0 = normal (verde-clara), 1 = pequena (turquesa),
# 2 = em marcha de perigo (pálida, esfriada pela Névoa — a trilha queima)
ANT_STYLES = [
    ((191, 255, 168, 255), (110, 170, 128, 255), 1.0),
    ((55, 230, 200, 255), (28, 138, 122, 255), 0.75),
    ((255, 200, 205, 255), (176, 96, 104, 255), 1.0),
]


def ant_frame(frame, style=0):
    """Formiga de perfil que anda na trilha de feromônio (4 quadros)."""
    cv = Cv(AN_W, AN_H)
    body, dark, s = ANT_STYLES[style]
    cy = 5
    gx, tx, hx = 4, 7, 10
    cv.ell(gx, cy, 2 * s, 1.6 * s, body)
    cv.ell(gx - 1, cy, 1.2 * s, 1.0 * s, dark)
    cv.ell(tx, cy, 1.2 * s, 1.0 * s, body)
    cv.ell(hx, cy, 1.4 * s, 1.2 * s, body)
    cv.set(hx + 1, cy - 1, body)                 # antena
    cv.set(hx + 2, cy - 2, body)
    lift = (0, 1, 0, 1)[frame]
    for dx, base in ((tx - 1, 1), (tx + 1, 1), (hx - 1, 1)):
        y = cy + 1 + (0 if (dx + frame) % 2 else lift)
        cv.set(dx, y, dark)
        cv.set(dx, y + 1, dark)
    cv.outline(OUTLINE, diagonals=False)
    return cv


def make_ants():
    sheet = Cv(AN_W * 4, AN_H * len(ANT_STYLES))
    for style in range(len(ANT_STYLES)):
        for f in range(4):
            sheet.blit(ant_frame(f, style), f * AN_W, style * AN_H)
    write_png(os.path.join(OUT, "hud_ant.png"), sheet)


# --------------------------------------------------------------------- main ---
def main():
    os.makedirs(OUT, exist_ok=True)
    print("FUMIGA — spritesheets do HUD lore (FASE 1)")
    make_panels()
    make_gaster()
    make_crown()
    make_icons()
    make_ants()
    print("pronto: " + os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
