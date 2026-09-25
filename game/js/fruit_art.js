// ============================================================================
// FUMIGA — Maçãs douradas dos sete frutos e Santuário de cada bioma
// ============================================================================
// A arte dos frutos vive em dois PNGs por mapa (gerados fora do jogo):
//   • `ui/frutos/maca_<mapa>.png`       — maçã dourada estilizada, RGBA, caule
//                                         e folha incluídos, fundo transparente.
//   • `ui/frutos/santuario_<mapa>.png`  — santuário do bioma, 960x540, usado
//                                         como fundo da tela que abre ao clicar
//                                         no fruto (a miniárvore de poderes).
//
// Nada aqui é obrigatório: se o PNG não existir, o jogo volta exatamente ao
// desenho procedural anterior (gema âmbar na árvore, fundo crepuscular na
// miniárvore). Isso permite integrar o código primeiro e a arte depois, sem
// quebrar boot, saves, testes ou o mobile.
// ----------------------------------------------------------------------------
import { VIEW_W, VIEW_H } from "./config.js";
import { IMG, FRUIT_ART_FILES, hasArt } from "./assets.js";
import { drawLoreTextbox, getBiomeHUD, BIOME_HUD } from "./lore_hud.js";
import { panel } from "./ui.js";
import { TAU } from "./utils.js";

// Temas por mapa. `topo` é a copa da Névoa-Mãe (prévia, não é bioma jogável):
// cai no tema neutro da colônia, com o acento violeta do sétimo fruto.
export const FRUIT_THEMES = {
  planicie: { biome: "planicie", accent: "#7fd6a0", border: "#ffd479", shine: "#fff6c8", shrine: "SANTUÁRIO DO ORVALHO" },
  floresta: { biome: "floresta", accent: "#6db7ff", border: "#bfffa8", shine: "#d8ffe0", shrine: "SANTUÁRIO DE MUSGO" },
  pantano: { biome: "pantano", accent: "#37e6c8", border: "#7fd6ff", shine: "#d9fff6", shrine: "SANTUÁRIO SUBMERSO" },
  deserto: { biome: "deserto", accent: "#ffb347", border: "#ffd479", shine: "#ffe9b8", shrine: "SANTUÁRIO CALCINADO" },
  outono: { biome: "outono", accent: "#ff9a5c", border: "#ffd479", shine: "#ffe2b0", shrine: "SANTUÁRIO DOURADO" },
  gelo: { biome: "gelo", accent: "#e8f4ff", border: "#7fd6ff", shine: "#ffffff", shrine: "SANTUÁRIO GLACIAL" },
  topo: { biome: "colonia", accent: "#d9b8ff", border: "#8f6fd6", shine: "#f0e2ff", shrine: "SANTUÁRIO DA NÉVOA-MÃE" },
};

export function fruitTheme(map) { return FRUIT_THEMES[map] || FRUIT_THEMES.topo; }
export function appleKey(map) { return "maca_" + map; }
export function shrineKey(map) { return "santuario_" + map; }
/** Os PNGs existem? (fallback procedural quando não). */
export function hasApple(map) { return hasArt(appleKey(map)); }
export function hasShrine(map) { return hasArt(shrineKey(map)); }

// ------------------------------------------------------------------ cinza ---
// Fruto bloqueado = arte dessaturada, assada UMA vez e reaproveitada (o mesmo
// princípio da árvore: nunca recalcular cor por frame). Sem `document` (testes
// headless só leem lógica) o chamador volta ao desenho procedural.
const GRAY = new Map();
function grayOf(key) {
  if (GRAY.has(key)) return GRAY.get(key);
  const img = IMG[key];
  let out = null;
  if (typeof document !== "undefined" && img && img.width) {
    try {
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const c = cv.getContext("2d", { willReadFrequently: true });
      c.drawImage(img, 0, 0);
      const data = c.getImageData(0, 0, cv.width, cv.height);
      const p = data.data;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const g = Math.round(p[i] * .2126 + p[i + 1] * .7152 + p[i + 2] * .0722);
        // Cinza frio, ainda legível sobre a casca: nada de preto chapado.
        p[i] = Math.round(g * .78 + 34 * .22);
        p[i + 1] = Math.round(g * .78 + 30 * .22);
        p[i + 2] = Math.round(g * .78 + 42 * .22);
      }
      c.putImageData(data, 0, 0);
      out = cv;
    } catch (e) { out = null; }
  }
  GRAY.set(key, out);
  return out;
}

