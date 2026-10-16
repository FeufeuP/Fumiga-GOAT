#!/usr/bin/env python3
"""Diagrama da mudança — sprites dos HUDs no formato ORIGINAL + texto centralizado.

Gera `slice-box/diagrama-mudanca-hud-original.png` a partir dos assets reais,
com um porte fiel do motor (`game/js/paper_hud.js`):

- ANTES (bug): as molduras eram fatiadas e ESTICADAS/repetidas — os ornamentos
  apareciam encolhidos (6,5%–14% do tamanho nativo) e as bordas deformadas.
- DEPOIS (correção 2026-10-16): cada pintura é desenhada INTEIRA, em escala
  uniforme (contain + centrada) na proporção original do sprite; e todo texto
  fica CENTRALIZADO na área permitida (papel liso medido) da pintura.

Uso: python3 tools/make_hud_diagrams.py            (dentro do repositório)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PAPER = ROOT / "game/assets/ui/paper"
FONT_TTF = ROOT / "game/assets/font/KiwiSoda.ttf"
OUT = ROOT / "slice-box/diagrama-mudanca-hud-original.png"
OUT_GAL = ROOT / "slice-box/diagrama-exemplo-hud.png"

def font(px): return ImageFont.truetype(str(FONT_TTF), px)
F_TITLE, F_SUB, F_SEC = font(30), font(15), font(19)
F_LBL, F_SMALL, F_TAG, F_TIP = font(14), font(12), font(16), font(13)
CREAM, GOLD, DIM = (240, 226, 188), (255, 212, 121), (183, 165, 132)
RED, GREEN, DARK = (255, 110, 110), (127, 214, 160), (23, 17, 12)
INK = (73, 53, 33)

# ---- porte do motor (game/js/paper_hud.js) ------------------------------------
PAPER_SLICES = {
    "panel":   {"x": [.38,.45,.57,.65], "y": [.32,.39,.57,.69]},
    "health":  {"x": [.18,.38,.58,.79], "y": [.35,.42,.58,.65]},
    "banner":  {"x": [.39,.47,.60,.79], "y": [.32,.42,.56,.65]},
    "minimap": {"x": [.27,.40,.54,.62], "y": [.38,.44,.57,.66]},
    "card":    {"x": [.35,.44,.55,.68], "y": [.25,.34,.63,.74]},
    "pause":   {"x": [.32,.43,.55,.68], "y": [.31,.38,.59,.70]},
    "tooltip": {"x": [.35,.44,.57,.70], "y": [.36,.44,.59,.69]},
}
EDGE_SCALE = {"panel":.065,"health":.12,"banner":.14,"minimap":.10,"card":.085,"pause":.07,"tooltip":.065}
PAPER_QUIET = {   # área permitida (papel liso) medida de cada pintura
    "panel": (.254,.281,.838,.680), "health": (.183,.444,.838,.593),
    "banner": (.220,.300,.780,.720), "minimap": (.233,.279,.704,.753),
    "card": (.425,.171,.811,.744), "pause": (.250,.219,.776,.757),
    "tooltip": (.246,.278,.812,.699),
}
def paper_source(kind, w, h):
    if kind in ("tooltip","pause"): return kind
    if kind in ("panel","card"):
        return "card" if h > w*1.12 else "pause" if h > w*.68 else "panel"
    return kind

def _src(kind):
    s = paper_source(kind, 0, 0) if kind in ("tooltip","pause") else None
    return s

def paper_fit(kind, w, h):
    """Contain + centrado: mesma conta do motor (paperFit)."""
    src = paper_source(kind, w, h)
    img = Image.open(PAPER / f"{src}.png").convert("RGBA")
    sw, sh = img.size
    sc = min(w/sw, h/sh)
    fw, fh = max(1, round(sw*sc)), max(1, round(sh*sc))
    return img, src, fw, fh, round((w-fw)/2), round((h-fh)/2)

def quiet_box(kind, x, y, w, h):
    """Área permitida em coordenadas de destino (porte de paperQuiet)."""
    img, src, fw, fh, ox, oy = paper_fit(kind, w, h)
    q = PAPER_QUIET[src]
    return (x+ox+q[0]*fw, y+oy+q[1]*fh, (q[2]-q[0])*fw, (q[3]-q[1])*fh)

def draw_new(kind, w, h):
    """DEPOIS: pintura inteira, escala uniforme (sem nenhuma deformação)."""
    img, src, fw, fh, ox, oy = paper_fit(kind, w, h)
    out = Image.new("RGBA", (w, h), (0,0,0,0))
    out.paste(img.resize((fw, fh), Image.LANCZOS), (ox, oy))
    return out

def _cuts(cuts, source, target, scale):
    src = [0]+[round(v*source) for v in cuts]+[source]
    extra = max(0, target-source*scale)
    dst = [round(v*scale+(extra/2 if i>=2 else 0)+(extra/2 if i>=4 else 0)) for i,v in enumerate(src)]
    dst[-1] = target
    return src, dst

def draw_old(kind, w, h):
    """ANTES (bug): fatias com escala travada (ornamentos encolhidos) e
    corredores esticados até preencher o retângulo pedido."""
    src = paper_source(kind, w, h)
    img = Image.open(PAPER / f"{src}.png").convert("RGBA")
    sw, sh = img.size
    m = PAPER_SLICES[src]
    s = min(w/sw, h/sh, EDGE_SCALE[src])
    sx, dx = _cuts(m["x"], sw, w, s)
    sy, dy = _cuts(m["y"], sh, h, s)
    out = Image.new("RGBA", (w, h), (0,0,0,0))
    for row in range(5):
        for col in range(5):
            dw, dh = dx[col+1]-dx[col], dy[row+1]-dy[row]
            if dw <= 0 or dh <= 0: continue
            piece = img.crop((sx[col], sy[row], sx[col+1], sy[row+1])).resize((dw, dh), Image.LANCZOS)
            out.paste(piece, (dx[col], dy[row]))
    return out

# ---- desenho do diagrama ------------------------------------------------------
W, H = 1400, 1900
img = Image.new("RGBA", (W, H), DARK+(255,))
d = ImageDraw.Draw(img)

def text(xy, s, f, fill=CREAM, anchor="la"):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)

def tag(x, y, label, col):
    w = d.textlength(label, font=F_TAG) + 18
    d.rectangle([x, y, x+w, y+24], fill=col+(40,), outline=col, width=1)
    text((x+9, y+3), label, F_TAG, col)

def paste(box, x, y):
    img.paste(box, (x, y), box)

text((40, 22), "DIAGRAMA DA MUDANÇA — SPRITES NO FORMATO ORIGINAL + TEXTO CENTRALIZADO", F_TITLE, (242,231,200))
text((42, 62), "2026-10-16  ·  game/js/paper_hud.js + game.js + tutorial.js + nest.js + ui.js  ·  37/37 testes verdes  ·  render com os assets reais do jogo", F_SUB, DIM)
d.line([40, 92, 1360, 92], fill=(74,58,40), width=2)

# ---------- regra
text((40, 102), "REGRA — 1) a pintura é desenhada INTEIRA e em escala uniforme (proporção original do sprite);", F_SEC, GOLD)
text((40, 126), "              2) o texto é CENTRALIZADO na área permitida (papel liso medido) de cada pintura.", F_SEC, GOLD)

# ---------- cartões da regra (antes x depois, 1:1)
yP = 158; boxH = 176
d.rectangle([40, yP, 660, yP+boxH], fill=(30,22,16,255), outline=RED, width=1)
text((56, yP+8), "ANTES — o sprite era fatiado e deformado", F_LBL, RED)
a_old = draw_old("panel", 280, 149)
paste(a_old, 56, yP+34)
text((356, yP+40), "ornamentos a 6,5% do", F_SMALL, RED)
text((356, yP+58), "tamanho nativo (fatiados)", F_SMALL, RED)
text((356, yP+82), "bordas ESTICADAS até", F_SMALL, RED)
text((356, yP+100), "preencher o retângulo", F_SMALL, RED)
text((356, yP+124), "proporção do sprite perdida", F_SMALL, DIM)
d.rectangle([700, yP, 1360, yP+boxH], fill=(30,22,16,255), outline=GREEN, width=1)
text((716, yP+8), "DEPOIS — pintura inteira, proporção original", F_LBL, GREEN)
a_new = draw_new("panel", 280, 149)
paste(a_new, 716, yP+34)
text((1016, yP+40), "escala uniforme (contain)", F_SMALL, GREEN)
text((1016, yP+58), "+ centrada no espaço", F_SMALL, GREEN)
text((1016, yP+82), "vinhas e nós no tamanho", F_SMALL, GREEN)
text((1016, yP+100), "exato da pintura", F_SMALL, GREEN)
text((1016, yP+124), "moldura e interior intactos", F_SMALL, DIM)

# ---------- 1. pares ANTES × DEPOIS por HUD
y1 = yP + boxH + 26
text((40, y1), "1. CADA HUD — deformação (ANTES)  >>  sprite original (DEPOIS), lado a lado", F_SEC, GOLD)
CASES = [
    ("painel da colônia · 360×192 (960×512 × 0,375)", "panel", 360, 192),
    ("loja / painel expandido · 280×149 (960×512)", "panel", 280, 149),
    ("tábua de onda / barra do chefe · 400×80 (960×192)", "banner", 400, 80),
    ("cartão do draft · 260×387 (848×1264)", "card", 260, 387),
]
y = y1 + 30
for label, kind, w, h in CASES:
    text((40, y), label, F_LBL, CREAM)
    tag(40, y+18, "ANTES", RED); tag(40+w+20, y+18, "DEPOIS", GREEN)
    paste(draw_old(kind, w, h), 40, y+48)
    paste(draw_new(kind, w, h), 40+w+20, y+48)
    y += 48 + h + 26

# ---------- 2. texto centralizado na área permitida
y2 = y + 2
text((40, y2), "2. TEXTO — ANTES encostava no canto/ornamento; DEPOIS centralizado na ÁREA PERMITIDA (linha ciano)", F_SEC, GOLD)
y = y2 + 30
label, kind, w, h, lines = ("painel da colônia 360×192", "panel", 360, 192,
    ["VASO DA PLANÍCIE • IRMÃS 5/16", "SILENCIOSA ▓▓▓▓ 22/30", "ANEL 3 • SEMENTE 128", "ESSÊNCIA 12"])
tag(40, y, "ANTES", RED)
tag(40+w+20, y, "DEPOIS", GREEN)
art = draw_new(kind, w, h)
dd = ImageDraw.Draw(art)
for i, L in enumerate(lines):
    dd.text((10, 10 + i*16), L, font=F_TIP, fill=INK)
paste(art, 40, y+30)
art2 = draw_new(kind, w, h)
dd2 = ImageDraw.Draw(art2)
q = quiet_box(kind, 0, 0, w, h)
dd2.rectangle([q[0], q[1], q[0]+q[2], q[1]+q[3]], outline=(0,255,255), width=1)
for i, L in enumerate(lines):
    dd2.text((q[0]+q[2]/2, q[1] + 3 + i*16), L, font=F_TIP, fill=INK, anchor="ma")
paste(art2, 40+w+20, y+30)
y += 30 + h + 8
text((40, y), "ANTES: texto no canto, sobre a moldura/vinhas", F_SMALL, RED)
text((40+w+20, y), "DEPOIS: grupo centralizado no papel liso (motor usa paperQuiet)", F_SMALL, GREEN)

# ---------- 3. caixas atualizadas
y3 = y + 30
text((40, y3), "3. CAIXAS DOS HUDs — todas na proporção original da sua pintura (nenhum sprite é esticado)", F_SEC, GOLD)
rows = [
    ("painel da colônia / expandido", "360×192  = 960×512"),
    ("barra/fila da loja", "faixa inferior 10..950 (informativo)"),
    ("tábua de onda (invasão)", "380×76  = 960×192"),
    ("barra do chefe", "400×80  = 960×192 · gaster 150×21"),
    ("banner de evento", "560×112  = 960×192"),
    ("tooltip da loja", "280×149  = 960×512"),
    ("cartões do draft (3)", "260×387  = 848×1264"),
    ("profecias / memórias", "360×192  = 960×512"),
    ("cartão do tutorial", "370×197  = 960×512"),
    ("tooltip da câmara (ninho)", "340×181  = 960×512"),
    ("minimapa", "208×155  = 960×717"),
    ("pausa (2 painéis)", "355×440  = 928×1152"),
    ("tooltip geral (mutações)", "280×138  = 960×475"),
]
for i, (nome, caixa) in enumerate(rows):
    cx = 40 + (i % 2) * 660; cy = y3 + 28 + (i // 2) * 22
    d.line([cx, cy-2, cx+5, cy+4], fill=GREEN, width=2)
    d.line([cx+5, cy+4, cx+13, cy-8], fill=GREEN, width=2)
    text((cx+20, cy-8), nome, F_SMALL, CREAM)
    text((cx+260, cy-8), caixa, F_SMALL, DIM)

# ---------- resultado
yE = y3 + 28 + (len(rows)//2) * 22 + 12
d.line([40, yE, 1360, yE], fill=(74,58,40), width=2)
text((40, yE+12), "RESULTADO", F_SEC, GOLD)
checks = ["nenhuma pintura deformada", "ornamentos no tamanho original",
          "texto centralizado no papel liso", "nada sobre ornamentos",
          "37/37 testes verdes"]
for i, s in enumerate(checks):
    cx = 40 + (i % 3)*460; cy = yE+50 + (i//3)*26
    d.line([cx, cy-2, cx+5, cy+4], fill=GREEN, width=2)
    d.line([cx+5, cy+4, cx+13, cy-8], fill=GREEN, width=2)
    text((cx+20, cy-8), s, F_SMALL, CREAM)
text((40, yE+104), "Área permitida (PAPER_QUIET) medida pixel a pixel em cada pintura e exposta pelo motor em paperQuiet(kind, x, y, w, h).", F_SMALL, DIM)
text((40, yE+122), "Arquivos: game/js/paper_hud.js (contain + paperQuiet) · game/js/game.js · tutorial.js · nest.js · ui.js", F_SMALL, DIM)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.convert("RGB").save(OUT, optimize=True)
print("ok", OUT, img.size)

# ================= GALERIA (substitui o diagrama de exemplo com o motor novo) =====
GW, GH = 1400, 1560
img = Image.new("RGBA", (GW, GH), DARK+(255,)); d = ImageDraw.Draw(img)
text((40, 22), "DIAGRAMA DE EXEMPLO — SLICE-BOX APLICADO (SPRITES ORIGINAIS + TEXTO CENTRALIZADO)", F_TITLE, (242,231,200))
text((42, 62), "renderizado com o motor atual (paper_hud.js): pintura inteira em escala uniforme; texto centralizado na área permitida", F_SUB, DIM)
d.line([40, 92, 1360, 92], fill=(74,58,40), width=2)
GAL = [
    ("painel da colônia 360×192", "panel", 360, 192,
     ["VASO DA PLANÍCIE • IRMÃS 5/16", "SILENCIOSA ▓▓▓▓ 22/30", "ANEL 3 • SEMENTE 128", "ESSÊNCIA 12"]),
    ("tábua de onda / invasão 380×76", "banner", 380, 76, ["INVASÃO 2/6", "ONDA 3/8"]),
    ("barra do chefe 400×80 + gaster", "banner", 400, 80, ["PÁLIDO, FILHO DA NÉVOA • FASE 2"]),
    ("tooltip da loja 280×149", "panel", 280, 149, ["▶ ATIRADORA", "ATIRADORA", "Chama curta, guarda a trilha."]),
    ("cartão do draft 260×387", "card", 260, 387, ["COMUM", "ATIRADORA", "Descrição do cartão", "quebrada e centralizada."]),
    ("profecias / memórias 360×192", "panel", 360, 192, ["VATICÍNIO DA CHUVA", "A REGIÃO APARECE ÚMIDA.", "+40 ESSÊNCIA"]),
    ("pausa 355×440", "pause", 355, 440, ["PAUSA", "CONTINUAR", "OPÇÕES", "COMO JOGAR"]),
    ("câmara do ninho 340×181", "panel", 340, 181, ["CÂMARA REAL (NÍVEL 2/3)", "Amplia a rainha e destrava", "a postura de guerra.", "CUSTO: 120 COMIDA"]),
]
y = 108
for nome, kind, w, h, lines in GAL:
    art = draw_new(kind, w, h)
    q = quiet_box(kind, 0, 0, w, h)
    dd = ImageDraw.Draw(art)
    dd.rectangle([q[0], q[1], q[0]+q[2], q[1]+q[3]], outline=(0,255,255), width=1)
    for i, L in enumerate(lines):
        dd.text((q[0]+q[2]/2, q[1] + 4 + i*16), L, font=F_TIP, fill=INK, anchor="ma")
    text((40, y), nome, F_LBL, GOLD)
    paste(art, 40, y+22)
    y += 22 + h + 18
    if y > GH - 260:
        break
text((320, 108), "cada peça desenhada na caixa real do jogo; linha ciano = área permitida (papel liso) onde o texto é centralizado", F_SMALL, DIM)
text((40, y+8), "Gerado por tools/make_hud_diagrams.py com os assets reais e um porte fiel de game/js/paper_hud.js.", F_SMALL, DIM)
img.convert("RGB").save(OUT_GAL, optimize=True)
print("ok", OUT_GAL, img.size)
