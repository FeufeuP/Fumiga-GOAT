#!/usr/bin/env python3
"""Prepare the explicitly requested 2026-10-09 lot, preserving originals.
Only RGB flattening and uniform reduction; no procedural replacement art.
Pillow is an authoring dependency, never a runtime dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'art-source/f1-publicacao'
LOT={'brasa':('game/assets/sprites/icons/ember.png',128),
     'botao':('game/assets/ui/paper/button.png',960),
     'tooltip':('game/assets/ui/paper/tooltip.png',960),
     'pausa':('game/assets/ui/paper/pause.png',928)}
prior_path=ROOT/'docs/arte/hud-publicacao.json'
prior=json.loads(prior_path.read_text()) if prior_path.exists() else {'lot':[]}
records=[]
for name,(dest,width) in LOT.items():
 source=BASE/'originais'/f'{name}.png';im=Image.open(source).convert('RGB');size=im.size
 im.thumbnail((width,width*2),Image.Resampling.LANCZOS)
 target=ROOT/dest;target.parent.mkdir(parents=True,exist_ok=True);im.save(target,optimize=True)
 records.append(dict(id=name,source=str(source.relative_to(ROOT)),source_size=list(size),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),runtime=dest,runtime_size=list(im.size),runtime_sha256=hashlib.sha256(target.read_bytes()).hexdigest(),runtime_bytes=target.stat().st_size,mode='RGB',reference='game/assets/ui/paper/panel.png',prompt='FUMIGA-PAPEL-v3-PASTEL-ORGANICO',integration='explicit user request 2026-10-09',visual_approval='not separately claimed',backup='pending'))
# Re-running preparation must not erase verified backups of unchanged sources.
for record in records:
    previous=next((r for r in prior['lot'] if r['id']==record['id'] and r['source_sha256']==record['source_sha256']),None)
    if previous: record['backup']=previous['backup']
manifest={**prior,'date':'2026-10-09','lot':records,'scope':'one recreated flame without rings, three new HUD paintings; no approval of lost prior icons inferred'}
(ROOT/'docs/arte/hud-publicacao.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
cv=Image.new('RGB',(1500,1050),'#f5edd8');d=ImageDraw.Draw(cv)
for name,box in [('brasa',(30,45,400,560)),('botao',(440,45,1460,330)),('tooltip',(440,400,1460,950)),('pausa',(30,600,400,1010))]:
 im=Image.open(BASE/'originais'/f'{name}.png');x,y,r,b=box;im.thumbnail((r-x,b-y),Image.Resampling.LANCZOS);cv.paste(im,(x,y));d.text((x,y-30),name.upper(),font=font,fill='#493521')
cv.save(BASE/'lote.png',optimize=True)
print(json.dumps(manifest,ensure_ascii=False,indent=2))
