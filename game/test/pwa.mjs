// Teste do app instalável (PWA): o jogo baixável e jogável offline.
// Uso: node game/test/pwa.mjs   (Node puro — nada de navegador aqui)
//
// O que este teste protege (cada bloco já falhou em algum projeto real):
//   1. app/assets.json EM DIA — regenerado em memória e comparado byte a byte.
//      Lista de download desatualizada = pacote com arquivo faltando lá na frente.
//   2. COBERTURA — todo arquivo servido ao navegador (código, sprites, UI,
//      cutscenes) está em exatamente um grupo: nada de asset órfão fora do
//      pacote completo, nada de caminho fantasma que não existe no repositório.
//   3. MANIFESTS — JSON válido, o que o navegador EXIGE para instalar (name,
//      short_name, start_url, scope, display, ícones 192/512 + maskable), com
//      os ícones existindo de verdade e no tamanho declarado (lê o IHDR do PNG).
//   4. SERVICE WORKER — sanidade do arquivo: sem imports relativos quebrados,
//      com install/activate/fetch/message, e a versão do cache casando com o
//      ASSET_V do jogo (é o ASSET_V que decide quando descartar o cache velho).
//   5. PÁGINAS — todo href/src local dos quatro HTMLs e todo `from "./x.js"`
//      dos módulos inline existem (pega 404 de CSS, ícone, manifest e módulo).
//   6. PACOTE ÚNICO — não existe opção parcial; tamanho e conteúdo somam todos
//      os arquivos distribuídos pelo jogo.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildList, serializar, LIST_PATH } from "../../tools/make_assets_list.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GAME = path.join(ROOT, "game");
const abs = (rel) => path.join(ROOT, rel);
const existe = (rel) => {
  const p = abs(rel);
  if (!fs.existsSync(p)) return false;
  if (fs.statSync(p).isDirectory()) return fs.existsSync(path.join(p, "index.html"));
  return true;
};
const mb = (b) => (b / 1048576).toFixed(1) + " MB";

// ----------------------------------------------------------------- 1 e 2 ----
const lista = buildList();
const atual = fs.existsSync(LIST_PATH) ? fs.readFileSync(LIST_PATH, "utf8") : "";
assert.equal(atual, serializar(lista), "app/assets.json está EM DIA (rode: node tools/make_assets_list.mjs)");
console.log("ok    assets.json em dia — " + lista.version);

const grupos = Object.fromEntries(lista.grupos.map((g) => [g.id, g]));
assert.deepEqual(Object.keys(grupos).sort(), ["assets", "shell"], "grupos internos do pacote completo (shell + assets)");

const vistos = new Set();
for (const g of lista.grupos) {
  assert.ok(g.files.length > 0, "grupo " + g.id + " tem arquivos");
  assert.equal(g.files.length, g.tamanhos.length, "grupo " + g.id + ": um tamanho por arquivo");
  for (const [i, f] of g.files.entries()) {
    assert.ok(!vistos.has(f), "arquivo em um grupo só: " + f);
    vistos.add(f);
    assert.ok(existe(f), "arquivo listado existe: " + f);
    assert.equal(g.tamanhos[i], fs.statSync(abs(f)).size, "tamanho confere: " + f);
  }
}

// tudo que é servido ao navegador precisa estar em algum grupo
const deveEstar = [];
for (const dir of ["game/js", "game/assets", "app"]) {
  const anda = (d) => {
    for (const e of fs.readdirSync(abs(d), { withFileTypes: true })) {
      const rel = d + "/" + e.name;
      if (e.isDirectory()) anda(rel);
      else if (/\.(js|css|png|webmanifest)$/.test(rel)) deveEstar.push(rel);
    }
  };
  anda(dir);
}
const fora = deveEstar.filter((f) => !vistos.has(f) && f !== "app/sw.js" && f !== "app/assets.json");
assert.deepEqual(fora, [], "nenhum arquivo servido ficou fora da lista de download");

