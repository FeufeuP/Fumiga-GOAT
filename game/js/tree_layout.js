// Coordenadas visuais em pixels de mundo, ancoradas na arte aprovada.
// Nunca usadas para custos, desbloqueios ou saves. Uma unidade de arte = 4 de mundo.
import { META_NODES, FRUIT_TREES } from "./config.js";

export const TREE_ART = { width: 768, height: 672, scale: 4 };
export const TREE_NODE_RADII = [34, 42, 52];
const at = (x, y) => ({ x: x * TREE_ART.scale, y: y * TREE_ART.scale });
const SLOTS = {
  raiz: [385, 610], g_dan: [282, 378], g_vid: [244, 385], t_col: [203, 371],
  t_vel: [157, 367], n_dig: [322, 392], r_vida: [359, 450], r_reg: [325, 435],
  g_cri: [440, 375], g_grd: [478, 358], t_carga: [518, 342], t_rap: [562, 335],
  n_corr: [603, 348], n_berco: [639, 331], r_ovo: [481, 404],
  g_cad: [197, 260], g_arm: [239, 273], g_alc: [280, 287], t_ini: [157, 250],
  t_ambar: [120, 214], n_fung: [314, 318], r_pop: [357, 337],
  g_bomb: [461, 293], g_esq: [500, 274], g_fogo: [541, 254], t_rede: [574, 236],
  t_estoque: [601, 205], n_ovo: [454, 249], n_eco: [521, 211],
  g_esp: [267, 154], t_atalho: [238, 125], n_desp: [291, 187], n_zelo: [314, 220],
  r_casca: [342, 198], r_xp: [327, 160], r_essin: [308, 124],
  k_bala: [435, 204], k_prata: [454, 166], k_cortadeira: [490, 155], k_mel: [522, 135],
  k_matabele: [558, 132], r_regen: [493, 194], r_ess: [473, 115],
  k_arpao: [344, 99], k_acrobata: [372, 66], k_cefalote: [412, 77], k_tecela: [444, 70],
  k_dinoponera: [405, 122], r_ren: [385, 165],
};
export const TREE_NODES = META_NODES.map(n => ({ ...n, ...at(...SLOTS[n.id]) }));
export const TREE_BY_ID = new Map(TREE_NODES.map(n => [n.id, n]));
// Frutos naturais, alternados nos galhos, não mais em uma fila na copa.
const FRUIT_SLOTS = [[92, 382], [708, 324], [99, 259], [675, 203], [190, 132], [603, 100], [388, 30]];
const FRUIT_POSITIONS = FRUIT_SLOTS.map(p => at(...p));
export function fruitCenter(i) { return FRUIT_POSITIONS[i]; }

// Nome de asset do fruto: o mundo 7 é "topo" em config.js e "palida" nas
// artes aprovadas (maca_palida, santuario_palida). Mapeamento único, usado
// pelo jogo e pelos testes — nunca mais espalhar "topo"→"palida" à mão.
export function fruitAssetName(fruit) { return fruit.map === "topo" ? "palida" : fruit.map; }

// Regiões orgânicas da cor (coordenadas da imagem, não da interface).
// Raízes/tronco baixo pertencem ao galho inicial; a copa pertence ao sétimo.
export const TREE_COLOR_REGIONS = [
  [[201, 385], [373, 550], [374, 626]],
  [[540, 360], [660, 330], [410, 407]],
  [[172, 260], [326, 307]],
  [[562, 234], [449, 280]],
  [[265, 143], [314, 204]],
  [[527, 142], [448, 198]],
  [[392, 65], [388, 147]],
];
export const TREE_STAGE_NODES = Array.from({ length: 7 }, (_, i) => TREE_NODES.filter(n => n.stage === i + 1));
export const TREE_STAGE_BOUNDS = TREE_STAGE_NODES.map((nodes, i) => {
  // A raiz é o elo entre gerações, não deve afastar a câmera do primeiro galho.
  const points = [...nodes.filter(n => n.id !== "raiz"), fruitCenter(i)];
  const xs = points.map(n => n.x), ys = points.map(n => n.y);
  // margens ampliadas em 2026-09-28: o quadro do fruto passou a 450 px
  // (metade = 225) e o foco do estágio precisa enxergar a maçã inteira.
  return { minX: Math.min(...xs) - 250, maxX: Math.max(...xs) + 250,
    minY: Math.min(...ys) - 250, maxY: Math.max(...ys) + 250 };
});

