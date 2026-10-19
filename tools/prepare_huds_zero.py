#!/usr/bin/env python3
"""Prepara os HUDs do recomeço ZERO (2 peças) a partir das molduras recortadas.

Uso:
    python3 tools/prepare_huds_zero.py            # conserta tudo in-place
    python3 tools/prepare_huds_zero.py --check    # só mede e reporta
    python3 tools/prepare_huds_zero.py --record   # regrava o manifesto (sem tocar nos PNGs)

O que conserta (2026-10-19, bug "quadrado branco atrás de todo HUD"):
  1. DESPILL  — o chroma #0000FF vazava nas bordas anti-aliased: as folhas
     ganhavam um contorno azul. O azul é cortado para max(R,G) e o alfa da
     borda passa a ser SUAVE (proporcional ao resto de azul).
  2. SANGRIA  — pixels 100% transparentes carregavam RGB azul. Ao reduzir a
     moldura (smoothing bilinear) o navegador misturava esse azul → halo. O RGB
     dos transparentes é preenchido com a cor opaca mais próxima.
  3. FUNDO    — o `*_bg.png` era um retângulo creme de PONTA A PONTA, desenhado
     atrás da moldura: virava um quadrado claro atrás de cada HUD. Agora o papel
     é mascarado na JANELA interna real da moldura (buraco medido por
     `binary_fill_holes`, dilatado ~1% para correr por baixo da madeira) com
     borda suave — fora da janela o fundo é transparente.
  4. APERTURE — mede a janela de cada moldura e imprime os valores normalizados
     prontos para o `PAPER_APERTURE` de game/js/paper_hud.js.
  5. COMBINADO — o `*.png` de reserva (sem 2 peças) passa a ser fundo mascarado
     + moldura, nunca fundo retangular.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

PAPER_DIR = "game/assets/ui/paper"
MANIFEST = "docs/arte/huds-zero.json"

KINDS = ["panel", "expanded", "tutorial", "nest_tip", "banner", "boss", "event",
         "header", "minimap", "transition", "tooltip", "health", "card",
         "tree_detail", "pause"]

# Paleta do papel (FUMIGA-PAPEL-v4-CHROMA) — creme quente, nunca branco puro.
PAPER_BASE = (243, 232, 205)


def despill(frame: Image.Image) -> Image.Image:
    """Remove o azul do chroma key das bordas e deixa o alfa macio."""
    arr = np.array(frame.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    a_old = arr[:, :, 3].astype(np.int16)
    blueness = rgb[:, :, 2] - np.maximum(rgb[:, :, 0], rgb[:, :, 1])

    # alfa macio: 255 até blueness 8, 0 a partir de 56
    soft = 255 - np.clip((blueness - 8) * 255 // 48, 0, 255)
    alpha = np.minimum(a_old, soft).astype(np.uint8)

    # despill: todo pixel com resto de azul perde o azul
    rgb[:, :, 2] = np.where(blueness > 0, np.maximum(rgb[:, :, 0], rgb[:, :, 1]), rgb[:, :, 2])

    # SANGRIA: RGB dos transparentes = cor opaca vizinha mais próxima
    solid = alpha > 24
    if solid.any() and (~solid).any():
        _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
        rgb = rgb[iy, ix]

    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def window_mask(frame: Image.Image) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    """Buraco interno (janela) da moldura + bbox (x0,y0,x1,y1) em pixels."""
    alpha = np.array(frame.convert("RGBA"))[:, :, 3]
    solid = alpha > 24
    hole = ndimage.binary_fill_holes(solid) & ~solid
    lab, n = ndimage.label(hole)
    if n == 0:
        h, w = solid.shape
        return np.ones_like(hole), (0, 0, w - 1, h - 1)
    sizes = ndimage.sum(hole, lab, range(1, n + 1))
    win = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.where(win)
    return win, (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def paper_backing(size, win: np.ndarray, seed: int) -> Image.Image:
    """Pergaminho mascarado na janela da moldura (transparente fora dela)."""
    w, h = size
    rng = np.random.RandomState(seed)
    base = np.zeros((h, w, 3), np.float32)
    base[:, :] = PAPER_BASE

    # fibras: ruído de baixa frequência + grão fino
    coarse = ndimage.gaussian_filter(rng.normal(0, 1, (h, w)), max(2, min(w, h) / 40))
    grain = rng.normal(0, 1, (h, w))
    tone = (coarse / max(1e-6, coarse.std())) * 4.0 + grain * 3.2
    base += tone[:, :, None]

    # manchas de envelhecimento (achatadas, tom chá)
    blot = Image.new("L", (w, h), 0)
    bd = ImageDraw.Draw(blot)
    for _ in range(14):
        cx, cy = rng.randint(0, w), rng.randint(0, h)
        rx, ry = rng.randint(max(4, w // 14), max(6, w // 5)), rng.randint(max(4, h // 14), max(6, h // 5))
        bd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=rng.randint(18, 46))
    blot = blot.filter(ImageFilter.GaussianBlur(max(3, min(w, h) / 30)))
    base[:, :, 0] -= np.array(blot) * 0.16
    base[:, :, 1] -= np.array(blot) * 0.22
    base[:, :, 2] -= np.array(blot) * 0.30

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # máscara: janela dilatada (papel corre por baixo da madeira) + borda suave
    grow = max(2, round(min(w, h) * 0.012))
    mask = ndimage.binary_dilation(win, iterations=grow)
    m = Image.fromarray((mask * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.2))

    # sombra interna: o papel escurece junto à borda da janela
    inner = Image.fromarray((ndimage.binary_erosion(mask, iterations=max(3, grow * 3)) * 255).astype(np.uint8), "L")
    inner = inner.filter(ImageFilter.GaussianBlur(max(3, grow * 2)))
    shade = np.array(inner).astype(np.float32) / 255.0
    arr = np.array(img).astype(np.float32)
    dark = 1.0 - 0.10 * (1.0 - shade)
    for c in range(3):
        arr[:, :, c] *= dark

    arr[:, :, 3] = np.array(m)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def sha256_of(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def write_record(apertures: dict) -> None:
    """Grava em docs/arte/huds-zero.json o estado REAL dos PNGs de runtime.

    O registro é a fonte que o teste `hud-publication` confere: tamanho, hash,
    janela (aperture) e as duas garantias anti-quadrado-branco:
      * `bg.outside_alpha` = 0  -> o fundo não existe fora da janela;
      * `frame.blue_leak`  = 0  -> nenhuma margem transparente carrega azul do
                                   chroma (o que virava halo ao reduzir).
    """
    if not os.path.exists(MANIFEST):
        return
    with open(MANIFEST, encoding="utf-8") as fh:
        man = json.load(fh)

    by_kind = {h["kind"]: h for h in man.get("huds", [])}
    for kind in KINDS:
        entry = by_kind.get(kind)
        if entry is None:
            continue
        frame_path = os.path.join(PAPER_DIR, f"{kind}_frame.png")
        bg_path = os.path.join(PAPER_DIR, f"{kind}_bg.png")
        all_path = os.path.join(PAPER_DIR, f"{kind}.png")
        frame = Image.open(frame_path).convert("RGBA")
        bg = Image.open(bg_path).convert("RGBA")
        fa = np.array(frame)
        ba = np.array(bg)
        win, (x0, y0, x1, y1) = window_mask(frame)
        w, h = frame.size

        # janela: frações normalizadas
        ap = [round(x0 / w, 4), round(y0 / h, 4), round((x1 + 1) / w, 4), round((y1 + 1) / h, 4)]
        apertures[kind] = ap
        entry["aperture"] = ap
        entry["native"] = [w, h]

        # moldura: miolo VAZADO (folhas podem invadir; o que não pode é uma
        # chapa opaca ocupando o miolo) e margem transparente SEM azul.
        center = fa[int(h * .3):int(h * .7), int(w * .3):int(w * .7), 3]
        transparent = fa[:, :, 3] <= 16
        blue_leak = int((transparent & (fa[:, :, 2].astype(int) - np.maximum(fa[:, :, 0], fa[:, :, 1]).astype(int) > 40)).sum())
        entry["frame"] = {
            "path": frame_path,
            "size": [w, h],
            "bytes": os.path.getsize(frame_path),
            "sha256": sha256_of(frame_path),
            "center_opaque_ratio": round(float((center > 24).mean()), 4),
            "blue_leak": blue_leak,
        }
        # fundo: papel SÓ na janela. A prova de que não existe "quadrado branco"
        # é o alfa na moldura da imagem e nos quatro cantos — tudo 0. O miolo,
        # onde o texto é desenhado, tem de ser opaco.
        bw, bh = bg.size
        ba = ba if ba.shape[1] == bw else np.array(Image.open(bg_path).convert("RGBA"))
        ring = 6
        border = np.concatenate([
            ba[:ring].reshape(-1, 4)[:, 3], ba[-ring:].reshape(-1, 4)[:, 3],
            ba[:, :ring].reshape(-1, 4)[:, 3], ba[:, -ring:].reshape(-1, 4)[:, 3],
        ])
        corners = np.concatenate([
            ba[:12, :12, 3].ravel(), ba[:12, -12:, 3].ravel(),
            ba[-12:, :12, 3].ravel(), ba[-12:, -12:, 3].ravel(),
        ])
        cx0, cy0, cx1, cy1 = int(x0 + (x1 - x0) * .25), int(y0 + (y1 - y0) * .25), int(x1 - (x1 - x0) * .25), int(y1 - (y1 - y0) * .25)
        middle = ba[cy0:cy1, cx0:cx1, 3]
        entry["bg"] = {
            "path": bg_path,
            "size": [bw, bh],
            "bytes": os.path.getsize(bg_path),
            "sha256": sha256_of(bg_path),
            "border_alpha_max": int(border.max()),
            "corner_alpha_max": int(corners.max()),
            "center_alpha_min": int(middle.min()) if middle.size else 0,
        }
        entry["combined"] = {
            "path": all_path,
            "size": list(Image.open(all_path).size),
            "sha256": sha256_of(all_path),
        }
        entry["status"] = "RECORTADO_OK"
        entry["source"] = ""
        entry.pop("source", None)

    man["apertures"] = apertures
    man["generated_at"] = "2026-10-19"
    man["alpha_fix"] = "2026-10-19 despill + sangria + fundo mascarado na janela"
    man["pieces"] = 15
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(man, fh, indent=2, ensure_ascii=False)
    print(f"\n{MANIFEST} regravado ({len(apertures)} HUDs, frame+bg+combined com hash)")


def main() -> int:
    check = "--check" in sys.argv
    only_record = "--record" in sys.argv
    apertures: dict[str, list[float]] = {}
    report = []

    for kind in KINDS:
        path = os.path.join(PAPER_DIR, f"{kind}_frame.png")
        if not os.path.exists(path):
            print(f"!! falta {path}")
            continue
        orig = Image.open(path).convert("RGBA")
        frame = despill(orig)
        win, (x0, y0, x1, y1) = window_mask(frame)
        w, h = frame.size

        apertures[kind] = [round(x0 / w, 4), round(y0 / h, 4), round((x1 + 1) / w, 4), round((y1 + 1) / h, 4)]
        solid = 100 * float((np.array(frame)[:, :, 3] > 24).mean())
        report.append(f"{kind:12s} {w}x{h} janela={x1-x0+1}x{y1-y0+1} "
                      f"ap={apertures[kind]} opaco={solid:4.1f}%")

        if check or only_record:
            continue

        frame.save(path, "PNG", optimize=True)
        bg = paper_backing(frame.size, win, seed=abs(hash(kind)) % 99991)
        bg.save(os.path.join(PAPER_DIR, f"{kind}_bg.png"), "PNG", optimize=True)

        combined = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        combined.alpha_composite(bg, (0, 0))
        combined.alpha_composite(frame, (0, 0))
        combined.save(os.path.join(PAPER_DIR, f"{kind}.png"), "PNG", optimize=True)

    print("\n".join(report))
    print("\nPAPER_APERTURE = {")
    for kind in KINDS:
        if kind in apertures:
            print(f"  {kind+':':13s} Object.freeze({apertures[kind]}),")
    print("};")

    if not check:
        write_record(apertures)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
