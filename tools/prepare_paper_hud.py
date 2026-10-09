#!/usr/bin/env python3
"""Opaque derivatives of approved images; no redraw/recolor of artwork.
Requires Pillow as an authoring tool only. Sources are preserved outside Git.
Border-connected neutral exterior alone becomes cream; never creates alpha.
"""
from pathlib import Path
from collections import deque
from PIL import Image
import hashlib, json
ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'panel': 'art-source/f1-hud-vivo/images/painel-original.png',
    'button': 'art-source/f1-funcoes/originais/botao.png',
    'health': 'art-source/f1-funcoes/originais/barra-vida.png',
    'banner': 'art-source/f1-funcoes/originais/banner-onda.png',
    'minimap': 'art-source/f1-funcoes-lote2/originais/minimapa.png',
    'tooltip': 'art-source/f1-funcoes-lote2/originais/tooltip.png',
    'card': 'art-source/f1-funcoes-lote2/originais/cartao.png',
    'pause': 'art-source/f1-funcoes-lote2/originais/pausa.png',
}
OUT = ROOT / 'game/assets/ui/paper'
# This script describes the older lot. Never silently overwrite the new art.
if (ROOT/'docs/arte/hud-publicacao.json').exists():
    raise SystemExit('Historical lot: use tools/prepare_hud_publication.py for new button/tooltip/pause. Recover older sources from their Drive archives separately; do not overwrite publication assets.')
OUT.mkdir(parents=True, exist_ok=True)
records=[]
for name, source in SOURCES.items():
    path=ROOT/source
    original=Image.open(path).convert('RGB')
    w,h=original.size
    pixels=original.load()
    visited=bytearray(w*h)
    q=deque()
    def seed(x,y):
        i=y*w+x
        r,g,b=pixels[x,y]
        if not visited[i] and min(r,g,b)>=175 and max(r,g,b)-min(r,g,b)<=10:
            visited[i]=1; q.append((x,y))
    for x in range(w): seed(x,0); seed(x,h-1)
    for y in range(h): seed(0,y); seed(w-1,y)
    result=original.copy(); dst=result.load(); changed=0
    while q:
        x,y=q.popleft(); dst[x,y]=(245,237,216); changed+=1
        if x: seed(x-1,y)
        if x+1<w: seed(x+1,y)
        if y: seed(x,y-1)
        if y+1<h: seed(x,y+1)
    # Byte-exact RGB of every pixel outside the neutral exterior mask.
    a=original.tobytes(); b=result.tobytes()
    for i,v in enumerate(visited):
        if not v: assert a[i*3:i*3+3]==b[i*3:i*3+3], (name,i)
    # Uniform high-quality downsample, no aspect-ratio distortion.
    size=(min(960,w),round(h*min(960,w)/w))
    result=result.resize(size,Image.Resampling.LANCZOS)
    target=OUT/(name+'.png'); result.save(target,optimize=True)
    records.append(dict(id=name,source=source,source_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_size=[w,h],size=list(size),mode=result.mode,exterior_pixels=changed,
        art_rgb_unchanged_before_resize=True,bytes=target.stat().st_size,
        sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
manifest=ROOT/'docs/arte/paper-hud.json'
manifest.write_text(json.dumps(dict(decision='2026-10-09: opaque HUD; original artwork, no alpha',images=records),ensure_ascii=False,indent=2)+'\n')
print(f'{len(records)} opaque RGB images, {sum(r["bytes"] for r in records):,} bytes; artwork RGB unchanged before uniform resize')
