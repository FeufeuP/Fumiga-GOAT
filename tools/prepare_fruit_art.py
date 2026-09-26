#!/usr/bin/env python3
"""Prepare the approved maçã/santuário art for the game, without runtime deps.

Usage:
  python3 tools/prepare_fruit_art.py all
  python3 tools/prepare_fruit_art.py maca       art-source/macas/01-planicie.png
  python3 tools/prepare_fruit_art.py santuario  art-source/santuarios/01-planicie.png
  python3 tools/prepare_fruit_art.py sprite     art-source/comuns/correntes-cadeados.png

Contract (Regra 5 + Regra 6): the approved high-resolution original is the source
of truth and stays in art-source/. The game loads a smaller, palette-limited copy
so nothing is scaled or blurred at draw time:

  maca        320x320  RGBA   fundo violeta removido, recorte sem margem vazia
  santuario  960x540  RGB    1:1 com o canvas do jogo (nada de escala no render)
                             carregado sob demanda na tela do santuário
  sprite     auto     RGBA   recorte + 256 cores, para correntes/cadeados

Pillow is art tooling only, never a game dependency. Only the prepared PNGs are
loaded by the game (see MANIFEST in game/js/assets.js).
"""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Fundo violeta uniforme da arte aprovada (mesma chave do prepare_tree_art.py).
KEY = (29, 17, 39)
MACAS_DIR = ROOT / "art-source" / "macas"
SANTUARIOS_DIR = ROOT / "art-source" / "santuarios"
COMUNS_DIR = ROOT / "art-source" / "comuns"
OUT_DIR = ROOT / "game" / "assets" / "ui"
# Nomes canônicos por mundo (mesma ordem de META_STAGES em config.js).
MUNDOS = ["planicie", "floresta", "pantano", "deserto", "outono", "gelo", "palida"]
COMUNS = ["correntes-cadeados", "correntes-deserto", "correntes-tranca"]


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
    for comum in COMUNS:
        source = COMUNS_DIR / f"{comum}.png"
        if source.exists():
            name = comum.replace("-", "_")
            prepare_sprite(source, OUT_DIR / f"{name}.png",
                           colors=128, height=192 if "tranca" in comum else 256)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("mode", choices=["all", "maca", "santuario", "sprite"])
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
    else:
        prepare_sprite(args.source, Path(args.destination))
