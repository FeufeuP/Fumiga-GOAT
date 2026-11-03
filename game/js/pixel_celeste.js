// ============================================================================
// FUMIGA — FRAME PIXEL CELESTE (fase F0b)
//
// O MUNDO do jogo é desenhado num buffer de 320x180 e ampliado x3 (960x540)
// com vizinho-mais-próximo — o mesmo arranjo do Celeste (canvas de jogo
// 320x180, escala inteira, tiles 8x8). A UI/HUD continua desenhada no canvas
// cheio, por cima: são os "dois mundos de densidade separados" da Regra 6.
//
// DECISÃO DO USUÁRIO (2026-10-26): "não é uma opção, é o estilo do jogo
// inteiro, não pode ser desativado ou ativado". Por isso não existe chave em
// OPÇÕES → VÍDEO: o frame é permanente e vale para o mundo em toda partida.
//
// CÂMERA LISA COM PIXEL TRAVADO (opção escolhida entre as três apresentadas):
// o conteúdo é desenhado com a translação da câmera arredondada em pixels do
// buffer, e o resto fracionário volta na composição como deslocamento INTEIRO
// de tela. Assim os sprites nunca caem em meio pixel (nada de shimmer) e a
// câmera continua andando de 1 em 1 px de tela, como já fazia antes.
// Técnica descrita em saint11.art/blog/consistency ("bleed area"): o buffer
// precisa de alguns pixels de sangria para o deslocamento não abrir fresta.
//
// Custo por quadro: 1 clear + 1 drawImage de ampliação. Nada é pós-processado
// por pixel em tempo de jogo — o que é estático (chão, vinheta) é assado uma
// vez, fora do loop (Regra 5).
// ============================================================================
import { VIEW_W, VIEW_H, PIXEL_SCALE } from "./config.js";

/** Largura/altura do buffer de jogo, em pixels nativos de arte. */
export const BUFFER_W = 320;
export const BUFFER_H = 180;
/** Ampliação inteira do buffer para o canvas (320x180 -> 960x540).
 *  O número mora em config.js (PIXEL_SCALE) porque os tamanhos nativos de
 *  assado das formigas são derivados dele e config.js não importa ninguém. */
export const SCALE = PIXEL_SCALE;
/** Sangria do buffer (Saint11): cobre o deslocamento fracionário da câmera. */
export const BLEED = 2;
/** Tile de terreno, em pixels do buffer (8x8, como no Celeste). */
export const TILE = 8;
/** Unidades de mundo por pixel do buffer no zoom 1 (nativo = mundo / 3). */
export const WORLD_PER_PX = 3;
/** Um tile de terreno em unidades de mundo: 8 px x 3 = 24. */
export const TILE_WORLD = TILE * WORLD_PER_PX;
/** Níveis de zoom permitidos — fracionário é proibido (Regra 6). */
export const ZOOM_LEVELS = [1, 2, 3];
export const ZOOM_DEFAULT = 1;
/** Ampliação da janela "OLHO LÁ FORA" (PiP do ninho), também inteira. */
export const PIP_SCALE = 2;

