// INSPEÇÃO DO APP INSTALÁVEL NO NAVEGADOR — a Regra 4 aplicada ao download.
// Uso: node game/test/pwa-browser.mjs          (= npm run inspect:pwa)
//      BASE_URL=http://host:porta  ·  PWA_SHOTS=/pasta  (capturas fora do Git)
//
// O que ele faz de verdade, num Chromium:
//   1. abre a página oficial (raiz) e confere o tamanho do pacote completo;
//   2. clica em BAIXAR JOGO COMPLETO, acompanha a barra e confere no Cache Storage;
//   3. DESLIGA A REDE e recarrega: a página tem que abrir mesmo assim;
//   4. com a rede desligada, entra em /game/ e espera o jogo BOOTAR (G.screen
//      diferente de BOOT, sem 404 e sem erro de JS) — é o teste que prova que
//      "baixado" é "jogável sem internet", não só "arquivos no cache";
//   5. abre a página do app (?v=mobile) offline e confere o botão JOGAR.
import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage, importGameModules } from "./lib/browser.mjs";

const OUT = process.env.PWA_SHOTS || "/tmp/fumiga-pwa";
fs.mkdirSync(OUT, { recursive: true });

const server = process.env.BASE_URL ? null : await startServer();
const BASE = (process.env.BASE_URL || server.url).replace(/\/$/, "");
const browser = await launchBrowser();
const problemas = [];
const passos = [];
const t0 = Date.now();

try {
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
watchPage(page, problemas);

const dizer = (msg) => { passos.push(msg); console.log("  " + msg); };

// ---------------------------------------------------------------- 1) página --
await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForFunction(() => {
  const t = document.getElementById("tamCompleto");
  const e = document.getElementById("estadoCompleto");
  return t && t.textContent.includes("MB") && e && !e.textContent.includes("verificando");
}, null, { timeout: 30000 });
const tamanhos = await page.evaluate(() => ({
  completo: document.getElementById("tamCompleto").textContent,
  jogar: document.getElementById("btnJogar").getAttribute("href"),
  estado: document.getElementById("estadoCompleto").textContent,
  parcial: !!document.getElementById("btnEssencial"),
}));
dizer("página oficial: pacote completo" + tamanhos.completo.replace("·", ""));
dizer("estado inicial: " + tamanhos.estado.trim());
if (!/MB/.test(tamanhos.completo) || !/arquivos/.test(tamanhos.completo)) problemas.push("tamanho do pacote completo não foi preenchido");
if (tamanhos.parcial) problemas.push("a página ainda oferece um botão parcial ESSENCIAL");
if (!/game\/mobile\/$/.test(tamanhos.jogar)) problemas.push("JOGAR deveria apontar para a versão mobile num aparelho de toque (foi " + tamanhos.jogar + ")");

// o manifest da raiz responde e é válido?
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]').href;
  const r = await fetch(href);
  const j = await r.json();
  return { status: r.status, nome: j.name, inicio: j.start_url, icones: j.icons.length };
});
if (manifest.status !== 200 || !manifest.nome || manifest.icones < 3) problemas.push("manifest da raiz inválido: " + JSON.stringify(manifest));
dizer("manifest: " + manifest.nome + " (start_url " + manifest.inicio + ", " + manifest.icones + " ícones)");

// INSTALABILIDADE: é o próprio Chromium quem responde se o convite nativo
// ("Instalar FUMIGA") aparece — lista vazia = nenhum erro de instalabilidade.
// É a prova objetiva de que o jogo é instalável, não só que tem um manifest.
const instalabilidade = async (alvo) => {
  const c = await ctx.newPage();
  const cdp = await ctx.newCDPSession(c);
  await c.goto(BASE + alvo, { waitUntil: "load" });
  await c.waitForTimeout(2000);                 // o Chrome avalia depois do load
  const r = await cdp.send("Page.getInstallabilityErrors");
  const m = await cdp.send("Page.getAppManifest");
  await c.close();
  return { erros: (r.installabilityErrors || []).map((e) => e.errorId + (e.errorArguments ? " " + JSON.stringify(e.errorArguments) : "")), manifest: m.errors || [] };
};
for (const alvo of ["/", "/game/mobile/"]) {
  const t = await instalabilidade(alvo);
  dizer("instalabilidade " + alvo + ": " + (t.erros.length ? t.erros.join(", ") : "sem erros (o navegador oferece INSTALAR)"));
  if (t.erros.length) problemas.push("o navegador recusaria instalar em " + alvo + ": " + JSON.stringify(t.erros));
}

