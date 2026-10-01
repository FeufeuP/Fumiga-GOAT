// ============================================================================
// FUMIGA — DIÁRIO DE PLAYTEST (local, sem servidor e sem PII)
//
// Para o teste de campo com aparelho real: registra expedições, poderes
// comprados, mortes, erros e o comportamento do app instalável (download do
// pacote e boot offline). As ideias vieram de:
//
//   • "The First 10 Telemetry Events Every Indie Game Should Ship" — sessão,
//     início/fim de fase e economia (ganho/gasto) como base do relatório;
//   • "What a few days of playtest telemetry found that my own testing never
//     did" — flag de teste, log pequeno em localStorage, NADA enviado
//     automaticamente e um script que transforma o log em lista de problemas;
//   • PRs open-source de telemetria local (JSONL + relatório offline) — o
//     arquivo exportado é a única coisa que sai do aparelho, e só quando o
//     tester manda.
//
// REGRAS DO MÓDULO:
//   1. Sem PII: nada de nome, e-mail, IP (não há upload), localização ou UA
//      crua — só plataforma/navegador derivados e o tamanho da tela.
//   2. Sem custo por frame: só eventos discretos; o resumo usa contadores e o
//      tamanho medido na última gravação (não serializa o diário a cada frame).
//   3. À prova de quota: se o localStorage encher, corta metade dos eventos
//      antigos e tenta de novo; nunca derruba o jogo por causa do diário.
//   4. À prova de Node/teste: nenhuma API de navegador no topo do módulo.
// ============================================================================

export const CHAVE_PLAYTEST = "fumiga_playtest_v1";
export const LIMITE_EVENTOS = 4000;      // ~400 KB no pior caso
const MAX_DADOS = 240;                   // itens por evento (ex.: lista de poderes)
let cache = null;
let instalado = false;

const agora = () => Date.now();

function idAleatorio() {
  // ID do APARELHO (não da pessoa): aleatório e local, só para separar os
  // arquivos recebidos de cada tester no relatório.
  let s = "";
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const b = new Uint8Array(6); crypto.getRandomValues(b);
      s = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) { /* segue para o fallback */ }
  if (!s) s = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  return "pt-" + s;
}

function novo() {
  return {
    v: 1,
    ativo: true,
    id: idAleatorio(),
    criadoEm: new Date().toISOString(),
    tot: { sessoes: 0, expedicoes: 0, vitorias: 0, derrotas: 0, compras: 0, pacotes: 0, pacotesFalhos: 0, erros: 0, offline: 0, mapas: 0 },
    eventos: [],
  };
}

const podeGuardar = () => {
  try { return typeof localStorage !== "undefined" && !!localStorage; } catch (e) { return false; }
};

function sanear(bruto) {
  const est = novo();
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return est;
  est.v = 1;
  est.ativo = bruto.ativo !== false;
  if (typeof bruto.id === "string" && /^pt-[a-z0-9]{8,20}$/.test(bruto.id)) est.id = bruto.id;
  if (typeof bruto.criadoEm === "string" && bruto.criadoEm.length <= 30) est.criadoEm = bruto.criadoEm;
  if (bruto.tot && typeof bruto.tot === "object") {
    for (const k of Object.keys(est.tot)) {
      const n = bruto.tot[k];
      est.tot[k] = Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 1e9) : 0;
    }
  }
  if (Array.isArray(bruto.eventos)) {
    est.eventos = bruto.eventos.filter(e => e && typeof e === "object" && typeof e.e === "string" && Number.isFinite(e.t)).slice(-LIMITE_EVENTOS);
  }
  if (bruto.ultima && typeof bruto.ultima === "object") est.ultima = bruto.ultima;
  if (bruto.aparelho && typeof bruto.aparelho === "object") est.aparelho = bruto.aparelho;
  est._bytes = Number.isFinite(bruto._bytes) ? bruto._bytes : 0;
  return est;
}

function carregar() {
  if (cache) return cache;
  let bruto = null;
  if (podeGuardar()) {
    try { const raw = localStorage.getItem(CHAVE_PLAYTEST); if (raw) bruto = JSON.parse(raw); } catch (e) { bruto = null; }
  }
  cache = sanear(bruto);
  return cache;
}

function escrever() {
  if (!podeGuardar()) return false;
  const tentar = () => {
    const texto = JSON.stringify(cache);
    localStorage.setItem(CHAVE_PLAYTEST, texto);
    cache._bytes = texto.length;
  };
  try { tentar(); return true; } catch (e) {
    // Quota cheia: corta metade do histórico (o começo da expedição menos
    // recente) e tenta uma única vez. O jogo nunca quebra por causa do diário.
    try {
      cache.eventos = cache.eventos.slice(-Math.floor(LIMITE_EVENTOS / 2));
      tentar(); return true;
    } catch (e2) { return false; }
  }
}

