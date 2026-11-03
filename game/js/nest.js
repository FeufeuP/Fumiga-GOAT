// ============================================================================
// FUMIGA — NINHO ESCAVÁVEL (corte top-down vivo)
//
// O formigueiro era um MENU disfarçado de cena: sete salas com coordenadas
// fixas, clique → nível sobe. Agora é TERRA DE VERDADE — uma grade top-down na
// mesma linguagem visual do mundo, onde nada existe antes de as formigas
// abrirem espaço:
//
//   1. VOCÊ PINTA A OBRA (ferramenta ESCAVAR, arrastando) — e só pode marcar um
//      tile encostado no que já está escavado. O ninho cresce como túnel, não
//      como catálogo.
//   2. ELAS CAVAM, DEPOIS CONSTRUÍM (ordem da colônia: escavar → construir →
//      carregar, como em Empires of the Undergrowth). Terra solta cede rápido;
//      terra firme, raiz e veio enterrado demoram — e o veio paga a obra na
//      hora (nódego = comida, cristal = essência).
//   3. CÂMARA = ÁREA, NÃO BOTÃO: tiles escavados + construídos do MESMO tipo e
//      CONTÍGUOS formam uma câmara. 3 tiles = nível 1, 6 = 2, 10 = 3.
//   4. TRÁFEGO COBRA: cada tile longe da boca demora mais para ser abastecido.
//      O multiplicador (×1,7 na boca → ×0,55 no fim do túnel) aparece na câmara
//      e na ficha do tile, porque a decisão interesting é ONDE escavar.
//   5. A COLÔNIA COME E É COMIDA: a despensa dá o TETO de estoque (o que passa
//      apodrece — game.js:worldTick); o berço dá POP e choca ovos, mas come
//      comida por formiga nata; sem enfermeira levando o ovo da Câmara Real ao
//      berço, nada nasce.
//
// A BOCA continua sendo a única porta (allies.inside em units.js), o rodízio de
// turnos continua, o mundo lá fora continua vivo e o "OLHO LÁ FORA" mostra
// isso. Só o INTERIOR mudou de natureza: de vitrine para obra.
//
// PROTÓTIPO (2026-10-20): a arte daqui é PROCEDURAL DE RESERVA — tiles pintados
// com a paleta e os acentos do jogo, sem nenhum PNG novo. A rodada de arte
// (papel recortado, Regras 6/16/17) vem depois de aprovar esta mecânica.
// ============================================================================
import {
  CHAMBERS, MAPS, PAL, VIEW_W, VIEW_H,
  NEST_GRID, NEST_RESERVE, NEST_SOIL, NEST_VEIN, NEST_BUILD, NEST_ROOM_IDS, NEST_RULES,
} from "./config.js";
import { G, mods } from "./state.js";
import { IMG, rotFrame, rotNativeSize } from "./assets.js";
import { drawOutsideEye, PIP } from "./render.js";
import { drawText, textWidth, fitTextBlock, fontScale, layoutBox } from "./font.js";
import { paperQuiet, beginPaperHud, endPaperHud, drawPaper, paperReady } from "./paper_hud.js";
import { button, panel, bar, isTouchUI } from "./ui.js";
import { mouse, pressed } from "./input.js";
import { world } from "./world.js";
import { SFX } from "./audio.js";
import {
  allies, spawnAnt, popUsed, popCapTotal, recomputeAllies,
  antExitNest, antEnterNest, insideCount, requestNestExit,
} from "./units.js";
import { colony } from "./brain.js";
import { clamp, rand, lerp, irand, TAU, mulberry32 } from "./utils.js";

// ------------------------------------------------------------- a grade ------
const TILE = NEST_GRID.tile, OX = NEST_GRID.x, OY = NEST_GRID.y;
const COLS = NEST_GRID.cols, ROWS = NEST_GRID.rows, NN = COLS * ROWS;
const K_ENT = NEST_ROOM_IDS.length;        // kinds: 0..4 = obras, 5 = boca, 6 = real
const K_ROYAL = NEST_ROOM_IDS.length + 1;
const GW = COLS * TILE, GH = ROWS * TILE;    // a caixa da grade em px virtuais

const idOf = (c, r) => r * COLS + c;
const colOf = (i) => i % COLS;
const rowOf = (i) => (i / COLS) | 0;
const cxOf = (i) => OX + colOf(i) * TILE + TILE / 2;
const cyOf = (i) => OY + rowOf(i) * TILE + TILE / 2;
const inGrid = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
function tileAt(x, y) {
  if (x < OX || y < OY) return -1;
  const c = ((x - OX) / TILE) | 0, r = ((y - OY) / TILE) | 0;
  return inGrid(c, r) ? idOf(c, r) : -1;
}
// os 4 vizinhos de cada tile, uma vez só: os laços de obra rodam todo quadro
const NB = new Int32Array(NN * 4);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const i = idOf(c, r), k = i * 4;
    NB[k] = c > 0 ? i - 1 : -1;
    NB[k + 1] = c < COLS - 1 ? i + 1 : -1;
    NB[k + 2] = r > 0 ? i - COLS : -1;
    NB[k + 3] = r < ROWS - 1 ? i + COLS : -1;
  }
}
// O canto superior direito é rocha-mãe: é ali que mora a janela "OLHO LÁ FORA",
// então aqueles tiles nunca são escaváveis (nem decorados com veio).
const reserveMask = new Uint8Array(NN);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (c >= NEST_RESERVE.c0 && c <= NEST_RESERVE.c1 && r >= NEST_RESERVE.r0 && r <= NEST_RESERVE.r1) {
      reserveMask[idOf(c, r)] = 1;
    }
  }
}

const BOTTOM = 392;                        // rodapé (faixa de obras + boca + dicas)
// Gaveta das obras (só no toque): 7 placas na faixa de cima do rodapé ficaram
// com ~104px de alvo em 844x390 — apertado para o dedo, e duas linhas fixas
// comeriam para sempre o campo onde se pinta. A gaveta abre as mesmas 7 sobre
// o campo, com alvo de 226px, e fecha na escolha (decisão do usuário 2026-10-21).
const DRAWER_Y = BOTTOM - 84, DRAWER_H = 76;
const rnd = (a, b) => a + Math.random() * (b - a);
const runRef = () => G.run;

// ------------------------------------------------------------------ estado ---
export const nest = {
  open: false,
  t: 0,
  ants: [],            // corpos de quem passou pela boca (espelha allies.inside)
  floats: [],          // números/textos flutuantes da cena
  bits: [],            // farelo de terra, brilhos
  eggs: [],            // ovos: nascem na Real, só chocam se chegarem ao berço
  larvae: [],          // larvas no berço (visual da criação)
  laidT: 3, growT: 16,
  deliveries: 0, dug: 0,
  statOnBar: true,                      // estatuto na barra (fonte grande) ou no rodapé (PC)
  hover: -1,           // tile sob o ponteiro
  tool: "dig",         // "dig" | id de NEST_ROOM_IDS | "erase"
  drawer: false,       // mobile: a gaveta das obras, aberta sobre o campo
  // ---- a grade
  key: "",
  soil: null, open_: null, room: null, plan: null, vein: null,
  dprog: null, bprog: null, crew: null, shade: null, marked: null,
  planFood: null, planEss: null,
  dist: null, comp: null,
  digQ: [], bldQ: [],
  comps: [],           // [{type, kind, lvl, n, tiles, dist, traffic, next, cx, cy}]
  entrance: -1, hall: -1, royal: -1,
  dirFlash: 0,
  dirtyDist: true, dirtyRooms: true,
  lastPaint: -1, thinkT: 0,
  stats: null,
};

// ------------------------------------------------------------- geração ------
/**
 * Desenha a terra: durezas em MANCHAS (não em grãos), veios enterrados e o poço
 * inicial já aberto — boca, vestíbulo e Câmara Real. Determinística: a mesma
 * seed+mapa devolve o mesmo ninho, como o mundo lá fora.
 */
function genNest() {
  const run = runRef();
  if (!run) return;
  const seed = run.seed | 0, mapIdx = run.mapIdx | 0;
  const key = seed + ":" + mapIdx;
  if (nest.key === key && nest.soil) return;
  nest.key = key;

  if (!nest.soil) {
    nest.soil = new Uint8Array(NN); nest.open_ = new Uint8Array(NN);
    nest.room = new Int8Array(NN).fill(-1); nest.plan = new Int8Array(NN).fill(-1);
    nest.vein = new Uint8Array(NN);
    nest.dprog = new Float32Array(NN); nest.bprog = new Float32Array(NN);
    nest.crew = new Uint8Array(NN); nest.shade = new Uint8Array(NN);
    nest.marked = new Uint8Array(NN);
    nest.planFood = new Int16Array(NN); nest.planEss = new Int16Array(NN);
    nest.dist = new Int16Array(NN); nest.comp = new Int16Array(NN).fill(-1);
  }
  const rng = mulberry32(seed + mapIdx * 977 + 4242);
  const h = new Float32Array(NN);
  for (let i = 0; i < NN; i++) h[i] = rng();
  const tmp = new Float32Array(NN);
  for (let pass = 0; pass < 2; pass++) {           // suaviza → manchas
    for (let i = 0; i < NN; i++) {
      let s = h[i], n = 1;
      for (let k = 0; k < 4; k++) { const j = NB[i * 4 + k]; if (j >= 0) { s += h[j]; n++; } }
      tmp[i] = s / n;
    }
    h.set(tmp);
  }
  let hn = 0;
  for (let i = 0; i < NN; i++) hn += h[i];
  hn /= NN;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idOf(c, r);
      nest.shade[i] = (rng() * SOIL_SHADE.length) | 0;
      // quanto mais fundo, mais briga com a terra
      const v = (h[i] - hn) * 1.9 + 0.5 + r * 0.028;
      let s;
      if (reserveMask[i] || r === ROWS - 1 || c === 0 || c === COLS - 1) s = 3;
      else if (v < 0.44) s = 0;
      else if (v < 0.70) s = 1;
      else if (v < 0.85) s = 2;
      else s = 3;
      nest.soil[i] = s;
      nest.open_[i] = 0; nest.room[i] = -1; nest.plan[i] = -1;
      nest.vein[i] = 0; nest.dprog[i] = 0; nest.bprog[i] = 0;
      nest.crew[i] = 0; nest.marked[i] = 0;
      nest.planFood[i] = 0; nest.planEss[i] = 0;
      nest.comp[i] = -1;
    }
  }
  // veios: comida e essência enterradas — explorar paga, esperar não
  const veins = 12 + mapIdx * 2;
  const srand = (a, b) => a + ((rng() * (b - a + 1)) | 0);   // mesma seed, mesmo subsolo
  for (let n = 0; n < veins; n++) {
    const kindId = rng() < 0.68 ? 1 : 2;
    let c = srand(2, COLS - 3), r = srand(1, ROWS - 2), tries = 0;
    while ((nest.soil[idOf(c, r)] === 3 || nest.vein[idOf(c, r)]) && tries++ < 24) {
      c = srand(2, COLS - 3); r = srand(1, ROWS - 2);
    }
    const size = 2 + ((rng() * 3) | 0);
    for (let k = 0; k < size; k++) {
      c = clamp(c, 1, COLS - 2); r = clamp(r, 1, ROWS - 2);
      const j = idOf(c, r);
      if (nest.soil[j] !== 3 && !nest.vein[j]) nest.vein[j] = kindId;
      if (rng() < 0.5) c += rng() < 0.5 ? -1 : 1; else r += rng() < 0.5 ? -1 : 1;
    }
  }
  // ---- o que a colônia já abriu antes de você chegar
  const c0 = (COLS >> 1) - 1;
  const carve = (cA, cB, rA, rB, kind) => {
    for (let r = Math.max(0, rA); r <= Math.min(ROWS - 1, rB); r++) {
      for (let c = Math.max(1, cA); c <= Math.min(COLS - 2, cB); c++) {
        const i = idOf(c, r);
        if (reserveMask[i]) continue;
        nest.open_[i] = 1; nest.soil[i] = 1; nest.vein[i] = 0;
        nest.room[i] = kind;
      }
    }
  };
  carve(c0, c0 + 1, 0, 3, K_ENT);                       // a BOCA e o poço
  carve(c0 - 4, c0 + 5, 4, 5, -1);                      // vestíbulo da colônia
  carve(c0, c0 + 1, 6, 7, -1);                          // descida
  carve(c0 - 3, c0 + 2, 8, 10, K_ROYAL);                // Câmara Real
  nest.entrance = idOf(c0, 0);
  nest.hall = idOf(clamp(c0, 1, COLS - 2), 4);
  nest.royal = idOf(clamp(c0, 1, COLS - 2), 9);
  // dois nós de sementes bem perto da partida: a primeira obra tem que pagar
  for (const [dc, dr] of [[-8, 1], [8, 2]]) {
    for (let k = 0; k < 3; k++) {
      const c = clamp(c0 + dc + (k % 2), 1, COLS - 2), r = clamp(6 + dr + ((k / 2) | 0), 1, ROWS - 2);
      const j = idOf(c, r);
      if (nest.soil[j] !== 3 && !nest.open_[j] && !reserveMask[j]) nest.vein[j] = 1;
    }
  }
  nest.digQ.length = 0; nest.bldQ.length = 0;
  nest.comps.length = 0;
  nest.dug = 0;
  nest.eggs.length = 0;
  nest.laidT = 3; nest.growT = 16;
  nest.dirtyDist = true; nest.dirtyRooms = true;
  nest.ants.length = 0;
  recomputeAll();
  // as formigas que já estavam dentro voltam para o corpo certo
  syncAnts(true);
}

