// INSPEÇÃO DO APP INSTALÁVEL NO NAVEGADOR — a Regra 4 aplicada ao download.
// Uso: node game/test/pwa-browser.mjs          (= npm run inspect:pwa)
//      BASE_URL=http://host:porta  ·  PWA_SHOTS=/pasta  (capturas fora do Git)
//
// O que ele faz de verdade, num Chromium:
//   1. abre a página oficial (raiz) e confere que ela diz os tamanhos certos;
//   2. clica em BAIXAR ESSENCIAL, acompanha a barra até 100% e confere no
//      Cache Storage que os arquivos chegaram — inclusive as 14 camadas da
//      Noite Branca, que tocam sozinhas na 1ª expedição;
//   3. DESLIGA A REDE e recarrega: a página tem que abrir mesmo assim;
//   4. com a rede desligada, entra em /game/ e espera o jogo BOOTAR (G.screen
//      diferente de BOOT, sem 404 e sem erro de JS) — é o teste que prova que
//      "baixado" é "jogável sem internet", não só "arquivos no cache";
//   5. abre a página do app (?v=mobile) offline e confere o botão JOGAR;
//   6. ATUALIZAÇÃO: uma "rede" com atraso serve uma versão velha (o SW guarda)
//      e depois a atual — o jogo tem que recarregar UMA vez sozinho e terminar
//      na versão nova, e com uma expedição em andamento só recarregar quando o
//      jogador voltar ao título (decisão de 2026-10-05).
import fs from "node:fs";
import http from "node:http";
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

const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
watchPage(page, problemas);

const dizer = (msg) => { passos.push(msg); console.log("  " + msg); };

// ---------------------------------------------------------------- 1) página --
await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForFunction(() => {
  const t = document.getElementById("tamEssencial");
  const e = document.getElementById("estadoEssencial");
  return t && t.textContent.includes("MB") && e && !e.textContent.includes("verificando");
}, null, { timeout: 30000 });
const tamanhos = await page.evaluate(() => ({
  essencial: document.getElementById("tamEssencial").textContent,
  completo: document.getElementById("tamCompleto").textContent,
  jogar: document.getElementById("btnJogar").getAttribute("href"),
  estadoEssencial: document.getElementById("estadoEssencial").textContent,
}));
dizer("página oficial: essencial" + tamanhos.essencial.replace("·", "") + " · completo" + tamanhos.completo.replace("·", ""));
dizer("estado inicial: " + tamanhos.estadoEssencial.trim());
if (!/^\d+,\d+ MB · \d+ arquivos$/.test(tamanhos.essencial.replace("· ", "·").replace(" · ", " · ").trim())) {
  // formato tolerante: o essencial precisa ao menos citar MB e a contagem
  if (!/MB/.test(tamanhos.essencial) || !/arquivos/.test(tamanhos.essencial)) problemas.push("tamanho do pacote essencial não foi preenchido");
}
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

await page.click("#btnEssencial");
await page.waitForFunction(() => {
  const t = document.getElementById("progEsq");
  return t && (t.textContent.includes("pronto!") || t.textContent.includes("faltando") || t.textContent.includes("não deu"));
}, null, { timeout: 180000 });
await page.waitForFunction(() => {
  const e = document.getElementById("estadoEssencial");
  return e && e.textContent.includes("baixado ✓");
}, null, { timeout: 120000 }).catch(() => {});
const depois = await page.evaluate(() => ({
  progresso: document.getElementById("progEsq").textContent,
  essencial: document.getElementById("estadoEssencial").textContent,
  completo: document.getElementById("estadoCompleto").textContent,
}));
dizer("download: " + depois.progresso.trim());
dizer("estado: " + depois.essencial.trim());
if (depois.progresso.includes("não deu") || depois.progresso.includes("faltando")) problemas.push("download do pacote essencial falhou: " + depois.progresso);
if (!depois.essencial.includes("baixado ✓")) problemas.push("status do essencial não ficou completo: " + depois.essencial);
if (!depois.completo.includes("arquivos") && !depois.completo.includes("baixado")) problemas.push("status do pacote completo não indicou parcial: " + depois.completo);
await page.screenshot({ path: OUT + "/1-baixado.png", fullPage: true });