/** Cabem no JSON? Datas, Sets e funções não entram: o evento é descartado. */
function serializavel(dados) {
  try { JSON.stringify(dados); return true; } catch (e) { return false; }
}

function contar(tipo, dados) {
  const tot = cache.tot;
  if (tipo === "sessao") tot.sessoes++;
  else if (tipo === "expedicao_inicio") tot.expedicoes++;
  else if (tipo === "expedicao_fim") {
    if (dados && dados.venceu) tot.vitorias++; else tot.derrotas++;
    // Retrato curto da última expedição: a aba TESTE mostra sem varrer eventos.
    cache.ultima = { venceu: !!(dados && dados.venceu), modo: String((dados && dados.modo) || "?"), mapa: Math.max(0, Math.min(5, Number(dados && dados.mapa) || 0)), onda: Number(dados && dados.onda) || 0, quando: agora() };
  }
  else if (tipo === "poder_comprado") tot.compras++;
  else if (tipo === "mapa_limpo") tot.mapas++;
  else if (tipo === "pwa_pacote") { tot.pacotes++; if (dados && dados.ok === false) tot.pacotesFalhos++; }
  else if (tipo === "erro" || tipo === "loader_erro") tot.erros++;
  else if (tipo === "pwa_offline") tot.offline++;
}

/** Registra um evento. Sempre silencioso: o jogo NUNCA depende do diário. */
export function ptEvento(tipo, dados = null) {
  try {
    const est = carregar();
    if (!est.ativo) return false;
    if (dados && !serializavel(dados)) dados = { erro: "dados não serializáveis" };
    est.eventos.push({ t: agora(), e: String(tipo), ...(dados ? { d: dados } : {}) });
    if (est.eventos.length > LIMITE_EVENTOS) est.eventos.splice(0, est.eventos.length - LIMITE_EVENTOS);
    contar(tipo, dados);
    return escrever();
  } catch (e) { return false; }
}

/** Liga/desliga o diário sem apagar o que já foi registrado. */
export function ptLigar(ligado) {
  const est = carregar();
  est.ativo = ligado !== false;
  escrever();
  return est.ativo;
}
export function ptAtivo() { return carregar().ativo; }

/** Limpa o diário deste aparelho (o "apagar" das opções). */
export function ptApagar() {
  cache = novo();
  try { if (podeGuardar()) localStorage.removeItem(CHAVE_PLAYTEST); } catch (e) { /* ok */ }
  return true;
}

// ------------------------------------------------------------- ambiente ------
// UA crua NÃO entra: só derivados grosseiros, para o relatório separar
// plataformas. Nada disso identifica uma pessoa.
function ambiente() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const ua = String(nav.userAgent || "");
  const so = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios"
    : /Windows/i.test(ua) ? "windows" : /Macintosh|Mac OS X/i.test(ua) ? "macos"
      : /Linux/i.test(ua) ? "linux" : "outro";
  const navegador = /Edg\//.test(ua) ? "edge" : /OPR\//.test(ua) ? "opera" : /Firefox\//.test(ua) ? "firefox"
    : /CriOS\//.test(ua) ? "chrome-ios" : /Chrome\//.test(ua) ? "chrome" : /Safari\//.test(ua) ? "safari" : "outro";
  let instalado = false;
  try {
    instalado = !!(globalThis.matchMedia && globalThis.matchMedia("(display-mode: standalone)").matches) || nav.standalone === true;
  } catch (e) { /* ok */ }
  let toque = false;
  try { toque = (nav.maxTouchPoints || 0) > 0 || "ontouchstart" in globalThis; } catch (e) { /* ok */ }
  return {
    so, navegador, instalado, toque,
    controlador: !!(nav.serviceWorker && nav.serviceWorker.controller),
    online: nav.onLine !== false,
    tela: (typeof innerWidth === "number" ? innerWidth : 0) + "x" + (typeof innerHeight === "number" ? innerHeight : 0),
    idioma: String(nav.language || "").slice(0, 8),
  };
}

/**
 * Marca a sessão (chamada no boot do jogo e nas páginas do app). O primeiro
 * boot guarda o retrato do aparelho; os campos que faltarem são completados
 * nas sessões seguintes (ex.: o app abre antes do jogo).
 */
