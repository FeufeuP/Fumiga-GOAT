// ============================================================================
// FUMIGA — Service Worker do app instalável (offline de verdade)
//
// Vive na RAIZ do repositório de propósito. O escopo de um Service Worker é a
// pasta onde ele mora, e o GitHub Pages NÃO permite enviar o cabeçalho
// `Service-Worker-Allowed` para ampliar esse escopo. Na raiz, este único
// arquivo governa tanto o site publicado (subpasta /Fumiga-GOAT/) quanto o
// servidor local do repositório (raiz /) — sem build, sem ajuste por ambiente.
//
// Responsabilidades (nada de regra de jogo mora aqui):
//   1. SHELL — guarda o código (HTML, CSS, módulos ES, ícones) para o jogo
//      abrir sem rede depois da primeira visita.
//   2. ASSETS SOB DEMANDA — a página de download manda as URLs do pacote
//      escolhido e recebe o progresso; o que fica no cache é o jogo inteiro.
//   3. FRESCOR — código é servido do cache e revalidado atrás (stale-while-
//      revalidate); navegação confere a versão em app/assets.json. Sem isso,
//      quem instalou continuaria rodando o motor VELHO para sempre (o cache
//      só seria trocado quando o próprio sw.js mudasse). Como a 1ª abertura
//      depois de uma atualização ainda roda o código guardado, o jogo pergunta
//      a versão (`versao-atual`) e recebe `versao-nova` quando o cache troca:
//      se o que está rodando é de outra versão, recarrega UMA vez no PRETITLE/
//      TÍTULO (game/js/main.js; decisão do usuário de 2026-10-05).
//
// A lista do que baixar é `app/assets.json` (gerada por tools/make_assets_list.mjs,
// com teste que impede sair de sincronia). A versão no nome do cache vem do
// ASSET_V do jogo: trocou um PNG e subiu o ASSET_V, o cache velho é descartado.
// ============================================================================

const LISTA = "app/assets.json";       // caminho relativo ao escopo (raiz do site)
const PREFIXO = "fumiga-";             // separa os caches deste app dos do navegador
const CONEXOES = 6;                    // downloads simultâneos na fila do pacote
// Código muda com o tempo (e o cache não pode servir motor velho para sempre);
// imagens são imutáveis por versão (ASSET_V) e valem cache-first puro.
const CODIGO = /\.(html|js|mjs|css|webmanifest)$/i;

let VERSAO = "dev";
let CACHE = PREFIXO + "dev";

// ------------------------------------------------------------------ install --
self.addEventListener("install", (event) => {
  event.waitUntil(instalar());
});

async function instalar() {
  const lista = await lerLista();
  if (lista) await usarVersao(lista.version, lista);
  else await caches.open(CACHE);        // sem lista: pelo menos cria o cache do shell
  await self.skipWaiting();             // assume o controle já na próxima visita
}

/** Lê app/assets.json SEM cache (é ele que diz a versão e o que baixar). */
async function lerLista() {
  try {
    const res = await fetch(LISTA, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

/** Troca o cache para a versão pedida e pré-carrega o shell (melhor esforço). */
async function usarVersao(versao, lista) {
  const nova = PREFIXO + (versao || "dev");
  const trocou = nova !== CACHE;
  VERSAO = versao || "dev";
  CACHE = nova;
  const cache = await caches.open(CACHE);
  if (lista) {
    await cache.put(LISTA, new Response(JSON.stringify(lista), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }));
    const shell = (lista.grupos || []).find((g) => g.id === "shell");
    await comFila((shell && shell.files) || [], CONEXOES, async (url) => {
      if (url === LISTA) return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* arquivo a arquivo: um 404 não derruba o install */ }
    });
  }
  // limpa o que sobrou de outras versões (depois de gravar, nunca antes)
  for (const nome of await caches.keys()) {
    if (nome.startsWith(PREFIXO) && nome !== CACHE) await caches.delete(nome);
  }
  // só agora (shell novo já gravado): quem recarregar pega o código novo inteiro
  if (trocou) avisarVersaoNova();
  return trocou;
}

/** Conta às páginas abertas qual versão o cache passou a guardar. */
async function avisarVersaoNova() {
  try {
    for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage({ type: "versao-nova", versao: VERSAO });
  } catch (e) { /* sem páginas abertas: nada a avisar */ }
}

// ---------------------------------------------------- versão em segundo plano --
let sincronizando = null;
/**
 * Roda a cada navegação (em segundo plano, sem segurar a resposta): se o
 * ASSET_V mudou, o cache é trocado sem precisar mexer neste arquivo.
 */
function sincronizarVersao() {
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    const lista = await lerLista();
    if (lista && PREFIXO + lista.version !== CACHE) await usarVersao(lista.version, lista);
  })().catch(() => {}).finally(() => { sincronizando = null; });
  return sincronizando;
}

// ----------------------------------------------------------------- activate --
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith(PREFIXO) && nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