// ------------------------------------------------------------- distância ----
/** BFS de tiles abertos a partir da BOCA: é o metro do tráfego e do caminho. */
const bfsPrev = new Int32Array(NN);
function rebuildDist() {
  const d = nest.dist;
  if (!d) return;
  d.fill(-1);
  if (nest.entrance < 0) { nest.dirtyDist = false; return; }
  const q = [nest.entrance];
  d[nest.entrance] = 0;
  for (let head = 0; head < q.length; head++) {
    const i = q[head], base = i * 4;
    for (let k = 0; k < 4; k++) {
      const j = NB[base + k];
      if (j < 0 || d[j] >= 0 || !nest.open_[j]) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  nest.dirtyDist = false;
}

/** Caminho real (BFS) do tile atual até `to`; devolve a lista de tiles ou null. */
function pathTo(from, to) {
  if (from < 0 || to < 0 || !nest.dist) return null;
  if (from === to) return [to];
  bfsPrev.fill(-1);
  const q = [from];
  bfsPrev[from] = from;
  let found = false;
  for (let head = 0; head < q.length && !found; head++) {
    const i = q[head], base = i * 4;
    for (let k = 0; k < 4; k++) {
      const j = NB[base + k];
      if (j < 0 || bfsPrev[j] >= 0 || (!nest.open_[j] && j !== to)) continue;
      bfsPrev[j] = i;
      if (j === to) { found = true; break; }
      q.push(j);
    }
  }
  if (!found) return null;
  const out = [];
  let cur = to, guard = 0;
  while (cur !== from && cur >= 0 && guard++ <= NN) { out.push(cur); cur = bfsPrev[cur]; }
  out.reverse();
  return out;
}

/** Tráfego: trabalhar perto da boca rende; no fim do túnel, não. */
function trafficAt(i) {
  const d = i >= 0 && nest.dist ? nest.dist[i] : -1;
  if (d < 0) return 0.35;
  const t = clamp((d - NEST_RULES.trafficGood) / (NEST_RULES.trafficBad - NEST_RULES.trafficGood), 0, 1);
  return 1.7 - t * (1.7 - 0.55);
}
/** O tile onde se trabalha uma obra: o vizinho ABERTO mais perto da boca. */
function standTileFor(i) {
  let best = -1, bd = 1e9;
  for (let k = 0; k < 4; k++) {
    const j = NB[i * 4 + k];
    if (j < 0 || !nest.open_[j]) continue;
    const d = nest.dist ? nest.dist[j] : 999;
    if (d >= 0 && d < bd) { bd = d; best = j; }
  }
  return best;
}

// --------------------------------------------------------------- câmaras ----
const compStack = new Int32Array(NN);
/**
 * Recompõe as câmaras: componentes 4-vizinhos do MESMO tipo. Nível vem do
 * tamanho (NEST_BUILD[].sizes) e o que a colônia ganha é publicado em
 * run.nestStats + run.chambers — este último continua sendo o contrato lido por
 * units.js/game.js, para não existir regra de bônus em dois lugares.
 */
function recomputeChambers() {
  const run = runRef();
  if (!run || !nest.room) return;
  nest.comps.length = 0;
  nest.comp.fill(-1);
  const tilesOf = {};
  for (const id of NEST_ROOM_IDS) tilesOf[id] = 0;
  let cid = 0;
  for (let i = 0; i < NN; i++) {
    const kind = nest.room[i];
    if (kind < 0 || kind >= NEST_ROOM_IDS.length || nest.comp[i] >= 0) continue;
    const type = NEST_ROOM_IDS[kind];
    let top = 0, n = 0;
    compStack[top++] = i; nest.comp[i] = cid;
    const tiles = [];
    let cA = COLS, cB = 0, rA = ROWS, rB = 0, dMin = 1e9;
    for (let hh = 0; hh < top; hh++) {
      const t = compStack[hh];
      tiles.push(t);
      const c = colOf(t), r = rowOf(t);
      if (c < cA) cA = c; if (c > cB) cB = c;
      if (r < rA) rA = r; if (r > rB) rB = r;
      const dd = nest.dist ? nest.dist[t] : -1;
      if (dd >= 0 && dd < dMin) dMin = dd;
      for (let k = 0; k < 4; k++) {
        const j = NB[t * 4 + k];
        if (j < 0 || nest.comp[j] >= 0 || nest.room[j] !== kind) continue;
        nest.comp[j] = cid; compStack[top++] = j;
      }
    }
    n = tiles.length;
    const sizes = NEST_BUILD[type].sizes;
    let lvl = 0;
    for (let s = 0; s < sizes.length; s++) if (n >= sizes[s]) lvl = s + 1;
    if (lvl < 1) {                            // ainda não é câmara: é piso solto
      for (const t of tiles) nest.comp[t] = -1;
      continue;
    }
    tilesOf[type] += n;
    nest.comps.push({
      id: cid, type, kind, lvl, tiles, n,
      cA, cB, rA, rB,
      cx: (cA + cB + 1) / 2 * TILE + OX, cy: (rA + rB + 1) / 2 * TILE + OY,
      dist: dMin > 1e8 ? -1 : dMin,
      traffic: trafficAt(tiles[0]),
      next: lvl < sizes.length ? sizes[lvl] - n : 0,
    });
    cid++;
  }
  if (!run.chambers) run.chambers = { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 };
  const lvlMult = {};
  for (const id of NEST_ROOM_IDS) run.chambers[id] = 0;
  for (const cm of nest.comps) {
    if (cm.lvl > run.chambers[cm.type]) run.chambers[cm.type] = cm.lvl;
    lvlMult[cm.type] = 1 + 0.25 * (cm.lvl - 1);
  }
  const tr = (type) => {
    let v = 0, k = 0;
    for (const cm of nest.comps) if (cm.type === type) { v += cm.traffic; k++; }
    return k ? clamp(v / k, 0.4, 1.7) : 1;
  };
  const stats = {
    tiles: tilesOf,
    comps: nest.comps.length,
    foodCap: NEST_RULES.capBase + NEST_RULES.capPerTile * tilesOf.pantry,
    pantryMult: clamp(1 + NEST_RULES.pantryPer * tilesOf.pantry * (lvlMult.pantry || 1), 1, 1.9),
    pantryTraffic: tr("pantry"),
    popBonus: Math.floor(tilesOf.nursery * NEST_RULES.popPerTile),
    hatchMult: clamp(1 + NEST_RULES.hatchPerTile * tilesOf.nursery * (lvlMult.nursery || 1), 1, 2.4),
    healMult: clamp(1 + NEST_RULES.healPerTile * tilesOf.barracks, 1, 2.6),
    dmgMult: clamp(1 + NEST_RULES.dmgPerTile * tilesOf.barracks, 1, 1.5),
    essMult: clamp(1 + NEST_RULES.essPerTile * tilesOf.refinery * (lvlMult.refinery || 1), 1, 1.9),
    fungusCrop: Math.round(NEST_RULES.fungusPerTile * tilesOf.fungus * (lvlMult.fungus || 1) * tr("fungus")),
    digWorkers: 0,
  };
  run.nestStats = stats;
  nest.stats = stats;
  nest.dirtyRooms = false;
}

function recomputeAll() {
  rebuildDist();
  recomputeChambers();
}

// --------------------------------------------------------------- custos -----
/** Custo da PRIMEIRA PEDRA de uma câmara (desconto da PLANTA ECONÔMICA incluso). */
export function chamberCost(id, lvl) {
  const c = CHAMBERS[id].costs[lvl];
  const mult = mods().chamberCost || 1;
  if (mult >= 1) return c;
  return { food: Math.round(c.food * mult), ess: Math.round(c.ess * mult) };
}
/** Custo de cada tile da obra (o mesmo desconto se aplica). */
export function tileCost(id) {
  const b = NEST_BUILD[id];
  if (!b) return { food: 0, ess: 0 };
  const d = mods().chamberCost || 1;
  return { food: Math.max(1, Math.round(b.tile.food * d)), ess: Math.round(b.tile.ess * d) };
}
/** Cada câmara EXTRA do mesmo tipo é redundância, não escalada: +60% por vez. */
export function openCost(id) {
  const base = chamberCost(id, 0);
  const same = nest.comps.filter((cm) => cm.type === id).length;
  const mult = Math.pow(NEST_RULES.extraChamberMult, same);
  return { food: Math.round(base.food * mult), ess: Math.round(base.ess * mult) };
}

function chamberState(id) {
  const run = runRef();
  const def = CHAMBERS[id];
  const lvl = run && run.chambers ? run.chambers[id] : 0;
  const tiles = run && run.nestStats ? run.nestStats.tiles[id] : 0;
  const sizes = NEST_BUILD[id].sizes;
  const maxed = lvl >= def.max;
  const cost = maxed ? null : tileCost(id);
  const infMoney = !!(run && run.testPowers && run.testPowers.infMoney);
  const afford = !maxed && run && (infMoney || (run.food >= cost.food && run.essencePool >= cost.ess));
  return { def, lvl, maxed, tiles, cost, afford, need: maxed ? 0 : Math.max(0, sizes[Math.min(lvl, sizes.length - 1)] - tiles) };
}

// ------------------------------------------------------------- entra/sai ----
export function nestEnter() {
  nest.open = true;
  nest.t = 0;
  nest.floats.length = 0;
  nest.bits.length = 0;
  nest.hover = -1;
  nest.lastPaint = -1;
  genNest();
  syncAnts(true);
}

export function nestExit() {
  nest.open = false;
  // quem está dentro CONTINUA dentro (e continua trabalhando quando o jogador
  // voltar). O roster nunca mais é zerado aqui.
}

/**
 * Espelha o ROSTER REAL do formigueiro (allies.inside, de units.js) — quem
 * entrou pela boca vira uma formiga da cena de dentro; quem saiu, some daqui.
 */
function syncAnts(force = false) {
  if (force) {
    nest.ants.length = 0;
    if (nest.crew) nest.crew.fill(0);
  }
  if (!nest.soil) return;
  const roster = allies.inside || [];
  if (!force) {
    for (let i = nest.ants.length - 1; i >= 0; i--) {
      const a = roster.find((r) => r.id === nest.ants[i].id);
      if (!a) { releaseTask(nest.ants[i]); nest.ants.splice(i, 1); }
    }
  }
  for (const a of roster) {
    if (a.dead || a.dying) continue;
    if (nest.ants.some((n) => n.id === a.id)) continue;
    if (nest.ants.length >= 30) break;   // o resto fica "no fundo do túnel"
    nest.ants.push(makeNestAnt(a));
  }
}

function jobFor(type) {
  if (type === "worker" || type === "gatherer") return "carrier";
  if (type === "healer") return "nurse";
  if (type === "giant") return "colossus";
  return "guard";
}

function makeNestAnt(a) {
  const t = nest.entrance >= 0 ? nest.entrance : 0;
  const n = {
    id: a.id, type: a.type, job: jobFor(a.type), sprite: a.def ? a.def.sprite : a.type,
    x: cxOf(t) + rnd(-7, 7), y: cyOf(t) + rnd(-5, 5),
    angle: rnd(0, TAU), bob: rnd(0, 6.28), speed: rnd(46, 58) * (mods().nestSpeed || 1),
    tile: t, path: null, leg: 0, task: null,
    carry: 0, workT: 0, t: rnd(0, 3), scale: 0,
    leaving: false, leaveT: 0,
  };
  // o colosso não passa nos túneis: fica de folga onde estiver
  return n;
}

// ------------------------------------------------------------------- rotas ---
function setPath(n, to) {
  if (to < 0) { n.path = null; return false; }
  const p = pathTo(n.tile >= 0 ? n.tile : nest.entrance, to);
  if (!p || !p.length) { n.path = null; return false; }
  n.path = p; n.leg = 0;
  return true;
}

/** Anda tile a tile na trilha. Devolve true quando chega. */
function stepAlong(n, dt, mult = 1) {
  const speed = n.speed * mult * (n.carry ? 0.8 : 1);
  let move = speed * dt;
  if (n.path && n.leg < n.path.length) {
    let guard = 0;
    while (move > 0 && n.leg < n.path.length && guard++ < 24) {
      const t = n.path[n.leg];
      const px = cxOf(t), py = cyOf(t);
      const dx = px - n.x, dy = py - n.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.2) { n.x = px; n.y = py; n.tile = t; n.leg++; continue; }
      n.angle = Math.atan2(dy, dx);
      const step = Math.min(d, move);
      n.x += (dx / d) * step; n.y += (dy / d) * step;
      move -= step;
    }
    if (n.leg >= n.path.length) { n.path = null; n.leg = 0; return true; }
    return false;
  }
  // sem trilha: respira no lugar (folga / patrulha curta)
  if (n.tile >= 0) {
    n.x = lerp(n.x, cxOf(n.tile), clamp(move * 0.08, 0, 1));
    n.y = lerp(n.y, cyOf(n.tile), clamp(move * 0.08, 0, 1));
  }
  return true;
}

// ------------------------------------------------------------- fila da boca --
function pickupExitQueue() {
  if (!nest.soil) return;
  for (const a of allies.inside || []) {
    if (!a.exitRequested || a.dead || a.dying || a.doorT > 0) continue;
    let n = nest.ants.find((v) => v.id === a.id);
    if (!n) {
      if (nest.ants.length >= 30) continue;      // sem corpo visível: espera vaga
      n = makeNestAnt(a);
      nest.ants.push(n);
    }
    if (!n.leaving) {
      n.leaving = true; n.leaveT = 0; n.carry = 0; n.job = "runner";
      releaseTask(n);
      n.path = null;
    }
  }
}

function releaseTask(n) {
  if (n.task && nest.crew) {
    nest.crew[n.task.i] = Math.max(0, nest.crew[n.task.i] - 1);
    n.task = null;
  }
}

function stepLeaving(n, dt) {
  n.leaveT = (n.leaveT || 0) + dt;
  if (n.tile === nest.entrance && !n.path) {
    const a = (allies.inside || []).find((r) => r.id === n.id);
    n.leaving = false;
    if (a && !a.dead && !a.dying) {
      dustOut(n);
      antExitNest(a);
      float(cxOf(nest.entrance), cyOf(nest.entrance) - 22, "PELA BOCA!", "#ffd479", 1.4);
    } else {
      const i = nest.ants.indexOf(n);
      if (i >= 0) nest.ants.splice(i, 1);
    }
    return;
  }
  if (n.leaveT > 15) {                 // rede de segurança: sem caminho, sobe direto
    const a = (allies.inside || []).find((v) => v.id === n.id);
    n.leaving = false;
    if (a && !a.dead && !a.dying) antExitNest(a);
    const i = nest.ants.indexOf(n);
    if (i >= 0) nest.ants.splice(i, 1);
    return;
  }
  if (!n.path && !setPath(n, nest.entrance)) {   // sem túnel para a boca: cai na fila de lá
    const a = (allies.inside || []).find((v) => v.id === n.id);
    if (a && !a.dead && !a.dying) antExitNest(a);
    const i = nest.ants.indexOf(n);
    if (i >= 0) nest.ants.splice(i, 1);
  } else stepAlong(n, dt, 1.25);
}

// ------------------------------------------------------------------- obras ---
function taskStillWants(i, kind) {
  if (i < 0 || !nest.soil) return false;
  return kind === "dig" ? (!nest.open_[i] && nest.marked[i]) : (nest.plan[i] >= 0 && nest.bprog[i] < 1);
}

/** A obra mais perto que ainda tenha vaga (2 formigas por tile, como na EOTU). */
function pickTask(n) {
  const max = NEST_RULES.crewPerTile;
  let best = -1, bd = 1e9, bk = "dig";
  const scan = (arr, kind) => {
    for (let k = arr.length - 1; k >= 0; k--) {
      const i = arr[k];
      if (!taskStillWants(i, kind)) { arr.splice(k, 1); if (kind === "dig") nest.marked[i] = 0; continue; }
      if (nest.crew[i] >= max) continue;
      const st = standTileFor(i);
      if (st < 0) continue;                        // sem como alcançar: espera
      const d = Math.hypot(cxOf(st) - n.x, cyOf(st) - n.y);
      if (d < bd) { bd = d; best = i; bk = kind; }
    }
  };
  scan(nest.digQ, "dig");
  if (best < 0) scan(nest.bldQ, "build");          // escavar primeiro, construir depois
  return best < 0 ? null : { i: best, kind: bk };
}

function assignJobs() {
  if (!nest.soil) return;
  const work = nest.digQ.length + nest.bldQ.length;
  let diggers = 0;
  for (const n of nest.ants) if (n.job === "digger" && !n.leaving) diggers++;
  const cap = Math.min(NEST_RULES.maxDiggers, work * NEST_RULES.crewPerTile);
  for (const n of nest.ants) {
    if (n.leaving) continue;
    if (n.task && !taskStillWants(n.task.i, n.task.kind)) { releaseTask(n); n.path = null; }
    if (n.task) { n.job = "digger"; continue; }
    if (work === 0) { if (n.job === "digger") n.job = jobFor(n.type); continue; }
    if (diggers >= cap) { if (n.job === "digger") n.job = jobFor(n.type); continue; }
    const t = pickTask(n);
    if (!t) continue;
    const st = standTileFor(t.i);
    if (st < 0 || !setPath(n, st)) continue;
    n.task = t; nest.crew[t.i]++; n.job = "digger";
    diggers++;
  }
  if (nest.stats) nest.stats.digWorkers = diggers;
}

/** Cada Tecelã viva (até 3) repara as galerias: escavação e obra mais rápidas. */
function weaverBoost() {
  return 1 + 0.12 * Math.min(3, colony.counts.weaver || 0) * (mods().weaverBoost || 1);
}

function workTick(n, dt) {
  const t = n.task;
  if (!t) return;
  if (!taskStillWants(t.i, t.kind)) { releaseTask(n); n.path = null; return; }
  const st = standTileFor(t.i);
  if (st < 0) { releaseTask(n); n.path = null; return; }
  if (n.tile !== st) {
    if (!n.path) setPath(n, st);
    stepAlong(n, dt);
    if (n.tile !== st) return;
  }
  const m = mods();
  const crowd = 1 + 0.16 * Math.max(0, (nest.crew[t.i] || 0) - 1);
  const rate = dt * m.digSpeed * crowd * weaverBoost() * trafficAt(n.tile);
  if (t.kind === "dig") {
    const hard = NEST_SOIL[nest.soil[t.i]].hard || 1;
    nest.dprog[t.i] += (rate * NEST_RULES.digRate) / hard;
    if (Math.random() < dt * 12) {
      nest.bits.push({
        x: cxOf(t.i) + rnd(-8, 8), y: cyOf(t.i) + rnd(-6, 6),
        vx: rnd(-14, 14), vy: rnd(-30, -8), life: rnd(0.35, 0.8), max: 0.8,
        color: "#6b4a24", size: rnd(1, 2.2),
      });
    }
    if (nest.dprog[t.i] >= 1) finishDig(t.i, n);
  } else {
    nest.bprog[t.i] += rate * NEST_RULES.buildRate;
    if (Math.random() < dt * 7) {
      nest.bits.push({
        x: cxOf(t.i) + rnd(-8, 8), y: cyOf(t.i) + rnd(-8, 4), vx: rnd(-8, 8), vy: rnd(-18, -4),
        life: rnd(0.3, 0.6), max: 0.6, color: "#ffd479", size: rnd(1, 1.8),
      });
    }
    if (nest.bprog[t.i] >= 1) finishBuild(t.i, n);
  }
}

function finishDig(i, n) {
  nest.dprog[i] = 0;
  nest.open_[i] = 1;
  nest.marked[i] = 0;
  nest.crew[i] = 0;
  const k = nest.digQ.indexOf(i);
  if (k >= 0) nest.digQ.splice(k, 1);
  if (n) { n.task = null; n.tile = i; n.x = cxOf(i); n.y = cyOf(i); n.path = null; }
  nest.dug++;
  nest.dirtyDist = true; nest.dirtyRooms = true;
  const v = nest.vein[i];
  if (v) {
    const vd = NEST_VEIN[v];
    const run = runRef();
    const amt = Math.max(1, Math.round(vd.yield * (0.8 + Math.random() * 0.5)));
    if (run) { if (vd.kind === "food") run.food += amt; else run.essencePool += amt; }
    float(cxOf(i), cyOf(i) - 10, "+" + amt + (vd.kind === "food" ? " COMIDA" : " ESSÊNCIA"), vd.color, 1.6);
    nest.vein[i] = 0;
    SFX.coin();
  } else if (Math.random() < 0.4) SFX.whoosh();
}

function finishBuild(i, n) {
  const kind = nest.plan[i];
  nest.plan[i] = -1; nest.bprog[i] = 0; nest.crew[i] = 0;
  nest.planFood[i] = 0; nest.planEss[i] = 0;
  if (kind >= 0) nest.room[i] = kind;
  const k = nest.bldQ.indexOf(i);
  if (k >= 0) nest.bldQ.splice(k, 1);
  if (n) { n.task = null; n.path = null; }
  nest.dirtyRooms = true;
  recomputeChambers();
  recomputeAllies();
  if (kind >= 0 && kind < NEST_ROOM_IDS.length) {
    const type = NEST_ROOM_IDS[kind];
    const cm = nest.comps.find((c) => c.tiles.indexOf(i) >= 0);
    if (cm && cm.n === NEST_BUILD[type].sizes[cm.lvl - 1]) {
      float(cm.cx, cm.cy - 12, CHAMBERS[type].name + " NÍVEL " + cm.lvl, NEST_BUILD[type].accent, 2.2);
      SFX.chime();
    } else if (Math.random() < 0.5) SFX.honey();
  }
}

// --------------------------------------------------------------- marcar -----
/** Só se cava o que encosta no que já está aberto — o ninho cresce como túnel. */
function canDig(i) {
  if (i < 0 || nest.open_[i] || nest.marked[i]) return false;
  if (NEST_SOIL[nest.soil[i]].hard <= 0) return false;
  for (let k = 0; k < 4; k++) { const j = NB[i * 4 + k]; if (j >= 0 && nest.open_[j]) return true; }
  return false;
}

function isExtension(i, kind) {
  for (let k = 0; k < 4; k++) {
    const j = NB[i * 4 + k];
    if (j >= 0 && (nest.room[j] === kind || nest.plan[j] === kind)) return true;
  }
  return false;
}

/** Aplica a ferramenta corrente num tile (toque único ou arraste). */
function paint(i) {
  const run = runRef();
  if (i < 0 || !nest.soil || !run) return false;
  const infMoney = !!(run.testPowers && run.testPowers.infMoney);
  if (nest.tool === "erase") return eraseAt(i, run);
  if (nest.tool === "dig") {
    if (nest.open_[i]) return false;
    if (!canDig(i)) {
      float(cxOf(i), cyOf(i) - 8, NEST_SOIL[nest.soil[i]].hard <= 0
        ? "ROCHA-MÃE: ELAS NÃO PASSAM" : "SÓ JUNTO DO QUE JÁ ESTÁ ABERTO", "#ff8a96", 1.5);
      SFX.deny();
      return false;
    }
    nest.marked[i] = 1;
    nest.digQ.push(i);
    SFX.chomp();
    return true;
  }
  const kind = NEST_ROOM_IDS.indexOf(nest.tool);
  if (kind < 0) return false;
  if (!nest.open_[i]) { float(cxOf(i), cyOf(i) - 8, "PRIMEIRO CAVAR, DEPOIS CONSTRUIR", "#ff8a96", 1.5); SFX.deny(); return false; }
  if (nest.room[i] >= 0 || nest.plan[i] >= 0) return false;
  const ext = isExtension(i, kind);
  const cost = ext ? tileCost(nest.tool) : openCost(nest.tool);
  if (!infMoney && (run.food < cost.food || run.essencePool < cost.ess)) {
    float(cxOf(i), cyOf(i) - 8, run.food < cost.food ? "FALTA COMIDA" : "FALTA ESSÊNCIA", "#ff4d5a", 1.4);
    SFX.deny();
    return false;
  }
  if (!infMoney) { run.food -= cost.food; run.essencePool -= cost.ess; }
  nest.plan[i] = kind; nest.bprog[i] = 0;
  nest.planFood[i] = infMoney ? 0 : cost.food;
  nest.planEss[i] = infMoney ? 0 : cost.ess;
  nest.bldQ.push(i);
  if (!ext) float(cxOf(i), cyOf(i) - 8, "PRIMEIRA PEDRA DE " + CHAMBERS[nest.tool].name, NEST_BUILD[nest.tool].accent, 1.6);
  SFX[ext ? "pickup" : "buy"]();
  return true;
}

function eraseAt(i, run) {
  if (nest.marked[i]) {
    nest.marked[i] = 0; nest.dprog[i] = 0;
    const k = nest.digQ.indexOf(i);
    if (k >= 0) nest.digQ.splice(k, 1);
    for (const n of nest.ants) if (n.task && n.task.i === i && n.task.kind === "dig") { releaseTask(n); n.path = null; }
    return true;
  }
  if (nest.plan[i] >= 0) {
    const started = nest.bprog[i] > 0;
    const f = nest.planFood[i], e = nest.planEss[i];
    nest.plan[i] = -1; nest.bprog[i] = 0; nest.planFood[i] = 0; nest.planEss[i] = 0;
    const k = nest.bldQ.indexOf(i);
    if (k >= 0) nest.bldQ.splice(k, 1);
    for (const n of nest.ants) if (n.task && n.task.i === i && n.task.kind === "build") { releaseTask(n); n.path = null; }
    if (!started && (f || e)) {
      run.food += f; run.essencePool += e;
      float(cxOf(i), cyOf(i) - 8, "PLANO DESFEITO: " + f + " COMIDA DE VOLTA", "#8fd3ff", 1.4);
    } else if (started) {
      // 2026-10-21: desfazer planta não pode ser de graça (o trabalho delas já
      // andou), mas perder 100% transformava erro de clique em castigo. Devolve
      // NEST_RULES.refundBuilt do que foi pago.
      const rf = Math.round(f * NEST_RULES.refundBuilt), re = Math.round(e * NEST_RULES.refundBuilt);
      if (rf || re) {
        run.food += rf; run.essencePool += re;
        float(cxOf(i), cyOf(i) - 8, "OBRA PELA METADE: " + rf + " COMIDA DE VOLTA", "#8fd3ff", 1.5);
      } else {
        float(cxOf(i), cyOf(i) - 8, "OBRA PELA METADE: NADA A DEVOLVER", "#ff8a96", 1.4);
      }
    }
    return true;
  }
  if (nest.room[i] >= 0) { float(cxOf(i), cyOf(i) - 8, "TIRE OS TILES DO LADO PARA ENCOLHER A CÂMARA", "#b7a9d6", 1.5); return true; }
  return false;
}

// teclado das ferramentas + pintura por arraste (PC e toque pelo mesmo caminho)
const TOOL_KEYS = {
  Digit1: "dig", Digit2: "pantry", Digit3: "nursery", Digit4: "barracks",
  Digit5: "fungus", Digit6: "refinery", Digit7: "erase",
  KeyX: "erase",          // 2026-10-21: o rótulo da placa já dizia "X", mas a tecla
};                        // era só Digit7. Agora as duas demolhem, e a placa fala a verdade.
function nestInput() {
  for (const k in TOOL_KEYS) {
    if (pressed[k] && nest.tool !== TOOL_KEYS[k]) { nest.tool = TOOL_KEYS[k]; SFX.uiClick(); }
  }
  // "pressionado" aqui inclui o TOQUE CURTO: no celular o par down/up pode caber
  // inteiro entre dois frames (mouse.down nunca é visto), e exigir o botão
  // pressionado perdia qualquer toque que não virasse arraste.
  const press = mouse.justDown || mouse.down;
  if (isTouchUI() && nest.drawer && mouse.y >= DRAWER_Y - 12 && mouse.y <= DRAWER_Y + DRAWER_H + 8) return;
  const inField = mouse.y >= OY - 2 && mouse.y < OY + ROWS * TILE + 2;
  if (press && inField) {
    const i = tileAt(mouse.x, mouse.y);
    if (i >= 0 && i !== nest.lastPaint) {
      nest.lastPaint = i;
      // a BOCA é a boca: com a ferramenta de escavação, tocar no poço solta uma
      if (nest.room[i] === K_ENT && nest.tool === "dig") { if (nestLeaveOne(1)) return; }
      paint(i);
      return;
    }
  } else if (!mouse.down) nest.lastPaint = -1;
}

// ------------------------------------------------------------------ update ---
/**
 * Update da cena de dentro. Ela roda SEMPRE — mesmo com o jogador lá fora —
 * porque obra parada é obra atrasada: quem está no ninho cava, constrói, leva
 * comida ao Ventre e acompanha o ovo da Real até o berço.
 */
export function nestUpdate(dt, visible = true) {
  const run = runRef();
  if (!run) return;
  genNest();
  nest.t += dt;
  if (nest.dirFlash > 0) nest.dirFlash = Math.max(0, nest.dirFlash - dt);
  syncAnts();
  pickupExitQueue();
  if (nest.dirtyDist) rebuildDist();

  nest.thinkT -= dt;
  if (nest.thinkT <= 0) { nest.thinkT = 0.2; assignJobs(); }
  for (const n of nest.ants) if (n.job === "digger" && n.task && !n.leaving) workTick(n, dt);
  if (nest.dirtyRooms) recomputeChambers();
  if (nest.open) nestInput();

  const pantry = nest.comps.filter((cm) => cm.type === "pantry");
  for (const n of nest.ants) {
    n.t += dt;
    n.bob += dt * (n.path ? 8 : 2);
    if (n.leaving) { stepLeaving(n, dt); continue; }
    if (n.job === "digger") continue;                 // já trabalhou em workTick
    if (n.job === "colossus") { n.angle = lerp(n.angle, 1.2, 0.02); continue; }
    if (n.job === "carrier") { carrierTick(n, dt, pantry); continue; }
    if (n.job === "nurse") { nurseTick(n, dt, nurseryComp()); continue; }
    if (stepAlong(n, dt, 0.7)) {                      // guarda: patrulha boca ↔ quartel
      if (n.t > rand(2.4, 4.2)) {
        n.t = 0;
        const q = nest.comps.filter((cm) => cm.type === "barracks")[0];
        const target = q && Math.random() < 0.6 ? q.tiles[irand(0, q.tiles.length - 1)]
          : (Math.random() < 0.5 ? nest.entrance : nest.hall);
        if (!setPath(n, target)) n.tile = nest.hall;
      }
    }
  }

  // ---- a rainha bota ovos na Câmara Real
  const eggMax = 2 + Math.min(4, (run.chambers.nursery || 0) * 2);
  if (nest.eggs.length < eggMax) {
    nest.laidT -= dt * trafficAt(nest.royal);
    if (nest.laidT <= 0) {
      nest.laidT = rand(5.5, 8.5) * (mods().nestEgg || 1);
      nest.eggs.push({
        t: 0, x: cxOf(nest.royal) + rnd(-20, 20), y: cyOf(nest.royal) + rnd(-8, 14),
        at: nest.royal, carried: false,
      });
      SFX.egg();
    }
  }
  for (const e of nest.eggs) e.t += dt;

  // ---- chocagem: come comida de verdade, precisa de berço e de ovo levado até ele
  const st = nest.stats;
  if (st && st.tiles.nursery > 0) {
    const ready = nest.eggs.filter((e) => e.carried);
    nest.growT -= dt * st.hatchMult * (1 + 0.18 * (run.chambers.nursery || 0)) * (mods().nurserySpeed || 1);
    if (nest.growT <= 0) {
      nest.growT = 16;
      const cost = NEST_RULES.hatchFood;
      const infAnts = !!(run.testPowers && run.testPowers.infAnts);
      if (!ready.length) nest.growT = 1.2;             // sem ovo no berço: espera curto
      else if (popUsed() >= popCapTotal()) hint(cxOf(nest.hall), "SEM VAGA NO POP — O BERÇO ESTÁ PARADO", "#ff8a96");
      else if (!infAnts && run.food < cost + 40) hint(cxOf(nest.hall), "O BERÇO SÓ CHOCA COM COMIDA SOBRANDO", "#ff8a96");
      else {
        if (!infAnts) run.food -= cost;
        nest.eggs.splice(nest.eggs.indexOf(ready[0]), 1);
        const A = world.anthill;
        const a = spawnAnt("worker", A.x + rand(-40, 40), A.y + rand(-40, 40), { spawnT: 0.34 });
        nest.ants.push(makeNestAnt(a));
        if (nest.larvae.length > 4) nest.larvae.pop();
        nest.larvae.push({ i: nest.larvae.length, t: rand(0, 6.28), born: 0 });
        hint(cxOf(nest.hall), "NOVA CORTADEIRA! -" + cost + " COMIDA", "#7fd6a0", 2.0);
        SFX.hatch();
      }
    }
  }

  // ---- quartel cuida de quem está dentro
  if (st && st.tiles.barracks > 0) {
    const heal = 0.9 * st.healMult;
    for (const a of allies) {
      if (!a.inside || a.dead || a.dying || a.type === "queen") continue;
      if (a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + heal * dt);
    }
  }

  for (let i = nest.bits.length - 1; i >= 0; i--) {
    const b = nest.bits[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 40 * dt;
    if (b.life <= 0) nest.bits.splice(i, 1);
  }
  for (let i = nest.floats.length - 1; i >= 0; i--) {
    const f = nest.floats[i];
    f.life -= dt; f.y -= dt * 16;
    if (f.life <= 0) nest.floats.splice(i, 1);
  }
  void visible;
}

function nurseryComp() {
  for (const cm of nest.comps) if (cm.type === "nursery") return cm;
  return null;
}

/** Carregadora: boca → despensa (entrega) → boca. Sem despensa, a carga azeda. */
function carrierTick(n, dt, pantry) {
  const run = runRef();
  if (!run) return;
  if (!n.carry) {
    if (n.tile !== nest.entrance) {
      // sem trilha desenhada ela "respirava" no lugar e nunca ia buscar: o corpo
      // que larga uma obra acorda no meio do túnel, então a rota é garantida aqui
      if (!n.path && !setPath(n, nest.entrance)) { n.tile = nest.entrance; n.x = cxOf(n.tile); n.y = cyOf(n.tile); }
      stepAlong(n, dt);
      return;
    }
    if (n.workT > 0) { n.workT -= dt; return; }
    n.carry = 1;
    n.workT = 0.4;
    if (pantry.length) {
      const cm = pantry[0];
      n.dest = cm.tiles[irand(0, cm.tiles.length - 1)];
      n.destCm = cm;
    } else {
      n.dest = nest.hall; n.destCm = null;
    }
    if (!setPath(n, n.dest)) { n.carry = 0; n.destCm = null; }
    return;
  }
  if (!stepAlong(n, dt, 0.85)) return;
  if (n.destCm) {
    const s = nest.stats;
    const mult = (s ? s.pantryMult : 1) * (n.destCm.traffic || 1);
    const amount = Math.max(1, Math.round((rand(2, 4) + (mods().nestDeposit || 0)) * mult));
    run.food += amount;
    nest.deliveries += amount;
    float(n.x, n.y - 10, "+" + amount, "#ffd479", 0.9);
    SFX.coin();
  } else {
    float(n.x, n.y - 10, "SEM DESPENSA: APODRECE", "#ff8a96", 1.2);
  }
  n.carry = 0; n.destCm = null; n.workT = rand(0.2, 0.9);
  if (!setPath(n, nest.entrance)) n.tile = nest.entrance;
}

/**
 * Enfermeira: Real → (pega o ovo) → berço → cuida → volta. É a cadeia que faz
 * "chocar" ser TRABALHO e não botão: sem enfermeira com berço, ovo não nasce.
 */
function nurseTick(n, dt, nursery) {
  if (n.nurse === "toRoyal") {
    if (stepAlong(n, dt, 0.9)) {
      const egg = nest.eggs.find((e) => !e.carried && !e.taken);
      const q = allies.queen;
      if (egg && q && !q.dead) {
        egg.taken = true;
        n.egg = egg;
        n.nurse = nursery ? "toNursery" : "tend";
        if (!setPath(n, nursery ? nursery.tiles[irand(0, nursery.tiles.length - 1)] : nest.royal)) n.nurse = "tend";
      } else { n.nurse = null; n.t = 2.6; }
    }
    return;
  }
  if (n.nurse === "toNursery") {
    if (stepAlong(n, dt, 0.85)) {
      if (n.egg) {
        n.egg.carried = true;
        n.egg.x = cxOf(n.tile) + rnd(-8, 8);
        n.egg.y = cyOf(n.tile) + rnd(-6, 6);
        n.egg = null;
        SFX.silk();
        float(n.x, n.y - 10, "OVO AO BERÇO", "#7fd6a0", 1.1);
      }
      n.nurse = "tend";
      n.t = 0;
    }
    return;
  }
  // "tend": queda no berço (ou na Real, se não há berço) e recomeça
  stepAlong(n, dt, 0.35);
  if (n.t > 3.4) {
    n.t = 0;
    n.nurse = null;
    if (!setPath(n, nest.royal)) { n.tile = nest.hall; n.x = cxOf(nest.hall); n.y = cyOf(nest.hall); }
    n.nurse = "toRoyal";
  }
}

function hint(x, text, color, life = 1.5) { float(x, cyOf(nest.hall) - 14, text, color, life); }
function float(x, y, text, color, life) {
  nest.floats.push({ x, y, text, color, life, max: life });
  if (nest.floats.length > 48) nest.floats.splice(0, nest.floats.length - 48);
}

function dustOut(n) {
  for (let i = 0; i < 6; i++) {
    nest.bits.push({
      x: n.x + rnd(-8, 8), y: n.y + rnd(-6, 6),
      vx: rnd(-18, 18), vy: rnd(-26, -6), life: rnd(0.3, 0.7), max: 0.7,
      color: i % 2 ? "#8a5f2a" : "#ffd479", size: rnd(1.4, 2.6),
    });
  }
  nest.dirFlash = 0.6;
}

// --------------------------------------------------------------- boca -------
/** dir>0: solta uma pela boca (fila real). dir<0: chama a de fora mais perto. */
export function nestLeaveOne(dir = 1) {
  if (!nest.soil) return 0;
  const roster = allies.inside || [];
  if (dir > 0) {
    let best = null, bt = -1;
    for (const a of roster) {
      if (a.dead || a.dying || a.doorT > 0 || a.exitRequested) continue;
      const n = nest.ants.find((v) => v.id === a.id);
      if (n && n.leaving) continue;
      if (a.insideT > bt) { bt = a.insideT; best = a; }
    }
    if (!best) return 0;
    requestNestExit(best);
    float(cxOf(nest.entrance), cyOf(nest.entrance) - 22, "A CAMINHO DA BOCA!", "#ffd479", 1.4);
    SFX.pickup();
    return 1;
  }
  const D = world.anthill.door;
  let pick = null, bd = Infinity;
  for (const a of allies) {
    if (a.dead || a.dying || a.inside || a.doorT > 0 || a.type === "queen") continue;
    if (a.state === "enter") continue;
    const d = Math.hypot(a.x - D.x, a.y - D.y);
    if (d < bd) { bd = d; pick = a; }
  }
  if (!pick) return 0;
  antEnterNest(pick, "rodizio");
  float(pick.x, pick.y - 16, "PARA DENTRO!", "#7fd6a0", 1.4);
  SFX.command();
  return -1;
}

export function nestCallBack(n = 1) {
  let k = 0;
  for (let i = 0; i < n; i++) if (nestLeaveOne(-1) === 0) break; else k++;
  return k;
}

export function nestSendOut(n = 1) {
  let k = 0;
  for (let i = 0; i < n; i++) if (nestLeaveOne(1) === 1) k++;
  return k;
}

/** Toque/clique único (mantido por contrato com game.js e testes): pinta 1 tile. */
export function nestClick(x, y) {
  if (!nest.open) return false;
  const i = tileAt(x, y);
  if (i < 0) return false;
  if (nest.room[i] === K_ENT && nest.tool === "dig") {
    if (nestLeaveOne(1)) return "out";
    float(x, y - 12, "NINGUÉM AQUI PARA SAIR", "#8f86b8", 1.4);
    SFX.deny();
    return true;
  }
  nest.lastPaint = i;
  return paint(i);
}

export function nestHover(x, y) { nest.hover = tileAt(x, y); }

// ------------------------------------------------------------------ desenho --
const SOIL_SHADE = [
  "rgba(255,255,255,0.045)", "rgba(255,255,255,0.02)",
  "rgba(0,0,0,0.10)", "rgba(0,0,0,0.05)", "rgba(255,220,150,0.05)", "rgba(255,220,150,0.02)",
];
const FLOOR = "#4a3620", FLOOR_IN = "#5c4426";
// A pintura do chão (art-source/f1-solo -> game/assets/sprites/nest/terra.png,
// derivada por tools/prepare_nest_art.py). Não é um tile que repete: é UMA folha
// com a proporção exata da grade, e cada célula lê a sua própria região dela —
// dois vizinhos mostram pixels vizinhos, então não há emenda a disfarçar nem
// xadrez de grade. É o mesmo truque do mundo lá fora (world.js:bakeGround assa
// um canvas e as células leem dele), que o usuário pediu em 2026-10-21: "a terra
// deve ter um sprite que se conecte entre si quando lado a lado".
const SHEET_A = 1;         // a pintura É o chão: nada de velá-la por metade (a 0,50 a
                           // terracota virava lama escura e o grão desaparecia)
const SOLID_WASH = 0.58;   // o escuro do que AINDA NÃO FOI ESCAVADO, lavado sobre a folha
const OPEN_LIFT = "rgba(158,118,68,0.26)";  // e o piso levantado do que já é túnel
// Os dois juntos são o que faz a obra se ler: o grão continua contínuo dos dois
// lados (a folha é uma só), mas a FRONTEIRA túnel/solo tem que ser visível — a
// emenda que não existe é a do meio do piso, não a da parede da escavação.
// Medido na captura (luma média): solo fechado ~52, piso aberto ~78. Debaixo de
// 18 de diferença a cena vira mancha e o jogador não vê o que já abriu.

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
function neighborOpen(i) {
  for (let k = 0; k < 4; k++) { const j = NB[i * 4 + k]; if (j >= 0 && nest.open_[j]) return true; }
  return false;
}

function drawGrid(ctx, time) {
  if (!nest.soil) return;
  // 0) a folha do chão: desenhada UMA vez para a grade inteira (nada de sprite
  //    por tile). `hasSheet` é o interruptor honesto: sem a arte carregada o
  //    cenário volta aos chapados de antes, e o jogo continua legível.
  const sheet = IMG.nest_terra;
  const hasSheet = !!(sheet && sheet.width > 2 && sheet.height > 2);
  if (hasSheet) {
    ctx.save();
    ctx.globalAlpha = SHEET_A;
    ctx.drawImage(sheet, OX, OY, GW, GH);
    ctx.restore();
  }
  // 1) solo / piso
  for (let i = 0; i < NN; i++) {
    const x = OX + colOf(i) * TILE, y = OY + rowOf(i) * TILE;
    if (nest.open_[i]) {
      const kind = nest.room[i], plan = nest.plan[i];
      if (!hasSheet) { ctx.fillStyle = kind >= 0 ? FLOOR_IN : FLOOR; ctx.fillRect(x, y, TILE, TILE); }
      else { ctx.fillStyle = OPEN_LIFT; ctx.fillRect(x, y, TILE, TILE); }
      if (kind >= 0 && kind < NEST_ROOM_IDS.length) {
        ctx.fillStyle = hexA(NEST_BUILD[NEST_ROOM_IDS[kind]].accent, nest.comp[i] >= 0 ? 0.26 : 0.12);
        ctx.fillRect(x, y, TILE, TILE);
      } else if (kind === K_ROYAL) {
        ctx.fillStyle = "rgba(255,212,121,0.14)";
        ctx.fillRect(x, y, TILE, TILE);
      }
      if (plan >= 0) {
        ctx.fillStyle = hexA(NEST_BUILD[NEST_ROOM_IDS[plan]].accent, 0.10);
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      }
      continue;
    }
    const s = NEST_SOIL[nest.soil[i]];
    // tom da dureza POR CIMA da folha (com a arte, meio transparente: o grão
    // continua aparecendo, e é o tom que diz se ali é terra solta ou rocha)
    ctx.fillStyle = hasSheet ? hexA(s.fill, SOLID_WASH) : s.fill;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = hasSheet ? "rgba(10,6,3,0.20)" : SOIL_SHADE[nest.shade[i]];
    ctx.fillRect(x, y, TILE, TILE);
    if (nest.soil[i] === 2) {                                    // raiz: fios
      ctx.strokeStyle = "rgba(107,74,36,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + TILE - 4); ctx.lineTo(x + TILE - 3, y + 4);
      ctx.stroke();
    } else if (nest.soil[i] === 3) {                             // rocha: lascas
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + 3 + (nest.shade[i] * 3) % 9, y + 4 + (nest.shade[i] * 5) % 10, 5, 3);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 6, y + TILE - 8, 7, 2);
    }
    if (nest.vein[i]) {                 // o que está enterrado: só se sente de longe
      ctx.fillStyle = hexA(NEST_VEIN[nest.vein[i]].color, neighborOpen(i) ? 0.8 : 0.15);
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, neighborOpen(i) ? 4.2 : 3, 0, TAU);
      ctx.fill();
    }
    if (nest.marked[i]) {
      if (nest.dprog[i] > 0) {
        ctx.fillStyle = "rgba(10,7,4,0.5)";
        ctx.fillRect(x, y, TILE, TILE);
        bar(ctx, x + 2, y + TILE - 5, TILE - 4, 3, clamp(nest.dprog[i], 0, 1), { c1: "#ffd479", c2: "#a35a2c" });
      } else {
        ctx.strokeStyle = "rgba(255,212,121,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4); ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      }
    }
  }
  // 2) paredes: contorno só onde o piso encosta no solo (leituras de corte)
  ctx.strokeStyle = "rgba(8,6,4,0.75)";
  ctx.lineWidth = 2;
  for (let i = 0; i < NN; i++) {
    if (!nest.open_[i]) continue;
    const x = OX + colOf(i) * TILE, y = OY + rowOf(i) * TILE;
    ctx.beginPath();
    let any = false;
    for (let k = 0; k < 4; k++) {
      const j = NB[i * 4 + k];
      if (j >= 0 && nest.open_[j]) continue;
      any = true;
      if (k === 0) { ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); }
      else if (k === 1) { ctx.moveTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); }
      else if (k === 2) { ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y + TILE); }
      else { ctx.moveTo(x, y); ctx.lineTo(x, y + TILE); }
    }
    if (any) ctx.stroke();
  }
  // 3) canteiros pagos (tracejado + barra da obra)
  for (let k = 0; k < nest.bldQ.length; k++) {
    const i = nest.bldQ[k];
    if (i < 0 || nest.plan[i] < 0) continue;
    const x = OX + colOf(i) * TILE, y = OY + rowOf(i) * TILE;
    ctx.strokeStyle = hexA(NEST_BUILD[NEST_ROOM_IDS[nest.plan[i]]].accent, 0.85);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
    ctx.setLineDash([]);
    if (nest.bprog[i] > 0) bar(ctx, x + 2, y + 1, TILE - 4, 3, clamp(nest.bprog[i], 0, 1), { c1: "#7fd6a0", c2: "#2f7d55" });
  }
  // 4) câmaras: moldura, VFX da lore, rótulo
  for (const cm of nest.comps) drawChamber(ctx, cm, time);
  // a BOCA: um degrau de luz no topo do poço
  const ex = cxOf(nest.entrance), ey = cyOf(nest.entrance);
  const gl = ctx.createRadialGradient(ex, ey, 2, ex, ey, TILE * 2.2);
  gl.addColorStop(0, "rgba(255,212,121,0.30)");
  gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(ex - TILE * 2.2, ey - TILE * 2.2, TILE * 4.4, TILE * 4.4);
  ctx.fillStyle = "#0b0704";
  ctx.beginPath(); ctx.ellipse(ex, ey - 3, 11, 6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = nest.dirFlash > 0 ? "#ffd479" : "rgba(255,212,121,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(ex, ey - 3, 11, 6, 0, 0, TAU); ctx.stroke();
}