// ------------------------------------------------------------------ paleta --
// A fonte NORMATIVA é docs/arte/paleta-celeste.json, copiada para
// game/assets/paleta-celeste.json por tools/sync_paleta.mjs e LIDA EM TEMPO DE
// EXECUÇÃO por loadPaletteUrl() (chamada no boot, antes de assar o chão).
//
// O literal abaixo é só a REDE DE SEGURANÇA offline: se o fetch falhar (PWA
// recém-instalada, pacote nativo com cache furado, teste headless sem rede), o
// jogo assa o chão com estas cores em vez de travar. Ele é conferido contra o
// JSON por game/test/pixel-frame.mjs, do mesmo jeito que test/assets.mjs
// confere ANT_SIZES contra config.js — então não pode divergir em silêncio.
const PALETA_FALLBACK = {
  planicie: {
    fundo: ["#141a10", "#1d2616", "#28351d"],
    infill: "#1b2517",
    terreno: ["#22301c", "#2c3d24", "#3a5030", "#4c6640"],
    borda: "#6b8a52",
    musgo: ["#2f4a2e", "#42663a", "#5a8547"],
    trilha: "#141c10",
    acento: ["#ffd479", "#ff9a5c", "#c98d3a"],
    vegetacao: ["#5c9c4c", "#4e8a45", "#3f7a3c"],
  },
  floresta: {
    fundo: ["#0c1410", "#132019", "#1a2b20"],
    infill: "#101a13",
    terreno: ["#16261b", "#1c3022", "#243c2b", "#2f4c36"],
    borda: "#4f7a58",
    musgo: ["#27452f", "#31573a", "#3f6e46"],
    trilha: "#0d1710",
    acento: ["#bfffa8", "#37e6c8", "#7fd6ff"],
    vegetacao: ["#356b45", "#2a5637", "#41824f"],
  },
  pantano: {
    fundo: ["#0a1211", "#111c1a", "#182623"],
    infill: "#101d1a",
    terreno: ["#16261f", "#1c2f27", "#233a30", "#2c4739"],
    borda: "#466e58",
    musgo: ["#26463a", "#2f5546", "#3b6a54"],
    trilha: "#0c1714",
    acento: ["#7fd6ff", "#a8e0c0", "#8fa35a"],
    vegetacao: ["#2f6b4e", "#3f7a5e", "#4e9a6a"],
  },
  deserto: {
    fundo: ["#1a130b", "#241a10", "#2f2214"],
    infill: "#241a10",
    terreno: ["#332617", "#41321f", "#51402a", "#634e33"],
    borda: "#8a6a3f",
    musgo: ["#5c4a2c", "#6b532f", "#7a6236"],
    trilha: "#1c140b",
    acento: ["#ffd479", "#ff9a5c", "#e0a34a"],
    vegetacao: ["#96753e", "#a8874a", "#7a6236"],
  },
  outono: {
    fundo: ["#150e08", "#1e150d", "#281c12"],
    infill: "#1e140c",
    terreno: ["#2a2016", "#382a1e", "#463526", "#57422f"],
    borda: "#8a5a33",
    musgo: ["#4e3d24", "#5c4626", "#6b5028"],
    trilha: "#170f08",
    acento: ["#ff9a5c", "#ffd479", "#c0703a"],
    vegetacao: ["#b06a2e", "#c07a33", "#8a5628"],
  },
  gelo: {
    fundo: ["#10141c", "#171d27", "#1e2632"],
    infill: "#1a202c",
    terreno: ["#242c3a", "#2c3646", "#364254", "#435064"],
    borda: "#7c8ca8",
    musgo: ["#3a4458", "#4a5470", "#5c6680"],
    trilha: "#151b26",
    acento: ["#e8f4ff", "#7fd6ff", "#a8b4cc"],
    vegetacao: ["#6a7896", "#8a99b8", "#a8b4cc"],
  },
  palida: {
    fundo: ["#14121a", "#1b1822", "#242130"],
    infill: "#1c1a24",
    terreno: ["#262430", "#2f2c3a", "#3a3644", "#474150"],
    borda: "#8f8798",
    musgo: ["#3f3a48", "#4c4656", "#5c5566"],
    trilha: "#131118",
    acento: ["#f2ead9", "#d8cfbc", "#8f8798"],
    vegetacao: ["#4a4452", "#5c5566", "#6e6678"],
  },
};

/**
 * Paleta em uso. Começa na rede de segurança e é trocada pelo JSON normativo
 * assim que o boot consegue lê-lo. É `let` de propósito: os módulos que
 * importam PALETA_CELESTE recebem a ligação viva e veem a troca.
 */
export let PALETA_CELESTE = PALETA_FALLBACK;

/**
 * De onde veio a paleta em uso: "json" (a normativa, lida do pacote) ou
 * "seguranca" (o literal deste arquivo, quando o fetch falhou). Existe para o
 * teste de navegador poder provar que a leitura acontece de verdade — paleta
 * certa vinda do lugar errado é exatamente o tipo de bug que ninguém vê.
 */
export let paletaFonte = "seguranca";

/** Forma de um bioma na paleta: 16 cores de cena + 3 de fundo. */
const BIOMA_KEYS = ["fundo", "infill", "terreno", "borda", "musgo", "trilha", "acento", "vegetacao"];
const HEX = /^#[0-9a-f]{6}$/;

/**
 * Troca a paleta em uso por um objeto já parseado. Valida antes de aceitar:
 * JSON adulterado ou truncado NÃO derruba o boot, simplesmente é recusado e a
 * paleta anterior continua valendo.
 * @returns true se aceitou.
 */
export function loadPalette(json) {
  if (!json || typeof json !== "object") return false;
  const biomas = json.biomas;
  if (!biomas || typeof biomas !== "object") return false;
  if (!biomas.planicie) return false;                 // sem a Planície não há fallback
  for (const [id, b] of Object.entries(biomas)) {
    if (!b || typeof b !== "object") return false;
    for (const k of BIOMA_KEYS) if (!(k in b)) return false;
    const cores = [b.infill, b.borda, b.trilha, ...b.fundo, ...b.terreno,
      ...b.musgo, ...b.acento, ...b.vegetacao];
    if (cores.length !== 19) return false;            // 16 de cena + 3 de fundo
    if (!cores.every((c) => typeof c === "string" && HEX.test(c))) return false;
  }
  PALETA_CELESTE = biomas;
  paletaFonte = "json";
  return true;
}

