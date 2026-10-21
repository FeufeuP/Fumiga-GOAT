#!/usr/bin/env python3
"""Deriva as duas peças de arte do NINHO ESCAVÁVEL (rodada de 2026-10-21).

  art-source/f1-distintos/originais/nest_tip_frame.png   (chroma azul #0000FF)
      -> game/assets/ui/paper/nest_tip_frame.png   moldura com a janela VAZADA
      -> game/assets/ui/paper/nest_tip_bg.png      papel creme só dentro da janela
  art-source/f1-solo/originais/terra-ninho.png           (pintura contínua, sem chroma)
      -> game/assets/sprites/nest/terra.png        a FOLHA DO CHÃO, amostrada 1:1 pela grade

Por que o chão é uma FOLHA e não um tile: o mundo já faz isso (`world.js:bakeGround`
assa um canvas e cada célula lê a sua região). Assim dois tiles vizinhos leem
pixels vizinhos da MESMA pintura — não existe emenda para disfarçar, nem xadrez de
grade. Ver `drawGrid` em game/js/nest.js.

O script é determinístico (nada de data/aleatório), não reescreve arte aprovada e
imprime no fim as frações medidas de aperture/quiet para colar em PAPER_APERTURE /
PAPER_QUIET (game/js/paper_hud.js) — a área de texto é MEDIDA pixel a pixel, regra
da casa (2026-10-16), nunca chutada.

  python3 tools/prepare_nest_art.py            gera   (precisa de Pillow. O setup da casa não
                                                       traz PIL: `python3 -m venv /tmp/venv-img
                                                       && /tmp/venv-img/bin/pip install pillow`,
                                                       e rode com /tmp/venv-img/bin/python)
  python3 tools/prepare_nest_art.py --check    só compara (usado pelos testes)
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import json
import sys

from PIL import Image, ImageDraw, ImageFilter
ImageResampling = Image.Resampling

ROOT = Path(__file__).resolve().parents[1]
SRC_FRAME = ROOT / "art-source/f1-distintos/originais/nest_tip_frame.png"
SRC_SOIL = ROOT / "art-source/f1-solo/originais/terra-ninho.png"
PAPER = ROOT / "game/assets/ui/paper"
SRC_PAPER = PAPER / "panel_bg.png"          # a folha de papel creme da casa
OUT_DIR = ROOT / "game/assets/sprites/nest"
OUT_FRAME = PAPER / "nest_tip_frame.png"
OUT_BG = PAPER / "nest_tip_bg.png"
OUT_SOIL = OUT_DIR / "terra.png"
DEBUG = Path("/tmp/fumiga-nest-art")         # mocks de conferência (fora do Git)

# A grade do ninho vem do config.js — a folha é cortada na PROPORÇÃO EXATA dela,
# para que a amostragem 1:1 não estique nada (Regra 22: sprite nunca deformado).
CFG = (ROOT / "game/js/config.js").read_text(encoding="utf-8")


def nest_grid():
    import re
    m = re.search(r"NEST_GRID\s*=\s*\{([^}]*)\}", CFG, re.S)
    body = m.group(1)

    def num(key, default=0):
        mm = re.search(key + r"\s*:\s*([0-9.]+)", body)
        return float(mm.group(1)) if mm else default
    cols, rows = int(num("cols")), int(num("rows"))
    tile = num("tile")
    return cols, rows, tile, cols * tile, rows * tile


def unchroma_blue(im: Image.Image) -> Image.Image:
    """Remove o chroma azul #0000FF com despill quente (mesmo algoritmo de
    tools/prepare_two_piece_hud.py — a paleta terrosa não tem pixel com azul
    maior que max(r,g))."""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mrg = max(r, g)
            excess = b - mrg
            if excess > 18 and b > 45:
                a = max(0, min(255, int(255 - (excess - 18) * 3.2)))
                nb = min(b, int(r * 0.45 + g * 0.45))
                op[x, y] = (min(255, int(r * 1.05)), min(255, int(g * 1.02)), nb, a)
            elif b > mrg:
                op[x, y] = (r, g, int(r * 0.48 + g * 0.48), 255)
            else:
                op[x, y] = (r, g, b, 255)
    alpha = out.getchannel("A").point(lambda v: 0 if v < 42 else (255 if v > 220 else v))
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.5)))
    return out


def hole_bbox(frame: Image.Image):
    """Caixa da janela vazada: transparentes NÃO conectados à borda externa."""
    w, h = frame.size
    apx = frame.getchannel("A").load()
    seen = bytearray(w * h)
    q = deque()

    def seed(x, y):
        i = y * w + x
        if not seen[i] and apx[x, y] < 96:
            seen[i] = 1
            q.append((x, y))
    for x in range(w):
        seed(x, 0); seed(x, h - 1)
    for y in range(h):
        seed(0, y); seed(w - 1, y)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x - 1, y - 1), (x + 1, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                seed(nx, ny)
    xs = [x for y in range(h) for x in range(w) if apx[x, y] < 96 and not seen[y * w + x]]
    ys = [y for y in range(h) for x in range(w) if apx[x, y] < 96 and not seen[y * w + x]]
    if not xs:
        raise SystemExit("nenhuma janela vazada encontrada na moldura (o centro precisa ser chroma)")
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def quiet_rect(frame: Image.Image, hole, ink_thresh=40):
    """MAIOR retângulo livre de tinta da moldura, medido dentro da janela (exato).

    Método: histograma de "linhas limpas" por coluna + maior retângulo no
    histograma. É o retângulo que o texto pode usar de verdade sem encostar em
    ornamento. (A versão anterior pegava o pior caso por linha, que em moldura
    orgânica se autofagia: uma folha que invade num único linha já deitava a
    largura inteira — e chegou a devolver x0 > x1.)
    """
    w, h = frame.size
    apx = frame.getchannel("A").load()
    x0, y0, x1, y1 = hole
    W, H = x1 - x0, y1 - y0
    # altura de cells limpas terminando em cada linha (0 = tem tinta)
    heights = [0] * W
    best = (0, 0, 0, 0)     # área, x0, y0, x1, y1
    best_area = 0
    for y in range(y0, y1):
        for x in range(W):
            heights[x] = heights[x] + 1 if apx[x0 + x, y] < ink_thresh else 0
        # maior retângulo no histograma (pilha de índices)
        stack = []
        for i in range(W + 1):
            cur = heights[i] if i < W else 0
            start = i
            while stack and stack[-1][1] >= cur:
                pos, hh = stack.pop()
                area = hh * (i - pos)
                if area > best_area:
                    best_area = area
                    best = (area, x0 + pos, y - hh + 1, x0 + i, y + 1)
                start = pos
            stack.append((start, cur))
    if best_area < W * H * 0.25:
        raise SystemExit("a área quieta medida é pequena demais (%d px de %d) — a moldura "
                         "está invadindo a janela; revisar a arte" % (best_area, W * H))
    return best[1], best[2], best[3], best[4]


def frac(box, w, h):
    return [round(box[0] / w, 3), round(box[1] / h, 3), round(box[2] / w, 3), round(box[3] / h, 3)]


def build_frame(out_w):
    im = Image.open(SRC_FRAME)
    rgba = unchroma_blue(im)
    w, h = rgba.size
    scale = out_w / w
    out_h = int(round(h * scale))
    rgba = rgba.resize((out_w, out_h), ImageResampling.LANCZOS)
    # a janela precisa continuar vazada depois de redimensionar
    a = rgba.getchannel("A").point(lambda v: 0 if v < 60 else 255)
    rgba.putalpha(a.filter(ImageFilter.GaussianBlur(0.4)))
    hole = hole_bbox(rgba)
    quiet = quiet_rect(rgba, hole)
    return rgba, frac(hole, out_w, out_h), frac(quiet, out_w, out_h), (out_w, out_h)


def paper_sheet() -> Image.Image:
    """A folha de papel creme da casa, RECOBERTA pela caixa do próprio alfa.

    (O `panel_bg.png` cru tem margem transparente em volta do papel recortado:
    redimensioná-lo cru deixa vão preto entre a madeira e o papel — foi o que o
    mock deste script mostrou na primeira rodada.) Retrai 1,5% para pegar só o
    miolo opaco, como faz tools/prepare_two_piece_hud.py.
    """
    sheet = Image.open(SRC_PAPER).convert("RGBA")
    bb = sheet.getchannel("A").getbbox()
    if bb:
        s = int(max(sheet.size) * 0.015)
        sheet = sheet.crop((bb[0] + s, bb[1] + s, max(bb[0] + 1, bb[2] - s), max(bb[1] + 1, bb[3] - s)))
    return sheet


def build_bg(frame: Image.Image, hole):
    """Papel creme da casa recortado para preencher 100% da janela, sem vazar."""
    sheet = paper_sheet()
    x0, y0, x1, y1 = hole
    iw, ih = max(1, x1 - x0), max(1, y1 - y0)
    paper = sheet.resize((iw, ih), ImageResampling.LANCZOS)
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out.paste(paper, (x0, y0), paper.getchannel("A"))
    return out


def build_soil(cols, rows, tile, gw, gh):
    im = Image.open(SOIL_PATH).convert("RGB")
    w, h = im.size
    want = gw / gh
    have = w / h
    if have > want:                                  # larga demais -> corta nas laterais
        nw = int(round(h * want))
        x = (w - nw) // 2
        im = im.crop((x, 0, x + nw, h))
    else:                                            # alta demais -> corta em cima/embaixo
        nh = int(round(w / want))
        y = (h - nh) // 2
        im = im.crop((0, y, w, y + nh))
    # 2x a grade lógica: a cena nunca desenha maior que isso e o PS1/dither não
    # precisa de mais resolução do que o dobro do retângulo de destino.
    # 1,5x a grade lógica. NÃO 2x e NÃO RGB: medido, um solo pintado em 24 bits
    # com dither de Floyd-Steinberg é incompressível como PNG (2,1 MB no pacote
    # offline inteiro). Em paleta de 128 cores são 412 KB — e paleta combina com
    # o filtro PS1 do jogo, que já quantiza a tela para 15 bits.
    out = im.resize((int(round(gw * 1.5)), int(round(gh * 1.5))), ImageResampling.LANCZOS)
    return out.quantize(128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)


def mock_soil(soil: Image.Image, cols, rows, tile, gw, gh, out_path: Path):
    """Mock do `drawGrid`: a folha sob a grade inteira + o escuro do solo fechado,
    para conferir OLHANDO se os tiles vizinhos continuam a pintura."""
    sc = 600.0 / gw
    W, H = int(gw * sc), int(gh * sc)
    T = tile * sc
    cv = Image.new("RGB", (W, H + 40), (11, 7, 4))
    d = ImageDraw.Draw(cv)
    cv.paste(soil.convert("RGB").resize((W, H), ImageResampling.LANCZOS), (0, 0))
    import random
    random.seed(7)                                       # mesmo mock, sempre
    open_ = [[random.random() < 0.55 for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            x, y = int(c * T), int(r * T)
            if not open_[r][c]:
                d.rectangle([x, y, int(x + T), int(y + T)], fill=(24, 15, 9))
            elif r % 5 == 0 and c % 7 == 0:
                d.rectangle([x, y, int(x + T), int(y + T)], fill=(90, 60, 30))
    d.line([(0, 0), (W, 0)], fill=(255, 212, 121), width=2)
    for r in range(1, rows):                              # linhas da grade SÓ no mock
        d.line([(0, int(r * T)), (W, int(r * T))], fill=(255, 255, 255), width=1)
    for c in range(1, cols):
        d.line([(int(c * T), 0), (int(c * T), H)], fill=(255, 255, 255), width=1)
    d.text((6, H + 14), "linhas brancas = grade de 26px (só neste mock); a pintura embaixo é UMA folha", fill=(200, 190, 170))
    cv.save(out_path)


SOIL_PATH = SRC_SOIL


def main():
    check = "--check" in sys.argv
    cols, rows, tile, gw, gh = nest_grid()
    DEBUG.mkdir(parents=True, exist_ok=True)
    PAPER.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    global SOIL_PATH
    SOIL_PATH = SRC_SOIL

    # art-source/ é gitignorada: o repositório carrega só os DERIVADOS. Um clone
    # limpo, sem as fontes, receberia um FileNotFoundError no meio do PIL.
    faltando = [p for p in (SRC_FRAME, SRC_SOIL) if not p.exists()]
    if faltando:
        raise SystemExit(
            "faltam as FONTES desta arte:\n  " + "\n  ".join(str(x.relative_to(ROOT)) for x in faltando) +
            "\n`art-source/` não entra no git (só os derivados, que JÁ ESTÃO em game/assets/). "
            "Para regerar é preciso a máquina onde os originais existem, ou um lote novo pelo fluxo da Regra 16.")

    frame, aperture, quiet, fsize = build_frame(960)
    bg = build_bg(frame, hole_bbox(frame))
    soil = build_soil(cols, rows, tile, gw, gh)
    mock_soil(soil, cols, rows, tile, gw, gh, DEBUG / "mock-terra.png")

    def save(img, path):
        img.save(path, optimize=True)

    if check:
        import io
        for path, img in ((OUT_FRAME, frame), (OUT_BG, bg), (OUT_SOIL, soil)):
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            same = path.exists() and path.read_bytes() == buf.getvalue()
            print(("  igual   " if same else "  DIVERGE ") + str(path.relative_to(ROOT)))
            if not same:
                raise SystemExit(1)
        print("✓ arte do ninho confere com as fontes")
        return

    save(frame, OUT_FRAME)
    save(bg, OUT_BG)
    save(soil, OUT_SOIL)
    mock = Image.new("RGBA", (960, 720), (20, 14, 10, 255))
    mock.paste(bg.convert("RGBA"), (0, 0), bg.convert("RGBA").getchannel("A"))
    mock.paste(frame.convert("RGBA"), (0, 0), frame.convert("RGBA").getchannel("A"))
    d = ImageDraw.Draw(mock)
    qx0, qy0, qx1, qy1 = quiet[0] * fsize[0], quiet[1] * fsize[1], quiet[2] * fsize[0], quiet[3] * fsize[1]
    d.rectangle([qx0, qy0, qx1, qy1], outline=(255, 0, 255, 255), width=2)
    d.text((8, fsize[1] + 8), "caixa magenta = area quieta medida (texto do HUD precisa ficar dentro)", fill=(230, 220, 200, 255))
    mock.resize((960, int(fsize[1]) + 40), ImageResampling.LANCZOS).save(DEBUG / "mock-nest-tip.png")

    print(json.dumps({
        "nest_tip": {"native": list(fsize), "aperture": aperture, "quiet": quiet},
        "grade": {"cols": cols, "rows": rows, "tile": tile, "sheet": list(soil.size), "logica": [gw, gh]},
        "bytes": {str(p.relative_to(ROOT)): p.stat().st_size for p in (OUT_FRAME, OUT_BG, OUT_SOIL)},
    }, indent=1, ensure_ascii=False))
    print("mocks de conferência em", DEBUG)


if __name__ == "__main__":
    main()