function drawChamber(ctx, cm, time) {
  const build = NEST_BUILD[cm.type], def = CHAMBERS[cm.type];
  const x0 = OX + cm.cA * TILE, y0 = OY + cm.rA * TILE;
  const w = (cm.cB - cm.cA + 1) * TILE, h = (cm.rB - cm.rA + 1) * TILE;
  ctx.strokeStyle = hexA(build.accent, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  drawChamberVfx(ctx, cm, time, x0, y0, w, h);
  const ic = IMG["i_" + def.icon];
  if (ic) ctx.drawImage(ic, cm.cx - 10, cm.cy - 10, 20, 20);
  const lab = def.name + " N" + cm.lvl + " - " + cm.n + "T - x" + cm.traffic.toFixed(2);
  const fit = fitTextBlock(lab, Math.max(60, w - 10), 24, { scale: 0.62, minScale: 0.42, lineStep: 11 });
  const ph = 4 + fit.lines.length * fit.step;
  ctx.fillStyle = "rgba(11,7,4,0.82)";
  ctx.fillRect(x0 + 2, y0 + 1, w - 4, ph);
  ctx.strokeStyle = hexA(build.accent, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 + 2.5, y0 + ph + 1.5); ctx.lineTo(x0 + w - 2.5, y0 + ph + 1.5); ctx.stroke();
  fit.lines.forEach((L, k) => drawText(ctx, L, cm.cx, y0 + 4 + k * fit.step, {
    color: build.accent, align: "center", scale: fit.scale, maxWidth: Math.max(60, w - 12),
  }));
}

/** VFX de lore por câmara (mesma alma da FASE 7, agora na geometria que você abriu). */
function drawChamberVfx(ctx, cm, time, x0, y0, w, h) {
  const n = Math.min(16, cm.n * 2);
  if (cm.type === "nursery") {
    for (let s = 0; s < n; s++) {
      const sx = x0 + 6 + (s * 37) % Math.max(8, w - 8) + Math.sin(time * 0.6 + s) * 6;
      const sy = y0 + 6 + (s * 23) % Math.max(8, h - 8) + Math.cos(time * 0.5 + s) * 4;
      ctx.strokeStyle = "rgba(230,255,240,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 5, sy - 4, sx + 10, sy); ctx.stroke();
    }
  } else if (cm.type === "pantry") {
    for (let s = 0; s < n; s++) {
      const mx = x0 + 8 + (s * 41) % Math.max(8, w - 12);
      const my = y0 + 8 + ((time * 12 + s * 17) % Math.max(6, h - 14));
      ctx.fillStyle = "rgba(255,179,71,0.5)";
      ctx.beginPath(); ctx.ellipse(mx, my, 2.2, 3.2, 0, 0, TAU); ctx.fill();
    }
    const pile = Math.min(24, 6 + cm.n * 2);
    for (let i = 0; i < pile; i++) {
      const px = x0 + 6 + (i % 6) * 9 + ((i / 6) | 0) * 3;
      const py = y0 + h - 8 - ((i / 6) | 0) * 4;
      if (px > x0 + w - 4) continue;
      ctx.fillStyle = i % 3 === 0 ? "#ffe6a8" : "#ffb347";
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill();
    }
  } else if (cm.type === "fungus") {
    for (let p = 0; p < n; p++) {
      const px = x0 + 8 + (p * 27) % Math.max(8, w - 10) + Math.sin(time * 0.5 + p) * 8;
      const py = y0 + 6 + ((time * 9 + p * 19) % Math.max(8, h - 10));
      ctx.fillStyle = p % 2 ? "rgba(201,160,255,0.5)" : "rgba(127,214,160,0.4)";
      ctx.beginPath(); ctx.arc(px, py, 1.5 + Math.sin(time + p) * 0.6, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < Math.min(12, cm.n); i++) {
      const fx = x0 + 8 + (i % 4) * (w / 4.4);
      const fy = y0 + h - 7 - ((i / 4) | 0) * 6 + Math.sin(time * 1.5 + i) * 1.4;
      if (fx > x0 + w - 4) continue;
      ctx.fillStyle = "#c9a0ff";
      ctx.beginPath(); ctx.ellipse(fx, fy, 6, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e3d2ff";
      ctx.fillRect(fx - 1.2, fy + 1.6, 2.4, 6);
    }
  } else if (cm.type === "barracks") {
    if (Math.random() < 0.06) {
      ctx.fillStyle = "rgba(255,212,121,0.7)";
      ctx.fillRect(x0 + 6 + Math.random() * (w - 12), y0 + 6 + Math.random() * 14, 2, 2);
    }
    const gr = ctx.createRadialGradient(cm.cx, cm.cy, 6, cm.cx, cm.cy, Math.max(12, w * 0.55));
    gr.addColorStop(0, "rgba(255,100,60,0.07)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(cm.cx, cm.cy, w * 0.55, h * 0.55, 0, 0, TAU); ctx.fill();
  } else if (cm.type === "refinery") {
    for (let i = 0; i < Math.min(10, cm.n); i++) {
      const cx = x0 + 10 + (i * 43) % Math.max(10, w - 16), cy = y0 + 10 + (i * 29) % Math.max(10, h - 16);
      const pulse = 0.55 + Math.sin(time * 2 + i) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#c77dff"; ctx.strokeStyle = "#e8d5ff"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * TAU + time * 0.3;
        const px = cx + Math.cos(ang) * 6, py = cy + Math.sin(ang) * 6;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawNestAnt(ctx, n) {
  const sprite = n.sprite || n.type;
  const frame = rotFrame(sprite, n.angle);
  // PIXEL CELESTE (F0b-2): o tamanho sai do assado NATIVO multiplicado por um
  // passo INTEIRO — 2x para a formiga comum, 1x para o colosso (que já é
  // assado grande). Antes era `rotDrawSize * 0.42`, um fator fracionário que
  // reduzia o sprite e borrava a silhueta.
  const k = n.job === "colossus" ? 1 : 2;
  const size = (rotNativeSize(sprite) || frame.width) * k;
  const wob = Math.sin(n.bob) * (n.path ? 1.2 : 0.6);
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.translate(n.x, n.y + wob);
  if (n.path) ctx.rotate(Math.sin(n.bob * 0.5) * 0.05);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, size * 0.3, size * 0.28, size * 0.12, 0, 0, TAU); ctx.fill();
  ctx.drawImage(frame, -size / 2, -size / 2, size, size);
  ctx.restore();
  if (n.carry) {                                       // carga na boca
    ctx.globalAlpha = 1;
    ctx.fillStyle = n.destCm ? "#ffe6a8" : "#7fd6a0";
    ctx.beginPath();
    ctx.arc(n.x + Math.cos(n.angle) * size * 0.5, n.y + Math.sin(n.angle) * size * 0.5, Math.max(2, size * 0.12), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,8,16,0.8)"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (n.egg) {
    ctx.fillStyle = "#efe9ff";
    ctx.beginPath(); ctx.ellipse(n.x, n.y - size * 0.42, 3.2, 4.2, 0, 0, TAU); ctx.fill();
  }
  if (n.job === "digger" && !n.path) {                 // poeira de quem escava
    const a = nest.t * 9 + n.id;
    ctx.fillStyle = "rgba(180,140,80,0.75)";
    ctx.fillRect(n.x + Math.cos(a) * 10 - 1.5, n.y + size * 0.25 + Math.sin(a * 1.3) * 4, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawRoyal(ctx, time) {
  if (nest.royal < 0) return;
  const cx = cxOf(nest.royal), cy = cyOf(nest.royal) + 2;
  const q = allies.queen;
  const frame = rotFrame("queen", Math.PI / 2);
  const size = TILE * 2.4;
  ctx.save();
  ctx.translate(cx, cy + Math.sin(time * 1.6) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(0, size * 0.32, size * 0.32, size * 0.11, 0, 0, TAU); ctx.fill();
  ctx.drawImage(frame, -size / 2, -size / 2, size, size);
  ctx.restore();
  if (q) {
    const frac = clamp(q.hp / q.maxHp, 0, 1);
    bar(ctx, cx - 40, cy + size * 0.42, 80, 7, frac, { c1: "#ffd479", c2: "#a35a2c", segments: 8 });
  }
  for (const e of nest.eggs) {                 // os que ainda estão na Real
    if (e.carried) continue;
    const ex = e.x, ey = e.y + Math.sin(time * 3 + e.x) * 1.6;
    ctx.fillStyle = "#efe9ff";
    ctx.beginPath(); ctx.ellipse(ex, ey, 4.2, 5.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#c9bce8"; ctx.lineWidth = 1; ctx.stroke();
  }
  const st = nest.stats;
  if (!st || st.tiles.nursery === 0) {
    drawText(ctx, "OVOS SEM BERÇO: CAVAR E CONSTRUIR 3 TILES DE CHOCO", cx, cy - size * 0.62,
      { color: "#ff8a96", align: "center", scale: 0.62, maxWidth: TILE * 11 });
  }
}

/** Ovos já levados ao berço + as larvas que crescem ali. */
function drawBrood(ctx, time) {
  for (const e of nest.eggs) {
    if (!e.carried) continue;
    const ex = e.x, ey = e.y + Math.sin(time * 3 + e.x) * 1.4;
    ctx.fillStyle = "#efe9ff";
    ctx.beginPath(); ctx.ellipse(ex, ey, 4.2, 5.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7fd6a0"; ctx.lineWidth = 1; ctx.stroke();
  }
  const cm = nurseryComp();
  if (!cm) return;
  for (let i = 0; i < Math.min(nest.larvae.length, cm.n); i++) {
    const t = cm.tiles[i];
    const lx = cxOf(t) + Math.sin(time * 0.8 + i) * 4, ly = cyOf(t) + 4 + Math.cos(time * 0.7 + i) * 2;
    ctx.fillStyle = "#f3e6c8";
    ctx.beginPath(); ctx.ellipse(lx, ly, 4.4, 3, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let s = 1; s < 3; s++) ctx.fillRect(lx - 3 + s * 2.2, ly - 2, 1, 4);
  }
}

// -------------------------------------------------------------------- HUD ---
const TOOL_KEY = { dig: "1", pantry: "2", nursery: "3", barracks: "4", fungus: "5", refinery: "6", erase: "7 / X" };
function toolLabel(t) {
  const key = TOOL_KEY[t] || "";
  if (t === "dig") return "ESCAVAR (" + key + ")";
  if (t === "erase") return "DEMOLIR (" + key + ")";
  return (NEST_BUILD[t].btn || t) + " (" + key + ")";
}

export function nestDraw(ctx) {
  const time = nest.t;
  const run = runRef();
  ctx.fillStyle = "#0b0704";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#150e07";
  ctx.fillRect(0, OY - 6, VIEW_W, BOTTOM - OY + 6);
  drawGrid(ctx, time);
  drawRoyal(ctx, time);
  drawBrood(ctx, time);
  for (const n of nest.ants) drawNestAnt(ctx, n);
  for (const b of nest.bits) {
    ctx.globalAlpha = clamp(b.life / b.max, 0, 1);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.size, b.size);
  }
  ctx.globalAlpha = 1;
  // OLHO LÁ FORA: mora no canto que a rocha-mãe reservou (NEST_RESERVE)
  const eyeFS = fontScale();
  drawOutsideEye(ctx, VIEW_W - PIP.w - 22, eyeFS > 1 ? 68 : 52, PIP.w, PIP.h);
  return drawNestHud(ctx, run);
}

function drawNestHud(ctx, run) {
  const FS = fontScale();
  const barH = FS > 1 ? 64 : 40;
  const y1 = FS > 1 ? 10 : 13;
  // C1.2/C1.3 (plano dos Grupos B e C): as faixas do ninho saem do fillRect
  // preto com linha roxa. Papel de HUD não serve aqui — nenhuma família da casa
  // tem proporção para uma tira de 960x40 (o banner é 5:1; com paperFit a
  // moldura sairia com 200px de largura, o "encolhimento" que o Grupo B existe
  // para matar). A prancha de madeira é a peça que a casa já tem para ESTICAR:
  // as pontas inteiras na proporção nativa, só a faixa calma do meio acompanha a
  // largura. Sem a arte carregada, volta o fundo escuro (o jogo nunca depende de sprite).
  const plank = (y, h) => {
    if (drawPaper(ctx, "button", 0, y, VIEW_W, h, {})) return true;
    ctx.fillStyle = "rgba(8,6,4,0.86)";
    ctx.fillRect(0, y, VIEW_W, h);
    return false;
  };
  plank(0, barH);

  const infMoney = !!(run && run.testPowers && run.testPowers.infMoney);
  const infAnts = !!(run && run.testPowers && run.testPowers.infAnts);
  const st = nest.stats;
  const cap = st ? st.foodCap : NEST_RULES.capBase;
  const over = !!run && run.food > cap;
  const foodStr = (infMoney ? "∞" : String(run ? run.food : 0)) + "/" + cap;
  let bx = 16;
  if (IMG.i_food) ctx.drawImage(IMG.i_food, bx, y1 - 2, 18, 18);
  drawText(ctx, foodStr, bx + 24, y1, { font: "big", scale: 1, color: over ? "#ff8a96" : "#ffd479", maxWidth: 130 });
  bx += 24 + Math.max(64, textWidth(foodStr, { font: "big" })) + 14;
  const essStr = infMoney ? "∞" : String(run ? run.essencePool : 0);
  if (IMG.i_essence) ctx.drawImage(IMG.i_essence, bx, y1 - 2, 18, 18);
  drawText(ctx, essStr, bx + 24, y1, { font: "big", scale: 1, color: "#c77dff", maxWidth: 80 });
  bx += 24 + Math.max(46, textWidth(essStr, { font: "big" })) + 16;
  drawText(ctx, "NÍVEL " + (run ? run.level : 0), bx, y1, { font: "big", scale: 1, color: "#6db7ff", maxWidth: 120 });
  const mapTxt = "MAPA " + ((run ? run.mapIdx : 0) + 1) + "/" + MAPS.length +
    "   ONDA " + (run ? run.wave : 0) + "   POP " + popUsed() + "/" + (infAnts ? "∞" : popCapTotal()) +
    (st && st.popBonus ? " (+NINHO)" : "");
  const line2 = over
    ? "COMIDA APODRECENDO ACIMA DO ESTOQUE: ABRA MAIS DESPENSA"
    : "ENTREGUE POR ELAS +" + nest.deliveries + "   ESCAVADO " + nest.dug + " T   NA OBRA " + (st ? st.digWorkers : 0);
  const who = insideCount() + " NO NINHO" + (nest.ants.length > insideCount() ? " (+" + (nest.ants.length - insideCount()) + " NA FILA DA BOCA)" : "");
  if (FS > 1) {
    // fonte grande: a barra tem 64px e sobra uma segunda linha para o estatuto
    drawText(ctx, mapTxt, VIEW_W - 16, y1 + 1, { color: PAL.text, align: "right", maxWidth: VIEW_W - 32 });
    drawText(ctx, line2, 16, 40, { color: over ? "#ff8a96" : "#7fd6a0", scale: 0.76, maxWidth: 430 });
    drawText(ctx, who, VIEW_W - 16, 40, { color: PAL.textDim, align: "right", scale: 0.76, maxWidth: VIEW_W - 470 });
    nest.statOnBar = true;
  } else {
    // PC: a barra de cima tem 40px, uma linha só (placar + MAPA/ONDA/POP). O
    // estatuto do ninho desce para o rodapé, logo abaixo das dicas.
    const lx = Math.max(bx + 130, 430);
    drawText(ctx, mapTxt, lx, y1 + 1, { color: PAL.text, maxWidth: VIEW_W - 16 - lx });
    nest.statOnBar = false;
  }

  // ---- rodapé: faixa de obras, faixa da boca, dicas
  ctx.fillStyle = "rgba(8,6,4,0.86)";
  ctx.fillRect(0, BOTTOM, VIEW_W, VIEW_H - BOTTOM);
  plank(BOTTOM + 2, 42);            // prancha sob a fileira de obras
  plank(BOTTOM + 38, 36);           // prancha sob a fileira da boca

  const TOOLS = ["dig"].concat(NEST_ROOM_IDS).concat(["erase"]);
  const toolShort = (t) => t === "dig" ? "CAVAR" : t === "erase" ? "DEMOLIR"
    : (NEST_BUILD[t] && NEST_BUILD[t].btn) || t.toUpperCase();
  const plate = (t, x, y, w, h) => {
    const on = nest.tool === t;
    let lab = toolLabel(t);
    if (t !== "dig" && t !== "erase") {
      const c = tileCost(t);
      lab += on ? " ✓ " + c.food + "C/TILE" : "";
    }
    const acc = on ? "#37e6c8" : t === "dig" ? "#ffd479" : t === "erase" ? "#ff8a96" : NEST_BUILD[t].accent;
    if (button(ctx, { x, y, w, h, label: lab, id: "nestTool_" + t, accent: acc, scale: 0.78 })) {
      nest.tool = t; nest.drawer = false; SFX.uiClick();
    }
  };
  if (!isTouchUI()) {
    let tx = 16;
    for (const t of TOOLS) {
      const w = t === "dig" || t === "erase" ? 104 : nest.tool === t ? 160 : 112;
      plate(t, tx, BOTTOM + 8, w, 28);
      tx += w + 5;
    }
  } else {
    // (sem o glifo "▸": a Kiwi Soda não tem setinha — layout.mjs reprova. ">" resolve)
    if (button(ctx, { x: 16, y: BOTTOM + 8, w: 226, h: 28,
      label: (nest.drawer ? "< FECHAR" : "OBRAS: " + toolShort(nest.tool) + " >"),
      id: "nestDrawer", accent: nest.drawer ? "#37e6c8" : "#ffd479", scale: 0.78 })) {
      nest.drawer = !nest.drawer; SFX.uiClick();
    }
    if (nest.drawer) {
      const pw = Math.round((VIEW_W - 32 - 3 * 8) / 4), ph = 30;
      ctx.fillStyle = "rgba(8,6,4,0.90)";
      ctx.fillRect(8, DRAWER_Y - 6, VIEW_W - 16, DRAWER_H + 4);
      ctx.strokeStyle = "#6b4a24"; ctx.lineWidth = 1;
      ctx.strokeRect(8.5, DRAWER_Y - 5.5, VIEW_W - 17, DRAWER_H + 3);
      let k = 0;
      for (const t of TOOLS) {
        plate(t, 16 + (k % 4) * (pw + 8), DRAWER_Y + ((k / 4) | 0) * (ph + 8), pw, ph);
        k++;
      }
    }
  }

  const by = BOTTOM + 40;
  if (button(ctx, { x: 16, y: by, w: 200, h: 30, label: isTouchUI() ? "VOLTAR À COLÔNIA" : "VOLTAR À COLÔNIA (B)", id: "nestBack", accent: "#37e6c8" })) return "back";
  if (button(ctx, { x: 224, y: by, w: 176, h: 30, label: isTouchUI() ? "SAIR PELA BOCA" : "SAIR PELA BOCA (L)", id: "nestOut", accent: "#ffd479" })) return "out";
  if (button(ctx, { x: 408, y: by, w: 186, h: 30, label: isTouchUI() ? "CHAMAR P/ DENTRO" : "CHAMAR P/ DENTRO (P)", id: "nestIn", accent: "#7fd6a0" })) return "in";
  drawText(ctx, "PINTAR A OBRA: " + (st ? "1 ESCAVA - 2-6 OBRA - 7 OU X DEMOLE - ARRASTE PARA MARCAR VÁRIOS" : ""),
    VIEW_W / 2, BOTTOM + 74, { color: PAL.textDim, align: "center", scale: 0.7, maxWidth: VIEW_W - 40 });
  drawText(ctx, isTouchUI()
    ? "TOQUE E ARRASTE NO SOLO PARA MARCAR - O MUNDO LÁ FORA SEGUE VIVO NO OLHO LÁ FORA"
    : "CLIQUE OU ARRASTE NO SOLO PARA MARCAR - O MUNDO LÁ FORA SEGUE VIVO NO OLHO LÁ FORA",
    VIEW_W / 2, BOTTOM + 92, { color: "#8a7a5e", align: "center", scale: 0.7, maxWidth: VIEW_W - 40 });
  if (!nest.statOnBar) {            // PC: o que a colônia fez, na última linha da faixa
    drawText(ctx, line2 + "   " + who, VIEW_W / 2, BOTTOM + 110,
      { color: over ? "#ff8a96" : "#7fd6a0", align: "center", scale: 0.7, maxWidth: VIEW_W - 40 });
  }

  if (nest.hover >= 0) drawTileTip(ctx, nest.hover);

  for (const f of nest.floats) {
    drawText(ctx, f.text, f.x, f.y, {
      color: f.color, align: "center", shadow: true,
      alpha: clamp(f.life / f.max * 1.6, 0, 1),
    });
  }
}

/** Ficha do tile sob o ponteiro — texto sempre na área de papel do HUD (Regra 21). */
function drawTileTip(ctx, i) {
  const run = runRef();
  if (!run || !nest.soil) return;
  // A caixa segue a proporção REAL da moldura (960x540 = 1,78:1). Pedir 256x136
  // — a proporção 15:8 que o plano previu antes de a arte existir — faria o
  // paperFit desenhar a placa com 242px de largura e 7px de sobra: encolhimento é
  // justamente o que a casa combate. Derivando a altura da fonte, encaixa 1:1.
  const w = 256;
  const frm = IMG.paper_nest_tip_frame;
  const h = frm && frm.height > 2 ? Math.round(w * frm.height / frm.width) : 136;
  let txp = clamp(cxOf(i) - w / 2, 10, VIEW_W - w - 10);
  let typ = cyOf(i) - h - 18;
  if (typ < 44) typ = cyOf(i) + 22;
  typ = clamp(typ, 44, BOTTOM - h - 4);
  layoutBox(ctx, "painel", txp, typ, w, h);
  const clipped = beginPaperHud(ctx, "nest_tip", txp, typ, w, h);
  if (!clipped) panel(ctx, txp, typ, w, h, { paperKind: "nest_tip", deferFrame: false });
  const qC = paperQuiet("nest_tip", txp, typ, w, h);
  const cCx = qC.x + qC.w / 2;
  let cy = qC.y + 1;
  let title = "", body = "", foot = "", footCol = "#7fd6a0";
  const s = NEST_SOIL[nest.soil[i]];

  if (!nest.open_[i]) {
    title = s.name;
    const secs = s.hard > 0 ? Math.max(1, Math.round(s.hard / (NEST_RULES.digRate * (mods().digSpeed || 1)))) : 0;
    body = (s.hard > 0 ? "UMA ESCAVADORA ABRE ISTO EM " + secs + "s. " : "NEM A COLÔNIA PASSA AQUI. ") +
      (nest.vein[i] ? "E HÁ " + NEST_VEIN[nest.vein[i]].name + " ENTERRADO AQUI." : "");
    if (nest.marked[i]) {
      title = "OBRA MARCADA: " + s.name;
      body = "PROGRESSO " + Math.round(nest.dprog[i] * 100) + "% - " + nest.crew[i] + " ESCAVANDO";
      foot = "X CANCELA - CAVAR CUSTA SÓ O TEMPO DELAS";
      footCol = "#b7a9d6";
    } else {
      foot = "COM A FERRAMENTA 1, TOQUE AQUI PARA MARCAR";
      footCol = "#ffd479";
    }
  } else if (nest.plan[i] >= 0) {
    const type = NEST_ROOM_IDS[nest.plan[i]];
    title = "CANTEIRO: " + CHAMBERS[type].name;
    body = "OBRA A " + Math.round(nest.bprog[i] * 100) + "%. CADA TILE PRECISA DE UMA FORMIGA LIVRE ATÉ AQUI — TÚNEL COMPRIDO ATRASA TUDO.";
    foot = "PAGO NA MARCAÇÃO: " + nest.planFood[i] + " COMIDA" + (nest.planEss[i] ? " + " + nest.planEss[i] + " ESS" : "");
    footCol = "#ffb347";
  } else if (nest.room[i] >= 0 && nest.room[i] < NEST_ROOM_IDS.length) {
    const type = NEST_ROOM_IDS[nest.room[i]];
    const cm = nest.comp[i] >= 0 ? nest.comps[nest.comp[i]] : null;
    const b = NEST_BUILD[type];
    title = CHAMBERS[type].name + (cm ? "  (NÍVEL " + cm.lvl + "/" + CHAMBERS[type].max + ")" : "  (PISO SEM TETO)");
    body = (cm ? cm.n + " TILES CONTÍGUOS - " : "AINDA NÃO É CÂMARA - ") + b.per +
      " - TRÁFEGO x" + (cm ? cm.traffic.toFixed(2) : trafficAt(i).toFixed(2)) +
      " (" + (cm ? cm.dist : nest.dist[i]) + " TILES DA BOCA)";
    if (cm && cm.next > 0) foot = "MAIS " + cm.next + " TILE(S) = NÍVEL " + (cm.lvl + 1);
    else if (cm) foot = "CÂMARA NO TETO";
    else foot = "JUNTE " + b.sizes[0] + " TILES PARA VIRAR CÂMARA";
    footCol = b.accent;
  } else if (nest.room[i] === K_ROYAL) {
    title = "CÂMARA DA SILENCIOSA";
    body = "AQUI A RAINHA BOTA. O OVO SÓ CHOCA SE UMA ENFERMEIRA O LEVAR ATÉ UM BERÇO.";
    foot = "CORAÇÃO DA COLÔNIA — NÃO SE AMASSA";
    footCol = "#ffd479";
  } else if (nest.room[i] === K_ENT) {
    title = "BOCA DO NINHO";
    body = "POR AQUI ELAS ENTRAM E SAEM: TUDO O QUE A COLÔNIA COME PASSA ESTE BURACO.";
    foot = "L SOLTA UMA - P CHAMA UMA";
    footCol = "#ffd479";
  } else {
    const tool = nest.tool;
    title = "PISO ABERTO";
    body = "CÂMARA AQUI SÓ COM TILES CONTÍGUOS DO MESMO TIPO (" +
      NEST_BUILD.pantry.sizes.join(" / ") + " = NÍVEL 1 / 2 / 3).";
    if (tool !== "dig" && tool !== "erase") {
      const c = tileCost(tool);
      foot = "PRÓXIMO TILE DE " + (NEST_BUILD[tool].btn || tool) + ": " + c.food + " COMIDA" + (c.ess ? " + " + c.ess + " ESS" : "");
    } else foot = "ESCOLHA 2-6 PARA CONSTRUIR AQUI";
    footCol = "#ffd479";
  }
  drawText(ctx, title, cCx, cy, { color: "#ffd479", align: "center", scale: 0.62, maxWidth: qC.w });
  cy += Math.min(14, qC.h / 5);
  const tip = fitTextBlock(body + " " + foot, qC.w, qC.y + qC.h - cy, { scale: 0.56, minScale: 0.4, lineStep: 11 });
  tip.lines.forEach((L, k) => drawText(ctx, L, cCx, cy + k * tip.step, { color: PAL.text, scale: tip.scale, align: "center", maxWidth: qC.w }));
  if (clipped) endPaperHud(ctx);
}

export { BOTTOM as NEST_BOTTOM, COLS as NEST_COLS, ROWS as NEST_ROWS, TILE as NEST_TILE, NEST_ROOM_IDS as NEST_TOOLS };
export { tileAt as nestTileAt, paint as nestPaintTile, chamberState as nestChamberState, canDig as nestCanDig };
