// Teste de integridade de sprites: TODO nome de imagem usado pelo jogo
// (props de bioma, unidades, inimigos, chefes, ícones) precisa existir no
// MANIFEST de js/assets.js. Uso: node test/assets.mjs
//
// Regressão que motivou este teste: os cactos do DESERTO CALCINADO existiam em
// assets/sprites/props/ e eram citados por config.js/world.js, mas faltavam no
// MANIFEST — o mapa 4 quebrava no render (IMG[p.img] === undefined).
import assert from "node:assert/strict";
const grad = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => grad;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {}, createElementNS() { return { getContext: makeCtx }; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};

const { loadAll, IMG, dupSprite, loadSantuario, ASSET_V } = await import("../js/assets.js");
const { MAPS, UNITS, ENEMIES, MUTATIONS, META_NODES, CHAMBERS, GIANT_SCALE, FRUIT_TREES } = await import("../js/config.js");
const { fruitAssetName } = await import("../js/tree_layout.js");
const { genWorld, world } = await import("../js/world.js");
const { bossAnimSheets } = await import("../js/render.js");
const { FONT_CHARS, FONT } = await import("../js/font.js");
const fs = await import("node:fs");
const path = await import("node:path");
const { fileURLToPath } = await import("node:url");
// caminhos relativos ao arquivo (não ao diretório de onde o teste é chamado)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await loadAll();
// Mesmo sprite derivado do boot (main.js): a DINOPONERA é a arte da FORMIGA-
// BALA ampliada 20x, com as mesmas cores originais (sem tingeamento). Sem isto
// o teste acusaria a chave de sprite que só existe depois do boot. (A MEL tem
// sprite próprio desde o rework de espécies.)
dupSprite("soldier", "giant");
const have = (k) => !!IMG[k];
const problems = [];
const check = (scope, keys) => {
  const miss = [...new Set(keys)].filter((k) => k && !have(k));
  console.log((miss.length ? "ERRO " : "ok   ") + scope + " (" + [...new Set(keys)].filter(Boolean).length + " sprites)");
  if (miss.length) problems.push(scope + ": " + miss.join(", "));
};

// ------------------------------------------------------------- estáticos ----
check("formigas aliadas", Object.values(UNITS).map((u) => u.sprite));
check("formigas inimigas", Object.values(ENEMIES).map((e) => e.sprite));
check("chefes (sheets direcionais)", bossAnimSheets());
check("ícones de mutação", MUTATIONS.map((m) => "i_" + m.icon));
check("ícones da árvore", META_NODES.map((n) => "i_" + n.icon));
check("ícones das câmaras", Object.values(CHAMBERS).map((c) => "i_" + c.icon));
check("formigueiro", ["nest", "nest_d1", "nest_d2"]);
// Maçãs entram no boot (a Árvore desenha os frutos na copa); os santuarios_*
// ficam de fora de propósito (sob demanda, entrega B). Correntes/cadeados
// saíram do repositório e do boot em 2026-09-29 (decisão do usuário): este
// teste impede que voltem por descuido.
check("maçãs dos mundos (boot)", FRUIT_TREES.map(f => "maca_" + fruitAssetName(f)));
check("flores dos santuários com folha (boot)", ["flores_planicie", "flores_floresta"]);
for (const mundo of ["planicie", "floresta"]) {
  const floresPng = fs.readFileSync(path.join(ROOT, `assets/ui/flores_${mundo}.png`));
  assert.equal(floresPng.readUInt32BE(16), 768, `flores_${mundo} largura 768 (4x192: broto, meio, flor, broto morto)`);
  assert.equal(floresPng.readUInt32BE(20), 576, `flores_${mundo} altura 576 (3x192)`);
  assert.equal(floresPng[25], 6, `flores_${mundo} RGBA com fundo transparente`);
}
assert.equal(Object.keys(IMG).filter(k => k.startsWith("correntes")).length, 0,
  "nenhuma corrente/cadeado no boot");
for (const file of ["correntes_cadeados.png", "correntes_deserto.png", "correntes_tranca.png"]) {
  assert(!fs.existsSync(path.join(ROOT, "assets", "ui", file)), "fora do repositório: " + file);
}

// ------------------------------------------------ props gerados no mundo ----
const perBiome = MAPS.map(() => new Set());
const SEEDS = [1, 2, 3, 7, 42, 1234, 99999];
for (let m = 0; m < MAPS.length; m++) {
  for (const seed of SEEDS) {
    genWorld(seed, m);
    for (const p of world.props) perBiome[m].add(p.img);
    for (const n of world.nodes) perBiome[m].add(n.img);
  }
}
MAPS.forEach((def, m) => check("props do mapa " + (m + 1) + " — " + def.name, [...perBiome[m]]));

