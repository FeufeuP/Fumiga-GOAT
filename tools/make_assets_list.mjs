// ============================================================================
// FUMIGA — gerador da lista de arquivos do app instalável
//
// Escreve app/assets.json: o Service Worker (sw.js, na raiz do repositório) e
// a página do app (app/online.html) LEEM este arquivo para saber o que baixar e
// quanto pesa. É gerado, não escrito à mão — e o teste game/test/pwa.mjs
// regenera em memória e compara com o arquivo versionado, então a lista nunca
// sai de sincronia.
//
// Os caminhos são RELATIVOS À RAIZ DO REPOSITÓRIO (o escopo do Service Worker):
// no GitHub Pages (subpasta) e no servidor local (raiz) funcionam igual.
//
//   node tools/make_assets_list.mjs          grava app/assets.json
//   node tools/make_assets_list.mjs --check  só compara (usado pelo teste)
//
// Dois grupos internos, sem pacotes parciais para o jogador:
//   shell  — código, CSS, ícones e páginas (pré-requisito do app)
//   assets — TODOS os sprites, biomas, santuários e camadas de cutscene.
// A única ação pública de download combina shell + assets em um pacote completo.
//
// Determinismo: nada de data/hora no arquivo — mesma árvore, mesmos bytes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME = path.join(ROOT, "game");
export const LIST_PATH = path.join(ROOT, "app", "assets.json");

/** Arquivos de código e ícones: base do pacote completo. */
const SHELL_FIXOS = [
  "index.html",
  "manifest.webmanifest",
  "app/app.css",
  "app/offline.js",
  "app/online.html",
  "app/icons/icon-192.png",
  "app/icons/icon-512.png",
  "app/icons/icon-512-maskable.png",
  "app/icons/apple-touch-icon-180.png",
  "app/icons/favicon-32.png",
  "app/icons/favicon-16.png",
  "game/index.html",
  "game/mobile/index.html",
  "game/manifest.webmanifest",
  "game/mobile/manifest.webmanifest",
  "game/css/style.css",
  "game/mobile/mobile.css",
  "game/mobile/touch.js",
];

/** Extensões que entram em cada pacote (tudo em game/ é servido ao navegador). */
const ehCodigo = (rel) => /\.(js|css)$/.test(rel);

function walk(absDir, relDir = "") {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = relDir ? relDir + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(absDir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

/** Tamanho em bytes de um caminho relativo à raiz do repositório. */
function bytes(rel) {
  try { return fs.statSync(path.join(ROOT, rel)).size; } catch { return 0; }
}

/**
 * Monta a lista inteira a partir da ÁRVORE de arquivos (não de uma lista fixa):
 * se alguém adicionar um sprite e esquecer de registrá-lo, o teste de cobertura
 * acusa. Cada arquivo aparece em exatamente um grupo.
 */
export function buildList() {
  // 1. shell: código + ícones (js/css de todo o jogo, para PC e mobile)
  const jsCss = walk(path.join(GAME, "js")).map((f) => "game/js/" + f).filter(ehCodigo);
  const shell = [...new Set([...SHELL_FIXOS, ...jsCss])].sort();

  // 2. assets: TODOS os recursos do jogo, sem classificação parcial
  const assets = walk(path.join(GAME, "assets"), "assets").map((f) => "game/" + f);

  // `files` em ordem + `tamanhos` na MESMA ordem: a página mostra o tamanho
  // total e o progresso do pacote inteiro sem baixar nada.
  const grupo = (id, titulo, files) => ({
    id, titulo, files,
    tamanhos: files.map((f) => bytes(f)),
    bytes: files.reduce((s, f) => s + bytes(f), 0),
  });

  return {
    version: lerVersao(),
    geradoPor: "tools/make_assets_list.mjs",
    grupos: [
      grupo("shell", "Código e páginas do jogo", shell),
      grupo("assets", "Todos os recursos do jogo", assets),
    ],
  };
}

/** Versão = ASSET_V do jogo: uma fonte de verdade só (assets.js). */
function lerVersao() {
  const src = fs.readFileSync(path.join(GAME, "js", "assets.js"), "utf8");
  const m = src.match(/ASSET_V\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("ASSET_V não encontrado em game/js/assets.js");
  return m[1];
}

/** O único pacote visível ao jogador contém shell + todos os assets. */
export function pacoteCompleto(list = buildList()) {
  return {
    arquivos: list.grupos.reduce((s, g) => s + g.files.length, 0),
    bytes: list.grupos.reduce((s, g) => s + g.bytes, 0),
  };
}

export function serializar(list = buildList()) {
  return JSON.stringify(list, null, 2) + "\n";
}

// ------------------------------------------------------------------- CLI ----
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const list = buildList();
  const texto = serializar(list);
  const check = process.argv.includes("--check");
  const atual = fs.existsSync(LIST_PATH) ? fs.readFileSync(LIST_PATH, "utf8") : "";
  const mb = (b) => (b / 1048576).toFixed(1) + " MB";
  const p = pacoteCompleto(list);

  if (check) {
    if (texto === atual) console.log("assets.json em dia — " + list.version);
    else { console.error("assets.json DESATUALIZADO — rode: node tools/make_assets_list.mjs"); process.exit(1); }
  } else {
    fs.mkdirSync(path.dirname(LIST_PATH), { recursive: true });
    fs.writeFileSync(LIST_PATH, texto);
    console.log("escrito " + path.relative(ROOT, LIST_PATH) + "  (versão " + list.version + ")");
  }
  for (const g of list.grupos) console.log("  " + g.id.padEnd(10) + String(g.files.length).padStart(4) + " arquivos  " + mb(g.bytes).padStart(9) + "  " + g.titulo);
  console.log("  pacote completo  " + p.arquivos + " arquivos  " + mb(p.bytes));
}
