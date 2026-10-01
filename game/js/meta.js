// FUMIGA — Árvore ancestral: sete galhos, cor restaurada e compras explícitas.
// PC e mobile compartilham arte, câmera, progressão e interface.
import { PAL, META_BRANCHES, META_STAGES, VIEW_W, VIEW_H, FRUIT_TREES } from "./config.js";
import { G, metaLevel, metaCanBuy, metaBuy, isFruitUnlocked, isSupremeFlowerUnlocked, supremeProgress, isTreeStageUnlocked, treeStageRequirement } from "./state.js";
import { drawText, textWidth, wrapText, fontScale, layoutRec } from "./font.js";
import { IMG, loadSantuario } from "./assets.js";
import { panel, button, hitArea, pointInRect, isTouchUI } from "./ui.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";
import { clamp, TAU } from "./utils.js";
import {
  TREE_ART, TREE_NODES, TREE_BY_ID, TREE_ALL, TREE_STAGE_NODES, TREE_STAGE_BOUNDS,
  TREE_NODE_RADII, fruitCenter, fruitFlowerPos, fruitAssetName,
} from "./tree_layout.js";
import { treeArtCanvas, treeGrowth } from "./tree_art.js";
import { createColorRestorer } from "./color_restore.js";

export const TREE_VIEW = { x: 184, y: 100, w: 764, h: 386 };
const DETAIL = { x: 608, y: 100, w: 340, h: 386 };
// Painel de detalhe DENTRO do santuário (mais estreito que o da árvore).
// Constante única: o desenho (drawNodeTip) e o clique das flores compartilham
// o retângulo, senão um toque no EVOLUIR/FECHAR atravessaria para uma flor.
const FRUIT_DETAIL = { x: 738, y: 116, w: 210, h: 382 };
const MINI_TOP = 162, MIN_ZOOM = .10, MAX_ZOOM = 1.25;
const ART_W = TREE_ART.width * TREE_ART.scale, ART_H = TREE_ART.height * TREE_ART.scale;
const reduced = () => !!G.save.accessibility?.reducedParticles || G.save.settings?.particles === false;
const time = () => reduced() ? 0 : G.time;
const pan = { x: ART_W / 2, y: ART_H / 2 };
let zoom = .14, focusedStage = 0, drag = null, clickTarget = null;
let hoverNode = null, hoverFruit = null, selectedNode = null, activeFruit = null;
const screenPoints = new Map(TREE_NODES.map(n => [n.id, { x: 0, y: 0 }]));
const fruitPoints = FRUIT_TREES.map(() => ({ x: 0, y: 0 }));
const origin = { x: 0, y: 0 }, worldOrigin = { x: 0, y: 0 };

function viewWidth() { return selectedNode ? DETAIL.x - TREE_VIEW.x - 12 : TREE_VIEW.w; }
function cx() { return TREE_VIEW.x + viewWidth() / 2; }
function cy() { return TREE_VIEW.y + TREE_VIEW.h / 2; }
function project(n, out) {
  out.x = cx() + (n.x - pan.x) * zoom;
  out.y = cy() + (n.y - pan.y) * zoom;
  return out;
}
function positions() {
  for (const n of TREE_NODES) project(n, screenPoints.get(n.id));
  for (let i = 0; i < 7; i++) project(fruitCenter(i), fruitPoints[i]);
}
function clampPan() {
  const mx = Math.min(ART_W / 2, viewWidth() / (2 * zoom));
  const my = Math.min(ART_H / 2, TREE_VIEW.h / (2 * zoom));
  pan.x = clamp(pan.x, mx - 100, ART_W - mx + 100);
  pan.y = clamp(pan.y, my - 100, ART_H - my + 100);
}
function zoomAt(factor, x = cx(), y = cy()) {
  const wx = pan.x + (x - cx()) / zoom, wy = pan.y + (y - cy()) / zoom;
  zoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
  pan.x = wx - (x - cx()) / zoom; pan.y = wy - (y - cy()) / zoom;
  clampPan();
}
export function treeFit() {
  selectedNode = null; focusedStage = 0;
  zoom = clamp(Math.min((TREE_VIEW.w - 30) / ART_W, (TREE_VIEW.h - 16) / ART_H), MIN_ZOOM, 1);
  pan.x = ART_W / 2; pan.y = ART_H / 2;
  drag = clickTarget = null;
}
export function enterTree() {
  activeFruit = null; hoverNode = hoverFruit = null;
  treeFit();
}
export function treeFocusStage(stage) {
  const b = TREE_STAGE_BOUNDS[stage - 1];
  if (!b) return;
  activeFruit = selectedNode = null; focusedStage = stage;
  zoom = clamp(Math.min((TREE_VIEW.w - 60) / (b.maxX - b.minX),
    (TREE_VIEW.h - 70) / (b.maxY - b.minY)), .32, .80);
  pan.x = (b.minX + b.maxX) / 2; pan.y = (b.minY + b.maxY) / 2;
  drag = clickTarget = null;
  clampPan();
}
function inWorld(x, y) { return pointInRect(x, y, TREE_VIEW.x, TREE_VIEW.y, viewWidth(), TREE_VIEW.h); }
function pickAt(x, y) {
  hoverNode = hoverFruit = null;
  let nearest = Infinity;
  for (const n of TREE_NODES) {
    const p = screenPoints.get(n.id), d = Math.hypot(x - p.x, y - p.y);
    if (d < Math.max(isTouchUI() ? 22 : 10, TREE_NODE_RADII[n.tier || 0] * zoom + 5) && d < nearest) {
      nearest = d; hoverNode = n;
    }
  }
  for (let i = 0; i < 7; i++) {
    const p = fruitPoints[i], d = Math.hypot(x - p.x, y - p.y);
    if (d < Math.max(22, FRUIT_FRAME / 2 * zoom) && d < nearest) {
      nearest = d; hoverFruit = FRUIT_TREES[i]; hoverNode = null;
    }
  }
}
export function updateTree() {
  hoverNode = hoverFruit = null; clickTarget = null;
  if (activeFruit) { drag = null; return; }
  if (mouse.wheel && inWorld(mouse.x, mouse.y)) {
    zoomAt(mouse.wheel > 0 ? .90 : 1.11, mouse.x, mouse.y);
    drag = null; // pinça nunca se converte em seleção ao soltar
  }
  positions();
  if (mouse.justDown && inWorld(mouse.x, mouse.y)) {
    drag = { x: mouse.x, y: mouse.y, px: pan.x, py: pan.y, distance: 0 };
  }
  if (drag && (mouse.down || mouse.justUp)) {
    const dx = mouse.x - drag.x, dy = mouse.y - drag.y;
    drag.distance = Math.max(drag.distance, Math.hypot(dx, dy));
    if (mouse.down && drag.distance > 8) {
      pan.x = drag.px - dx / zoom; pan.y = drag.py - dy / zoom;
      clampPan(); positions();
    }
  }
  if (inWorld(mouse.x, mouse.y)) pickAt(mouse.x, mouse.y);
  if (mouse.justUp && drag && drag.distance <= 8) clickTarget = hoverFruit || hoverNode;
  if (!mouse.down) drag = null;
}
export function treeWasDragging() { return !!drag && drag.distance > 8; }
export function treeClick() {
  const target = clickTarget; clickTarget = null;
  if (!target) return false;
  if (target.map) { openFruit(target); return true; }
  // Na visão geral do celular os nós são pequenos: o primeiro toque aproxima
  // o galho; a compra continua sempre em EVOLUIR, jamais no desenho da árvore.
  if (isTouchUI() && zoom < .32 && target.id !== "raiz") { treeFocusStage(target.stage); return true; }
  selectNode(target);
  return true;
}

