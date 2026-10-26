// ============================================================================
// FUMIGA — mundo: geração procedural POR BIOMA, terreno assado, recursos,
// colisões. Cada mapa tem paleta e conjunto de adereços próprios (config.MAPS)
// ============================================================================
import { WORLD_W, WORLD_H, PAL, MAPS } from "./config.js";
import { mulberry32, TAU, clamp } from "./utils.js";
import { SpatialGrid } from "./utils.js";
import { IMG } from "./assets.js";
import { G } from "./state.js";
// F0b — frame PIXEL CELESTE: paleta por bioma, tile 8x8 e chão no buffer.
import {
  TILE, TILE_WORLD, WORLD_PER_PX, paletteFor, paletteColors, quantizeToPalette,
} from "./pixel_celeste.js";

export const world = {
  seed: 0,
  mapIdx: 0,
  def: null,        // definição do bioma ativo (config.MAPS[i])
  // A BOCA do formigueiro é a porta da colônia: o buraco do sprite (arte style 3,
  // inspirada na TITLE — boca generosa deslocada para baixo, em A.y + 15).
  // Toda formiga entra e sai por aqui — ver drawNest.
  anthill: {
    x: WORLD_W / 2, y: WORLD_H / 2, r: 96,
    door: { x: WORLD_W / 2, y: WORLD_H / 2 + 15, r: 26 },
  },
  props: [],        // {x,y,img,scale,shadowR,collR,flip,tint}
  statics: null,    // grade espacial de colisores
  piles: [],        // {kind:'food', x,y, amount,max,r, sprite}
  nodes: [],        // {kind:'essence'|'amber', x,y, amount,max,r, img, glowT}
  gates: [],        // {x,y, name}
  ground: null,     // canvas (metade da resolução)
  mini: null,       // minimapa assado
  time: 0,
};

let biome = MAPS[0];

