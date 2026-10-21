// ============================================================================
// Diagrama + travas estruturais do NINHO ESCAVÁVEL.
//
// Antes este teste lia o texto de nest.js à procura de `ROOMS`/`EDGES` (salas
// fixas ligadas por tuneis). Isso nao existe mais: o formigueiro agora e uma
// GRADE de terra e camera so existe onde as formigas abriram. Entao o teste
// importa o modulo de verdade (sem regex, sem copiar numero) e confere:
//
//   1. a grade bate com NEST_GRID e cabe na tela com o rodape de obras;
//   2. a rocha-mae protege o canto do "OLHO LÁ FORA" (a janela nunca e terra);
//   3. nada aberto fica solto: todo tile de camera encosta em outro aberto;
//   4. o nivel da camara vem do tamanho (NEST_BUILD[].sizes), nao de botao;
//   5. o custo por tile e menor que a camera inteira da tabela antiga;
//   6. as ferramentas do rodape tem rotulo proprio (sem cair no id cru).
//
// Desenha o corte real em PNG (NESTMAP_OUT) para inspecao visual.
// Uso: node game/test/nestmap.mjs
// ---------------------------------------------------------------- stubs ----
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: null }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (typeof p === "string" && p in t) return t[p];
      return (...a) => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {},
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class { constructor() { this.width = 64; this.height = 64; } set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); } };
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const GAME = decodeURIComponent(new URL("..", import.meta.url).pathname);
const { genWorld, world } = await import("../js/world.js");
const units = await import("../js/units.js");
const { G, loadSave } = await import("../js/state.js");
const cfg = await import("../js/config.js");
const nestMod = await import("../js/nest.js");
const { nest, nestEnter, nestUpdate, NEST_BOTTOM, NEST_COLS, NEST_ROWS, NEST_TILE } = nestMod;
const { NEST_GRID, NEST_RESERVE, NEST_SOIL, NEST_BUILD, NEST_ROOM_IDS, NEST_RULES, VIEW_W, VIEW_H } = cfg;

const problems = [];
const ok = (m) => console.log("ok    " + m);
const bad = (m) => { problems.push(m); console.log("ERRO  " + m); };

// ---------------------------------------------------------------- palco ----
loadSave();
genWorld(7, 0);
const run = {
  seed: 7, status: "running", mapIdx: 0, food: 3000, essencePool: 300, kills: 0, wave: 0,
  level: 0, xp: 0, xpNext: 40, fungusT: 9,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mutations: new Set(), mutationLog: [], elapsed: 0, baseOpen: true,
};
G.run = run; G.screen = "RUN";
units.spawnQueen();
for (let i = 0; i < 6; i++) {
  const a = units.spawnAnt("worker", world.anthill.x + 30, world.anthill.y + 30);
  a.inside = true; a.insideT = 1; units.allies.inside.push(a);
}
nestEnter();
const COLS = NEST_COLS, ROWS = NEST_ROWS, NN = COLS * ROWS, TILE = NEST_TILE;
const idx = (c, r) => r * COLS + c;
const nb = (i) => [i - 1, i + 1, i - COLS, i + COLS].filter((j) => j >= 0 && j < NN && Math.abs((j % COLS) - (i % COLS)) <= 1);
const sim = (sec) => { for (let k = 0, n = Math.round(sec * 60); k < n; k++) nestUpdate(1 / 60, true); };

// ------------------------------------------------------------ 1) a grade ------
if (COLS === NEST_GRID.cols && ROWS === NEST_GRID.rows && TILE === NEST_GRID.tile) {
  ok("nest.js usa a grade de config.js: " + COLS + "x" + ROWS + " de " + TILE + "px em (" + NEST_GRID.x + "," + NEST_GRID.y + ")");
} else bad("a grade de nest.js divergiu de NEST_GRID");
const gridRight = NEST_GRID.x + COLS * TILE, gridBottom = NEST_GRID.y + ROWS * TILE;
if (gridRight <= VIEW_W && gridBottom <= NEST_BOTTOM) {
  ok("o corte cabe na tela: até x=" + gridRight + " e y=" + gridBottom + " (rodapé em y=" + NEST_BOTTOM + ")");
} else bad("a grade vaza da tela ou por baixo do rodapé (" + gridRight + "," + gridBottom + ")");
// rodapé: linha de obras + linha da boca + duas dicas, tudo antes de 540
if (NEST_BOTTOM + 40 + 30 + 40 <= VIEW_H) ok("rodapé fechado: obras em +" + (NEST_BOTTOM + 8) + ", boca em +" + (NEST_BOTTOM + 40) + ", dicas até y=" + (NEST_BOTTOM + 96));
else bad("o rodapé do ninho passa de 540px (BOTTOM=" + NEST_BOTTOM + ")");

