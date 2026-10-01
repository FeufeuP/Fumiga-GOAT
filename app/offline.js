// ============================================================================
// FUMIGA — apoio das páginas de instalação e download (app/, raiz)
//
// Este arquivo NÃO faz parte do motor do jogo: é usado só pela página oficial
// (index.html) e pela página do app instalado (app/online.html). Ele resolve
// três coisas, nos dois ambientes (GitHub Pages e servidor local):
//
//   • detectar o ambiente (instalado? iOS? suporta Service Worker?);
//   • registrar o Service Worker da raiz do repositório;
//   • baixar um pacote de assets para o Cache Storage com progresso, e dizer
//     o que já está baixado.
//
// A verdade sobre o que baixar é `app/assets.json` (gerada + testada).
// ============================================================================

/** Caminho da lista, a partir da página: "app/assets.json" (raiz) ou "../app/assets.json". */
export const listaUrl = (base) => base + "app/assets.json";
/**
 * URL final de um arquivo, igual à que o motor pede (mesmo ?v=) E em forma
 * ABSOLUTA — é assim que o Cache Storage guarda as chaves, então é assim que a
 * comparação de progresso encontra o que já foi baixado. (Comparar caminho
 * relativo com chave absoluta foi o bug do primeiro status "não baixado".)
 */
export const urlDoArquivo = (base, rel, versao) =>
  new URL(base + rel + "?v=" + versao, document.baseURI).href;
/** Nome do cache usado pelo Service Worker e pelas páginas. */
export const nomeCache = (lista) => "fumiga-" + (lista.version || "dev");

/** Lê a lista de grupos/tamanhos. */
export async function carregarLista(base = "") {
  const res = await fetch(listaUrl(base), { cache: "no-store" });
  if (!res.ok) throw new Error("app/assets.json não encontrado (" + res.status + ")");
  return res.json();
}

/**
 * Expande um alvo ("essencial" | "completo" | ["shell", ...]) na lista de
 * arquivos, cada um com caminho relativo à raiz e tamanho.
 */
export function arquivosDoPacote(lista, alvo = "essencial") {
  const alvos = alvo === "completo" ? ["shell", "essencial", "completo"]
    : alvo === "essencial" ? ["shell", "essencial"]
      : Array.isArray(alvo) ? alvo : ["shell"];
  const out = [];
  for (const g of lista.grupos || []) {
    if (!alvos.includes(g.id)) continue;
    for (const f of g.files) out.push({ rel: f, bytes: bytesDe(lista, f) });
  }
  return out;
}

/** Tamanho individual, com o índice montado uma vez por lista. */
const indiceBytes = new WeakMap();
function bytesDe(lista, rel) {
  let mapa = indiceBytes.get(lista);
  if (!mapa) {
    mapa = new Map();
    for (const g of lista.grupos || []) {
      for (const [i, f] of (g.files || []).entries()) mapa.set(f, (g.tamanhos && g.tamanhos[i]) || 0);
    }
    indiceBytes.set(lista, mapa);
  }
  return mapa.get(rel) || 0;
}

/** Tamanho do pacote sem baixar nada: { arquivos, bytes }. */
export function tamanhoDoPacote(lista, alvo) {
  const gs = (lista.grupos || []).filter((g) => alvo === "completo" ? true : g.id !== "completo");
  return {
    arquivos: gs.reduce((s, g) => s + g.files.length, 0),
    bytes: gs.reduce((s, g) => s + g.bytes, 0),
  };
}

// ---------------------------------------------------------------- ambiente ---
export const suportaSW = () => "serviceWorker" in navigator;
export const suportaCache = () => typeof caches !== "undefined";

/** Instalado e rodando como app? (Android/desktop pelo display-mode; iOS pelo legado) */
export function modoStandalone() {
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch (e) { /* ok */ }
  return navigator.standalone === true;
}

/** iOS/iPadOS: não existe beforeinstallprompt — só Compartilhar → Adicionar. */
export function ehIOS() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1; // iPad se passando de Mac
}

/** Chrome/Edge (desktop e Android): únicos com convite nativo de instalação. */
export function ehChromium() {
  const ua = navigator.userAgent || "";
  return /Chrome|Chromium|Edg\//.test(ua) && !/OPR\//.test(ua);
}

/** Aparelho de toque: decide se o JOGAR leva para a versão mobile. */
export function ehToque() {
  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  } catch (e) { /* ok */ }
  return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
}

// -------------------------------------------------------- service worker -----
/** Registra o Service Worker da raiz. Devolve a registration ou null. */
export async function registrarSW(base = "") {
  if (!suportaSW()) return null;
  try {
    return await navigator.serviceWorker.register(base + "sw.js", {
      scope: base || "./",
      updateViaCache: "none",     // o GitHub Pages serve sw.js com cache curto: aqui não
    });
  } catch (e) {
    console.warn("Service Worker não registrou:", e);
    return null;
  }
}

/** Espera o Service Worker assumir o controle (skipWaiting/clientsClaim). */
export function aguardarControlador(ms = 8000) {
  if (!suportaSW()) return Promise.resolve(false);
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(!!navigator.serviceWorker.controller), ms);
    navigator.serviceWorker.addEventListener("controllerchange", () => { clearTimeout(t); resolve(true); }, { once: true });
  });
}

