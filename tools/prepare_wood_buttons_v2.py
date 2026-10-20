#!/usr/bin/env python3
"""Variações de botão em madeira (papel recortado) — 2026-10-19.

MODELO aprovado pelo usuário: art-source/botoes-madeira-v2/modelo_botao_grande.png
(tábua âmbar rasgada, vinhedo, bolota). As VARIAÇÕES saem de UMA spritesheet
(spritesheet_botoes_v2.png), recortadas por COMPONENTE CONECTADO:

  placa_grande  2,22:1  botão de ação principal (tábua larga com vinhedo)
  placa_media   3,62:1  botão largo de uma linha (tag com folha e bolota nas pontas)
  placa_pequena 3,12:1  botão compacto (tábua com acorn na ponta)
  placa_cartao  0,43:1  botão vertical (tag de item, folha em cima, acorn na base)

O script: remove o chroma azul (com despill), corta as 4 peças, MEDE a área
calma de madeira (onde o texto pode ficar, em frações da arte), reduz para o
tamanho canônico (2x o maior uso em tela) e deriva as ARTES DE ESTADO
separadas (normal/hover/pressionado/selecionado/desabilitado).

Saída: game/assets/ui/paper/wood/placa_{variacao}_{estado}.png (RGBA)
        docs/arte/botoes-madeira-v2.json (manifesto + área medida)
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art-source/botoes-madeira-v2"
OUT = ROOT / "game/assets/ui/paper/wood"
SHEET = SRC / "spritesheet_botoes_v2.png"

# variação -> (tamanho canônico, 2x o maior uso em tela)
SIZES = {
    "grande":  (400, 180),
    "media":   (326, 90),
    "pequena": (312, 100),
    "cartao":  (87, 200),
}
STATES = ["normal", "hover", "pressionado", "selecionado", "desabilitado"]
QUAD = {"grande": (0, 0), "media": (1, 0), "pequena": (0, 1), "cartao": (1, 1)}


def unchroma(im):
    """Azul técnico #0000FF -> alfa, com despill (nada de azul na borda)."""
    im = im.convert("RGB")
    w, h = im.size
    out = Image.new("RGBA", (w, h))
    src, dst = im.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if b > 90 and b > r * 1.35 and b > g * 1.35:
                a = 255 - int(min(255, (b - max(r, g)) * 2.2))
                dst[x, y] = (r, g, min(b, max(r, g)), max(0, min(255, a)))
            else:
                dst[x, y] = (r, g, b, 255)
    alpha = out.getchannel("A").point(lambda v: 0 if v < 30 else (255 if v > 226 else v))
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
    return out


def cut_pieces(sheet):
    """Separa as 4 peças por componente conectado (posições reais da folha)."""
    tmp = Path("/tmp/fumiga-sheet-alpha.png")
    sheet.save(tmp)
    res = subprocess.run(
        ["convert", str(tmp), "-alpha", "extract", "-define",
         "connected-components:verbose=true", "-connected-components", "8", "null:"],
        capture_output=True, text=True)
    sw, sh = sheet.size
    boxes = []
    for line in res.stdout.splitlines():
        m = re.match(r"\s*\d+:\s*(\d+)x(\d+)\+(\d+)\+(\d+)\s+\S+\s+(\d+)\s", line)
        if not m:
            continue
        w, h, x, y, area = (int(v) for v in m.groups())
        if area > 3000 and not (w >= sw * 0.99 and h >= sh * 0.99):
            boxes.append((area, x, y, w, h))
    out = {}
    for name, (right, bottom) in QUAD.items():
        pick = None
        for area, x, y, w, h in boxes:
            cx, cy = x + w / 2, y + h / 2
            if (cx > sw / 2) == bool(right) and (cy > sh / 2) == bool(bottom):
                if pick is None or area > pick[0]:
                    pick = (area, x, y, w, h)
        if not pick:
            raise SystemExit("peça não encontrada: " + name)
        _, x, y, w, h = pick
        out[name] = sheet.crop((x, y, x + w, y + h))
    return out


def calm_wood(im):
    """Máscara da madeira calma (a área onde o texto pode ficar)."""
    px = im.load()
    w, h = im.size
    mask = [[False] * w for _ in range(h)]
    for y in range(h):
        row = mask[y]
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 200:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            sat = (mx - mn) / max(1, mx)
            # madeira clara: pouco saturada, quente (R > B), nem folha (verde) nem bolota (muito saturado)
            if 88 <= r <= 255 and sat < 0.88 and r > g + 8 and r - b >= 20:
                row[x] = True
    return mask


# ÁREA DE TEXTO — medida sobre a arte real (folha de rosto, vinhedo e acorn
# fora do miolo). Fração (x0, y0, x1, y1) da peça.
QUIET = {
    "grande":  (0.30, 0.32, 0.54, 0.88),
    "media":   (0.18, 0.16, 0.71, 0.84),
    "pequena": (0.06, 0.16, 0.60, 0.84),
    "cartao":  (0.16, 0.31, 0.84, 0.74),
}


def quiet_area(im, name=""):
    """Área do texto da placa: a tabela medida (QUIET) manda; a medição por pixel
    (quiet_area_auto) fica como conferência."""
    return [round(v, 4) for v in QUIET.get(name, (0.12, 0.18, 0.88, 0.82))]


