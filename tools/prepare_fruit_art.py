#!/usr/bin/env python3
"""Prepare the approved maçã/santuário art for the game, without runtime deps.

Usage:
  python3 tools/prepare_fruit_art.py all
  python3 tools/prepare_fruit_art.py maca       art-source/macas/01-planicie.png
  python3 tools/prepare_fruit_art.py santuario  art-source/santuarios/01-planicie.png
  python3 tools/prepare_fruit_art.py sprite     ORIGINAL.png SAIDA.png

Contract (Regra 5 + Regra 6): the approved high-resolution original is the source
of truth and stays in art-source/. The game loads a smaller, palette-limited copy
so nothing is scaled or blurred at draw time:

  maca        320x320  RGBA   fundo violeta removido, recorte sem margem vazia
  santuario  960x540  RGB    1:1 com o canvas do jogo (nada de escala no render)
                             carregado sob demanda na tela do santuário
  flores     576x576  RGBA   folha 3x3 (3 variações x 3 estágios: broto, meio
                             aberto, florescida), células 192x192 ancoradas na base
  sprite     auto     RGBA   recorte + 256 cores (ícones/overlays pequenos)

Pillow is art tooling only, never a game dependency. Only the prepared PNGs are
loaded by the game (see MANIFEST in game/js/assets.js).
"""
import argparse
import collections
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Fundo violeta uniforme da arte aprovada (mesma chave do prepare_tree_art.py).
KEY = (29, 17, 39)
MACAS_DIR = ROOT / "art-source" / "macas"
SANTUARIOS_DIR = ROOT / "art-source" / "santuarios"
FLORES_DIR = ROOT / "art-source" / "flores"
OUT_DIR = ROOT / "game" / "assets" / "ui"
# Nomes canônicos por mundo (mesma ordem de META_STAGES em config.js).
MUNDOS = ["planicie", "floresta", "pantano", "deserto", "outono", "gelo", "palida"]
FLORES_VARIACOES = {
    "planicie": ["margarida", "botao", "trevo"],
}
FLORES_ESTAGIOS = ["1_broto", "2_meio", "3_flor"]
FLORES_ALTURAS = [0.74, 0.85, 0.95]


def key_background(image, tolerance=5):
    """Remove o fundo violeta chapado com rampa suave nas bordas."""
    image = image.convert("RGBA")
    data = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    pixels = []
    for red, green, blue, _ in data:
        distance = max(abs(red - KEY[0]), abs(green - KEY[1]), abs(blue - KEY[2]))
        alpha = max(0, min(255, (distance - tolerance) * 64))
        pixels.append((red, green, blue, alpha) if alpha else (0, 0, 0, 0))
    image.putdata(pixels)
    return image


def quantize_rgba(image, colors):
    """Reduz a paleta do RGB e devolve o alfa original (borda suave preservada)."""
    alpha = image.getchannel("A")
    reduced = image.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")
    reduced.putalpha(alpha)
    return reduced


