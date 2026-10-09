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
 await page.waitForFunction(()=>['panel','button','card','pause','tooltip'].every(k=>!!MOD.assets.IMG['paper_'+k]));
 const result=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');
  ctx.fillStyle='#253524';ctx.fillRect(0,0,960,540);
  const hashes=[];const opts=[{}, {hot:true},{pressed:true},{selected:true},{disabled:true}];
  for(let i=0;i<5;i++) {
   MOD.paper.drawPaper(ctx,'button',20,20+i*80,240,60,opts[i]);
   const a=ctx.getImageData(20,20+i*80,240,60).data;let hash=0;
   for(let j=0;j<a.length;j++){if(j%4===3&&a[j]!==255)throw Error('alpha');hash=(hash*31+a[j])|0;}
   hashes.push(hash);
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
  for(const y of [10,150,290]) {
    const data=tc.getImageData(0,y,30,1).data;
    let painted=0;for(let i=0;i<data.length;i+=4) {
      if(data[i+3]!==255)throw Error('transparent tall frame');
      if(data[i]<200)painted++;
    }
    if(!painted)throw Error('missing tall frame at '+y);
  }
  const geo=MOD.paper.paperGeometry('card',848,1264,120,300);
  if(geo.dx.at(-1)!==120||geo.dy.at(-1)!==300)throw Error('incomplete frame');
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
 console.log('PAPER HUD OK: cinco estados distintos, alpha255, tinta local e reset por frame');
} finally {await browser.close();await server.close();}
