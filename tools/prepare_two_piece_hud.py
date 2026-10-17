#!/usr/bin/env python3
"""Prepara os pares de HUD em 2 peças (moldura vazada + fundo de papel) — 2026-10-16.

Fontes geradas com FUMIGA-PAPEL-v4-CHROMA sobre fundo técnico azul puro #0000FF
em art-source/f1-duas-pecas/originais/ (escolhidas pelo usuário via offer_options).

Para cada família de HUD (panel, health, banner, minimap, tooltip, card, pause),
gera em game/assets/ui/paper/:
  - <kind>_frame.png : somente a MOLDURA (madeira + vinhas/folhas), com o exterior
                       E a janela central (abertura/aperture) 100% transparentes.
  - <kind>_bg.png    : somente o FUNDO DE PAPEL artesanal em camadas, recortado
                       para preencher 100% da janela central sob a moldura sem
                       vazar para fora do contorno externo da madeira.

Os 7 arquivos compostos históricos (<kind>.png) permanecem intocados em disco
para preservar os hashes auditados por game/test/hud-publication.mjs.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "art-source/f1-duas-pecas/originais"
SLIM = ROOT / "art-source/f1-slim/originais"
OUT = ROOT / "game/assets/ui/paper"

SPECS = {
    "panel":   {"size": (960, 512),  "frame_src": SLIM / "panel_frame.png",   "bg_src": "panel_bg.png", "quiet": (0.215, 0.200, 0.865, 0.800)},
    "health":  {"size": (960, 135),  "frame_src": SLIM / "health_frame.png",  "bg_src": "panel_bg.png", "quiet": (0.145, 0.320, 0.865, 0.680)},
    "banner":  {"size": (960, 192),  "frame_src": SLIM / "banner_frame.png",  "bg_src": "panel_bg.png", "quiet": (0.310, 0.295, 0.840, 0.765)},
    "minimap": {"size": (960, 717),  "frame_src": SLIM / "minimap_frame.png", "bg_src": "panel_bg.png", "quiet": (0.180, 0.240, 0.800, 0.770)},
    "tooltip": {"size": (960, 475),  "frame_src": SLIM / "tooltip_frame.png", "bg_src": "panel_bg.png", "quiet": (0.215, 0.240, 0.830, 0.765)},
    "card":    {"size": (848, 1264), "frame_src": SLIM / "card_frame.png",    "bg_src": "card_bg.png",  "quiet": (0.305, 0.165, 0.855, 0.820)},
    "pause":   {"size": (928, 1152), "frame_src": None,                       "bg_src": "card_bg.png",  "quiet": (0.250, 0.219, 0.776, 0.757)},
}


def unchroma_blue(im: Image.Image) -> Image.Image:
    """Remove o fundo técnico azul #0000FF (externo e interno) com despill quente total."""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mrg = max(r, g)
            blue_excess = b - mrg
            if blue_excess > 18 and b > 45:
                a = max(0, min(255, int(255 - (blue_excess - 18) * 3.2)))
                # Converte qualquer sombra azulada de borda em sombra castanha quente
                nb = min(b, int(r * 0.45 + g * 0.45))
                nr = min(255, int(r * 1.05))
                ng = min(255, int(g * 1.02))
                op[x, y] = (nr, ng, nb, a)
            elif b > mrg:
                # Despill total: na paleta terrosa nenhum pixel da peça tem azul > max(r, g)
                nb = int(r * 0.48 + g * 0.48)
                op[x, y] = (r, g, nb, 255)
            else:
                op[x, y] = (r, g, b, 255)
    alpha = out.getchannel("A").point(lambda v: 0 if v < 42 else (255 if v > 220 else v))
    out.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.5)))
    return out


