// ============================================================================
// FUMIGA — FILTRO PS1 (OPÇÕES → VÍDEO)
//
// Pedido do usuário (2026-10-08): "gráficos low poly estilo Resident Evil, só
// aquele filtro quadriculado, SEM modelagem 3D". Não há 3D nenhum aqui — é um
// PÓS-PROCESSAMENTO 2D do quadro, exatamente o que o hardware do PlayStation 1
// fazia na saída de vídeo, e que dá o quadriculado de Resident Evil e Silent Hill:
//
//   • DITHER ORDENADO 4x4 (matriz Bayer) — o xadrez que disfarça o degrau de cor;
//   • 15 BITS por pixel (5 bits por canal = 32 níveis) — o modo de cor da maioria
//     dos jogos de PS1: o framebuffer era convertido de 24 para 15 bits na saída,
//     e é daí que vem o quadriculado visível nas sombras e nos gradientes;
//   • RESOLUÇÃO INTERNA reduzida (só no nível FIEL AO PS1) — pixels gordos, como
//     os 320x240 esticados pela TV de tubo.
//
// Como entra no jogo: NADA é redesenhado, reassado ou tingido — o canvas do jogo
// (#game) continua recebendo os MESMOS pixels de sempre (todos os testes de pixel
// seguem lendo os mesmos bytes). O filtro sai num canvas separado (#psx), por cima
// e sem receber cliques, igual à cobertura de scanlines. Filtro DESLIGADO = canvas
// escondido, custo zero.
//
// Dois caminhos de execução:
//   webgl — caminho normal: o canvas do jogo vira TEXTURA e o shader faz dither +
//           quantização na GPU, sem ler pixel de volta (~0,2 ms por quadro);
//   cpu   — reserva para aparelho sem WebGL: a mesma matemática por tabela de
//           consulta (LUT), em meia resolução, com rebaixamento automático se o
//           quadro ficar caro (Regra 5: 60 FPS sempre que possível).
// ============================================================================
import { G } from "./state.js";
import { VIEW_W, VIEW_H } from "./config.js";

/**
 * Níveis do menu — o ÍNDICE é o valor salvo em settings.psx (0 a 3).
 * `dither` é a amplitude do padrão (em unidades 0..1 de cor), `steps` são os
 * degraus de quantização (31 = 32 níveis = 15 bits por pixel), `desat` é a
 * dessaturação e `scale` é a resolução interna (0.5 = 480x270 esticado).
 */
export const PSX_OPTS = [
  { label: "DESLIGADO",   color: "#5a4f78", dither: 0,         steps: 255, desat: 0,    scale: 1 },
  { label: "LEVE",        color: "#7fd6a0", dither: 0.020,     steps: 255, desat: 0,    scale: 1 },
  { label: "MÉDIO",       color: "#6db7ff", dither: 1 / 31,    steps: 31,  desat: 0.10, scale: 1 },
  { label: "FIEL AO PS1", color: "#c77dff", dither: 1.15 / 31, steps: 31,  desat: 0.20, scale: 0.5 },
];
/** Nível padrão de fábrica (pedido do usuário: filtro LIGADO por padrão). */
export const PSX_DEFAULT = 2;