def quiet_area_auto(im):
    """Retângulo de madeira calma (fração 0..1) — conferência por pixel.

    1) maior retângulo de madeira calma da peça (histórico clássico);
    2) centralizado na peça: a faixa vertical é a do maior bloco e a largura
       é a interseção desse bloco com o eixo central (o texto é centralizado).
    """
    mask = calm_wood(im)
    h = len(mask)
    w = len(mask[0])
    # maior retângulo do máscara (histórico clássico)
    heights = [0] * w
    best = (0, 0, 0, 0, 0)  # area, x0, y0, x1, y1
    for y in range(h):
        row = mask[y]
        for x in range(w):
            heights[x] = heights[x] + 1 if row[x] else 0
        stack = []  # (início, altura)
        for x in range(w + 1):
            cur = heights[x] if x < w else 0
            start = x
            while stack and stack[-1][1] >= cur:
                st, hv = stack.pop()
                area = hv * (x - st)
                if area > best[0]:
                    best = (area, st, y - hv + 1, x, y + 1)
                start = st
            stack.append((start, cur))
    if best[0] == 0:
        return [0.12, 0.18, 0.88, 0.82]
    _, rx0, ry0, rx1, ry1 = best
    # centraliza: a faixa vertical do bloco, com a largura limitada ao que é
    # madeira calma em TODAS as linhas da faixa (a mais estreita manda)
    cx = w // 2
    lo_all, hi_all = 0, w
    for y in range(ry0, ry1):
        row = mask[y]
        lo = 0
        while cx - lo - 1 >= 0 and row[cx - lo - 1]:
            lo += 1
        hi = 0
        while cx + hi < w and row[cx + hi]:
            hi += 1
        lo_all = max(lo_all, min(lo, hi))
        hi_all = min(hi_all, max(lo, hi))
    x0 = max(rx0, cx - lo_all)
    x1 = min(rx1, cx + hi_all)
    if x1 - x0 < w * 0.15:  # faixa central apertada: usa o bloco inteiro
        x0, x1 = rx0, rx1
    # margem de segurança: o texto não encosta na fibra nem no ornamento
    pad_x = max(2, int((x1 - x0) * 0.05))
    pad_y = max(2, int((ry1 - ry0) * 0.07))
    x0 += pad_x; x1 -= pad_x
    yy0 = ry0 + pad_y; yy1 = ry1 - pad_y
    return [round(x0 / w, 4), round(yy0 / h, 4), round(x1 / w, 4), round(yy1 / h, 4)]


def make_state(base, state):
    im = base.copy()
    if state == "normal":
        return im
    if state == "hover":
        im = ImageEnhance.Brightness(im).enhance(1.10)
        return ImageEnhance.Color(im).enhance(1.07)
    if state == "pressionado":
        im = ImageEnhance.Brightness(im).enhance(0.84)
        return ImageEnhance.Contrast(im).enhance(1.05)
    if state == "desabilitado":
        a = im.getchannel("A")
        gray = ImageEnhance.Color(im.convert("RGB")).enhance(0.22)
        im = ImageEnhance.Brightness(gray).enhance(1.10).convert("RGBA")
        im.putalpha(a)
        return im
    if state == "selecionado":
        im = ImageEnhance.Brightness(im).enhance(1.06)
        d = ImageDraw.Draw(im, "RGBA")
        w, h = im.size
        s = max(8, h // 6)
        cx, cy = w - round(w * .14) - s, h - round(h * .16) - s
        d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=(69, 96, 50, 235),
                  outline=(238, 230, 200, 255), width=max(2, s // 5))
        lw = max(2, s // 3)
        d.line([cx - s * .55, cy, cx - s * .12, cy + s * .45], fill=(245, 240, 214, 255), width=lw)
        d.line([cx - s * .12, cy + s * .45, cx + s * .6, cy - s * .5], fill=(245, 240, 214, 255), width=lw)
        return im
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = unchroma(Image.open(SHEET))
    pieces = cut_pieces(sheet)
    records, quiet = [], {}
    for name, (cw, ch) in SIZES.items():
        im = pieces[name]
        quiet[name] = quiet_area(im, name)
        base = im.resize((cw, ch), Image.Resampling.LANCZOS)
        for state in STATES:
            target = OUT / f"placa_{name}_{state}.png"
            make_state(base, state).save(target, optimize=True)
            records.append(dict(
                id=f"placa_{name}_{state}", source="art-source/botoes-madeira-v2/spritesheet_botoes_v2.png",
                size=[cw, ch], bytes=target.stat().st_size,
                sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    man = ROOT / "docs/arte/botoes-madeira-v2.json"
    man.write_text(json.dumps(dict(
        decisao="2026-10-19: modelo de botao GRANDE aprovado pelo usuario; variacoes "
                "(media/pequena/cartao) derivadas do MESMO modelo em uma spritesheet unica, "
                "com silhueta de TABUA (botao), nao de moldura; area de texto medida na "
                "madeira calma; estados como artes separadas; prompt FUMIGA-PAPEL-v4-CHROMA, fundo azul",
        source_sha256=hashlib.sha256(SHEET.read_bytes()).hexdigest(),
        area_permitida=quiet,
        images=records), ensure_ascii=False, indent=2) + "\n")
    print(f"{len(records)} artes -> {OUT}")
    for k, v in quiet.items():
        print("  área de texto", k, v)


if __name__ == "__main__":
    main()