// Service Worker instalou e assumiu?
const sw = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return { suporta: false };
  const reg = await navigator.serviceWorker.ready;
  return { suporta: true, ativo: !!reg.active, controla: !!navigator.serviceWorker.controller };
});
if (!sw.suporta || !sw.ativo) problemas.push("Service Worker não ficou ativo: " + JSON.stringify(sw));
dizer("service worker: ativo=" + sw.ativo + " controlando=" + sw.controla);

// -------------------------------------------------------------- 2) download --
const versao = await page.evaluate(async () => (await (await fetch("app/assets.json", { cache: "no-store" })).json()).version);

await page.click("#btnCompleto");
await page.waitForFunction(() => {
  const t = document.getElementById("progEsq");
  return t && (t.textContent.includes("pronto!") || t.textContent.includes("faltam") || t.textContent.includes("não deu"));
}, null, { timeout: 180000 });
await page.waitForFunction(() => {
  const e = document.getElementById("estadoCompleto");
  return e && e.textContent.includes("baixado ✓");
}, null, { timeout: 120000 }).catch(() => {});
const depois = await page.evaluate(() => ({
  progresso: document.getElementById("progEsq").textContent,
  estado: document.getElementById("estadoCompleto").textContent,
}));
dizer("download: " + depois.progresso.trim());
dizer("estado: " + depois.estado.trim());
if (depois.progresso.includes("não deu") || depois.progresso.includes("faltam")) problemas.push("download do pacote completo falhou: " + depois.progresso);
if (!depois.estado.includes("baixado ✓")) problemas.push("status do pacote completo não ficou completo: " + depois.estado);
await page.screenshot({ path: OUT + "/1-baixado.png", fullPage: true });

const cache = await page.evaluate(async (v) => {
  const nome = "fumiga-" + v;
  const nomes = await caches.keys();
  if (!nomes.includes(nome)) return { existe: false, nomes };
  const c = await caches.open(nome);
  const chaves = await c.keys();
  return { existe: true, quantos: chaves.length, amostra: chaves.slice(0, 3).map((r) => r.url) };
}, versao);
if (!cache.existe) problemas.push("cache fumiga-" + versao + " não existe (achei: " + JSON.stringify(cache.nomes) + ")");
dizer("cache " + "fumiga-" + versao + ": " + (cache.quantos || 0) + " arquivos guardados");

// ------------------------------------------------------- 3) offline: página --
await ctx.setOffline(true);
// O navegador termina workers ociosos; retomada não dispara install/activate.
const swCdp = await ctx.newCDPSession(page);
await swCdp.send("ServiceWorker.enable");
await swCdp.send("ServiceWorker.stopAllWorkers");
const retomada = await page.evaluate(async () => (await import("./app/offline.js")).mensagemSW({ type: "versao" }, { timeout: 10000 }));
assert.equal(retomada.versao, versao, "worker retomado offline recupera a versão persistida");
dizer("worker reiniciado offline: versão preservada " + retomada.versao);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => {
  const e = document.getElementById("estadoCompleto");
  return e && !e.textContent.includes("verificando");
}, null, { timeout: 60000 }).catch(() => {});
const offlinePagina = await page.evaluate(() => {
  const selo = document.getElementById("selo");
  const status = document.getElementById("estadoCompleto");
  return { selo: selo && selo.textContent, completo: status && status.textContent };
});
dizer("offline: a página abriu — " + (offlinePagina.completo || "").trim());
if (!offlinePagina.completo || !offlinePagina.completo.includes("baixado ✓")) {
  problemas.push("com a rede desligada a página não reconheceu o pacote completo: " + JSON.stringify(offlinePagina));
}

