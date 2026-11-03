// ============================================================================
// FILTRO PS1 em Chromium real (OPÇÕES → VÍDEO) — PC e mobile, rotas WebGL e CPU.
//
// Decisão do usuário (2026-10-14): o menu tem DUAS opções, LIGADO e DESLIGADO —
// nada de LEVE/MÉDIO/FIEL —, e o LIGADO é a INTENSIDADE MÁXIMA (dither 0.13,
// 12 degraus de cor, contraste 1.16, buffer cheio 960x540), o quadriculado dos
// jogos de PS1. Dither Bayer 4x4 + cores achatadas em TUDO (mundo, HUD e menus),
// ligado por padrão, e SEM modelagem 3D — é pós-processamento 2D.
// Este teste protege exatamente essas promessas:
//   • o filtro mora num canvas SEPARADO (#psx): os pixels do #game continuam
//     960x540 sempre (nada de reduzir a fonte ou reassar sprites);
//   • alinhamento pixel a pixel com o jogo, em tela cheia e com letterbox;
//   • padrão de fábrica = LIGADO na intensidade máxima, e a escolha sobrevive ao
//     recarregar a página (inclusive a migração dos saves antigos 1/2/3 → LIGADO);
//   • o quadro muda de verdade (dither), nas rotas WebGL e por CPU;
//   • cliques atravessam o filtro (pointer-events: none) e ele fica abaixo das
//     scanlines (a listra de CRT é a tela; o quadriculado é o sinal do PS1).
// Uso: node game/test/psx-filter-browser.mjs   (precisa de tools/setup-dev.sh)
// ============================================================================
import assert from "node:assert/strict";
import fs from "node:fs";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage, importGameModules } from "./lib/browser.mjs";

const OUT = process.env.PSX_SHOTS || "/tmp/fumiga-psx";
fs.mkdirSync(OUT, { recursive: true });
const server = process.env.BASE_URL ? null : await startServer();
const base = (process.env.BASE_URL || server.url).replace(/\/$/, "");
const browser = await launchBrowser();
const report = [];

/**
 * Mede, DENTRO do quadro do desenho: (a) a diferença entre o buffer do filtro e
 * o quadro do jogo no MESMO tamanho (drawImage sem suavização — na rota cpu o
 * buffer pode estar em meia resolução) e (b) a variação de UM quadro para o
 * outro, que é o piso de ruído da comparação.
 *
 * A leitura tem de ser aqui dentro: o filtro WebGL não guarda o buffer
 * (preserveDrawingBuffer: false) e ler por fora devolveria um buffer já limpo.
 * O main.js se registra primeiro em cada quadro, então o requestAnimationFrame
 * seguinte entrega a leitura depois do desenho e antes da apresentação.
 */
const MEDIR_FILTRO = () => new Promise((resolve) => {
  const pegar = (cv, w, h) => {
    const t = document.createElement("canvas");
    t.width = w || cv.width; t.height = h || cv.height;
    const c = t.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.drawImage(cv, 0, 0, t.width, t.height);
    return c.getImageData(0, 0, t.width, t.height).data;
  };
  const mad = (a, b) => {
    let soma = 0, n = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
      soma += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      n += 3;
    }
    return n ? soma / n : 0;
  };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const psx = document.querySelector("#psx");
    const filtro = pegar(psx);
    const ref = pegar(document.querySelector("#game"), psx.width, psx.height);
    const quadro = Uint8ClampedArray.from(filtro);
    const comFiltro = mad(ref, filtro);
    requestAnimationFrame(() => {
      resolve({ comFiltro, ruido: mad(quadro, pegar(document.querySelector("#psx"))) });
    });
  }));
});

