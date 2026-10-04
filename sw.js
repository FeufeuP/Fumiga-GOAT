// FUMIGA — Service Worker compartilhado por PC/mobile, raiz local e GitHub Pages.
// Código/assets são snapshots imutáveis por ASSET_V. A versão ativa e a versão
// de cada cliente são persistidas: terminar o worker não perde o pacote offline.
// Atualizações são preparadas/verificadas antes de promover; a última cópia boa
// e os snapshots de abas ainda abertas não são apagados por um download falho.
const LISTA = "app/assets.json";
const PREFIXO = "fumiga-";
const CONEXOES = 6;
const BASE = new URL(self.registration.scope);
const LISTA_URL = new URL(LISTA, BASE).href;
const CONTROLE = PREFIXO + "controle";
const ATIVA_URL = new URL("__fumiga__/ativa", BASE).href;
const PRONTA_URL = new URL("__fumiga__/pronta", BASE).href;
const CLIENTES_URL = new URL("__fumiga__/clientes/", BASE).href;
let VERSAO = "dev", CACHE = PREFIXO + "dev", anterior = null;
let iniciando = null, sincronizando = null, fila = Promise.resolve();
const clientes = new Map();

const versaoValida = v => typeof v === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(v) && v !== "controle";
const nomeCache = v => PREFIXO + v;
function urlLocal(value, versao) {
  const url = new URL(value, BASE);
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) throw new Error("Arquivo fora do escopo do jogo");
  url.hash = "";
  if (versao) url.searchParams.set("v", versao);
  return url.href;
}
function listaValida(lista) {
  if (!lista || !versaoValida(lista.version) || !Array.isArray(lista.grupos)) return false;
  const shell = lista.grupos.find(g => g.id === "shell");
  if (!shell?.files?.length) return false;
  try {
    return lista.grupos.every(g => Array.isArray(g.files) && g.files.every(f => typeof f === "string" && !!urlLocal(f)));
  } catch { return false; }
}
const urlsGrupo = (lista, id) => (lista.grupos.find(g => g.id === id)?.files || []).map(f => urlLocal(f, lista.version));
const urlsRecursos = lista => lista.grupos.filter(g => g.id !== "shell")
  .flatMap(g => g.files.map(f => urlLocal(f, lista.version)));
const jsonResponse = value => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json; charset=utf-8" } });
async function lerJSON(cache, url) {
  try { const r = await cache.match(url, { ignoreSearch: true }); return r?.ok ? await r.json() : null; }
  catch { return null; }
}
async function verificar(cache, urls) {
  if (!urls.length) return false;
  // Lotes limitados: não materializa centenas de respostas grandes de uma vez.
  for (let i = 0; i < urls.length; i += 32) {
    const ok = await Promise.all(urls.slice(i, i + 32).map(async url => (await cache.match(url, { ignoreSearch: true }))?.ok === true));
    if (ok.some(v => !v)) return false;
  }
  return true;
}
function emFila(task) {
  const resultado = fila.then(task);
  fila = resultado.catch(() => {});
  return resultado;
}

