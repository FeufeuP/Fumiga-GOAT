// ============================================================================
// LORE HUD — FASE 1 da Mega Atualização Lore-Total
// "Se não tem nome na LORE, não existe no jogo."
//
// HUD orgânico total por bioma (P1=C, P22=A, P18=B, P9=B):
//   · painel de quitina/cera por bioma, que respira (sheen de cera descendo);
//   · vida da Rainha Silenciosa = gaster de âmbar com coroa de fungo/seda,
//     pulsando com veias vermelhas abaixo de 30% (LORE: a Pálida aperta);
//   · comida com ícone do bioma (trevo, cogumelo, alga, semente, folha, líquen);
//   · essência = cristal geométrico de pólen de memória subindo em partículas;
//   · onda = TRILHA FEROMÔNIO com irmãs andando (não barra genérica);
//   · XP = anéis de crescimento da Árvore;
//   · [H] VISÃO FEROMÔNIO — verde comida, vermelha perigo, "A COLÔNIA VÊ COM CHEIRO".
//
// Regra 5 (otimização): nada de alocação por frame. Texturas, ícones e a visão
// de feromônio ficam em buffers offscreen reutilizados — o loop só faz
// drawImage/fillRect. Regra 8: nenhum traço humanoide nos ícones e na coroa.
// ============================================================================
import { MAPS, WORLD_W, WORLD_H } from "./config.js";
import { drawText } from "./font.js";

// ---------------------------------------------------------------- BIOME_HUD --
// Aqui mora só o VISUAL de cada bioma (cor de borda, seiva, textura).
// Os TEXTOS de lore (nome do vaso, comida, essência, trilha) vivem em
// config.js → MAPS[].lore, para haver uma única fonte de verdade.
export const BIOME_HUD = {
  planicie: {
    id: "planicie",
    border: "#7fd6a0",
    bg: "rgba(51,69,44,0.92)",
    bg2: "rgba(44,61,38,0.88)",
    accent: "#ffd479",
    foodColor: "#7fd6a0",
    essenceColor: "#ffd479",
    texture: "#4a7a42",
    gasterColor: "#ffb347",
    gasterVein: "#7fd6a0",
    minimapBorder: "#7fd6a0",
    spirit: "#bfffa8",
  },
  floresta: {
    id: "floresta",
    border: "#6db7ff",
    bg: "rgba(36,56,42,0.92)",
    bg2: "rgba(31,49,36,0.88)",
    accent: "#bfffa8",
    foodColor: "#bfffa8",
    essenceColor: "#c77dff",
    texture: "#2f5238",
    gasterColor: "#8f6fd6",
    gasterVein: "#6db7ff",
    minimapBorder: "#6db7ff",
    spirit: "#37e6c8",
  },
  pantano: {
    id: "pantano",
    border: "#37e6c8",
    bg: "rgba(33,48,49,0.92)",
    bg2: "rgba(28,42,43,0.88)",
    accent: "#7fd6ff",
    foodColor: "#37e6c8",
    essenceColor: "#7fd6ff",
    texture: "#2c4a3f",
    gasterColor: "#37e6c8",
    gasterVein: "#7fd6ff",
    minimapBorder: "#37e6c8",
    spirit: "#8fd3ff",
  },
  deserto: {
    id: "deserto",
    border: "#ffb347",
    bg: "rgba(74,58,40,0.92)",
    bg2: "rgba(65,50,31,0.88)",
    accent: "#ffd479",
    foodColor: "#ffb347",
    essenceColor: "#ff9a5c",
    texture: "#6b532f",
    gasterColor: "#ffb347",
    gasterVein: "#ffd479",
    minimapBorder: "#ffb347",
    spirit: "#ffd479",
  },
  outono: {
    id: "outono",
    border: "#ff9a5c",
    bg: "rgba(61,47,34,0.92)",
    bg2: "rgba(53,41,32,0.88)",
    accent: "#ffd479",
    foodColor: "#ff9a5c",
    essenceColor: "#ffd479",
    texture: "#5c4626",
    gasterColor: "#ff9a5c",
    gasterVein: "#ffd479",
    minimapBorder: "#ff9a5c",
    spirit: "#ffc48a",
  },
  gelo: {
    id: "gelo",
    border: "#e8f4ff",
    bg: "rgba(58,66,84,0.92)",
    bg2: "rgba(51,59,76,0.88)",
    accent: "#7fd6ff",
    foodColor: "#e8f4ff",
    essenceColor: "#e8f4ff",
    texture: "#4a5470",
    gasterColor: "#e8f4ff",
    gasterVein: "#7fd6ff",
    minimapBorder: "#e8f4ff",
    spirit: "#c8e6ff",
  },
};