// Pacote único: shell + todos os assets, sem recorte ESSENCIAL.
const pacoteCompleto = new Set(lista.grupos.flatMap((g) => g.files));
assert.equal(pacoteCompleto.size, vistos.size, "o pacote completo contém todo arquivo coberto");
assert.ok(pacoteCompleto.has("game/assets/cutscenes/noite_branca.png") || [...pacoteCompleto].some((f) => f.startsWith("game/assets/cutscenes/")), "inclui as cutscenes");
assert.ok([...pacoteCompleto].some((f) => /santuario_.*\.png$/.test(f)), "inclui os santuários");
for (const rel of ["index.html", "app/online.html"]) {
  const html = fs.readFileSync(abs(rel), "utf8");
  assert.ok(html.includes("btnCompleto"), rel + " oferece o pacote completo");
  assert.ok(!/btnEssencial|ESSENCIAL/.test(html), rel + " não oferece um pacote parcial");
}
const home = fs.readFileSync(abs("index.html"), "utf8");
assert.match(home, /APK ANDROID — EM PREPARAÇÃO/, "não anuncia APK como download antes da Release");
assert.ok(home.includes("INSTALADOR WINDOWS 64-BIT (.EXE) — EM PREPARAÇÃO"), "não anuncia EXE como download antes da Release");
assert.match(home, /<button[^>]+disabled/, "instaladores ainda não publicados não são clicáveis");
assert.doesNotMatch(home, /releases\/latest\/download\/FUMIGA-/, "não deixa links quebrados para artefatos que ainda não foram publicados");
console.log("ok    cobertura — " + lista.grupos.reduce((s, g) => s + g.files.length, 0) + " arquivos em um grupo só, sem órfãos");

// --------------------------------------------------------------------- 3 ----
const MANIFESTS = ["manifest.webmanifest", "game/manifest.webmanifest", "game/mobile/manifest.webmanifest"];
const dimensoesPNG = (rel) => {
  const buf = fs.readFileSync(abs(rel));
  assert.equal(buf.subarray(1, 4).toString("ascii"), "PNG", rel + " é PNG de verdade");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};
