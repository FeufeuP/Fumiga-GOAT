// PRÉ-CARREGAMENTO DO TITLE (Regra 14) num Chromium real, PC e mobile, SEM
// modo debug (como um jogador novo):
//   1. o boot continua leve: nada de santuário/Noite Branca antes do TITLE;
//   2. parado no TITLE, árvore, frutos, 7 santuários e Noite Branca ficam
//      prontos em fatias de poucos ms por quadro;
//   3. ÁRVORE → 7 santuários → MEMÓRIAS (replay sem expedição) → PROFECIAS →
//      TITLE sem nenhuma tela de carregamento, sem rebaixar nem reassar nada;
//   4. clicar antes do fim também abre na hora (o resto termina ali mesmo).
// node game/test/preload-browser.mjs  (= npm run inspect:preload; tools/setup-dev.sh antes)
import assert from "node:assert/strict";
import fs from "node:fs";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage, importGameModules } from "./lib/browser.mjs";

const OUT = process.env.PRELOAD_SHOTS || "/tmp/fumiga-preload";
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(), browser = await launchBrowser();
const profiles = [
  { id: "pc", path: "/game/", ctx: { viewport: { width: 1280, height: 720 } } },
  { id: "mobile", path: "/game/mobile/", ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];

async function open(profile) {
  const context = await browser.newContext(profile.ctx);
  const page = await context.newPage(), errors = [];
  watchPage(page, errors);
  // Santuário: conta os <img> do loadSantuario (o Blob da decodificação fora da
  // thread vem do cache HTTP em produção; o servidor de teste é no-store).
  const net = { santuario: 0, noite: 0 };
  page.on("request", (r) => {
    if (/santuario_[a-z]+\.png/.test(r.url()) && r.resourceType() === "image") net.santuario++;
    if (r.url().includes("/cutscenes/noite_branca/")) net.noite++;
  });
  await page.goto(server.url + profile.path);
  // Predicados SÍNCRONOS lendo MOD (lib/browser.mjs): async não esperaria nada.
  await importGameModules(page, { state: "state.js", ui: "ui.js", preload: "preload.js", tree: "tree_art.js",
    meta: "meta.js", cs: "cutscenes.js", ls: "loading_screen.js", render: "render.js", config: "config.js",
    assets: "assets.js", cr: "color_restore.js", utils: "utils.js" });
  await page.waitForFunction(() => MOD.state.G.screen === "PRETITLE", null, { timeout: 30000, polling: 100 });
  const mobile = !!profile.ctx.hasTouch;
  async function tap(x, y) {
    const r = await page.locator("#game").boundingBox();
    const px = r.x + x * r.width / 960, py = r.y + y * r.height / 540;
    if (mobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
  }
  async function button(id) {
    const h = await page.waitForFunction((id) => MOD.ui.uiButtons().find((b) => b.id === id), id, { timeout: 8000 });
    const b = await h.jsonValue(); await h.dispose();
    await tap(b.x + b.w / 2, b.y + b.h / 2);
  }
  /** Espera uma tela vigiando, quadro a quadro, se alguma tela de carregamento surgiu. */
  async function reach(check, label) {
    const r = await page.evaluate((check) => {
      const { ls, render, cs } = MOD, G = MOD.state.G;
      const test = new Function("G", "cs", "return " + check);
      return new Promise((res) => {
        let loading = false, worst = 0, last = 0;
        const t0 = performance.now();
        (function frame(t) {
          if (last) worst = Math.max(worst, t - last);
          last = t;
          loading = loading || ls.isLoadingActive();
          if ((test(G, cs) && !render.hasTransition()) || t - t0 > 4000) res({ ok: test(G, cs), loading, worst, screen: G.screen });
          else requestAnimationFrame(frame);
        })(performance.now());
      });
    }, check);
    assert.ok(r.ok, label + ": esperava " + check + ", ficou em " + r.screen);
    assert.equal(r.loading, false, label + ": nenhuma tela de carregamento");
    return r;
  }
  /** Amostra os quadros por `ms`: pior intervalo e se surgiu tela de carregamento. */
  async function watch(ms) {
    return page.evaluate((ms) => {
      const ls = MOD.ls;
      return new Promise((res) => {
        let loading = false, worst = 0, last = 0;
        const t0 = performance.now();
        (function frame(t) {
          if (last) worst = Math.max(worst, t - last);
          last = t;
          loading = loading || ls.isLoadingActive();
          if (t - t0 >= ms) res({ loading, worst }); else requestAnimationFrame(frame);
        })(performance.now());
      });
    }, ms);
  }
  const info = () => page.evaluate(() => ({
    preload: MOD.preload.preloadState(),
    tree: MOD.tree.treeArtInfo(),
    fruits: MOD.meta.fruitArtInfo(),
    layers: MOD.cs.cutsceneLayersReady(),
  }));
  return { context, page, errors, net, tap, button, reach, watch, info };
}

try {
  for (const profile of profiles) {
    // ------------------------------------------- 1-3: o jogador espera no TITLE
    const s = await open(profile);
    let st = await s.info();
    assert.equal(st.preload.started, false, "boot não começa o pré-carregamento");
    assert.equal(s.net.santuario + s.net.noite, 0, "boot leve: nenhum santuário/Noite Branca baixado");
    await s.tap(480, 270);
    await s.reach("G.screen === 'TITLE'", profile.id + " PRETITLE→TITLE");
    // Frames reais do TITLE enquanto prepara tudo (diagnóstico, CPU do sandbox).
    const title = await s.page.evaluate(() => {
      const { preloadState } = MOD.preload;
      return new Promise((res) => {
        const iv = []; let last = 0; const t0 = performance.now();
        (function frame(t) {
          if (last) iv.push(t - last);
          last = t;
          if (preloadState().finished || t - t0 > 60000) res({ ms: Math.round(t - t0), frames: iv.length,
            fps: +(1000 / (iv.reduce((a, b) => a + b, 0) / Math.max(1, iv.length))).toFixed(1), worstMs: +Math.max(0, ...iv).toFixed(1) });
          else requestAnimationFrame(frame);
        })(performance.now());
      });
    });
    st = await s.info();
    await s.page.screenshot({ path: OUT + "/" + profile.id + "-title-pronto.png" });
    assert.ok(st.preload.finished, "pré-carregamento terminou parado no TITLE");
    assert.equal(st.preload.done, st.preload.total, "todas as tarefas concluídas");
    assert.ok(st.preload.sliceMaxMs < 50, "fatia por quadro curta (máx " + st.preload.sliceMaxMs.toFixed(1) + " ms)");
    assert.equal(st.tree.bakes, 1, "árvore assada uma vez, antes de abrir");
    assert.deepEqual([st.fruits.sanctuaryImages, st.fruits.sanctuaryBaked], [7, 7], "7 santuários baixados e assados");
    assert.equal(st.fruits.grayApples, 6, "maçãs cinza dos 6 frutos bloqueados (save novo)");
    assert.equal(st.fruits.sanctuaryApples, 7, "maçã do santuário de cada fruto");
    assert.equal(st.fruits.flowerSheets, 6, "folhas de flores e Flores Supremas com arte");
    assert.equal(st.layers, 12, "12 camadas da Noite Branca decodificadas (4 + 4 + 4 por painel, decisão 2026-10-05)");
    assert.deepEqual([s.net.santuario, s.net.noite], [7, 12], "cada arquivo pedido uma única vez");
    // Fidelidade: bitmap decodificado fora da thread = mesmos pixels do <img>; e a
    // maçã do santuário reduzida a 232 px ANTES de colorir = a de 960 px reduzida no desenho.
    const fidelity = await s.page.evaluate(async () => {
      const { IMG, loadSantuario } = MOD.assets, { createColorRestorer } = MOD.cr, { drainSteps, offThreadDecode } = MOD.utils;
      const px = (cv) => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      const diff = (a, b) => { let m = 0; for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - b[k])); return m; };
      const img = await loadSantuario("pantano"), bmp = await offThreadDecode(img), lean = createColorRestorer({ lean: true });
      drainSteps(lean.steps(img, .5, bmp));
      const sanctuary = diff(px(createColorRestorer()(img, .5)), px(lean(img, .5)));
      const big = createColorRestorer()(IMG.maca_floresta, .37);
      const mk = (src) => { const c = document.createElement("canvas"); c.width = c.height = 232; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 232, 232); return c; };
      const apple = diff(px(mk(big)), px(createColorRestorer({ lean: true })(mk(IMG.maca_floresta), .37)));
      return { sanctuary, apple };
    });
    assert.deepEqual(fidelity, { sanctuary: 0, apple: 0 }, "pré-carregamento e otimizações sem mudar nenhum pixel");
    console.log(profile.id + ": TITLE preparou tudo em " + title.ms + " ms · " + title.fps + " fps · pior quadro " +
      title.worstMs + " ms · maior fatia " + st.preload.sliceMaxMs.toFixed(1) + " ms · CPU total " + st.preload.workMs.toFixed(0) + " ms");

    await s.button("tree");
    await s.reach("G.screen === 'TREE'", profile.id + " TITLE→ÁRVORE");
    await s.page.screenshot({ path: OUT + "/" + profile.id + "-arvore.png" });
    const bakes0 = (await s.info()).fruits.sanctuaryBakes;
    for (let i = 1; i <= 7; i++) {
      await s.button("treeStage" + i);
      await s.page.waitForTimeout(250);
      const p = await s.page.evaluate((i) => MOD.meta.treeFruitPosition(MOD.config.FRUIT_TREES[i - 1].map), i);
      await s.tap(p.x, p.y);
      const opened = await s.watch(500);
      assert.ok(await s.page.evaluate(() => !!MOD.meta.treeViewState().fruit), "santuário " + i + " abriu");
      assert.equal(opened.loading, false, "santuário " + i + " sem tela de carregamento");
      assert.ok(opened.worst < 250, "abrir o santuário " + i + " sem travar (" + opened.worst.toFixed(0) + " ms)");
      if (i === 1) await s.page.screenshot({ path: OUT + "/" + profile.id + "-santuario.png" });
      await s.button("treeMiniBack");
      await s.page.waitForTimeout(120);
    }
    st = await s.info();
    assert.equal(st.fruits.sanctuaryBakes, bakes0, "abrir os 7 santuários não reassou pixels");
    assert.equal(s.net.santuario, 7, "nenhum santuário baixado de novo");

    // Replay de memória SEM expedição: toca na biblioteca e volta para ela.
    await s.button("treeMemories");
    await s.reach("G.screen === 'MEMORY'", profile.id + " ÁRVORE→MEMÓRIAS");
    await s.page.waitForTimeout(200);
    await s.tap(261, 199);   // 1º cartão: NOITE BRANCA
    await s.reach("G.screen === 'MEMORY' && cs.isCutsceneActive()", profile.id + " replay da Noite Branca");
    await s.page.waitForTimeout(400);
    await s.page.screenshot({ path: OUT + "/" + profile.id + "-memoria-replay.png" });
    assert.equal(await s.page.evaluate(() => MOD.state.G.run), null, "replay sem expedição por trás");
    assert.equal(s.net.noite, 14, "camadas vieram do pré-carregamento");
    await s.page.keyboard.press("Escape");
    await s.reach("G.screen === 'MEMORY' && !cs.isCutsceneActive()", profile.id + " fim do replay");
    await s.button("memBack");
    await s.reach("G.screen === 'TREE'", profile.id + " MEMÓRIAS→ÁRVORE");
    await s.button("treeProphecy");
    await s.reach("G.screen === 'PROPHECY'", profile.id + " ÁRVORE→PROFECIAS");
    await s.button("prophecyBack");
    await s.reach("G.screen === 'TREE'", profile.id + " PROFECIAS→ÁRVORE");
    await s.button("treeBack");
    await s.reach("G.screen === 'TITLE'", profile.id + " ÁRVORE→TITLE");
    assert.equal((await s.info()).tree.bakes, 1, "ida e volta sem reassar a árvore");
    assert.deepEqual(s.errors, [], "sem erros JS/rede");
    await s.context.close();
    console.log(profile.id + ": árvore, 7 santuários, replay, profecias e retornos sem tela de carregamento OK");

    // ------------------------------------------- 4: clicou antes de terminar
    // CPU 4x mais lenta (celular modesto): o clique chega com a árvore pela metade.
    const q = await open(profile);
    const cdp = await q.context.newCDPSession(q.page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await q.tap(480, 270);
    await q.button("tree");   // assim que o botão existir
    const early = await q.reach("G.screen === 'TREE'", profile.id + " ÁRVORE antes do fim");
    st = await q.info();
    assert.equal(st.preload.finished, false, "o clique chegou antes do fim do pré-carregamento");
    assert.equal(st.tree.bakes, 1, "árvore terminada no clique, com cor certa");
    // Só a arte da árvore termina no clique (antes eram árvore + 6 maçãs: ~1 s a 4x).
    assert.ok(early.worst < 500, "engasgo curto no clique cedo (" + early.worst.toFixed(0) + " ms a 4x)");
    // Maçãs cinza que ainda estavam no forno entram com fade, sem travar a árvore.
    await q.page.waitForFunction(() => MOD.meta.fruitArtInfo().grayApples === 6, null, { timeout: 30000 });
    const settled = await q.watch(600);
    assert.equal(settled.loading, false, "árvore sem tela de carregamento enquanto termina");
    await q.button("treeStage1");
    await q.page.waitForTimeout(250);
    const p1 = await q.page.evaluate(() => MOD.meta.treeFruitPosition("planicie"));
    await q.tap(p1.x, p1.y);
    assert.equal((await q.watch(400)).loading, false, profile.id + " santuário antes do fim sem tela de carregamento");
    await q.page.waitForFunction(() => MOD.meta.fruitArtInfo().sanctuaryImages > 0, null, { timeout: 20000 });
    await q.page.waitForTimeout(500);
    await q.page.screenshot({ path: OUT + "/" + profile.id + "-santuario-cedo.png" });
    assert.deepEqual(q.errors, [], "sem erros JS/rede (clique cedo)");
    await q.context.close();
    console.log(profile.id + ": clique antes do fim (CPU 4x mais lenta) abre na hora — engasgo do clique " +
      early.worst.toFixed(0) + " ms, depois " + settled.worst.toFixed(0) + " ms por quadro OK");

    // ------------------------------------------- 5: sem rede depois do boot
    if (profile.id !== "pc") continue;
    const o = await open(profile);
    await o.context.setOffline(true);
    await o.tap(480, 270);
    await o.reach("G.screen === 'TITLE'", "offline PRETITLE→TITLE");
    await o.page.waitForFunction(() => MOD.preload.preloadState().finished, null, { timeout: 30000 });
    st = await o.info();
    assert.equal(st.preload.online, false, "detectou que está sem rede");
    assert.equal(o.net.santuario + o.net.noite, 0, "sem rede: nenhum download tentado");
    assert.equal(st.tree.bakes, 1, "sem rede: árvore pronta mesmo assim");
    assert.equal(st.fruits.grayApples, 6, "sem rede: maçãs da árvore prontas");
    await o.button("tree");
    await o.reach("G.screen === 'TREE'", "offline TITLE→ÁRVORE");
    assert.deepEqual(o.errors, [], "sem rede: nenhum pedido falhando nem erro JS");
    await o.context.close();
    console.log("pc: sem rede, prepara só o que já está na memória e abre a árvore na hora OK");
  }
} finally {
  await browser.close();
  await server.close();
}
console.log("PRÉ-CARREGAMENTO DO TITLE OK — capturas em " + OUT);