// Estado do módulo -----------------------------------------------------------
let el = null;               // canvas #psx (por cima do #game)
let gameEl = null;           // canvas #game (fonte do filtro)
let gl = null, tex = null, quad = null;
const uni = {};
let mode = "off";            // off | webgl | cpu
let level = -1;              // nível aplicado agora (0 = filtro desligado)
let cpuCtx = null, cpuW = 0, cpuH = 0;
const luts = [];             // tabelas por nível (modo cpu)
let escalaExtra = 1;         // rebaixamento por desempenho (1 → 0.5, uma vez)
let rebaixado = false;
let renderer = "";           // nome do renderizador WebGL (diagnóstico)
// O filtro é um passe por pixel: em GPU de verdade custa ~0,2 ms a 960x540, mas
// em rasterizador POR SOFTWARE (SwiftShader/llvmpipe: emuladores, máquinas sem
// GPU) o mesmo passe custa ~9 ms e derrubaria o jogo para ~39 FPS. Nesses casos
// — e em qualquer aparelho que fique abaixo de ~45 FPS com o filtro ligado — o
// buffer cai para meia resolução, que é o que o FIEL AO PS1 já usa. O jogo nunca
// é tocado: só o tamanho do buffer do filtro. (Regra 5.)
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen|angle \(software/i;
const LIMITE_QUADRO_MS = 22;   // ≈45 FPS de mediana
const JANELA_QUADROS = 90;

const VS = `
attribute vec2 aPos;
varying vec2 vUV;
void main() {
  vUV = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Dither Bayer 4x4 + quantização de cor. `gl_FragCoord` é o pixel do BUFFER de
// saída, então no nível FIEL (480x270) o xadrez nasce no tamanho do pixel gordo.
const FS = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform float uDither;
uniform float uSteps;
uniform float uDesat;

// Matriz Bayer 4x4 clássica (0..15), escrita por linhas. É o mesmo padrão
// ordenado que a GPU do PS1 somava antes de truncar para 15 bits.
float bayer4(vec2 p) {
  float x = mod(p.x, 4.0);
  float y = mod(p.y, 4.0);
  float v;
  if (y < 1.0)      v = (x < 1.0) ?  0.0 : (x < 2.0) ?  8.0 : (x < 3.0) ?  2.0 : 10.0;
  else if (y < 2.0) v = (x < 1.0) ? 12.0 : (x < 2.0) ?  4.0 : (x < 3.0) ? 14.0 :  6.0;
  else if (y < 3.0) v = (x < 1.0) ?  3.0 : (x < 2.0) ? 11.0 : (x < 3.0) ?  1.0 :  9.0;
  else              v = (x < 1.0) ? 15.0 : (x < 2.0) ?  7.0 : (x < 3.0) ? 13.0 :  5.0;
  return (v + 0.5) / 16.0;
}

void main() {
  // o canvas (origem no topo) vira textura com o eixo Y invertido
  vec3 c = texture2D(uTex, vec2(vUV.x, 1.0 - vUV.y)).rgb;
  if (uDesat > 0.0) c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.0 - uDesat);
  c += (bayer4(gl_FragCoord.xy) - 0.5) * uDither;
  c = floor(c * uSteps + 0.5) / uSteps;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function shader(g, kind, src) {
  const s = g.createShader(kind);
  g.shaderSource(s, src);
  g.compileShader(s);
  if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error("shader: " + g.getShaderInfoLog(s));
  return s;
}

/** Monta o caminho WebGL. Só devolve true com um contexto de VERDADE. */
function setupGL(cv) {
  const opts = {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power",
  };
  let g = null;
  try { g = cv.getContext("webgl", opts) || cv.getContext("experimental-webgl", opts); } catch (e) { g = null; }
  // O DOM simulado dos testes headless responde QUALQUER nome de método: exigir
  // uma string de verdade em getParameter(VERSION) é o que separa o contexto real
  // do mock (senão o filtro tentaria desenhar no vazio).
  let versao = null;
  try { versao = g && g.getParameter(g.VERSION); } catch (e) { versao = null; }
  if (!g || typeof versao !== "string") return false;

  const p = g.createProgram();
  g.attachShader(p, shader(g, g.VERTEX_SHADER, VS));
  g.attachShader(p, shader(g, g.FRAGMENT_SHADER, FS));
  g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error("programa: " + g.getProgramInfoLog(p));
  g.useProgram(p);
  for (const nome of ["uTex", "uDither", "uSteps", "uDesat"]) uni[nome] = g.getUniformLocation(p, nome);
  quad = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, quad);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), g.STATIC_DRAW);
  const aPos = g.getAttribLocation(p, "aPos");
  g.enableVertexAttribArray(aPos);
  g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);
  tex = g.createTexture();
  g.bindTexture(g.TEXTURE_2D, tex);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
  g.uniform1i(uni.uTex, 0);
  gl = g;
  renderer = nomeRenderer(g);
  return true;
}

/** Nome do renderizador (a extensão de debug pode estar bloqueada: cai no RENDERER). */
function nomeRenderer(g) {
  try {
    const dbg = g.getExtension("WEBGL_debug_renderer_info");
    if (dbg && dbg.UNMASKED_RENDERER_WEBGL) return String(g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
    return String(g.getParameter(g.RENDERER) || "");
  } catch (e) { return ""; }
}

/** Tabelas do modo cpu: um mapa entrada→saída por posição do xadrez Bayer. */
function buildLuts(opt, idx) {
  // os MESMOS 16 valores da matriz do shader, para as duas rotas darem o mesmo visual
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const tables = [];
  for (let o = 0; o < 16; o++) {
    const passo = (bayer[o] + 0.5) / 16 - 0.5;   // -0.5 .. +0.5
    const t = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      const c = v / 255 + passo * opt.dither;
      const q = Math.round(Math.min(1, Math.max(0, c)) * opt.steps) / opt.steps;
      t[v] = Math.round(Math.min(1, Math.max(0, q)) * 255);
    }
    tables.push(t);
  }
  luts[idx] = tables;
}

/** Tamanho do buffer do nível (com o rebaixamento automático do modo cpu). */
function bufferFor(opt) {
  // O rebaixamento por desempenho NÃO se acumula com a meia resolução do FIEL
  // AO PS1: o buffer nunca desce abaixo de 480x270 (240x135 ficaria ilegível).
  const s = Math.max(0.5, opt.scale * escalaExtra);
  return { w: Math.max(64, Math.round(VIEW_W * s)), h: Math.max(36, Math.round(VIEW_H * s)) };
}

/** Nível pedido pelo save, com guarda para valores inválidos. */
export function levelAtual() {
  const v = G.save && G.save.settings ? G.save.settings.psx : undefined;
  return Number.isInteger(v) && v >= 0 && v < PSX_OPTS.length ? v : PSX_DEFAULT;
}

/**
 * Descobre o canvas e prepara o filtro. Chamado uma vez no boot, DEPOIS do
 * loadSave (o nível vem do save). Nunca lança: sem DOM/canvas o filtro fica
 * desligado e o jogo roda igual.
 */
export function initPsxFilter(canvasDoJogo) {
  try {
    if (mode !== "off" || typeof document === "undefined") return;
    gameEl = canvasDoJogo || document.getElementById("game");
    el = document.getElementById("psx");
    if (!el || !gameEl) { el = null; return; }
    let ok = false;
    try { ok = setupGL(el); } catch (e) { ok = false; }
    if (ok) {
      mode = "webgl";
      if (SOFTWARE.test(renderer)) {
        escalaExtra = 0.5;
        rebaixado = true;
        if (typeof console !== "undefined") console.debug("FUMIGA: filtro PS1 — renderizador por software (" + renderer + "), buffer em meia resolução");
      }
    } else {
      // Sem WebGL: rota por pixel. Se o canvas já tiver contexto webgl, o 2d
      // devolve null e o filtro fica desligado (o jogo continua igual).
      cpuCtx = null;
      try { cpuCtx = el.getContext("2d"); } catch (e) { cpuCtx = null; }
      if (!cpuCtx) { el = null; return; }
      mode = "cpu";
      for (let i = 1; i < PSX_OPTS.length; i++) buildLuts(PSX_OPTS[i], i);
    }
    resizePsxFilter();
    applyPsxFilter();
  } catch (e) { mode = "off"; gl = null; tex = null; el = null; }
}

/** Acompanha o encaixe do canvas do jogo (chamado pelo fit() do main.js). */
export function resizePsxFilter(pxW, pxH) {
  if (!el) return;
  const w = pxW || (gameEl && gameEl.style && gameEl.style.width) || VIEW_W + "px";
  const h = pxH || (gameEl && gameEl.style && gameEl.style.height) || VIEW_H + "px";
  el.style.width = w;
  el.style.height = h;
  if (gl) gl.viewport(0, 0, el.width, el.height);
}

/** Liga/desliga e reconfigura conforme o save (boot e troca no menu). */
export function applyPsxFilter() {
  if (!el || mode === "off") return;
  const idx = levelAtual();
  const opt = PSX_OPTS[idx];
  const ligado = idx > 0;
  el.hidden = !ligado;
  if (!ligado) { level = 0; return; }
  if (level === idx) return;
  level = idx;
  const { w, h } = bufferFor(opt);
  el.width = w;
  el.height = h;
  if (mode === "webgl") {
    gl.viewport(0, 0, w, h);
    gl.uniform1f(uni.uDither, opt.dither);
    gl.uniform1f(uni.uSteps, opt.steps);
    gl.uniform1f(uni.uDesat, opt.desat);
  } else {
    cpuW = w; cpuH = h;
    cpuCtx = el.getContext("2d");
    if (cpuCtx) cpuCtx.imageSmoothingEnabled = false;
    if (!luts[idx]) buildLuts(opt, idx);
  }
  resizePsxFilter();
}

// ------------------------------------------------------------------ quadro ---
/**
 * Desenha o filtro sobre o quadro recém-renderizado: o canvas do jogo vai como
 * textura para a GPU (sem ler pixel de volta) e volta filtrado no #psx.
 */
export function drawPsxFilter() {
  if (!el || level <= 0) return;
  if (mode === "webgl") {
    if (!gl || !gameEl) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gameEl);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return;
  }
  if (mode === "cpu") cpuFrame();
}

/** Caminho reserva: dither + quantização por tabela (em meia resolução). */
function cpuFrame() {
  if (!cpuCtx || !gameEl || !cpuW || !cpuH) return;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  cpuCtx.imageSmoothingEnabled = false;
  cpuCtx.drawImage(gameEl, 0, 0, cpuW, cpuH);
  const img = cpuCtx.getImageData(0, 0, cpuW, cpuH);
  const d = img.data, n = d.length;
  const tabs = luts[level];
  if (!tabs) return;
  const desat = PSX_OPTS[level].desat;
  for (let y = 0, i = 0; y < cpuH; y++) {
    const base = (y & 3) * 4;
    for (let x = 0; x < cpuW; x++, i += 4) {
      if (i + 3 >= n) { y = cpuH; break; }   // DOM simulado devolve buffer curto
      const t = tabs[base + (x & 3)];
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (desat > 0) {
        const l = (r * 77 + g * 150 + b * 29) >> 8;      // luma (Rec. 601)
        r += (l - r) * desat; g += (l - g) * desat; b += (l - b) * desat;
      }
      d[i] = t[r | 0]; d[i + 1] = t[g | 0]; d[i + 2] = t[b | 0];
    }
  }
  cpuCtx.putImageData(img, 0, 0);
  // no modo cpu a medida do passe é direta (no webgl quem decide é o vigia de quadro)
  if (!rebaixado && t0) {
    const dt = performance.now() - t0;
    if (dt > 8) rebaixar();
  }
}

/** Reduz o buffer para meia resolução, uma única vez. */
function rebaixar() {
  if (rebaixado || mode === "off") return;
  rebaixado = true;
  escalaExtra = 0.5;
  level = -1;                  // força reconfigurar o buffer no próximo apply
  applyPsxFilter();
  if (typeof console !== "undefined") console.debug("FUMIGA: filtro PS1 — resolução interna reduzida para manter o FPS");
}

const quadroMs = [];
let quadrosVistos = 0;
/**
 * Vigia de desempenho do filtro (chamado a cada quadro pelo main.js com o dt em
 * segundos). Se a MEDIANA de ~1,5 s de quadros passar de 22 ms com o filtro no
 * buffer cheio, o filtro desce para meia resolução: o visual PS1 continua, o
 * quadro volta a respirar. Uma vez só, e nunca desliga o filtro.
 */
export function notaQuadroPsx(dtS) {
  if (mode === "off" || level <= 0 || rebaixado || !(dtS > 0)) return;
  quadroMs.push(dtS * 1000);
  if (quadroMs.length > JANELA_QUADROS) quadroMs.shift();
  if (++quadrosVistos % 60 !== 0 || quadroMs.length < 60) return;
  const ord = quadroMs.slice().sort((a, b) => a - b);
  if (ord[ord.length >> 1] > LIMITE_QUADRO_MS) rebaixar();
}

/** Diagnóstico (modo debug e testes): rota, nível, buffer e escala. */
export function psxInfo() {
  return {
    mode, level, ativo: !!el && !el.hidden,
    buffer: [el ? el.width : 0, el ? el.height : 0],
    escala: escalaExtra, renderer,
  };
}
