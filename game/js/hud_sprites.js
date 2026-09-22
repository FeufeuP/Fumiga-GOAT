// ============================================================================
// FUMIGA — HUD SPRITES (FASE 1): as folhas de sprite do HUD orgânico
//
// A arte do HUD vem de game/assets/sprites/hud/ (geradas por tools/make_hud.py):
//   hud_panels.png  6 peles de painel de quitina/cera — 9-slice de 12px
//   hud_gaster.png  6 gasters por bioma + vazio + ferido (tira de 64x16)
//   hud_crown.png   4 quadros da coroa de fungo/seda da Silenciosa
//   hud_icons.png   12x2 ícones de 14px (comidas, cristais, marcas, anéis...)
//   hud_ant.png     4 quadros de marcha da irmã da trilha (normal e pequena)
//
// Este módulo só DESENHA: nenhuma lógica de jogo, nenhuma alocação por frame.
// Se as folhas não estiverem carregadas (testes headless, falha de rede), cada
// função devolve false e o HUD cai no desenho procedural de lore_hud.js.
// Regra 8: tudo inseto/fauna — coroa de fungo e seda, nunca coroa humana.
// ============================================================================
import { IMG } from "./assets.js";

export const HUD_ATLAS = {
  panels: { key: "hud_panels", w: 36, h: 216, slice: 12, rows: 6 },
  gaster: { key: "hud_gaster", w: 64, h: 16, rows: 8, cap: 12 },
  crown: { key: "hud_crown", w: 26, h: 12, frames: 4 },
  icons: { key: "hud_icons", w: 168, h: 28, cell: 14, cols: 12, rows: 2 },
  ant: { key: "hud_ant", w: 14, h: 10, frames: 4, rows: 3 },   // normal, pequena, perigo
};

// linha da folha por bioma (mesma ordem do gerador: BIOMES em tools/make_hud.py)
export const HUD_ROW = { planicie: 0, floresta: 1, pantano: 2, deserto: 3, outono: 4, gelo: 5 };
export const GASTER_EMPTY_ROW = 6;
export const GASTER_HURT_ROW = 7;

// índice plano dos ícones: coluna + linha * 12
export const ICON = {
  trevo: 0, cogumelo: 1, alga: 2, semente: 3, outono: 4, gelo: 5,
  essencia_planicie: 6, essencia_floresta: 7, essencia_pantano: 8,
  essencia_deserto: 9, essencia_outono: 10, essencia_gelo: 11,
  anel: 12, anel_seiva: 13, marca_comida: 14, marca_perigo: 15,
  quitina: 16, dither: 17, mel: 18, seda: 19, esporo: 20,
  coroa_fungo: 21, formiga: 22, estrela: 23,
};

/** Todas as folhas do HUD carregadas? (senão o HUD usa o traço procedural) */
export function hudSpritesReady() {
  return !!(IMG[HUD_ATLAS.panels.key] && IMG[HUD_ATLAS.gaster.key] &&
    IMG[HUD_ATLAS.crown.key] && IMG[HUD_ATLAS.icons.key] && IMG[HUD_ATLAS.ant.key]);
}

// Quantos elementos do HUD saíram da folha (não do traço procedural). Os
// testes usam para garantir que a arte está de fato no ar.
let spriteDraws = 0;
export function hudSpriteDraws() { return spriteDraws; }
export function resetHudSpriteDraws() { spriteDraws = 0; }

function sheet(kind) {
  const a = HUD_ATLAS[kind];
  return IMG[a.key] || null;
}

function noSmooth(ctx, fn) {
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  fn();
  ctx.imageSmoothingEnabled = prev;
}

// ------------------------------------------------------------ painel 9-slice --
/**
 * Painel de quitina/cera do bioma em 9 fatias (cantos de 12px intactos, meio
 * esticado). Retorna false se a folha não estiver carregada.
 */
export function drawPanelSprite(ctx, x, y, w, h, biome, time) {
  const img = sheet("panels");
  if (!img) return false;
  const S = HUD_ATLAS.panels.slice;
  const row = HUD_ROW[biome] !== undefined ? HUD_ROW[biome] : 0;
  const sy = row * HUD_ATLAS.panels.w;
  const X = Math.round(x), Y = Math.round(y);
  const W = Math.max(S * 2, Math.round(w));
  const H = Math.max(S * 2, Math.round(h));
  const mid = HUD_ATLAS.panels.w - S * 2;

  noSmooth(ctx, () => {
    const put = (sx, dx, dy, dw, dh) => ctx.drawImage(img, sx, sy, S, S, dx, dy, dw, dh);
    // linhas de cima, meio e baixo
    put(0, X, Y, S, S);
    put(S, X + S, Y, W - S * 2, S);
    put(S + mid, X + W - S, Y, S, S);
    put(0, X, Y + S, S, H - S * 2);
    put(S, X + S, Y + S, W - S * 2, H - S * 2);
    put(S + mid, X + W - S, Y + S, S, H - S * 2);
    put(0, X, Y + H - S, S, S);
    put(S, X + S, Y + H - S, W - S * 2, S);
    put(S + mid, X + W - S, Y + H - S, S, S);
  });

  // respiração: faixa de cera descendo pela quitina (o painel está vivo)
  if (H > 8) {
    const band = ((time * 9) % (H + 10)) - 5;
    if (band > 0 && band < H - 3) {
      ctx.globalAlpha = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(time * 1.6 + row));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(X, Y + band, W, 2);
      ctx.globalAlpha = 1;
    }
  }
  spriteDraws++;
  return true;
}

