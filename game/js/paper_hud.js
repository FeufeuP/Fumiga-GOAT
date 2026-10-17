// Original opaque paper images, with individually audited protected ornaments.
import { IMG } from './assets.js';
import { registerPaperSurface } from './font.js';

// Protected islands (corners + centre knots) and stretchable corridors, audited
// separately on each painting. Kept for tools/tests that reference the cuts.
//
// RENDERIZAÇÃO SEM DISTORÇÃO (2026-10-16, decisão do usuário): cada HUD é
// desenhado nas proporções ORIGINAIS do sprite — escala uniforme, encaixado e
// centralizado dentro do retângulo pedido. Molduras nunca esticam e ornamentos
// nunca encolhem: o sprite aparece exatamente como foi pintado. O que sobra do
// retângulo pedido vira margem transparente; os chamadores devem passar
// retângulos na proporção da pintura (ou usar paperFit/paperQuiet).
export const PAPER_SLICES = Object.freeze({
  panel:   { x: [.38,.45,.57,.65], y: [.32,.39,.57,.69] },
  health:  { x: [.18,.38,.58,.79], y: [.35,.42,.58,.65] },
  banner:  { x: [.39,.47,.60,.79], y: [.32,.42,.56,.65] },
  minimap: { x: [.27,.40,.54,.62], y: [.38,.44,.57,.66] },
  card:    { x: [.35,.44,.55,.68], y: [.25,.34,.63,.74] },
  pause:   { x: [.32,.43,.55,.68], y: [.31,.38,.59,.70] },
  tooltip: { x: [.35,.44,.57,.70], y: [.36,.44,.59,.69] },
});
// Área PERMITIDA pelo sprite (medida pixel a pixel em cada pintura): o maior
// retângulo de papel liso, livre de moldura e ornamentos, em frações da fonte.
// Todo texto de um HUD fica CENTRALIZADO dentro desta área (Regra do usuário,
// 2026-10-16) — ver `paperQuiet()` para o retângulo em coordenadas de destino.
export const PAPER_QUIET = Object.freeze({
  panel:       Object.freeze([.215, .200, .865, .800]),
  expanded:    Object.freeze([.200, .200, .855, .800]),
  tutorial:    Object.freeze([.195, .200, .860, .800]),
  nest_tip:    Object.freeze([.205, .200, .855, .800]),
  health:      Object.freeze([.145, .320, .865, .680]),
  banner:      Object.freeze([.310, .295, .840, .765]),
  boss:        Object.freeze([.200, .260, .835, .760]),
  event:       Object.freeze([.200, .250, .835, .765]),
  header:      Object.freeze([.140, .220, .865, .780]),
  minimap:     Object.freeze([.180, .240, .800, .770]),
  transition:  Object.freeze([.185, .185, .835, .815]),
  card:        Object.freeze([.305, .165, .855, .820]),
  tree_detail: Object.freeze([.185, .160, .845, .835]),
  pause:       Object.freeze([.250, .219, .776, .757]),
  tooltip:     Object.freeze([.215, .240, .830, .765]),
});
// Dimensões canônicas de cada família (usadas quando IMG ainda não carregou ou
// em testes headless com MockImage 64x64).
export const PAPER_NATIVE_SIZE = Object.freeze({
  panel:       Object.freeze([960, 512]),
  expanded:    Object.freeze([960, 512]),
  tutorial:    Object.freeze([960, 512]),
  nest_tip:    Object.freeze([960, 512]),
  health:      Object.freeze([960, 135]),
  banner:      Object.freeze([960, 192]),
  boss:        Object.freeze([960, 192]),
  event:       Object.freeze([960, 192]),
  header:      Object.freeze([960, 120]),
  minimap:     Object.freeze([960, 717]),
  transition:  Object.freeze([960, 662]),
  card:        Object.freeze([848, 1264]),
  tree_detail: Object.freeze([680, 924]),
  pause:       Object.freeze([928, 1152]),
  tooltip:     Object.freeze([960, 475]),
});
// Janela interna vazada (aperture) medida nas molduras *_frame.png (2026-10-16):
// região onde o fundo de papel (*_bg.png) e conteúdos clipados (minimapa, barras, textos)
// ficam visíveis por baixo da moldura vazada (*_frame.png).
export const PAPER_APERTURE = Object.freeze({
  panel:       Object.freeze([.030, .148, .925, .848]),
  expanded:    Object.freeze([.035, .148, .920, .848]),
  tutorial:    Object.freeze([.035, .148, .920, .848]),
  nest_tip:    Object.freeze([.035, .148, .920, .848]),
  health:      Object.freeze([.117, .267, .899, .726]),
  banner:      Object.freeze([.029, .141, .860, .802]),
  boss:        Object.freeze([.040, .145, .900, .820]),
  event:       Object.freeze([.040, .145, .900, .820]),
  header:      Object.freeze([.035, .150, .930, .840]),
  minimap:     Object.freeze([.105, .130, .891, .880]),
  transition:  Object.freeze([.055, .130, .915, .865]),
  card:        Object.freeze([.043, .101, .879, .904]),
  tree_detail: Object.freeze([.055, .105, .895, .900]),
  pause:       Object.freeze([.174, .167, .829, .808]),
  tooltip:     Object.freeze([.033, .204, .912, .821]),
});
// Placas de madeira dos botões (2026-10-14): a variação segue o tamanho
// REAL desenhado em 960x540 — inventário completo em
// tools/prepare_wood_buttons.py. Estados são artes separadas (sem tingir).
// As duas pontas são desenhadas inteiras (proporção preservada); apenas a
// faixa calma do meio acompanha a largura — regra BORDA do slicebox.
export const WOOD_STATE = Object.freeze({normal:'normal',hover:'hover',pressed:'pressionado',selected:'selecionado',disabled:'desabilitado'});
export function woodButtonSize(w,h) {
  if (w <= 76 && w / Math.max(1,h) <= 1.9) return 'mini';   // 44x44, iconButton
  if (h <= 30) return 'pequeno';                            // LIGAR, +/-, M1-M6
  if (w >= 250 || w / Math.max(1,h) >= 5.8) return 'largo'; // AVANÇAR, VOLTAR
  if (w < 175) return 'pequeno';                            // abas, VOLTAR curto
  return 'grande';                                          // 180-240: pausa, fim
}
export const PAPER_FALLBACK = Object.freeze({
  expanded:    'panel',
  tutorial:    'panel',
  nest_tip:    'panel',
  boss:        'banner',
  event:       'banner',
  header:      'banner',
  transition:  'minimap',
  tree_detail: 'card',
});
export function paperSource(kind,w,h) {
  if(kind==='tooltip'||kind==='pause'||PAPER_FALLBACK[kind]) return kind; // explicit functional art
  if(kind==='panel'||kind==='card') {
    return h>w*1.12 ? 'card' : h>w*.68 ? 'pause' : 'panel';
  }
  return kind;
}
function resolvePaperImages(source) {
  const fb = PAPER_FALLBACK[source];
  const frameImg = IMG['paper_' + source + '_frame'] || IMG['paper_' + source]
    || (fb && (IMG['paper_' + fb + '_frame'] || IMG['paper_' + fb])) || null;
  const bgImg = IMG['paper_' + source + '_bg']
    || (fb && IMG['paper_' + fb + '_bg']) || null;
  return { frameImg, bgImg };
}
const cache = new Map();
const MAX_PIXELS = 8 * 1024 * 1024;
let pixels = 0;
export function paperReady() { return !!IMG.paper_panel; }
export function paperState(opt = {}) {
  return opt.disabled ? 'disabled' : opt.pressed ? 'pressed' : opt.selected ? 'selected' : opt.hot ? 'hover' : 'normal';
}
/**
 * Encaixe SEM distorção (contain + centralizado): a fonte sw×sh entra
 * uniformemente dentro de w×h. {fw,fh} é o tamanho desenhado (proporção da
 * fonte intacta), {ox,oy} o deslocamento para o centro do retângulo pedido.
 */