/** Recupera inclusive caches da implementação anterior, sem depender de rede. */
function inicializar() {
  if (iniciando) return iniciando;
  iniciando = (async () => {
    const nomes = await caches.keys();
    const controle = await caches.open(CONTROLE);
    const salva = await lerJSON(controle, ATIVA_URL);
    const candidatos = [...new Set([salva?.versao, ...nomes.filter(n => n.startsWith(PREFIXO) && n !== CONTROLE).reverse().map(n => n.slice(PREFIXO.length))])];
    for (const versao of candidatos) {
      if (!versaoValida(versao) || !nomes.includes(nomeCache(versao))) continue;
      const cache = await caches.open(nomeCache(versao));
      const lista = await lerJSON(cache, LISTA_URL);
      const pronta = await lerJSON(cache, PRONTA_URL);
      if (pronta && pronta.pronta !== true) continue; // staging não é fallback
      if (!listaValida(lista) || lista.version !== versao || !await verificar(cache, urlsGrupo(lista, "shell"))) continue;
      VERSAO = versao; CACHE = nomeCache(versao);
      anterior = salva?.versao === versao && versaoValida(salva.anterior) && nomes.includes(nomeCache(salva.anterior)) ? salva.anterior : null;
      // A migração funciona mesmo se o armazenamento estiver cheio: os arquivos
      // existentes continuam disponíveis e uma futura retomada repete a busca.
      await controle.put(ATIVA_URL, jsonResponse({ versao, anterior })).catch(() => {});
      break;
    }
    for (const key of await controle.keys()) {
      if (!key.url.startsWith(CLIENTES_URL)) continue;
      const data = await lerJSON(controle, key);
      if (versaoValida(data?.versao) && nomes.includes(nomeCache(data.versao))) clientes.set(decodeURIComponent(key.url.slice(CLIENTES_URL.length)), data.versao);
    }
  })().catch(err => { iniciando = null; throw err; });
  return iniciando;
}
async function lerLista() {
  try {
    const res = await fetch(LISTA_URL, { cache: "no-store" });
    const lista = res.ok ? await res.json() : null;
    return listaValida(lista) ? lista : null;
  } catch { return null; }
}
async function vincularCliente(id, versao) {
  if (!id || versao === "dev" || clientes.get(id) === versao) return;
  clientes.set(id, versao);
  const controle = await caches.open(CONTROLE);
  await controle.put(CLIENTES_URL + encodeURIComponent(id), jsonResponse({ versao })).catch(() => {});
}

/** Mantém ativa + anterior + versões usadas por clientes ainda abertos. */
async function limparAntigas() {
  const controle = await caches.open(CONTROLE);
  const abertos = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const ids = new Set(abertos.map(c => c.id));
  const manter = new Set([CONTROLE, CACHE, anterior && nomeCache(anterior)]);
  for (const [id, versao] of clientes) {
    if (ids.has(id)) manter.add(nomeCache(versao));
    else { clientes.delete(id); await controle.delete(CLIENTES_URL + encodeURIComponent(id)); }
  }
  for (const nome of await caches.keys()) {
    if (nome.startsWith(PREFIXO) && !manter.has(nome)) await caches.delete(nome);
  }
}
async function promover(lista, cache) {
  if (!await verificar(cache, urlsGrupo(lista, "shell"))) throw new Error("Código da nova versão incompleto");
  await cache.put(PRONTA_URL, jsonResponse({ versao: lista.version, pronta: true }));
  const previa = VERSAO === lista.version ? anterior : VERSAO !== "dev" ? VERSAO : null;
  const controle = await caches.open(CONTROLE);
  // Commit persistente primeiro. Erro/quota não altera a versão ativa em memória.
  await controle.put(ATIVA_URL, jsonResponse({ versao: lista.version, anterior: previa }));
  anterior = previa; VERSAO = lista.version; CACHE = nomeCache(VERSAO);
  await limparAntigas();
}