// ------------------------------------------------------------------- gera ---
export function genWorld(seed, mapIdx = 0) {
  world.seed = seed;
  world.mapIdx = mapIdx;
  biome = MAPS[Math.min(mapIdx, MAPS.length - 1)];
  world.def = biome;
  const rng = mulberry32(seed + mapIdx * 977);
  world.props = [];
  world.piles = [];
  world.nodes = [];
  world.time = 0;

  const A = world.anthill;
  A.x = WORLD_W / 2; A.y = WORLD_H / 2;
  A.door.x = A.x; A.door.y = A.y + 15;     // a boca acompanha o ninho (buraco em +15 na arte style 3)
  const distA = (x, y) => Math.hypot(x - A.x, y - A.y);
  const margin = 90;
  // MEGA LORE: Eras - mundo muda por Era (mais trilhas, seda, portas)
  const era = (G.save && G.save.era) ? G.save.era : 0;

  const taken = []; // pontos ocupados (espalhamento)
  function free(x, y, minD) {
    for (const p of taken) if (Math.hypot(p.x - x, p.y - y) < minD) return false;
    return true;
  }
  function place(x, y, minD) { taken.push({ x, y, minD }); }

  // ------------------------------------------------------------- portões ---
  world.gates = [
    { x: 180, y: 200, name: "N" }, { x: WORLD_W - 180, y: 200, name: "N" },
    { x: 180, y: WORLD_H - 200, name: "S" }, { x: WORLD_W - 180, y: WORLD_H - 200, name: "S" },
    { x: WORLD_W / 2, y: 120, name: "N" }, { x: WORLD_W / 2, y: WORLD_H - 120, name: "S" },
  ];

  const BP = biome.props;

  // ------------------------------------------------------------ clusters ---
  const clusters = 13;
  for (let c = 0; c < clusters; c++) {
    let cx = 0, cy = 0, tries = 0;
    do {
      cx = margin + rng() * (WORLD_W - margin * 2);
      cy = margin + rng() * (WORLD_H - margin * 2);
      tries++;
    } while (tries < 40 && (distA(cx, cy) < 520 || !free(cx, cy, 330)));
    place(cx, cy, 330);
    const n = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const x = clamp(cx + (rng() - 0.5) * 260, margin, WORLD_W - margin);
      const y = clamp(cy + (rng() - 0.5) * 260, margin, WORLD_H - margin);
      if (distA(x, y) < 400) continue;
      const key = BP.trees[(rng() * BP.trees.length) | 0];
      addProp(x, y, key, 1.05 + rng() * 0.45, 15, rng() < 0.5);
    }
  }
  // árvores frutíferas/aninhadas perto das pilhas de comida
  for (let i = 0; i < 9; i++) addFruitTreeSpot(rng);

  // ---------------------------------------------------------------- pedras --
  for (let i = 0; i < 42; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 330 || !free(x, y, 60)) continue;
    place(x, y, 60);
    addProp(x, y, BP.rocks[(rng() * BP.rocks.length) | 0], 0.8 + rng() * 0.8, 12, rng() < 0.5);
  }

  // --------------------------------------------------------------- arbustos -
  for (let i = 0; i < 66; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 240) continue;
    addProp(x, y, BP.bushes[(rng() * BP.bushes.length) | 0], 0.9 + rng() * 0.5, 0, rng() < 0.5);
  }
  for (let i = 0; i < 80; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 200) continue;
    addProp(x, y, BP.decos[(rng() * BP.decos.length) | 0], 0.65 + rng() * 0.5, 0, rng() < 0.5);
  }

  // ------------------------------------------------- pilhas de comida ------
  const pileSpots = [];
  // 3 próximas (aprendizado)
  for (let i = 0; i < 3; i++) {
    const a = rng() * TAU, d = 300 + rng() * 160;
    pileSpots.push({ x: A.x + Math.cos(a) * d, y: A.y + Math.sin(a) * d, near: true });
  }
  for (let i = 0; i < 14; i++) {
    const x = 160 + rng() * (WORLD_W - 320);
    const y = 160 + rng() * (WORLD_H - 320);
    // comida dentro do formigueiro é comida que ninguém alcança: a colisão do
    // formigueiro (raio 70) barra a aproximação e a operária ficava presa no
    // "goto" para sempre. 320px de folga mantém a pilha fora do sprite e do
    // caminho de entrada.
    if (distA(x, y) < 320) continue;
    pileSpots.push({ x, y, near: distA(x, y) < 700 });
  }
  for (const s of pileSpots) {
    const x = clamp(s.x, 120, WORLD_W - 120), y = clamp(s.y, 120, WORLD_H - 120);
    if (world.piles.some(p => Math.hypot(p.x - x, p.y - y) < 190)) continue;
    const amount = s.near ? 60 + rng() * 50 : 90 + (distA(x, y) / 14) + rng() * 60;
    const pile = { kind: "food", x, y, amount: Math.round(amount), max: 0, r: 30, sprite: null, seed: rng() * 1000 };
    pile.max = pile.amount;
    pile.sprite = bakePileSprite(rng);
    world.piles.push(pile);
    if (rng() < 0.7) addProp(x + (rng() - 0.5) * 90, y + (rng() - 0.5) * 60,
      biome.id === "deserto" ? "cactus2" : "bush_orange1", 0.9 + rng() * 0.4, 0, rng() < 0.5);
  }

  // ------------------------------------------------------ nós de essência ---
  const nodeCount = 7;
  for (let i = 0; i < nodeCount; i++) {
    let x = 0, y = 0, tries = 0;
    do {
      x = 180 + rng() * (WORLD_W - 360); y = 180 + rng() * (WORLD_H - 360);
      tries++;
    } while (tries < 30 && (distA(x, y) < 380 || world.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 420)));
    const violet = rng() < 0.3;
    const node = {
      kind: "essence", x, y,
      amount: violet ? 55 : 38, max: violet ? 55 : 38, r: 26,
      img: violet ? "crys_violet1" : (rng() < 0.5 ? "crys_blue1" : "crys_blue2"),
      glowT: rng() * TAU,
    };
    world.nodes.push(node);
    addCrystal(node, rng);
  }
  // âmbar (comida rara e rica) nos cantos
  for (let i = 0; i < 2; i++) {
    const corner = world.gates[(rng() * world.gates.length) | 0];
    const x = clamp(corner.x + (rng() - 0.5) * 500, 140, WORLD_W - 140);
    const y = clamp(corner.y + (rng() - 0.5) * 500, 140, WORLD_H - 140);
    const node = { kind: "amber", x, y, amount: 220, max: 220, r: 28, img: "crys_yellow1", glowT: rng() * TAU };
    world.nodes.push(node);
    addCrystal(node, rng);
  }
  // cristais decorativos do bioma
  for (let i = 0; i < 12; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 260) continue;
    addProp(x, y, BP.crys[(rng() * BP.crys.length) | 0], 0.7 + rng() * 0.5, 10, rng() < 0.5);
  }

  clearResourcesFromAnthill();
  buildStatics();
  bakeGround(rng);
  bakeMinimap();
}