export function ptSessao(info = {}) {
  try {
    const est = carregar();
    const env = ambiente();
    est.aparelho = Object.assign({}, est.aparelho || {});
    for (const [k, v] of Object.entries(env)) if (est.aparelho[k] === undefined) est.aparelho[k] = v;
    if (info.v) est.aparelho.v = info.v;
    const dados = {
      fonte: String(info.fonte || "jogo").slice(0, 12),
      plataforma: info.plataforma || (info.mobile || env.toque ? "mobile" : "pc"),
      online: env.online, instalado: env.instalado, controlador: env.controlador,
      tela: env.tela, so: env.so, navegador: env.navegador, idioma: env.idioma,
    };
    if (info.v) dados.v = String(info.v).slice(0, 40);
    ptEvento("sessao", dados);
    // A evidência do A1: o jogo subiu com a rede desligada (pacote do cache).
    if (!env.online) ptEvento("pwa_offline", { controlador: env.controlador, instalado: env.instalado, fonte: dados.fonte });
    return true;
  } catch (e) { return false; }
}

/** Instala as redes de erro (idempotente; sem efeito fora do navegador). */
export function ptInstalar() {
  if (instalado || typeof globalThis.addEventListener !== "function") return false;
  instalado = true;
  try {
    globalThis.addEventListener("error", (ev) => {
      if (!ev) return;
      const msg = String((ev.error && ev.error.message) || ev.message || "").slice(0, 160);
      if (!msg) return; // erro de recurso (imagem) sem mensagem: não polui o diário
      ptEvento("erro", { origem: "js", msg, tela: telaAtual() });
    });
    globalThis.addEventListener("unhandledrejection", (ev) => {
      const r = ev && ev.reason;
      const msg = String((r && r.message) || r || "").slice(0, 160);
      if (msg) ptEvento("erro", { origem: "promessa", msg, tela: telaAtual() });
    });
  } catch (e) { /* sem window: nada a instalar */ }
  return true;
}

function telaAtual() {
  try { return String(globalThis.FUMIGA?.G?.screen || "").slice(0, 16); } catch (e) { return ""; }
}

/** Lista compacta de poderes comprados: [[id, nivel], ...]. */
export function ptPoderes(nodes) {
  const out = [];
  if (nodes && typeof nodes === "object") {
    for (const [id, nivel] of Object.entries(nodes)) {
      const n = Number(nivel);
      if (Number.isInteger(n) && n > 0) out.push([String(id).slice(0, 24), Math.min(n, 99)]);
      if (out.length >= MAX_DADOS) break;
    }
  }
  return out;
}

// --------------------------------------------------------------- export ------
export function ptResumo() {
  const est = carregar();
  return {
    id: est.id, ativo: est.ativo, criadoEm: est.criadoEm,
    eventos: est.eventos.length, bytes: est._bytes || 0,
    tot: { ...est.tot }, ultima: est.ultima || null, aparelho: est.aparelho || null,
  };
}

export function ptDados() {
  const est = carregar();
  return {
    formato: "fumiga-playtest",
    versao: 1,
    aparelho: est.aparelho || null,
    resumo: { id: est.id, criadoEm: est.criadoEm, tot: { ...est.tot }, eventos: est.eventos.length },
    exportadoEm: new Date().toISOString(),
    eventos: est.eventos.map(e => (e.d ? { t: e.t, e: e.e, d: e.d } : { t: e.t, e: e.e })),
  };
}

function nomeArquivo(est) {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return "fumiga-playtest-" + est.id + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate())
    + "-" + p(d.getHours()) + p(d.getMinutes()) + ".json";
}

/**
 * Entrega o arquivo ao tester, na melhor via do aparelho:
 * compartilhar (share sheet nativa) → baixar → copiar. Nada é enviado a
 * servidor nenhum: quem decide o destino é quem toca no botão.
 */
export async function ptEntregar() {
  const est = carregar();
  const nome = nomeArquivo(est);
  let texto = "";
  try { texto = JSON.stringify(ptDados()); } catch (e) { return { ok: false, via: "falha", erro: "DIÁRIO INVÁLIDO", nome }; }
  const bytes = texto.length;

  // 1) Compartilhar. Precisa acontecer ainda no gesto do toque (sem await
  //    antes), senão o iOS/Android recusam a folha de compartilhamento.
  try {
    if (typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.canShare && navigator.share) {
      const arquivo = new File([texto], nome, { type: "application/json" });
      if (navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "FUMIGA — dados do playtest" });
        return { ok: true, via: "compartilhado", nome, bytes };
      }
    }
  } catch (e) {
    if (e && e.name === "AbortError") return { ok: false, via: "cancelado", erro: "CANCELADO", nome, bytes };
    // segue para o download
  }

  // 2) Baixar o arquivo.
  try {
    if (typeof document !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
      const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = nome; a.rel = "noopener";
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* ok */ } }, 4000);
      return { ok: true, via: "baixado", nome, bytes };
    }
  } catch (e) { /* segue para a área de transferência */ }

  // 3) Copiar o JSON (último recurso no desktop).
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return { ok: true, via: "copiado", nome, bytes };
    }
  } catch (e) { /* ok */ }

  return { ok: false, via: "falha", erro: "NÃO FOI POSSÍVEL EXPORTAR", nome, bytes };
}
