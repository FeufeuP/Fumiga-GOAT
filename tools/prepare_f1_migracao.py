#!/usr/bin/env python3
"""Prepara os lotes da migração artística F1/F2: originais -> runtime.

Nunca redesenha nem recolore: só (1) recorta o matte creme conectado à borda,
(2) enquadra o assunto, (3) ajusta a proporção do contrato com margem
transparente (sprites NUNCA são esticados) e (4) reduz com Lanczos para o
tamanho de uso. Folha de revisão + manifesto JSON por lote. Pillow é
dependência de autoria, nunca de runtime.

Uso:  python3 tools/prepare_f1_migracao.py <pasta-originais> <sufixo-lote>
Ex.:  python3 tools/prepare_f1_migracao.py art-source/f1-lote1/originais lote1
"""
from __future__ import annotations
from collections import deque
from pathlib import Path
import hashlib, json, sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]

# Contratos de destino: id, caminho runtime, (w,h) de uso, modo.
# modo: sprite = assunto + margem transparente na proporção exata;
#       icon   = quadrado 128 RGBA; atlas = tira central na proporção exata.
SPEC = {
  # --- ícones 32/32 (mesmo caminho dos legados) ---
  'food':       ('game/assets/sprites/icons/food.png',       (128,128), 'icon'),
  'essence':    ('game/assets/sprites/icons/essence.png',    (128,128), 'icon'),
  'shield':     ('game/assets/sprites/icons/shield.png',     (128,128), 'icon'),
  'bolt':       ('game/assets/sprites/icons/bolt.png',       (128,128), 'icon'),
  'hourglass':  ('game/assets/sprites/icons/hourglass.png',  (128,128), 'icon'),
  'snow':       ('game/assets/sprites/icons/snow.png',       (128,128), 'icon'),
  'heal':       ('game/assets/sprites/icons/heal.png',       (128,128), 'icon'),
  'egg':        ('game/assets/sprites/icons/egg.png',        (128,128), 'icon'),
  'potion':     ('game/assets/sprites/icons/potion.png',     (128,128), 'icon'),
  'crown':      ('game/assets/sprites/icons/crown.png',      (128,128), 'icon'),
  'clover':     ('game/assets/sprites/icons/clover.png',     (128,128), 'icon'),
  'fire_sword': ('game/assets/sprites/icons/fire_sword.png', (128,128), 'icon'),
  'fist':       ('game/assets/sprites/icons/fist.png',       (128,128), 'icon'),
  'fungo':      ('game/assets/sprites/icons/fungo.png',      (128,128), 'icon'),
  'horseshoe':  ('game/assets/sprites/icons/horseshoe.png',  (128,128), 'icon'),
  'lock':       ('game/assets/sprites/icons/lock.png',       (128,128), 'icon'),
  'scale':      ('game/assets/sprites/icons/scale.png',      (128,128), 'icon'),
  'spider':     ('game/assets/sprites/icons/spider.png',     (128,128), 'icon'),
  'spider_gold':('game/assets/sprites/icons/spider_gold.png',(128,128), 'icon'),
  'sun':        ('game/assets/sprites/icons/sun.png',        (128,128), 'icon'),
  'wing_gem':   ('game/assets/sprites/icons/wing_gem.png',   (128,128), 'icon'),
  'sk_acid':    ('game/assets/sprites/icons/sk_acid.png',    (128,128), 'icon'),
  'sk_banner':  ('game/assets/sprites/icons/sk_banner.png',  (128,128), 'icon'),
  'sk_bomb':    ('game/assets/sprites/icons/sk_bomb.png',    (128,128), 'icon'),
  'sk_frost':   ('game/assets/sprites/icons/sk_frost.png',   (128,128), 'icon'),
  'sk_fury':    ('game/assets/sprites/icons/sk_fury.png',    (128,128), 'icon'),
  'sk_heart':   ('game/assets/sprites/icons/sk_heart.png',   (128,128), 'icon'),
  'sk_rico':    ('game/assets/sprites/icons/sk_rico.png',    (128,128), 'icon'),
  'sk_slash':   ('game/assets/sprites/icons/sk_slash.png',   (128,128), 'icon'),
  'sk_time':    ('game/assets/sprites/icons/sk_time.png',    (128,128), 'icon'),
  'sk_tornado': ('game/assets/sprites/icons/sk_tornado.png', (128,128), 'icon'),
  # --- atlas HUD orgânico (dimensões = contrato do cutter em lore_hud.js) ---
  'lore_gaster':  ('game/assets/ui/lore_gaster.png',  (192,24),  'atlas'),
  'lore_icons':   ('game/assets/ui/lore_icons.png',   (192,16),  'atlas'),
  'lore_kit':     ('game/assets/ui/lore_kit.png',     (280,52),  'atlas'),
  'lore_panels':  ('game/assets/ui/lore_panels.png',  (192,32),  'atlas'),
  'lore_textbox': ('game/assets/ui/lore_textbox.png', (224,32),  'atlas'),
  # --- recursos do mundo (proporção do consumidor preservada) ---
  'pile_food':  ('game/assets/sprites/props/pile_food.png', (224,160), 'sprite'),
  'crys_blue1': ('game/assets/sprites/props/crys_blue1.png', (256,256), 'sprite'),
  'crys_blue2': ('game/assets/sprites/props/crys_blue2.png', (256,256), 'sprite'),
  'crys_violet1':('game/assets/sprites/props/crys_violet1.png',(256,256),'sprite'),
  'crys_yellow1':('game/assets/sprites/props/crys_yellow1.png',(256,256),'sprite'),
  'crys_white1':('game/assets/sprites/props/crys_white1.png', (256,256), 'sprite'),
  'crys_green1':('game/assets/sprites/props/crys_green1.png', (256,256), 'sprite'),
  'crys_red1':  ('game/assets/sprites/props/crys_red1.png',  (256,256), 'sprite'),
  # --- castas (proporção do PNG legado preservada; assunto nunca esticado) ---
  'queen':    ('game/assets/sprites/ants/queen.png',    (208,256), 'sprite'),
  'worker':   ('game/assets/sprites/ants/worker.png',   (176,240), 'sprite'),
  'soldier':  ('game/assets/sprites/ants/soldier.png',  (204,264), 'sprite'),
  'trapjaw':  ('game/assets/sprites/ants/trapjaw.png',  (204,264), 'sprite'),
  'spitter':  ('game/assets/sprites/ants/spitter.png',  (186,240), 'sprite'),
  'bomber':   ('game/assets/sprites/ants/bomber.png',   (216,276), 'sprite'),
  'tank':     ('game/assets/sprites/ants/tank.png',     (256,256), 'sprite'),
  'gatherer': ('game/assets/sprites/ants/gatherer.png', (156,204), 'sprite'),
  'scout':    ('game/assets/sprites/ants/scout.png',    (132,180), 'sprite'),
  'healer':   ('game/assets/sprites/ants/healer.png',   (150,204), 'sprite'),
  'weaver':   ('game/assets/sprites/ants/weaver.png',   (132,180), 'sprite'),
}