export function paperFit(sw, sh, w, h) {
  const s = Math.min(w / sw, h / sh);
  const fw = Math.max(1, Math.round(sw * s)), fh = Math.max(1, Math.round(sh * s));
  return { fw, fh, ox: Math.round((w - fw) / 2), oy: Math.round((h - fh) / 2), scale: s };
}
/**
 * Área permitida pelo sprite em coordenadas de destino: o retângulo de papel
 * liso de `kind`, mapeado sobre o desenho realmente ocupado (paperFit).
 * O texto do HUD fica CENTRALIZADO dentro deste retângulo.
 */
export function paperQuiet(kind, x, y, w, h, sw, sh) {
  const src = paperSource(kind, w, h);
  const q = PAPER_QUIET[src] || PAPER_QUIET.panel;
  const nat = PAPER_NATIVE_SIZE[src] || PAPER_NATIVE_SIZE.panel;
  const img = (typeof document !== 'undefined') ? (IMG['paper_' + src + '_frame'] || IMG['paper_' + src]) : null;
  const iw = sw || (img && img.width > 64 ? img.width : nat[0]);
  const ih = sh || (img && img.height > 64 ? img.height : nat[1]);
  const { fw, fh, ox, oy } = paperFit(iw, ih, w, h);
  return {
    x: x + ox + q[0] * fw, y: y + oy + q[1] * fh,
    w: (q[2] - q[0]) * fw, h: (q[3] - q[1]) * fh,
    fit: { fw, fh, ox, oy }, source: src,
  };
}
/**
 * Janela central vazada da moldura (`*_frame.png`) em coordenadas de destino.
 * Permite desenhar o fundo (`drawPaperBg`), aplicar clip à janela interna
 * (ex.: minimapa, preenchimento de barra) e sobrepor a moldura (`drawPaperFrame`).
 */
