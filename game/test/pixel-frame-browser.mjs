// INSPEÇÃO DO FRAME PIXEL CELESTE (F0b) no navegador.
// Uso: node game/test/pixel-frame-browser.mjs        (precisa de tools/setup-dev.sh)
//
// O que este teste prova — e o que não prova:
//   ✅ o mundo sai do buffer: na região só de mundo, cada bloco 3x3 de pixels
//      do canvas tem a MESMA cor (ampliação por vizinho-mais-próximo, x3);
//   ✅ a região tem conteúdo de verdade (muitas cores distintas), então o
//      bloco uniforme não é um fundo chapado "passando por pixel art";
//   ✅ 60 FPS no RUN e nenhum erro de JS/404 no PC e no mobile;
//   ✅ o buffer tem 320x180 (+ sangria) e a passada de mundo fecha direito.
//   ❌ não mede "shimmer sentido" nem aprova o gosto visual: isso é olho no
//      preview (Regras 4, 7 e 10).
import path from "node:path";
import assert from "node:assert/strict";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage, importGameModules } from "./lib/browser.mjs";

const OUT = process.env.PIXEL_OUT || "/tmp/fumiga-pixel-frame";
const PERFIS = [
  { id: "pc", path: "/game/", ctx: { viewport: { width: 960, height: 540 } } },
  { id: "mobile", path: "/game/mobile/", ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  // 1366x768 é o caso que MOTIVOU o degrau de 1/3 no fit(): a escala "caixa
  // cheia" daria 1,422x e o pixel do frame viraria 4px e 5px alternados.
  { id: "pc-1366", path: "/game/", ctx: { viewport: { width: 1366, height: 768 } } },
];

const server = process.env.BASE_URL ? null : await startServer();
const BASE = (process.env.BASE_URL || server.url).replace(/\/$/, "");
const browser = await launchBrowser();

/** Lê os pixels do canvas do jogo (960x540 interno, independente do CSS). */
const LE_PIXELS = (regiao) => {
  const cv = document.getElementById("game");
  const c = cv.getContext("2d");
  const d = c.getImageData(regiao.x, regiao.y, regiao.w, regiao.h).data;
  const chave = (i) => (d[i] << 24 | d[i + 1] << 16 | d[i + 2] << 8 | d[i + 3]) >>> 0;
  // O composite pode ancorar a grade em qualquer um dos 9 deslocamentos
  // (subX/subY valem -1, 0 ou 1): prova-se os nove e fica com o melhor.
  const fases = [];
  for (const fy of [0, 1, 2]) {
    for (const fx of [0, 1, 2]) {
      let blocos = 0, uniformes = 0;
      for (let y = fy; y + 3 <= regiao.h; y += 3) {
        for (let x = fx; x + 3 <= regiao.w; x += 3) {
          blocos++;
          const base = chave((y * regiao.w + x) * 4);
          let ok = true;
          for (let dy = 0; dy < 3 && ok; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              if (chave(((y + dy) * regiao.w + x + dx) * 4) !== base) { ok = false; break; }
            }
          }
          if (ok) uniformes++;
        }
      }
      fases.push({ fase: fx + "," + fy, blocos, uniformes });
    }
  }
  const melhor = fases.reduce((a, b) => (b.uniformes > a.uniformes ? b : a));
  const cores = new Set();
  for (let i = 0; i < d.length; i += 4) cores.add((d[i] << 16 | d[i + 1] << 8 | d[i + 2]));
  return { ...melhor, cores: cores.size, pixels: d.length / 4 };
};

function medirFps(page) {
  return page.evaluate(() => new Promise((res) => {
    const iv = []; let last = 0; const t0 = performance.now();
    function f(t) { if (last) iv.push(t - last); last = t; if (t - t0 < 2000) requestAnimationFrame(f); else res(iv); }
    requestAnimationFrame(f);
  }).then((iv) => ({ fps: +(1000 / (iv.reduce((a, b) => a + b, 0) / iv.length)).toFixed(1), piorMs: +Math.max(...iv).toFixed(1) })));
}