const cache = await page.evaluate(async (v) => {
  const nome = "fumiga-" + v;
  const nomes = await caches.keys();
  if (!nomes.includes(nome)) return { existe: false, nomes };
  const c = await caches.open(nome);
  const chaves = await c.keys();
  // Noite Branca no ESSENCIAL (decisão 2026-10-04): ela toca sozinha na 1ª
  // expedição, então baixar só o pacote básico já tem que trazer as camadas.
  const lista = await (await fetch("app/assets.json", { cache: "no-store" })).json();
  const ehNoite = (u) => u.includes("cutscenes/noite_branca/");
  return {
    existe: true, quantos: chaves.length, amostra: chaves.slice(0, 3).map((r) => r.url),
    noite: new Set(chaves.map((r) => new URL(r.url).pathname).filter(ehNoite)).size,
    noiteLista: lista.grupos.find((g) => g.id === "essencial").files.filter(ehNoite).length,
  };
}, versao);
if (!cache.existe) problemas.push("cache fumiga-" + versao + " não existe (achei: " + JSON.stringify(cache.nomes) + ")");
dizer("cache " + "fumiga-" + versao + ": " + (cache.quantos || 0) + " arquivos guardados");
dizer("Noite Branca no pacote essencial: " + cache.noite + " de " + cache.noiteLista + " camadas no cache");
if (cache.existe && (!cache.noiteLista || cache.noite < cache.noiteLista)) {
  problemas.push("as camadas da Noite Branca não vieram com o pacote essencial (" + cache.noite + "/" + cache.noiteLista + ")");
}

// ------------------------------------------------------- 3) offline: página --
await ctx.setOffline(true);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => {
  const e = document.getElementById("estadoEssencial");
  return e && !e.textContent.includes("verificando");
}, null, { timeout: 60000 }).catch(() => {});
const offlinePagina = await page.evaluate(() => {
  const selo = document.getElementById("selo");
  const ess = document.getElementById("estadoEssencial");
  return { selo: selo && selo.textContent, essencial: ess && ess.textContent };
});
dizer("offline: a página abriu — " + (offlinePagina.essencial || "").trim());
if (!offlinePagina.essencial || !offlinePagina.essencial.includes("baixado ✓")) {
  problemas.push("com a rede desligada a página não reconheceu o download: " + JSON.stringify(offlinePagina));
}