/**
 * Rede de segurança do genWorld: recurso nenhum pode ficar na área do
 * formigueiro (nem no sprite, nem na faixa onde a colisão impede a formiga de
 * chegar). Quem estiver lá é empurrado radialmente para a borda da área — a
 * comida continua existindo, só sai de dentro da parede.
 */
export function clearResourcesFromAnthill() {
  const A = world.anthill;
  const SAFE = 190;                 // collR 70 + folga para a formiga trabalhar
  for (const t of [...world.piles, ...world.nodes]) {
    const dx = t.x - A.x, dy = t.y - A.y;
    const d = Math.hypot(dx, dy);
    if (d >= SAFE) continue;
    const a = d < 0.001 ? (Math.random() * TAU) : Math.atan2(dy, dx);
    t.x = A.x + Math.cos(a) * SAFE;
    t.y = A.y + Math.sin(a) * SAFE;
    t.moved = true;
  }
}

function addCrystal(node, rng) {
  world.props.push({ x: node.x, y: node.y, img: node.img, scale: node.kind === "amber" ? 1.3 : 1.15, collR: 14, flip: rng() < 0.5, noShadow: true, shR: 14, node });
}

function addProp(x, y, img, scale, collR, flip, noShadow) {
  world.props.push({ x, y, img, scale, collR, flip: !!flip, noShadow: !!noShadow, shR: collR });
}

function addFruitTreeSpot(rng) {
  const A = world.anthill;
  const BP = biome.props;
  let x = 0, y = 0, tries = 0;
  do {
    x = 200 + rng() * (WORLD_W - 400); y = 200 + rng() * (WORLD_H - 400);
    tries++;
  } while (tries < 30 && Math.hypot(x - A.x, y - A.y) < 480);
  const tkey = BP.trees[(rng() * BP.trees.length) | 0];
  addProp(x, y, tkey, 1.0 + rng() * 0.3, 15, rng() < 0.5);
  // canteiro embaixo da árvore
  const pile = { kind: "food", x: x + (rng() - 0.5) * 60, y: y + 30 + rng() * 20, amount: 80 + rng() * 40, max: 0, r: 30, sprite: null, seed: rng() * 1000 };
  pile.max = pile.amount;
  pile.sprite = bakePileSprite(rng);
  world.piles.push(pile);
}

// ------------------------------------------------------------ colisões ------
function buildStatics() {
  world.statics = new SpatialGrid(96);
  for (const p of world.props) {
    if (p.collR > 0) {
      const cells = Math.ceil(p.collR / 96) + 1;
      const cx = (p.x / 96) | 0, cy = (p.y / 96) | 0;
      for (let i = -cells; i <= cells; i++) for (let j = -cells; j <= cells; j++) {
        const key = (cx + i) * 100000 + (cy + j);
        let arr = world.statics.map.get(key);
        if (!arr) { arr = []; world.statics.map.set(key, arr); }
        arr.push(p);
      }
    }
  }
  // formigueiro: a COLINA é caminhável (as formigas descem a cratera até a
  // boca), mas o buraco central é sólido — ninguém fica parado dentro dele.
  // A boca (world.anthill.door) é a porta por onde a colônia entra e sai.
  const A = world.anthill;
  world.statics.insert({ x: A.door.x, y: A.door.y, collR: 20 });
  // portais não colidem
}

/** Remove adereços colidíveis num raio (chefes esmagam árvores/pedras pelo caminho). */
export function smashProps(cx, cy, r) {
  const hit = [];
  for (let i = world.props.length - 1; i >= 0; i--) {
    const p = world.props[i];
    if (!p.collR || p.node) continue; // cristais de recurso são firmes
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < r + p.collR) {
      hit.push(p);
      world.props.splice(i, 1);
    }
  }
  if (hit.length) buildStatics();
  return hit;
}

