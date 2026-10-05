// A arte é um único PNG RGBA. Saturação e máscaras são assadas somente quando
// compras mudam, nunca por frame. Sem Canvas.filter (compatível também no mobile).
// Regra 14: a preparação pesada (pesos de cor por pixel + 1º assado) roda em
// fatias no TITLE (treeArtSteps, via preload.js) — a árvore abre sem tela de
// carregamento; se o jogador chegar antes, treeArtCanvas termina o que faltar.
import { META_STAGES, FRUIT_TREES } from "./config.js";
import { metaLevel } from "./state.js";
import { IMG } from "./assets.js";
import { TREE_STAGE_NODES, TREE_COLOR_REGIONS, TREE_ALL } from "./tree_layout.js";
import { drainSteps, offThreadDecode, releaseDecoded } from "./utils.js";

const GROUPS = META_STAGES.map((s, i) => [
  ...TREE_STAGE_NODES[i], ...(!FRUIT_TREES[i].pending ? FRUIT_TREES[i].nodes : []),
]);
const growth = {
  levels: new Uint16Array(7), totals: GROUPS.map(nodes => nodes.reduce((n, node) => n + node.cost.length, 0)),
  stages: new Float32Array(7), baseOwned: new Uint8Array(7), restoredPercent: 0, ownedNodes: 0,
};

export function treeGrowth() {
  let sum = 0, total = 0;
  for (let i = 0; i < 7; i++) {
    let levels = 0; growth.baseOwned[i] = 0;
    for (const n of GROUPS[i]) {
      const owned = Math.max(0, Math.min(n.cost.length, metaLevel(n.id)));
      levels += owned;
      if (n.stage && owned > 0) growth.baseOwned[i]++;
    }
    growth.levels[i] = levels;
    growth.stages[i] = levels / growth.totals[i];
    sum += levels; total += growth.totals[i];
  }
  // Uma primeira compra já conta; 100% é reservado à restauração completa.
  growth.restoredPercent = sum === 0 ? 0 : sum === total ? 100 : Math.max(1, Math.floor(100 * sum / total));
  growth.ownedNodes = 0;
  for (const n of TREE_ALL) if (metaLevel(n.id) > 0) growth.ownedNodes++;
  return growth;
}

let source = null, canvas = null, painter = null, original = null, output = null;
let regionA = null, regionB = null, weight = null, gray = null;
const lastLevels = new Int16Array(7).fill(-1), saturation = new Float32Array(7);
let bakes = 0;
// Preparação em andamento: o TITLE avança em fatias (treeArtSteps) e quem
// desenhar antes do fim continua o MESMO trabalho, sem recomeçar do zero.
let preparing = null, preparingFor = null;
const SLICE = 1 << 15;   // pixels por fatia do 1º assado

function syncLevels(progress) {
  let changed = false;
  for (let i = 0; i < 7; i++) {
    if (lastLevels[i] !== progress.levels[i]) changed = true;
    lastLevels[i] = progress.levels[i];
    // As primeiras compras já são visíveis; 100% só ao completar a região.
    saturation[i] = Math.sqrt(progress.stages[i]);
  }
  return changed;
}

function blend(px, dst, g, rA, rB, wt, p0, p1) {
  for (let p = p0; p < p1; p++) {
    const k = p * 4;
    if (!px[k + 3]) continue;
    const w = wt[p] / 255;
    const amount = saturation[rA[p]] * w + saturation[rB[p]] * (1 - w);
    dst[k] = Math.round(g[p] + (px[k] - g[p]) * amount);
    dst[k + 1] = Math.round(g[p] + (px[k + 1] - g[p]) * amount);
    dst[k + 2] = Math.round(g[p] + (px[k + 2] - g[p]) * amount);
    dst[k + 3] = px[k + 3];
  }
}

