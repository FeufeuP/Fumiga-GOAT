import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const OUT=process.env.PAPER_SHOTS || fileURLToPath(new URL('../../art-source/f1-correcao/tecnico/',import.meta.url));
import {startServer} from './lib/server.mjs';
import {launchBrowser,importGameModules} from './lib/browser.mjs';
const server=await startServer(),browser=await launchBrowser();
try {
 const page=await browser.newPage();await page.goto(server.url+'/game/?debug&tela=TITLE');
 await importGameModules(page,{paper:'paper_hud.js',font:'font.js',assets:'assets.js'});
 await page.waitForFunction(()=>['panel','card','pause','tooltip'].every(k=>!!MOD.assets.IMG['paper_'+k]) &&
  ['largo','grande','pequeno','mini'].every(size=>['normal','hover','pressionado','selecionado','desabilitado'].every(state=>!!MOD.assets.IMG[`wood_button_${size}_${state}`])));
  const result=await page.evaluate(()=>{
  const shapeRef={};
  if(MOD.assets.IMG.paper_button)throw Error('old paper button sprite still loaded');
  // Placas de madeira: variação por tamanho real + estados como artes próprias.
  const sz=MOD.paper.woodButtonSize;
  if(sz(300,46)!=='largo'||sz(220,44)!=='grande'||sz(120,28)!=='pequeno'||sz(44,44)!=='mini'||sz(236,44)!=='grande')throw Error('wood size map');
  // Duas pontas, sem cantos quadrados: testa o sprite já recomposto pelo motor.
  for(const [w,h] of [[300,46],[220,44],[120,28],[44,44]]) {
    for(const opt of [{},{hot:true},{pressed:true},{selected:true},{disabled:true}]) {
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const cx=c.getContext('2d');MOD.paper.drawPaper(cx,'button',0,0,w,h,opt);
      const alpha=(x,y)=>cx.getImageData(Math.floor(x),Math.floor(y),1,1).data[3];
      for(const x of [w*.03,w*.97]) {
        if(alpha(x,h*.12)>16 || alpha(x,h*.88)>16)throw Error('wood square corner '+w+'x'+h);
        if(alpha(x,h*.5)<128)throw Error('missing wood tip '+w+'x'+h);
      }
      if(alpha(w*.5,h*.5)!==255)throw Error('wood text surface not opaque');
    }
  }
  const wc=document.createElement('canvas');wc.width=220;wc.height=44;const wx=wc.getContext('2d');
  MOD.paper.drawPaper(wx,'button',0,0,220,44,{});const woodNormal=wc.toDataURL();
  MOD.paper.drawPaper(wx,'button',0,0,220,44,{hot:true});if(wc.toDataURL()===woodNormal)throw Error('wood hover alias');
  MOD.paper.drawPaper(wx,'button',0,0,220,44,{disabled:true});if(wc.toDataURL()===woodNormal)throw Error('wood disabled alias');
  const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');
  ctx.fillStyle='#253524';ctx.fillRect(0,0,960,540);
  const hashes=[];const opts=[{}, {hot:true},{pressed:true},{selected:true},{disabled:true}];
  for(let i=0;i<5;i++) {
   // Drawn on an isolated transparent tile: the sheet around the painting must
   // stay empty (no matte, no state rectangle) while the art itself is opaque.
   const t=document.createElement('canvas');t.width=240;t.height=60;
   const tc=t.getContext('2d');MOD.paper.drawPaper(tc,'button',0,0,240,60,opts[i]);
   const a=tc.getImageData(0,0,240,60).data;let hash=0,clear=0,solid=0;
   for(let j=3;j<a.length;j+=4){if(a[j]===0)clear++;else if(a[j]===255)solid++;}
   if(!clear)throw Error('button state '+i+' still has an opaque sheet');
   if(solid<240*60*0.3)throw Error('button state '+i+' lost its painted body');
   for(let j=0;j<a.length;j++)hash=(hash*31+a[j])|0;
   hashes.push(hash);
   MOD.paper.drawPaper(ctx,'button',20,20+i*80,240,60,opts[i]);
  }
  // Dedicated new tooltip, not alias of the panel or rejected historical art.
  if(MOD.paper.paperSource('tooltip',420,240)!=='tooltip')throw Error('tooltip not integrated');
  const tt=document.createElement('canvas');tt.width=420;tt.height=240;
  const pp=document.createElement('canvas');pp.width=420;pp.height=240;
  MOD.paper.drawPaper(tt.getContext('2d'),'tooltip',0,0,420,240);
  MOD.paper.drawPaper(pp.getContext('2d'),'panel',0,0,420,240);
  if(tt.toDataURL()===pp.toDataURL())throw Error('tooltip still aliases panel');
  if(MOD.paper.paperSource('pause',360,440)!=='pause')throw Error('pause not integrated');
  MOD.paper.drawPaper(ctx,'tooltip',300,20,420,240);
  // Tall surfaces must use portrait art and enclose the whole content area,
  // not a small landscape painting stranded on blank matte.
  if(MOD.paper.paperSource('panel',120,300)!=='card')throw Error('portrait source');
  const tall=document.createElement('canvas');tall.width=120;tall.height=300;
  const tc=tall.getContext('2d');MOD.paper.drawPaper(tc,'panel',0,0,120,300);
  // Contrato 2026-10-16 (sem distorção): o arte entra uniformemente e CENTRADO
  // (contain) — a moldura completa fica nas bordas do desenho, que preserva a
  // proporção original da pintura (848×1264 → 120×179 centrado em y≈60).
  const fit=MOD.paper.paperFit(848,1264,120,300);
  if(fit.fw!==120||Math.abs(fit.fh/fit.fw-1264/848)>0.02)throw Error('tall art distorted');
  if(Math.abs(fit.oy-(300-fit.fh)/2)>1)throw Error('tall art not centred');
  for(const y of [fit.oy+Math.round(fit.fh*.25),fit.oy+Math.round(fit.fh/2),fit.oy+Math.round(fit.fh*.75)]) {
    const data=tc.getImageData(0,y,30,1).data;
    let painted=0;for(let i=0;i<data.length;i+=4) {
      if(data[i+3]>8&&data[i]<200)painted++;
    }
    if(!painted)throw Error('missing tall frame at '+y);
  }
  // Interior paper stays opaque so text remains readable over the world.
  const mid=tc.getImageData(60,fit.oy+Math.round(fit.fh/2),1,1).data;
  if(mid[3]!==255)throw Error('frame interior lost its paper');
  const geo=MOD.paper.paperGeometry('card',848,1264,120,300);
  if(geo.dx.at(-1)!==geo.fw||geo.dy.at(-1)!==geo.fh)throw Error('incomplete frame');
  if(Math.abs(geo.fw/geo.fh-848/1264)>0.02)throw Error('geometry distorted the sprite');
  // Nenhum sprite é deformado em nenhum alvo: a CAIXA PINTADA mantém a mesma
  // proporção em alvos de formatos diferentes (medição por alfa).
  for(const [kind,w,h] of [['panel',320,122],['panel',420,160],['panel',960,512],['banner',300,60],['banner',120,90],['card',220,300],['card',120,180],['tooltip',280,138],['tooltip',400,120],['pause',330,230],['pause',120,160],['health',540,12],['health',200,28]]) {
    const t=document.createElement('canvas');t.width=w;t.height=h;
    const cx=t.getContext('2d');MOD.paper.drawPaper(cx,kind,0,0,w,h);
    const d=cx.getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=0,y1=0;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      if(d[(yy*w+xx)*4+3]>8){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}
    }
    const drawn=(x1-x0+1)/(y1-y0+1);
    const ref=shapeRef[kind];
    const tol=Math.max(0.04,2.5/Math.max(1,y1-y0+1)); // ±1px de arredondamento
    if(ref==null)shapeRef[kind]=drawn;
    else if(Math.abs(drawn/ref-1)>tol)throw Error('distorted sprite '+kind+' '+w+'x'+h+' ('+drawn.toFixed(2)+' vs '+ref.toFixed(2)+')');
  }
  // Área permitida: o texto se centraliza no papel liso medido da pintura.
  const qq=MOD.paper.paperQuiet('panel',10,8,320,171);
  if(qq.w<=0||qq.h<=0)throw Error('quiet area missing');
  if(qq.x<10||qq.y<8||qq.x+qq.w>331||qq.y+qq.h>180)throw Error('quiet area outside the box');
  const inside=MOD.font.paperAt(ctx,100,40),outside=MOD.font.paperAt(ctx,900,500);
  MOD.font.layoutRec.layer='world';const world=MOD.font.paperAt(ctx,100,40);MOD.font.layoutRec.layer='ui';
  MOD.font.clearPaperSurfaces();const next=MOD.font.paperAt(ctx,100,40);
  return {hashes,inside,outside,world,next,png:c.toDataURL()};
 });
 assert.equal(new Set(result.hashes).size,5);assert.equal(result.inside,true);
 for(const k of ['outside','world','next'])assert.equal(result[k],false,k);
 fs.mkdirSync(OUT,{recursive:true});
 fs.writeFileSync(path.join(OUT,'estados-tooltip.png'),Buffer.from(result.png.split(',')[1],'base64'));
 assert.equal(await page.evaluate(()=>MOD.paper.paperState({disabled:true,pressed:true,selected:true,hot:true})),'disabled');
 console.log('PAPER HUD OK: cinco estados distintos, fundo recortado, interior opaco, tinta local e reset por frame');
} finally {await browser.close();await server.close();}