try {
  for (const rota of ["webgl", "cpu"]) {
    for (const mobile of [false, true]) {
      const perfil = (mobile ? "mobile-" : "pc-") + rota;
      const ctx = await browser.newContext({
        viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 },
        isMobile: mobile, hasTouch: mobile,
      });
      const page = await ctx.newPage();
      const erros = [];
      watchPage(page, erros);
      // Rota CPU: o contexto webgl é negado ANTES do jogo subir, então o filtro
      // cai no caminho por pixel (fallback de aparelho sem WebGL).
      if (rota === "cpu") {
        await page.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
            if (String(tipo).startsWith("webgl") || tipo === "experimental-webgl") return null;
            return original.call(this, tipo, ...resto);
          };
        });
      }
      // Contexto novo = save vazio: é o primeiro boot de um jogador de verdade.
      await page.goto(base + (mobile ? "/game/mobile/" : "/game/") + "?debug&tela=TITLE&hud=0");
      await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto && FUMIGA.G.screen === "TITLE", null, { timeout: 120000 });
      await importGameModules(page, { psx: "psx_filter.js", state: "state.js", ui: "ui.js" });
      await page.waitForTimeout(700);

      // PIXEL CELESTE (F0b, 2026-10-26): o primeiro boot de um jogador novo abre
      // com o filtro DESLIGADO — o padrão do jogo é o frame pixel limpo, porque
      // o PS1 cobre o canvas e desfaz a grade de 3x3. O filtro continua existindo
      // e é ligado a seguir para este teste medir exatamente o que ele faz.
      const fabrica = await page.evaluate(async () => (await M("psx_filter.js")).psxInfo());
      assert.equal(fabrica.level, 0, perfil + ": padrão de fábrica é o DESLIGADO");
      assert.equal(fabrica.ativo, false, perfil + ": filtro desligado no primeiro boot");
      assert.equal(fabrica.params, null, perfil + ": desligado não reporta parâmetros");
      const info = await page.evaluate(async () => {
        const { G } = await M("state.js");
        const { applyPsxFilter, psxInfo } = await M("psx_filter.js");
        G.save.settings.psx = 1;
        applyPsxFilter();
        return psxInfo();
      });
      await page.waitForTimeout(300);
      assert.equal(info.mode, rota, perfil + ": rota de execução do filtro");
      assert.equal(info.level, 1, perfil + ": religado, o filtro sobe para o LIGADO");
      assert.equal(info.ativo, true, perfil + ": filtro visível quando religado");
      // O buffer PODE estar em meia resolução por desempenho: a rota cpu sempre
      // começa assim, e a rota webgl também quando o renderizador é por software
      // (o sandbox e emuladores usam SwiftShader). Em GPU de verdade é 960x540.
      const meio = info.escala === 0.5;
      report.push(`${perfil}: renderizador "${info.renderer}" · escala ${info.escala}`);
      assert.deepEqual(info.buffer, meio ? [480, 270] : [960, 540],
        perfil + ": buffer do LIGADO" + (meio ? " (rebaixado para manter o FPS)" : ""));
      // A INTENSIDADE é o ponto do pedido: LIGADO = valores máximos, não uma
      // versão suave. Se alguém afrouxar esses números, o teste cai aqui.
      assert.deepEqual(info.params, { dither: 0.13, steps: 12, contrast: 1.16, scale: 1 },
        perfil + ": LIGADO entrega a intensidade máxima (dither/degraus/contraste)");

      // ---------------------------------------------------------- geometria --
      const geom = () => page.evaluate(() => {
        const g = document.querySelector("#game").getBoundingClientRect();
        const p = document.querySelector("#psx").getBoundingClientRect();
        const cs = getComputedStyle(document.querySelector("#psx"));
        return {
          game: { x: g.x, y: g.y, w: g.width, h: g.height },
          psx: { x: p.x, y: p.y, w: p.width, h: p.height },
          pointerEvents: cs.pointerEvents, zIndex: Number(cs.zIndex),
          canvas: [document.querySelector("#game").width, document.querySelector("#game").height],
        };
      });
      let r = await geom();
      assert.deepEqual(r.psx, r.game, perfil + ": #psx alinhado ao #game (tela cheia)");
      assert.equal(r.pointerEvents, "none", perfil + ": cliques atravessam o filtro");
      assert.deepEqual(r.canvas, [960, 540], perfil + ": o #game continua 960x540 (filtro não mexe na fonte)");
      assert.ok(r.zIndex < 2, perfil + ": filtro abaixo das scanlines");

      await page.setViewportSize({ width: 800, height: 600 });
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      r = await geom();
      assert.deepEqual(r.psx, r.game, perfil + ": #psx alinhado com letterbox");
      // Tolerância de 2 px: o fit() do main.js arredonda largura e altura com
      // Math.floor (no shell mobile a sobra chega a ~1,4 px) — é do encaixe
      // pré-existente, não do filtro; o que importa aqui é o #psx == #game.
      assert.ok(Math.abs(r.game.w - r.game.h * 960 / 540) <= 2, perfil + ": 16:9 preservado");
      await page.setViewportSize(mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 });
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));

      // --------------------------------------------------- o quadro muda -----
      await page.waitForTimeout(400);   // deixa a tela assentar depois dos resizes
      // Duas amostras: o efeito do filtro é o maior lido e o piso de ruído é o
      // menor (um quadro solto de transição não pode decidir o teste).
      const a1 = await page.evaluate(MEDIR_FILTRO);
      const a2 = await page.evaluate(MEDIR_FILTRO);
      const comFiltro = Math.max(a1.comFiltro, a2.comFiltro);
      const ruido = Math.min(a1.ruido, a2.ruido);
      report.push(`${perfil}: MAD(quadro,filtro)=${comFiltro.toFixed(2)} · ruído de 1 quadro=${ruido.toFixed(2)} · buffer ${info.buffer.join("x")}`);
      // O filtro tem que mexer no quadro MAIS do que a própria cena muda de um
      // quadro para o outro — e o mínimo absoluto de 0,5 cobre cena parada.
      assert.ok(comFiltro > Math.max(0.5, ruido), perfil + ": o filtro muda o quadro de verdade (dither) — " + comFiltro.toFixed(2) + " vs ruído " + ruido.toFixed(2));

      // ------------------------------------------------- os dois estados ----
      const nivel = (n) => page.evaluate(async (n) => {
        const { G } = await M("state.js");
        const { applyPsxFilter, psxInfo } = await M("psx_filter.js");
        G.save.settings.psx = n;
        applyPsxFilter();
        return psxInfo();
      }, n);
      // Não existe mais LEVE/MÉDIO/FIEL: só LIGADO (1) e DESLIGADO (0). Valor
      // fora da faixa (um save adulterado, por exemplo) cai no padrão de fábrica
      // — nunca em um nível que não existe mais.
      const fora = await nivel(3);
      await page.waitForTimeout(200);
      assert.equal(fora.level, 0, perfil + ": valor fora da faixa cai no padrão de fábrica (DESLIGADO)");
      assert.equal(fora.ativo, false, perfil + ": valor fora da faixa não inventa um nível");
      const ligado = await nivel(1);
      await page.waitForTimeout(200);
      assert.equal(ligado.ativo, true, perfil + ": LIGADO fica visível");
      assert.deepEqual(ligado.buffer, ligado.escala === 0.5 ? [480, 270] : [960, 540],
        perfil + ": buffer do LIGADO" + (ligado.escala === 0.5 ? " (rebaixado)" : ""));
      assert.deepEqual(ligado.params, { dither: 0.13, steps: 12, contrast: 1.16, scale: 1 },
        perfil + ": LIGADO reaplica a intensidade máxima");
      r = await geom();
      assert.deepEqual(r.canvas, [960, 540], perfil + ": o #game segue 960x540 com o filtro LIGADO");
      assert.deepEqual(r.psx, r.game, perfil + ": #psx cobre o jogo inteiro no LIGADO");
      await page.screenshot({ path: `${OUT}/${perfil}-ligado.png` });
      const off = await nivel(0);
      await page.waitForTimeout(200);
      assert.equal(off.ativo, false, perfil + ": DESLIGADO esconde o filtro");
      assert.equal(off.params, null, perfil + ": DESLIGADO não reporta parâmetros de filtro");
      await page.screenshot({ path: `${OUT}/${perfil}-desligado.png` });

      // ------------------------------------------------- persistência --------
      await page.evaluate(async () => {
        const { G, persistSave } = await M("state.js");
        const { applyPsxFilter } = await M("psx_filter.js");
        G.save.settings.psx = 1;
        persistSave();
        applyPsxFilter();
      });
      await page.reload({ waitUntil: "load" });
      await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto, null, { timeout: 120000 });
      await importGameModules(page, { psx: "psx_filter.js" });
      await page.waitForTimeout(400);
      const depois = await page.evaluate(async () => (await M("psx_filter.js")).psxInfo());
      assert.equal(depois.level, 1, perfil + ": a escolha sobrevive ao recarregar (LIGADO)");
      assert.deepEqual(depois.buffer, depois.escala === 0.5 ? [480, 270] : [960, 540],
        perfil + ": estado restaurado já com o buffer certo");
      await page.screenshot({ path: `${OUT}/${perfil}-restaurado.png` });

      // migração: save das versões antigas (LEVE=1 / MÉDIO=2 / FIEL AO PS1=3)
      // tem de virar LIGADO — ninguém perde o filtro por causa da mudança.
      for (const velho of [1, 2, 3]) {
        await page.evaluate(async (velho) => {
          const { G, persistSave } = await M("state.js");
          G.save.settings.psx = velho;       // grava o valor antigo como se fosse um save de ontem
          persistSave();
        }, velho);
        await page.reload({ waitUntil: "load" });
        await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto, null, { timeout: 120000 });
        await importGameModules(page, { psx: "psx_filter.js", state: "state.js" });
        await page.waitForTimeout(300);
        const migrado = await page.evaluate(async () => {
          const { G } = await M("state.js");
          return { info: (await M("psx_filter.js")).psxInfo(), salvo: G.save.settings.psx };
        });
        assert.equal(migrado.salvo, 1, perfil + ": save antigo com " + velho + " vira LIGADO (1)");
        assert.equal(migrado.info.level, 1, perfil + ": save antigo com " + velho + " abre com o filtro ligado");
      }

      assert.deepEqual(erros, [], perfil + ": sem erros de JS/HTTP no console");
      await ctx.close();
    }
  }
  console.log(report.join("\n"));
  console.log("FILTRO PS1 OK — canvas separado, alinhamento, LIGADO/DESLIGADO, LIGADO na intensidade máxima, migração de saves, persistência e rotas webgl/cpu (PC e mobile)");
} finally {
  await browser.close();
  if (server) await server.close();
}