// Flores dos Santuários (coords de tela 960×540). As 10 melhorias novas e as
// 3 legadas ficam juntas em cinco fileiras; nenhuma pétala recebe placa/cadeado.
// Santuário da fruta (960×540): clareira orgânica determinística por bioma.
// Semente fixa por mapa garante que cada santuário tenha seu próprio arranjo natural
// estritamente dentro do oval central de grama (abaixo da maçã flutuante elevada e
// longe das raízes da borda, cactos/crânios, cogumelos e painel lateral x=738).
// A distância mínima >= 52 px permite hitbox invisível de 44 px + respiro.
const CLEARING_SEEDS = {
  planicie: { cx: 476, cy: 356, rx: 238, ry: 82, seed: 104729 },
  floresta: { cx: 476, cy: 356, rx: 234, ry: 80, seed: 224737 },
  pantano:  { cx: 478, cy: 348, rx: 228, ry: 76, seed: 350377 },
  deserto:  { cx: 508, cy: 352, rx: 202, ry: 82, seed: 481123 },
  outono:   { cx: 478, cy: 356, rx: 234, ry: 80, seed: 611953 },
  gelo:     { cx: 476, cy: 358, rx: 238, ry: 80, seed: 746773 },
};
function makeClearingRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s) >>> 0;
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function buildBiomeClearingSlots({ cx, cy, rx, ry, seed }, count = 14) {
  const rng = makeClearingRng(seed);
  const pts = new Array(count);
  // Índice 10 (11º nó global) é a Flor Suprema: nasce no coração da clareira com offset orgânico
  const supAngle = rng() * Math.PI * 2;
  const supR = 0.12 + rng() * 0.24;
  pts[10] = {
    x: Math.round(cx + Math.cos(supAngle) * rx * supR),
    y: Math.round(cy + Math.sin(supAngle) * ry * supR),
  };
  const placed = [10];
  for (let i = 0; i < count; i++) {
    if (i === 10) continue;
    let bestP = null, bestScore = -1e9;
    for (let attempt = 0; attempt < 500; attempt++) {
      const u = rng(), v = rng();
      const angle = u * Math.PI * 2;
      const r = 0.24 + 0.68 * Math.sqrt(v);
      const px = Math.round(cx + Math.cos(angle) * rx * r);
      const py = Math.round(cy + Math.sin(angle) * ry * r);
      let minD = 1e9, ok = true;
      for (const j of placed) {
        const d = Math.hypot(px - pts[j].x, py - pts[j].y);
        const need = j === 10 ? 64 : 56;
        if (d < need) ok = false;
        if (d < minD) minD = d;
      }
      if (ok) { bestP = { x: px, y: py }; break; }
      if (minD > bestScore) { bestScore = minD; bestP = { x: px, y: py }; }
    }
    pts[i] = bestP;
    placed.push(i);
  }
  return pts;
}
export const SANTUARIO_SLOTS_BY_MAP = Object.fromEntries(
  Object.entries(CLEARING_SEEDS).map(([map, cfg]) => [map, buildBiomeClearingSlots(cfg, 14)])
);
export const SANTUARIO_SLOTS = SANTUARIO_SLOTS_BY_MAP.planicie;
export function santuarioSlotsForMap(mapId) {
  return SANTUARIO_SLOTS_BY_MAP[mapId] || SANTUARIO_SLOTS;
}
export function fruitFlowerPos(fi, ni) {
  const fruit = FRUIT_TREES[fi], node = fruit?.nodes[ni];
  if (!fruit || !node || fruit.pending) return null;
  const local = node.global ? fruit.newNodes.indexOf(node) : fruit.newNodes.length + fruit.legacyNodes.indexOf(node);
  const slots = santuarioSlotsForMap(fruit.map);
  return slots[local] || null;
}

// Miniárvores mantêm coordenadas de grade LOCAIS e todos os IDs antigos.
export function fruitGridSlot(i) { return { x: i >= 9 ? i - 8 : i % 3, y: Math.floor(Math.min(i, 9) / 3) }; }
export function fruitNodePos(fi, ni) {
  const legacyCount = FRUIT_TREES[fi].legacyNodes.length;
  return fruitGridSlot(ni < legacyCount ? ni : ni - legacyCount);
}
export const TREE_FRUITS = FRUIT_TREES.flatMap((f, fi) => f.nodes.map((n, ni) => ({
  ...n, ...fruitNodePos(fi, ni), _fruitIdx: fi, _nodeIdx: ni, _fruit: f,
})));
export const TREE_ALL = [...TREE_NODES, ...TREE_FRUITS];