// ------------------------------------------- 2) rocha-mãe do OLHO LÁ FORA ----
{
  let rock = 0, tot = 0, opened = 0;
  for (let r = NEST_RESERVE.r0; r <= NEST_RESERVE.r1; r++) {
    for (let c = NEST_RESERVE.c0; c <= NEST_RESERVE.c1; c++) {
      const i = idx(c, r);
      tot++;
      if (NEST_SOIL[nest.soil[i]].hard === 0) rock++;
      if (nest.open_[i]) opened++;
    }
  }
  if (rock === tot && opened === 0) ok("reserva do HUD = rocha-mãe: " + tot + " tiles que nenhuma obra atravessa");
  else bad("a reserva do OLHO LÁ FORA virou terra escavável (" + rock + "/" + tot + " rocha, " + opened + " abertos)");
}

// --------------------------------- 3) nada de câmara solta no meio da terra ---
{
  const seed = new Set([nest.entrance, nest.hall, nest.royal]);
  let floating = 0;
  for (let i = 0; i < NN; i++) {
    if (!nest.open_[i] || seed.has(i)) continue;
    if (!nb(i).some((j) => nest.open_[j])) floating++;
  }
  if (floating === 0) ok("todo tile aberto encosta em outro aberto (ninho cresce como túnel, sem sala teleportada)");
  else bad(floating + " tiles abertos sem conexão com a boca");
  let nOpen = 0, soft = 0;
  for (let i = 0; i < NN; i++) { if (nest.open_[i]) nOpen++; if (NEST_SOIL[nest.soil[i]].hard > 0) soft++; }
  ok("corte de seed 7: " + nOpen + " tiles abertos, " + soft + " escaváveis, " + (NN - soft) + " rocha-mãe");
}

// ------------------------- 4) nível vem da ÁREA contínua (3/6/10), não de botão
{
  run.food = 9000; run.essencePool = 900;
  const free = (i) => nest.open_[i] && nest.room[i] < 0 && nest.plan[i] < 0;
  const grow = (seedTiles, n) => {
    const out = seedTiles.slice(), seen = new Set(seedTiles), q = seedTiles.slice();
    while (q.length && out.length < n) {
      const i = q.shift();
      for (const j of nb(i)) {
        if (seen.has(j) || !free(j)) continue;
        seen.add(j); out.push(j); q.push(j);
        if (out.length === n) return out;
      }
    }
    return null;
  };
  const want = NEST_BUILD.pantry.sizes;
  for (let s = 1; s < want.length; s++) {
    if (!(want[s] > want[s - 1])) bad("NEST_BUILD.pantry.sizes não cresce: " + want.join("/"));
  }
  const pick = grow([nest.hall], want[0]);
  if (!pick) bad("não coube uma câmara mínima no vestíbulo da seed 7");
  else {
    nest.tool = "pantry";
    for (const i of pick) nestMod.nestPaintTile(i);
    sim(24);
    const cm1 = nest.comps.find((c) => c.type === "pantry");
    if (cm1 && cm1.lvl === 1 && cm1.n >= want[0] && cm1.n < want[1]) ok(want[0] + " tiles contíguos = câmara nível 1 (n=" + cm1.n + ")");
    else bad("câmara mínima não virou nível 1: " + JSON.stringify(cm1 && { lvl: cm1.lvl, n: cm1.n }));
    const emenda = grow(cm1.tiles, want[1]);
    if (!emenda) bad("não deu para emendar a câmara até " + want[1] + " tiles");
    else {
      for (const i of emenda) nestMod.nestPaintTile(i);
      sim(26);
      const cm2 = nest.comps.find((c) => c.type === "pantry");
      if (cm2 && cm2.lvl === 2) ok("emendada até " + cm2.n + " tiles, a MESMA câmara subiu para o nível " + cm2.lvl + " (estoque " + nest.stats.foodCap + ")");
      else bad("emendar a câmara não subiu o nível (" + (cm2 ? cm2.n + " tiles → n" + cm2.lvl : "sumiu") + ")");
      const st = nest.stats;
      if (cm2 && st.tiles.pantry === cm2.n) ok("estatuto conta os tiles da câmara real (" + st.tiles.pantry + "), não o número de botão");
      else bad("tiles do estatuto divergem da câmara: " + st.tiles.pantry + " vs " + (cm2 ? cm2.n : "?"));
    }
  }
}

