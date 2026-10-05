// Diário de playtest (game/js/playtest.js) + relatório (tools/playtest.mjs):
// gravação local, teto de eventos, PII zero, ligar/apagar, redes de erro,
// sessão offline (A1) e agregação do arquivo exportado.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------- ambiente falso ---
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const ouvintes = {};
globalThis.addEventListener = (tipo, fn) => { (ouvintes[tipo] ||= []).push(fn); };
const nav = {
  userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
  language: "pt-BR", onLine: true, maxTouchPoints: 5, serviceWorker: { controller: {} },
};
Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
globalThis.innerWidth = 844; globalThis.innerHeight = 390;
globalThis.matchMedia = () => ({ matches: true });

const P = await import("../js/playtest.js");
const { resumir, relatorioTexto, lerDocumento } = await import("../../tools/playtest.mjs");

// ------------------------------------------------------------ sessão base ----
assert.equal(P.ptAtivo(), true, "diário nasce ligado (grava por padrão)");
P.ptInstalar();
P.ptSessao({ fonte: "jogo", v: "teste-1", mobile: true });
let r = P.ptResumo();
assert.equal(r.tot.sessoes, 1);
assert.equal(r.aparelho.so, "android");
assert.equal(r.aparelho.instalado, true, "display-mode standalone detectado");
assert.equal(r.eventos, 1);
assert.ok(r.bytes > 0, "tamanho fica medido sem re-serializar por frame");

// A1: boot com a rede desligada entra como evidência própria.
nav.onLine = false;
P.ptSessao({ fonte: "app", plataforma: "mobile" });
r = P.ptResumo();
assert.equal(r.tot.offline, 1, "pwa_offline registrado");
nav.onLine = true;

// ---------------------------------------------------------- expedição ---------
P.ptEvento("expedicao_inicio", { modo: "campanha", mapa: 1, poderes: [["v_p6", 2]] });
P.ptEvento("mapa_limpo", { mapa: 0, t: 240, onda: 4 });
P.ptEvento("poder_comprado", { id: "v_p6", nivel: 2, custo: 60, essencia: 120 });
P.ptEvento("expedicao_fim", { venceu: false, modo: "campanha", mapa: 1, onda: 6, abates: 50, t: 600, mortes: 9 });
P.ptEvento("recompensa", { total: 420 });
r = P.ptResumo();
assert.deepEqual({ e: r.tot.expedicoes, v: r.tot.vitorias, d: r.tot.derrotas, m: r.tot.mapas, c: r.tot.compras }, { e: 1, v: 0, d: 1, m: 1, c: 1 });
assert.equal(r.ultima.venceu, false);

// Não serializável não derruba nem polui (fica marcado como tal).
P.ptEvento("teste", (() => { const o = {}; o.self = o; return o; })());
const dados = P.ptDados();
assert.equal(dados.formato, "fumiga-playtest");
assert.equal(dados.eventos.at(-1).d.erro, "dados não serializáveis");

// Ligar/desligar e apagar.
P.ptLigar(false);
assert.equal(P.ptEvento("sessao", {}), false);
assert.equal(P.ptResumo().eventos, dados.eventos.length, "desligado não grava");
P.ptLigar(true);
assert.equal(P.ptAtivo(), true);

// Redes de erro instaladas uma vez.
assert.ok(ouvintes.error?.length, "window.onerror capturado");
ouvintes.error[0]({ error: { message: "quebrou na horta" } });
assert.equal(P.ptResumo().tot.erros, 1);
assert.equal(ouvintes.error.length, 1, "ptInstalar é idempotente");

// Exportar em ambiente sem DOM: nunca lança, só reporta a falha.
const entrega = await P.ptEntregar();
assert.equal(typeof entrega.ok, "boolean");
assert.ok(entrega.nome.endsWith(".json"));

// ------------------------------------------------------------- teto -----------
// Instância nova (query diferente) com um diário já grande: o saneamento corta
// para o teto e mantém os eventos MAIS NOVOS.
const muitos = { v: 1, ativo: true, id: "pt-abcdef012345", criadoEm: new Date().toISOString(), tot: {}, eventos: Array.from({ length: P.LIMITE_EVENTOS + 25 }, (_, i) => ({ t: i + 1, e: "x" })) };
store.set(P.CHAVE_PLAYTEST, JSON.stringify(muitos));
const P2 = await import("../js/playtest.js?teto=1");
assert.equal(P2.ptResumo().eventos, P.LIMITE_EVENTOS, "teto de eventos aplicado no carregamento");
assert.equal(P2.ptDados().eventos[0].t, 26, "corta os mais antigos, preserva os novos");