const vistosIcones = [];
for (const rel of MANIFESTS) {
  const m = JSON.parse(fs.readFileSync(abs(rel), "utf8"));
  const dir = path.dirname(rel);
  for (const campo of ["name", "short_name", "start_url", "display", "background_color", "theme_color", "icons"]) {
    assert.ok(m[campo], rel + ": campo obrigatório para instalar — " + campo);
  }
  assert.ok(["standalone", "fullscreen"].includes(m.display), rel + ": display de app");
  assert.equal(m.orientation, "landscape", rel + ": o jogo é horizontal");
  assert.ok(m.description && m.description.length > 20, rel + ": descrição para a loja/instalação");
  assert.ok(m.lang === "pt-BR", rel + ": idioma do jogo");

  // start_url e scope não podem sair do repositório (nem apontar para arquivo inexistente)
  for (const chave of ["start_url", "scope"]) {
    const semQuery = m[chave].split(/[?#]/)[0];
    const alvo = path.normalize(path.join(dir, semQuery)).replace(/\\/g, "/");
    assert.ok(!alvo.startsWith(".."), rel + ": " + chave + " não escapa da raiz do site (" + alvo + ")");
    if (chave === "start_url") {
      assert.ok(existe(alvo), rel + ": start_url existe — " + alvo);
      const query = (m[chave].split("?")[1] || "").split("#")[0];
      assert.ok(query === "" || /^v=(pc|mobile)$/.test(query), rel + ": start_url só passa ?v=pc ou ?v=mobile (tem \"" + query + "\")");
    }
  }

  const icones = m.icons.map((i) => ({ ...i, caminho: path.normalize(path.join(dir, i.src)).replace(/\\/g, "/") }));
  assert.ok(icones.some((i) => i.sizes === "192x192"), rel + ": ícone 192");
  assert.ok(icones.some((i) => i.sizes === "512x512" && i.purpose === "any"), rel + ": ícone 512");
  assert.ok(icones.some((i) => i.purpose === "maskable"), rel + ": ícone maskable (Android recorta o ícone)");
  for (const i of icones) {
    assert.ok(existe(i.caminho), rel + ": ícone existe — " + i.caminho);
    const { w, h } = dimensoesPNG(i.caminho);
    const [ew, eh] = i.sizes.split("x").map(Number);
    assert.ok(w === ew && h === eh, rel + ": " + i.caminho + " é " + i.sizes + " (tem " + w + "×" + h + ")");
    assert.ok(i.type === "image/png", rel + ": tipo do ícone");
    vistosIcones.push(i.caminho);
  }
  // cada manifest tem que estar LIGADO na página da sua pasta (senão não instala)
  const pagina = dir === "." ? "index.html" : dir + "/index.html";
  const html = fs.readFileSync(abs(pagina), "utf8");
  assert.ok(html.includes(path.basename(rel)), pagina + " aponta para o próprio manifest");
  console.log("ok    " + rel + " — instalável (" + icones.length + " ícones, start_url " + m.start_url + ")");
}

// --------------------------------------------------------------------- 4 ----
const sw = fs.readFileSync(abs("sw.js"), "utf8");
assert.ok(!/^\s*import\s/m.test(sw), "sw.js não usa imports (roda isolado no escopo do Worker)");
assert.ok(!/self\.registration\.scope.*scope:/.test(sw), "sw.js não tenta registrar outro Worker");
for (const ev of ["install", "activate", "fetch", "message"]) {
  assert.ok(sw.includes('addEventListener("' + ev + '"'), "sw.js trata o evento " + ev);
}
assert.ok(sw.includes("ignoreSearch: true"), "sw.js casa a URL mesmo com o ?v= da versão");
assert.ok(sw.includes("cache: \"no-store\""), "sw.js busca a lista sem cache");
assert.ok(/PREFIXO\s*=\s*"fumiga-"/.test(sw), "sw.js usa um prefixo próprio de cache");
assert.ok(sw.includes("skipWaiting") && sw.includes("clients.claim"), "sw.js assume o controle sem exigir fechar a aba");
assert.ok(sw.includes("app/assets.json"), "sw.js lê a lista gerada");

// a versão do cache vem do ASSET_V: se um PNG novo entra sem subir o ASSET_V,
// o aparelho continuaria servindo o cache antigo — este cruzamento avisa.
const assets = fs.readFileSync(abs("game/js/assets.js"), "utf8");
const assetV = assets.match(/ASSET_V\s*=\s*"([^"]+)"/)[1];
assert.equal(lista.version, assetV, "assets.json e o ASSET_V do jogo são a MESMA versão");
console.log("ok    sw.js — handlers, fila e cache versionado por ASSET_V (" + assetV + ")");

// --------------------------------------------------------------------- 5 ----
const PAGINAS = ["index.html", "app/online.html", "game/index.html", "game/mobile/index.html"];
for (const rel of PAGINAS) {
  const html = fs.readFileSync(abs(rel), "utf8");
  const dir = path.dirname(rel);
  const refs = [
    ...[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]),
  ];
  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(ref)) continue;
    const limpo = path.normalize(path.join(dir, ref.split(/[?#]/)[0])).replace(/\\/g, "/");
    assert.ok(existe(limpo), rel + ": referência quebrada → " + ref);
  }
  // o que o módulo inline importa de app/offline.js precisa existir como export
  const usados = [...html.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g)];
  const offline = fs.readFileSync(abs("app/offline.js"), "utf8");
  for (const [, nomes, origem] of usados) {
    for (const nome of nomes.split(",").map((s) => s.trim()).filter(Boolean)) {
      assert.ok(new RegExp("export (async )?(function|const) " + nome + "\\b").test(offline),
        rel + ": app/offline.js precisa exportar " + nome + " (importado de " + origem + ")");
    }
  }
  console.log("ok    " + rel + " — " + refs.length + " referências locais, todas existem");
}

// --------------------------------------------------------------------- 6 ----
const totalBytes = lista.grupos.reduce((sum, g) => sum + g.bytes, 0);
assert.ok(totalBytes > 5 * 1024 * 1024 && totalBytes < 200 * 1024 * 1024, "tamanho plausível para o jogo completo");
// Sobe quando entra asset novo (o painel 3 da Noite Branca trouxe 4 em 2026-10-04).
assert.equal(pacoteCompleto.size, 235, "conjunto completo esperado de 235 arquivos");
console.log("ok    pacote único — " + mb(totalBytes) + " · " + pacoteCompleto.size + " arquivos (sem versão parcial)");

console.log("PWA OK — shell completo, sem pacote parcial, cache versionado e nenhum link quebrado");