export function paperAperture(kind, x, y, w, h, sw, sh) {
  const src = paperSource(kind, w, h);
  const a = PAPER_APERTURE[src] || PAPER_APERTURE.panel;
  const nat = PAPER_NATIVE_SIZE[src] || PAPER_NATIVE_SIZE.panel;
  const img = (typeof document !== 'undefined') ? (IMG['paper_' + src + '_frame'] || IMG['paper_' + src]) : null;
  const iw = sw || (img && img.width > 64 ? img.width : nat[0]);
  const ih = sh || (img && img.height > 64 ? img.height : nat[1]);
  const { fw, fh, ox, oy } = paperFit(iw, ih, w, h);
  return {
    x: x + ox + a[0] * fw, y: y + oy + a[1] * fh,
    w: (a[2] - a[0]) * fw, h: (a[3] - a[1]) * fh,
    fit: { fw, fh, ox, oy }, source: src,
  };
}
// Geometria de fatiamento sobre o retângulo ENCAIXADO (proporção da fonte):
// com alvo na proporção da fonte as células são escala uniforme pura — nada
// estica nem encolhe. Mantida para testes/ferramentas que leem os cortes.
export function paperGeometry(kind, sw, sh, w, h) {
  const m=PAPER_SLICES[kind]||PAPER_SLICES.panel;
  const {fw,fh,ox,oy,scale}=paperFit(sw,sh,w,h);
  const cut=(cuts,source,target)=> {
    const src=[0,...cuts.map(v=>Math.round(v*source)),source];
    const dst=src.map(v=>Math.round(v*scale));
    dst[dst.length-1]=target;
    return [src,dst];
  };
  const [sx,dx]=cut(m.x,sw,fw),[sy,dy]=cut(m.y,sh,fh);
  return {sx,sy,dx,dy,scale,fw,fh,ox,oy};
}
function tileFor(img, kind, w, h, state, bgImg = null, layer = 'both') {
  const key = `${kind}:${layer}:${w}:${h}:${state}`;
  const old = cache.get(key);
  if (old && old.image === img && old.bgImage === bgImg) return old.canvas;
  if (old) { pixels -= old.canvas.width*old.canvas.height; cache.delete(key); }
  const tile = document.createElement('canvas'); tile.width=w; tile.height=h;
  const c=tile.getContext('2d');
  // The paintings no longer carry a cream matte: the sheet around the drawing
  // is transparent, so the tile starts empty and only the art is composited.
  // Each HUD is composed of 2 pieces (2026-10-16):
  //   1) bgImg (*_bg.png): hand-cut cream paper backing inside the frame
  //   2) img (*_frame.png): hollow wood & vine frame rendered on top
  c.imageSmoothingEnabled=true;
  if(kind.startsWith('wood_')) {
    // Três faixas HORIZONTAIS: as duas pontas são desenhadas inteiras, na
    // proporção preservada. Só a faixa calma do meio acompanha a largura.
    const capFraction = kind.startsWith('wood_mini_') ? .30 : .18;
    const cap = Math.round(img.width * capFraction);
    const destCap = Math.min(Math.floor(w * .30), Math.round(cap * h / img.height));
    const sx = [0, cap, img.width - cap, img.width];
    const dx = [0, destCap, w - destCap, w];
    for (let col=0;col<3;col++) {
      const dw=dx[col+1]-dx[col];
      if(dw>0)c.drawImage(img,sx[col],0,sx[col+1]-sx[col],img.height,dx[col],0,dw,h);
    }
    // estado já é arte própria: nunca tingir por cima (guarda abaixo)
  } else {
    // Pintura inteira, escala uniforme (contain + centralizado): o sprite sai
    // nas proporções originais — moldura e ornamentos nunca são deformados.
    const fit=paperFit(img.width,img.height,w,h);
    if (layer !== 'frame' && bgImg) {
      c.drawImage(bgImg,0,0,bgImg.width,bgImg.height,fit.ox,fit.oy,fit.fw,fit.fh);
    }
    if (layer !== 'bg') {
      c.drawImage(img,0,0,img.width,img.height,fit.ox,fit.oy,fit.fw,fit.fh);
    }
  }
  // State treatment changes depth and adds a readable selection mark, never
  // reduces background opacity or puts a generic stroke around the rectangle.
  // It is clipped to the painted pixels ('source-atop') so no state repaints a
  // rectangle over the transparent sheet that was just removed.
  if(state !== 'normal' && !kind.startsWith('wood_')) {
    const fit=paperFit(img.width,img.height,w,h);
    c.globalCompositeOperation='source-atop';
    const inset = Math.max(2, Math.min(6,fit.fh*.12));
    const x0=fit.ox+inset,y0=fit.oy+inset,ww=fit.fw-inset*2,hh=fit.fh-inset*2;
    const g=c.createLinearGradient(0,y0,0,y0+hh);
    if(state==='pressed') {
      g.addColorStop(0,'rgba(73,53,33,.62)'); g.addColorStop(.5,'rgba(73,53,33,.25)'); g.addColorStop(1,'rgba(73,53,33,.16)');
    } else if(state==='disabled') {
      g.addColorStop(0,'rgba(236,225,200,.72)'); g.addColorStop(1,'rgba(164,149,121,.55)');
    } else if(state==='selected') {
      g.addColorStop(0,'rgba(149,173,96,.46)'); g.addColorStop(1,'rgba(105,132,61,.34)');
    } else {
      g.addColorStop(0,'rgba(255,249,225,.65)'); g.addColorStop(.55,'rgba(255,249,225,0)'); g.addColorStop(1,'rgba(83,62,34,.24)');
    }
    c.fillStyle=g; c.fillRect(x0,y0,ww,hh);
    if(state==='selected') {
      c.globalCompositeOperation='source-over'; // the mark must stay readable
      const s=Math.max(4,Math.min(9,fit.fh*.19)), x=fit.ox+fit.fw-inset-s*2.5,y=fit.oy+fit.fh*.5;
      c.strokeStyle='#456032';c.lineWidth=Math.max(2,s*.3);c.lineCap='round';
      c.beginPath();c.moveTo(x,y);c.lineTo(x+s*.55,y+s*.5);c.lineTo(x+s*1.5,y-s*.6);c.stroke();
    }
    c.globalCompositeOperation='source-over';
  }
  while(cache.size && (cache.size>=160 || pixels+w*h>MAX_PIXELS)) {
    const first=cache.keys().next().value, entry=cache.get(first);
    pixels-=entry.canvas.width*entry.canvas.height;cache.delete(first);
  }
  if(w*h<=MAX_PIXELS) { cache.set(key,{canvas:tile,image:img,bgImage:bgImg});pixels+=w*h; }
  return tile;
}
export function drawPaper(ctx, kind, x, y, w, h, opt = {}) {
  // Botões: placa de madeira por tamanho/estado. O sprite antigo de papel
  // foi excluído do projeto (2026-10-14) — sem reserva: se a placa não
  // carregar, retorna false e o chamador desenha o botão vetorial (ui.js).
  if (kind === 'button' || kind === 'wood_icon') {
    w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
    const size = kind === 'wood_icon' ? 'mini' : woodButtonSize(w,h);
    const state = WOOD_STATE[paperState(opt)] || 'normal';
    const wimg = IMG[`wood_button_${size}_${state}`] || IMG[`wood_button_${size}_normal`];
    if (wimg && typeof document !== 'undefined') {
      const tile=tileFor(wimg,`wood_${size}_${state}`,w,h,paperState(opt));
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      ctx.drawImage(tile,Math.round(x),Math.round(y));ctx.restore();
      registerPaperSurface(ctx,x,y,w,h);
      return true;
    }
    return false;
  }
  // Sistema de 2 peças (2026-10-16): 1º Fundo (*_bg) -> 2º Texto/Conteúdo -> 3º Moldura (*_frame).
  const source = paperSource(kind,w,h);
  const { frameImg, bgImg } = resolvePaperImages(source);
  if(!frameImg || typeof document==='undefined') return false;
  const layer = opt.layer || (bgImg ? 'both' : 'single');
  w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  const nat = PAPER_NATIVE_SIZE[source] || PAPER_NATIVE_SIZE.panel;
  const iw = frameImg.width > 64 ? frameImg.width : nat[0];
  const ih = frameImg.height > 64 ? frameImg.height : nat[1];
  const tile=tileFor(frameImg,source,w,h,paperState(opt),bgImg,layer);
  const fit=paperFit(iw,ih,w,h);
  ctx.save();ctx.globalCompositeOperation='source-over';
  ctx.drawImage(tile,Math.round(x),Math.round(y));ctx.restore();
  if (layer !== 'frame') {
    // Superfície de papel = o desenho REAL (não as margens transparentes).
    registerPaperSurface(ctx,x+fit.ox,y+fit.oy,fit.fw,fit.fh);
  }
  return true;
}
/** Desenha somente a Camada 1 (Fundo de papel `*_bg.png`) do HUD. */
export function drawPaperBg(ctx, kind, x, y, w, h, opt = {}) {
  return drawPaper(ctx, kind, x, y, w, h, { ...opt, layer: 'bg' });
}
/** Desenha somente a Camada 3 (Moldura vazada `*_frame.png`) por cima do conteúdo/texto. */
export function drawPaperFrame(ctx, kind, x, y, w, h, opt = {}) {
  return drawPaper(ctx, kind, x, y, w, h, { ...opt, layer: 'frame' });
}

