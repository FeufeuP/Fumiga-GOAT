#!/usr/bin/env python3
"""Gera o diagrama da mudança (Regra 20) para os HUDs do Grupo A em 2 peças.

Saída: slice-box/diagrama-hud-duas-pecas.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PAPER = ROOT / "game/assets/ui/paper"
WOOD = PAPER / "wood"
FONT_TTF = ROOT / "game/assets/font/KiwiSoda.ttf"
OUT = ROOT / "slice-box/diagrama-hud-duas-pecas.png"


def font(px):
    return ImageFont.truetype(str(FONT_TTF), px)


def paste_fit(canvas: Image.Image, im: Image.Image, box: tuple[int, int, int, int]):
    x, y, w, h = box
    sw, sh = im.size
    s = min(w / sw, h / sh)
    fw, fh = max(1, round(sw * s)), max(1, round(sh * s))
    ox, oy = x + (w - fw) // 2, y + (h - fh) // 2
    resized = im.resize((fw, fh), Image.Resampling.LANCZOS)
    canvas.paste(resized, (ox, oy), resized)
    return ox, oy, fw, fh


def main():
    W, H = 1440, 920
    cv = Image.new("RGBA", (W, H), (28, 21, 15, 255))
    d = ImageDraw.Draw(cv)

    f_title = font(30)
    f_sub = font(16)
    f_sec = font(20)
    f_lbl = font(15)
    f_small = font(13)

    GOLD = (255, 212, 121, 255)
    CREAM = (242, 228, 195, 255)
    DIM = (192, 174, 142, 255)
    GREEN = (138, 212, 148, 255)
    RED = (235, 108, 96, 255)
    INK = (73, 53, 33, 255)

    # Cabeçalho
    d.text((36, 22), "DIAGRAMA DA MUDANCA — HUDS DE BORDAS FINAS + FOLHAS GRANDES + COMPACTACAO (2026-10-16)", font=f_title, fill=GOLD)
    d.text((36, 58), "Estilo 06 em 2 pecas (*_bg.png + *_frame.png): janela interna ampliada (+53% altura util) | Reducao de 35% a 50% na area de tela + Opacidade Contextual", font=f_sub, fill=CREAM)

    # Seção 1: Arquitetura em 2 peças (3 colunas + resultado composto)
    d.rounded_rectangle((28, 92, W - 28, 430), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 104), "1. MOLDURAS COM VIGAS FINAS E FOLHAS/VINHAS GRANDES NAS BORDAS (2 PECAS + PAPER_QUIET AMPLIADO)", font=f_sec, fill=GOLD)

    p_bg = Image.open(PAPER / "panel_bg.png").convert("RGBA")
    p_fr = Image.open(PAPER / "panel_frame.png").convert("RGBA")
    m_bg = Image.open(PAPER / "minimap_bg.png").convert("RGBA")
    m_fr = Image.open(PAPER / "minimap_frame.png").convert("RGBA")
    w_btn = Image.open(WOOD / "button_mini_normal.png").convert("RGBA")

    cols = [
        (52, 142, 300, 170, "PECA 2: FUNDO (panel_bg.png)", "Folha de papel creme artesanal\nem camadas (centro 100% opaco)"),
        (392, 142, 300, 170, "PECA 1: MOLDURA (panel_frame.png)", "Vigas finas + folhas/vinhas grandes\nna borda externa (janela 65%x60%)"),
        (732, 142, 300, 170, "PAINEL COMPACTO (270x144, -44%)", "Area util qCol de 176x86px permite\nreduzir o HUD em 44% na tela!"),
        (1072, 142, 316, 170, "MINIMAPA COMPACTO (168x125, -35%)", "minimap_bg + Mapa clipado na janela\n+ minimap_frame POR CIMA"),
    ]

    for i, (bx, by, bw, bh, title, desc) in enumerate(cols):
        d.rounded_rectangle((bx, by, bx + bw, by + bh + 66), radius=8, fill=(54, 41, 30, 255), outline=(112, 86, 56, 255), width=1)
        d.text((bx + 12, by + 8), title, font=f_lbl, fill=GOLD)
        img_box = (bx + 14, by + 32, bw - 28, bh - 26)
        # Xadrez discreto para evidenciar transparência real
        for cy in range(img_box[1], img_box[1] + img_box[3], 12):
            for cx in range(img_box[0], img_box[0] + img_box[2], 12):
                c = (66, 52, 38, 255) if ((cx // 12 + cy // 12) % 2 == 0) else (50, 38, 28, 255)
                d.rectangle((cx, cy, min(cx + 12, img_box[0] + img_box[2]), min(cy + 12, img_box[1] + img_box[3])), fill=c)

        if i == 0:
            paste_fit(cv, p_bg, img_box)
        elif i == 1:
            paste_fit(cv, p_fr, img_box)
        elif i == 2:
            ox, oy, fw, fh = paste_fit(cv, p_bg, img_box)
            paste_fit(cv, p_fr, img_box)
            # Retângulo paperQuiet ampliado [0.215, 0.200, 0.865, 0.800]
            qx = round(ox + 0.215 * fw)
            qy = round(oy + 0.200 * fh)
            qw = round((0.865 - 0.215) * fw)
            qh = round((0.800 - 0.200) * fh)
            d.rectangle((qx, qy, qx + qw, qy + qh), outline=GREEN, width=2)
            d.text((qx + 8, qy + 8), "COLONIA - IRMAS 12/20", font=f_small, fill=INK)
            d.text((qx + 8, qy + 26), "RAINHA [=======] 120/120", font=f_small, fill=INK)
            d.text((qx + 8, qy + 44), "ANEL 3   SEMENTES 145", font=f_small, fill=INK)
            btn_s = w_btn.resize((22, 15), Image.Resampling.LANCZOS)
            cv.paste(btn_s, (qx + qw - 24, qy + 3), btn_s)
        elif i == 3:
            ox, oy, fw, fh = paste_fit(cv, m_bg, img_box)
            # Mapa simulado dentro da abertura (0.105, 0.130, 0.891, 0.880)
            ax0 = round(ox + 0.105 * fw)
            ay0 = round(oy + 0.130 * fh)
            ax1 = round(ox + 0.891 * fw)
            ay1 = round(oy + 0.880 * fh)
            d.rectangle((ax0, ay0, ax1, ay1), fill=(48, 72, 42, 255))
            d.ellipse((ax0 + 42, ay0 + 34, ax0 + 54, ay0 + 46), fill=GOLD, outline=(255, 255, 255, 255))
            d.rectangle((ax0 + 22, ay0 + 18, ax0 + 86, ay0 + 62), outline=(240, 235, 255, 200), width=1)
            # Moldura vazada desenhada POR CIMA do mapa!
            paste_fit(cv, m_fr, img_box)
            qx = round(ox + 0.180 * fw)
            qy = round(oy + 0.240 * fh)
            qw = round((0.800 - 0.180) * fw)
            qh = round((0.770 - 0.240) * fh)
            d.rectangle((qx, qy, qx + qw, qy + qh), outline=GREEN, width=1)

        d.text((bx + 12, by + bh + 16), desc, font=f_small, fill=DIM)

    # Seção 2: Comparação Antes vs Depois + Galeria das demais peças
    d.rounded_rectangle((28, 448, W - 28, H - 24), radius=10, fill=(40, 30, 22, 255), outline=(98, 74, 48, 255), width=2)
    d.text((48, 460), "2. REDUCAO DE OCUPACAO NA TELA 960x540 (ANTES vs DEPOIS) + GALERIA DAS 7 FAMILIAS", font=f_sec, fill=GOLD)

    b_bg = Image.open(PAPER / "banner_bg.png").convert("RGBA")
    b_fr = Image.open(PAPER / "banner_frame.png").convert("RGBA")
    c_bg = Image.open(PAPER / "card_bg.png").convert("RGBA")
    c_fr = Image.open(PAPER / "card_frame.png").convert("RGBA")
    t_bg = Image.open(PAPER / "tooltip_bg.png").convert("RGBA")
    t_fr = Image.open(PAPER / "tooltip_frame.png").convert("RGBA")
    h_bg = Image.open(PAPER / "health_bg.png").convert("RGBA")
    h_fr = Image.open(PAPER / "health_frame.png").convert("RGBA")
    w_peq = Image.open(WOOD / "button_pequeno_normal.png").convert("RGBA")

    # Caixa esquerda: Resumo ANTES vs DEPOIS
    d.rounded_rectangle((48, 496, 680, H - 44), radius=8, fill=(54, 41, 30, 255), outline=(112, 86, 56, 255), width=1)
    d.text((64, 510), "ANTES (MOLDURAS GROSSAS = HUDS GIGANTES NA TELA):", font=f_lbl, fill=RED)
    before_lines = [
        "- Molduras consumiam 77% da caixa (so 23% de area util PAPER_QUIET);",
        "- Colonia (360x192) + Expandido (360x192) tapavam 72% da altura esquerda;",
        "- Topo somava 360+380+208 = 948px (98,7% da largura da tela 960px!);",
        "- Tutorial (370x197), Evento (560x112) e Ninho (340x181) cobriam a acao;",
        "- Ocupacao total chegava a 51,2% (com tutorial) e 90,3% (em pico).",
    ]
    for idx, line in enumerate(before_lines):
        d.text((64, 534 + idx * 22), line, font=f_small, fill=CREAM)

    d.text((64, 656), "DEPOIS (1o FUNDO > 2o TEXTO > 3o MOLDURA + 15 SLOTS DISTINTOS):", font=f_lbl, fill=GREEN)
    after_lines = [
        "- Camadas estritas: 1o Fundo (*_bg) -> 2o Texto (clipado) -> 3o Moldura (*_frame);",
        "- Vigas finas com folhas/vinhas/musgo grandes nas bordas (altura util +53%);",
        "- Colonia: 360x192 -> 270x144 (-44%) | Expandido ('expanded'): 270x144 (-44%);",
        "- Onda ('banner'): 320x64 (-29%) | Chefao ('boss'): 340x68 | Evento ('event'): 400x80;",
        "- Tutorial ('tutorial'): 285x152 (-41%) | Ninho ('nest_tip'): 256x136 (-43%);",
        "- Transicao ('transition'): 560x386 | Arvore ('tree_detail'): 284x386 | 'header': 8:1;",
        "- Opacidade contextual (0.82) + Plano salvo em PLANO_HUDS_DISTINTOS_E_CAMADAS.md.",
    ]
    for idx, line in enumerate(after_lines):
        d.text((64, 678 + idx * 20), line, font=f_small, fill=CREAM)

    # Caixa direita: mostruário das peças restantes (banner, health, tooltip, card)
    d.rounded_rectangle((700, 496, W - 48, H - 44), radius=8, fill=(54, 41, 30, 255), outline=(112, 86, 56, 255), width=1)
    d.text((718, 510), "FAMILIAS COMPLEMENTARES (BANNER, BARRA HEALTH, TOOLTIP E CARTA):", font=f_lbl, fill=GOLD)

    # Banner
    ox, oy, fw, fh = paste_fit(cv, b_bg, (718, 540, 380, 76))
    paste_fit(cv, b_fr, (718, 540, 380, 76))
    qx, qy, qw, qh = round(ox + 0.310 * fw), round(oy + 0.295 * fh), round((0.840 - 0.310) * fw), round((0.765 - 0.295) * fh)
    d.rectangle((qx, qy, qx + qw, qy + qh), outline=GREEN, width=1)
    d.text((qx + 12, qy + 6), "INVASAO 2/5 - RESTAM 8", font=f_small, fill=INK)

    # Health bar
    ox, oy, fw, fh = paste_fit(cv, h_bg, (718, 632, 380, 54))
    ax0, ay0, ax1, ay1 = round(ox + 0.117 * fw), round(oy + 0.267 * fh), round(ox + 0.899 * fw), round(oy + 0.726 * fh)
    d.rectangle((ax0, ay0, ax0 + round((ax1 - ax0) * 0.72), ay1), fill=(212, 152, 68, 255))
    paste_fit(cv, h_fr, (718, 632, 380, 54))
    d.text((718, 692), "Barra Health: vigas finas + folhas grandes nas pontas", font=f_small, fill=DIM)

    # Tooltip
    ox, oy, fw, fh = paste_fit(cv, t_bg, (718, 720, 320, 158))
    paste_fit(cv, t_fr, (718, 720, 320, 158))
    qx, qy, qw, qh = round(ox + 0.215 * fw), round(oy + 0.240 * fh), round((0.830 - 0.215) * fw), round((0.765 - 0.240) * fh)
    d.rectangle((qx, qy, qx + qw, qy + qh), outline=GREEN, width=1)
    d.text((qx + 14, qy + 8), "SOLDADO - 25 COMIDA", font=f_small, fill=INK)
    d.text((qx + 14, qy + 26), "Linha de frente da colonia", font=f_small, fill=INK)
    btn_p = w_peq.resize((72, 18), Image.Resampling.LANCZOS)
    cv.paste(btn_p, (qx + qw - 76, qy + qh - 20), btn_p)

    # Card
    ox, oy, fw, fh = paste_fit(cv, c_bg, (1120, 540, 240, 336))
    paste_fit(cv, c_fr, (1120, 540, 240, 336))
    qx, qy, qw, qh = round(ox + 0.305 * fw), round(oy + 0.165 * fh), round((0.855 - 0.305) * fw), round((0.820 - 0.165) * fh)
    d.rectangle((qx, qy, qx + qw, qy + qh), outline=GREEN, width=1)
    btn_m = w_btn.resize((40, 40), Image.Resampling.LANCZOS)
    cv.paste(btn_m, (qx + (qw - 40) // 2, qy + 8), btn_m)
    d.text((qx + 14, qy + 58), "BRASA VIVA", font=f_small, fill=INK)
    btn_k = w_btn.resize((36, 18), Image.Resampling.LANCZOS)
    cv.paste(btn_k, (qx + (qw - 36) // 2, qy + qh - 22), btn_k)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv.convert("RGB").save(OUT, optimize=True)
    print(f"Diagrama salvo em {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