/**
 * Lê a paleta normativa do pacote do jogo. Nunca lança e nunca derruba o boot:
 * falhou (sem fetch, 404, JSON inválido, timeout), o jogo segue com a paleta de
 * segurança e o teste de assets acusa a divergência.
 * @param {string} url caminho do JSON dentro do pacote
 * @param {number} timeoutMs prazo — o boot não pode ficar pendurado
 */
export async function loadPaletteUrl(url = "assets/paleta-celeste.json", timeoutMs = 8000) {
  if (typeof fetch !== "function") return false;
  try {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : 0;
    const res = await fetch(url, { cache: "force-cache", signal: ctrl ? ctrl.signal : undefined });
    if (timer) clearTimeout(timer);
    if (!res || !res.ok) return false;
    return loadPalette(await res.json());
  } catch (e) {
    return false;      // sem rede / abortado / JSON inválido: usa a segurança
  }
}

/** Paleta de um bioma; cai na Planície se o id não existir. */
export function paletteFor(biomeId) {
  return PALETA_CELESTE[biomeId] || PALETA_CELESTE.planicie;
}

/** Todas as cores de cena de um bioma (16) + as 3 de fundo. */
export function paletteColors(biomeId) {
  const b = paletteFor(biomeId);
  return [
    ...b.fundo, b.infill, ...b.terreno, b.borda,
    ...b.musgo, b.trilha, ...b.acento, ...b.vegetacao,
  ];
}

// ------------------------------------------------------------------ buffer --
const CW = BUFFER_W + BLEED * 2;      // 324
const CH = BUFFER_H + BLEED * 2;      // 184

let buf = null;
let bctx = null;
let emMundo = false;
let tx = 0, ty = 0;                   // translação aplicada no buffer (px)

/** Verdadeiro só entre beginWorld e endWorld (o mundo está indo ao buffer). */
export function pixelWorldPass() { return emMundo; }

/**
 * Abre a passada de mundo. A transformação do buffer é montada a partir da
 * affine de tela do chamador — `sx = wx * zoom + ax` — para que todo o código
 * que desenha em coordenadas de tela (960x540) continue valendo sem mudança.
 *
 * @returns contexto do buffer, ou null quando não há canvas (teste headless).
 */
export function beginWorld(zoom, ax, ay) {
  if (!buf) {
    if (typeof document === "undefined" || !document.createElement) return null;
    buf = document.createElement("canvas");
    buf.width = CW; buf.height = CH;
    bctx = buf.getContext("2d");
    if (!bctx) return null;
  }
  emMundo = true;
  // Translação em pixels do buffer: inteira (k) + resto fracionário (r).
  const kx = Math.round(ax / SCALE), ky = Math.round(ay / SCALE);
  tx = BLEED + kx - ax / SCALE;
  ty = BLEED + ky - ay / SCALE;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalAlpha = 1;
  bctx.globalCompositeOperation = "source-over";
  bctx.imageSmoothingEnabled = false;
  bctx.clearRect(0, 0, CW, CH);
  bctx.setTransform(1 / SCALE, 0, 0, 1 / SCALE, tx, ty);
  return bctx;
}

/**
 * Fecha a passada: recorta `sw`x`sh` pixels do buffer (centralizados na
 * coordenada de tela dada) e desenha no canvas com ampliação inteira `up`.
 */
export function endWorld(ctx, dx, dy, up, sw, sh, cxScreen, cyScreen) {
  emMundo = false;
  if (!buf || !ctx) return;
  const wantX = cxScreen / SCALE + tx - sw / 2;
  const wantY = cyScreen / SCALE + ty - sh / 2;
  const sx = Math.round(wantX), sy = Math.round(wantY);
  // o que sobrou do arredondamento volta como deslocamento inteiro de tela
  const subX = Math.round(-(wantX - sx) * up);
  const subY = Math.round(-(wantY - sy) * up);
  // -up: o pixel de sangria entra à esquerda/acima do quadro pedido
  turnoX = subX - up;
  turnoY = subY - up;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, sx - 1, sy - 1, sw + 2, sh + 2,
    dx + subX - up, dy + subY - up, (sw + 2) * up, (sh + 2) * up);
  ctx.imageSmoothingEnabled = prev;
}

/**
 * Deslocamento EXTRA que a composição aplicou por cima da posição pedida.
 *
 * A sangria devolve o resto fracionário da câmera como um deslocamento inteiro
 * de tela, então o mundo composto não cai exatamente onde a matemática de tela
 * (960x540) diz: ele anda de -1 a +1 px em volta de uma base constante. Quem
 * desenha POR CIMA do buffer em resolução cheia (o HUD, o overlay de feromônio)
 * precisa desse número para não ficar 3 px fora do mundo.
 */
