#!/usr/bin/env python3
"""Diagrama da mudança (Regra 20) + prova visual em 320x180 (aceite da F0b-2).

Uso:
    python3 tools/diagram_pixelize_f0b2.py

Lê os relatórios que tools/pixelize.py escreveu em docs/arte/provas-f0b-2/,
reconstrói o ANTES com o algoritmo que existia antes (redução direta por
bilinear, sem recorte de paleta) a partir da MESMA fonte, e desenha o DEPOIS
com os PNGs nativos realmente produzidos. Nenhum dos dois lados é ilustração
genérica: os dois saem dos mesmos arquivos.

Saídas:
    docs/arte/provas-f0b-2/prova-320x180.png          cena de revisão
    docs/arte/diagrama-f0b2-pipeline-2026-10-26.png   diagrama ANTES -> DEPOIS

Requer Pillow no ambiente de arte (bash tools/setup-pixel.sh).
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import pixelize  # noqa: E402  (reusa recorte, chroma e quantização do pipeline)

DIR = os.path.join(ROOT, "docs", "arte", "provas-f0b-2")
FICHAS = json.load(open(os.path.join(DIR, "fichas.json"), encoding="utf-8"))
PALETA_DOC = json.load(open(os.path.join(ROOT, "docs", "arte", "paleta-celeste.json"), encoding="utf-8"))
FONTE = os.path.join(ROOT, "game", "assets", "font", "KiwiSoda.ttf")
SAIDA = os.path.join(ROOT, "docs", "arte", "diagrama-f0b2-pipeline-2026-10-26.png")
CENA = os.path.join(DIR, "prova-320x180.png")

TINTA = "#14100c"
PAPEL = "#f7f1e4"
PAINEL = "#efe7d6"
BORDA = "#b8ae99"
AMBAR = "#ffb347"
VERDE = "#7fd6a0"
VERMELHO = "#ff4d5a"
CINZA = "#8a7f6c"

ESCALA = 2


# --------------------------------------------------------------------- cena --
def montar_cena(pecas):
    """Cena de revisão em 320x180: as três peças no tamanho NATIVO em que
    caem no buffer, ampliada x3 para dar de olhar, com um canto em 1:1."""
    b = PALETA_DOC["biomas"]["planicie"]
    fundo = pixelize.hex_para_rgb(b["fundo"][1])
    chao = pixelize.hex_para_rgb(b["terreno"][1])
    borda = pixelize.hex_para_rgb(b["borda"])
    trilha = pixelize.hex_para_rgb(b["trilha"])

    cena = Image.new("RGB", (320, 180), fundo)
    d = ImageDraw.Draw(cena)
    # faixa de chão: 1 px de luz no topo, 1 px escuro na base (construção do
    # Celeste que a Regra 6 exige do terreno).
    d.rectangle([0, 104, 319, 179], fill=chao)
    d.line([(0, 104), (319, 104)], fill=borda)
    d.line([(0, 179), (319, 179)], fill=trilha)

    pedra = Image.open(os.path.join(ROOT, pecas["pedra"]["nativo"]["arquivo"])).convert("RGBA")
    formiga = Image.open(os.path.join(ROOT, pecas["cortadeira"]["nativo"]["arquivo"])).convert("RGBA")
    painel = Image.open(os.path.join(ROOT, pecas["painel"]["nativo"]["arquivo"])).convert("RGBA")

    # pedras em três tamanhos de encaixe: 21 px nativos é o prop da Planície
    for x, base in ((28, 150), (150, 140), (272, 158)):
        cena.paste(pedra, (x - pedra.width // 2, base - pedra.height), pedra)
    # duas cortadeiras de 15 px
    for x, base in ((96, 152), (208, 168)):
        cena.paste(formiga, (x - formiga.width // 2, base - formiga.height), formiga)
    # o painel é peça de HUD (fora do mundo): entra no topo como moldura de
    # revisão, no tamanho nativo da grade de 3 px.
    cena.paste(painel, (112, 14), painel)

    saida = Image.new("RGB", (960, 540), TINTA)
    saida.paste(pixelize.ampliar(cena, 3), (0, 0))
    # canto em 1:1: a prova tem que ser julgada no tamanho em que o jogador vê
    saida.paste(cena, (960 - 320 - 6, 540 - 180 - 6))
    ImageDraw.Draw(saida).rectangle(
        [960 - 320 - 7, 540 - 180 - 7, 960 - 6, 540 - 6], outline=BORDA)
    saida.save(CENA)
    return saida


# -------------------------------------------------------------------- antes --
def antes_ingenuo(ficha):
    """O que acontecia SEM o pipeline: reduzir a fonte por bilinear direto
    para o tamanho nativo, sem recortar na paleta e sem alfa binário."""
    im = Image.open(os.path.join(ROOT, ficha["fonte"])).convert("RGBA")
    familia, chave, tol = pixelize.detectar_chroma(im)
    tol = ficha.get("chroma_tol", tol)
    mascara = pixelize.inundar_chroma(im, chave, tol)
    canal = 1 if familia == "verde" else 2
    pixelize.despill(im, mascara, canal)
    pixelize.aplicar_alfa(im, mascara)
    caixa = pixelize.caixa_conteudo(im)
    recorte = im.crop(caixa)
    alvo = (ficha["nativo"][0], ficha["nativo"][1])
    # redução "de qualquer jeito": interpolação bilinear, a fonte inteira
    # esmagada no tamanho nativo, sem preservar proporção.
    antes = recorte.resize(alvo, Image.BILINEAR)
    px = antes.load()
    cores = set()
    semitransparentes = 0
    for y in range(alvo[1]):
        for x in range(alvo[0]):
            p = px[x, y]
            if p[3] not in (0, 255):
                semitransparentes += 1
            if p[3] > 0:
                cores.add(p[:3])
    return antes, len(cores), semitransparentes


# ------------------------------------------------------------------ desenho --
class Tela:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * ESCALA, h * ESCALA), PAPEL)
        self.d = ImageDraw.Draw(self.img)
        self.cache = {}

    def fonte(self, px):
        px = int(px)
        if px not in self.cache:
            self.cache[px] = ImageFont.truetype(FONTE, px * ESCALA)
        return self.cache[px]

    def texto(self, x, y, txt, px=13, cor=TINTA, ancora="la"):
        f = self.fonte(px)
        self.d.text((x * ESCALA, y * ESCALA), txt, font=f, fill=cor, anchor=ancora)

    def caixa(self, x, y, w, h, cor=PAINEL, borda=BORDA):
        self.d.rectangle([x * ESCALA, y * ESCALA, (x + w) * ESCALA, (y + h) * ESCALA],
                         fill=cor, outline=borda, width=ESCALA)

    def imagem(self, im, x, y, escala=1):
        if escala != 1:
            im = im.resize((im.width * escala, im.height * escala), Image.NEAREST)
        self.img.paste(im, (int(x * ESCALA), int(y * ESCALA)), im if im.mode == "RGBA" else None)

    def salvar(self, caminho):
        self.img.save(caminho)


def main():
    relatorios = {}
    fichas = {}
    for f in FICHAS["pecas"]:
        with open(os.path.join(DIR, f["id"] + ".json"), encoding="utf-8") as fh:
            relatorios[f["id"]] = json.load(fh)
        fichas[f["id"]] = f

    cena = montar_cena(relatorios)
    print("✓ %s (%dx%d)" % (os.path.relpath(CENA, ROOT), cena.width, cena.height))

    L = 1000
    t = Tela(L, 1500)
    t.texto(30, 30, "PIPELINE DE PIXELIZAÇÃO — FASE F0b-2", 30)
    t.texto(30, 62, "FUMIGA — Colônia Eterna · pixel art nativa estilo Celeste", 15, CINZA)
    t.texto(L - 30, 30, "2026-10-26", 18, CINZA, ancora="ra")
    t.texto(L - 30, 52, "tools/pixelize.py · docs/arte/provas-f0b-2/", 13, CINZA, ancora="ra")

    # ── os cinco passos ──────────────────────────────────────────────────────
    y = 92
    passos = [
        ("1", "RECORTE", "chroma medido\nnas quinas"),
        ("2", "DESPILL", "franja da borda\nsem contaminação"),
        ("3", "REDUÇÃO", "média de área\nno tamanho nativo"),
        ("4", "PALETA", "vizinho mais próximo\nsem dither"),
        ("5", "VALIDAÇÃO", "alfa binário\npaleta exata"),
    ]
    larg = (L - 60 - 4 * 12) // 5
    for i, (n, nome, desc) in enumerate(passos):
        x = 30 + i * (larg + 12)
        t.caixa(x, y, larg, 74)
        t.texto(x + 10, y + 10, n, 20, AMBAR)
        t.texto(x + 30, y + 12, nome, 15)
        for j, linha in enumerate(desc.split("\n")):
            t.texto(x + 10, y + 38 + j * 14, linha, 12, CINZA)
        if i < 4:
            t.texto(x + larg + 3, y + 30, ">", 16, BORDA)

    # ── as três peças ────────────────────────────────────────────────────────
    y = 190
    for f in FICHAS["pecas"]:
        rel = relatorios[f["id"]]
        antes, cores_antes, semi_antes = antes_ingenuo(f)
        alt = 250
        t.caixa(30, y, L - 60, alt)

        t.texto(46, y + 14, f["titulo"].upper(), 18)
        t.texto(46, y + 36, "%s · %s" % (f["categoria"], f["bioma"]), 12, CINZA)
        t.texto(L - 46, y + 14, "%dx%d px nativos" % tuple(f["nativo"]), 18, ancora="ra")
        t.texto(L - 46, y + 36, f["nativo_calculo"], 12, CINZA, ancora="ra")

        nativo = Image.open(os.path.join(ROOT, rel["nativo"]["arquivo"])).convert("RGBA")
        zoom = max(1, min(8, 150 // max(nativo.width, nativo.height)))

        col = 46
        for rotulo, img, escala in (("FONTE", Image.open(os.path.join(ROOT, f["fonte"])).convert("RGBA"), None),
                                    ("ANTES — redução direta", antes, 6),
                                    ("DEPOIS — pipeline", nativo, zoom)):
            t.texto(col, y + 62, rotulo, 13, VERMELHO if rotulo.startswith("ANTES") else (VERDE if rotulo.startswith("DEPOIS") else CINZA))
            if escala is None:
                miniatura = img.copy()
                miniatura.thumbnail((140, 140), Image.NEAREST)
                t.imagem(miniatura, col, y + 80)
                t.texto(col, y + 230, "%dx%d" % img.size, 11, CINZA)
            else:
                t.imagem(img, col, y + 80, escala)
                t.texto(col, y + 230, "%dx%d ampliado %dx" % (img.width, img.height, escala), 11, CINZA)
            col += 300

        # números conferidos
        nx = 46
        ny = y + 96
        linhas = [
            ("cores na peça (todas da paleta)", "%d" % rel["nativo"]["contagem_de_cores"], VERDE),
            ("pixels requantizados", "%d de %d" % (rel["quantizacao"]["pixels_ajustados"],
                                                   rel["nativo"]["pixels_opacos"]), VERDE),
            ("distância média até a paleta", "%.0f" % rel["quantizacao"]["distancia_media"], VERDE),
            ("px semitransparentes", "0", VERDE),
            ("ANTES: cores distintas", "%d" % cores_antes, VERMELHO),
            ("ANTES: px semitransparentes", "%d" % semi_antes, VERMELHO),
        ]
        for rot, val, cor in linhas:
            t.texto(nx, ny, rot, 13, CINZA)
            t.texto(nx + 240, ny, val, 13, cor, ancora="ra")
            ny += 20
        t.texto(nx, ny + 4, "validação: %s" % ("OK" if rel["validacao"]["ok"] else "REPROVADA"), 14,
                VERDE if rel["validacao"]["ok"] else VERMELHO)
        t.texto(nx + 240, ny + 4, "grade: %s" % ("bloco %d px" % rel["grade"]["bloco_px"]
                if rel["grade"]["tem_grade"] else "fonte lisa"), 12, CINZA, ancora="ra")
        y += alt + 16

    # ── a cena de revisão ────────────────────────────────────────────────────
    t.texto(30, y, "REVISÃO VISUAL EM 320×180 — as três peças no tamanho em que caem no buffer", 18)
    y += 26
    t.caixa(30, y, L - 60, 560, cor=TINTA, borda=BORDA)
    cena_peq = cena.resize((L - 62, int(cena.height * (L - 62) / cena.width)), Image.LANCZOS)
    t.imagem(cena_peq, 31, y + 1)
    y += 576
    t.texto(30, y, "A cena é o buffer inteiro ampliado 3× (960×540); o canto inferior direito mostra o 1:1.",
            12, CINZA)
    t.texto(30, y + 16, "Nenhuma das três entra no jogo por esta rodada: elas provam a ferramenta. A integração é a F0c.",
            12, CINZA)

    t.salvar(SAIDA)
    print("✓ %s (%dx%d)" % (os.path.relpath(SAIDA, ROOT), t.img.width, t.img.height))


if __name__ == "__main__":
    main()