// -------------------------------------------------------------------- fetch --
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  // Navegar é o momento natural de conferir se saiu versão nova do jogo.
  if (req.mode === "navigate") event.waitUntil(sincronizarVersao());
  event.respondWith(responder(req, event));
});

/**
 * Chave do cache para uma requisição.
 *
 * O detalhe que fez o offline NÃO funcionar na primeira versão: navegar para
 * uma PASTA ("/", "/game/", "/game/mobile/") pede a URL sem `index.html`, mas o
 * que está guardado é `…/index.html`. Sem esta normalização, abrir o app
 * instalado sem internet batia na rede e recebia 504.
 */
function chaveDe(req) {
  const u = new URL(req.url);
  if (req.mode === "navigate" && (u.pathname.endsWith("/") || u.pathname === "")) {
    u.pathname += "index.html";
  }
  return u.href;
}

async function responder(req, event) {
  const cache = await caches.open(CACHE);
  const chave = chaveDe(req);
  const guardado = (await cache.match(chave, { ignoreSearch: true })) ||
                   (await cache.match(req, { ignoreSearch: true }));

  const daRede = async () => {
    const res = await fetch(req);
    // Guarda só resposta boa e do próprio site (evita envenenar com erro/opaco)
    if (res && res.ok && (res.type === "basic" || res.type === "default")) {
      cache.put(chave, res.clone()).catch(() => {});
    }
    return res;
  };

  if (guardado) {
    // Código: entrega o guardado agora e atualiza atrás (a próxima visita já
    // pega a versão nova). Imagem: o cache manda — ASSET_V cuida da validade.
    if (CODIGO.test(new URL(req.url).pathname)) event.waitUntil(daRede().catch(() => null));
    return guardado;
  }

  try {
    return await daRede();
  } catch (e) {
    // Sem rede e sem cópia: última tentativa é a própria resposta de erro.
    return new Response("SEM CONEXÃO E SEM CÓPIA LOCAL: " + req.url, {
      status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// ------------------------------------------------------------------ mensagens -
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  const responder = (m) => { try { event.source && event.source.postMessage(m); } catch (e) {} };

  if (msg.type === "versao") {
    responder({ type: "versao", versao: VERSAO, cache: CACHE });
    return;
  }
  if (msg.type === "versao-atual") {
    // o jogo pergunta ao abrir: confere a lista na rede (e troca o cache, se
    // for o caso) ANTES de responder; sem rede, responde o que já tem
    event.waitUntil(sincronizarVersao().then(() => responder({ type: "versao-atual", versao: VERSAO })));
    return;
  }
  if (msg.type === "baixar") {
    event.waitUntil(baixar(msg, responder));
    return;
  }
  if (msg.type === "limpar") {
    event.waitUntil(limpar(responder));
  }
});

/** Baixa uma lista de URLs para o cache, reportando progresso e falhas. */
async function baixar(msg, responder) {
  // A página manda a versão que leu de app/assets.json: o cache TEM que ser o
  // mesmo, senão o progresso ("o que já está baixado") nunca fecha.
  if (msg.versao && PREFIXO + msg.versao !== CACHE) await usarVersao(msg.versao, null);

  const urls = Array.isArray(msg.urls) ? msg.urls : [];
  const cache = await caches.open(CACHE);
  let feitos = 0, falhas = 0, baixados = 0;
  const t0 = Date.now();
  let ultimoAviso = 0;

  const avisar = (final) => {
    responder({
      type: final ? "fim" : "progresso",
      feitos, falhas, total: urls.length, versao: VERSAO,
      novos: baixados, segundos: Math.round((Date.now() - t0) / 1000),
    });
  };

  await comFila(urls, CONEXOES, async (url) => {
    // já está no cache (veio do shell ou de um download anterior)?
    let ok = !!(await cache.match(url, { ignoreSearch: true }));
    for (let tentativa = 0; !ok && tentativa < 2; tentativa++) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) { await cache.put(url, res); ok = true; baixados++; }
      } catch (e) { /* tenta de novo */ }
    }
    ok ? feitos++ : falhas++;
    const agora = Date.now();
    if (agora - ultimoAviso > 200) { ultimoAviso = agora; avisar(false); }
  });

  avisar(true);
}

/** Apaga os caches do app (a página oferece isso em "LIBERAR ESPAÇO"). */
async function limpar(responder) {
  let apagados = 0;
  for (const nome of await caches.keys()) {
    if (nome.startsWith(PREFIXO) && await caches.delete(nome)) apagados++;
  }
  responder({ type: "limpo", apagados });
}

// ----------------------------------------------------------------- fila ------
/** Roda `tarefa(item)` com concorrência limitada; nunca rejeita. */
async function comFila(itens, conexoes, tarefa) {
  let i = 0;
  const n = Math.max(1, Math.min(conexoes, itens.length));
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < itens.length) {
      const item = itens[i++];
      try { await tarefa(item); } catch (e) { /* a tarefa trata o próprio erro */ }
    }
  }));
}