let turnoX = 0, turnoY = 0;
export function frameShift() { return { x: turnoX, y: turnoY }; }

/** Passada do mundo da expedição: câmera do RUN, tela cheia. */
export function beginRunView(camX, camY, zoom, offX = 0, offY = 0) {
  return beginWorld(zoom, VIEW_W / 2 - camX * zoom + offX, VIEW_H / 2 - camY * zoom + offY);
}

/** Composição do mundo da expedição no canvas inteiro. */
export function endRunView(ctx) {
  endWorld(ctx, 0, 0, SCALE, BUFFER_W, BUFFER_H, VIEW_W / 2, VIEW_H / 2);
}

// ------------------------------------------------------------------ zoom ----
/** Nível de zoom permitido mais próximo de um valor contínuo. */
export function nearestZoom(z) {
  let best = ZOOM_LEVELS[0];
  for (const n of ZOOM_LEVELS) {
    if (Math.abs(n - z) < Math.abs(best - z)) best = n;
  }
  return best;
}

/**
 * Anda um degrau na escada de zoom. O sinal é o mesmo de sempre no jogo:
 * `dir < 0` APROXIMA (roda para cima), `dir > 0` AFASTA (roda para baixo) —
 * o antigo `zoom * (dir > 0 ? 0.867 : 1.153)` fazia exatamente isso.
 */
export function stepZoom(z, dir) {
  const i = ZOOM_LEVELS.indexOf(nearestZoom(z));
  const j = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, i + (dir > 0 ? -1 : 1)));
  return ZOOM_LEVELS[j];
}

// -------------------------------------------------------------- vinheta -----
// A vinheta antiga era um gradiente radial borrado — proibido dentro do
// buffer (Regra 6). Aqui ela vira uma MÁSCARA DE 1 PX COM DITHER: matriz de
// Bayer 4x4 escolhendo, pixel a pixel, entre cinco degraus de escurecimento.
// É assada uma vez e reaproveitada; nenhum pixel é calculado por quadro.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const VIGNETTE_ALPHA = [0, 46, 92, 138, 184];

let vignetteMask = null;
export function bakeVignetteMask() {
  if (vignetteMask) return vignetteMask;
  const cv = document.createElement("canvas");
  cv.width = BUFFER_W; cv.height = BUFFER_H;
  const c = cv.getContext("2d");
  const img = c.getImageData(0, 0, BUFFER_W, BUFFER_H);
  const d = img.data;
  const cx = BUFFER_W / 2, cy = BUFFER_H / 2;
  const r0 = Math.min(BUFFER_W, BUFFER_H) * 0.36;
  const r1 = Math.hypot(BUFFER_W, BUFFER_H) / 2;
  for (let y = 0; y < BUFFER_H; y++) {
    for (let x = 0; x < BUFFER_W; x++) {
      const o = (y * BUFFER_W + x) * 4;
      if (o + 3 >= d.length) break;
      let v = (Math.hypot(x - cx, y - cy) - r0) / (r1 - r0);
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      v = v * v;                                    // escuro cresce para a borda
      const t = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const level = Math.max(0, Math.min(4, Math.floor(v * 4 + t)));
      if (level <= 0) continue;                     // pixel limpo: nada de tinta
      d[o] = 8; d[o + 1] = 6; d[o + 2] = 20;
      d[o + 3] = VIGNETTE_ALPHA[level];
    }
  }
  c.putImageData(img, 0, 0);
  vignetteMask = cv;
  return vignetteMask;
}

// ------------------------------------------------------- quantização --------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Batedeira final de qualquer arte assada: prende a imagem na paleta do bioma
 * e remove meio-tom (alfa só 0 ou 255). Roda uma vez por mapa, no assado do
 * chão — nunca por quadro.
 */
export function quantizeToPalette(ctx, w, h, colors) {
  let img;
  try { img = ctx.getImageData(0, 0, w, h); } catch (e) { return; }
  const d = img && img.data;
  if (!d || d.length < 4) return;
  const rgb = colors.map(hexToRgb);
  const cache = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] <= 127) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let k = cache.get(key);
    if (k === undefined) {
      let bd = Infinity;
      for (let j = 0; j < rgb.length; j++) {
        const dr = d[i] - rgb[j][0], dg = d[i + 1] - rgb[j][1], db = d[i + 2] - rgb[j][2];
        const dist = dr * dr * 3 + dg * dg * 6 + db * db;   // peso verde (lumínância)
        if (dist < bd) { bd = dist; k = j; }
      }
      cache.set(key, k);
    }
    d[i] = rgb[k][0]; d[i + 1] = rgb[k][1]; d[i + 2] = rgb[k][2];
  }
  try { ctx.putImageData(img, 0, 0); } catch (e) { /* stub de teste */ }
}
