#!/usr/bin/env python3
"""Prepare the review lot, never migrate unapproved art into game/assets.
No palette/shape replacement: only RGB flattening and uniform downsampling.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'art-source/f1-correcao'
IDS=['food','essence','shield','bolt','hourglass','snow','heal','egg','ember','potion']
NAMES=['Alimento','Essência','Defesa','Energia','Tempo','Frio','Cura','Prole','Brasa','Poção']
out=BASE/'icones';out.mkdir(exist_ok=True)
records=[]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
canvas=Image.new('RGB',(1500,820),'#f5edd8');d=ImageDraw.Draw(canvas)
d.text((30,15),'FUMIGA · 10 ícones em revisão — não integrados',font=font,fill='#493521')
for i,(id,label) in enumerate(zip(IDS,NAMES)):
 p=BASE/'originais'/f'i_{id}.png';im=Image.open(p).convert('RGB')
 size=im.size
 # Potion arrived landscape: remove only blank side margins, never squash.
 crop=(320,0,1088,768) if id=='potion' else (0,0,*size)
 im=im.crop(crop)
 im.thumbnail((128,128),Image.Resampling.LANCZOS)
 target=out/f'i_{id}.png';im.save(target,optimize=True)
 x=(i%5)*300+20;y=(i//5)*370+60
 large=Image.open(p).convert('RGB').crop(crop);large.thumbnail((250,250),Image.Resampling.LANCZOS);canvas.paste(large,(x,y))
 d.text((x,y+255),label,font=font,fill='#493521')
 for j,s in enumerate([16,24,32,48]):
  mini=im.resize((s,s),Image.Resampling.LANCZOS);canvas.paste(mini,(x+j*64,y+288));d.text((x+j*64,y+340),str(s),font=small,fill='#493521')
 records.append(dict(id='i_'+id,label=label,source=str(p.relative_to(ROOT)),source_size=size,crop=crop,source_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),review=str(target.relative_to(ROOT)),bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),status='review-only',prompt='FUMIGA-PAPEL-v3-PASTEL-ORGANICO + ficha de símbolo HUD, fundo opaco',reference='art-source/f1-correcao/originais/i_food.png' if id!='food' else 'art-source/f1-hud-vivo/images/painel-original.png'))
canvas.save(BASE/'icones-revisao.png',optimize=True)
(out/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('10 candidatos RGB128; total',sum(r['bytes'] for r in records),'bytes. Nada copiado ao runtime.')