/** Manda uma mensagem e espera a resposta final, repassando o progresso. */
export function mensagemSW(msg, { aoProgresso, timeout = 15 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!suportaSW()) { reject(new Error("sem Service Worker")); return; }
    let terminado = false;
    const fim = (m, erro) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(relogio);
      navigator.serviceWorker.removeEventListener("message", ouve);
      erro ? reject(erro) : resolve(m);
    };
    const ouve = (e) => {
      const m = e.data || {};
      if (m.type === "progresso") { if (aoProgresso) aoProgresso(m); return; }
      if (m.type === "fim" || m.type === "limpo" || m.type === "versao") fim(m);
    };
    const relogio = setTimeout(() => fim(null), timeout);
    navigator.serviceWorker.addEventListener("message", ouve);
    navigator.serviceWorker.ready
      .then((reg) => {
        const alvo = reg.active || navigator.serviceWorker.controller;
        if (!alvo) throw new Error("Service Worker inativo");
        alvo.postMessage(msg);
      })
      .catch((e) => fim(null, e));
  });
}

// -------------------------------------------------------------- download -----
/**
 * Baixa um pacote para o cache.
 * Usa o Service Worker (continua mesmo se a aba sair da frente); sem ele,
 * baixa na própria página. `aoProgresso({feitos, total, falhas})` anima a barra.
 */
export async function baixarPacote({ base = "", lista, alvo = "essencial", aoProgresso } = {}) {
  const arquivos = arquivosDoPacote(lista, alvo);
  const urls = arquivos.map((a) => urlDoArquivo(base, a.rel, lista.version));
  const total = urls.length;

  // Sem Service Worker (ou navegador antigo): baixa aqui mesmo, com fila.
  const controlador = suportaSW() && navigator.serviceWorker.controller;
  if (!controlador) {
    if (!suportaCache()) throw new Error("Este navegador não guarda arquivos para jogar offline.");
    let feitos = 0, falhas = 0;
    const cache = await caches.open(nomeCache(lista));
    await comFila(urls, 6, async (url) => {
      let ok = !!(await cache.match(url, { ignoreSearch: true }));
      for (let t = 0; !ok && t < 2; t++) {
        try { const r = await fetch(url); if (r.ok) { await cache.put(url, r); ok = true; } } catch (e) { /* tenta de novo */ }
      }
      ok ? feitos++ : falhas++;
      if (aoProgresso) aoProgresso({ feitos, falhas, total });
    });
    return { feitos, falhas, total };
  }

  const res = await mensagemSW(
    { type: "baixar", urls, alvos: alvo, versao: lista.version },
    { aoProgresso: (m) => aoProgresso && aoProgresso({ feitos: m.feitos, falhas: m.falhas, total: m.total || total, segundos: m.segundos }) },
  );
  return res || { feitos: total, falhas: 0, total };
}

/** O que já está guardado neste pacote: {feitos, total, bytes, bytesTotal, completo}. */
export async function progressoPacote({ base = "", lista, alvo = "essencial" } = {}) {
  const arquivos = arquivosDoPacote(lista, alvo);
  const total = arquivos.length;
  const bytesTotal = arquivos.reduce((s, a) => s + a.bytes, 0);
  if (!suportaCache()) return { feitos: 0, total, bytes: 0, bytesTotal, completo: false };
  try {
    const cache = await caches.open(nomeCache(lista));
    // Pergunta ao CACHE se ele serviria esta URL (ignoreSearch), em vez de
    // comparar chaves cruas: o shell é guardado pelo Service Worker sem o ?v=
    // da versão, e qualquer diferença de forma da chave (relativa x absoluta,
    // com ou sem query) marcaria como "faltando" o que já está guardado.
    // Em LOTES PARALELOS: 208 perguntas em série levavam segundos e deixavam
    // "verificando..." na tela; em lotes de 32 é quase instantâneo.
    let feitos = 0, bytes = 0;
    const urls = arquivos.map((a) => urlDoArquivo(base, a.rel, lista.version));
    for (let i = 0; i < arquivos.length; i += 32) {
      const lote = arquivos.slice(i, i + 32);
      const achados = await Promise.all(lote.map((_, k) =>
        cache.match(urls[i + k], { ignoreSearch: true })));
      for (const [k, achado] of achados.entries()) {
        if (achado) { feitos++; bytes += lote[k].bytes; }
      }
    }
    return { feitos, total, bytes, bytesTotal, completo: feitos >= total && total > 0 };
  } catch (e) {
    return { feitos: 0, total, bytes: 0, bytesTotal, completo: false };
  }
}

/** Libera o espaço: apaga os caches do app. */
export async function limparCache(lista) {
  if (!suportaCache()) return 0;
  if (suportaSW() && navigator.serviceWorker.controller) {
    const r = await mensagemSW({ type: "limpar" });
    return (r && r.apagados) || 0;
  }
  let n = 0;
  for (const nome of await caches.keys()) {
    if (nome.startsWith("fumiga-") && await caches.delete(nome)) n++;
  }
  return n;
}

/** Pede armazenamento persistente: o navegador não apaga cache/save por falta de espaço. */
export async function pedirPersistencia() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) { /* ok */ }
  return false;
}

/** Uso e cota do armazenamento do site: {uso, cota}. */
export async function usarArmazenamento() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return { uso: e.usage || 0, cota: e.quota || 0 };
    }
  } catch (e) { /* ok */ }
  return null;
}

// ------------------------------------------------------------------ util -----
export const formatarMB = (bytes) => (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + " MB";

/** Fila com concorrência limitada (mesma ideia da fila do Service Worker). */
async function comFila(itens, conexoes, tarefa) {
  let i = 0;
  const n = Math.max(1, Math.min(conexoes, itens.length));
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < itens.length) {
      const item = itens[i++];
      try { await tarefa(item); } catch (e) { /* a tarefa trata o erro */ }
    }
  }));
}