/** Empurra (x,y,r) para fora dos obstáculos; retorna {x,y}. */
export function collide(x, y, r) {
  if (x < 26) x = 26; else if (x > WORLD_W - 26) x = WORLD_W - 26;
  if (y < 26) y = 26; else if (y > WORLD_H - 26) y = WORLD_H - 26;
  world.statics.around(x, y, (s) => {
    if (!s.collR) return;
    const dx = x - s.x, dy = y - s.y;
    const rr = r + s.collR;
    const d2 = dx * dx + dy * dy;
    if (d2 > 0.001 && d2 < rr * rr) {
      const d = Math.sqrt(d2);
      x = s.x + (dx / d) * rr;
      y = s.y + (dy / d) * rr;
    }
  });
  return { x, y };
}

// ------------------------------------------------------- sprites de pilha ---
function bakePileSprite(rng) {
  const cv = document.createElement("canvas");
  cv.width = 56; cv.height = 40;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  // monte de terra
  c.fillStyle = "#4a3226";
  c.beginPath(); c.ellipse(28, 30, 22, 9, 0, 0, TAU); c.fill();
  c.fillStyle = "#33221a";
  c.beginPath(); c.ellipse(28, 32, 15, 6, 0, 0, TAU); c.fill();
  // frutinhas / sementes
  const cols = ["#ff7a3d", "#ffb347", "#e84545", "#d94f6a"];
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, d = rng() * 14;
    const px = 28 + Math.cos(a) * d, py = 28 - 2 + Math.sin(a) * d * 0.45;
    const r2 = 2.5 + rng() * 2.5;
    c.fillStyle = cols[(rng() * cols.length) | 0];
    c.fillRect(px - r2 / 2, py - r2 / 2, r2, r2);
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.fillRect(px - r2 / 2, py - r2 / 2, 1.5, 1.5);
  }
  // folha
  c.fillStyle = "#4e9a51";
  c.fillRect(20, 22, 5, 2); c.fillRect(33, 20, 4, 2);
  return cv;
}

// ----------------------------------------------------------- chão assado ----
// F0b (2026-10-26): o chão é assado em PIXELS DO BUFFER (1 px = WORLD_PER_PX
// unidades de mundo) e montado por AUTOTILE de 8x8, com a assinatura do
// Celeste descrita no guia de estilo: interior sólido (infill), 1 px de luz no
// topo, 1 px escuro na base, aresta nunca perfeitamente reta e 2-3 variantes
// de miolo sorteadas por tile. Tudo em fillRect de 1 px — sem gradiente e sem
// anti-aliasing — e o assado termina PRESO NA PALETA do bioma (16 cores de
// cena + 3 de fundo). Nada disso roda por quadro: é assado uma vez por mapa.
const MAT_SOLO = 0, MAT_MUSGO = 1, MAT_TRILHA = 2, MAT_ACENTO = 3;
/** Relevo de cada material: -1 cavado (caminho), 0 raso (terra), +1 elevado. */
const MAT_RAISE = [0, 1, -1, 1];

// Variantes de miolo: pixels soltos dentro do tile que quebram o chapado do
// infill. Tras variantes, escolhidas por hash — nunca por sorteio por quadro.
const MIOLO = [
  [[2, 3], [5, 5], [3, 6], [6, 1]],
  [[1, 5], [6, 2], [4, 4], [2, 7]],
  [[3, 2], [6, 6], [1, 3], [5, 7]],
];

