#!/usr/bin/env python3
"""Diagrama da mudança (Regra 20) — nova direção artística PIXEL CELESTE.

Uso:
    python3 tools/diagram_pixel_celeste.py

Lê a paleta e os contratos reais do repositório e desenha o PNG com a
tipografia do projeto (KiwiSoda). O bloco "DEPOIS" é gerado com as mesmas
regras de tile da direção (infill, 1 px de luz no topo, 1 px escuro na base,
aresta irregular) — não é ilustração genérica.

Saída: docs/arte/diagrama-pixel-celeste-2026-10-26.png
Requer Pillow no ambiente de arte (não é dependência do jogo).
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PALETA = json.load(open(os.path.join(ROOT, "docs/arte/paleta-celeste.json"), encoding="utf-8"))
CONTRATOS = json.load(open(os.path.join(ROOT, "docs/arte/contratos-pixel.json"), encoding="utf-8"))
FONTE = os.path.join(ROOT, "game/assets/font/KiwiSoda.ttf")
SAIDA = os.path.join(ROOT, "docs/arte/diagrama-pixel-celeste-2026-10-26.png")

TINTA = "#14100c"
PAPEL = "#f7f1e4"
PAINEL = "#efe7d6"
BORDA = "#b8ae99"
AMBAR = "#ffb347"
VERDE = "#7fd6a0"
VERMELHO = "#ff4d5a"
CINZA = "#8a7f6c"

ESCALA_SAIDA = 2  # o próprio diagrama é desenhado em 2x para ficar nítido


class Tela:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * ESCALA_SAIDA, h * ESCALA_SAIDA), PAPEL)
        self.d = ImageDraw.Draw(self.img)
        self.cache = {}

    def fonte(self, px):
        px = int(px)
        if px not in self.cache:
            self.cache[px] = ImageFont.truetype(FONTE, px * ESCALA_SAIDA)
        return self.cache[px]

    def texto(self, x, y, txt, px=13, cor=TINTA, ancora="la", espaco=0):
        f = self.fonte(px)
        if espaco:
            # espaçamento manual letra a letra (títulos)
            cx = x
            for ch in txt:
                self.d.text((cx * ESCALA_SAIDA, y * ESCALA_SAIDA), ch, font=f,
                            fill=cor, anchor=ancora)
                cx += self.d.textlength(ch, font=f) / ESCALA_SAIDA + espaco
            return cx
        self.d.text((x * ESCALA_SAIDA, y * ESCALA_SAIDA), txt, font=f, fill=cor, anchor=ancora)
        return x + self.d.textlength(txt, font=f) / ESCALA_SAIDA

    def largura(self, txt, px=13):
        return self.d.textlength(txt, font=self.fonte(px)) / ESCALA_SAIDA

    def ret(self, x, y, w, h, cor=None, contorno=None, larg=1, raio=0):
        box = [x * ESCALA_SAIDA, y * ESCALA_SAIDA, (x + w) * ESCALA_SAIDA - 1, (y + h) * ESCALA_SAIDA - 1]
        if raio:
            self.d.rounded_rectangle(box, radius=raio * ESCALA_SAIDA, fill=cor,
                                     outline=contorno, width=larg * ESCALA_SAIDA)
        else:
            self.d.rectangle(box, fill=cor, outline=contorno, width=larg * ESCALA_SAIDA)

    def circ(self, x, y, r, cor):
        self.d.ellipse([(x - r) * ESCALA_SAIDA, (y - r) * ESCALA_SAIDA,
                        (x + r) * ESCALA_SAIDA, (y + r) * ESCALA_SAIDA], fill=cor)

    def salvar(self):
        self.img.resize((self.w, self.h), Image.NEAREST).save(SAIDA, optimize=True)


def bloco_tiles(w, h, bioma):
    """Mosaico de tiles no estilo da direção: infill + borda de 1 px + aresta irregular."""
    pal = PALETA["biomas"][bioma]
    T = 8
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, h], fill=pal["infill"])
    # variação de terreno em clusters de 2–4 px
    rnd = 12345
    def sorteio():
        nonlocal rnd
        rnd = (rnd * 1103515245 + 12345) & 0x7FFFFFFF
        return rnd / 0x7FFFFFFF
    for gy in range(0, h, T):
        for gx in range(0, w, T):
            if sorteio() < 0.75:
                cor = pal["terreno"][2 + int(sorteio() * 1.99)]
                for _ in range(3 + int(sorteio() * 6)):
                    px = gx + int(sorteio() * T)
                    py = gy + int(sorteio() * T)
                    d.point((px, py), fill=cor)
                    if sorteio() < 0.6:
                        d.point((min(w - 1, px + 1), py), fill=cor)
                    if sorteio() < 0.3:
                        d.point((px, min(h - 1, py + 1)), fill=pal["terreno"][0])
            if sorteio() < 0.55:
                for _ in range(1 + int(sorteio() * 3)):
                    d.point((gx + int(sorteio() * T), gy + int(sorteio() * T)),
                            fill=pal["musgo"][int(sorteio() * 2.99)])
    # grade 8x8 discreta para mostrar o tile
    for x in range(0, w, T):
        for y in range(0, h, 3):
            if (x + y) % 2 == 0:
                d.point((x, y), fill=(0, 0, 0, 40))
    for y in range(0, h, T):
        for x in range(0, w, 3):
            if (x + y) % 2 == 0:
                d.point((x, y), fill=(0, 0, 0, 40))
    # bordas: topo claro, base escura, com irregularidade de 1 px
    for x in range(w):
        alt = 2 + (1 if (x // 3) % 2 else 0)
        d.line([(x, 0), (x, alt - 1)], fill=pal["borda"])
        base = h - 2 - (1 if (x // 4) % 2 else 0)
        d.line([(x, base), (x, h - 1)], fill=pal["trilha"])
    for x in range(0, w, 7):
        d.point((x, 1), fill=pal["infill"])
    for x in range(3, w, 11):
        d.point((x, h - 3), fill=pal["infill"])
    return img


def main():
    w, h = 1600, 1180
    t = Tela(w, h)
    t.ret(0, 0, w, h, PAPEL)
    # cabecalho
    t.ret(0, 0, w, 92, TINTA)
    t.texto(40, 22, "FUMIGA — NOVA DIREÇÃO ARTÍSTICA", 30, PAPEL, espaco=1.2)
    t.texto(40, 62, "PIXEL CELESTE · 2026-10-26 · prompt FUMIGA-PIXEL-CELESTE-v1", 14, AMBAR, espaco=0.4)
    t.texto(w - 40, 30, "DOCUMENTAÇÃO", 13, PAPEL, ancora="ra")
    t.texto(w - 40, 50, "sem código e sem asset novo", 12, BORDA, ancora="ra")

    # ------------------------------------------------------------- ANTES ----
    x, y, pw, ph = 40, 120, 740, 250
    t.ret(x, y, pw, ph, PAINEL, BORDA, raio=10)
    t.ret(x, y, 8, ph, CINZA)
    t.texto(x + 26, y + 18, "ANTES — PAPEL RECORTADO 06 (histórico)", 17, TINTA)
    t.texto(x + 26, y + 44, "Prompt FUMIGA-PAPEL-v4-CHROMA · decisão de 2026-10-08", 12, CINZA)
    papel_pal = ["#8a5a33", "#b06a2e", "#c98d3a", "#5c9c4c", "#2f4a2e", "#f7f1e4"]
    for i, c in enumerate(papel_pal):
        t.ret(x + 26 + i * 46, y + 74, 40, 40, c, BORDA)
    linhas = [
        "• material tátil, camadas rasas, sombras suaves",
        "• arte instalada continua no jogo até a migração",
        "• preservado byte a byte em historico/ESTILO_OFICIAL-v4-PAPEL.md",
    ]
    for i, l in enumerate(linhas):
        t.texto(x + 26, y + 132 + i * 26, l, 13, TINTA)
    t.texto(x + 26, y + ph - 30, "NÃO usar este estilo em gerações novas.", 13, VERMELHO)

    # ------------------------------------------------------------ DEPOIS ----
    x2 = 820
    t.ret(x2, y, pw, ph, PAINEL, AMBAR, larg=2, raio=10)
    t.ret(x2, y, 8, ph, AMBAR)
    t.texto(x2 + 26, y + 18, "DEPOIS — PIXEL CELESTE (vigente)", 17, TINTA)
    t.texto(x2 + 26, y + 44, "canvas de jogo 320×180 ×3 · tiles 8×8 · 16 cores por bioma", 12, CINZA)
    tiles = bloco_tiles(210, 120, "planicie")
    ampliado = tiles.resize((210 * 1, 120 * 1), Image.NEAREST)
    t.img.paste(ampliado.resize((tiles.width * ESCALA_SAIDA, tiles.height * ESCALA_SAIDA), Image.NEAREST),
                ((x2 + 26) * ESCALA_SAIDA, (y + 70) * ESCALA_SAIDA), ampliado.resize((tiles.width * ESCALA_SAIDA, tiles.height * ESCALA_SAIDA), Image.NEAREST))
    regras = [
        "infill escuro + 1 px de luz no topo",
        "1 px escuro na base · aresta irregular",
        "sem AA · sem gradiente · sem preto puro",
        "zoom só inteiro: 1×, 2×, 3×",
    ]
    for i, r in enumerate(regras):
        t.texto(x2 + 260, y + 76 + i * 24, "• " + r, 12, TINTA)
    t.texto(x2 + 26, y + 206, "UI/HUD em alta resolução (mundo UI do Celeste)", 12, CINZA)
    t.texto(x2 + 26, y + 224, "próxima fase: F0b — frame + zoom + autotile", 13, AMBAR)

    # ------------------------------------------------------------ PALETA ----
    y3 = 392
    t.ret(40, y3, 1520, 214, PAINEL, BORDA, raio=10)
    t.texto(66, y3 + 16, "PALETA — 16 CORES DE CENA + 3 DE FUNDO POR BIOMA (docs/arte/paleta-celeste.json)", 15, TINTA)
    nomes = [("planicie", "PLANÍCIE"), ("floresta", "FLORESTA"), ("pantano", "PÂNTANO"),
             ("deserto", "DESERTO"), ("outono", "OUTONO"), ("gelo", "GELO")]
    for i, (bid, rotulo) in enumerate(nomes):
        b = PALETA["biomas"][bid]
        cena = [b["infill"]] + b["terreno"] + [b["borda"]] + b["musgo"] + [b["trilha"]] + b["acento"] + b["vegetacao"]
        linha = i // 2
        col = i % 2
        bx = 66 + col * 760
        by = y3 + 46 + linha * 52
        t.texto(bx, by + 10, rotulo, 11, TINTA)
        for j, cor in enumerate(cena):
            t.ret(bx + 92 + j * 17, by + 2, 15, 24, cor, "#00000000")
        for j, cor in enumerate(b["fundo"]):
            t.ret(bx + 92 + 16 * 17 + 8 + j * 17, by + 2, 15, 24, cor, "#00000000")
    t.texto(66, y3 + 196, "rampa de 4 passos com hue-shift · sombra fria, luz quente · rampas do Celeste sobre o pastel terroso aprovado", 11, CINZA)

    # --------------------------------------------------------------- ESCALA --
    y4 = 622
    t.ret(40, y4, 740, 196, PAINEL, BORDA, raio=10)
    t.texto(66, y4 + 16, "ESCALA NATIVA — nativo = round(mundo / 3)", 15, TINTA)
    castas = [("Arpão", 13), ("Cortadeira", 15), ("Bala", 21), ("Rainha", 63), ("Dinoponera", 109)]
    base_y = y4 + 136            # base comum das caixas
    col_w = 136
    for i, (nome, n) in enumerate(castas):
        cx = 66 + i * col_w
        lado = min(n, 78)
        topo = base_y - lado
        t.ret(cx, topo, lado, lado, PALETA["biomas"]["planicie"]["terreno"][2],
              PALETA["biomas"]["planicie"]["borda"])
        t.ret(cx, topo, lado, 2, PALETA["biomas"]["planicie"]["borda"])
        t.texto(cx, base_y + 8, nome, 11, TINTA)
        t.texto(cx, base_y + 23, f"{n} px", 11, CINZA)
    t.texto(66, y4 + 172, "desenho = nativo × 3 × zoom inteiro · chefes em célula 22×22 · flores 64 px", 11, CINZA)

    # --------------------------------------------------------------- FASES ---
    y5 = 622
    t.ret(820, y5, 740, 196, PAINEL, BORDA, raio=10)
    t.texto(846, y5 + 16, "18 FASES — docs/arte/FASES_PIXEL_CELESTE.md", 15, TINTA)
    fases = [
        ("F0a", "feito", VERDE), ("F0b", "frame", AMBAR), ("F0b-2", "pixeliza", AMBAR),
        ("F0c", "piloto", AMBAR), ("F1", "UI", AMBAR), ("F2", "castas", AMBAR),
        ("F3a", "árvore", AMBAR), ("F3b", "santuários", AMBAR), ("F3c", "flores", AMBAR),
        ("F4", "chefes", AMBAR), ("F5a", "TITLE", AMBAR), ("F5b", "loading", AMBAR),
        ("F5c", "Noite Branca", AMBAR), ("F5d", "21 painéis", VERMELHO), ("F6", "inimigos", AMBAR),
        ("F7", "ninho", AMBAR), ("F8", "Pálida", VERMELHO), ("F9", "distribuição", AMBAR),
    ]
    for i, (fid, rot, cor) in enumerate(fases):
        col = i % 3
        linha = i // 3
        bx = 846 + col * 238
        by = y5 + 46 + linha * 22
        t.circ(bx + 4, by + 6, 4, cor)
        t.texto(bx + 16, by, f"{fid}", 11, TINTA)
        t.texto(bx + 16 + t.largura(fid, 11) + 8, by, rot, 10, CINZA)
    t.texto(846, y5 + 180, "verde = concluída · âmbar = pendente · vermelho = bloqueada", 10, CINZA)

    # ------------------------------------------------- ARQUIVOS/VERIFICACAO -
    y6 = 838
    t.ret(40, y6, 740, 214, PAINEL, BORDA, raio=10)
    t.texto(66, y6 + 16, "ARQUIVOS DA RODADA", 15, TINTA)
    arquivos = [
        "docs/arte/ESTILO_OFICIAL.md — prompt e ficha",
        "docs/arte/FASES_PIXEL_CELESTE.md — F0a → F9",
        "docs/arte/paleta-celeste.json — 6 biomas + Pálida selada",
        "docs/arte/contratos-pixel.json — tamanho nativo",
        "docs/arte/direcao-vigente.json — decisão legível",
        "REGRAS_DE_TRABALHO.md (Regra 6) + MEGA_ARQUIVO.md",
    ]
    for i, a in enumerate(arquivos):
        t.texto(66, y6 + 48 + i * 24, "• " + a, 12, TINTA)

    t.ret(820, y6, 740, 214, PAINEL, BORDA, raio=10)
    t.texto(846, y6 + 16, "VERIFICAÇÃO DESTA RODADA", 15, TINTA)
    testes = [
        ("node game/test/art-pixel.mjs", "direção, paleta, contratos e fases"),
        ("node tools/check_art_handoff.mjs", "prompt idêntico guia ↔ MEGA"),
        ("node game/test/docs.mjs", "6 documentos byte a byte"),
        ("npm run test:quick", "32/32 testes rápidos"),
        ("git diff --check", "sem espaço em branco inválido"),
    ]
    for i, (cmd, desc) in enumerate(testes):
        t.texto(846, y6 + 48 + i * 30, "✓ " + cmd, 12, TINTA)
        t.texto(846 + 22, y6 + 64 + i * 30, desc, 10, CINZA)

    # -------------------------------------------------------------- rodape --
    t.ret(40, 1072, 1520, 68, TINTA)
    t.texto(66, 1088, "Escopo desta rodada: SOMENTE documentação.", 16, PAPEL)
    t.texto(66, 1114, "Nenhum asset substituído · nenhum runtime alterado · nenhum upload no Drive · nada publicado no GitHub", 12, BORDA)
    t.texto(1534, 1096, "próxima: F0b", 20, AMBAR, ancora="ra")

    t.salvar()
    print("ok", SAIDA, os.path.getsize(SAIDA), "bytes")


if __name__ == "__main__":
    main()