/** Prepara um snapshot sem tocar na versão ativa. Retoma arquivos já guardados. */
async function preparar(lista, urls, progresso) {
  const cache = await caches.open(nomeCache(lista.version));
  const protegida = lista.version === VERSAO || lista.version === anterior || [...clientes.values()].includes(lista.version);
  if (!protegida && (await lerJSON(cache, PRONTA_URL))?.pronta !== true) {
    await cache.put(PRONTA_URL, jsonResponse({ versao: lista.version, pronta: false }));
  }
  await cache.put(LISTA_URL, jsonResponse(lista));
  const arquivos = [...new Set(urls.map(u => urlLocal(u, lista.version)))];
  let feitos = 0, falhas = 0, novos = 0, ultimoAviso = 0;
  const inicio = Date.now();
  const avisar = () => progresso?.({ feitos, falhas, total: arquivos.length, novos, versao: lista.version, segundos: Math.round((Date.now() - inicio) / 1000) });
  await comFila(arquivos, async url => {
    let ok = false;
    try { ok = (await cache.match(url, { ignoreSearch: true }))?.ok === true; } catch { /* tenta rede */ }
    for (let t = 0; !ok && t < 2; t++) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) { await cache.put(url, res); ok = true; novos++; }
      } catch { /* falha/quota é contada, nunca vira sucesso */ }
    }
    ok ? feitos++ : falhas++;
    if (Date.now() - ultimoAviso > 200) { ultimoAviso = Date.now(); avisar(); }
  });
  // Conferência independente das contagens: eviction/interrupção não passa por sucesso.
  if (!falhas && !await verificar(cache, arquivos)) throw new Error("Pacote não permaneceu completo no armazenamento");
  return { cache, feitos, falhas, total: arquivos.length, novos, versao: lista.version, segundos: Math.round((Date.now() - inicio) / 1000) };
}

/** Atualização automática preserva também os pacotes previamente baixados. */
async function atualizar(lista) {
  if (lista.version === VERSAO) return;
  let urls = urlsGrupo(lista, "shell");
  if (VERSAO !== "dev") {
    const antiga = await caches.open(CACHE);
    const listaAntiga = await lerJSON(antiga, LISTA_URL);
    if (listaValida(listaAntiga)) {
      // Só migra o pacote de recursos se a versão anterior tinha TODOS os
      // assets. Também reconhece a lista antiga (grupos essencial + completo).
      if (await verificar(antiga, urlsRecursos(listaAntiga))) urls.push(...urlsRecursos(lista));
    }
  }
  const r = await preparar(lista, urls);
  if (r.falhas) return; // a última versão utilizável permanece ativa
  await promover(lista, r.cache);
}
function sincronizarVersao() {
  if (sincronizando) return sincronizando;
  sincronizando = emFila(async () => {
    await inicializar();
    const lista = await lerLista();
    if (lista) await atualizar(lista);
  }).catch(() => {}).finally(() => { sincronizando = null; });
  return sincronizando;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await inicializar();
    const lista = await lerLista();
    try { if (lista) await emFila(() => atualizar(lista)); }
    catch (err) { if (VERSAO === "dev") throw err; }
    if (VERSAO === "dev") throw new Error("Sem código completo para instalar offline");
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await inicializar();
    // Clientes que estavam abertos durante a troca ainda executam o motor
    // anterior. Novas navegações serão vinculadas à versão ativa.
    for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) {
      if (!clientes.has(client.id)) await vincularCliente(client.id, anterior || VERSAO);
    }
    await self.clients.claim();
  })());
});

