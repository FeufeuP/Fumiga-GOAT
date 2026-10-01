// ============================================================================
// FUMIGA — relatório do playtest de campo
//
// Lê os arquivos exportados no jogo (OPÇÕES → aba TESTE → EXPORTAR DADOS) e
// transforma o diário em decisões de balanceamento:
//
//   • funil por modo e mapa (onde as expedições terminam, onde travam);
//   • adoção e efeito dos poderes (possuídos no início × desfecho do run);
//   • economia (essência ganha por expedição);
//   • falhas de campo: erros de JS, falha de carregamento e download do pacote;
//   • evidência do A1: boots com a rede desligada.
//
// Uso:
//   node tools/playtest.mjs playtest/*.json
//   node tools/playtest.mjs ~/Downloads           (lê a pasta toda)
//   node tools/playtest.mjs arquivos... --json=resumo.json
//
// Nada é enviado a servidor nenhum: o script só lê arquivos locais.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const media = (soma, n) => (n > 0 ? soma / n : 0);
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Aceita um documento exportado (formato fumiga-playtest) ou avisa e ignora. */
export function lerDocumento(bruto) {
  if (!bruto || typeof bruto !== "object" || bruto.formato !== "fumiga-playtest" || !Array.isArray(bruto.eventos)) return null;
  return bruto;
}

export function resumir(documentos) {
  const r = {
    arquivos: 0, ignorados: 0,
    aparelhos: [], sessoes: 0, eventos: 0,
    expedicoes: 0, vitorias: 0, derrotas: 0, abandonadas: 0,
    tempoTotal: 0, abates: 0, ondas: 0, mortes: 0,
    porModo: {}, porMapaFim: {}, mapasLimpios: {}, mortesPorMapa: {},
    compras: {}, runsComPoder: {}, vitoriasComPoder: {}, vitoriasSemPoder: {}, runsSemPoder: {},
    pwa: { pacotes: 0, ok: 0, falhas: 0, ms: 0, offline: 0, instalado: 0, controlador: 0 },
    erros: {}, loaderErros: {}, recompensas: 0, recompensaTotal: 0,
    primeiro: null, ultimo: null,
  };
  const modo = (m) => (r.porModo[m] ||= { runs: 0, vitorias: 0, tempo: 0, abates: 0 });
  const poderesDoRun = (lista) => new Set((Array.isArray(lista) ? lista : []).map(par => (Array.isArray(par) ? par[0] : par)).filter(Boolean));

  for (const doc of documentos) {
    r.arquivos++;
    const ap = doc.aparelho && typeof doc.aparelho === "object" ? doc.aparelho : {};
    r.aparelhos.push({
      id: doc.resumo?.id || "?",
      so: ap.so || "?", navegador: ap.navegador || "?", instalado: !!ap.instalado,
      tela: ap.tela || "?", v: ap.v || "?",
      eventos: doc.eventos.length,
    });
    if (ap.instalado) r.pwa.instalado++;
    if (ap.controlador) r.pwa.controlador++;
    let atual = null; // run em andamento neste aparelho (um por vez)

    for (const ev of doc.eventos) {
      if (!ev || typeof ev.e !== "string") continue;
      r.eventos++;
      const d = ev.d && typeof ev.d === "object" ? ev.d : {};
      if (!r.primeiro || ev.t < r.primeiro) r.primeiro = ev.t;
      if (!r.ultimo || ev.t > r.ultimo) r.ultimo = ev.t;

      if (ev.e === "sessao") {
        r.sessoes++;
      } else if (ev.e === "expedicao_inicio") {
        atual = { modo: d.modo || "?", poderes: poderesDoRun(d.poderes), tornou: false, teste: !!d.teste };
      } else if (ev.e === "expedicao_fim") {
        const venceu = !!d.venceu;
        r.expedicoes++;
        if (venceu) r.vitorias++; else r.derrotas++;
        r.tempoTotal += num(d.t);
        r.abates += num(d.abates);
        r.ondas += num(d.onda);
        r.mortes += num(d.mortes);
        const m = modo(d.modo || atual?.modo || "?");
        m.runs++; if (venceu) m.vitorias++; m.tempo += num(d.t); m.abates += num(d.abates);
        const fim = num(d.mapa);
        const fm = (r.porMapaFim[fim] ||= { fim: 0, vitorias: 0 });
        fm.fim++; if (venceu) fm.vitorias++;
        if (!venceu) r.mortesPorMapa[fim] = (r.mortesPorMapa[fim] || 0) + 1;
        // Correlação poder × desfecho (os poderes vêm do início do run).
        if (atual && !atual.teste) {
          for (const id of atual.poderes) {
            r.runsComPoder[id] = (r.runsComPoder[id] || 0) + 1;
            if (venceu) r.vitoriasComPoder[id] = (r.vitoriasComPoder[id] || 0) + 1;
          }
        }
        atual = null;
      } else if (ev.e === "mapa_limpo") {
        if (!d.teste) r.mapasLimpios[num(d.mapa)] = (r.mapasLimpios[num(d.mapa)] || 0) + 1;
      } else if (ev.e === "poder_comprado") {
        const id = String(d.id || "?");
        const c = (r.compras[id] ||= { total: 0, n1: 0, n2: 0, n3: 0, custo: 0 });
        c.total++;
        const n = num(d.nivel, 1);
        if (n <= 1) c.n1++; else if (n === 2) c.n2++; else c.n3++;
        c.custo += num(d.custo);
      } else if (ev.e === "pwa_pacote") {
        r.pwa.pacotes++;
        if (d.ok === false) r.pwa.falhas++; else r.pwa.ok++;
        r.pwa.ms += num(d.ms);
      } else if (ev.e === "pwa_offline") {
        r.pwa.offline++;
      } else if (ev.e === "erro") {
        const msg = String(d.msg || "erro sem mensagem").slice(0, 100);
        r.erros[msg] = (r.erros[msg] || 0) + 1;
      } else if (ev.e === "loader_erro") {
        const msg = String(d.msg || "falha sem mensagem").slice(0, 100);
        r.loaderErros[msg] = (r.loaderErros[msg] || 0) + 1;
      } else if (ev.e === "recompensa") {
        r.recompensas++; r.recompensaTotal += num(d.total);
      }
    }
    if (atual) r.abandonadas++;
  }
  r.taxaVitoria = pct(r.vitorias, r.expedicoes);
  r.tempoMedio = media(r.tempoTotal, r.expedicoes);
  r.abatesMedio = media(r.abates, r.expedicoes);
  r.ondaMedia = media(r.ondas, r.expedicoes);
  r.mortesMedia = media(r.mortes, r.expedicoes);
  r.recompensaMedia = media(r.recompensaTotal, r.recompensas);
  r.pwa.msMedia = media(r.pwa.ms, r.pwa.pacotes);
  r.alertas = alertas(r);
  return r;
}

