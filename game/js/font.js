// ============================================================================
// FUMIGA-GOAT — tipografia Kiwi Soda (TTF) para todo o jogo
// O motor desenha em Canvas 2D; os textos são medidos e cacheados em linhas.
// ============================================================================
import { G } from "./state.js";
import { assetUrl, LOAD_CFG } from "./assets.js";

export const FONT_FAMILY = "Kiwi Soda";
export const FONT_ASSET = "assets/font/KiwiSoda.ttf";

// Caracteres usados pelo conteúdo em português e nos símbolos da interface.
// Kiwi Soda cobre letras, acentos, números e pontuação; • ▶ ✓ ∞ são símbolos
// intencionalmente renderizados pelo fallback sans-serif do navegador.
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ÁÀÂÃÉÊÍÓÔÕÚÇ" +
  "0123456789" +
  "?!.,:;+-*/%()<>=#_ " +
  "—•▶[]✓" +
  "∞Ñ";
export const FONT_CHARS = CHARS;
export const FONT_FALLBACK_CHARS = "•▶✓∞";

/** Caracteres entregues a drawText que não estão no conjunto conhecido. */
export const missingGlyphs = new Map();

// ---------------------------------------------------------- GRAVADOR DE LAYOUT
// Ferramenta de auditoria (modo debug / test/layout-browser.mjs): quando ligado
// por UM frame, grava a caixa de tinta de cada texto e cada painel/botão, já na
// coordenada do canvas. Desligado (sempre, no jogo normal) custa um `if`.
//   layer: "world" (mundo da expedição, que pode se sobrepor à vontade) | "ui"
//   clip:  retângulo de recorte ativo (lista rolável), para ignorar o escondido
export const layoutRec = { on: false, layer: "ui", clip: null, texts: [], boxes: [] };

// Medidas visuais do sistema original mantidas como referência de composição.
// O tamanho em em permite a Kiwi Soda conservar a hierarquia big/small, enquanto
// line-height deixa um respiro consistente para acentos e descendentes.
export const FONT = {
  big:   { size: 30, ch: 30, lh: 36 },
  small: { size: 18, ch: 18, lh: 22 },
};

const textCache = new Map();
const metricCache = new Map();
const CACHE_MAX = 600;
let measureCtx = null;
let optionsAccent = "#37e6c8";

/** CSS font shorthand compartilhado pelo Canvas, loader e overlay de debug. */
export function fontCSS(size, weight = "normal") {
  return `${weight} ${Math.max(1, Number(size) || 1)}px "${FONT_FAMILY}", sans-serif`;
}

function measureContext() {
  if (!measureCtx && typeof document !== "undefined" && document.createElement) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  return measureCtx;
}

function fontSpec(font, scale) {
  const F = FONT[font] || FONT.small;
  return fontCSS(F.size * scale);
}

/** Carrega a TTF antes dos sprites e registra-a para Canvas e elementos HTML. */
export async function loadFonts() {
  if (typeof FontFace === "undefined" || !document.fonts || typeof document.fonts.add !== "function") {
    throw new Error("navegador sem suporte a FontFace para carregar Kiwi Soda");
  }

  const failed = [];
  for (let attempt = 0; attempt < LOAD_CFG.attempts; attempt++) {
    const url = assetUrl(FONT_ASSET) + (attempt ? "&r=" + attempt : "");
    const face = new FontFace(FONT_FAMILY, `url("${url}")`, { style: "normal", weight: "400" });
    let timer = null;
    try {
      const loading = Promise.resolve(face.load());
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("tempo esgotado")), LOAD_CFG.timeoutMs);
      });
      const loaded = await Promise.race([loading, timeout]);
      clearTimeout(timer);
      document.fonts.add(loaded || face);
      textCache.clear();
      metricCache.clear();
      return true;
    } catch (error) {
      if (timer !== null) clearTimeout(timer);
      if (document.fonts.delete) document.fonts.delete(face);
      failed.push(error);
    }
  }
  const reason = failed.length ? ": " + (failed[failed.length - 1]?.message || "falha desconhecida") : "";
  throw new Error("fonte não carregou: " + FONT_ASSET + reason);
}