def extract_pause_frame(pause_path: Path) -> Image.Image:
    """Extrai a moldura vazada de pause.png removendo o papel creme central."""
    im = Image.open(pause_path).convert("RGBA")
    w, h = im.size
    px = im.load()
    cx, cy = w // 2, h // 2
    cr, cg, cb, _ = px[cx, cy]

    def paper_dist(c):
        return ((c[0] - cr) ** 2 + (c[1] - cg) ** 2 + (c[2] - cb) ** 2) ** 0.5

    # Flood fill do centro de papel creme
    hole = bytearray(w * h)
    q = deque([(cx, cy)])
    hole[cy * w + cx] = 1
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not hole[ny * w + nx]:
                c = px[nx, ny]
                if c[3] > 128 and paper_dist(c) < 26.0:
                    hole[ny * w + nx] = 1
                    q.append((nx, ny))

    out = im.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if hole[y * w + x]:
                r, g, b, _ = op[x, y]
                op[x, y] = (r, g, b, 0)
    # Suaviza a borda interna
    alpha = out.getchannel("A").filter(ImageFilter.GaussianBlur(0.5))
    out.putalpha(alpha)
    return out


def flood_outside(frame_rgba: Image.Image) -> bytearray:
    """Marca com 1 todos os pixels transparentes conectados à borda externa."""
    w, h = frame_rgba.size
    apx = frame_rgba.getchannel("A").load()
    outside = bytearray(w * h)
    q = deque()

    def seed(x, y):
        idx = y * w + x
        if not outside[idx] and apx[x, y] < 96:
            outside[idx] = 1
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                seed(nx, ny)
    return outside


def prepare_paper_sheet(bg_path: Path) -> Image.Image:
    """Recorta a folha de papel creme sem o fundo azul técnico."""
    rgba = unchroma_blue(Image.open(bg_path))
    bbox = rgba.getchannel("A").getbbox()
    if bbox:
        # Retrai 1.5% das bordas para pegar 100% papel opaco com as fibras/camadas
        x0, y0, x1, y1 = bbox
        rgba = rgba.crop((x0, y0, x1, y1))
    return rgba