/** Hash determinístico do tile: mesma semente, mesma aresta e mesmo miolo. */
function tileHash(tx, ty) {
  let h = (tx * 73856093) ^ (ty * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Estampa uma elipse (em unidades de mundo) sobre a grade de materiais. */
function stampGround(mat, tone, COLS, ROWS, wx, wy, rwx, rwy, material, tom) {
  const cx = wx / TILE_WORLD, cy = wy / TILE_WORLD;
  const rx = Math.max(0.34, rwx / TILE_WORLD), ry = Math.max(0.34, rwy / TILE_WORLD);
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(COLS - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(ROWS - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const i = y * COLS + x;
      if (material >= 0) mat[i] = material;
      if (tom >= 0) tone[i] = tom;
    }
  }
}

function bakeGround(rng) {
  const P = paletteFor(biome.id);
  const COLS = Math.ceil(WORLD_W / TILE_WORLD);
  const ROWS = Math.ceil(WORLD_H / TILE_WORLD);
  const cv = document.createElement("canvas");
  cv.width = COLS * TILE; cv.height = ROWS * TILE;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;
  const A = world.anthill;

  const mat = new Uint8Array(COLS * ROWS);
  const tone = new Uint8Array(COLS * ROWS);
  tone.fill(1);
  const stamp = (wx, wy, rx, ry, m, t) =>
    stampGround(mat, tone, COLS, ROWS, wx, wy, rx, ry, m, t);

  // 1. manchas grandes de solo: sobem ou descem um degrau na rampa do bioma
  for (let i = 0; i < 90; i++) {
    const r = 60 + rng() * 260;
    stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * (0.5 + rng() * 0.6), -1, rng() < 0.5 ? 0 : 2);
  }
  // 2. clareiras musgosas — tapete elevado sobre a terra
  for (let i = 0; i < 60; i++) {
    const r = 40 + rng() * 160;
    stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.6, MAT_MUSGO, -1);
  }
  // 3. faixas batidas de feromônio saindo do formigueiro (cavadas no chão)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng();
    const mx = A.x + Math.cos(a) * 700 + (rng() - 0.5) * 300;
    const my = A.y + Math.sin(a) * 700 + (rng() - 0.5) * 300;
    const ex = A.x + Math.cos(a) * 1500, ey = A.y + Math.sin(a) * 1500;
    for (let k = 0; k <= 48; k++) {
      const t = k / 48, u = 1 - t;
      const px = u * u * A.x + 2 * u * t * mx + t * t * ex;
      const py = u * u * A.y + 2 * u * t * my + t * t * ey;
      stamp(px, py, 14 + rng() * 10, 14 + rng() * 10, MAT_TRILHA, -1);
    }
  }
  // 4. cratera pisada em volta do formigueiro
  stamp(A.x, A.y, 170, 170, MAT_TRILHA, -1);
  // 5. estilo próprio do bioma (água parada, dunas, folhas, neve...)
  groundFlourish(stamp, rng);

  // ------------------------------------------------------------- autotile ---
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const i = ty * COLS + tx;
      const m = mat[i];
      const X = tx * TILE, Y = ty * TILE;
      const h = tileHash(tx, ty);
      let fill, luz, sombra;
      if (m === MAT_MUSGO) { fill = P.musgo[1]; luz = P.musgo[2]; sombra = P.musgo[0]; }
      else if (m === MAT_TRILHA) { fill = P.trilha; luz = P.trilha; sombra = P.infill; }
      else if (m === MAT_ACENTO) { fill = P.vegetacao[1]; luz = P.vegetacao[2]; sombra = P.vegetacao[0]; }
      else {
        const t = tone[i];
        fill = P.terreno[t]; luz = P.borda; sombra = t > 0 ? P.terreno[t - 1] : P.infill;
      }
      c.fillStyle = fill;
      c.fillRect(X, Y, TILE, TILE);

      // miolo: uma das variantes quebra o chapado do infill
      if (m !== MAT_TRILHA) {
        const v = MIOLO[h % MIOLO.length];
        c.fillStyle = ((h >>> 8) & 1) ? luz : sombra;
        for (let k = 0; k < v.length; k++) {
          if (((h >>> (k * 2 + 2)) & 3) === 0) continue;
          c.fillRect(X + v[k][0], Y + v[k][1], 1, 1);
        }
      }

      // luz e sombra de borda: 1 px, duras, com a aresta quebrada por 1 px
      const raise = MAT_RAISE[m];
      const up = ty > 0 ? MAT_RAISE[mat[i - COLS]] : raise;
      const dn = ty < ROWS - 1 ? MAT_RAISE[mat[i + COLS]] : raise;
      const lf = tx > 0 ? MAT_RAISE[mat[i - 1]] : raise;
      const rt = tx < COLS - 1 ? MAT_RAISE[mat[i + 1]] : raise;
      const n8 = (h >>> 12) & 7;
      if (raise > up) {                       // topo iluminado (luz alta)
        c.fillStyle = luz; c.fillRect(X, Y, TILE, 1);
        c.fillStyle = fill; c.fillRect(X + n8, Y, 1, 1);
      }
      if (raise > dn) {                       // base na sombra
        c.fillStyle = sombra; c.fillRect(X, Y + TILE - 1, TILE, 1);
        c.fillStyle = fill; c.fillRect(X + ((n8 + 3) & 7), Y + TILE - 1, 1, 1);
      }
      if (raise > lf) {                       // luz vem da esquerda
        c.fillStyle = luz; c.fillRect(X, Y, 1, TILE);
        c.fillStyle = fill; c.fillRect(X, Y + ((n8 + 5) & 7), 1, 1);
      }
      if (raise > rt) {
        c.fillStyle = sombra; c.fillRect(X + TILE - 1, Y, 1, TILE);
        c.fillStyle = fill; c.fillRect(X + TILE - 1, Y + ((n8 + 1) & 7), 1, 1);
      }
    }
  }

  // 6. grãos de solo, tufos e flores — sempre pixels de 1x1, nunca suavizados
  const specks = Math.round(W * H / 210);
  for (let i = 0; i < specks; i++) {
    c.fillStyle = rng() < 0.5 ? P.terreno[3] : P.infill;
    c.fillRect((rng() * W) | 0, (rng() * H) | 0, 1, 1);
  }
  const tufts = Math.round(W * H / 2700);
  for (let i = 0; i < tufts; i++) {
    const x = (rng() * W) | 0, y = (rng() * H) | 0;
    c.fillStyle = P.vegetacao[(rng() * P.vegetacao.length) | 0];
    c.fillRect(x, y, 1, 2);
    c.fillRect(x + 2, y, 1, 2);
    c.fillRect(x + 1, y - 1, 1, 2);
    if (rng() < 0.13) {
      c.fillStyle = P.acento[(rng() * P.acento.length) | 0];
      c.fillRect(x + 1, y - 3, 2, 2);
    }
  }

  // 7. sombras assadas: elipse por varredura, dura, com a borda em xadrez.
  // Coladas no pé de cada elemento — nada mais "flutuando".
  c.fillStyle = P.infill;
  for (const p of world.props) {
    if (p.noShadow || !p.collR) continue;
    const cx = (p.x + 2 * p.scale) / WORLD_PER_PX, cy = (p.y + 4 * p.scale) / WORLD_PER_PX;
    const rx = (p.collR * 1.5 * p.scale) / WORLD_PER_PX, ry = (p.collR * 0.78 * p.scale) / WORLD_PER_PX;
    if (rx < 0.5 || ry < 0.5) continue;
    const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (dy * dy > 1) continue;
      const dx = Math.sqrt(1 - dy * dy) * rx;
      const xa = Math.max(0, Math.round(cx - dx)), xb = Math.min(W - 1, Math.round(cx + dx));
      if (xa > xb) continue;
      if (Math.abs(dy) < 0.55) { c.fillRect(xa, y, xb - xa + 1, 1); continue; }
      for (let x = xa + (((y + xa) & 1) ? 1 : 0); x <= xb; x += 2) c.fillRect(x, y, 1, 1);
    }
  }

  // 8. borda externa mais escura: quatro faixas duras, sem traço borrado
  const bw = Math.max(2, Math.round(35 / WORLD_PER_PX));
  c.fillStyle = P.fundo[0];
  c.fillRect(0, 0, W, bw); c.fillRect(0, H - bw, W, bw);
  c.fillRect(0, 0, bw, H); c.fillRect(W - bw, 0, bw, H);

  // 9. batedeira final: prende tudo na paleta do bioma e mata o meio-tom
  quantizeToPalette(c, W, H, paletteColors(biome.id));

  world.ground = cv;
}