// props citados no config que nunca aparecem (aviso, não falha)
const cited = new Set();
for (const def of MAPS) for (const list of Object.values(def.props)) for (const k of list) cited.add(k);
const unused = [...cited].filter((k) => !perBiome.some((s) => s.has(k)));
if (unused.length) console.log("aviso  props citados no config e não sorteados nos seeds testados: " + unused.join(", "));

// ------------------------------------------------ glifos x textos do jogo ----
// Todo caractere usado nos textos precisa existir no atlas, senão drawText
// desenha "?" no lugar (foi o caso de "—", "•", "▶", "[", "]" e "✓").
//
// O scanner antigo exigia >=3 letras E um espaço na string, então nunca via
// rótulos curtos nem símbolos soltos — foi assim que "[ ", " ]" (atalhos do
// draft) e "✓" (nível comprado na árvore) passaram batido.
const missing = new Map();
const jsDir = path.join(ROOT, "js");
for (const file of fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(jsDir, file), "utf8");
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
    const s = m[1];
    if (/[{}@$\\|^~'`&]/.test(s)) continue;                        // ruído de código
    const texty = /[A-Za-zÀ-ÿ0-9]/.test(s) || /[—•▶✓\[\]]/.test(s); // texto visível
    if (!texty) continue;
    if (/px|https?:|\.png|\.js|monospace|node:/.test(s)) continue;  // ruído de código
    for (const ch of s.toUpperCase()) {
      if (ch === " ") continue;
      if (!FONT_CHARS.includes(ch)) missing.set(ch, s.trim());
    }
  }
  // Segunda passada, sem filtro de "parece texto": QUALQUER literal entregue
  // direto à fonte bitmap. Foi assim que o "▼" solto da tela inicial (símbolo
  // sozinho, sem letra) virou "?" sem o teste acusar.
  const direct = /\b(?:drawText\(\s*\w+\s*,|textWidth\(|wrapText\()\s*(["'])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
  for (const m of src.matchAll(direct)) {
    for (const ch of m[2].toUpperCase()) {
      if (ch === " ") continue;
      if (!FONT_CHARS.includes(ch)) missing.set(ch, m[2].trim() + " (" + file + ")");
    }
  }
}
const bad = [...missing.entries()];
console.log((bad.length ? "ERRO " : "ok   ") + "glifos x textos (" + FONT_CHARS.length + " glifos no atlas)");
if (bad.length) problems.push("caracteres sem glifo: " + bad.map(([c, s]) => `${c} em "${s}"`).join(" | "));

// A ordem/lista de glifos da fonte e a do pipeline precisam ser idênticas: se
// divergirem, o índice da célula aponta para o glifo errado (texto trocado).
const pipeline = fs.readFileSync(path.join(ROOT, "..", "tools", "prepare_assets.sh"), "utf8");
const chsBlock = pipeline.match(/^CHS=\(([\s\S]*?)\)\s*$/m);
if (chsBlock) {
  // tokens: ou 'x' entre aspas simples, ou uma sequência sem espaços
  const tokens = chsBlock[1].replace(/\\\n/g, " ").match(/'[^']*'|[^\s\\]+/g) || [];
  const chs = tokens.map((t) => (t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1) : t)).join("");
  const same = chs === FONT_CHARS;
  console.log((same ? "ok   " : "ERRO ") + "CHS do pipeline x FONT_CHARS (" + chs.length + " glifos)");
  if (!same) {
    const diff = [];
    for (let i = 0; i < Math.max(chs.length, FONT_CHARS.length); i++) {
      if (chs[i] !== FONT_CHARS[i]) diff.push(i + ": " + JSON.stringify(chs[i]) + " x " + JSON.stringify(FONT_CHARS[i]));
    }
    problems.push("ordem dos glifos divergente: " + diff.slice(0, 6).join(", "));
  }
} else {
  console.log("aviso  não achei o array CHS em tools/prepare_assets.sh");
}

// ------------------------------------------- escala da FORMIGA GIGANTE --------
// A gigante é assada em 247 (pad = 5x o da soldado, escolhido na ARTE real) e
// ampliada no desenho com fator inteiro — sai 20x a soldado com blocos de
// pixel uniformes. O layout.mjs roda com sprites falsos de 64x64, então só
// aqui dá para conferir isso contra os PNGs de verdade.
function padOf(pngPath, out) {
  const b = fs.readFileSync(path.join(ROOT, pngPath));
  const w0 = b.readUInt32BE(16), h0 = b.readUInt32BE(20);
  const sc = out / Math.max(w0, h0);
  const w = Math.round(w0 * sc), h = Math.round(h0 * sc);
  return Math.ceil(Math.hypot(w, h)) + 2;
}
const { ANT_SIZES } = await import("../js/config.js");
const GIANT_BAKE = ANT_SIZES.giant;                        // fonte única: config.js
const pSold = padOf("assets/sprites/ants/soldier.png", ANT_SIZES.soldier);
const pGiant = padOf("assets/sprites/ants/soldier.png", GIANT_BAKE);
const factor = (pSold * GIANT_SCALE) / pGiant;
const scaleOk = pGiant === 5 * pSold && Number.isInteger(factor);
console.log((scaleOk ? "ok   " : "ERRO ") +
  `escala da GIGANTE (${GIANT_SCALE}x a soldado: assado ${pGiant} = 5x${pSold}, fator de desenho ${factor})`);
if (!scaleOk) problems.push(`assado da gigante desalinhado: pad ${pGiant} x soldado ${pSold} — ajuste ANT_SIZES.giant em main.js`);

// o atlas precisa ter células suficientes para todos os glifos
const rowsNeeded = Math.ceil(FONT_CHARS.length / 12);
const atlasBad = [];
for (const [k, f] of Object.entries(FONT)) {
  const buf = fs.readFileSync(path.join(ROOT, f.src));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const okAtlas = w === 12 * f.cw && h >= rowsNeeded * f.ch;
  console.log(`     atlas ${k}: ${w}x${h}px — 12 colunas de ${f.cw}px, ${rowsNeeded} linhas de ${f.ch}px`);
  if (!okAtlas) atlasBad.push(`${k} (${w}x${h})`);
}
console.log((atlasBad.length ? "ERRO " : "ok   ") + "atlas com células para todos os glifos");
if (atlasBad.length) problems.push("atlas pequeno/envelhecido: " + atlasBad.join(", ") + " — rode tools/prepare_assets.sh");

// Os sete fundos existem em 960×540, mas nenhum entra no boot: carregamento
// por fruto, promessa compartilhada/cache por bioma e retry com a versão do asset.
const sanctuaryMaps = ["planicie", "floresta", "pantano", "deserto", "outono", "gelo", "palida"];
for (const map of sanctuaryMaps) {
  const png = fs.readFileSync(path.join(ROOT, "assets/ui/santuario_" + map + ".png"));
  assert.equal(png.readUInt32BE(16), 960, "santuario_" + map + " largura 960");
  assert.equal(png.readUInt32BE(20), 540, "santuario_" + map + " altura 540");
}
assert.equal(Object.keys(IMG).some(k => k.startsWith("santuario_")), false, "santuários fora do MANIFEST/boot");
const sanctuaryRequests = [];
let failGeloOnce = true;
globalThis.Image = class {
  constructor() { this.width = 960; this.height = 540; }
  set src(url) {
    sanctuaryRequests.push(url);
    const fail = url.includes("santuario_gelo.png") && failGeloOnce;
    if (fail) failGeloOnce = false;
    queueMicrotask(() => (fail ? this.onerror : this.onload)?.());
  }
};
const firstSanctuary = loadSantuario("planicie");
assert.equal(loadSantuario("planicie"), firstSanctuary, "chamadas concorrentes compartilham promessa");
assert.equal((await firstSanctuary).width, 960);
for (const map of sanctuaryMaps.slice(1, 6)) await loadSantuario(map);
const paleSanctuary = loadSantuario("palida");
assert.equal(loadSantuario("topo"), paleSanctuary, "topo e Pálida compartilham o mesmo asset");
await paleSanctuary;
assert.equal(sanctuaryRequests.length, 8, "sete biomas, um retry no Gelo");
assert.equal(sanctuaryRequests.filter(url => url.includes("santuario_gelo.png")).length, 2);
assert(sanctuaryRequests.some(url => url.includes("santuario_gelo.png") && url.includes("&r=1")), "retry cache-busting");
assert(sanctuaryRequests.every(url => url.includes("v=" + ASSET_V)), "versão de cache incluída");
assert.equal(loadSantuario("planicie"), firstSanctuary, "imagem já carregada não pede de novo");
assert.equal(Object.keys(IMG).some(k => k.startsWith("santuario_")), false, "arte sob demanda não infla o boot");
console.log(problems.length ? "PROBLEMAS: " + problems.join(" | ") : "TESTE DE ASSETS PASSOU — 7 santuários 960×540, lazy-load, cache e retry");
process.exit(problems.length ? 2 : 0);