// ------------------------------------------------------------------ maçã ----
/**
 * Desenha a maçã dourada do mapa centrada em (x, y), com `size` de largura.
 * `locked` usa a versão dessaturada; `hot` acrescenta o halo de seleção.
 * Retorna false quando não há PNG — o chamador desenha a gema procedural.
 */
export function drawApple(ctx, map, x, y, size, opt = {}) {
  const key = appleKey(map), img = IMG[key];
  if (!img || !img.width) return false;
  const src = opt.locked ? (grayOf(key) || img) : img;
  const w = Math.max(2, Math.round(size));
  const h = Math.max(2, Math.round(size * img.height / img.width));
  const dx = Math.round(x - w / 2), dy = Math.round(y - h / 2);
  const t = opt.time || 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Halo do bioma: pulso lento (respeita partículas reduzidas — time 0).
  if (!opt.locked) {
    const theme = fruitTheme(map);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = (opt.hot ? .30 : .16) + (t ? .05 * Math.sin(t * 2) : 0);
    ctx.fillStyle = theme.shine;
    ctx.beginPath();
    ctx.arc(x, y, w * (opt.hot ? .62 : .52), 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  // Sombra de contato: o fruto pendura no galho, não flutua sobre ele.
  ctx.globalAlpha = .35;
  ctx.fillStyle = "#0b0812";
  ctx.beginPath();
  ctx.ellipse(x, y + h * .40, w * .26, h * .09, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = opt.locked ? .85 : 1;
  ctx.drawImage(src, dx, dy, w, h);
  ctx.globalAlpha = 1;
  ctx.restore();
  return true;
}

// -------------------------------------------------------------- santuário ---
/**
 * Fundo da tela do fruto: o santuário do bioma ocupa o canvas inteiro e
 * receve um véu escuro vertical, para o texto e os cartões continuarem
 * legíveis (alto contraste e fonte grande não mudam a composição).
 * Retorna false sem PNG — o chamador usa o crepúsculo procedural de sempre.
 */
export function drawShrine(ctx, map, opt = {}) {
  const img = IMG[shrineKey(map)];
  if (!img || !img.width) return false;
  const theme = fruitTheme(map);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;
  ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  // Véu: topo e base mais fechados (HUD e rodapé), meio aberto (a arte aparece).
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(9,7,16,0.66)");
  g.addColorStop(.42, "rgba(9,7,16,0.30)");
  g.addColorStop(1, "rgba(9,7,16,0.78)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Banho de cor do bioma: costura o fundo com os painéis de madeira viva.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = .07;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  return true;
}

/**
 * Painel da tela do fruto: madeira viva do bioma (mesmo kit das caixas de
 * diálogo) quando a arte do lore está carregada; caso contrário, o painel
 * procedural com a borda na cor do fruto.
 */
export function drawShrinePanel(ctx, x, y, w, h, map, opt = {}) {
  const theme = fruitTheme(map);
  const wood = drawLoreTextbox(ctx, x, y, w, h, theme.biome);
  if (!wood) {
    panel(ctx, x, y, w, h, { border: opt.border || theme.border, ...opt });
    return false;
  }
  // Filete de luz do bioma na borda superior, como nas tábuas do HUD.
  ctx.save();
  ctx.globalAlpha = .5;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(Math.round(x) + 8, Math.round(y) + 2, Math.max(0, Math.round(w) - 16), 1);
  ctx.restore();
  return true;
}

/** Nome do santuário e paleta para o cabeçalho da tela do fruto. */
export function shrineStyle(map) {
  const theme = fruitTheme(map);
  const hud = BIOME_HUD[theme.biome] ? getBiomeHUD(theme.biome) : getBiomeHUD("colonia");
  return { ...theme, hud };
}

/** Diagnóstico (Regra 10 / inspeções): quais artes estão presentes. */
export function fruitArtInfo() {
  const maps = Object.keys(FRUIT_THEMES);
  return {
    files: FRUIT_ART_FILES,
    apples: maps.filter(hasApple),
    shrines: maps.filter(hasShrine),
  };
}