function chaveDe(req) {
  const u = new URL(req.url);
  if (req.mode === "navigate" && u.pathname.endsWith("/")) u.pathname += "index.html";
  return u.href;
}
async function escolherVersao(req, event) {
  const v = new URL(req.url).searchParams.get("v");
  if (versaoValida(v)) {
    if (v === VERSAO || v === anterior || v === clientes.get(event.clientId)) return v;
    if ((await caches.keys()).includes(nomeCache(v))) {
      const pronta = await lerJSON(await caches.open(nomeCache(v)), PRONTA_URL);
      if (pronta?.versao === v && pronta.pronta === true) return v;
    }
  }
  return req.mode === "navigate" ? VERSAO : clientes.get(event.clientId) || VERSAO;
}
async function responder(req, event) {
  // Storage indisponível não pode derrubar a navegação: cai para a rede.
  try { await inicializar(); } catch { /* segue com a versão em memória */ }
  const versao = await escolherVersao(req, event);
  await vincularCliente(req.mode === "navigate" ? event.resultingClientId : event.clientId, versao);
  const cache = await caches.open(nomeCache(versao));
  const chave = chaveDe(req);
  // Manifesto de download é network-first; o código/assets da sessão não são
  // revalidados em cima de um snapshot que outra aba ainda está executando.
  if (new URL(req.url).pathname === new URL(LISTA_URL).pathname) {
    try { const res = await fetch(req, { cache: "no-store" }); if (res.ok) return res; } catch { /* offline: lista do snapshot */ }
  }
  const guardado = await cache.match(chave, { ignoreSearch: true }) || await cache.match(req, { ignoreSearch: true });
  if (guardado?.ok) return guardado;
  try {
    const res = await fetch(req);
    if (res?.ok && (res.type === "basic" || res.type === "default")) {
      event.waitUntil(cache.put(chave, res.clone()).catch(() => {}));
    }
    return res;
  } catch {
    return new Response("SEM CONEXÃO E SEM CÓPIA LOCAL: " + req.url, { status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const atendimento = responder(req, event);
  event.respondWith(atendimento);
  // Só inicia a atualização depois de escolher/persistir o snapshot da navegação.
  if (req.mode === "navigate") event.waitUntil(atendimento.then(() => sincronizarVersao()));
});

self.addEventListener("message", event => {
  const msg = event.data || {};
  const responder = m => {
    try { event.source?.postMessage({ ...m, requestId: msg.requestId, protocol: 2 }); } catch { /* cliente fechado */ }
  };
  const task = async () => {
    await inicializar();
    if (msg.type === "versao") { responder({ type: "versao", versao: VERSAO, cache: CACHE }); return; }
    if (msg.type === "baixar") await baixar(msg, responder);
    if (msg.type === "limpar") await limpar(responder);
  };
  // Leituras não esperam um download longo; mutações são serializadas.
  event.waitUntil((msg.type === "versao" ? task() : emFila(task))
    .catch(err => responder({ type: "erro", message: err.message || "Falha no armazenamento offline" })));
});
async function baixar(msg, responder) {
  if (!versaoValida(msg.versao) || !Array.isArray(msg.urls) || !msg.urls.length) throw new Error("Pedido de download inválido");
  let lista = listaValida(msg.lista) && msg.lista.version === msg.versao ? msg.lista : null;
  if (!lista) lista = await lerJSON(await caches.open(nomeCache(msg.versao)), LISTA_URL);
  if (!listaValida(lista) || lista.version !== msg.versao) lista = await lerLista();
  if (!listaValida(lista) || lista.version !== msg.versao) throw new Error("Lista da versão solicitada indisponível");
  const permitidos = new Set(lista.grupos.flatMap(g => g.files.map(f => new URL(urlLocal(f)).pathname)));
  const urls = msg.urls.map(u => urlLocal(u, lista.version));
  if (urls.some(u => !permitidos.has(new URL(u).pathname))) throw new Error("Arquivo não pertence ao pacote do jogo");
  const destino = await caches.open(nomeCache(lista.version));
  const historica = lista.version !== VERSAO && (lista.version === anterior || [...clientes.values()].includes(lista.version)
    || (await lerJSON(destino, PRONTA_URL))?.pronta === true);
  const r = await preparar(lista, urls, m => responder({ type: "progresso", ...m }));
  if (!r.falhas && !historica) await promover(lista, r.cache);
  const { cache, ...resultado } = r;
  responder({ type: "fim", ...resultado });
}
async function limpar(responder) {
  let apagados = 0;
  for (const nome of await caches.keys()) if (nome.startsWith(PREFIXO) && await caches.delete(nome)) apagados++;
  VERSAO = "dev"; CACHE = nomeCache(VERSAO); anterior = null; clientes.clear();
  responder({ type: "limpo", apagados });
}
async function comFila(itens, tarefa) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONEXOES, itens.length) }, async () => {
    while (i < itens.length) await tarefa(itens[i++]);
  }));
}
