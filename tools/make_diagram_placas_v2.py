#!/usr/bin/env python3
"""Gera o diagrama da mudança (Regra 20) da família de placas de madeira v2
e da integração no rodapé das formigas.

Entrada das imagens: capturas em /tmp/fumiga-shot (fora do Git).
Saída: slice-box/diagrama-placas-madeira-v2.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WOOD = ROOT / "game/assets/ui/paper/wood"
SHOT = Path("/tmp/fumiga-shot")
OUT = ROOT / "slice-box/diagrama-placas-madeira-v2.png"
FONT_TTF = ROOT / "game/assets/font/KiwiSoda.ttf"

GOLD = (255, 212, 121, 255)
CREAM = (242, 228, 195, 255)
DIM = (192, 174, 142, 255)
GREEN = (138, 212, 148, 255)
RED = (235, 108, 96, 255)
INK = (73, 53, 33, 255)


def font(px):
    return ImageFont.truetype(str(FONT_TTF), px)


def paste_fit(canvas, im, box):
    x, y, w, h = box
    sw, sh = im.size
    s = min(w / sw, h / sh)
    fw, fh = max(1, round(sw * s)), max(1, round(sh * s))
    ox, oy = x + (w - fw) // 2, y + (h - fh) // 2
    resized = im.resize((fw, fh), Image.Resampling.LANCZOS)
    canvas.paste(resized, (ox, oy), resized)


def label(d, x, y, text, f, fill, box_w=None):
    d.text((x, y), text, font=f, fill=fill)


def bullets(d, x, y, lines, f, fill=CREAM, step=22):
    for i, t in enumerate(lines):
        d.text((x, y + i * step), "- " + t, font=f, fill=fill)


def main():
    W, H = 1920, 2000
    cv = Image.new("RGBA", (W, H), (28, 21, 15, 255))
    d = ImageDraw.Draw(cv)

    f_title = font(30)
    f_sub = font(16)
    f_sec = font(20)
    f_lbl = font(15)
    f_small = font(13)

    d.text((36, 22), "DIAGRAMA DA MUDANÇA — FAMÍLIA DE PLACAS DE MADEIRA v2 + RODAPÉ DAS FORMIGAS (2026-10-19)",
           font=f_title, fill=GOLD)
    d.text((36, 60), "Arte: spritesheet v2 aprovada (4 tábuas) | Regra 21/22: sprite INTEIRO (escala uniforme), texto dentro da madeira calma medida (PLACA_QUIET)",
           font=f_sub, fill=CREAM)

    # ---------------------------------------------------------------- 1. FAMÍLIA
    d.rounded_rectangle((28, 96, W - 28, 560), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 108), "1. A FAMÍLIA DE PLACAS (v2 APROVADA) — 4 VARIAÇÕES DA MESMA TÁBUA, CADA UMA COM A SUA ÁREA DE TEXTO MEDIDA",
           font=f_sec, fill=GOLD)
    d.text((48, 136), "Placas: grande 400×180 (2,22:1) · media 326×90 (3,62:1) · pequena 312×100 (3,12:1) · cartao 87×200 (0,43:1)",
           font=f_small, fill=DIM)

    quiet = {
        "placa_grande": (0.30, 0.32, 0.54, 0.88),
        "placa_media": (0.18, 0.16, 0.71, 0.84),
        "placa_pequena": (0.06, 0.16, 0.60, 0.84),
        "placa_cartao": (0.16, 0.31, 0.84, 0.74),
    }
    nomes = {"placa_grande": "GRANDE", "placa_media": "MÉDIA",
             "placa_pequena": "PEQUENA", "placa_cartao": "CARTÃO"}
    bx, by, bw, bh = 48, 170, 440, 300
    for i, (k, nome) in enumerate(nomes.items()):
        col = i % 2
        row = i // 2
        x0 = bx + col * 470
        y0 = by + row * 185
        im = Image.open(WOOD / f"{k}_normal.png").convert("RGBA")
        paste_fit(cv, im, (x0, y0, bw, 120))
        q = quiet[k]
        # marca a area de texto medida sobre a arte desenhada
        sw, sh = im.size
        s = min(bw / sw, 120 / sh)
        fw, fh = round(sw * s), round(sh * s)
        ox, oy = x0 + (bw - fw) // 2, y0 + (120 - fh) // 2
        d.rectangle((ox + q[0] * fw, oy + q[1] * fh, ox + q[2] * fw, oy + q[3] * fh),
                    outline=(235, 108, 96, 255), width=2)
        d.text((x0, y0 + 126), f"{nome} — área de texto {k[6:]}: "
                              f"x {q[0]:.2f}..{q[2]:.2f} · y {q[1]:.2f}..{q[3]:.2f}",
               font=f_small, fill=DIM)
    bullets(d, 990, 176, [
        "O botão IRMÃS usava a placa quadrada 144×144 espremida em 92×64:",
        "a arte era deformada e o texto saía da madeira.",
        "A v1 (miolo de papel creme emoldurado) foi REJEITADA:",
        "o usuário pediu um botão de verdade, não uma moldura de HUD.",
        "A v2 é madeira no corpo todo, com folha e bolota nas pontas.",
        "Cada variação tem a área calma medida À MÃO sobre a arte real",
        "(o algoritmo automático falhava: a fibra da madeira quebra as",
        "linhas em trechos curtos e o centro cai sobre ornamento).",
        "O texto vive nessa área; o sprite nunca é cortado nem deformado.",
    ], f_small, step=21)

    # ------------------------------------------------- 2. RODAPÉ DAS FORMIGAS
    d.rounded_rectangle((28, 580, W - 28, 1090), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 592), "2. RODAPÉ DAS FORMIGAS (RUN) — BOTÃO IRMÃS E CARDS DA LOJA", font=f_sec, fill=GOLD)
    d.text((1400, 592), "game/js/game.js (drawHUD · barra de formigas)", font=f_small, fill=DIM)

    d.rounded_rectangle((48, 626, 660, 668), radius=6, fill=(72, 32, 32, 255), outline=(140, 70, 60, 255), width=2)
    d.text((62, 634), "ANTES — placa quadrada esmagada + texto fora da arte", font=f_lbl, fill=RED)
    d.rounded_rectangle((1000, 626, 1612, 668), radius=6, fill=(34, 52, 34, 255), outline=(80, 130, 80, 255), width=2)
    d.text((1014, 634), "DEPOIS — tábuas da família v2, texto na madeira calma", font=f_lbl, fill=GREEN)

    antes = Image.open(SHOT / "diag/antes-rodape.png").convert("RGBA")
    depois = Image.open(SHOT / "diag/depois-rodape.png").convert("RGBA")
    paste_fit(cv, antes, (48, 680, 900, 200))
    paste_fit(cv, depois, (1000, 680, 900, 200))
    bullets(d, 48, 900, [
        "IRMÃS 92×64 esmagava a placa mini 144×144 (arte deformada).",
        "Os 10 cards da loja (38×64) mostravam o formigueiro e o preço",
        "por cima do ornamento: nada legível.",
    ], f_small)
    bullets(d, 1000, 900, [
        "IRMÃS: placa 'media' 160×44, formiga + IRMÃS + ABRIR (Q) dentro",
        "da faixa calma (0,16..0,84 da altura).",
        "Cards da loja: placa 'cartao' 30×64, formiga + preço + faixa de",
        "grupo; o formigueiro: placa 'pequena' 190×60 com o nome do bioma.",
    ], f_small)

    # --------------------------------------------------------- 3. ÁRVORE (NAV)
    d.rounded_rectangle((28, 1110, W - 28, 1450), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 1122), "3. ÁRVORE DA EVOLUÇÃO — NAVEGAÇÃO (MEMÓRIAS / PROFECIAS / VOLTAR)", font=f_sec, fill=GOLD)
    d.text((1400, 1122), "game/js/meta.js (drawTreeHUD)", font=f_small, fill=DIM)
    d.rounded_rectangle((48, 1156, 660, 1198), radius=6, fill=(72, 32, 32, 255), outline=(140, 70, 60, 255), width=2)
    d.text((62, 1164), "ANTES — a seta de madeira antiga, texto espremido", font=f_lbl, fill=RED)
    d.rounded_rectangle((1000, 1156, 1612, 1198), radius=6, fill=(34, 52, 34, 255), outline=(80, 130, 80, 255), width=2)
    d.text((1014, 1164), "DEPOIS — placa 'media' 124×44, tinta creme com sombra", font=f_lbl, fill=GREEN)
    antes = Image.open(SHOT / "diag/antes-nav.png").convert("RGBA")
    depois = Image.open(SHOT / "diag/depois-nav.png").convert("RGBA")
    paste_fit(cv, antes, (48, 1210, 900, 120))
    paste_fit(cv, depois, (1000, 1210, 900, 120))
    bullets(d, 48, 1344, [
        "A seta antiga encolhia para 124×44 e o rótulo ficava ilegível",
        "em cima do ornamento.",
    ], f_small)
    bullets(d, 1000, 1344, [
        "A tábua entra inteira (escala uniforme) e o rótulo fica na madeira",
        "calma: creme com sombra escura recorta a palavra no veio da madeira.",
    ], f_small)

    # --------------------------------------------------- 4. SELECIONE O MODO
    d.rounded_rectangle((28, 1470, W - 28, 1960), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 1482), "4. SELECIONE O MODO — BOTÃO JOGAR DO CARD", font=f_sec, fill=GOLD)
    d.text((1400, 1482), "game/js/render.js (drawModeCards)", font=f_small, fill=DIM)
    d.rounded_rectangle((48, 1516, 660, 1558), radius=6, fill=(72, 32, 32, 255), outline=(140, 70, 60, 255), width=2)
    d.text((62, 1524), "ANTES — retângulo chapado solto no card", font=f_lbl, fill=RED)
    d.rounded_rectangle((1000, 1516, 1612, 1558), radius=6, fill=(34, 52, 34, 255), outline=(80, 130, 80, 255), width=2)
    d.text((1014, 1524), "DEPOIS — placa 'grande' (a tábua-modelo) com JOGAR", font=f_lbl, fill=GREEN)
    antes = Image.open(SHOT / "diag/antes-jogar.png").convert("RGBA")
    depois = Image.open(SHOT / "diag/depois-jogar.png").convert("RGBA")
    paste_fit(cv, antes, (48, 1570, 900, 230))
    paste_fit(cv, depois, (1000, 1570, 900, 230))
    bullets(d, 48, 1810, [
        "O botão era um retângulo colorido desenhado à mão: não tinha",
        "madeira nenhuma e brigava com o card escuro.",
    ], f_small)
    bullets(d, 1000, 1810, [
        "A placa 'grande' (a tábua-modelo aprovada) entra inteira, com o",
        "JOGAR em creme com sombra na faixa calma central.",
        "As OPÇÕES/configurações continuam com a placa antiga (Regra: não",
        "usar o mesmo botão para tudo).",
    ], f_small)

    d.rounded_rectangle((28, 1975 - 40, W - 28, 1975), radius=8, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 1944), "Regra 21/22: nenhum sprite deformado ou cortado — a arte entra inteira, com escala uniforme; "
                       "o texto se adapta à madeira calma (PLACA_QUIET) e encolhe se não couber.",
           font=f_small, fill=DIM)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv.convert("RGB").save(OUT, quality=95)
    print("->", OUT, cv.size)


if __name__ == "__main__":
    main()