CREAM = (245, 237, 216)  # folha creme de autoria (#f5edd8)
FLOOD, RIM = 16.0, 40.0
# FLOOD/RIM substituem SOLID/EDGE (96/168). O raio antigo media BRANCO (d≈45),
# areia, mel e prata como "matte": o flood apagava partes claras do assunto e o
# un-matte zerava o alfa de tudo com d<96 (defeito reportado pelo usuário como
# "chroma key horrível, partes apagadas"). FLOOD=16 tira SÓ o creme puro do fundo
# (com ruído); sombreados areia/creme do assunto (d≥16) e brancos ficam intactos.
# A franja AA de 1px FORA do flood recebe alfa parcial. Assunto osso-quase-creme
# (d<16, ex.: branco-osso) continua ilegível para chroma key — esses casos pedem
# arte com sombra/contaste de separação (re-gerar), não ajuste de raio.
# --- chroma key de produção (fundos VERDE/AZUL nas originais) ---
KEY_GREEN = (0, 177, 64)     # #00b140
KEY_BLUE = (15, 79, 255)     # #0f4fff
CHROMA_FLOOD = 60            # distância RGB ao tom de chave: flood remove
CHROMA_RIM = 110             # franja AA: alfa parcial até esta distância
CHROMA_CORE = 120            # remoção global de ilhas da cor de chave dentro da peça
SPILL_HUE_DEG = 38           # raio de matiz para considerar tom da chave
SPILL_SAT = 0.22             # saturação mínima p/ candidato a chave (sombra mantém matiz)