// ------------------------------------------------ apagar (botão das opções) ---
P.ptApagar();
assert.equal(store.has(P.CHAVE_PLAYTEST), false, "apagar remove a chave");
assert.equal(P.ptResumo().eventos, 0);
assert.equal(P.ptResumo().tot.sessoes, 0);

// ------------------------------------------------------- relatório ------------
const exp = (id, eventos) => ({ formato: "fumiga-playtest", versao: 1, resumo: { id }, aparelho: { so: "android", navegador: "chrome", instalado: true, tela: "844x390", v: "teste-1" }, eventos });
const docA = exp("pt-aaaaaaaaaaaa", [
  { t: 1, e: "sessao", d: { online: false } },
  { t: 2, e: "expedicao_inicio", d: { modo: "campanha", mapa: 0, poderes: [["v_p6", 2]] } },
  { t: 3, e: "mapa_limpo", d: { mapa: 0, t: 200, teste: false } },
  { t: 4, e: "expedicao_fim", d: { venceu: false, modo: "campanha", mapa: 2, onda: 5, abates: 40, t: 300, mortes: 12 } },
  { t: 5, e: "poder_comprado", d: { id: "v_p6", nivel: 2, custo: 60 } },
  { t: 6, e: "pwa_pacote", d: { ok: false, ms: 4000, erro: "rede" } },
  { t: 7, e: "pwa_offline", d: {} },
  { t: 8, e: "erro", d: { msg: "TypeError: x", origem: "js" } },
  { t: 9, e: "recompensa", d: { total: 300 } },
]);
const docB = exp("pt-bbbbbbbbbbbb", [
  { t: 10, e: "sessao", d: { online: true } },
  { t: 11, e: "expedicao_inicio", d: { modo: "campanha", mapa: 0, poderes: [["v_p6", 1]] } },
  { t: 12, e: "expedicao_fim", d: { venceu: true, modo: "campanha", mapa: 5, onda: 9, abates: 200, t: 900, mortes: 3 } },
  { t: 13, e: "loader_erro", d: { msg: "imagem 404" } },
  { t: 14, e: "expedicao_inicio", d: { modo: "campanha", mapa: 0, poderes: [["v_p6", 1]] } },
  { t: 15, e: "expedicao_fim", d: { venceu: false, modo: "campanha", mapa: 2, onda: 6, abates: 55, t: 400, mortes: 10 } },
]);
assert.equal(lerDocumento(docA).formato, "fumiga-playtest");
assert.equal(lerDocumento({ oi: true }), null);
const rr = resumir([docA, docB]);
assert.equal(rr.arquivos, 2);
assert.equal(rr.sessoes, 2);
assert.equal(rr.expedicoes, 3);
assert.equal(rr.vitorias, 1);
assert.equal(rr.taxaVitoria, 33);
assert.equal(rr.porMapaFim[2].fim, 2);
assert.equal(rr.porMapaFim[2].vitorias, 0);
assert.equal(rr.mapasLimpios[0], 1);
assert.equal(rr.compras.v_p6.n2, 1);
assert.equal(rr.runsComPoder.v_p6, 3);
assert.equal(rr.vitoriasComPoder.v_p6, 1);
assert.equal(rr.pwa.falhas, 1);
assert.equal(rr.pwa.offline, 1);
assert.equal(rr.erros["TypeError: x"], 1);
assert.equal(rr.loaderErros["imagem 404"], 1);
assert.equal(rr.recompensaMedia, 300);
assert.ok(rr.alertas.some((a) => a.includes("MAPA 3")), "mapa sem vitória vira alerta: " + rr.alertas.join(" / "));
assert.ok(!rr.alertas.some((a) => a.includes("NÍVEL 2/3")), "houve compra n2/n3: sem alerta de nível");
const texto = relatorioTexto(rr);
assert.ok(texto.includes("RELATÓRIO DO PLAYTEST") && texto.includes("v_p6"), "relatório em texto legível");

// O CLI lê pasta e escreve o resumo.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fumiga-playtest-"));
fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify(docA));
fs.writeFileSync(path.join(dir, "lixo.json"), "{nada}");
const { execFileSync } = await import("node:child_process");
const ferramenta = fileURLToPath(new URL("../../tools/playtest.mjs", import.meta.url));
const saida = execFileSync(process.execPath, [ferramenta, dir, "--json=" + path.join(dir, "resumo.json")], { encoding: "utf8" });
assert.ok(saida.includes("SESSÕES: 1") || saida.includes("SESSÕES: 2"), "CLI imprime o relatório");
assert.ok(fs.existsSync(path.join(dir, "resumo.json")), "CLI grava o --json");

console.log("ok playtest: gravação local, teto, apagar, sessão offline, erros e relatório/CLI");
