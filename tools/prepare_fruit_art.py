#!/usr/bin/env python3
"""Prepara a arte de frutos, cadeados e santuários para o jogo.

Modos:
  apple|lock  recorta o fundo magenta por chroma-key de canais (min(R,B)-G),
              erode 1px de franja, recorta margens vazias e reduz para o
              tamanho de uso mantendo proporção (RGBA, nearest-friendly).
  sanctuary   reduz para 960x540 (tela do jogo) e quantiza a paleta para o PNG
              ficar leve, sem borrar: LANCZOS uma única vez, fora do loop.

Uso:
  python3 tools/prepare_fruit_art.py apple RAW.png DEST.png [--size 128]
  python3 tools/prepare_fruit_art.py lock RAW.png DEST.png [--size 128]
  python3 tools/prepare_fruit_art.py sanctuary RAW.png DEST.png [--w 960 --h 540]

Pillow é só ferramenta de arte (como em make_lore_hud.py); o jogo continua
JS puro e carrega apenas os PNGs finais otimizados.
"""
import argparse
from PIL import Image, ImageFilter

KEY = (255, 0, 255, 255)


def key_background(im, thresh=120):
    """Chroma-key do fundo magenta por canais: min(R,B) - G alto = fundo.

    Flood-fill do Pillow não tolera o ruído do fundo gerado; a chave por
    canais é determinística e não vaza para a arte (dourado/oliva/violeta
    da paleta têm min(R,B) - G baixo).
    """
    from PIL import ImageChops, ImageOps
    im = im.convert("RGBA")
    r, g, b, _ = im.split()
    low_rb = ImageChops.darker(r, b)                      # min(R,B)
    mag = ImageChops.subtract(low_rb, g)                 # min(R,B) - G
    mag = mag.point(lambda v: 255 if v > thresh else 0)
    strong = low_rb.point(lambda v: 255 if v > 150 else 0)
    mask = ImageChops.multiply(mag, strong)              # só fundo magenta forte
    alpha = ImageOps.invert(mask)
    # franja do chroma: erode 1px e suaviza o recorte sem borrar a arte
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    im.putalpha(alpha)
    return im


def fit(im, size):
    w, h = im.size
    s = min(size / w, size / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    im = im.resize((nw, nh), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, ((size - nw) // 2, (size - nh) // 2), im)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["apple", "lock", "sanctuary"])
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--w", type=int, default=960)
    ap.add_argument("--h", type=int, default=540)
    ap.add_argument("--colors", type=int, default=0)
    a = ap.parse_args()

    im = Image.open(a.src)
    if a.mode == "sanctuary":
        im = im.convert("RGB").resize((a.w, a.h), Image.LANCZOS)
        # salva em P (paleta): o browser decodifica igual e o PNG cai ~2x
        im = im.quantize(colors=a.colors or 192, method=Image.FASTOCTREE,
                         dither=Image.Dither.FLOYDSTEINBERG)
        im.save(a.dst, optimize=True)
    else:
        im = key_background(im)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im = fit(im, a.size)
        if a.colors:
            alpha = im.getchannel("A")
            im = im.convert("RGB").quantize(colors=a.colors, method=Image.FASTOCTREE).convert("RGBA")
            im.putalpha(alpha)
        im.save(a.dst, optimize=True)
    print(a.dst, Image.open(a.dst).size)


if __name__ == "__main__":
    main()