function metricKey(text, font, scale) {
  return font + "|" + Number(scale).toFixed(4) + "|" + text;
}

/** Métricas reais da Kiwi Soda, incluindo os limites de tinta usados no layout. */
function textMetrics(text, font, scale) {
  const F = FONT[font] || FONT.small;
  scale = Math.max(0.01, Number(scale) || 1);
  const key = metricKey(text, font, scale);
  const cached = metricCache.get(key);
  if (cached) return cached;

  const size = F.size * scale;
  const ctx = measureContext();
  let raw = null;
  if (ctx) {
    ctx.font = fontSpec(font, scale);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    try { raw = ctx.measureText(text); } catch (e) { raw = null; }
  }

  // Fallbacks mantêm os testes headless e os navegadores incomuns determinísticos;
  // em jogo real, measureText fornece a largura e as caixas exatas do TTF.
  const fallbackWidth = Array.from(text).reduce((sum, ch) => {
    if (ch === " ") return sum + size * 0.36;
    if (/[I1!|.,:;]/.test(ch)) return sum + size * 0.36;
    if (/[MW@#%]/.test(ch)) return sum + size * 0.82;
    return sum + size * 0.62;
  }, 0);
  const width = Number.isFinite(raw?.width) && raw.width >= 0 ? raw.width : fallbackWidth;
  const ascent = Number.isFinite(raw?.actualBoundingBoxAscent) && raw.actualBoundingBoxAscent > 0
    ? raw.actualBoundingBoxAscent : size * 0.78;
  const descent = Number.isFinite(raw?.actualBoundingBoxDescent) && raw.actualBoundingBoxDescent >= 0
    ? raw.actualBoundingBoxDescent : size * 0.18;
  const left = Number.isFinite(raw?.actualBoundingBoxLeft) && raw.actualBoundingBoxLeft >= 0
    ? raw.actualBoundingBoxLeft : 0;
  const right = Number.isFinite(raw?.actualBoundingBoxRight) && raw.actualBoundingBoxRight >= 0
    ? raw.actualBoundingBoxRight : width;
  const padX = Math.max(1, Math.ceil(size * 0.02));
  const padY = Math.max(1, Math.ceil(size * 0.025));
  const inkWidth = Math.max(width, left + right);
  const inkHeight = ascent + descent;
  const result = {
    width: Math.max(1, Math.ceil(inkWidth + padX * 2)),
    height: Math.max(1, Math.ceil(Math.max(F.ch * scale, inkHeight) + padY * 2)),
    padX, padY, ascent, descent,
    inkX: padX - left,
    inkY: padY,
    inkWidth: Math.max(1, left + right),
    inkHeight: Math.max(1, inkHeight),
    baseline: padY + ascent,
    size,
  };
  metricCache.set(key, result);
  if (metricCache.size > CACHE_MAX * 4) {
    let n = 0;
    for (const k of metricCache.keys()) { metricCache.delete(k); if (++n >= CACHE_MAX * 2) break; }
  }
  return result;
}

function mixHex(base, accent, amount) {
  const a = String(base).match(/^#([0-9a-f]{6})$/i), b = String(accent).match(/^#([0-9a-f]{6})$/i);
  if (!a || !b) return base;
  const aa = a[1], bb = b[1];
  const rgb = [0, 2, 4].map((i) => {
    const x = parseInt(aa.slice(i, i + 2), 16), y = parseInt(bb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  });
  return "#" + rgb.join("");
}

function screenAccent() {
  if (G.screen === "OPTIONS") return optionsAccent;
  if (G.screen === "RUN" && G.run?.baseOpen) return "#ffb347";
  if (G.screen === "RUN") {
    const biomes = ["#7fd6a0", "#a8e6a1", "#37e6c8", "#ffb347", "#ff9a5c", "#7fd6ff"];
    return biomes[Math.max(0, Math.min(biomes.length - 1, G.run?.mapIdx | 0))];
  }
  const screens = {
    BOOT: "#37e6c8", PRETITLE: "#37e6c8", TITLE: "#37e6c8",
    MODE: "#ffd479", TREE: "#c77dff", HELP: "#6db7ff",
    PROPHECY: "#6ee7ff", MEMORY: "#c77dff",
  };
  return screens[G.screen] || "#c77dff";
}

function screenTextPalette() {
  const accent = screenAccent();
  if (G.save?.accessibility?.highContrast) {
    return {
      body: mixHex("#ffffff", accent, 0.16),
      dim: mixHex("#e4e0ef", accent, 0.2),
      muted: mixHex("#c9c3d8", accent, 0.2),
    };
  }
  return {
    body: mixHex("#efe9ff", accent, 0.42),
    dim: mixHex("#9a8fc0", accent, 0.48),
    muted: mixHex("#6b5a8a", accent, 0.4),
  };
}

/** Atualiza o acento da aba ativa das OPÇÕES; usado na próxima linha desenhada. */
export function setOptionsFontAccent(color) {
  if (/^#[0-9a-f]{6}$/i.test(String(color || ""))) optionsAccent = color;
}

/** Cor efetiva: a tela colore textos neutros, sem roubar as cores semânticas. */
export function resolveFontColor(color = null) {
  const palette = screenTextPalette();
  if (color == null) return palette.body;
  const key = String(color).trim().toLowerCase();
  if (["#efe9ff", "#f0eaff"].includes(key)) return palette.body;
  if (["#9a8fc0", "#8f7bb5"].includes(key)) return palette.dim;
  if (["#6b5a8a", "#5a4f78"].includes(key)) return palette.muted;
  return color;
}

/**
 * Largura real de uma linha. Aceita texto (proporcional) e, por compatibilidade,
 * um número de caracteres (medido como uma sequência de M maiúsculos).
 */
export function lineWidth(value, { font = "small", scale = 1 } = {}) {
  const text = typeof value === "number"
    ? "M".repeat(Math.max(0, Math.floor(value)))
    : String(value);
  if (!text.length) return 0;
  return textMetrics(text.toUpperCase(), font, scale).width;
}

/** Fator da acessibilidade FONTE GRANDE. TODA medida de texto passa por aqui:
 *  se textWidth ignorasse os +30%, quem calcula coluna por largura medida
 *  (opções, legenda, preços) erraria a conta e o texto vazaria da caixa. */
export function fontScale() {
  return (G && G.save && G.save.accessibility && G.save.accessibility.bigFont) ? 1.3 : 1;
}

/** Largura REAL ocupada por um texto na tela (já com o FONTE GRANDE). */
export function textWidth(text, { font = "small", scale = 1 } = {}) {
  return lineWidth(String(text).toUpperCase(), { font, scale: scale * fontScale() });
}

/** Altura da linha desenhada com a mesma escala/acessibilidade de drawText. */
export function textHeight(text, { font = "small", scale = 1 } = {}) {
  return textMetrics(String(text).toUpperCase(), font, scale * fontScale()).height;
}

/** Renderiza (com cache) uma linha de texto e a desenha em ctx. */
export function drawText(ctx, text, x, y, {
  font = "small", scale = 1, color = null, align = "left", shadow = true,
  shadowColor = "rgba(10,8,18,0.9)", alpha = 1, maxWidth = Infinity,
} = {}) {
  text = String(text).toUpperCase();
  // Acessibilidade aumenta 30% antes da restrição por maxWidth, para o texto
  // medido e o desenhado continuarem com exatamente a mesma largura.
  scale *= fontScale();
  if (G && G.save && G.save.accessibility && G.save.accessibility.highContrast) {
    shadow = true;
    shadowColor = "rgba(0,0,0,1)";
  }
  const baseWidth = Math.max(1, lineWidth(text, { font, scale: 1 }));
  if (Number.isFinite(maxWidth)) scale = Math.min(scale, Math.max(0.01, maxWidth / baseWidth));
  const resolvedColor = resolveFontColor(color);
  const cv = lineCanvas(text, font, scale, resolvedColor);
  let dx = x;
  if (align === "center") dx = x - cv.width / 2;
  else if (align === "right") dx = x - cv.width;

  if (layoutRec.on && text.trim()) {
    const trimmed = text.trim();
    const m = textMetrics(trimmed, font, scale);
    layoutRec.texts.push(Object.assign({ text: trimmed, layer: layoutRec.layer, clip: layoutRec.clip,
      alpha: ctx.globalAlpha * alpha },
      txBox(ctx, dx + m.inkX, y + m.inkY, m.inkWidth, m.inkHeight)));
  }
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.drawImage(lineCanvas(text, font, scale, shadowColor), Math.round(dx) + scale, Math.round(y) + scale);
  }
  ctx.drawImage(cv, Math.round(dx), Math.round(y));
  ctx.globalAlpha = prevA;
  return cv.height;
}

function lineCanvas(text, fname, scale, color) {
  const key = fname + "|" + Number(scale).toFixed(4) + "|" + color + "|" + text;
  let cv = textCache.get(key);
  if (cv) return cv;
  const F = FONT[fname] || FONT.small;
  const m = textMetrics(text, fname, scale);
  cv = document.createElement("canvas");
  cv.width = m.width;
  cv.height = m.height;
  const c = cv.getContext("2d");
  c.font = fontSpec(fname, scale);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = color;
  c.fillText(text, m.padX, m.baseline);
  textCache.set(key, cv);
  if (textCache.size > CACHE_MAX) {
    let n = 0;
    for (const k of textCache.keys()) { textCache.delete(k); if (++n >= CACHE_MAX / 2) break; }
  }
  // só no caminho sem cache: custo zero por frame
  if (missingGlyphs.size < 64) {
    for (const ch of text) {
      if (!FONT_CHARS.includes(ch) && !missingGlyphs.has(ch)) missingGlyphs.set(ch, text);
    }
  }
  return cv;
}

/**
 * Faz um texto caber em uma caixa maxW x maxH: quebra em quantas linhas forem
 * necessárias e, se ainda sobrar, reduz um pouco o corpo (auto-redução suave).
 * O texto NUNCA é cortado nem reescrito — é o que as telas densas (profecias,
 * memórias, tutorial) usam para não invadir o vizinho com FONTE GRANDE ligada.
 * Devolve { lines, scale, step } — desenhe as linhas com `step` de passo.
 */
export function fitTextBlock(text, maxW, maxH, { font = "small", scale = 1, minScale = 0.62, lineStep = 15 } = {}) {
  const FS = fontScale();
  for (let s = scale; s >= minScale - 1e-6; s -= 0.05) {
    const lines = wrapText(text, maxW, { font, scale: s });
    const step = Math.ceil(lineStep * s * FS);
    if (lines.length * step <= maxH) return { lines, scale: s, step };
  }
  const s = minScale;
  return { lines: wrapText(text, maxW, { font, scale: s }), scale: s, step: Math.ceil(lineStep * s * FS) };
}

/** Quebra texto em linhas cabendo em maxW. */
export function wrapText(text, maxW, { font = "small", scale = 1 } = {}) {
  text = String(text).toUpperCase();
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (textWidth(test, { font, scale }) > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function txBox(ctx, x, y, w, h) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  if (!m || typeof m.a !== "number") return { x, y, w, h };
  const x0 = m.a * x + m.c * y + m.e, y0 = m.b * x + m.d * y + m.f;
  const x1 = m.a * (x + w) + m.c * (y + h) + m.e, y1 = m.b * (x + w) + m.d * (y + h) + m.f;
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

/** Grava um contêiner (painel, botão, caixa) para a auditoria de layout. */
export function layoutBox(ctx, kind, x, y, w, h, id) {
  if (!layoutRec.on) return;
  layoutRec.boxes.push(Object.assign({ kind, id: id || kind, layer: layoutRec.layer, clip: layoutRec.clip }, txBox(ctx, x, y, w, h)));
}