// Textos de lore do HUD vêm de MAPS[].lore — fonte única (config.js).
for (const map of MAPS) {
  const style = BIOME_HUD[map.id];
  if (!style || !map.lore) continue;
  style.loreName = map.lore.hudName;
  style.foodLabel = map.lore.foodLabel;
  style.foodKind = map.lore.foodKind;
  style.essenceLabel = map.lore.essenceLabel;
  style.waveLabel = map.lore.waveLabel;
}

export function getBiomeHUD(mapId) {
  return BIOME_HUD[mapId] || BIOME_HUD.planicie;
}

/** Introspecção do cache offscreen (usada pelo test/lorehud.mjs). */
export function hudCacheStats() {
  return { panels: panelCache.size, icons: iconCache.size };
}

// ------------------------------------------------------------------ buffers --
// Cache de canvas offscreen: textura de quitina, ícones de comida e a mancha
// de feromônio. Tudo determinístico (semente por nome), então o bake roda uma
// vez por tamanho e nunca mais dentro do loop de renderização.
const panelCache = new Map();   // "bioma|w|h" -> canvas de quitina
const iconCache = new Map();    // "ícone|tamanho" -> canvas do ícone
const PANEL_CACHE_MAX = 24;

const hasCanvas = () => typeof document !== "undefined" && typeof document.createElement === "function";

function makeCanvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  const c = cv.getContext("2d");
  if (c) c.imageSmoothingEnabled = false;
  return { cv, c };
}

// Hash curto → semente: mantém a textura igual entre bakes e entre sessões.
function seedOf(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function rngOf(str) {
  let h = seedOf(str);
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

// Fase fixa por bioma: dois biomas nunca respiram no mesmo compasso.
function phaseOf(biome) {
  return (seedOf(biome) % 628) / 100;
}

// ------------------------------------------- textura de quitina/cera (cache) --
function bakePanel(biome, w, h) {
  const style = getBiomeHUD(biome);
  const { cv, c } = makeCanvas(w, h);
  if (!c) return cv;
  // cera: gradiente base + grânulos de quitina + veias
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, style.bg);
  grad.addColorStop(1, style.bg2);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  const rnd = rngOf(biome + "|" + w + "|" + h);
  c.fillStyle = style.texture;
  c.globalAlpha = 0.14;
  const dots = Math.max(8, Math.round((w * h) / 210));
  for (let i = 0; i < dots; i++) {
    const r = rnd() < 0.74 ? 1 : 2;
    c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), r, r);
  }
  c.globalAlpha = 0.10;
  c.strokeStyle = style.texture;
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y0 = Math.round(h * (0.2 + i * 0.3)) + 0.5;
    c.beginPath();
    c.moveTo(0, y0);
    c.bezierCurveTo(w * 0.3, y0 - 3, w * 0.68, y0 + 3, w, y0 - 1);
    c.stroke();
  }
  // cera molhada no topo (leitura "vivo", não plástico)
  c.globalAlpha = 0.12;
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, w, 1);
  c.globalAlpha = 1;
  return cv;
}