// Enfeites de chão por bioma: cada um estampa MATERIAIS na grade, nunca
// pixels — o desenho em si é trabalho do autotile (Regra 19: o acabamento do
// terreno é uma coisa, o decorativo é outra).
function groundFlourish(stamp, rng) {
  switch (biome.id) {
    case "planicie": {     // cascalho clarinho + maciços de trevo
      for (let i = 0; i < 40; i++) {
        const r = 20 + rng() * 55;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.5, MAT_ACENTO, -1);
      }
      break;
    }
    case "floresta": {     // raízes escuras serpenteando
      for (let i = 0; i < 50; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, a = rng() * TAU, len = 120 + rng() * 220;
        for (let k = 0; k < 10; k++) {
          const t = k / 9;
          stamp(x + Math.cos(a) * len * t, y + Math.sin(a) * len * t, 16, 12, MAT_TRILHA, -1);
        }
      }
      for (let i = 0; i < 30; i++) {
        const r = 40 + rng() * 90;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.6, MAT_MUSGO, -1);
      }
      break;
    }
    case "pantano": {      // poças de água parada + aguapés
      for (let i = 0; i < 26; i++) {
        const r = 30 + rng() * 80;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.6, MAT_MUSGO, -1);
      }
      for (let i = 0; i < 40; i++) {
        const r = 24 + rng() * 60;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.5, MAT_ACENTO, -1);
      }
      break;
    }
    case "deserto": {      // riachos de dunas + fendas de solo ressecado
      for (let i = 0; i < 120; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, a = rng() * TAU, len = 40 + rng() * 120;
        for (let k = 0; k < 6; k++) {
          const t = k / 5;
          stamp(x + Math.cos(a) * len * t, y + Math.sin(a) * len * t * 0.15, 12, 8, MAT_ACENTO, -1);
        }
      }
      for (let i = 0; i < 40; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, a = rng() * TAU;
        for (let k = 0; k < 4; k++) {
          stamp(x + Math.cos(a) * k * 14, y + Math.sin(a) * k * 14, 8, 8, MAT_TRILHA, -1);
        }
      }
      break;
    }
    case "outono": {       // tapetes de folhas caídas
      for (let i = 0; i < 130; i++) {
        const r = 25 + rng() * 70;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.5, MAT_ACENTO, -1);
      }
      break;
    }
    case "gelo": {         // montes de neve amontoada + rachaduras
      for (let i = 0; i < 90; i++) {
        const r = 30 + rng() * 80;
        stamp(rng() * WORLD_W, rng() * WORLD_H, r, r * 0.45, MAT_ACENTO, -1);
      }
      for (let i = 0; i < 50; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, a = rng() * TAU;
        for (let k = 0; k < 4; k++) {
          stamp(x + Math.cos(a) * k * 16, y + Math.sin(a) * k * 16, 9, 9, MAT_TRILHA, -1);
        }
      }
      break;
    }
  }
}

