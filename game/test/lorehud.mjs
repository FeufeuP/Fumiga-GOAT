// Teste headless da FASE 1 (HUD ORGÂNICO TOTAL POR BIOMA) — sem dependências.
// Uso: node game/test/lorehud.mjs
//
// O que este auditor garante:
//   1. todo bioma de MAPS tem lore de HUD completa e BIOME_HUD cobre os seis;
//   2. os textos do HUD usam só glifos que existem na fonte bitmap (nada de "?");
//   3. os ícones de comida são pixel art válida (grade quadrada, paleta fechada);
//   4. desenhar o HUD não estoura nem gera NaN em nenhum bioma;
//   5. Regra 5: com cache quente, o HUD não cria gradiente por célula nem
//      aloca textura dentro do loop (orçamento de ops por frame);
//   6. a visão de feromônio [H] continua barata com os campos reais do brain.js.
const problems = [];
const expect = (cond, msg) => {
  console.log((cond ? "ok    " : "ERRO  ") + msg);
  if (!cond) problems.push(msg);
};

// ------------------------------------------------------------ mock de canvas --
// O auditor separa "ops baratos" (fillRect/strokeRect: quilo de trabalho do
// canvas, GPU resolve) de "ops pesados" (caminhos, curvas, drawImage, troca de
// estado): só os pesados entram no orçamento de frame, junto com gradiente —
// que, em cache quente, tem de ser ZERO.
const HEAVY_OPS = new Set([
  "arc", "ellipse", "bezierCurveTo", "quadraticCurveTo", "stroke", "fill", "clip",
  "save", "restore", "translate", "scale", "rotate", "drawImage",
]);
let gradients = 0;              // quantos gradientes o frame inteiro criou
const createdCanvases = [];
function makeRecorder(name) {
  const cv = { width: 0, height: 0, style: {}, _name: name, _ops: 0, _heavy: 0, _nan: 0, _styles: [] };
  cv.getContext = () => {
    const grad = { addColorStop() {} };
    const target = { canvas: cv, imageSmoothingEnabled: false, globalAlpha: 1, globalCompositeOperation: "source-over" };
    const note = (args, heavy) => {
      cv._ops++;
      if (heavy) cv._heavy++;
      for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) cv._nan++;
    };
    return new Proxy(target, {
      get(t, p) {
        if (p === "canvas") return cv;
        if (typeof p === "string" && p in t) return t[p];
        if (p === "createLinearGradient") return (...a) => { note(a, true); gradients++; return grad; };
        if (p === "createRadialGradient") return (...a) => { note(a, true); gradients++; return grad; };
        if (p === "measureText") return () => ({ width: 10 });
        if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
        return (...a) => note(a, typeof p === "string" && HEAVY_OPS.has(p));
      },
      set(t, p, v) {
        if (p === "fillStyle" || p === "strokeStyle") cv._styles.push(v);
        t[p] = v;
        return true;
      },
    });
  };
  createdCanvases.push(cv);
  return cv;
}
globalThis.window = globalThis;
globalThis.document = {
  createElement() { return makeRecorder("offscreen"); },
  getElementById() { return null; },
  addEventListener() {},
};
// A fonte bitmap precisa carregar: o HUD escreve texto pela fonte do jogo.
globalThis.Image = class {
  constructor() { this.width = 286; this.height = 480; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};
const mainCanvas = makeRecorder("main");

const {
  BIOME_HUD, FOOD_ICONS, getBiomeHUD, hudCacheStats,
  drawBiomeTexture, drawGasterBar, drawFoodIcon, drawEssenceHud,
  drawTreeRing, drawPheromoneTrail, drawPheromoneMini, drawPheromoneOverlay,
} = await import("../js/lore_hud.js");
const { MAPS } = await import("../js/config.js");
const { FONT_CHARS, loadFonts } = await import("../js/font.js");
const brain = await import("../js/brain.js");
await loadFonts();

// ------------------------------------------------- 1. cobertura de lore ------
const LORE_FIELDS = ["hudName", "foodLabel", "foodKind", "essenceLabel", "waveLabel"];
for (const map of MAPS) {
  const lore = map.lore;
  const missing = !lore ? LORE_FIELDS.slice() : LORE_FIELDS.filter((f) => !lore[f]);
  expect(missing.length === 0, "MAPS[" + map.id + "] tem lore de HUD completa" + (missing.length ? " — falta " + missing.join(", ") : ""));
  const style = BIOME_HUD[map.id];
  expect(!!style, "BIOME_HUD tem visual para o bioma " + map.id);
  if (style && lore) {
    expect(style.loreName === lore.hudName && style.foodLabel === lore.foodLabel &&
      style.essenceLabel === lore.essenceLabel && style.waveLabel === lore.waveLabel,
      "textos do bioma " + map.id + " vêm de MAPS[].lore (fonte única)");
  }
  expect(!!FOOD_ICONS[lore && lore.foodKind], "ícone de comida existe: " + (lore ? lore.foodKind : "?") + " (" + map.id + ")");
}
expect(Object.keys(BIOME_HUD).length === MAPS.length, "um visual de HUD por bioma, sem sobra: " + Object.keys(BIOME_HUD).length + "/" + MAPS.length);

// ------------------------------------------------ 2. glifos da fonte ---------
const EXTRA_TEXTS = [
  "A COLÔNIA VÊ COM CHEIRO", "COMIDA", "PERIGO", "[H] SOLTE PARA VOLTAR",
  "A ÁRVORE LEMBROU: NÍVEL 99", "ANEL 12", "SILENCIOSA", "SILENCIOSA FERIDA!",
  "IRMÃS 12/40", "ONDA 3/5", "INVASÃO 2/5", "COLÔNIA PENSA EM FEROMÔNIO",
];
const badGlyphs = new Set();
for (const map of MAPS) {
  for (const f of LORE_FIELDS) {
    if (f === "foodKind") continue;
    for (const ch of map.lore[f]) if (!FONT_CHARS.includes(ch)) badGlyphs.add(ch);
  }
}
for (const t of EXTRA_TEXTS) for (const ch of t) if (!FONT_CHARS.includes(ch)) badGlyphs.add(ch);
expect(badGlyphs.size === 0, "todo texto do HUD usa glifos da fonte bitmap" + (badGlyphs.size ? " — fora do atlas: " + [...badGlyphs].join(" ") : ""));

// -------------------------------------------------- 3. ícones são pixel art --
for (const [kind, def] of Object.entries(FOOD_ICONS)) {
  const n = def.rows.length;
  const square = def.rows.every((r) => r.length === n);
  const paletteOk = def.rows.every((r) => [...r].every((ch) => ch === "." || def.pal[ch]));
  const hasMass = def.rows.join("").replace(/\./g, "").length >= n * 2;
  expect(square && paletteOk && hasMass, "ícone " + kind + " é grade " + n + "x" + n + " com paleta fechada e massa legível");
}

// --------------------------------------------- 4. render sem estouro/NaN ----
const VIEW_W = 960, VIEW_H = 540;
const cam = { x: 1200, y: 900, zoom: 1 };
const main = mainCanvas.getContext("2d");
function resetMain() { mainCanvas._ops = 0; mainCanvas._heavy = 0; mainCanvas._nan = 0; mainCanvas._styles.length = 0; gradients = 0; }

for (const map of MAPS) {
  resetMain();
  drawBiomeTexture(main, 10, 8, 320, 96, map.id, 1.5);
  drawGasterBar(main, 96, 30, 122, 12, 0.78, map.id, false, 1.5);
  drawGasterBar(main, 96, 30, 122, 12, 0.21, map.id, true, 1.5);
  drawFoodIcon(main, 88, 44, 13, map.id, 1.5);
  drawEssenceHud(main, 20, 60, map.id, "1.2K", 1.5);
  drawTreeRing(main, 68, 43, 8, 0.6, "#8fd3ff", 1.5);
  drawPheromoneTrail(main, 60, 40, 252, 24, 0.5, map.id, 1.5, false);
  drawPheromoneTrail(main, 60, 40, 252, 24, 0.5, map.id, 1.5, true);
  drawPheromoneMini(main, 770, 10, 180, 135, brain.foodTrailAt, brain.dangerAt, 1.5);
  expect(mainCanvas._nan === 0, "HUD do bioma " + map.id + " desenha sem coordenada inválida");
}

// --------------------------------------------- 5. orçamento de ops por frame --
// Cache quente: o painel já foi assado; um frame de HUD não pode recriar
// gradiente nenhum (era o custo do HUD antigo: ~700 gradientes radiais/frame).
resetMain();
drawBiomeTexture(main, 10, 8, 320, 96, "planicie", 2.0);
drawBiomeTexture(main, 10, 108, 320, 88, "planicie", 2.0);
const bakeGradients = gradients;   // 1 por tamanho de painel assado
resetMain();
for (let f = 0; f < 30; f++) {
  const t = 2 + f / 60;
  drawBiomeTexture(main, 10, 8, 320, 96, "planicie", t);
  drawBiomeTexture(main, 10, 108, 320, 88, "planicie", t);
  drawGasterBar(main, 96, 30, 122, 12, 0.5, "planicie", false, t);
  drawFoodIcon(main, 88, 44, 13, "planicie", t);
  drawEssenceHud(main, 20, 60, "planicie", "120", t);
  drawTreeRing(main, 68, 43, 8, 0.3, "#8fd3ff", t);
  drawPheromoneTrail(main, 60, 40, 252, 24, 0.5, "planicie", t, false);
  drawPheromoneMini(main, 770, 10, 180, 135, brain.foodTrailAt, brain.dangerAt, t);
}
const opsPerFrame = mainCanvas._ops / 30;
const heavyPerFrame = mainCanvas._heavy / 30;
console.log("      → HUD cacheado: " + opsPerFrame.toFixed(1) + " ops/frame (" + heavyPerFrame.toFixed(1) +
  " pesadas), " + (gradients / 30).toFixed(2) + " gradientes/frame");
expect(gradients === 0, "com cache quente o HUD não cria gradiente por frame (achou " + gradients + ")");
expect(heavyPerFrame < 70, "HUD cacheado fica abaixo de 70 ops pesadas/frame (achou " + heavyPerFrame.toFixed(1) + ")");
expect(opsPerFrame < 220, "HUD cacheado fica abaixo de 220 ops totais/frame (achou " + opsPerFrame.toFixed(1) + ")");
expect(bakeGradients <= 2, "bake do painel cria 1 gradiente por tamanho, e só no primeiro uso (achou " + bakeGradients + ")");

// teto do cache: 40 tamanhos distintos não podem inflar o cache
for (let i = 0; i < 40; i++) drawBiomeTexture(main, 0, 0, 120 + i, 40 + (i % 5), "gelo", 3 + i);
const stats = hudCacheStats();
expect(stats.panels <= 24, "cache de texturas tem teto (painéis guardados: " + stats.panels + ")");

// ---------------------------------------------- 6. gaster pulsando abaixo de 30% --
resetMain();
drawGasterBar(main, 96, 30, 122, 12, 0.2, "planicie", true, 5.0);
const lowStyles = mainCanvas._styles.join(" ");
expect(lowStyles.includes("#ff4d5a"), "gaster abaixo de 30% acende as veias vermelhas da Silenciosa");
resetMain();
drawGasterBar(main, 96, 30, 122, 12, 0.9, "planicie", false, 5.0);
expect(!mainCanvas._styles.join(" ").includes("#ff4d5a"), "gaster saudável não acende vermelho de perigo");

// --------------------------------------- 7. visão de feromônio [H] é barata ---
brain.resetColony ? brain.resetColony() : null;
for (let i = 0; i < 40; i++) brain.markFood(1200 + i * 30, 900 + (i % 6) * 40, 0.8);
for (let i = 0; i < 20; i++) brain.markDanger(1500 + i * 20, 1000 + (i % 4) * 30, 0.9);

resetMain();
const t0 = performance.now();
for (let f = 0; f < 60; f++) {
  cam.x = 1200 + f * 3;   // câmera andando força rebake como no jogo
  drawPheromoneOverlay(main, cam, VIEW_W, VIEW_H, brain.foodTrailAt, brain.dangerAt, 10 + f / 60);
}
const msPerFrame = (performance.now() - t0) / 60;
console.log("      → visão de feromônio: " + msPerFrame.toFixed(3) + " ms/frame (câmera em movimento)");
expect(mainCanvas._nan === 0, "visão de feromônio desenha sem coordenada inválida");
expect(msPerFrame < 6, "visão de feromônio cabe no orçamento de frame (< 6 ms, achou " + msPerFrame.toFixed(2) + ")");

// buffer da névoa: 1 pixel por célula de 16px, não 1 gradiente por célula
const pheroCanvas = createdCanvases.find((c) => c.width > 40 && c.width < 80 && c.height > 25 && c.height < 45);
expect(!!pheroCanvas, "visão de feromônio usa buffer reduzido offscreen");

// ------------------------------------- 8. sem DOM (boot/testes) não explode ---
const savedDocument = globalThis.document;
delete globalThis.document;
let survived = true;
try {
  drawBiomeTexture(main, 10, 8, 320, 96, "gelo", 1);
  drawFoodIcon(main, 10, 10, 13, "gelo", 1);
  drawPheromoneOverlay(main, cam, VIEW_W, VIEW_H, brain.foodTrailAt, brain.dangerAt, 99);
  drawPheromoneMini(main, 770, 10, 180, 135, brain.foodTrailAt, brain.dangerAt, 99);
} catch (e) {
  survived = false;
  console.log("      → " + (e && e.message));
}
globalThis.document = savedDocument;
expect(survived, "sem canvas offscreen (ambiente headless) o HUD degrada em vez de quebrar");

console.log(problems.length
  ? "FASE 1 — PROBLEMAS (" + problems.length + "):\n - " + problems.join("\n - ")
  : "FASE 1 — HUD ORGÂNICO TOTAL POR BIOMA: OK");
process.exit(problems.length ? 2 : 0);