/** Painel de quitina/cera do bioma. `time` só move o brilho de cera. */
export function drawBiomeTexture(ctx, x, y, w, h, biome, time) {
  const style = getBiomeHUD(biome);
  const key = biome + "|" + (w | 0) + "|" + (h | 0);
  let cv = panelCache.get(key);
  if (!cv) {
    if (!hasCanvas()) {
      ctx.fillStyle = style.bg;
      ctx.fillRect(x, y, w, h);
      return;
    }
    cv = bakePanel(biome, w, h);
    if (panelCache.size >= PANEL_CACHE_MAX) panelCache.delete(panelCache.keys().next().value);
    panelCache.set(key, cv);
  }
  ctx.drawImage(cv, x, y);

  // respiração: faixa de cera descendo devagar pela quitina
  const hh = h | 0;
  if (hh > 6) {
    const band = ((time * 9 + phaseOf(biome) * 4) % (hh + 8)) - 4;
    if (band > 0 && band < hh - 2) {
      ctx.globalAlpha = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(time * 1.6 + phaseOf(biome)));
      ctx.fillStyle = style.spirit;
      ctx.fillRect(x, y + band, w, 2);
      ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------- ícones de HUD --
// Pixel art 9x9 em mapa de caracteres — cresce por nearest neighbor, então
// continua pixel art em qualquer escala. '.' = transparente.
//   d = sombra/contorno · m = massa · l = luz · s = haste/apoio
export const FOOD_ICONS = {
  trevo: {
    pal: { m: "#4a7a42", l: "#bfffa8", s: "#3f7a3c", d: "#2a4a24" },
    rows: [
      "...lll...",
      ".mlllmmm.",
      ".mml.mmm.",
      "..m...m..",
      "....s....",
      "....s....",
      "...ss....",
      ".........",
      ".........",
    ],
  },
  cogumelo: {
    pal: { m: "#8f6fd6", l: "#e0c8ff", s: "#c9bce8", d: "#4a3a6e" },
    rows: [
      "...mmm...",
      ".mmllmmm.",
      "mmmmllmmm",
      "...sss...",
      "...sds...",
      "...sds...",
      "..sssss..",
      ".........",
      ".........",
    ],
  },
  alga: {
    pal: { m: "#2f7a6a", l: "#7ff0d8", s: "#1c4a44", d: "#143330" },
    rows: [
      "..m...m..",
      ".m.l.m.m.",
      ".m.m.m.m.",
      "..m.m.m..",
      "..m.l.m..",
      ".m...m.m.",
      ".m...m.m.",
      "..m...m..",
      ".........",
    ],
  },
  semente: {
    pal: { m: "#d8a44a", l: "#ffe6a8", s: "#8a6a2a", d: "#5c451a" },
    rows: [
      "....l....",
      "...lml...",
      "..mlmlm..",
      ".mmlmlmm.",
      ".mmmlmmm.",
      ".smmmmms.",
      "..sssss..",
      "...sss...",
      ".........",
    ],
  },
  outono: {
    pal: { m: "#e08838", l: "#ffd479", s: "#8a5a22", d: "#5c3a14" },
    rows: [
      "...m.m...",
      "..mm.mm..",
      ".mmmmmm..",
      "mmmlmmmmm",
      ".mmmlmmm.",
      "..mmm.m..",
      "...m.m...",
      "...s.s...",
      ".........",
    ],
  },
  gelo: {
    pal: { m: "#9fc4e8", l: "#e8f4ff", s: "#7fd6ff", d: "#4a5470" },
    rows: [
      "...l.l...",
      "..lmlml..",
      ".mmlmlmm.",
      ".mlllllm.",
      "..mlmlm..",
      "...mmm...",
      "..smmms..",
      "...sss...",
      ".........",
    ],
  },
};

function bakeIcon(kind, size) {
  const def = FOOD_ICONS[kind] || FOOD_ICONS.trevo;
  const n = def.rows.length;
  const { cv, c } = makeCanvas(size, size);
  if (!c) return cv;
  const px = size / n;
  for (let ry = 0; ry < n; ry++) {
    const row = def.rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      const col = def.pal[ch];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(Math.floor(rx * px), Math.floor(ry * px), Math.ceil(px), Math.ceil(px));
    }
  }
  return cv;
}

/** Ícone do alimento do bioma (trevo, cogumelo, alga, semente, folha, líquen). */
export function drawFoodIcon(ctx, x, y, size, biome, time) {
  const style = getBiomeHUD(biome);
  const kind = style.foodKind || "trevo";
  const sz = Math.max(6, size | 0);
  const key = kind + "|" + sz;
  let cv = iconCache.get(key);
  if (!cv) {
    if (!hasCanvas()) return;
    cv = bakeIcon(kind, sz);
    iconCache.set(key, cv);
  }
  const bob = Math.round(Math.sin(time * 2.1 + phaseOf(biome)) * 0.8);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, x, y + bob, sz, sz);
  ctx.imageSmoothingEnabled = prev;
}

