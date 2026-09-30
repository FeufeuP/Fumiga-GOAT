// Fase 3: seleção, leitura, compra explícita, save e áreas de toque reais.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer } from './lib/server.mjs';
import { launchBrowser, watchPage } from './lib/browser.mjs';
const server = await startServer(), browser = await launchBrowser();
const out = '/tmp/fumiga-tree'; fs.mkdirSync(out,{recursive:true});
try {
  for(const mobile of [false,true]) {
    const context = await browser.newContext({ viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile });
    const page=await context.newPage(), errors=[];watchPage(page,errors);
    await page.goto(server.url+(mobile?'/game/mobile/':'/game/')+'?debug&limpo&hud=0&tela=TREE');
    await page.waitForFunction(()=>window.FUMIGA?.pronto);
    await page.evaluate(()=>{const root=document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/,'');window.M=n=>import(root+n);});
    const ids=await page.evaluate(async()=> (await M('tree_layout.js')).TREE_ALL.map(n=>n.id));
    async function tap(x,y) {
      const r=await page.locator('#game').boundingBox();
      if(mobile) await page.touchscreen.tap(r.x+x*r.width/960,r.y+y*r.height/540);
      else await page.mouse.click(r.x+x*r.width/960,r.y+y*r.height/540);
      await page.waitForTimeout(60);
    }
    async function pick(id) {
      await page.evaluate(async id=>{(await M('meta.js')).treeFocusNode(id);},id);
      await page.waitForTimeout(40);
      const p=await page.evaluate(async id=>(await M('meta.js')).treeNodePosition(id),id);
      await tap(p.x,p.y);
    }
    async function click(id) {
      const b=await page.evaluate(async id=>(await M('ui.js')).uiButtons().find(b=>b.id===id),id);
      assert.ok(b,'botão '+id);await tap(b.x+b.w/2,b.y+b.h/2);
    }
    // Os santuários não são carregados no boot: cada fundo chega só ao abrir seu fruto.
    const bootSanctuaries=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('santuario_')).length);
    assert.equal(bootSanctuaries,0,'nenhum PNG de santuário no boot');
    await page.evaluate(async()=>{const {G}=await M('state.js');G.save.clearedMaps={planicie:true};G.save.essence=9999;});
    // Entrada real pelos frutos da copa: sem usar foco debug para abrir o menu.
    const maps=await page.evaluate(async()=>(await M('config.js')).FRUIT_TREES.map(f=>f.map));
    for(const map of maps){
      const p=await page.evaluate(async map=>(await M('meta.js')).treeFruitPosition(map),map);
      await tap(p.x,p.y);
      const asset=map==='topo'?'palida':map;
      await page.waitForFunction(name=>performance.getEntriesByType('resource').some(e=>e.name.includes('santuario_'+name+'.png')),asset);
      await page.waitForTimeout(60);
      const cards=await page.evaluate(async()=>(await M('ui.js')).uiButtons().filter(b=>b.id.startsWith('fruitNode_')));
      if(map==='topo'){
        assert.equal(cards.length,0,'Pálida selada não mostra flores');
        assert.equal(await page.evaluate(async()=>(await M('meta.js')).treeNodePosition('v_a1')),null,'poder futuro não tem posição de compra');
        await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario-palida.png'});
      }else{
        assert.equal(cards.length,13,map+' mostra as 13 flores novas e legadas juntas');
        assert.ok(cards.every(b=>b.w>=44 && b.h>=44),'alvos invisíveis das flores com 44px lógicos');
        assert.equal(await page.evaluate(async()=>(await M('ui.js')).uiButtons().some(b=>b.id==='fruitNew'||b.id==='fruitLegacy')),false,'jardim sem abas');
        if(map==='planicie'){
          const growth=await page.evaluate(async()=>(await M('meta.js')).fruitGardenGrowth('planicie'));
          assert.deepEqual(growth,{levels:0,total:growth.total,progress:0,restoredPercent:0,saturation:0});
          assert.ok(growth.total>0,'o jardim mede os níveis possíveis do fruto');
          const color=await page.evaluate(async()=>{
            const {loadSantuario,IMG}=await M('assets.js'),{createColorRestorer}=await M('color_restore.js');
            const background=await loadSantuario('planicie');
            function inspect(image){
              const painter=createColorRestorer();
              function chroma(canvas){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let max=0;
                for(let k=0;k<data.length;k+=4)if(data[k+3])max=Math.max(max,Math.max(data[k],data[k+1],data[k+2])-Math.min(data[k],data[k+1],data[k+2]));return max;}
              const gray=painter(image,0),grayChroma=chroma(gray),mid=painter(image,.5),midChroma=chroma(mid),full=painter(image,1);
              const c=full.getContext('2d').getImageData(0,0,full.width,full.height).data;
              const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
              const sc=source.getContext('2d');sc.drawImage(image,0,0);const d=sc.getImageData(0,0,image.width,image.height).data;
              let difference=0;for(let k=0;k<c.length;k+=4)for(let ch=0;ch<3;ch++)difference=Math.max(difference,Math.abs(c[k+ch]-d[k+ch]));
              return {grayChroma,midChroma,difference,bakes:painter.info().bakes};
            }
            return {background:inspect(background),apple:inspect(IMG.maca_planicie)};
          });
          for(const art of Object.values(color)){
            assert.equal(art.grayChroma,0,'arte começa realmente acromática');
            assert.ok(art.midChroma>0,'compra restaura cor intermediária');
            assert.equal(art.difference,0,'100% recupera os pixels originais');
            assert.equal(art.bakes,3,'baking só muda ao alterar saturação');
          }
          await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario.png'});
          await click(cards[0].id);
          const modal=await page.evaluate(async()=>(await M('ui.js')).uiButtons().map(b=>b.id));
          assert(modal.includes('treeBuy')&&modal.includes('treeClose'),'inspecionar abre painel Evoluir/Fechar');
          assert.equal(await page.evaluate(()=>Object.keys(FUMIGA.G.save.nodes).length),0,'selecionar flor não compra');
          await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario-flor.png'});
          // Com o painel aberto, tocar em OUTRA flor troca a leitura na hora.
          await click(cards[1].id);
          const trocada=await page.evaluate(async()=>(await M('meta.js')).treeViewState().selected);
          assert.equal(trocada,cards[1].id.slice('fruitNode_'.length),'clicar em outra flor troca o painel');
          assert.equal(await page.evaluate(()=>Object.keys(FUMIGA.G.save.nodes).length),0,'trocar de flor não compra');
          await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario-flor-trocada.png'});
          await click('treeClose');
          // Estágio 1 (1ª compra = broto vivo), Estágio 2 (2ª compra = broto meio aberto),
          // Estágio 3 (3ª compra = flor florescida), nas 3 variações de flores da Planície.
          await click(cards[0].id); await click('treeBuy');
          const grown=await page.evaluate(async()=>(await M('meta.js')).fruitGardenGrowth('planicie'));
          assert.equal(grown.levels,1,'a compra real avança o jardim');
          assert.equal(grown.progress,1/grown.total,'o avanço usa os níveis comprados daquele fruto');
          assert.equal(grown.saturation,Math.sqrt(grown.progress),'curva de cor acompanha a Árvore original');
          const stagesCheck = await page.evaluate(async () => {
            const { flowerStage, flowerVariant } = await M('meta.js');
            const { FRUIT_TREES } = await M('config.js');
            const f = FRUIT_TREES.find(x => x.map === 'planicie');
            const variants = new Set(f.nodes.map((n, i) => flowerVariant({ ...n, _nodeIdx: i })));
            return {
              variants: [...variants].sort(),
              s0: flowerStage(0, 3),
              s1: flowerStage(1, 3),
              s2: flowerStage(2, 3),
              s3: flowerStage(3, 3),
            };
          });
          assert.deepEqual(stagesCheck.variants, [0, 1, 2], '3 variações temáticas na Planície');
          assert.deepEqual(stagesCheck.s0, { stage: 3, gray: true, name: 'BROTO MORTO' }, '0 compras = broto morto cinza (4ª coluna)');
          assert.deepEqual(stagesCheck.s1, { stage: 0, gray: false, name: 'BROTO' }, '1ª compra = broto vivo');
          assert.deepEqual(stagesCheck.s2, { stage: 1, gray: false, name: 'BROTO MEIO ABERTO' }, '2ª compra = broto meio aberto');
          assert.deepEqual(stagesCheck.s3, { stage: 2, gray: false, name: 'FLORESCIDA' }, '3ª compra (completa) = flor florescida');
          // Compra 2ª vez na flor 0 (broto meio aberto) e 3ª vez (florescida),
          // 2 vezes na flor 1 (meio aberto) e 1 vez na flor 2 (broto) para exibir todas juntas.
          await click('treeBuy');
          assert.equal(await page.evaluate(() => FUMIGA.G.save.nodes.v_p1), 2, '2ª compra = estágio 2');
          await click('treeBuy');
          assert.equal(await page.evaluate(() => FUMIGA.G.save.nodes.v_p1), 3, '3ª compra = estágio 3 completo');
          await click('treeClose');
          await click(cards[1].id); await click('treeBuy'); await click('treeBuy');
          assert.equal(await page.evaluate(() => FUMIGA.G.save.nodes.v_p2), 2, 'flor 2 em broto meio aberto');
          await click('treeClose');
          await click(cards[2].id); await click('treeBuy');
          assert.equal(await page.evaluate(() => FUMIGA.G.save.nodes.v_p3), 1, 'flor 3 em broto');
          await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario-cor.png'});
          await click('treeClose');
          await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-santuario-estagios.png'});
        }
      }
      await click('treeMiniBack');
    }
    const sanctuaryFiles=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('santuario_')));
    assert.equal(sanctuaryFiles.length,7,'um request sob demanda por mundo');
    assert.equal(new Set(sanctuaryFiles.map(n=>n.split('/').at(-1).split('?')[0])).size,7,'sete arquivos diferentes');
    for(const big of [false,true]) {
      await page.evaluate(async big=>{const {G}=await M('state.js');G.save.accessibility.bigFont=big;G.save.nodes={};G.save.clearedMaps={};G.save.essence=9999;},big);
      for(const id of ids) {
        if(id.startsWith('v_a')) continue; // poderes da Pálida seguem futuros e sem flores
        await pick(id);
        const audit=await page.evaluate(()=>FUMIGA.auditarLayout());
        assert.deepEqual(audit.issues,[],`${mobile?'mobile':'PC'} fonte ${big} ${id}`);
        assert.equal(await page.evaluate(async()=>Object.keys((await M('state.js')).G.save.nodes).length),0,'inspecionar não compra');
      }
    }
    await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-detalhe.png'});
    await page.evaluate(async()=>{ const {G}=await M('state.js');G.save.essence=50000;for(const f of (await M('config.js')).FRUIT_TREES) G.save.clearedMaps[f.map]=true; });
    for(const id of ids.filter(id=>id.startsWith('f_') || id.startsWith('v_') && !id.startsWith('v_a'))) {
      await pick(id);await click('treeBuy');
      assert.equal(await page.evaluate(async id=>(await M('state.js')).G.save.nodes[id],id),1,id+' comprado pelo botão');
    }
    await page.goto(page.url().replace('&limpo','')); await page.waitForFunction(()=>window.FUMIGA?.pronto);
    await page.evaluate(()=>{const root=document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/,'');window.M=n=>import(root+n);});
    const saved=await page.evaluate(()=>FUMIGA.G.save);
    assert.equal(Object.keys(saved.nodes).filter(id=>id.startsWith('f_') || id.startsWith('v_')).length,78,'78 compras acessíveis persistidas após reload');
    assert.equal(saved.era,1,'lendário dá uma Era só');
    await page.evaluate(()=>FUMIGA.go('TREE'));await page.waitForTimeout(200);
    await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-arvore.png'});
    await pick('v_i6');await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-mini-gelo.png'});
    await page.keyboard.press('Escape');await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>FUMIGA.G.screen),'TREE');
    await page.keyboard.press('Escape');await page.waitForTimeout(80);
    assert.ok(await page.evaluate(async()=>(await M('ui.js')).uiButtons().some(b=>b.id==='treeMemories')),'Escape volta da miniárvore para árvore');
    if(mobile) {
      await page.evaluate(()=>FUMIGA.go('RUN',{mapa:5,seed:7})); await page.waitForTimeout(700);
      await click('hudMore'); await click('touchScent');
      assert.equal(await page.evaluate(async()=>(await M('input.js')).keys.KeyH),true,'olfato por toque');
      await click('touchScent');
      assert.equal(await page.evaluate(async()=>(await M('input.js')).keys.KeyH),false,'desligar olfato');
    }
    assert.deepEqual(errors,[]);
    console.log((mobile?'MOBILE':'PC')+': 127 posições de flor/nó normal/grande sem colisão, 7 fundos sob demanda, compra/saves preservados');
    await context.close();
  }
} finally { await browser.close();await server.close(); }
console.log('ÁRVORE NO NAVEGADOR OK — capturas em '+out);
