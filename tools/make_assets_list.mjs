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
// Três grupos, na mesma divisão que a página de download mostra ao jogador:
//   shell     — código do jogo, CSS, ícones e a página do app (base dos dois pacotes)
//   essencial — o jogo jogável: sprites, fontes, TELA DE TÍTULO, telas de carga,
//               maçãs/flores/lore da Árvore e dos menus e a cutscene Noite
//               Branca (14 camadas 320×180, ~0,7 MB: toca sozinha na 1ª
//               expedição, então offline ela tem que estar no pacote básico)
//   completo  — o que só o pacote grande traz: santuários dos frutos (e as
//               cutscenes futuras, até alguém decidir o contrário)
//
// Determinismo: nada de data/hora no arquivo — mesma árvore, mesmos bytes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME = path.join(ROOT, "game");
export const LIST_PATH = path.join(ROOT, "app", "assets.json");

/** Arquivos de código e ícones: base dos dois pacotes. */
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

  // 2. assets: o que o jogo carrega em tempo de execução
  const assets = walk(path.join(GAME, "assets"), "assets").map((f) => "game/" + f);
  const noiteBranca = (f) => f.startsWith("game/assets/cutscenes/noite_branca/");
  const completo = assets.filter((f) => (f.startsWith("game/assets/cutscenes/") && !noiteBranca(f)) ||
    /^game\/assets\/ui\/santuario_.*\.png$/.test(f));
  const essencial = assets.filter((f) => !completo.includes(f));

  // `files` em ordem + `tamanhos` na MESMA ordem: a página soma bytes exatos
  // ao mostrar "63% • 12,4 MB de 18,3 MB" sem baixar nada.
  const grupo = (id, titulo, files) => ({
    id, titulo, files,
    tamanhos: files.map((f) => bytes(f)),
    bytes: files.reduce((s, f) => s + bytes(f), 0),
  });

  return {
    version: lerVersao(),
    geradoPor: "tools/make_assets_list.mjs",
    grupos: [
      grupo("shell", "Código do jogo", shell),
      grupo("essencial", "Sprites, telas, títulos e Noite Branca", essencial),
      grupo("completo", "Santuários dos frutos", completo),
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

/** Tocos de download (o que a página do app soma e exibe). */
export function pacotes(list = buildList()) {
  const g = Object.fromEntries(list.grupos.map((x) => [x.id, x]));
  const soma = (...ids) => ids.reduce((s, id) => s + (g[id]?.bytes || 0), 0);
  return {
    essencial: { arquivos: g.shell.files.length + g.essencial.files.length, bytes: soma("shell", "essencial") },
    completo: {
      arquivos: g.shell.files.length + g.essencial.files.length + g.completo.files.length,
      bytes: soma("shell", "essencial", "completo"),
    },
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
  const p = pacotes(list);

  if (check) {
    if (texto === atual) console.log("assets.json em dia — " + list.version);
    else { console.error("assets.json DESATUALIZADO — rode: node tools/make_assets_list.mjs"); process.exit(1); }
  } else {
    fs.mkdirSync(path.dirname(LIST_PATH), { recursive: true });
    fs.writeFileSync(LIST_PATH, texto);
    console.log("escrito " + path.relative(ROOT, LIST_PATH) + "  (versão " + list.version + ")");
  }
  for (const g of list.grupos) console.log("  " + g.id.padEnd(10) + String(g.files.length).padStart(4) + " arquivos  " + mb(g.bytes).padStart(9) + "  " + g.titulo);
  console.log("  " + "pacote".padEnd(10) + "essencial".padEnd(12) + mb(p.essencial.bytes) + " · completo " + mb(p.completo.bytes));
}