def _hue_of(r, g, b):
    import colorsys
    return colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)  # h em [0,1], s, v

def strip_matte(im: Image.Image) -> Image.Image:
    """Matte por detecção de fundo (auto):
    • fundo VERDE/AZUL de croma → flood por matiz/saturação (sombra da chave
      também cai) + despill SÓ na borda (verdes/azuis legítimos preservados);
    • fundo creme legado → flood de creme d<FLOOD + franja AA 1px.
    Interior do assunto nunca é removido em nenhum modo."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    # detecção de chave pelas 4 quinas
    import statistics
    corners = [px[1, 1], px[w-2, 1], px[1, h-2], px[w-2, h-2]]
    kr = int(statistics.median(c[0] for c in corners))
    kg = int(statistics.median(c[1] for c in corners))
    kb = int(statistics.median(c[2] for c in corners))
    kh, ks, kv = _hue_of(kr, kg, kb)
    if kg > kr + 25 and kg > kb + 25:
        key, key_h = KEY_GREEN, kh
    elif kb > kr + 25 and kb > kg + 15:
        key, key_h = KEY_BLUE, kh
    else:
        key, key_h = None, None  # creme legado

    def hue_dist(h1, h2):
        d = abs(h1 - h2)
        return min(d, 1.0 - d) * 360.0

    def is_matte(x, y):
        if px[x, y][3] == 0: return True
        r, g, b, a = px[x, y]
        if key is None:
            return ((r-CREAM[0])**2 + (g-CREAM[1])**2 + (b-CREAM[2])**2) ** 0.5 < FLOOD
        if ((r-key[0])**2 + (g-key[1])**2 + (b-key[2])**2) ** 0.5 < CHROMA_FLOOD:
            return True
        hh, ss, vv = _hue_of(r, g, b)
        return ss > SPILL_SAT and vv > 0.12 and hue_dist(hh, key_h) < SPILL_HUE_DEG

    def dist_key(x, y):
        r, g, b, a = px[x, y]
        ref = CREAM if key is None else key
        return ((r-ref[0])**2 + (g-ref[1])**2 + (b-ref[2])**2) ** 0.5

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if not seen[y*w+x] and is_matte(x, y): seen[y*w+x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w-1):
            if not seen[y*w+x] and is_matte(x, y): seen[y*w+x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and is_matte(nx, ny):
                seen[ny*w+nx] = 1; q.append((nx, ny))
    if key is not None:
        # chave real: remove TAMBÉM ilhas da cor do fundo fechadas dentro da peça
        # (vãos entre patas/corpo). A ficha garante que nada do assunto usa a cor
        # do croma, então a remoção global por distância de cor é segura.
        for y in range(h):
            for x in range(w):
                i = y*w+x
                if seen[i]: continue
                r, g, b, a = px[x, y]
                if a == 0: continue
                d = ((r-key[0])**2 + (g-key[1])**2 + (b-key[2])**2) ** 0.5
                if d >= CHROMA_CORE: continue
                hh, ss, vv = _hue_of(r, g, b)
                # fundo puro sempre removível; tons próximos exigem matiz da chave
                # e saturação (evita comer sálvia/turquesa pastel do assunto)
                if d < CHROMA_FLOOD or (hue_dist(hh, key_h) < SPILL_HUE_DEG and ss > SPILL_SAT):
                    seen[i] = 1
    # franja: 1px FORA do flood — alfa parcial só aí; nunca dentro
    rim = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if not seen[y*w+x]: continue
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx]:
                    rim[ny*w+nx] = 1
    f0, f1 = (FLOOD, RIM) if key is None else (25.0, float(CHROMA_RIM))
    for y in range(h):
        for x in range(w):
            i = y*w+x
            r, g, b, a = px[x, y]
            if seen[i]:
                px[x, y] = (r, g, b, 0)
            elif rim[i] and a > 0:
                d = dist_key(x, y)
                if d < f1:
                    k = max(0.0, min(1.0, (d - f0) / (f1 - f0)))
                    px[x, y] = (r, g, b, int(a * k))
    if key is not None:
        # despill SÓ em até 2px da borda do flood (preserva verdes/azuis do assunto)
        near = bytearray(w * h)
        for y in range(h):
            for x in range(w):
                i = y*w+x
                if seen[i] or (x >= w-4 or y >= h-4 or x < 4 or y < 4):
                    near[i] = 1; continue
                for dx in range(-4, 5):
                    for dy in range(-2, 3):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < w and 0 <= ny < h and seen[ny*w+nx]:
                            near[i] = 1; break
        for y in range(h):
            for x in range(w):
                i = y*w+x
                if not near[i]: continue
                r, g, b, a = px[x, y]
                if a == 0: continue
                if key == KEY_GREEN and g > (r + b) // 2:
                    px[x, y] = (r, (r + b) // 2, b, a)
                elif key == KEY_BLUE and b > (r + g) // 2:
                    px[x, y] = (r, g, (r + g) // 2, a)
    return im

def fit_sprite(im: Image.Image, tw: int, th: int) -> Image.Image:
    """Assunto em 'cover' da proporção do contrato + margem transparente."""
    im = strip_matte(im)
    bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    k = min(tw / im.width, th / im.height)
    nw, nh = max(1, round(im.width * k)), max(1, round(im.height * k))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    out.paste(im, ((tw - nw) // 2, (th - nh) // 2))
    return out

def fit_icon(im: Image.Image) -> Image.Image:
    im = strip_matte(im)
    bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq.resize((128, 128), Image.Resampling.LANCZOS)

def fit_atlas(im: Image.Image, tw: int, th: int) -> Image.Image:
    """Tira de UI: matte creme removido e conteúdo preenche o quadro exato do cutter.
    Preencher o bbox (leve esticamento) é intencional SÓ aqui: alinha as células
    dos cutters (16px/64px) — os atlas legados são majoritariamente transparentes."""
    im = strip_matte(im)
    bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    return im.convert('RGBA').resize((tw, th), Image.Resampling.LANCZOS)

def rel_or_abs(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(ROOT))
    except ValueError:
        return str(p)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_root = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--out-root=')), None)
    if len(args) < 1:
        print('uso: python3 tools/prepare_f1_migracao.py <pasta-originais> [sufixo-lote] [--out-root=DIR]')
        return 2
    src_dir = Path(args[0])
    tag = args[1] if len(args) > 1 else src_dir.name
    root = Path(out_root).resolve() if out_root else ROOT
    out_dir = root / 'art-source' / f'f1-{tag}-preparado'
    out_dir.mkdir(parents=True, exist_ok=True)
    recs, thumbs, missing = [], [], []
    for pid, (dest, dims, mode) in SPEC.items():
        src = src_dir / f'i_{pid}.png'
        if not src.exists():
            src = src_dir / f'{pid}.png'
        if not src.exists():
            missing.append(pid)
            continue
        im = Image.open(src)
        if mode == 'icon':
            out = fit_icon(im)
        elif mode == 'atlas':
            out = fit_atlas(im, *dims)
        else:
            out = fit_sprite(im, *dims)
        runtime = root / dest
        runtime.parent.mkdir(parents=True, exist_ok=True)
        out.save(runtime, optimize=True)
        out.save(out_dir / f'{pid}.png', optimize=True)
        recs.append(dict(id=pid, source=rel_or_abs(src), dest=dest,
                         size=list(dims), mode=mode,
                         source_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),
                         runtime_sha256=hashlib.sha256(runtime.read_bytes()).hexdigest(),
                         bytes=runtime.stat().st_size))
        thumbs.append((pid, out))
    (out_dir / 'manifest.json').write_text(json.dumps(recs, ensure_ascii=False, indent=2) + '\n')
    if thumbs:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
        cols, cell = 5, 260
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * cell, rows * (cell + 34)), (245, 237, 216))
        d = ImageDraw.Draw(sheet)
        for i, (pid, im) in enumerate(thumbs):
            x, y = (i % cols) * cell, (i // cols) * (cell + 34)
            th = im.copy(); th.thumbnail((cell - 20, cell - 20), Image.Resampling.LANCZOS)
            sheet.paste(th, (x + (cell - th.width) // 2, y + 10), th)
            d.text((x + 12, y + cell + 4), pid, font=font, fill=(73, 53, 33))
        sheet.save(out_dir / 'folha-revisao.png', optimize=True)
    print(f'{tag}: {len(recs)} peças preparadas em {rel_or_abs(out_dir)} (runtime atualizado).')
    if missing:
        print(f'  AVISO: sem original para {len(missing)} ids: ' + ', '.join(missing))
    return 0

if __name__ == '__main__':
    sys.exit(main())