function* prepareSteps(image, drawSource = image) {
  const fail = () => { source = image; canvas = null; };
  if (typeof document === "undefined" || !image?.width) return fail();
  const cv = document.createElement("canvas");
  cv.width = image.width; cv.height = image.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return fail();
  c.drawImage(drawSource || image, 0, 0);
  const data = c.getImageData(0, 0, cv.width, cv.height);
  // Os testes de lógica usam um canvas simulado sem pixels reais.
  if (!data || data.data.length !== cv.width * cv.height * 4 ||
      typeof c.createImageData !== "function" || typeof c.putImageData !== "function") return fail();
  const W = cv.width, H = cv.height, count = W * H, px = data.data;
  const out = c.createImageData(W, H);
  const rA = new Uint8Array(count), rB = new Uint8Array(count), wt = new Uint8Array(count), g = new Uint8Array(count);
  for (let y = 0; y < H; y++) {
    if ((y & 7) === 0) yield;   // 8 linhas (~6 mil pixels) por fatia
    for (let x = 0; x < W; x++) {
      const p = y * W + x, k = p * 4;
      if (!px[k + 3]) continue;
      g[p] = Math.round(px[k] * .2126 + px[k + 1] * .7152 + px[k + 2] * .0722);
      let first = Infinity, second = Infinity, a = 0, b = 0;
      for (let r = 0; r < TREE_COLOR_REGIONS.length; r++) {
        let distance = Infinity;
        for (const point of TREE_COLOR_REGIONS[r]) {
          const dx = (x - point[0]) / 110, dy = (y - point[1]) / 75;
          distance = Math.min(distance, dx * dx + dy * dy);
        }
        if (distance < first) { second = first; b = a; first = distance; a = r; }
        else if (distance < second) { second = distance; b = r; }
      }
      rA[p] = a; rB[p] = b;
      // Mescla suave entre galhos, sem faixas retangulares ou emendas na casca.
      const da = (first + .02) ** 2, db = (second + .02) ** 2;
      wt[p] = Math.round(255 * db / (da + db));
    }
  }
  // 1º assado ainda fora de vista: a árvore só aparece já com a cor certa.
  syncLevels(treeGrowth());
  for (let p0 = 0; p0 < count; p0 += SLICE) {
    yield;
    blend(px, out.data, g, rA, rB, wt, p0, Math.min(count, p0 + SLICE));
  }
  c.putImageData(out, 0, 0);
  bakes++;
  source = image; canvas = cv; painter = c; original = px; output = out;
  regionA = rA; regionB = rB; weight = wt; gray = g;
}

function preparation(image, drawSource) {
  if (!preparing || preparingFor !== image) { preparing = prepareSteps(image, drawSource); preparingFor = image; }
  return preparing;
}
function settle(it) { if (preparing === it) preparing = preparingFor = null; }

export function treeArtCanvas(progress = treeGrowth()) {
  const image = IMG.tree_ancestral;
  if (image !== source) {
    // Termina na hora o que o pré-carregamento do TITLE ainda não fatiou.
    const it = preparation(image);
    drainSteps(it); settle(it);
  }
  if (!canvas) return null;
  if (!syncLevels(progress)) return canvas;
  blend(original, output.data, gray, regionA, regionB, weight, 0, gray.length);
  painter.putImageData(output, 0, 0);
  bakes++;
  return canvas;
}

/** Regra 14 — pré-carregamento do TITLE (preload.js): a mesma preparação em fatias. */
export function* treeArtSteps() {
  const image = IMG.tree_ancestral;
  if (!image || image === source) return;
  // PNG decodificado fora da thread principal antes do primeiro desenho.
  const decoded = yield offThreadDecode(image);
  if (image !== source) {
    const it = preparation(image, decoded || image);
    while (preparing === it && !it.next().done) yield;
    settle(it);
  }
  releaseDecoded(decoded, image);
}

// Diagnóstico de regressão: leitura apenas, não altera saves nem progresso.
export function treeArtInfo() {
  return { bakes, width: canvas?.width || 0, height: canvas?.height || 0 };
}