// ------------------------------------------------------------- minimapa -----
export const MINI = { w: 180, h: 135 };

function bakeMinimap() {
  const cv = document.createElement("canvas");
  cv.width = MINI.w; cv.height = MINI.h;
  const c = cv.getContext("2d");
  const sx = MINI.w / WORLD_W, sy = MINI.h / WORLD_H;
  c.fillStyle = "#171221"; c.fillRect(0, 0, MINI.w, MINI.h);
  for (const p of world.props) {
    if (/tree|cactus/.test(p.img)) { c.fillStyle = "rgba(90,167,92,0.8)"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
    else if (/rock/.test(p.img)) { c.fillStyle = "rgba(150,140,160,0.6)"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
    else if (/crys_blue|crys_violet/.test(p.img)) { c.fillStyle = "#8f7bd6"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
  }
  for (const p of world.piles) { c.fillStyle = "#ffb347"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
  world.mini = cv;
}

// ------------------------------------------------------------- utilidades ---
export function nearestPile(x, y, onlyKind = "food") {
  let best = null, bd = Infinity;
  for (const p of world.piles) {
    if (p.amount <= 0 || p.kind !== onlyKind) continue;
    if (p.blocked) continue;
    if (Math.hypot(p.x - world.anthill.x, p.y - world.anthill.y) < 150) continue; // dentro da parede
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

export function nearestNode(x, y, kind) {
  let best = null, bd = Infinity;
  for (const n of world.nodes) {
    if (n.amount <= 0 || n.kind !== kind) continue;
    if (n.blocked) continue;
    if (Math.hypot(n.x - world.anthill.x, n.y - world.anthill.y) < 150) continue; // dentro da parede
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function randGate() { return world.gates[(Math.random() * world.gates.length) | 0]; }