// ------------------------------------------------ cristal de pólen (essência) --
/** Cristal geométrico de pólen de memória, com luz interna e partícula subindo. */
export function drawEssenceCrystal(ctx, x, y, size, color, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 0.8) * 0.12);

  // sombra projetada
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(0, size * 0.6);
  ctx.lineTo(-size * 0.3, size * 0.2);
  ctx.lineTo(0, -size * 0.5);
  ctx.lineTo(size * 0.3, size * 0.2);
  ctx.closePath();
  ctx.fill();

  // corpo hexagonal facetado — facetas PLANAS (pixel art, sem gradiente por frame)
  const facetas = [
    { col: "#ffffff", pts: [[0, -size * 0.6], [size * 0.35, -size * 0.2], [0, -size * 0.05]] },
    { col: color, pts: [[0, -size * 0.6], [0, -size * 0.05], [-size * 0.35, -size * 0.2]] },
    { col: "#1a1430", pts: [[0, -size * 0.05], [size * 0.35, -size * 0.2], [size * 0.25, size * 0.4]] },
    { col: color, pts: [[0, -size * 0.05], [size * 0.25, size * 0.4], [-size * 0.25, size * 0.4], [-size * 0.35, -size * 0.2]] },
  ];
  for (const f of facetas) {
    ctx.fillStyle = f.col;
    ctx.beginPath();
    ctx.moveTo(f.pts[0][0], f.pts[0][1]);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.6);
  ctx.lineTo(size * 0.35, -size * 0.2);
  ctx.lineTo(size * 0.25, size * 0.4);
  ctx.lineTo(-size * 0.25, size * 0.4);
  ctx.lineTo(-size * 0.35, -size * 0.2);
  ctx.closePath();
  ctx.stroke();

  // luz interna pulsando
  ctx.globalAlpha = 0.6 + Math.sin(time * 3) * 0.3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, -size * 0.1, Math.max(1, size * 0.12), 0, Math.PI * 2);
  ctx.fill();

  // partículas de memória subindo
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = color;
  for (let i = 0; i < 2; i++) {
    const py = -size * 0.3 - ((time * 20 + i * 15) % (size * 1.2));
    ctx.fillRect(-1 + i * 2, py, 1.5, 1.5);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Cristal + rótulo do pólen de memória (linha do HUD). */
export function drawEssenceHud(ctx, x, y, biome, amount, time) {
  const style = getBiomeHUD(biome);
  drawEssenceCrystal(ctx, x + 6, y + 6, 14, style.essenceColor, time);
  drawText(ctx, style.essenceLabel + " " + amount, x + 16, y, { color: style.essenceColor, scale: 0.85 });
}

// ---------------------------------------------------- anéis da Árvore (XP) ----
/** Barra de XP como anel de crescimento da Árvore (LORE: "a Árvore lembrou"). */
export function drawTreeRing(ctx, x, y, r, frac, color, time) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#241c38";
  ctx.beginPath();
  ctx.arc(x, y + r, r, 0, Math.PI * 2);
  ctx.stroke();

  if (frac > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y + r, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }
  // anéis internos (nós já comprados) + seiva subindo
  ctx.strokeStyle = "rgba(143,111,214,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y + r, Math.max(2, r - 3), 0, Math.PI * 2);
  ctx.stroke();
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
  ctx.globalAlpha = 0.35 + pulse * 0.35;
  ctx.fillStyle = "#ffd479";
  ctx.fillRect(x - 1, y + r - r - 1, 2, 2);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------ gaster da Silenciosa ---
/** Vida da Rainha Silenciosa: gaster de âmbar com coroa de fungo/seda. */
export function drawGasterBar(ctx, x, y, w, h, frac, biome, low, time) {
  const style = getBiomeHUD(biome);
  const pulse = low ? 1 + Math.sin(time * 6) * 0.14 : 1 + Math.sin(time * 1.6) * 0.03;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  // casco de quitina
  ctx.fillStyle = "rgba(20,14,28,0.9)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2 + 1, w / 2 + 2, h / 2 + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (frac > 0) {
    const clipW = w * frac;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();

    // seiva do gaster em faixas planas de quitina (sem gradiente por frame)
    const bands = low
      ? ["#ff4d5a", "#ff7a6a", "#a32e3a"]
      : [style.gasterColor, style.accent, style.gasterVein];
    for (let i = 0; i < bands.length; i++) {
      const bx = x + clipW * (i / bands.length);
      ctx.fillStyle = bands[i];
      ctx.fillRect(bx, y, clipW * ((i + 1) / bands.length) - clipW * (i / bands.length), h);
    }
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(x, y, clipW, h * 0.35);

    // veias do gaster: normais respirando; feridas quando a Pálida aperta
    ctx.globalAlpha = low ? 0.55 + Math.sin(time * 7) * 0.25 : 0.35 + Math.sin(time * 3) * 0.15;
    ctx.strokeStyle = low ? "#2a0a12" : style.gasterVein;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const vx = x + clipW * (0.22 + i * 0.26);
      ctx.moveTo(vx, y + h * 0.15);
      ctx.lineTo(vx + 2, y + h * 0.5);
      ctx.lineTo(vx - 1, y + h * 0.85);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = low ? "#ff4d5a" : style.border;
  ctx.lineWidth = low ? 2 : 1.2;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // coroa orgânica: 3 picos de fungo + fio de seda da Tecelã (nunca coroa humana)
  const crownA = low ? 0.7 + 0.3 * Math.sin(time * 4) : 1;
  ctx.globalAlpha = crownA;
  for (let i = -1; i <= 1; i++) {
    const cx = x + w / 2 + i * 7;
    const cy = y - 2 + Math.abs(i) * 1.5;
    ctx.fillStyle = i === 0 ? style.accent : style.gasterVein;
    ctx.fillRect(cx - 0.5, cy, 1, 3);            // haste
    ctx.beginPath();                              // chapéu do fungo
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.55)";    // seda ligando os picos
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 8, y - 1);
  ctx.quadraticCurveTo(x + w / 2, y - 5, x + w / 2 + 8, y - 1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // luz âmbar da Silenciosa
  ctx.globalAlpha = 0.65 + Math.sin(time * 2) * 0.25;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath();
  ctx.arc(x + w / 2, y - 1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// -------------------------------------------- trilha feromônio: irmãs andando --
/** Formiga de perfil em pixels (gáster, tórax, cabeça, pernas e antenas). */
export function drawAntGlyph(ctx, x, y, size, color, alpha, phase) {
  const u = Math.max(1, Math.round(size / 4));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x - 4 * u, y - u, 2 * u, 2 * u);   // gáster (a despensa anda)
  ctx.fillRect(x - 2 * u, y - u, 2 * u, 2 * u);   // tórax
  ctx.fillRect(x, y - u, 2 * u, 2 * u);           // cabeça
  ctx.fillRect(x + 2 * u, y - 2 * u, u, u);       // antena
  const lift = Math.sin(phase) > 0 ? 0 : u;       // pernas alternando
  ctx.fillRect(x - 3 * u, y + u + lift, u, u);
  ctx.fillRect(x - u, y + u - lift, u, u);
  ctx.fillRect(x + u, y + u + lift, u, u);
  ctx.globalAlpha = 1;
}

/**
 * TRILHA FEROMÔNIO: a barra de onda do HUD. Marcas de cheiro no chão e irmãs
 * caminhando pela trilha — em calmaria a colônia marca o caminho; na invasão
 * a trilha queima em vermelho e a horda marcha por ela.
 */
export function drawPheromoneTrail(ctx, x, y, w, h, frac, biome, time, danger) {
  const style = getBiomeHUD(biome);
  const trail = danger ? "#ff4d5a" : style.foodColor;
  const floor = Math.max(1, Math.round(h * 0.12));
  const midY = Math.round(y + h * 0.5);

  // chão da trilha (terra pisada)
  ctx.fillStyle = "rgba(18,12,24,0.85)";
  ctx.fillRect(x, midY - floor, w, floor * 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, midY - floor, w, 1);

  // progresso da trilha
  const filled = Math.max(0, Math.min(1, frac)) * w;
  if (filled > 1) {
    ctx.globalAlpha = danger ? 0.55 : 0.4;
    ctx.fillStyle = trail;
    ctx.fillRect(x, midY - floor + 1, filled, floor * 2 - 2);
    ctx.globalAlpha = 1;
  }

  // marcas de feromônio (gotas de cheiro) — só nas posições já marcadas
  const drops = 10;
  for (let i = 0; i < drops; i++) {
    const px = Math.round(x + (i + 0.5) * (w / drops));
    const on = (i + 0.5) / drops <= Math.max(0.04, frac);
    ctx.globalAlpha = on ? 0.75 : 0.22;
    ctx.fillStyle = on ? trail : "#4a3a6e";
    ctx.fillRect(px, midY + floor - 2, 2, 2);
  }
  ctx.globalAlpha = 1;

  // irmãs andando pela trilha (a colônia se move, o HUD respira)
  const ants = 4;
  for (let i = 0; i < ants; i++) {
    const prog = (time * (danger ? 0.28 : 0.16) + i / ants) % 1;
    const ax = Math.round(x + 6 + prog * (w - 12));
    const bob = Math.round(Math.sin(time * 6 + i * 1.7) * 1.2);
    const near = prog > Math.max(0.05, frac) - 0.06;
    drawAntGlyph(ctx, ax, midY + bob, danger ? 7 : 6, near ? trail : "#8f7bb5", near ? 0.95 : 0.5, time * 9 + i);
  }

  // brilho de cheiro no ponto de avanço
  if (frac > 0.02) {
    const hx = Math.round(x + Math.min(0.99, frac) * w);
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(hx - 1, midY - floor - 2, 2, floor * 2 + 4);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------- visão de cheiro --
// A visão de feromônio roda num buffer minúsculo (1 pixel por célula de 16px)
// e sobe ampliada por nearest neighbor: cara de pixel art, custo de 60× menos
// amostragem que desenhar gradiente por célula na tela.
const PH_CELL = 16;
const PH_REFRESH = 0.1;     // s entre rebakes
const PH_CAM_EPS = 6;       // px de câmera que forçam rebake
let phCv = null, phCtx = null, phCols = 0, phRows = 0, phNext = -1, phCamX = 1e9, phCamY = 1e9;

// Formigas-sentinela da visão de cheiro: elas sobem o gradiente de comida.
const phAnts = [];
let phAntsReady = false;

function ensurePheroBuffer(cols, rows) {
  if (phCv && phCols === cols && phRows === rows) return;
  const made = makeCanvas(cols, rows);
  phCv = made.cv;
  phCtx = made.c;
  phCols = cols;
  phRows = rows;
  phNext = -1;
}

// Dither de cheiro: grão fixo por cima da névoa. Sem ele as células de 16px
// viram faixas planas de "banding"; com ele lê como bruma orgânica.
let ditherCv = null, ditherW = 0, ditherH = 0;
function bakeDither(VIEW_W, VIEW_H) {
  const { cv, c } = makeCanvas(VIEW_W, VIEW_H);
  if (c) {
    const rnd = rngOf("dither|" + VIEW_W + "|" + VIEW_H);
    c.fillStyle = "rgba(255,255,255,0.05)";
    const n = Math.round((VIEW_W * VIEW_H) / 900);
    for (let i = 0; i < n; i++) c.fillRect(Math.floor(rnd() * VIEW_W), Math.floor(rnd() * VIEW_H), 1, 1);
    c.fillStyle = "rgba(10,8,16,0.06)";
    for (let i = 0; i < n; i++) c.fillRect(Math.floor(rnd() * VIEW_W), Math.floor(rnd() * VIEW_H), 2, 1);
  }
  return cv;
}

function resetPheroAnts(VIEW_W, VIEW_H) {
  phAnts.length = 0;
  for (let i = 0; i < 6; i++) {
    phAnts.push({
      x: VIEW_W * (0.15 + 0.14 * i),
      y: VIEW_H * (0.3 + 0.07 * (i % 3)),
      a: 0.4 + (i % 3) * 0.2,
    });
  }
  phAntsReady = true;
}

/**
 * [H] VISÃO FEROMÔNIO — o que a colônia sente: névoa verde de comida e
 * vermelha de perigo, com sentinelas seguindo o cheiro. LORE: "A COLÔNIA VÊ
 * COM CHEIRO."
 */
export function drawPheromoneOverlay(ctx, cam, VIEW_W, VIEW_H, foodTrailAt, dangerAt, time) {
  const cols = Math.ceil(VIEW_W / PH_CELL) + 2;
  const rows = Math.ceil(VIEW_H / PH_CELL) + 2;

  if (!phAntsReady) resetPheroAnts(VIEW_W, VIEW_H);

  if (hasCanvas()) {
    ensurePheroBuffer(cols, rows);
    const moved = Math.abs(cam.x - phCamX) > PH_CAM_EPS || Math.abs(cam.y - phCamY) > PH_CAM_EPS;
    if (phCtx && (time >= phNext || moved)) {
      phNext = time + PH_REFRESH;
      phCamX = cam.x;
      phCamY = cam.y;
      phCtx.clearRect(0, 0, cols, rows);
      const izoom = 1 / (cam.zoom || 1);
      for (let cy = 0; cy < rows; cy++) {
        const sy = (cy + 0.5) * PH_CELL;
        const wy = cam.y + (sy - VIEW_H / 2) * izoom;
        for (let cx = 0; cx < cols; cx++) {
          const sx = (cx + 0.5) * PH_CELL;
          const wx = cam.x + (sx - VIEW_W / 2) * izoom;
          const food = foodTrailAt(wx, wy);
          const danger = dangerAt(wx, wy);
          if (danger > 0.08) {
            const a = Math.min(0.85, danger * 1.3);
            phCtx.fillStyle = "rgba(255,77,90," + a.toFixed(2) + ")";
            phCtx.fillRect(cx, cy, 1, 1);
          } else if (food > 0.08) {
            const a = Math.min(0.8, food * 1.2);
            phCtx.fillStyle = "rgba(127,214,160," + a.toFixed(2) + ")";
            phCtx.fillRect(cx, cy, 1, 1);
          }
        }
      }
    }
    ctx.fillStyle = "rgba(10,8,16,0.4)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (phCv) {
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(phCv, 0, 0, cols, rows, 0, 0, cols * PH_CELL, rows * PH_CELL);
      ctx.imageSmoothingEnabled = prev;
    }
    if (!ditherCv || ditherW !== VIEW_W || ditherH !== VIEW_H) {
      ditherCv = bakeDither(VIEW_W, VIEW_H);
      ditherW = VIEW_W;
      ditherH = VIEW_H;
    }
    ctx.drawImage(ditherCv, 0, 0);
  }

  // sentinelas: seguem o gradiente de cheiro (3 amostras por eixo)
  if (hasCanvas()) {
    const izoom = 1 / (cam.zoom || 1);
    for (const ant of phAnts) {
      const wx = cam.x + (ant.x - VIEW_W / 2) * izoom;
      const wy = cam.y + (ant.y - VIEW_H / 2) * izoom;
      const d = 10 * izoom;
      const f = foodTrailAt(wx, wy);
      const gx = foodTrailAt(wx + d, wy) - f;
      const gy = foodTrailAt(wx, wy + d) - f;
      const m = Math.hypot(gx, gy) + 1e-5;
      ant.x += (gx / m) * 26 * ant.a + Math.sin(time * 3 + ant.a * 9) * 6;
      ant.y += (gy / m) * 26 * ant.a + Math.cos(time * 2.4 + ant.a * 7) * 6;
      if (ant.x < 12) ant.x = 12;
      if (ant.x > VIEW_W - 12) ant.x = VIEW_W - 12;
      if (ant.y < 12) ant.y = 12;
      if (ant.y > VIEW_H - 12) ant.y = VIEW_H - 12;
      drawAntGlyph(ctx, ant.x, ant.y, 8, "#bfffa8", 0.85, time * 10 + ant.a * 6);
    }
  }

  // legenda de lore (dentro do painel, texto da fonte do jogo)
  const bw = 380, bh = 44;
  const bx = VIEW_W / 2 - bw / 2, by = VIEW_H - bh - 8;
  ctx.fillStyle = "rgba(10,8,16,0.88)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

  ctx.fillStyle = "#7fd6a0";
  ctx.beginPath(); ctx.arc(bx + 16, by + 13, 5, 0, Math.PI * 2); ctx.fill();
  drawText(ctx, "COMIDA", bx + 26, by + 6, { color: "#bfffa8", scale: 0.8 });
  ctx.fillStyle = "#ff4d5a";
  ctx.beginPath(); ctx.arc(bx + 106, by + 13, 5, 0, Math.PI * 2); ctx.fill();
  drawText(ctx, "PERIGO", bx + 116, by + 6, { color: "#ff8a94", scale: 0.8 });
  drawText(ctx, "[H] SOLTE PARA VOLTAR", bx + bw - 12, by + 6, { color: "#8f7bb5", scale: 0.8, align: "right" });
  drawText(ctx, "A COLÔNIA VÊ COM CHEIRO", bx + bw / 2, by + 24, { color: "#efe9ff", scale: 0.85, align: "center" });
}

// ----------------------------------------- minimapa = mapa de trilhas de cheiro --
let miniCv = null, miniCtx = null, miniNext = -1, miniW = 0, miniH = 0;
const MINI_STEP = 3;   // px do minimapa por amostra (2.700 amostras/0,25s)

/**
 * Mini-mapa como MURAL DA TRILHA (P5/P22): em vez de satélite, mostra o cheiro
 * da colônia — comida em verde, perigo em vermelho — por cima do terreno.
 */
export function drawPheromoneMini(ctx, x, y, w, h, foodTrailAt, dangerAt, time) {
  const cols = Math.max(1, Math.ceil(w / MINI_STEP));
  const rows = Math.max(1, Math.ceil(h / MINI_STEP));
  if (hasCanvas()) {
    if (!miniCv || miniW !== cols || miniH !== rows) {
      const made = makeCanvas(cols, rows);
      miniCv = made.cv; miniCtx = made.c; miniW = cols; miniH = rows; miniNext = -1;
    }
    if (miniCtx && time >= miniNext) {
      miniNext = time + 0.25;
      miniCtx.clearRect(0, 0, cols, rows);
      for (let cy = 0; cy < rows; cy++) {
        const wy = ((cy + 0.5) / rows) * WORLD_H;
        for (let cx = 0; cx < cols; cx++) {
          const wx = ((cx + 0.5) / cols) * WORLD_W;
          const food = foodTrailAt(wx, wy);
          const danger = dangerAt(wx, wy);
          if (danger > 0.1) {
            miniCtx.fillStyle = "rgba(255,77,90," + Math.min(0.85, danger).toFixed(2) + ")";
            miniCtx.fillRect(cx, cy, 1, 1);
          } else if (food > 0.1) {
            miniCtx.fillStyle = "rgba(127,214,160," + Math.min(0.8, food * 0.9).toFixed(2) + ")";
            miniCtx.fillRect(cx, cy, 1, 1);
          }
        }
      }
    }
    if (miniCv) {
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(miniCv, 0, 0, cols, rows, x, y, w, h);
      ctx.imageSmoothingEnabled = prev;
    }
  }
}