// ---------------------------------------- 5) custo por tile < câmara da tabela --
for (const id of NEST_ROOM_IDS) {
  const b = NEST_BUILD[id];
  if (!b.btn) { bad("NEST_BUILD." + id + " sem rótulo curto de botão"); continue; }
  if (b.btn.length > 9) bad(id + ": rótulo do botão longo demais (" + b.btn + ")");
  const c0 = cfg.CHAMBERS[id].costs[0];
  if (b.tile.food > c0.food) bad(id + ": tile unitário mais caro que a câmara antiga inteira");
}
ok("as 5 obras têm rótulo curto e custo de tile abaixo da tabela antiga");
if (NEST_RULES.crewPerTile >= 1 && NEST_RULES.maxDiggers >= NEST_RULES.crewPerTile) ok("tripulação por obra: " + NEST_RULES.crewPerTile + " formiga(s)/tile, até " + NEST_RULES.maxDiggers + " escavando");
else bad("tripulação de obra incoerente (" + NEST_RULES.crewPerTile + "/" + NEST_RULES.maxDiggers + ")");

// ---------------------------------------------------- o corte em PNG ---------
// ---------------- 9) ARTE da rodada 2026-10-21: a FOLHA do chão e a MOLDURA da ficha
{
  const ROOTDIR = path.join(GAME, "..");
  // IHDR do PNG: largura em 16, altura em 20 (big-endian). Sem dependência nova.
  const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const inPkg = (rel) => {
    const man = JSON.parse(fs.readFileSync(path.join(ROOTDIR, "app/assets.json"), "utf8"));
    return man.grupos.some((g) => (g.files || []).some((x) => String(x).endsWith(rel)));
  };
  const terra = path.join(GAME, "assets/sprites/nest/terra.png");
  if (!fs.existsSync(terra)) {
    bad("falta game/assets/sprites/nest/terra.png - derive com tools/prepare_nest_art.py");
  } else {
    const [w, h] = pngSize(terra);
    const want = (NEST_GRID.cols * NEST_GRID.tile) / (NEST_GRID.rows * NEST_GRID.tile);
    const have = w / h;
    // A trava que importa: se alguém recortar a folha noutra proporção, o
    // drawImage 1:1 do chão ESTICA a pintura (Regra 22) e ninguém avisa.
    if (Math.abs(have / want - 1) > 0.02) bad("a folha do chão é " + have.toFixed(3) + ":1 e a grade pede " + want.toFixed(3) + ":1 - amostrada 1:1 ela ficaria DEFORMADA");
    else ok("folha do chão " + w + "x" + h + " na proporção exata da grade (" + want.toFixed(3) + ") - dois tiles vizinhos leem pixels vizinhos, não existe emenda");
    const ast = fs.readFileSync(path.join(GAME, "js/assets.js"), "utf8");
    if (!/nest_terra:\s*"sprites\/nest\/terra\.png"/.test(ast)) bad("a folha não está no MANIFEST de assets.js: o jogo nunca a baixaria");
    else ok("folha registrada no MANIFEST de assets.js");
    if (!inPkg("game/assets/sprites/nest/terra.png")) bad("a folha NÃO está em app/assets.json: PWA e instaladores ficariam sem ela (rode tools/make_assets_list.mjs)");
    else ok("folha no app/assets.json (pacote offline e instaladores completos)");
  }
  const PH = await import("../js/paper_hud.js");
  const frame = path.join(GAME, "assets/ui/paper/nest_tip_frame.png");
  const bgp = path.join(GAME, "assets/ui/paper/nest_tip_bg.png");
  if (!fs.existsSync(frame) || !fs.existsSync(bgp)) {
    bad("falta o par nest_tip_frame/_bg em game/assets/ui/paper/ - a ficha vive de fallback");
  } else {
    const [fw, fh] = pngSize(frame);
    const nat = PH.PAPER_NATIVE_SIZE.nest_tip;
    if (Math.abs(fw / fh - nat[0] / nat[1]) > 0.01) bad("PAPER_NATIVE_SIZE.nest_tip anuncia " + nat.join("x") + " mas a arte é " + fw + "x" + fh);
    else ok("PAPER_NATIVE_SIZE.nest_tip confere com a arte entregue (" + fw + "x" + fh + ")");
    const q = PH.PAPER_QUIET.nest_tip, a = PH.PAPER_APERTURE.nest_tip;
    const dentro = q[0] >= a[0] - 1e-6 && q[1] >= a[1] - 1e-6 && q[2] <= a[2] + 1e-6 && q[3] <= a[3] + 1e-6;
    const areaQ = (q[2] - q[0]) * (q[3] - q[1]), areaA = (a[2] - a[0]) * (a[3] - a[1]);
    if (!dentro) bad("PAPER_QUIET.nest_tip [" + q + "] sai da janela vazada [" + a + "]: o texto nasceria sobre a madeira");
    else if (areaQ < 0.3 * areaA) bad("a área quieta da ficha é pequena demais: " + Math.round(100 * areaQ / areaA) + "% da janela");
    else ok("área quieta da ficha medida na arte: dentro da janela e com " + Math.round(100 * areaQ / areaA) + "% dela");
    const njs = fs.readFileSync(path.join(GAME, "js/nest.js"), "utf8");
    if (!/IMG\.paper_nest_tip_frame/.test(njs) || !/frm\.height \/ frm\.width/.test(njs)) bad("nest.js não deriva a caixa da ficha da proporção da moldura (Regra 22: nunca esmagar sprite)");
    else ok("a caixa da ficha acompanha a proporção da moldura carregada");
  }
}