// -------------------------------------------------- 4) offline: o jogo roda --
const gp = await ctx.newPage();
watchPage(gp, problemas);
await gp.goto(BASE + "/game/mobile/", { waitUntil: "load" });
try {
  // predicado SÍNCRONO lendo MOD: um async devolveria uma Promise e a espera
  // terminaria na 1ª checagem, sem provar boot nenhum (browser-waits.mjs).
  await importGameModules(gp, { state: "state.js" });
  await gp.waitForFunction(() => MOD.state.G.screen !== "BOOT", null, { timeout: 60000, polling: 120 });
  dizer("offline: o jogo BOOTOU na versão mobile (tela " + await gp.evaluate(() => MOD.state.G.screen) + ")");
} catch (e) {
  problemas.push("o jogo NÃO bootou com a rede desligada: " + (e.message || e).split("\n")[0]);
}
await gp.screenshot({ path: OUT + "/2-jogo-offline.png" });

// ------------------------------------------- 5) offline: página do app (app) --
const ap = await ctx.newPage();
watchPage(ap, problemas);
await ap.goto(BASE + "/app/online.html?v=mobile", { waitUntil: "load" });
await ap.waitForFunction(() => {
  const b = document.getElementById("btnJogar");
  const e = document.getElementById("estadoCompleto");
  return b && /game\/mobile\//.test(b.getAttribute("href") || "") && e && !e.textContent.includes("verificando");
}, null, { timeout: 60000 });
const appPagina = await ap.evaluate(() => ({
  jogar: document.getElementById("btnJogar").getAttribute("href"),
  selo: document.getElementById("selo").textContent,
  texto: document.getElementById("textoJogar").textContent,
}));
dizer("app (?v=mobile): JOGAR → " + appPagina.jogar + " · " + appPagina.selo);
if (!/game\/mobile\/$/.test(appPagina.jogar)) problemas.push("página do app não levou para a versão mobile: " + appPagina.jogar);
await ap.screenshot({ path: OUT + "/3-app-offline.png", fullPage: true });

// PC usa o MESMO pacote, com shell/save próprios, ainda sem conexão.
const pc = await ctx.newPage();
await pc.setViewportSize({ width: 1280, height: 720 });
watchPage(pc, problemas);
await pc.goto(BASE + "/game/", { waitUntil: "load" });
await importGameModules(pc, { state: "state.js" });
await pc.waitForFunction(() => MOD.state.G.screen !== "BOOT", null, { timeout: 60000 });
await pc.screenshot({ path: OUT + "/4-pc-offline.png" });
dizer("offline: boot do shell PC também OK");

// Falhas deliberadas ficam em contexto separado: não contam como 404/console
// inesperados da inspeção normal. Exercita o cliente e o Worker reais.
const faultCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const fp = await faultCtx.newPage();
fp.on("pageerror", e => problemas.push("JS inesperado em regressão PWA: " + e.message));
await fp.goto(BASE + "/", { waitUntil: "load" });
await fp.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
const before = await fp.evaluate(async () => {
  const O = await import("./app/offline.js");
  const lista = await O.carregarLista("");
  const r = await O.baixarPacote({ lista });
  return { lista, r };
});
assert.equal(before.r.falhas, 0);
const next = { ...before.lista, version: before.lista.version + "-teste-falha" };
await faultCtx.route("**/app/assets.json", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(next) }));
await faultCtx.route("**/*", route => route.request().url().includes("v=" + next.version) ? route.abort("failed") : route.fallback());
const failed = await fp.evaluate(async lista => {
  const O = await import("./app/offline.js");
  const r = await O.baixarPacote({ lista });
  const version = await O.mensagemSW({ type: "versao" }, { timeout: 10000 });
  const old = await O.progressoPacote({ lista: { ...lista, version: lista.version.replace(/-teste-falha$/, "") } });
  return { r, version, old };
}, next);
assert.equal(failed.r.feitos, 0); assert.equal(failed.r.falhas, failed.r.total);
assert.equal(failed.version.versao, before.lista.version);
assert.equal(failed.old.completo, true, "update malsucedido mantém pacote anterior completo");
dizer("update com " + failed.r.falhas + " falhas: cópia anterior preservada");