// Pilha explícita e fila diferida para garantir a ordem estrita de camadas:
//   1º Fundo (*_bg.png) -> 2º Texto / Conteúdo (clipado no papel) -> 3º Moldura (*_frame.png)
const hudStack = [];
const pendingFrames = [];

/** Descarrega quaisquer molduras pendentes (`*_frame.png`) por cima dos textos recém-desenhados. */
export function flushPaperFrames(ctx) {
  while (pendingFrames.length) {
    const item = pendingFrames.shift();
    const targetCtx = ctx || item.ctx;
    if (!targetCtx) continue;
    targetCtx.save();
    if (typeof item.alpha === 'number') targetCtx.globalAlpha = item.alpha;
    drawPaperFrame(targetCtx, item.kind, item.x, item.y, item.w, item.h, item.opt);
    targetCtx.restore();
  }
}

/**
 * Abre um HUD em 2 peças desenhando o 1º Fundo (`*_bg.png`) imediatamente e
 * agendando a 3ª Moldura (`*_frame.png`) para ser desenhada DEPOIS dos textos.
 */
export function deferPaperFrame(ctx, kind, x, y, w, h, opt = {}) {
  flushPaperFrames(ctx);
  if (!drawPaperBg(ctx, kind, x, y, w, h, opt)) return false;
  pendingFrames.push({
    ctx, kind, x, y, w, h, opt,
    alpha: typeof ctx?.globalAlpha === 'number' ? ctx.globalAlpha : 1,
  });
  return true;
}