def fit_canvas(image, size, resample=Image.LANCZOS):
    """Reduz mantendo a proporção e centraliza num canvas justo."""
    ratio = min(size[0] / image.width, size[1] / image.height)
    target = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    scaled = image.resize(target, resample)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.paste(scaled, ((size[0] - target[0]) // 2, (size[1] - target[1]) // 2))
    return canvas


def prepare_maca(source, destination, colors=256, size=320):
    image = key_background(Image.open(source))
    box = image.getbbox()
    if box:
        image = image.crop(box)
    image = fit_canvas(image, (size, size), Image.LANCZOS)
    image = quantize_rgba(image, colors)
    image.save(destination, optimize=True)
    print(f"  {destination.relative_to(ROOT)}: {image.width}x{image.height}, "
          f"{destination.stat().st_size} bytes, RGBA")


def prepare_santuario(source, destination, colors=256, size=(960, 540)):
    image = Image.open(source).convert("RGB")
    if image.size != size:
        image = image.resize(size, Image.LANCZOS)
    image = image.quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")
    image.save(destination, optimize=True)
    print(f"  {destination.relative_to(ROOT)}: {image.width}x{image.height}, "
          f"{destination.stat().st_size} bytes, RGB")


def prepare_sprite(source, destination, colors=64, height=256):
    image = key_background(Image.open(source))
    box = image.getbbox()
    if box:
        image = image.crop(box)
    ratio = height / image.height
    image = image.resize((max(1, round(image.width * ratio)), height), Image.LANCZOS)
    image = quantize_rgba(image, colors)
    image.save(destination, optimize=True)
    print(f"  {destination.relative_to(ROOT)}: {image.width}x{image.height}, "
          f"{destination.stat().st_size} bytes, RGBA")


def clean_flower_bg(image, flor, est):
    """Remove o fundo violeta da flor por inundação de borda + bolsões presos."""
    if image.width > 1024:
        image = image.resize((image.width // 2, image.height // 2), Image.NEAREST)
    image = image.convert("RGBA")
    w, h = image.size
    px = image.load()
    border = []
    for x in range(0, w, 4):
        border.append(px[x, 2][:3])
        border.append(px[x, h - 3][:3])
    for y in range(0, h, 4):
        border.append(px[2, y][:3])
        border.append(px[w - 3, y][:3])
    border.sort()
    br, bg_g, bb = border[len(border) // 2]

    tol2 = 25 * 25
    is_botao3 = (flor == "botao" and est == "3_flor")
    seen = bytearray(w * h)
    q = collections.deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        dr = r - br; dg = g - bg_g; db = b - bb
        d2 = dr * dr + dg * dg + db * db
        match = (a == 0) or (d2 <= tol2)
        if not match and is_botao3:
            if b > g + 12 and r > g + 5 and max(r, g, b) <= 118 and (r + g + b) > 52:
                match = True
        if match:
            px[x, y] = (0, 0, 0, 0)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    q.append((nx, ny))

    pocket_tol2 = 12 * 12
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a:
                dr = r - br; dg = g - bg_g; db = b - bb
                if dr * dr + dg * dg + db * db <= pocket_tol2:
                    px[x, y] = (0, 0, 0, 0)
    return image


def add_outline_1px(image, outline_col=(18, 11, 24, 255)):
    """Adiciona contorno escuro de 1px ao redor da silhueta da flor."""
    w, h = image.size
    src = image.load()
    out = image.copy()
    dst = out.load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if src[x, y][3] == 0:
                if (src[x - 1, y][3] > 200 or src[x + 1, y][3] > 200 or
                        src[x, y - 1][3] > 200 or src[x, y + 1][3] > 200):
                    dst[x, y] = outline_col
    return out


def prepare_flores(mundo, destination, cell=192, colors=256):
    """Monta a folha 3x3 (3 variações x 3 estágios) do santuário do bioma."""
    variacoes = FLORES_VARIACOES.get(mundo)
    if not variacoes:
        raise ValueError(f"Sem variações de flores configuradas para: {mundo}")
    sheet = Image.new("RGBA", (cell * 3, cell * 3), (0, 0, 0, 0))
    for r, flor in enumerate(variacoes):
        for c, est in enumerate(FLORES_ESTAGIOS):
            src_path = FLORES_DIR / f"{mundo}_{flor}_{est}.png"
            cleaned = clean_flower_bg(Image.open(src_path), flor, est)
            bbox = cleaned.getchannel("A").getbbox()
            cropped = cleaned.crop(bbox) if bbox else cleaned
            target_h = round(cell * FLORES_ALTURAS[c])
            scale = min((cell - 14) / cropped.width, target_h / cropped.height)
            nw = max(1, round(cropped.width * scale))
            nh = max(1, round(cropped.height * scale))
            resized = cropped.resize((nw, nh), Image.NEAREST)
            cell_img = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            ox = (cell - nw) // 2
            oy = cell - 6 - nh
            cell_img.paste(resized, (ox, oy), resized)
            cell_img = add_outline_1px(cell_img)
            sheet.paste(cell_img, (c * cell, r * cell), cell_img)
    sheet = quantize_rgba(sheet, colors)
    sheet.save(destination, optimize=True)
    rel = destination.resolve().relative_to(ROOT)
    print(f"  {rel}: {sheet.width}x{sheet.height}, "
          f"{destination.stat().st_size} bytes, RGBA (3x3 células {cell}x{cell})")


def source_of(folder, mundo):
    """O original aprovado pode vir prefixado pelo número do mundo (01-planicie)."""
    matches = sorted(folder.glob(f"*{mundo}.png"))
    if not matches:
        raise FileNotFoundError(f"arte original ausente: {folder}/{mundo}.png")
    return matches[0]


def prepare_all():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for mundo in MUNDOS:
        prepare_maca(source_of(MACAS_DIR, mundo), OUT_DIR / f"maca_{mundo}.png")
        prepare_santuario(source_of(SANTUARIOS_DIR, mundo), OUT_DIR / f"santuario_{mundo}.png")
    for mundo in FLORES_VARIACOES:
        if FLORES_DIR.exists():
            prepare_flores(mundo, OUT_DIR / f"flores_{mundo}.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("mode", choices=["all", "maca", "santuario", "flores", "sprite"])
    parser.add_argument("source", nargs="?")
    parser.add_argument("destination", nargs="?")
    args = parser.parse_args()
    if args.mode == "all":
        prepare_all()
    elif not args.source or not args.destination:
        parser.error(f"{args.mode} exige ORIGEM e DESTINO")
    elif args.mode == "maca":
        prepare_maca(args.source, Path(args.destination))
    elif args.mode == "santuario":
        prepare_santuario(args.source, Path(args.destination))
    elif args.mode == "flores":
        prepare_flores(args.source, Path(args.destination))
    else:
        prepare_sprite(args.source, Path(args.destination))
