#!/usr/bin/env python3
"""Placas de madeira dos botões (pedido 2026-10-14).

Fontes geradas com FUMIGA-PAPEL-v4-CHROMA sobre azul #0000FF em
art-source/botoes-madeira-refinada/button_fonte.png (preservadas, fora do recorte).
Este script: remove o chroma (com despill nas bordas), recorta pela
silhueta, reduz para o tamanho canônico de cada variação e deriva as
ARTES DE ESTADO separadas (normal/hover/pressionado/selecionado/
desabilitado) como arquivos próprios — o motor não tingue mais a placa.

Variações x locais (inventário de button()/iconButton() em 960x540):
  largo   640x104  AVANÇAR 300x48, VOLTAR longos, pausa (TITLE só texto)
  grande  480x110  180-240x40-52: fim de expedição, Memórias, loading
  pequeno 340x84   88-190x28-44 e alturas <=30: abas, LIGAR, +/-, Árvore
  mini    144x144  iconButton da loja/hotbar e quadrados 44x44 (zoom)
Saída: game/assets/ui/paper/wood/button_{var}_{estado}.png (RGBA)
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art-source/botoes-madeira-refinada"
OUT = ROOT / "game/assets/ui/paper/wood"
# Uma fonte aprovada; só o corredor central é extensível.
SIZES = {"largo": (640,104), "grande": (480,110),
         "pequeno": (340,84), "mini": (144,144)}

STATES = ["normal", "hover", "pressionado", "selecionado", "desabilitado"]

def unchroma(im):
    im = im.convert("RGB")
    px = im.load(); w, h = im.size
    out = Image.new("RGBA", (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # distância ao azul puro: alfa sobe quando o pixel deixa de ser fundo
            a = max(0, min(255, (255 - b + max(r, g)) * 2)) if b > r and b > g else 255
            if b > 120 and b > r * 1.6 and b > g * 1.6:
                a = min(a, max(0, 255 - (b - max(r, g)) * 3))
            # despill: sem azul técnico vazando na borda da madeira/folha
            op[x, y] = (r, g, min(b, max(r, g)), a)
    # limpa franja: erode 1px o alfa e suaviza
    alpha = out.getchannel("A").point(lambda v: 0 if v < 28 else (255 if v > 225 else v))
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.6)))
    bbox = out.getchannel("A").getbbox()
    return out.crop(bbox) if bbox else out

def make_state(base, state):
    im = base.copy()
    if state == "normal":
        return im
    if state == "hover":
        im = ImageEnhance.Brightness(im).enhance(1.13)
        return ImageEnhance.Color(im).enhance(1.06)
    if state == "pressionado":
        im = ImageEnhance.Brightness(im).enhance(0.80)
        return ImageEnhance.Contrast(im).enhance(1.05)
    if state == "desabilitado":
        a = im.getchannel("A")
        gray = ImageEnhance.Color(im.convert("RGB")).enhance(0.25)
        im = ImageEnhance.Brightness(gray).enhance(1.08).convert("RGBA")
        im.putalpha(a)  # alfa cheio: o corpo continua opaco p/ o texto
        return im
    if state == "selecionado":
        im = ImageEnhance.Brightness(im).enhance(1.07)
        # selo de confirmação desenhado na própria arte (canto direito)
        d = ImageDraw.Draw(im, "RGBA")
        w, h = im.size; s = max(10, h // 5)
        cx, cy = w - round(w * (.30 if w == h else .18)) - s, h // 2
        d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=(69, 96, 50, 255),
                  outline=(238, 230, 200, 255), width=max(2, s // 5))
        lw = max(2, s // 3)
        d.line([cx - s * 0.55, cy, cx - s * 0.12, cy + s * 0.45], fill=(245, 240, 214, 255), width=lw)
        d.line([cx - s * 0.12, cy + s * 0.45, cx + s * 0.6, cy - s * 0.5], fill=(245, 240, 214, 255), width=lw)
        return im
    return im

def resize_board(base, size, mini=False):
    """Recompõe três faixas; mantém ambas as pontas inteiras em cada tamanho.

    A variante mini compacta as extremidades para caber nos controles quadrados.
    Não repete folhas nem recorta o vértice; o centro da mesma madeira se estende.
    """
    sw, sh = base.size
    w, h = size
    cap = round(sw * .18)
    dest_cap = min(round(w * (.30 if mini else .18)), round(h * cap / sh))
    out = Image.new("RGBA", size)
    for box, x, width in [((0,0,cap,sh),0,dest_cap),
                          ((cap,0,sw-cap,sh),dest_cap,w-2*dest_cap),
                          ((sw-cap,0,sw,sh),w-dest_cap,dest_cap)]:
        out.paste(base.crop(box).resize((width,h),Image.Resampling.LANCZOS),(x,0))
    return out

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    src = SRC / "button_fonte.png"
    source = unchroma(Image.open(src))
    for var, size in SIZES.items():
        base = resize_board(source,size,mini=var=="mini")
        for state in STATES:
            target = OUT / f"button_{var}_{state}.png"
            make_state(base, state).save(target, optimize=True)
            records.append(dict(id=f"{var}_{state}", source=str(src.relative_to(ROOT)),
                size=list(size), bytes=target.stat().st_size,
                sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    man = ROOT / "docs/arte/botoes-madeira.json"
    man.write_text(json.dumps(dict(
        decision="2026-10-14: madeira refinada com ponta nas DUAS extremidades; "
                 "fonte escolhida pelo usuário, centro extensível e mini compacta; "
                 "TITLE só texto. Estados como artes separadas; "
                 "prompt FUMIGA-PAPEL-v4-CHROMA, fundo azul",
        source_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),
        images=records), ensure_ascii=False, indent=2) + "\n")
    print(f"{len(records)} artes, {sum(r['bytes'] for r in records):,} bytes -> {OUT}")

if __name__ == "__main__":
    main()