/**
 * Inicia um bloco de HUD em 3 camadas estritas:
 *   1º Desenha o Fundo (`*_bg.png`)
 *   2º Abre clip na janela interna (`paperAperture`) para o Texto/Conteúdo
 *   3º `endPaperHud(ctx)` fecha o clip e desenha a Moldura (`*_frame.png`) por cima de tudo
 */
export function beginPaperHud(ctx, kind, x, y, w, h, opt = {}) {
  flushPaperFrames(ctx);
  if (!drawPaperBg(ctx, kind, x, y, w, h, opt)) return false;
  const ap = paperAperture(kind, x, y, w, h);
  ctx.save();
  if (opt.clip !== false && typeof ctx.beginPath === 'function' && typeof ctx.clip === 'function') {
    ctx.beginPath();
    ctx.rect(Math.floor(ap.x), Math.floor(ap.y), Math.ceil(ap.w), Math.ceil(ap.h));
    ctx.clip();
  }
  hudStack.push({ ctx, kind, x, y, w, h, opt });
  return true;
}

/** Fecha o clip de Texto/Conteúdo (Camada 2) e desenha a Moldura (`*_frame.png`, Camada 3) por cima. */
export function endPaperHud(ctx) {
  const item = hudStack.pop();
  if (!item) return false;
  const targetCtx = ctx || item.ctx;
  targetCtx.restore();
  drawPaperFrame(targetCtx, item.kind, item.x, item.y, item.w, item.h, item.opt);
  return true;
}
export function drawPaperBar(ctx,x,y,w,h,frac,opt={}) {
  // Arquitetura em 2 peças: 1) fundo de papel -> 2) preenchimento -> 3) moldura vazada por cima
  const hasTwoPiece = !!(IMG.paper_health_frame && IMG.paper_health_bg);
  if (hasTwoPiece) {
    if (!drawPaperBg(ctx, 'health', x, y, w, h, opt)) return false;
  } else {
    if (!drawPaper(ctx, 'health', x, y, w, h, opt)) return false;
  }
  frac=Math.max(0,Math.min(1,Number.isFinite(frac)?frac:0));
  const q = hasTwoPiece ? paperAperture('health',x,y,w,h) : paperQuiet('health',x,y,w,h);
  const ix=q.x, iy=q.y, iw=q.w, ih=Math.max(2,q.h);
  ctx.save();ctx.globalAlpha=1;
  ctx.fillStyle='#d0b995';ctx.fillRect(ix,iy,iw,ih);
  const g=ctx.createLinearGradient(0,iy,0,iy+ih);
  g.addColorStop(0,opt.low?'#cd6952':'#dcaa56');g.addColorStop(1,opt.low?'#9e332b':'#a36223');
  ctx.fillStyle=g;ctx.fillRect(ix,iy,Math.round(iw*frac),ih);
  ctx.restore();
  if (hasTwoPiece) {
    drawPaperFrame(ctx, 'health', x, y, w, h, opt);
  }
  return true;
}