function alertas(r) {
  const out = [];
  if (!r.arquivos) out.push("NENHUM ARQUIVO VÁLIDO — exporte em OPÇÕES → TESTE.");
  if (r.expedicoes === 0) out.push("NENHUMA EXPEDIÇÃO REGISTRADA AINDA.");
  for (const [mapa, f] of Object.entries(r.porMapaFim)) {
    if (f.fim >= 2 && f.vitorias === 0) out.push("MAPA " + (+mapa + 1) + ": " + f.fim + " expedições terminaram ali sem NENHUMA vitória.");
  }
  const erros = Object.entries(r.erros).sort((a, b) => b[1] - a[1]);
  if (erros.length) out.push("ERROS DE JS: " + erros.reduce((s, e) => s + e[1], 0) + " (ex.: " + erros[0][0].slice(0, 60) + ")");
  const load = Object.values(r.loaderErros).reduce((s, n) => s + n, 0);
  if (load) out.push("FALHAS DE CARREGAMENTO: " + load + " — olhar conexão/assets no aparelho do teste.");
  if (r.pwa.falhas) out.push("DOWNLOAD DO PACOTE FALHOU: " + r.pwa.falhas + " de " + r.pwa.pacotes + " tentativas.");
  if (r.pwa.offline === 0 && r.arquivos > 0) out.push("NENHUM BOOT OFFLINE REGISTRADO — o roteiro A1 do aparelho real ainda não rodou.");
  const niveis23 = Object.values(r.compras).reduce((s, c) => s + c.n2 + c.n3, 0);
  if (r.compras && Object.keys(r.compras).length && niveis23 === 0) out.push("NENHUMA COMPRA DE PODER NÍVEL 2/3 — a progressão do A3 não foi exercitada.");
  if (r.abandonadas) out.push(r.abandonadas + " expedição(ões) sem fim registrado (app fechado ou recarregado no meio).");
  return out;
}

const fmtMin = (seg) => (seg >= 60 ? Math.round(seg / 60) + " min" : Math.round(seg) + " s");

