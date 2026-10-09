import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './lib/server.mjs';
import {launchBrowser,importGameModules,watchPage} from './lib/browser.mjs';
const server=await startServer(),b=await launchBrowser(),out=process.env.PUBLICATION_SHOTS||fileURLToPath(new URL('../../art-source/f1-publicacao/tecnico/',import.meta.url));
fs.mkdirSync(out,{recursive:true});
const errors=[];
try{
 for(const mobile of [false,true]) {
  const c=await b.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});const p=await c.newPage();watchPage(p,errors);
  await p.goto(server.url+(mobile?'/game/mobile/':'/game/')+'?debug&tela=RUN&seed=7&invencivel');
  await importGameModules(p,{game:'game.js',state:'state.js',ui:'ui.js',input:'input.js',assets:'assets.js',config:'config.js'});
  await p.waitForFunction(()=>MOD.state.G.run&&MOD.assets.IMG.i_ember&&MOD.assets.IMG.paper_tooltip);
  await p.evaluate(()=>{
   MOD.state.G.run.banner=null;
   const brasa=MOD.config.MUTATIONS.find(m=>m.id==='brasa');
   if(!brasa)throw Error('Brasa mutation missing');MOD.state.G.run.mutationLog.push({...brasa});
   MOD.input.mouse.x=20;MOD.input.mouse.y=170;
  });
  await p.waitForTimeout(250);
  // Find top left mutation chip via its position, which depends on font height.
  await p.evaluate(()=>{MOD.input.mouse.x=20;MOD.input.mouse.y=162;});await p.waitForTimeout(250);
  await p.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-brasa-tooltip.png'});
  await p.evaluate(()=>MOD.game.setPaused(true));await p.waitForTimeout(150);
  const resume=await p.evaluate(()=>MOD.ui.uiButtons().find(x=>x.id==='resume'));
  if(!resume)throw Error('resume missing');const rect=await p.locator('#game').boundingBox();const x=rect.x+(resume.x+resume.w/2)*rect.width/960,y=rect.y+(resume.y+resume.h/2)*rect.height/540;
  if(mobile)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);
  await p.waitForFunction(()=>!MOD.game.isPaused());await c.close();
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('BRASA + TOOLTIP + RESUME OK PC/mobile');
}finally{await b.close();await server.close()}