const timedOut = await fp.evaluate(async () => {
  const O = await import("./app/offline.js");
  const reg = await navigator.serviceWorker.ready;
  const post = reg.active.postMessage;
  reg.active.postMessage = () => {}; // worker que não responde
  let message = null;
  try { await O.baixarPacote({ lista: await O.carregarLista(""), timeout: 30 }); }
  catch (err) { message = err.message; }
  finally { reg.active.postMessage = post; }
  return message;
});
assert.match(timedOut, /tempo/, "timeout rejeita, nunca anuncia pacote completo");
dizer("timeout: erro explícito, sem sucesso falso");
await faultCtx.setOffline(true);
const restart = await faultCtx.newCDPSession(fp);
await restart.send("ServiceWorker.enable"); await restart.send("ServiceWorker.stopAllWorkers");
assert.equal((await fp.reload({ waitUntil: "load" })).status(), 200);
const rollbackVersion = await fp.evaluate(async () => (await import("./app/offline.js")).mensagemSW({ type: "versao" }, { timeout: 10000 }));
assert.equal(rollbackVersion.versao, before.lista.version);
const recovered = await faultCtx.newPage();
await recovered.goto(BASE + "/game/mobile/", { waitUntil: "load" });
await importGameModules(recovered, { state: "state.js" });
await recovered.waitForFunction(() => MOD.state.G.screen !== "BOOT", null, { timeout: 60000 });
await recovered.screenshot({ path: OUT + "/5-update-falho-offline.png" });
dizer("depois do update falho + restart: boot offline continua OK");
await faultCtx.close();