// -------------------------------------------------- 4) offline: o jogo roda --
const gp = await ctx.newPage();
watchPage(gp, problemas);
await gp.goto(BASE + "/game/mobile/", { waitUntil: "load" });
try {
  // predicado SÍNCRONO lendo MOD: o async antigo voltava na hora e dava
  // "bootou" mesmo com o jogo parado no BOOT
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
  const e = document.getElementById("estadoEssencial");
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

// ------------------------------------- 6) atualização: quem volta depois --
// O bug que um teste de uma passada só não vê: com o código guardado, a 1ª
// abertura depois de uma atualização rodava a versão ANTERIOR (o painel 3 da
// Noite Branca saía sem a arte). A "rede" abaixo atrasa cada pedido (como a
// internet) e, quando `falsa` está ligada, troca a versão em assets.js e em
// app/assets.json — é assim que o navegador fica com uma versão velha guardada.
if (!process.env.BASE_URL) {
  const real = await startServer();
  let falsa = null;
  const ATRASO = 200;
  const reescreve = { "/game/js/assets.js": [/ASSET_V = "[^"]*"/, (v) => 'ASSET_V = "' + v + '"'],
                      "/app/assets.json": [/"version": "[^"]*"/, (v) => '"version": "' + v + '"'] };
  const rede = http.createServer((req, res) => setTimeout(() => {
    const regra = falsa && reescreve[req.url.split("?")[0]];
    const up = http.request({ host: "127.0.0.1", port: real.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      if (!regra) { res.writeHead(r.statusCode, r.headers); r.pipe(res); return; }
      const partes = [];
      r.on("data", (c) => partes.push(c));
      r.on("end", () => {
        const corpo = Buffer.from(Buffer.concat(partes).toString("utf8").replace(regra[0], regra[1](falsa)));
        const h = { ...r.headers, "content-length": corpo.length };
        res.writeHead(r.statusCode, h); res.end(corpo);
      });
    });
    up.on("error", () => res.writeHead(502).end());
    req.pipe(up);
  }, ATRASO));
  await new Promise((ok) => rede.listen(0, "127.0.0.1", ok));
  const URL_REDE = "http://127.0.0.1:" + rede.address().port;
  const versaoReal = (fs.readFileSync(new URL("../js/assets.js", import.meta.url), "utf8").match(/ASSET_V = "([^"]*)"/) || [])[1];

  const cu = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const up = await cu.newPage();
  watchPage(up, problemas);
  // conta NAVEGAÇÕES, não "load": a recarga pode vir ainda no carregamento,
  // e aí o 1º documento nem chega a disparar o load
  let navegacoes = 0;
  up.on("framenavigated", (f) => { if (f === up.mainFrame()) navegacoes++; });
  // qual versão a 1ª página RECEBEU: se o SW tinha acabado de reiniciar, o código
  // já vem da rede e não há o que corrigir — aí o certo é não recarregar
  let primeiraVersao = null;
  up.on("response", async (r) => {
    if (primeiraVersao !== null || !/\/game\/js\/assets\.js(\?|$)/.test(r.url())) return;
    primeiraVersao = "?";
    try { primeiraVersao = ((await r.text()).match(/ASSET_V = "([^"]*)"/) || [])[1] || "?"; } catch (e) { /* corpo indisponível */ }
  });
  const versaoRodando = async () => {
    await importGameModules(up, { assets: "assets.js", state: "state.js" });
    await up.waitForFunction(() => MOD.state.G.screen === "PRETITLE", null, { timeout: 90000 });
    return up.evaluate(() => MOD.assets.ASSET_V);
  };
  const esperaNavegacoes = async (n, ms) => {
    const fim = Date.now() + ms;
    while (navegacoes < n && Date.now() < fim) await up.waitForTimeout(200);
    await up.waitForLoadState("load");
    return navegacoes >= n;
  };
  try {
    // a) versão velha: a página oficial registra o SW; o jogo é aberto e guardado
    falsa = "teste-velha";
    await up.goto(URL_REDE + "/", { waitUntil: "load" });
    await up.evaluate(async () => { await navigator.serviceWorker.ready; });
    await up.reload({ waitUntil: "load" });
    await up.goto(URL_REDE + "/game/", { waitUntil: "load" });
    const velha = await versaoRodando();
    if (velha !== "teste-velha") problemas.push("atualização: não consegui montar a versão velha (rodando " + velha + ")");

    // b) sai a versão nova: a 1ª abertura roda o código guardado e tem que se corrigir sozinha
    falsa = null;
    navegacoes = 0;
    primeiraVersao = null;
    await up.goto(URL_REDE + "/game/", { waitUntil: "commit" });
    const velhaNaAbertura = await (async () => {
      const fim = Date.now() + 15000;
      while ((primeiraVersao === null || primeiraVersao === "?") && Date.now() < fim) await up.waitForTimeout(100);
      return primeiraVersao === "teste-velha";
    })();
    await esperaNavegacoes(velhaNaAbertura ? 2 : 1, 30000);
    const depois = await versaoRodando();
    await up.waitForTimeout(3000);                              // e não pode virar laço
    dizer("atualização: 1ª abertura depois da versão nova " + (velhaNaAbertura ? "rodou o código GUARDADO (velho)" : "já veio da rede") +
          " → " + (navegacoes - 1) + " recarga automática, terminou rodando " + depois);
    if (depois !== versaoReal) problemas.push("atualização: a 1ª abertura ficou na versão " + depois + " (esperado " + versaoReal + ")");
    if (velhaNaAbertura && navegacoes !== 2) problemas.push("atualização: esperado 1 recarga automática, houve " + (navegacoes - 1));
    if (!velhaNaAbertura && navegacoes !== 1) problemas.push("atualização: recarregou sem precisar (" + (navegacoes - 1) + "x)");

    // c) versão nova saindo com uma expedição DE VERDADE em andamento (?debug&tela=RUN):
    //    não recarrega; quando o jogador volta ao título, recarrega
    await up.goto(URL_REDE + "/game/?debug&tela=RUN&mapa=1&seed=7&hud=0", { waitUntil: "load" });
    await importGameModules(up, { state: "state.js" });
    await up.waitForFunction(() => MOD.state.G.screen === "RUN" && !!MOD.state.G.run, null, { timeout: 90000 });
    falsa = "teste-outra";
    navegacoes = 0;
    const outra = await cu.newPage();                           // outra aba navega: o SW troca o cache e avisa
    await outra.goto(URL_REDE + "/", { waitUntil: "load" });
    await up.waitForTimeout(6000);
    const durante = navegacoes;
    await up.evaluate(() => FUMIGA.go("TITLE"));
    const noTitulo = await esperaNavegacoes(1, 20000);
    dizer("atualização: com expedição em andamento " + (durante ? "RECARREGOU (errado)" : "não recarregou") +
          "; ao voltar ao título " + (noTitulo ? "recarregou" : "NÃO recarregou"));
    if (durante) problemas.push("atualização: recarregou no meio de uma expedição");
    if (!noTitulo) problemas.push("atualização: não recarregou ao voltar ao título com versão nova pendente");
    await outra.close();
  } catch (e) {
    problemas.push("atualização: " + (e.message || e).split("\n")[0]);
  }
  await cu.close();
  rede.close();
  await real.close();
}

// ------------------------------------------------------------------ veredito --
await browser.close();
if (server) await server.close();

const segundos = ((Date.now() - t0) / 1000).toFixed(1);
if (problemas.length) {
  console.error("\n✗ PWA NO NAVEGADOR FALHOU\n" + problemas.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log("\n✓ PWA OK — instalável, baixado e JOGÁVEL COM A REDE DESLIGADA (" + segundos + "s)");
console.log("  capturas em " + OUT);