const PIP_SRC = fs.readFileSync(GAME + "/js/render.js", "utf8");
const [, PIP_W, PIP_H] = PIP_SRC.match(/PIP = \{ w: (\d+), h: (\d+), zoom/).map(Number);
const PIP = { x: VIEW_W - PIP_W - 22, y: 46, w: PIP_W, h: PIP_H };
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";
const A = [];
const draw = (...d) => A.push(...d);
const rect = (x, y, w, h, fill, stroke = fill, sw = 1) =>
  draw("-fill", fill, "-stroke", stroke, "-strokewidth", String(sw),
    "-draw", `rectangle ${Math.round(x)},${Math.round(y)} ${Math.round(x + w)},${Math.round(y + h)}`);
const text = (x, y, str, size, color) =>
  draw("-font", FONT, "-pointsize", String(size), "-fill", color, "-stroke", "none",
    "-gravity", "NorthWest", "-annotate", `+${Math.round(x)}+${Math.round(y)}`, str);
const textC = (cx, y, str, size, color) => text(cx - str.length * size * 0.30, y, str, size, color);

const SOIL_FILL = ["#0e0a06", "#3a2814", "#4a3319", "#14100a"];
rect(0, 0, VIEW_W, VIEW_H, "#0b0704");
rect(0, 0, VIEW_W, NEST_BOTTOM, "#17100a");
for (let i = 0; i < NN; i++) {
  const c = i % COLS, r = (i / COLS) | 0;
  const x = NEST_GRID.x + c * TILE, y = NEST_GRID.y + r * TILE;
  if (nest.open_[i]) {
    const kind = nest.room[i];
    // kinds 0..4 = obras; 5 = boca, 6 = Câmara Real (não são construíveis)
    const col = kind < 0 ? "#2f2113"
      : kind < NEST_ROOM_IDS.length ? NEST_BUILD[NEST_ROOM_IDS[kind]].accent
      : kind === NEST_ROOM_IDS.length ? "#ffd479" : "#ff8ad0";
    rect(x + 1, y + 1, TILE - 2, TILE - 2, kind >= 0 ? "#241a10" : "#241a10", kind >= 0 ? col : "#3a2a16", kind >= 0 ? 3 : 1);
  } else {
    rect(x, y, TILE, TILE, SOIL_FILL[nest.soil[i]] || "#2a1c12", "#0b0704", 1);
    if (nest.vein[i] === 2) rect(x + 8, y + 8, 8, 8, "#8fd3ff", "#8fd3ff", 1);
    else if (nest.vein[i] === 1) { for (let k = 0; k < 3; k++) rect(x + 6 + k * 5, y + 9 + (k % 2) * 6, 3, 3, "#ffd479", "#ffd479", 1); }
  }
  if (nest.marked[i]) rect(x + 2, y + 2, TILE - 4, TILE - 4, "none", "#efe9ff", 2);
}
for (const cm of nest.comps) {
  const x = NEST_GRID.x + cm.cA * TILE, y = NEST_GRID.y + cm.rA * TILE;
  const w = (cm.cB - cm.cA + 1) * TILE, h = (cm.rB - cm.rA + 1) * TILE;
  rect(x, y, w, h, "none", cm.accent || NEST_BUILD[cm.type].accent, 2);
  text(x + 4, y - 14, cm.type.toUpperCase() + " N" + cm.lvl + " (" + cm.n + " TILES, TRAFOEGO x" + cm.traffic.toFixed(2) + ")", 10, NEST_BUILD[cm.type].accent);
}
rect(0, 0, VIEW_W, 40, "#080604");
text(16, 12, "COMIDA " + run.food, 12, "#ffd479");
text(200, 12, "TIETO DA DESPENSA " + nest.stats.foodCap, 12, "#ffb347");
text(470, 12, "POP " + units.popUsed() + "/" + units.popCapTotal(), 12, "#efe9ff");
rect(PIP.x, PIP.y, PIP.w, PIP.h, "#0d0a14", "#ffd479", 2);
text(PIP.x + 5, PIP.y + 2, "OLHO LÁ FORA (ROCHA-MÃE ABAIXO)", 11, "#ffd479");
rect(NEST_GRID.x + NEST_RESERVE.c0 * TILE, NEST_GRID.y + NEST_RESERVE.r0 * TILE,
  (NEST_RESERVE.c1 - NEST_RESERVE.c0 + 1) * TILE, (NEST_RESERVE.r1 - NEST_RESERVE.r0 + 1) * TILE, "none", "#6b4a24", 1);
rect(0, NEST_BOTTOM, VIEW_W, VIEW_H - NEST_BOTTOM, "#080604");
textC(VIEW_W / 2, NEST_BOTTOM + 8, "1 CAVAR  2 DESPENSA  3 BERCO  4 QUARTEL  5 FUNGARIO  6 MEMORIA  7 DEMOLIR", 12, "#efe9ff");
textC(VIEW_W / 2, NEST_BOTTOM + 30, "ARRASTE PARA MARCAR A OBRA  -  A TERRA CAVA NA FORCA DELAS, A CAMARA CRESCE NO TAMANHO DELAS", 11, "#b7a9d6");
textC(VIEW_W / 2, NEST_BOTTOM + 48, "B VOLTAR   L SAIR PELA BOCA   P CHAMAR PRA DENTRO   X CANCELAR", 11, "#8a7a5e");

const out = process.env.NESTMAP_OUT || path.join(tmpdir(), "formigueiro-layout.png");
execFileSync("convert", ["-size", `${VIEW_W}x${VIEW_H}`, "xc:#0b0704", ...A, out]);
console.log("corte:", COLS + "x" + ROWS, "| câmaras:", nest.comps.length,
  "| escavado:", nest.dug, "| olhos:", PIP.w + "x" + PIP.h + " em (" + PIP.x + "," + PIP.y + ") ->", out);

if (fs.existsSync(out)) ok("diagrama do corte gerado (" + Math.round(fs.statSync(out).size / 1024) + " KB)");
else bad("ImageMagick não escreveu o PNG do corte");

if (problems.length) { console.log("\n✗ NINHO ESCAVÁVEL (estrutura) — " + problems.length + " PROBLEMA(S)"); process.exit(1); }
console.log("\n✓ NINHO ESCAVÁVEL OK (estrutura) — grade, reserva, adjacência, área das câmaras e custos");