// ------------------- 6) atualização: a 1ª abertura depois da versão nova --
// O worker serve o snapshot do cliente: a 1ª abertura depois de uma atualização
// ainda roda o motor anterior. Aqui uma "rede" com atraso (como a internet)
// publica uma versão falsa, deixa o navegador guardá-la e depois publica a
// verdadeira: o jogo tem que se corrigir sozinho com UMA recarga — e nunca com
// uma expedição em andamento (decisão do usuário, 2026-10-05, opção B).
if (!process.env.BASE_URL) {
  let falsa = null;
  const reescreve = {
    "/game/js/assets.js": [/ASSET_V = "[^"]*"/, (v) => 'ASSET_V = "' + v + '"'],
    "/app/assets.json": [/"version": "[^"]*"/, (v) => '"version": "' + v + '"'],
  };
  const fake = http.createServer((req, res) => setTimeout(() => {
    const regra = falsa && reescreve[req.url.split("?")[0]];
    const up = http.request({ host: "127.0.0.1", port: server.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      if (!regra) { res.writeHead(r.statusCode, r.headers); r.pipe(res); return; }
      const partes = [];
      r.on("data", (c) => partes.push(c));
      r.on("end", () => {
        const corpo = Buffer.from(Buffer.concat(partes).toString("utf8").replace(regra[0], regra[1](falsa)));
        res.writeHead(r.statusCode, { ...r.headers, "content-length": corpo.length });
        res.end(corpo);
      });
    });
    up.on("error", () => res.writeHead(502).end());
    req.pipe(up);
  }, 200));
  await new Promise((ok) => fake.listen(0, "127.0.0.1", ok));
  const REDE = "http://127.0.0.1:" + fake.address().port;

  const upCtx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const up = await upCtx.newPage();
  watchPage(up, problemas);
  let navegacoes = 0;
  up.on("framenavigated", (f) => { if (f === up.mainFrame()) navegacoes++; });
  // qual versão o 1º documento recebeu: se o snapshot velho tocava, a recarga
  // automática é obrigatória; se já veio a nova, o certo é NÃO recarregar
  let primeiraVersao = "?";
  up.on("response", async (r) => {
    if (primeiraVersao !== "?" || !/\/game\/js\/assets\.js(\?|$)/.test(r.url())) return;
    try { primeiraVersao = ((await r.text()).match(/ASSET_V = "([^"]*)"/) || [])[1] || "?"; } catch { /* corpo indisponível */ }
  });
  const versaoRodando = async () => {
    await importGameModules(up, { assets: "assets.js", state: "state.js" });
    await up.waitForFunction(() => MOD.state.G.screen === "PRETITLE", null, { timeout: 90000 });
    return up.evaluate(() => MOD.assets.ASSET_V);
  };
  try {
    // a) forma o snapshot velho: a página oficial registra o worker; o jogo o guarda
    falsa = "teste-velha";
    await up.goto(REDE + "/", { waitUntil: "load" });
    await up.evaluate(async () => { await navigator.serviceWorker.ready; });
    await up.reload({ waitUntil: "load" });
    await up.goto(REDE + "/game/", { waitUntil: "load" });
    assert.equal(await versaoRodando(), "teste-velha", "snapshot velho montado para o teste");

    // b) publica a versão nova: o jogo se corrige sozinho, sem laço
    falsa = null;
    navegacoes = 0;
    primeiraVersao = "?";
    await up.goto(REDE + "/game/", { waitUntil: "commit" });
    const fim = Date.now() + 20000;
    while (primeiraVersao === "?" && Date.now() < fim) await up.waitForTimeout(150);
    const rodouVelho = primeiraVersao === "teste-velha";
    if (rodouVelho) {
      const prazo = Date.now() + 30000;
      while (navegacoes < 2 && Date.now() < prazo) await up.waitForTimeout(200);
    }
    await up.waitForLoadState("load").catch(() => {});
    const depois = await versaoRodando();
    await up.waitForTimeout(3000);                       // não pode virar laço
    dizer("atualização: 1ª abertura " + (rodouVelho ? "rodou o snapshot velho" : "já veio da versão nova") +
      " → " + (navegacoes - 1) + " recarga automática, terminou rodando " + depois);
    assert.equal(depois, versao, "a 1ª abertura depois da atualização termina na versão nova");
    if (rodouVelho) assert.equal(navegacoes, 2, "exatamente 1 recarga automática (sem laço)");
    else assert.equal(navegacoes, 1, "não recarrega quando o código já é o novo");

    // c) versão nova com expedição DE VERDADE em andamento: só recarrega no título
    await up.goto(REDE + "/game/?debug&tela=RUN&mapa=1&seed=7&hud=0", { waitUntil: "load" });
    await importGameModules(up, { state: "state.js" });
    await up.waitForFunction(() => MOD.state.G.screen === "RUN" && !!MOD.state.G.run, null, { timeout: 90000 });
    falsa = "teste-outra";
    navegacoes = 0;
    const outra = await upCtx.newPage();                 // outra aba navega: o worker promove a versão
    await outra.goto(REDE + "/", { waitUntil: "load" });
    await up.waitForTimeout(6000);
    const durante = navegacoes;
    await up.evaluate(() => FUMIGA.go("TITLE"));
    const prazoC = Date.now() + 20000;
    while (navegacoes < 1 && Date.now() < prazoC) await up.waitForTimeout(200);
    dizer("atualização: com expedição em andamento " + (durante ? "RECARREGOU (errado)" : "não recarregou") +
      "; ao voltar ao título " + (navegacoes ? "recarregou" : "NÃO recarregou"));
    assert.equal(durante, 0, "nunca recarrega no meio de uma expedição");
    assert.ok(navegacoes >= 1, "recarrega quando o jogador volta ao título com versão nova pendente");
    await outra.close();
  } catch (err) {
    problemas.push("atualização: " + (err.message || err).split("\n")[0]);
  }
  await upCtx.close();
  fake.close();
}

} catch (err) {
  problemas.push(err.stack || String(err));
} finally {
  await browser.close();
  if (server) await server.close();
}

// ------------------------------------------------------------------ veredito --

const segundos = ((Date.now() - t0) / 1000).toFixed(1);
if (problemas.length) {
  console.error("\n✗ PWA NO NAVEGADOR FALHOU\n" + problemas.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log("\n✓ PWA OK — instalável, baixado e JOGÁVEL COM A REDE DESLIGADA (" + segundos + "s)");
console.log("  capturas em " + OUT);