// ------------------------------------------------------------------- ícones --
/** Ícone da folha (índice plano), escalado por nearest neighbor. */
export function drawIconSprite(ctx, index, x, y, size) {
  const img = sheet("icons");
  if (!img) return false;
  const C = HUD_ATLAS.icons.cell;
  const col = index % HUD_ATLAS.icons.cols;
  const row = Math.floor(index / HUD_ATLAS.icons.cols);
  if (row >= HUD_ATLAS.icons.rows) return false;
  const s = Math.max(4, Math.round(size));
  noSmooth(ctx, () => ctx.drawImage(img, col * C, row * C, C, C, Math.round(x), Math.round(y), s, s));
  spriteDraws++;
  return true;
}

// ------------------------------------------------------------------- gaster --
/**
 * Gaster da Rainha Silenciosa a partir da folha: casco vazio + tira do bioma
 * recortada pelo HP (a barra "enche" de seiva) + coroa de fungo/seda animada.
 * Abaixo de 30% a tira ferida assume e o conjunto pulsa.
 */
export function drawGasterSprite(ctx, x, y, w, h, frac, biome, low, time) {
  const img = sheet("gaster");
  if (!img) return false;
  const { w: SW, h: SH, cap } = HUD_ATLAS.gaster;
  const row = HUD_ROW[biome] !== undefined ? HUD_ROW[biome] : 0;
  const X = Math.round(x), Y = Math.round(y);
  const W = Math.round(w), H = Math.round(h);
  const midW = SW - cap * 2;
  const pulse = low ? 1 + Math.sin(time * 6) * 0.06 : 1;
  const fill = Math.max(0, Math.min(1, frac)) * W;

  const strip = (rowIdx) => {
    const sy = rowIdx * SH;
    ctx.drawImage(img, 0, sy, cap, SH, X, Y, cap, H);
    ctx.drawImage(img, cap, sy, midW, SH, X + cap, Y, W - cap * 2, H);
    ctx.drawImage(img, SW - cap, sy, cap, SH, X + W - cap, Y, cap, H);
  };

  ctx.save();
  ctx.translate(X + W / 2, Y + H / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(X + W / 2), -(Y + H / 2));
  noSmooth(ctx, () => {
    strip(GASTER_EMPTY_ROW);                       // casco de quitina vazio
    if (fill > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(X, Y - 2, fill, H + 4);
      ctx.clip();
      strip(low ? GASTER_HURT_ROW : row);          // seiva do bioma (ou ferida)
      ctx.restore();
    }
  });

  // veias brancas correndo quando a Pálida aperta o gaster
  if (low) {
    ctx.globalAlpha = 0.5 + Math.sin(time * 7) * 0.3;
    ctx.fillStyle = "#ffe0e4";
    for (let i = 0; i < 3; i++) {
      const vx = X + 10 + ((time * 40 + i * 37) % Math.max(12, fill - 8));
      ctx.fillRect(Math.round(vx), Y + 2, 1, H - 4);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // coroa de fungo/seda no istmo do gaster
  drawCrownSprite(ctx, X + W / 2, Y - HUD_ATLAS.crown.h + 3, time, low ? 2 : 1);
  spriteDraws++;
  return true;
}

/** Coroa da Silenciosa: 3 picos de fungo costurados por seda (4 quadros). */
export function drawCrownSprite(ctx, cx, y, time, stride = 1) {
  const img = sheet("crown");
  if (!img) return false;
  const { w: CW, h: CH, frames } = HUD_ATLAS.crown;
  const f = Math.floor(time * 6) % frames;
  const X = Math.round(cx - CW / 2);
  noSmooth(ctx, () => ctx.drawImage(img, f * CW, 0, CW, CH, X, Math.round(y), CW, CH));
  spriteDraws++;
  // a cada respiração, um brilho de âmbar sobe do fungo central
  const glow = (time * 1.4) % 1;
  if (glow < 0.5) {
    ctx.globalAlpha = 0.5 * (1 - Math.abs(glow * 2 - 0.5));
    ctx.fillStyle = "#ffd479";
    ctx.fillRect(X + Math.round(CW / 2) + (stride - 1), Math.round(y) - 1, 2, 2);
    ctx.globalAlpha = 1;
  }
  return true;
}

// ------------------------------------------------------- irmã da trilha ------
/**
 * Formiga de perfil andando (4 quadros). Estilos da folha:
 *   0 = irmã normal (trilha em calmaria) · 1 = irmã pequena · 2 = em marcha de
 *   perigo (pálida: a Névoa esfria a trilha na invasão).
 */
export function drawAntSprite(ctx, x, y, phase, style = 0) {
  const img = sheet("ant");
  if (!img) return false;
  const { w: AW, h: AH, frames } = HUD_ATLAS.ant;
  const f = Math.floor(phase) % frames;
  const row = Math.max(0, Math.min(HUD_ATLAS.ant.rows - 1, typeof style === "boolean" ? (style ? 1 : 0) : style | 0));
  noSmooth(ctx, () => ctx.drawImage(img, f * AW, row * AH, AW, AH, Math.round(x - AW / 2), Math.round(y - AH / 2), AW, AH));
  spriteDraws++;
  return true;
}

/** Marca de cheiro no chão da trilha (comida = verde, perigo = vermelho). */
export function drawTrailMarkSprite(ctx, x, y, danger, on = true, scale = 1) {
  const index = on ? (danger ? ICON.marca_perigo : ICON.marca_comida) : ICON.quitina;
  const size = 10 * scale;
  const ok = drawIconSprite(ctx, index, Math.round(x - size / 2), Math.round(y - size / 2), size);
  if (ok && !on) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#14101d";
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    ctx.globalAlpha = 1;
  }
  return ok;
}
