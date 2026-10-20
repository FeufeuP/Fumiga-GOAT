#!/usr/bin/env python3
"""Diagrama ANTES→DEPOIS do RODAPÉ DAS FORMIGAS (Regra 20).

Entrada: capturas reais do jogo (o ANTES servido a partir do código no HEAD,
em /tmp/fumiga-shot/antes; o DEPOIS, do estado atual, em /tmp/fumiga-shot/out).
Saída: slice-box/diagrama-rodape-antes-depois.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_TTF = ROOT / "game/assets/font/KiwiSoda.ttf"
ANTE = Path("/tmp/fumiga-shot/antes/rodape-antes.png")
DEPOIS = Path("/tmp/fumiga-shot/out/rodape-depois.png")
OUT = ROOT / "slice-box/diagrama-rodape-antes-depois.png"

GOLD = (255, 212, 121, 255)
CREAM = (242, 228, 195, 255)
DIM = (176, 158, 128, 255)
GREEN = (138, 212, 148, 255)
RED = (235, 108, 96, 255)
INK = (73, 53, 33, 255)
BG = (26, 19, 14, 255)
PANEL = (38, 29, 21, 255)


def font(px):
    return ImageFont.truetype(str(FONT_TTF), px)


def paste_fit(cv, im, box):
    x, y, w, h = box
    sw, sh = im.size
    s = min(w / sw, h / sh)
    fw, fh = max(1, round(sw * s)), max(1, round(sh * s))
    r = im.resize((fw, fh), Image.Resampling.LANCZOS)
    cv.paste(r, (x + (w - fw) // 2, y + (h - fh) // 2), r)


def bullets(d, x, y, lines, f, fill=CREAM, step=21):
    for i, t in enumerate(lines):
        d.text((x, y + i * step), "- " + t, font=f, fill=fill)


def main():
    W, H = 1920, 1500
    cv = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(cv)

    f_title = font(30)
    f_sub = font(15)
    f_lbl = font(22)
    f_txt = font(15)
    f_small = font(13)

    # a seta é desenhada (a fonte KiwiSoda não tem o glifo "→")
    t1 = "RODAPÉ DAS FORMIGAS — ANTES"
    w1 = int(d.textlength(t1, font=f_title))
    d.text((36, 22), t1, font=f_title, fill=GOLD)
    ax, ay = 36 + w1 + 12, 22 + 14
    d.rectangle([ax, ay, ax + 34, ay + 6], fill=GOLD)
    d.polygon([(ax + 34, ay - 6), (ax + 50, ay + 3), (ax + 34, ay + 12)], fill=GOLD)
    d.text((ax + 62, 22), "DEPOIS (2026-10-20)", font=f_title, fill=GOLD)
    d.text((36, 62), "Arquivos: game/js/game.js (rodapé) · game/js/ui.js (button/plate) · game/js/paper_hud.js (drawPlaca/placaQuiet) · "
                     "game/assets/ui/paper/wood/placa_*.png (20 artes v2)", font=f_sub, fill=DIM)

    antes = Image.open(ANTE).convert("RGBA")
    depois = Image.open(DEPOIS).convert("RGBA")

    # ---------------- ANTES ----------------
    d.text((36, 104), "ANTES — a mesma placa mini esticada em tudo", font=f_lbl, fill=RED)
    d.rectangle([32, 100, W - 32, 100 + 2], fill=(90, 40, 30, 255))
    paste_fit(cv, antes, (36, 112, W - 72, 210))
    bullets(d, 44, 340, [
        "botão IRMÃS = a placa mini (144x144) esticada num oval de 92x64: tinta esticada, ilegível",
        "os cards da loja usavam a mesma placa espremida em 38x64 (formiga e preço viram borrão)",
        "o FORMIGUEIRO era um retângulo de madeira sem a arte da família nova",
        "texto creme (#fdf3dc) sobre madeira clara: contraste ~1,3:1 — some nos veios",
    ], f_txt, CREAM)
    bullets(d, 980, 340, [
        "Regra 21/22: o sprite era DEFORMADO (esticado) para caber no texto",
        "nenhuma distinção entre o que é botão e o que é moldura de HUD",
    ], f_txt, DIM)

    # ---------------- DEPOIS ----------------
    d.text((36, 450), "DEPOIS — família de placas v2 (tábuas), sprite inteiro e tinta legível", font=f_lbl, fill=GREEN)
    d.rectangle([32, 446, W - 32, 446 + 2], fill=(36, 80, 46, 255))
    paste_fit(cv, depois, (36, 458, W - 72, 210))
    bullets(d, 44, 686, [
        "IRMÃS = placa média (326x90, tábua com pontas e folha) desenhada INTEIRA, em escala uniforme",
        "cards da loja = placa cartão (87x200): formiga, barra da cor e preço em tábua vertical",
        "FORMIGUEIRO = placa pequena (312x100) com o nome do bioma e 'ENTRAR (B)'",
        "tinta marrom (#4a3116) na madeira calma (luminância ~175): contraste ~4,2:1",
    ], f_txt, CREAM)
    bullets(d, 980, 686, [
        "o texto se adapta ao HUD: a área calma da arte define onde a tinta cabe",
        "nenhuma placa é fatiada, esticada ou esmagada",
    ], f_txt, DIM)

    # ---------------- ZOOM: o botão IRMÃS antes e depois ----------------
    d.text((36, 800), "ZOOM NO BOTÃO IRMÃS", font=f_lbl, fill=GOLD)
    za = antes.crop((0, 20, 260, 130)).resize((780, 330), Image.Resampling.LANCZOS)
    zd = depois.crop((0, 14, 300, 130)).resize((780, 302), Image.Resampling.LANCZOS)
    cv.paste(za, (36, 840), za)
    cv.paste(zd, (900, 840), zd)
    d.text((36, 1180), "ANTES — placa esticada, tinta borrada", font=f_txt, fill=RED)
    d.text((900, 1180), "DEPOIS — tábua inteira, tinta marrom legível", font=f_txt, fill=GREEN)

    # ---------------- CONTRASTE ----------------
    d.text((36, 1226), "TINTA NA MADEIRA CLARA (novas placas)", font=f_lbl, fill=GOLD)
    swatch = Image.new("RGBA", (360, 52), (216, 160, 74, 255))
    d2 = ImageDraw.Draw(swatch)
    d2.text((14, 12), "IRMÃS", font=font(26), fill=(253, 243, 220, 255))  # creme
    cv.paste(swatch, (36, 1262), swatch)
    d.text((410, 1266), "creme #fdf3dc → contraste 1,3:1 (ilegível)", font=f_txt, fill=RED)

    swatch2 = Image.new("RGBA", (360, 52), (216, 160, 74, 255))
    d3 = ImageDraw.Draw(swatch2)
    d3.text((14, 12), "IRMÃS", font=font(26), fill=(74, 49, 22, 255))  # marrom
    cv.paste(swatch2, (36, 1330), swatch2)
    d.text((410, 1334), "marrom #4a3116 → contraste 4,2:1 (legível)", font=f_txt, fill=GREEN)

    d.text((900, 1262), "Verificação: npm test (37/37) · npm run inspect:layout (118 estados, LAYOUT LIMPO)", font=f_small, fill=DIM)
    d.text((900, 1286), "· npm run inspect (sem erro de JS/404/glifo) · capturas PC e mobile conferidas", font=f_small, fill=DIM)
    d.text((900, 1322), "Regra 13 (backup no Drive): PENDENTE — a integração do Google Drive não está conectada nesta sessão;",
           font=f_small, fill=RED)
    d.text((900, 1344), "as 20 artes continuam versionadas no repositório (game/assets/ui/paper/wood/) e o manifesto",
           font=f_small, fill=DIM)
    d.text((900, 1366), "com SHA-256 em docs/arte/botoes-madeira-v2.json.", font=f_small, fill=DIM)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv.convert("RGB").save(OUT, optimize=True)
    print("diagrama:", OUT)


if __name__ == "__main__":
    main()