function selectNode(n) {
  selectedNode = n; focusedStage = n.stage;
  pan.x = n.x; pan.y = n.y; zoom = Math.max(.55, zoom);
  clampPan();
}

function backdrop(ctx) {
  ctx.fillStyle = "#15101e"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Mesmo céu da TITLE, estático e discreto: não muda o parallax do menu.
  if (IMG.parallax_sky) {
    ctx.globalAlpha = .16;
    ctx.drawImage(IMG.parallax_sky, 0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 180, 0, VIEW_H);
  g.addColorStop(0, "#15101e00"); g.addColorStop(1, "#130f1df0");
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
function nodePath(ctx, x, y, r, tier) {
  ctx.beginPath();
  const sides = tier === 2 ? 6 : 8;
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + i * TAU / sides;
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawConnections(ctx) {
  // A madeira da ilustração substitui o emaranhado de linhas da versão antiga.
  // Conexões de pré-requisito aparecem no galho em foco e ao inspecionar um nó.
  if (!focusedStage && !selectedNode) return;
  for (const n of TREE_NODES) {
    if (selectedNode ? n.id !== selectedNode.id && !n.requires.includes(selectedNode.id) : n.stage !== focusedStage) continue;
    const p = screenPoints.get(n.id);
    for (const id of n.requires) {
      const q = screenPoints.get(id), owned = metaLevel(id) > 0;
      ctx.strokeStyle = owned ? "#ffd479" : "#aca3b5";
      ctx.globalAlpha = selectedNode ? .75 : .25; ctx.lineWidth = owned ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(q.x, q.y);
      ctx.quadraticCurveTo((q.x + p.x) / 2, p.y + 20 * zoom, p.x, p.y); ctx.stroke();
      if (owned && !reduced()) {
        const t = (time() * .3 + n.x * .001) % 1;
        ctx.fillStyle = "#ffe6a3";
        ctx.fillRect(q.x + (p.x - q.x) * t - 1, q.y + (p.y - q.y) * t - 1, 2, 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}
function drawNode(ctx, n) {
  const p = screenPoints.get(n.id), tier = n.tier || 0;
  const radius = Math.max(6, TREE_NODE_RADII[tier] * zoom);
  if (p.x + radius < TREE_VIEW.x || p.x - radius > TREE_VIEW.x + viewWidth() ||
      p.y + radius < TREE_VIEW.y || p.y - radius > TREE_VIEW.y + TREE_VIEW.h) return;
  const lvl = metaLevel(n.id), chk = metaCanBuy(n.id), max = n.cost.length;
  const hot = hoverNode === n || selectedNode?.id === n.id;
  const col = META_BRANCHES[n.br].color, unlocked = isTreeStageUnlocked(n.stage);
  const relevant = !focusedStage || n.stage === focusedStage || hot || selectedNode?.requires.includes(n.id);
  ctx.fillStyle = !relevant ? "#17141e90" : lvl ? "#28212c" : "#191720";
  ctx.strokeStyle = !relevant ? "#84708080" : hot ? "#fff0c7" : lvl ? col : chk.ok ? "#ffd479" : unlocked ? "#8e8694" : "#615c69";
  ctx.lineWidth = hot ? 2.5 : lvl ? 2 : 1;
  nodePath(ctx, p.x, p.y, radius, tier); ctx.fill(); ctx.stroke();
  if (relevant && tier > 0 && zoom >= .32) {
    ctx.strokeStyle = lvl ? (tier === 2 ? "#ffd479" : "#6ee7ff") : "#71647f";
    ctx.lineWidth = 1; nodePath(ctx, p.x, p.y, radius + 4, tier); ctx.stroke();
  }
  if (relevant && chk.ok && !reduced()) {
    ctx.globalAlpha = .25 + .1 * Math.sin(time() * 2);
    ctx.strokeStyle = "#ffd479"; nodePath(ctx, p.x, p.y, radius + 5, tier); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const icon = IMG[n.sprite] || IMG["i_" + n.icon];
  if (icon) {
    const size = Math.max(9, Math.min(radius * 1.5, 46 * zoom));
    ctx.globalAlpha = relevant ? (lvl || unlocked ? 1 : .50) : .35;
    ctx.drawImage(icon, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    ctx.globalAlpha = 1;
  }
  if (!relevant || zoom < .32 && !hot) return;
  const pipW = Math.max(3, 5 * zoom), pipGap = pipW + 3;
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < lvl ? col : "#514957";
    ctx.fillRect(Math.round(p.x - (max * pipGap - 3) / 2 + i * pipGap), Math.round(p.y + radius + 5), pipW, 3);
  }
  const label = lvl >= max ? "MAX" : String(n.cost[lvl]);
  const scale = .63, tw = textWidth(label, { scale }) + 10;
  const py = p.y + radius + 13, th = Math.ceil(18 * scale * fontScale()) + 4;
  // Preços fora do recorte não passam por baixo de painéis/botões.
  if (py + th < TREE_VIEW.y + TREE_VIEW.h && p.x - tw / 2 >= TREE_VIEW.x && p.x + tw / 2 <= TREE_VIEW.x + viewWidth()) {
    ctx.fillStyle = "#17121fe8"; ctx.fillRect(p.x - tw / 2, py, tw, th);
    drawText(ctx, label, p.x, py + 1, { align: "center", scale, color: lvl >= max ? "#ffd479" : unlocked ? PAL.text : PAL.textDim });
  }
}
// Maçãs dos frutos (entrega A do handoff, 2026-09-27): a arte aprovada
// substitui o polígono procedural. Quadro de 450 px no zoom 1 — 3x dos
// 150 iniciais (decisão do usuário, 2026-09-28), com o corpo de TODAS as
// maçãs normalizado para o mesmo tamanho (tools/repair_fruit_sprites.py);
// o raio de clique acompanha o quadro — a coordenada do fruto NUNCA muda
// (validada pelo treemap.mjs). Sem número no fruto: a trajetória 1→7 se
// lê pelo caminho dos galhos (decisão do usuário, 2026-09-27 — o número
// segue na lista de patamares).
const FRUIT_FRAME = 450;
const FRUIT_GRAY = new Map();

/** Versão acromática da maçã, assada UMA vez e cacheada — mesmo critério do
 *  `tree_art.js`: sem cor = mundo ainda não conquistado. Só muda o RGB dos
 *  pixels opacos; o alfa (e a silhueta) ficam intocados. */
function fruitGray(key) {
  let g = FRUIT_GRAY.get(key);
  if (!g) {
    const src = IMG[key];
    g = document.createElement("canvas");
    g.width = src.width; g.height = src.height;
    const c = g.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0);
    const d = c.getImageData(0, 0, g.width, g.height);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const l = Math.round(px[i] * .2126 + px[i + 1] * .7152 + px[i + 2] * .0722);
      px[i] = px[i + 1] = px[i + 2] = l;
    }
    c.putImageData(d, 0, 0);
    FRUIT_GRAY.set(key, g);
  }
  return g;
}

function drawFruit(ctx, fruit, i) {
  const p = fruitPoints[i], s = FRUIT_FRAME * zoom;
  const r = s / 2 + 8; // sombra/brilho + margem, para o corte fora da tela
  if (p.x + r < TREE_VIEW.x || p.x - r > TREE_VIEW.x + viewWidth() || p.y + r < TREE_VIEW.y || p.y - r > TREE_VIEW.y + TREE_VIEW.h) return;
  const unlocked = isFruitUnlocked(fruit.map), hot = hoverFruit === fruit;
  const locked = !unlocked && !fruit.pending;
  const key = "maca_" + fruitAssetName(fruit);
  const img = IMG[key];
  if (img) {
    ctx.imageSmoothingEnabled = false;
    // Sem aro: a maçã assenta no galho com sombra de contato suave, como as
    // frutas da ilustração — orgânica, parte da árvore e não um botão.
    const under = ctx.createRadialGradient(p.x, p.y + s * .30, s * .04, p.x, p.y + s * .30, s * .42);
    under.addColorStop(0, "rgba(12,7,18,.55)");
    under.addColorStop(1, "rgba(12,7,18,0)");
    ctx.fillStyle = under;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + s * .30, s * .48, s * .22, 0, 0, TAU); ctx.fill();
    // O hover é uma luz que nasce da silhueta do fruto — nunca um círculo
    // desenhado em volta. Some suave nas bordas, invadindo a madeira.
    if (hot) {
      const glow = ctx.createRadialGradient(p.x, p.y, s * .08, p.x, p.y, s * .58);
      glow.addColorStop(0, "rgba(255,240,199,.34)");
      glow.addColorStop(.55, "rgba(255,212,121,.12)");
      glow.addColorStop(1, "rgba(255,212,121,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, s * .58, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // Sem cadeado, sem corrente e sem aro (decisão do usuário, 2026-09-29):
    // fruto bloqueado é a maçã acinzentada com o rótulo FRUTO BLOQUEADO e o
    // painel dizendo o pré-requisito; a Pálida (futura) é a maçã branca com o
    // rótulo FRUTO FUTURO. A arte nunca é coberta por símbolo algum.
    ctx.drawImage(locked ? fruitGray(key) : img, Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  if (zoom >= .32 && (focusedStage === i + 1 || hot)) {
    const label = fruit.pending ? "FRUTO FUTURO" : unlocked ? "ABRIR FRUTO" : "FRUTO BLOQUEADO";
    drawText(ctx, label, clamp(p.x, TREE_VIEW.x + 66, TREE_VIEW.x + viewWidth() - 66), p.y - s / 2 - 14, { align: "center", scale: .60, color: unlocked ? fruit.color : PAL.textDim, maxWidth: 132 });
  }
}

export function drawTree(ctx) {
  if (activeFruit) return drawFruitMini(ctx);
  const growth = treeGrowth();
  backdrop(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(TREE_VIEW.x, TREE_VIEW.y, viewWidth(), TREE_VIEW.h); ctx.clip();
  layoutRec.layer = "world";
  ctx.imageSmoothingEnabled = false;
  const art = treeArtCanvas(growth);
  project(worldOrigin, origin);
  if (art) ctx.drawImage(art, Math.round(origin.x), Math.round(origin.y), ART_W * zoom, ART_H * zoom);
  positions(); drawConnections(ctx);
  for (const n of TREE_NODES) drawNode(ctx, n);
  for (let i = 0; i < 7; i++) drawFruit(ctx, FRUIT_TREES[i], i);
  const root = screenPoints.get("raiz");
  if (!focusedStage) drawText(ctx, "COLÔNIA ANCESTRAL", root.x, root.y + 24, { align: "center", scale: .65, color: PAL.textDim });
  ctx.restore(); layoutRec.layer = "ui";
  if (selectedNode) drawNodeTip(ctx, selectedNode);
  const action = drawTreeHUD(ctx, growth);
  return action;
}
function drawTreeHUD(ctx, growth) {
  panel(ctx, 12, 10, 366, 82, { border: "#8c7552" });
  drawText(ctx, "ÁRVORE DA EVOLUÇÃO", 26, 18, { font: "big", color: "#ffd479", maxWidth: 338 });
  drawText(ctx, growth.ownedNodes + "/" + TREE_ALL.length + " MEMÓRIAS • COR " + growth.restoredPercent + "%", 26, 58,
    { scale: .72, color: PAL.textDim, maxWidth: 338 });
  panel(ctx, 386, 10, 154, 82, { border: "#8f6fd6" });
  drawText(ctx, "ESSÊNCIA", 400, 17, { scale: .7, color: PAL.textDim });
  drawText(ctx, G.save.essence, 400, 44, { font: "big", color: "#d7a2ff", maxWidth: 126 });
  if (button(ctx, { x: 552, y: 14, w: 124, h: 44, compact: true, label: "MEMÓRIAS", id: "treeMemories", scale: .85, accent: "#ffd479" })) return "memories";
  if (button(ctx, { x: 684, y: 14, w: 124, h: 44, compact: true, label: "PROFECIAS", id: "treeProphecy", scale: .85, accent: "#6ee7ff" })) return "prophecies";
  if (button(ctx, { x: 820, y: 14, w: 124, h: 44, compact: true, label: "VOLTAR", id: "treeBack", scale: .85, accent: "#ff8a96" })) return "back";
  let lx = 555;
  for (const br of Object.values(META_BRANCHES)) {
    drawText(ctx, br.name, lx, 72, { scale: .65, color: br.color, maxWidth: 90 }); lx += 99;
  }

  panel(ctx, 12, 100, 164, 386, { border: "#64566d" });
  for (let i = 6; i >= 0; i--) {
    const stage = META_STAGES[i], y = 104 + (6 - i) * 48;
    const unlocked = isTreeStageUnlocked(i + 1), owned = growth.baseOwned[i];
    if (button(ctx, { x: 22, y, w: 144, h: 44, compact: true, label: "", id: "treeStage" + (i + 1), accent: focusedStage === i + 1 ? stage.color : "#64586e" })) {
      treeFocusStage(i + 1);
    }
    drawText(ctx, (i + 1) + " • " + stage.name, 34, y + 4, { scale: .72, color: unlocked ? stage.color : "#b2a8bb", maxWidth: 118 });
    drawText(ctx, unlocked ? owned + "/" + TREE_STAGE_NODES[i].length + " • EXPLORAR" : "VENÇA MUNDO " + i, 34, y + 26,
      { scale: .56, color: PAL.textDim, maxWidth: 118 });
  }
  if (button(ctx, { x: 22, y: 440, w: 144, h: 44, compact: true, label: "", id: "treeRoot", accent: "#ffd479" })) selectNode(TREE_BY_ID.get("raiz"));
  drawText(ctx, "RAIZ ANCESTRAL", 34, 444, { scale: .66, color: "#ffd479", maxWidth: 118 });
  drawText(ctx, metaLevel("raiz") ? "MEMÓRIA VIVA" : "GRÁTIS • COMEÇAR", 34, 466, { scale: .55, color: PAL.textDim, maxWidth: 118 });
  panel(ctx, 12, 492, 936, 44, { border: "#51465e" });
  drawText(ctx, isTouchUI() ? "ARRASTE • PINÇA" : "ARRASTE • RODA", 24, 505, { scale: .65, color: PAL.textDim, maxWidth: 146 });
  if (button(ctx, { x: 184, y: 492, w: 122, h: 44, compact: true, label: "VER TUDO", id: "treeFit", scale: .8 })) treeFit();
  if (button(ctx, { x: 314, y: 492, w: 44, h: 44, compact: true, label: "-", id: "treeZoomOut" })) zoomAt(.8);
  if (button(ctx, { x: 366, y: 492, w: 44, h: 44, compact: true, label: "+", id: "treeZoomIn" })) zoomAt(1.25);
  const note = focusedStage ? (treeStageRequirement(focusedStage) || "GALHO " + focusedStage + " • SELECIONE PARA LER") : metaLevel("raiz") ? "DA RAIZ À COPA • ESCOLHA UM GALHO" : "COMECE PELA RAIZ ANCESTRAL";
  drawText(ctx, note, 426, 496, { scale: .67, color: "#ddc9a6", maxWidth: 504 });
  drawText(ctx, "FRUTOS ABREM HABILIDADES • ZOOM " + Math.round(zoom * 100) + "%", 426, 517,
    { scale: .55, color: PAL.textDim, maxWidth: 504 });
  return null;
}

function drawNodeTip(ctx, n) {
  const largeText = fontScale() > 1.01;
  const detail = activeFruit ? FRUIT_DETAIL :
    { x: DETAIL.x, y: DETAIL.y, w: DETAIL.w, h: 386 };
  const { x, y, w, h } = detail;
  const chk = metaCanBuy(n.id), lvl = metaLevel(n.id), col = n._fruit?.color || META_BRANCHES[n.br].color;
  panel(ctx, x, y, w, h, { border: n.supreme ? "#ffd479" : col });
  const stageLabel = n.supreme
    ? " • " + supremeFlowerStage(n.id).name
    : (n._fruit && n.cost.length >= 3
      ? " • " + (lvl === 0 ? "BROTO MORTO" : lvl === 1 ? "BROTO" : lvl < n.cost.length ? "MEIO ABERTO" : "FLORESCIDA")
      : "");
  const blocks = [
    [n.name, n.supreme ? "#ffd479" : col, .93],
    [(n._fruit ? (n.supreme ? "SUPREMA • " : n.global ? "GLOBAL • " : "LEGADO • ") : "GALHO " + n.stage + " • " + META_BRANCHES[n.br].name + " • ") + lvl + "/" + n.cost.length + stageLabel, PAL.textDim, .72],
    [n.desc, PAL.text, .80],
    [lvl < n.cost.length ? "CUSTO: " + n.cost[lvl] + " ESSÊNCIA" : "NÍVEL MÁXIMO", "#ffd479", .76],
  ];
  if (!chk.ok && lvl < n.cost.length) blocks.push([chk.why, "#ffb4bc", .74]);
  if (!n._fruit && lvl > 0 && !isTreeStageUnlocked(n.stage)) blocks.push(["COMPRA ANTIGA PRESERVADA E ATIVA", PAL.textDim, .65]);
  // Espaço real, inclusive fonte grande e descrições longas: encolhe o bloco
  // como último recurso, nunca corta o requisito nem cobre a confirmação.
  const heightAt = factor => blocks.reduce((sum, [text, , scale]) =>
    sum + wrapText(text, w - 28, { scale: scale * factor }).length * Math.ceil(18 * scale * factor * fontScale()) + 9, 0);
  let factor = 1;
  while (factor > .75 && heightAt(factor) > h - 78) factor -= .025;
  let ty = y + 12;
  for (const [text, color, baseScale] of blocks) {
    const scale = baseScale * factor;
    for (const line of wrapText(text, w - 28, { scale })) {
      drawText(ctx, line, x + 14, ty, { scale, color }); ty += Math.ceil(18 * scale * fontScale());
    }
    ty += 9;
  }
  const actionY = y + h - 54;
  const buyW = activeFruit ? 88 : 196, closeX = activeFruit ? x + 106 : x + 220;
  const closeW = activeFruit ? 92 : 108;
  if (button(ctx, { x: x + 12, y: actionY, w: buyW, h: 44, compact: true, label: "EVOLUIR", id: "treeBuy", disabled: !chk.ok, accent: n.supreme ? "#ffd479" : col, scale: activeFruit ? .68 : 1 })) {
    if (metaBuy(n.id)) { SFX.buy(); if (n.tier >= 2 || n.supreme) SFX.chime(); }
  }
  if (button(ctx, { x: closeX, y: actionY, w: closeW, h: 44, compact: true, label: "FECHAR", id: "treeClose", scale: activeFruit ? .72 : .85 })) selectedNode = null;
}
const SANTUARIO_IMAGES = new Map();
const restoreSanctuary = createColorRestorer();
const restoreApple = createColorRestorer();
function ensureSantuario(fruit) {
  const map = fruitAssetName(fruit), previous = SANTUARIO_IMAGES.get(map);
  if (previous && !previous.failed) return;
  const state = { image: null, failed: false };
  SANTUARIO_IMAGES.set(map, state);
  loadSantuario(map).then(img => { state.image = img; }).catch(() => { state.failed = true; });
}
function openFruit(fruit) {
  activeFruit = fruit; selectedNode = null; drag = clickTarget = null;
  ensureSantuario(fruit);
}
function visibleFruitNodes() { return [...activeFruit.newNodes, ...activeFruit.legacyNodes]; }
function flowerPosition(n) {
  const fi = n._fruitIdx ?? FRUIT_TREES.indexOf(activeFruit);
  const ni = n._nodeIdx ?? activeFruit?.nodes.findIndex(x => x.id === n.id);
  return fruitFlowerPos(fi, ni) || { x: 480, y: 378 };
}
export function fruitGardenGrowth(mapOrFruit = activeFruit) {
  const fruit = typeof mapOrFruit === "string" ? FRUIT_TREES.find(f => f.map === mapOrFruit) : mapOrFruit;
  if (!fruit || fruit.pending) return { levels: 0, total: 0, progress: 0, restoredPercent: 0, saturation: 0 };
  let levels = 0, total = 0;
  for (const n of fruit.nodes) {
    total += n.cost.length;
    levels += Math.max(0, Math.min(n.cost.length, metaLevel(n.id)));
  }
  const progress = total ? levels / total : 0;
  return { levels, total, progress, restoredPercent: Math.floor(progress * 100), saturation: Math.sqrt(progress) };
}
function gardenColor(hex, saturation) {
  const value = Number.parseInt(hex.slice(1), 16);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const gray = Math.round(rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722);
  return "rgb(" + rgb.map(c => Math.round(gray + (c - gray) * saturation)).join(",") + ")";
}
function drawSanctuaryBackground(ctx, fruit, saturation) {
  const state = SANTUARIO_IMAGES.get(fruitAssetName(fruit));
  ctx.fillStyle = "#17121f"; ctx.fillRect(0, 0, 960, 540);
  if (state?.image) {
    ctx.imageSmoothingEnabled = false;
    const art = restoreSanctuary(state.image, saturation) || state.image;
    ctx.drawImage(art, 0, 0, 960, 540);
  } else {
    drawText(ctx, "SANTUÁRIO • " + fruit.name, 480, 250,
      { align: "center", scale: .9, color: "#d4c8d6", maxWidth: 820 });
    if (state?.failed) drawText(ctx, "ARTE INDISPONÍVEL • TENTE ABRIR O FRUTO NOVAMENTE", 480, 278,
      { align: "center", scale: .62, color: PAL.textDim, maxWidth: 820 });
  }
}
function drawSanctuaryApple(ctx, fruit, saturation) {
  const key = "maca_" + fruitAssetName(fruit), img = IMG[key];
  const bob = reduced() ? 0 : Math.sin(time() * 1.1) * 6;
  const x = 480, y = 176 + bob, size = 232;
  ctx.save();
  ctx.globalAlpha = .34 + (reduced() ? 0 : .08 * Math.sin(time() * 1.4));
  ctx.strokeStyle = gardenColor(fruit.color, saturation); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 32, 52, 14, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = .22;
  ctx.beginPath(); ctx.ellipse(x, y + 32, 68, 21, 0, 0, TAU); ctx.stroke();
  // Névoa em pequenos blocos, sem partículas/alocações por frame.
  ctx.fillStyle = gardenColor("#e0d8e9", saturation);
  const drift = reduced() ? 0 : Math.sin(time() * .7) * 8;
  ctx.fillRect(x - 54 + drift, y + 18, 36, 4);
  ctx.fillRect(x + 20 - drift, y + 30, 38, 4);
  ctx.fillRect(x - 34 - drift, y + 40, 28, 4);
  ctx.fillRect(x + 4 + drift, y + 10, 24, 4);
  ctx.restore();
  if (img) {
    ctx.imageSmoothingEnabled = false;
    const art = restoreApple(img, saturation) || img;
    ctx.drawImage(art, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  }
}
function drawSanctuarySeal(ctx) {
  // Sem corrente atravessando a tela (decisão do usuário, 2026-09-29): o
  // santuário da Pálida é a arte do bioma + a maçã branca + este aviso, que
  // continua explicando por que o fruto não abre nesta versão.
  panel(ctx, 112, 419, 736, 76, { border: "#d9b8ff", fill: "#17121feF", noise: false });
  const lines = wrapText("A COPA ABRE APÓS O PICO, MAS ESTE FRUTO AGUARDA O SÉTIMO MUNDO E A DERROTA DA PÁLIDA. NENHUMA VITÓRIA NO DEVASTADOR PERMITE COMPRAR SEUS PODERES.", 700, { scale: .64 });
  lines.forEach((line, i) => drawText(ctx, line, 480, 433 + i * Math.ceil(16 * .64 * fontScale()),
    { align: "center", scale: .64, color: "#eee5f3" }));
}
const FLOWER_CELL = 48;
const FLOWER_COLS = 4;   // broto, meio aberto, florescida, broto morto
const FLOWER_SHEETS = new Map();
const SUPREME_CELL = 64;
const SUPREME_COLS = 6;  // 0: broto morto (cinza), 1..5: 5 fases revivendo até florescer
const SUPREME_SHEETS = new Map();

export function flowerVariant(n) {
  if (typeof n?._nodeIdx === "number") return n._nodeIdx % 3;
  const m = /(\d+)$/.exec(n?.id || "");
  return m ? (Number(m[1]) - 1) % 3 : 0;
}

export function flowerStage(level, max = 3) {
  // Nível 0: broto MORTO (4ª coluna da folha), sempre em cinza até a 1ª compra.
  if (level <= 0) return { stage: 3, gray: true, name: "BROTO MORTO" };
  if (level >= max) return { stage: 2, gray: false, name: "FLORESCIDA" };
  if (level === 1) return { stage: 0, gray: false, name: "BROTO" };
  return { stage: 1, gray: false, name: "BROTO MEIO ABERTO" };
}

const SUPREME_PHASE_META = [
  { phase: 0, stage: 3, gray: true,  scale: 1.00, aura: 0.00, name: "BROTO MORTO" },
  { phase: 1, stage: 3, gray: false, scale: 1.04, aura: 0.25, name: "DESPERTAR (1/5)" },
  { phase: 2, stage: 0, gray: false, scale: 1.09, aura: 0.48, name: "SEIVA VIVA (2/5)" },
  { phase: 3, stage: 1, gray: false, scale: 1.14, aura: 0.70, name: "CÁLICE REAL (3/5)" },
  { phase: 4, stage: 2, gray: false, scale: 1.20, aura: 0.88, name: "ABERTURA SOLAR (4/5)" },
  { phase: 5, stage: 2, gray: false, scale: 1.25, aura: 1.00, name: "FLOR SUPREMA (5/5)" },
];
export function supremeFlowerStage(nodeId, now = G.time) {
  const lvl = metaLevel(nodeId);
  if (lvl <= 0) return SUPREME_PHASE_META[0];
  const start = G.supremeBloomAt?.[nodeId];
  if (typeof start !== "number") return SUPREME_PHASE_META[5];
  const elapsed = Math.max(0, (now || 0) - start);
  const phase = Math.min(5, 1 + Math.floor(elapsed / 0.45));
  return SUPREME_PHASE_META[phase];
}

function supremeSheet(key) {
  let cached = SUPREME_SHEETS.get(key);
  const src = IMG[key];
  if (cached && cached.src === src) return cached;
  if (!src || typeof document === "undefined" || !src.width) return null;
  const w = SUPREME_CELL * SUPREME_COLS, h = SUPREME_CELL;
  const color = document.createElement("canvas");
  color.width = w; color.height = h;
  const cc = color.getContext("2d", { willReadFrequently: true });
  if (!cc) return null;
  cc.imageSmoothingEnabled = true;
  cc.drawImage(src, 0, 0, w, h);
  const d = cc.getImageData(0, 0, w, h);
  if (!d || d.data.length !== w * h * 4 || typeof cc.putImageData !== "function") {
    cached = { src, color: src, gray: src, cell: Math.floor(src.width / SUPREME_COLS) || SUPREME_CELL };
    SUPREME_SHEETS.set(key, cached);
    return cached;
  }
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) px[i + 3] = px[i + 3] >= 110 ? 255 : 0;
  const copy = new Uint8ClampedArray(px);
  for (let col = 0; col < SUPREME_COLS; col++) {
    const x0 = col * SUPREME_CELL;
    for (let y = 1; y < SUPREME_CELL - 1; y++) {
      for (let x = x0 + 1; x < x0 + SUPREME_CELL - 1; x++) {
        const k = (y * w + x) * 4;
        if (copy[k + 3]) continue;
        if (copy[k - 4 + 3] || copy[k + 4 + 3] || copy[k - w * 4 + 3] || copy[k + w * 4 + 3]) {
          px[k] = 18; px[k + 1] = 11; px[k + 2] = 24; px[k + 3] = 255;
        }
      }
    }
  }
  cc.putImageData(d, 0, 0);
  const gray = document.createElement("canvas");
  gray.width = w; gray.height = h;
  const gc = gray.getContext("2d");
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const l = Math.round(px[i] * .2126 + px[i + 1] * .7152 + px[i + 2] * .0722);
    px[i] = px[i + 1] = px[i + 2] = l;
  }
  gc.putImageData(d, 0, 0);
  cached = { src, color, gray, cell: SUPREME_CELL };
  SUPREME_SHEETS.set(key, cached);
  return cached;
}

function flowerSheet(key) {
  let cached = FLOWER_SHEETS.get(key);
  const src = IMG[key];
  if (cached && cached.src === src) return cached;
  if (!src || typeof document === "undefined" || !src.width) return null;
  const w = FLOWER_CELL * FLOWER_COLS, h = FLOWER_CELL * 3;
  const color = document.createElement("canvas");
  color.width = w; color.height = h;
  const cc = color.getContext("2d", { willReadFrequently: true });
  if (!cc) return null;
  cc.imageSmoothingEnabled = true;
  cc.drawImage(src, 0, 0, w, h);
  const d = cc.getImageData(0, 0, w, h);
  if (!d || d.data.length !== w * h * 4 || typeof cc.putImageData !== "function") {
    cached = { src, color: src, gray: src, cell: Math.floor(src.width / FLOWER_COLS) || FLOWER_CELL };
    FLOWER_SHEETS.set(key, cached);
    return cached;
  }
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i + 3] = px[i + 3] >= 110 ? 255 : 0;
  }
  const copy = new Uint8ClampedArray(px);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < FLOWER_COLS; col++) {
      const x0 = col * FLOWER_CELL, y0 = row * FLOWER_CELL;
      for (let y = y0 + 1; y < y0 + FLOWER_CELL - 1; y++) {
        for (let x = x0 + 1; x < x0 + FLOWER_CELL - 1; x++) {
          const k = (y * w + x) * 4;
          if (copy[k + 3]) continue;
          if (copy[k - 4 + 3] || copy[k + 4 + 3] || copy[k - w * 4 + 3] || copy[k + w * 4 + 3]) {
            px[k] = 18; px[k + 1] = 11; px[k + 2] = 24; px[k + 3] = 255;
          }
        }
      }
    }
  }
  cc.putImageData(d, 0, 0);
  const gray = document.createElement("canvas");
  gray.width = w; gray.height = h;
  const gc = gray.getContext("2d");
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const l = Math.round(px[i] * .2126 + px[i + 1] * .7152 + px[i + 2] * .0722);
    px[i] = px[i + 1] = px[i + 2] = l;
  }
  gc.putImageData(d, 0, 0);
  cached = { src, color, gray, cell: FLOWER_CELL };
  FLOWER_SHEETS.set(key, cached);
  return cached;
}

function drawSupremeAura(ctx, p, fruit, st) {
  const ready = isSupremeFlowerUnlocked(fruit);
  const t = time();
  const pulse = reduced() ? 0 : Math.sin(t * 2.2) * 0.12;
  ctx.save();
  if (st.phase === 0) {
    ctx.globalAlpha = ready ? 0.52 + pulse : 0.24;
    ctx.strokeStyle = ready ? "#ffd479" : "#8d7e99";
    ctx.lineWidth = ready ? 2 : 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 22, 9, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    return;
  }
  const a = st.aura;
  ctx.globalAlpha = (0.32 + pulse) * a;
  ctx.fillStyle = fruit.color;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 28 * a, 12 * a, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = (0.68 + pulse) * a;
  ctx.strokeStyle = "#ffd479"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 26 * a, 11 * a, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const ang = t * 1.3 + (i * TAU) / 6;
    const mx = Math.round(p.x + Math.cos(ang) * (18 + 6 * a));
    const my = Math.round(p.y - 2 + Math.sin(ang * 1.5) * (10 + 4 * a));
    ctx.fillStyle = i % 2 ? "#ffd479" : "#fff6d6";
    ctx.fillRect(mx - 1, my - 1, 3, 3);
  }
  ctx.restore();
}

function drawFlowerArt(ctx, n, p, fruit, saturation) {
  if (n.supreme) {
    const st = supremeFlowerStage(n.id);
    drawSupremeAura(ctx, p, fruit, st);
    const supSheet = supremeSheet("flor_suprema_" + fruitAssetName(fruit));
    if (supSheet) {
      const c = supSheet.cell, img = st.gray ? supSheet.gray : supSheet.color;
      const col = Math.min(SUPREME_COLS - 1, st.phase);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * c, 0, c, c,
        Math.round(p.x - SUPREME_CELL / 2), Math.round(p.y - SUPREME_CELL / 2 - 4), SUPREME_CELL, SUPREME_CELL);
      return;
    }
    const sheet = flowerSheet("flores_" + fruitAssetName(fruit));
    if (sheet) {
      const c = sheet.cell, img = st.gray ? sheet.gray : sheet.color;
      const drawSz = Math.round(FLOWER_CELL * st.scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, st.stage * c, 0, c, c,
        Math.round(p.x - drawSz / 2), Math.round(p.y - drawSz / 2 - 4), drawSz, drawSz);
      return;
    }
  }
  const level = metaLevel(n.id), max = n.cost.length, full = level >= max;
  const sheet = flowerSheet("flores_" + fruitAssetName(fruit));
  if (sheet) {
    const { stage, gray } = flowerStage(level, max);
    const variant = flowerVariant(n);
    const c = sheet.cell, img = gray ? sheet.gray : sheet.color;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, stage * c, variant * c, c, c,
      Math.round(p.x - FLOWER_CELL / 2), Math.round(p.y - FLOWER_CELL / 2 - 2), FLOWER_CELL, FLOWER_CELL);
    return;
  }
  const cx = p.x, cy = p.y - 3;
  const isSup = !!n.supreme;
  const supSt = isSup ? supremeFlowerStage(n.id) : null;
  const col = isSup && supSt.phase === 0 ? "#7c7385" : gardenColor(fruit.color, isSup ? 1 : saturation);
  ctx.fillStyle = isSup && supSt.phase === 0 ? "#5e5866" : gardenColor("#79a96b", isSup ? 1 : saturation);
  ctx.fillRect(cx - 2, cy + 4, 4, 16);
  ctx.fillRect(cx - 9, cy + 12, 8, 4); ctx.fillRect(cx + 2, cy + 8, 8, 4);
  if (!level) {
    ctx.fillStyle = col;
    ctx.fillRect(cx - 6, cy - 11, 12, 12);
    ctx.fillRect(cx - 10, cy - 5, 5, 4); ctx.fillRect(cx + 5, cy - 7, 5, 4);
    ctx.fillStyle = isSup ? "#b8b0c2" : gardenColor("#fff0c7", saturation);
    ctx.fillRect(cx - 1, cy - 9, 2, 4);
    return;
  }
  const petals = isSup ? 4 + supSt.phase : (full ? 8 : 5);
  const radius = isSup ? Math.round(9 + supSt.phase * 1.2) : (full ? 11 : 9);
  const petal = isSup ? 9 : 8;
  ctx.fillStyle = col;
  for (let i = 0; i < petals; i++) {
    const a = -Math.PI / 2 + i * TAU / petals;
    const px = Math.round(cx + Math.cos(a) * radius - petal / 2);
    const py = Math.round(cy + Math.sin(a) * radius - petal / 2);
    ctx.fillRect(px, py, petal, petal);
  }
  ctx.fillStyle = isSup ? "#ffd479" : gardenColor(full ? "#ffd479" : "#fff0c7", saturation);
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
}
function drawSanctuaryFlowers(ctx, fruit, list, saturation) {
  const fi = FRUIT_TREES.indexOf(fruit);
  // Com o painel aberto as OUTRAS flores continuam ativas: tocar em outra flor
  // troca o painel na hora. Só o toque dentro do painel (EVOLUIR/FECHAR) não
  // atravessa para uma flor escondida atrás dele.
  const pressInPanel = !!selectedNode &&
    pointInRect(mouse.x, mouse.y, FRUIT_DETAIL.x, FRUIT_DETAIL.y, FRUIT_DETAIL.w, FRUIT_DETAIL.h);
  // As 13 flores regulares são 100% livres (sem linhas de dependência no chão)
  // e a 14ª Flor Suprema desperta quando todas as 13 flores atingem o nível máximo.
  ctx.globalAlpha = 1;
  for (const n of list) {
    const p = fruitFlowerPos(fi, activeFruit.nodes.indexOf(n)) || flowerPosition(n);
    const hit = { x: p.x - 22, y: p.y - 22, w: 44, h: 44 };
    if (hitArea({ ...hit, id: "fruitNode_" + n.id, compact: true }) && !pressInPanel) selectedNode = { ...n, _fruit: fruit };
    // Moldura mostra qual flor o painel aberto está lendo.
    if (selectedNode?.id === n.id) {
      ctx.strokeStyle = n.supreme ? "#ffd479" : "#fff0c7"; ctx.lineWidth = 2;
      if (n.supreme) ctx.strokeRect(p.x - 29.5, p.y - 33.5, 59, 63);
      else ctx.strokeRect(hit.x + 2.5, hit.y + 2.5, hit.w - 5, hit.h - 5);
    }
    drawFlowerArt(ctx, n, p, fruit, saturation);
  }
}
function drawFruitMini(ctx) {
  const f = activeFruit, unlocked = isFruitUnlocked(f.map), stage = FRUIT_TREES.indexOf(f) + 1;
  const garden = fruitGardenGrowth(f);
  drawSanctuaryBackground(ctx, f, garden.saturation);
  ctx.imageSmoothingEnabled = false; layoutRec.layer = "world";
  drawSanctuaryApple(ctx, f, garden.saturation);
  if (f.pending) drawSanctuarySeal(ctx);
  else drawSanctuaryFlowers(ctx, f, visibleFruitNodes(), garden.saturation);
  layoutRec.layer = "ui";
  // O cabeçalho não esconde a clareira inteira e conserva os dados do fruto.
  panel(ctx, 12, 10, 936, 96, { border: f.color, fill: "#17121fdc", noise: false });
  drawText(ctx, f.name, 26, 15, { font: "big", color: f.color, maxWidth: 630 });
  drawText(ctx, unlocked ? "FRUTO CONQUISTADO • PODERES GLOBAIS" : "PRÉVIA BLOQUEADA • " + (f.pending ? "PÁLIDA: FUTURO" : "DERROTE " + f.bossName),
    26, 48, { scale: .73, color: unlocked ? PAL.text : PAL.textDim, maxWidth: 630 });
  drawText(ctx, f.pending ? "GALHO " + stage + " • ESSÊNCIA " + G.save.essence + " • FUTURO" :
    "GALHO " + stage + " • ESSÊNCIA " + G.save.essence + " • COR " + garden.restoredPercent + "% • " + garden.levels + "/" + garden.total + " MELHORIAS",
    26, 75, { scale: .63, color: "#ffd479", maxWidth: 660 });
  if (button(ctx, { x: 700, y: 13, w: 236, h: 44, compact: true, label: "VOLTAR À ÁRVORE", id: "treeMiniBack", scale: .78 })) {
    activeFruit = selectedNode = null; return null;
  }
  drawText(ctx, f.pending ? "FRUTO FUTURO • NENHUMA MELHORIA DISPONÍVEL" :
    "SELECIONE UMA FLOR PARA LER • SELECIONAR NÃO GASTA ESSÊNCIA • EVOLUIR CONFIRMA A COMPRA", 480, 520,
    { align: "center", scale: .62, color: PAL.textDim, maxWidth: 936 });
  if (f.pending) return null;
  if (selectedNode) drawNodeTip(ctx, selectedNode);
  return null;
}

export function treeBack() {
  if (selectedNode) { selectedNode = null; return true; }
  if (activeFruit) { activeFruit = null; return true; }
  return false;
}
// Diagnóstico utiliza as mesmas coordenadas do desenho e do clique/toque.
export function treeNodePosition(id) {
  const n = TREE_ALL.find(n => n.id === id);
  return n ? (activeFruit && n._fruit ? fruitFlowerPos(n._fruitIdx, n._nodeIdx) : project(n, { x: 0, y: 0 })) : null;
}
export function treeFocusNode(id) {
  const n = TREE_ALL.find(n => n.id === id);
  if (!n) return;
  if (n._fruit) openFruit(n._fruit);
  else {
    activeFruit = selectedNode = null; focusedStage = n.stage;
    pan.x = n.x; pan.y = n.y; zoom = 1; clampPan();
  }
}
export function treeFruitPosition(map) {
  const i = FRUIT_TREES.findIndex(f => f.map === map);
  return i < 0 ? null : project(fruitCenter(i), { x: 0, y: 0 });
}
export function treeViewState() {
  return { zoom, focusedStage, selected: selectedNode?.id || null, fruit: activeFruit?.map || null, x: pan.x, y: pan.y };
}