def build_bg_for_frame(sheet_rgba: Image.Image, frame_rgba: Image.Image, outside: bytearray) -> Image.Image:
    """Encaixa a folha de papel artesanal sob a moldura, mascarando o exterior."""
    w, h = frame_rgba.size
    # Encontra o bounding box da região interna (!outside)
    ix0, iy0, ix1, iy1 = w, h, 0, 0
    for y in range(h):
        row = y * w
        for x in range(w):
            if not outside[row + x]:
                if x < ix0: ix0 = x
                if y < iy0: iy0 = y
                if x > ix1: ix1 = x
                if y > iy1: iy1 = y

    # Redimensiona a folha de papel artesanal para cobrir a região interna da moldura
    iw = max(1, ix1 - ix0 + 1)
    ih = max(1, iy1 - iy0 + 1)
    paper_resized = sheet_rgba.resize((iw, ih), Image.Resampling.LANCZOS).convert("RGBA")
    # Garante que o miolo da folha de papel seja 100% opaco onde o original tinha papel
    ppx = paper_resized.load()
    # Cor base média do centro da folha para preencher qualquer fresta na borda sob a madeira
    cr, cg, cb, _ = ppx[iw // 2, ih // 2]

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()

    # Máscara interna encolhida em 2px da borda externa para nunca vazar fora da moldura
    inside_mask = Image.new("L", (w, h), 0)
    mp = inside_mask.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if not outside[row + x]:
                mp[x, y] = 255
    inside_mask = inside_mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    mp = inside_mask.load()

    for y in range(iy0, iy1 + 1):
        for x in range(ix0, ix1 + 1):
            m = mp[x, y]
            if m == 0:
                continue
            pr, pg, pb, pa = ppx[x - ix0, y - iy0]
            if pa < 255:
                # Mescla com o tom base do papel para que sob a madeira não haja buraco transparente
                alpha_f = pa / 255.0
                pr = int(pr * alpha_f + cr * (1.0 - alpha_f))
                pg = int(pg * alpha_f + cg * (1.0 - alpha_f))
                pb = int(pb * alpha_f + cb * (1.0 - alpha_f))
            op[x, y] = (pr, pg, pb, m)
    return out


def measure_aperture(frame_rgba: Image.Image, outside: bytearray) -> list[float]:
    """Mede o bounding box normalizado [x0, y0, x1, y1] da janela central vazada."""
    w, h = frame_rgba.size
    apx = frame_rgba.getchannel("A").load()
    hx0, hy0, hx1, hy1 = w, h, 0, 0
    for y in range(h):
        row = y * w
        for x in range(w):
            if not outside[row + x] and apx[x, y] < 64:
                if x < hx0: hx0 = x
                if y < hy0: hy0 = y
                if x > hx1: hx1 = x
                if y > hy1: hy1 = y
    return [round(hx0 / w, 4), round(hy0 / h, 4), round(hx1 / w, 4), round(hy1 / h, 4)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheets = {
        "panel_bg.png": prepare_paper_sheet(ORIG / "panel_bg.png"),
        "card_bg.png":  prepare_paper_sheet(ORIG / "card_bg.png"),
    }
    records = []

    for kind, spec in SPECS.items():
        size = spec["size"]
        if spec["frame_src"]:
            src_path = Path(spec["frame_src"])
            frame_rgba = unchroma_blue(Image.open(src_path)).resize(size, Image.Resampling.LANCZOS)
            src_rel = str(src_path.relative_to(ROOT))
        else:
            src_path = OUT / "pause.png"
            frame_rgba = extract_pause_frame(src_path)
            src_rel = str(src_path.relative_to(ROOT))

        outside = flood_outside(frame_rgba)
        aperture = measure_aperture(frame_rgba, outside)
        bg_rgba = build_bg_for_frame(sheets[spec["bg_src"]], frame_rgba, outside)

        frame_out = OUT / f"{kind}_frame.png"
        bg_out = OUT / f"{kind}_bg.png"
        frame_rgba.save(frame_out, optimize=True)
        bg_rgba.save(bg_out, optimize=True)

        # Verifica que centro da moldura é transparente (alpha=0) e centro do fundo é opaco (alpha=255)
        cx, cy = size[0] // 2, size[1] // 2
        fa = frame_rgba.getpixel((cx, cy))[3]
        ba = bg_rgba.getpixel((cx, cy))[3]
        assert fa == 0, f"{kind}_frame center alpha must be 0, got {fa}"
        assert ba == 255, f"{kind}_bg center alpha must be 255, got {ba}"

        records.append({
            "kind": kind,
            "size": list(size),
            "aperture": aperture,
            "quiet": list(spec["quiet"]),
            "frame": {
                "path": str(frame_out.relative_to(ROOT)),
                "source": src_rel,
                "bytes": frame_out.stat().st_size,
                "sha256": hashlib.sha256(frame_out.read_bytes()).hexdigest(),
                "center_alpha": fa,
            },
            "bg": {
                "path": str(bg_out.relative_to(ROOT)),
                "source": str((ORIG / spec["bg_src"]).relative_to(ROOT)),
                "bytes": bg_out.stat().st_size,
                "sha256": hashlib.sha256(bg_out.read_bytes()).hexdigest(),
                "center_alpha": ba,
            },
        })

    manifest_path = ROOT / "docs/arte/hud-duas-pecas.json"
    manifest = {
        "date": "2026-10-16",
        "decision": "HUDs do Grupo A divididos em 2 peças (moldura vazada *_frame.png + fundo de papel *_bg.png), mantendo o Estilo 06 (FUMIGA-PAPEL-v4-CHROMA sobre azul #0000FF)",
        "prompt": "FUMIGA-PAPEL-v4-CHROMA",
        "families": records,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    total_bytes = sum(r["frame"]["bytes"] + r["bg"]["bytes"] for r in records)
    print(f"OK: {len(records)} famílias (14 PNGs RGBA: 7 molduras vazadas + 7 fundos de papel), {total_bytes:,} bytes totais.")


if __name__ == "__main__":
    main()
