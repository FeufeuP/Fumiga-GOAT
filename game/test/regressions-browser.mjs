// Regressões em Chromium real, PC/mobile: estado, persistência, erro/retry
// com clique/toque e proporção CSS/input em janelas estreitas do desktop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer } from './lib/server.mjs';
import { launchBrowser, watchPage } from './lib/browser.mjs';
const OUT = process.env.REGRESSION_SHOTS || '/tmp/fumiga-regressions';
fs.mkdirSync(OUT, { recursive: true });
const server = process.env.BASE_URL ? null : await startServer();
const base = (process.env.BASE_URL || server.url).replace(/\/$/, '');
const browser = await launchBrowser(), report = [];
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'mobile' : 'pc';
    const path = mobile ? '/game/mobile/' : '/game/';
    const ctx = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(), errors = [], results = { profile: name };
    watchPage(page, errors);
    await page.goto(base + path + '?debug&limpo&tela=TITLE&hud=0');
    await page.waitForFunction(() => window.FUMIGA?.pronto && FUMIGA.G.screen === 'TITLE');
    async function modules() {
      await page.evaluate(() => {
        const root = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, '');
        window.M = name => import(root + name); window.FUMIGA_DUMP_TEXTS = true;
      });
    }
    await modules();
    // A tela só está estável quando a transição terminou: esperar por G.screen
    // sozinho resolvia no meio dela e o callback posterior trocava a tela de novo.
    // Transições pendentes podem reaplicar a tela anterior depois do retorno:
    // navegar de verdade exige confirmar a tela estável após o callback atrasar.
    const go = async screen => {
      for (let attempt = 0; attempt < 4; attempt++) {
        await page.evaluate(s => FUMIGA.go(s), screen);
        await page.waitForTimeout(350);
        const ok = await page.evaluate(async s => FUMIGA.G.screen === s && !(await M('render.js')).hasTransition(), screen);
        if (ok) return;
      }
      throw new Error('tela não estabilizou em ' + screen + ' (está em ' + await page.evaluate(() => FUMIGA.G.screen) + ')');
    };
    await go('TITLE');
    // Sem a introdução pendente: o teste mede telas, não replays de cutscene.
    await page.evaluate(async () => {
      const defs = (await M('cutscenes.js')).getCutsceneDefs();
      (await M('state.js')).G.save.cutscenes = Object.fromEntries(Object.keys(defs).map(id => [id, true]));
    });
    await page.evaluate(() => history.replaceState(null, '', location.pathname + '?debug&tela=TITLE&hud=0'));
    async function click(id) {
      // A busca acontece na própria página: sem depender da serialização do
      // Playwright nem de um prazo fixo para o quadro publicar o controle.
      const pos = await page.evaluate(async id => {
        const t0 = performance.now();
        while (performance.now() - t0 < 8000) {
          const b = (await M('ui.js')).uiButtons().find(b => b.id === id && !b.disabled);
          if (b) return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
          await new Promise(r => requestAnimationFrame(r));
        }
        return null;
      }, id);
      if (!pos) {
        const diag = await page.evaluate(async () => ({ screen: FUMIGA.G.screen, loading: !!(await M('loading_screen.js')).isLoadingActive(), buttons: (await M('ui.js')).uiButtons().map(b => b.id + (b.disabled ? '!' : '')) }));
        throw new Error('botão inacessível ' + id + ': ' + JSON.stringify(diag));
      }
      const rect = await page.locator('#game').boundingBox();
      const x = rect.x + pos.x * rect.width / 960;
      const y = rect.y + pos.y * rect.height / 540;
      if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    }
    if (!mobile) {
      results.narrow = [];
      for (const height of [1000, 600]) {
        await page.setViewportSize({ width: 800, height });
        // setViewportSize resolve antes de o resize reflowar o canvas.
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const r = await page.evaluate(() => {
          const c = document.querySelector('#game').getBoundingClientRect(), s = document.querySelector('#scan').getBoundingClientRect();
          return { width: c.width, height: c.height, x: c.x, y: c.y, scan: { x: s.x, y: s.y, width: s.width, height: s.height } };
        });
        assert.ok(Math.abs(r.width - r.height * 960 / 540) <= 1, '16:9 preservado');
        assert.deepEqual(r.scan, { x: r.x, y: r.y, width: r.width, height: r.height }, 'scanlines alinhadas');
        // O clique tem que ATINGIR o botão: registrar a troca de tela em vez de
        // assumir que ela fica estável (um clique residual pode voltar ao título).
        await page.evaluate(() => {
          window.__seenScreens = [];
          const timer = setInterval(() => __seenScreens.push(FUMIGA.G.screen), 16);
          setTimeout(() => clearInterval(timer), 2000);
        });
        await click('start');
        await page.waitForFunction(() => window.__seenScreens.includes('MODE'));
        await page.evaluate(() => clearInterval());
        await go('TITLE');
        await page.screenshot({ path: OUT + '/pc-800x' + height + '.png' });
        results.narrow.push(r);
      }
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    results.ranks = await page.evaluate(async () => {
      const S = await M('state.js'); const G = S.G;
      G.save.essence = 50000; G.save.nodes = { v_p3: 1 }; G.save.clearedMaps = { planicie: true, floresta: true };
      const out = [];
      for (let level = 0; level < 3; level++) {
        const price = S.metaCanBuy('v_p6').price, before = G.save.essence;
        if (!S.metaBuy('v_p6') || G.save.essence !== before - price) throw new Error('compra/preço');
        out.push(S.metaBonus().rangeBonus);
      }
      S.persistSave(); return out;
    });
    assert.deepEqual(results.ranks, [45, 56, 68]);
    await page.reload(); await page.waitForFunction(() => window.FUMIGA?.pronto); await modules();
    assert.equal(await page.evaluate(async () => (await M('state.js')).metaBonus().rangeBonus), 68, 'nível comprado persiste após reload');

    await page.evaluate(async () => {
      FUMIGA.G.save.nodes = {}; FUMIGA.G.save.accessibility.invincible = false;
      FUMIGA.go('RUN', { mapa: 0, seed: 42 });
    });
    await page.waitForFunction(async () => FUMIGA.G.screen === 'RUN' && !(await M('render.js')).hasTransition());
    await click('nestBtn'); await page.waitForFunction(() => FUMIGA.G.run.baseOpen);
    await page.evaluate(async () => { FUMIGA.G.run.food = 0; (await M('units.js')).allies.queen.takeDamage(100000, 'foe'); });
    await page.waitForFunction(() => ['lost', 'ended'].includes(FUMIGA.G.run.status));
    assert.equal(await page.evaluate(() => FUMIGA.G.run.baseOpen), false);
    results.nestDeath = await page.evaluate(() => FUMIGA.G.run.status);
    await page.waitForFunction(() => FUMIGA.G.run.status === 'ended');
    await page.screenshot({ path: OUT + '/' + name + '-derrota-ninho.png' });

    results.prophecy = await page.evaluate(async () => {
      const S = await M('state.js'); S.G.save.prophecies = {}; S.G.save.nodes = {};
      FUMIGA.go('RUN', { mapa: 0, seed: 42 });
      const q = (await M('units.js')).allies.queen;
      q.takeDamage(q.maxHp * .8, 'foe'); q.hp = q.maxHp;
      S.G.run.status = 'won'; (await M('game.js')).settleRun();
      return { minimum: S.G.run.queenMinHp, awarded: !!S.G.save.prophecies.p_rainha };
    });
    assert.ok(Math.abs(results.prophecy.minimum - .2) < .0001);
    assert.equal(results.prophecy.awarded, false);
    await go('TITLE');

    results.loader = [];
    for (const big of [false, true]) {
      await page.evaluate(async big => {
        FUMIGA.G.save.accessibility.bigFont = big;
        window.loadingCounts = { task: 0, finish: 0 };
        (await M('loading_screen.js')).startLoadingScreen({ minDuration: .8,
          task: report => { loadingCounts.task++; report(1); if (loadingCounts.task === 1) throw new Error('falha controlada'); },
          onFinish: () => loadingCounts.finish++,
        });
      }, big);
      await page.waitForFunction(async () => !!(await M('loading_screen.js')).getLoadingError());
      const failed = await page.evaluate(async () => {
        const L = await M('loading_screen.js');
        return { ready: L.isLoadingReady(), progress: L.getLoadingProgress(), dismiss: L.dismissLoadingScreen(), finish: loadingCounts.finish };
      });
      assert.equal(failed.ready, false); assert.ok(failed.progress < 1); assert.equal(failed.dismiss, false); assert.equal(failed.finish, 0);
      await page.waitForFunction(async () => (await M('ui.js')).uiButtons().some(b => b.id === 'loadingRetry'));
      assert.deepEqual((await page.evaluate(() => FUMIGA.auditarLayout())).issues, [], 'erro de loading legível normal/grande');
      await page.screenshot({ path: OUT + '/' + name + '-loading-erro' + (big ? '-fonte-grande' : '') + '.png' });
      await click('loadingRetry');
      // A tentativa nova só está pronta quando a própria tarefa rodou de novo.
      // Leitura atômica: o predicado e a verificação não podem ver documentos
      // diferentes quando o jogo recarrega/atualiza o estado.
      let afterRetry = null;
      for (let i = 0; i < 300; i++) {
        afterRetry = await page.evaluate(async () => ({
          counts: { ...window.loadingCounts }, progress: (await M('loading_screen.js')).getLoadingProgress(),
          ready: (await M('loading_screen.js')).isLoadingReady(), screen: FUMIGA.G.screen,
        }));
        if (afterRetry.counts.task >= 2 && afterRetry.ready) break;
        await page.waitForTimeout(50);
      }
      assert.equal(afterRetry.counts.task, 2, 'tarefa repetida no retry: ' + JSON.stringify(afterRetry));
      assert.equal(afterRetry.counts.finish, 0);
      assert.ok(afterRetry.progress >= .98, 'retry chega a 100%: ' + JSON.stringify(afterRetry));
      await page.keyboard.press('Space');
      await page.waitForFunction(async () => !(await M('loading_screen.js')).isLoadingActive());
      assert.equal(await page.evaluate(() => loadingCounts.finish), 1);
      await page.evaluate(async () => (await M('loading_screen.js')).startLoadingScreen({ task: () => { throw new Error('falha ao preparar'); } }));
      await page.waitForFunction(async () => !!(await M('loading_screen.js')).getLoadingError());
      await click('loadingCancel');
      await page.waitForFunction(async () => !(await M('loading_screen.js')).isLoadingActive());
      assert.equal(await page.evaluate(() => FUMIGA.G.screen), 'TITLE');
      assert.equal(await page.evaluate(() => FUMIGA.G.run), null);
      results.loader.push({ bigFont: big, retry: true, cancel: true });
    }
    results.save = await page.evaluate(async () => {
      const S = await M('state.js'), key = (globalThis.FUMIGA_SAVE_KEY || 'fumiga_goat_save_v1') + '_debug';
      localStorage.setItem(key, JSON.stringify({ essence: 1000, nodes: { raiz: 1, t_col: -1 } }));
      S.loadSave(); const price = S.metaCanBuy('t_col').price;
      const bought = S.metaBuy('t_col');
      return { key, bought, price, essence: S.G.save.essence, stored: JSON.parse(localStorage.getItem(key)).essence };
    });
    assert.equal(results.save.bought, true); assert.ok(Number.isSafeInteger(results.save.price));
    assert.equal(results.save.essence, 1000 - results.save.price); assert.equal(results.save.stored, results.save.essence);
    assert.equal(results.save.key, mobile ? 'fumiga_goat_mobile_save_v1_debug' : 'fumiga_goat_save_v1_debug');

    // ---------------------------------------------- playtest (aba TESTE) -----
    // Exportação de ponta a ponta: o clique no botão da aba TESTE precisa
    // entregar um arquivo válido, o diário precisa estar no localStorage e o
    // APAGAR (em dois toques) precisa limpar de verdade.
    await go('OPTIONS');
    await click('tab5');
    await page.waitForFunction(async () => (await M('ui.js')).uiButtons().some(b => b.id === 'ptExport'));
    // Deixa a captura estável e útil como exemplo, sem os erros que este teste
    // provoca intencionalmente nas regressões anteriores.
    await page.evaluate(async () => {
      const P = await M('playtest.js');
      P.ptApagar();
      P.ptSessao({ fonte: 'jogo', v: '20261002-playtest' });
      P.ptEvento('expedicao_inicio', { modo: 'campanha', mapa: 0 });
      P.ptEvento('expedicao_fim', { venceu: true, modo: 'campanha', mapa: 0, onda: 3 });
    });
    // Além do fluxo funcional, guardar uma captura da própria aba para o
    // roteiro de campo e para o artefato de revisão do CI (PC + mobile).
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: OUT + '/' + name + '-playtest-teste.png' });
    const esperaDownload = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await click('ptExport');
    const download = await esperaDownload;
    const arquivo = download ? JSON.parse(fs.readFileSync(await download.path(), 'utf8')) : null;
    const diario = await page.evaluate(() => { const raw = localStorage.getItem('fumiga_playtest_v1'); return raw ? JSON.parse(raw) : null; });
    results.playtestLayout = (await page.evaluate(() => FUMIGA.auditarLayout())).issues;
    // Os dois toques NÃO podem cair no mesmo quadro: o primeiro ARMA, o
    // segundo confirma. O gancho __ptArmed() diz que o jogo processou o 1º
    // antes de mandar o 2º (dois toques num quadro só viram um clique).
    await click('ptClear');
    await page.waitForFunction(async () => (await M('game.js')).__ptArmed() === true);
    await click('ptClear');
    await page.waitForFunction(async () => (await M('game.js')).__ptArmed() === false);
    results.playtest = {
      baixou: !!download,
      nome: download ? download.suggestedFilename() : '',
      formato: arquivo ? arquivo.formato : '',
      eventos: arquivo ? arquivo.eventos.length : 0,
      temSessao: !!(arquivo && arquivo.eventos.some(e => e.e === 'sessao')),
      gravados: diario ? diario.eventos.length : 0,
      apagado: await page.evaluate(() => localStorage.getItem('fumiga_playtest_v1')),
    };
    assert.ok(results.playtest.baixou, 'exportar gera arquivo para o tester');
    assert.equal(results.playtest.formato, 'fumiga-playtest');
    assert.ok(results.playtest.eventos > 0 && results.playtest.temSessao, 'arquivo tem os eventos e a sessão');
    assert.ok(results.playtest.gravados > 0, 'diário gravado no aparelho');
    assert.equal(results.playtest.apagado, null, 'apagar (dois toques) limpa o diário');
    assert.deepEqual(results.playtestLayout, [], 'aba TESTE sem problemas de layout');
    assert.deepEqual(errors, [], 'sem erros JS/HTTP/glifos');
    report.push(results); await ctx.close();
    console.log(name.toUpperCase() + ': proporção/input, níveis + reload, derrota no ninho, profecia, erro/retry/cancel, save e playtest OK');
  }
} finally {
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
  await browser.close(); if (server) await server.close();
}
console.log('REGRESSÕES NO NAVEGADOR OK — PC + mobile; capturas em ' + OUT);