const linhas = [];
for (const perfil of PERFIS) {
  const context = await browser.newContext(perfil.ctx);
  const page = await context.newPage();
  const errs = [];
  watchPage(page, errs);
  await page.goto(BASE + perfil.path + "?debug&limpo&hud=0&tela=RUN&mapa=1&seed=4242&invencivel");
  await importGameModules(page, { state: "state.js", pixel: "pixel_celeste.js", cam: "camera.js" });
  await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto, null, { timeout: 60000, polling: 100 });
  // 7 s: o banner de evento (HUD, em alta resolução) some antes da amostragem,
  // senão ele aparece dentro da região e derruba a contagem dos blocos 3x3.
  await page.waitForTimeout(7000);

  // 1. o frame existe e a passada de mundo fechou (nada ficou "em mundo")
  const frame = await page.evaluate(() => ({
    bufer: [MOD.pixel.BUFFER_W, MOD.pixel.BUFFER_H],
    escala: MOD.pixel.SCALE,
    tile: MOD.pixel.TILE,
    zoom: MOD.cam.cam.zoom,
    niveis: MOD.pixel.ZOOM_LEVELS,
    emMundo: MOD.pixel.pixelWorldPass(),
  }));
  assert.deepEqual(frame.bufer, [320, 180], `${perfil.id}: buffer 320x180`);
  assert.equal(frame.escala, 3, `${perfil.id}: ampliação x3`);
  assert.equal(frame.tile, 8, `${perfil.id}: tile 8x8`);
  assert(frame.niveis.includes(frame.zoom), `${perfil.id}: zoom ${frame.zoom} é um nível inteiro permitido`);
  assert.equal(frame.emMundo, false, `${perfil.id}: a passada de mundo fecha (sem vazamento)`);

  // 1b. o canvas também tem de crescer em degraus de 1/3 na TELA: o pixel do
  //     frame mede 3 px de canvas, então só é quadrado e uniforme no monitor
  //     quando a largura CSS é múltipla de 320 (e a altura, de 180). Sem isso
  //     o bloco aparece ora 4 px ora 5 px e o mundo tremelia ao caminhar.
  const css = await page.evaluate(() => {
    const r = document.getElementById("game").getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  assert.equal(css.w % 320, 0,
    `${perfil.id}: largura ${css.w}px = ${(css.w / 320).toFixed(2)} pixels de frame (tem de ser inteira)`);
  assert.equal(css.h % 180, 0,
    `${perfil.id}: altura ${css.h}px = ${(css.h / 180).toFixed(2)} pixels de frame (tem de ser inteira)`);
  assert.equal(css.w / 320, css.h / 180, `${perfil.id}: mesma ampliação nos dois eixos`);

  // 2. região só de mundo: blocos 3x3 uniformes + conteúdo real
  // Região só de mundo: longe do painel da colônia (topo-esquerda), do
  // minimapa (topo-direita), do banner central e da barra de compras (rodapé).
  const regiao = { x: 300, y: 170, w: 600, h: 240 };
  const px1 = await page.evaluate(LE_PIXELS, regiao);
  assert(px1.blocos > 1000, `${perfil.id}: região amostrada tem blocos suficientes (${px1.blocos})`);
  assert(px1.cores >= 40, `${perfil.id}: a região tem terreno de verdade, não fundo chapado (${px1.cores} cores)`);
  const frac = px1.uniformes / px1.blocos;
  assert(frac >= 0.99,
    `${perfil.id}: ${(frac * 100).toFixed(1)}% dos blocos 3x3 são uniformes (esperado >= 99%)`);

  // 3. desempenho
  const perf = await medirFps(page);
  assert(perf.fps >= 55, `${perfil.id}: ${perf.fps} fps no RUN (esperado >= 55)`);

  const tela = await page.evaluate(() => window.FUMIGA.estado().tela);
  assert.equal(tela, "RUN", `${perfil.id}: está na expedição`);

  await page.screenshot({ path: path.join(OUT, perfil.id + "-run-mapa1.png") });
  await context.close();
  linhas.push(`${perfil.id}: ${(frac * 100).toFixed(1)}% blocos 3x3 uniformes · ${px1.cores} cores · `
    + `${perf.fps} fps (pior ${perf.piorMs}ms) · canvas ${css.w}x${css.h} (pixel x${css.w / 320} na tela)`);
  for (const e of errs) throw new Error(`${perfil.id}: ${e}`);
}

// o chão assado pelo jogo tem a dimensão do contrato (1067x800, múltiplo de 8)
{
  const context = await browser.newContext(PERFIS[0].ctx);
  const page = await context.newPage();
  await page.goto(BASE + "/game/?debug&limpo&hud=0&tela=RUN&mapa=3&seed=99&invencivel");
  await importGameModules(page, { world: "world.js", pixel: "pixel_celeste.js" });
  await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto, null, { timeout: 60000, polling: 100 });
  const chao = await page.evaluate(() => ({ w: MOD.world.world.ground.width, h: MOD.world.world.ground.height }));
  assert.equal(chao.w % 8, 0, "largura do chão é múltipla do tile");
  assert.equal(chao.h % 8, 0, "altura do chão é múltipla do tile");
  assert(Math.abs(chao.w - 1067) <= 8 && Math.abs(chao.h - 800) <= 8, `chão ${chao.w}x${chao.h} ~ 1067x800`);
  linhas.push(`chão assado: ${chao.w}x${chao.h} px de buffer (grade de tiles 8x8)`);
  await context.close();
}

await browser.close();
if (server) await server.close();
for (const l of linhas) console.log("ok    " + l);
console.log("FRAME PIXEL CELESTE OK — mundo em grade de 3x3 no PC e no mobile, sem erros e a 60 FPS");