export function relatorioTexto(r) {
  const L = [];
  const linha = (t = "") => L.push(t);
  linha("FUMIGA — RELATÓRIO DO PLAYTEST (" + r.arquivos + " arquivo(s), " + r.eventos + " eventos)");
  linha("=".repeat(72));
  linha("");
  linha("APARELHOS");
  for (const a of r.aparelhos) {
    linha("  " + a.id + "  " + a.so + "/" + a.navegador + (a.instalado ? " [instalado]" : "") + "  tela " + a.tela + "  build " + a.v + "  (" + a.eventos + " eventos)");
  }
  linha("");
  linha("SESSÕES: " + r.sessoes + " • EXPEDIÇÕES: " + r.expedicoes + " • VITÓRIAS: " + r.vitorias + " (" + r.taxaVitoria + "%) • DERROTAS: " + r.derrotas);
  linha("TEMPO MÉDIO: " + fmtMin(r.tempoMedio) + " • ABATES: " + Math.round(r.abatesMedio) + " • ONDA MÉDIA: " + r.ondaMedia.toFixed(1) + " • MORTES: " + r.mortesMedia.toFixed(1));
  if (r.recompensas) linha("ESSÊNCIA MÉDIA POR EXPEDIÇÃO: " + Math.round(r.recompensaMedia));
  linha("");
  linha("POR MODO");
  for (const [m, v] of Object.entries(r.porModo)) {
    linha("  " + m.padEnd(14) + " runs " + String(v.runs).padStart(3) + " • vitórias " + String(v.vitorias).padStart(3) + " (" + pct(v.vitorias, v.runs) + "%) • tempo médio " + fmtMin(media(v.tempo, v.runs)));
  }
  linha("");
  linha("ONDE AS EXPEDIÇÕES TERMINARAM (mapa)");
  for (const [mapa, f] of Object.entries(r.porMapaFim).sort((a, b) => +a[0] - +b[0])) {
    linha("  MAPA " + (+mapa + 1) + ": " + String(f.fim).padStart(3) + " fins • " + f.vitorias + " vitórias • " + pct(f.vitorias, f.fim) + "%");
  }
  const limpios = Object.entries(r.mapasLimpios).sort((a, b) => +a[0] - +b[0]);
  if (limpios.length) linha("  MAPAS LIMPOS: " + limpios.map(([m, n]) => (Number(m) + 1) + "→" + n).join(" • "));
  linha("");
  linha("PODERES — COMPRAS (n1/n2/n3) E PRESENÇA NOS RUNS");
  const ids = Object.keys(r.compras).sort((a, b) => r.compras[b].total - r.compras[a].total);
  if (!ids.length) linha("  (nenhuma compra registrada)");
  for (const id of ids.slice(0, 40)) {
    const c = r.compras[id];
    const runs = r.runsComPoder[id] || 0, vit = r.vitoriasComPoder[id] || 0;
    linha("  " + id.padEnd(16) + " n1/n2/n3 " + String(c.n1).padStart(2) + "/" + String(c.n2).padStart(2) + "/" + String(c.n3).padStart(2)
      + " • custo " + c.custo + " • presente em " + String(runs).padStart(3) + " runs, " + vit + " vitórias (" + pct(vit, runs) + "%)");
  }
  linha("");
  linha("APP INSTALÁVEL");
  linha("  PACOTES: " + r.pwa.pacotes + " (ok " + r.pwa.ok + ", falhas " + r.pwa.falhas + ") • tempo médio " + Math.round(r.pwa.msMedia) + " ms");
  linha("  BOOTS COM A REDE DESLIGADA: " + r.pwa.offline + " • aparelhos instalados: " + r.pwa.instalado + " • com controlador SW: " + r.pwa.controlador);
  linha("");
  if (Object.keys(r.erros).length) {
    linha("ERROS DE JS");
    for (const [msg, n] of Object.entries(r.erros).sort((a, b) => b[1] - a[1]).slice(0, 10)) linha("  " + String(n).padStart(3) + "× " + msg);
    linha("");
  }
  if (Object.keys(r.loaderErros).length) {
    linha("FALHAS DE CARREGAMENTO");
    for (const [msg, n] of Object.entries(r.loaderErros).sort((a, b) => b[1] - a[1]).slice(0, 10)) linha("  " + String(n).padStart(3) + "× " + msg);
    linha("");
  }
  linha("ALERTAS PARA A PRÓXIMA DECISÃO");
  if (!r.alertas.length) linha("  (nada crítico — seguir jogando)");
  for (const a of r.alertas) linha("  • " + a);
  return L.join("\n");
}

// ------------------------------------------------------------------- CLI -----
function arquivosDe(entrada) {
  const out = [];
  let st = null;
  try { st = fs.statSync(entrada); } catch (e) { return out; }
  if (st.isDirectory()) {
    for (const nome of fs.readdirSync(entrada).sort()) {
      if (/\.json$/i.test(nome)) out.push(path.join(entrada, nome));
    }
  } else if (st.isFile()) out.push(entrada);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const jsonArg = args.find((a) => a.startsWith("--json="));
  const entradas = args.filter((a) => !a.startsWith("--"));
  const destinos = entradas.length ? entradas : ["playtest"].filter((p) => fs.existsSync(p));
  if (!destinos.length) {
    console.log("uso: node tools/playtest.mjs <arquivos.json | pasta> [--json=resumo.json]");
    console.log("exporte os dados no jogo em OPÇÕES → aba TESTE → EXPORTAR DADOS.");
    process.exit(2);
  }
  const documentos = [];
  let ignorados = 0;
  for (const entrada of destinos) {
    for (const arquivo of arquivosDe(entrada)) {
      try {
        const doc = lerDocumento(JSON.parse(fs.readFileSync(arquivo, "utf8")));
        if (doc) documentos.push(doc); else { ignorados++; console.error("ignorado (formato diferente): " + arquivo); }
      } catch (e) { ignorados++; console.error("ignorado (ilegível): " + arquivo + " — " + e.message); }
    }
  }
  const r = resumir(documentos);
  r.ignorados += ignorados;
  console.log(relatorioTexto(r));
  if (jsonArg) {
    const destino = jsonArg.slice(7) || "playtest-resumo.json";
    fs.writeFileSync(destino, JSON.stringify(r, null, 2));
    console.log("\nresumo gravado em " + destino);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
