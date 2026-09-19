// ============================================================================
// FUMIGA-GOAT — TRANSIÇÕES DE TELA
//
// Trocar de tela no meio do quadro pisca. Aqui toda troca acontece na hora
// (o clique vale já no quadro seguinte, como sempre foi) mas a nova cena
// BLOOM: uma cortina opaca se dissolve, com um flash de cor, enquanto o
// conteúdo entra animado (a placa do título desliza, a árvore dá zoom...).
//
// Estilos: "fade" | "iris" | "swipe" | "wipe" | "swarm".
// Uso:  goTo("TREE", { style: "iris" })
//       updateTransition(dt) / drawCover(ctx) (por último no render)
//       enterEased() — 0..1 da animação de entrada da tela atual
// ============================================================================
import { VIEW_W, VIEW_H, PAL } from "./config.js";
import { G } from "./state.js";
import { clamp, rand } from "./utils.js";

const STATE = {
  phase: "idle",     // idle | in
  t: 0,
  durIn: 0.42,
  style: "fade",
  flash: 0,
  flashDur: 0.22,
};

const enter = { screen: null, t: 0, dur: 0.5 };
let dust = null;

/** Troca de tela com bloom de entrada. `opts.style` escolhe o efeito. */
export function goTo(screen, opts = {}) {
  if (screen === G.screen && !opts.force) return;
  STATE.style = opts.style || defaultStyle(G.screen, screen);
  STATE.durIn = opts.durIn !== undefined ? opts.durIn : 0.42;
  STATE.t = 0;
  STATE.flash = 1;
  STATE.flashDur = opts.flash !== undefined ? opts.flash : 0.22;
  STATE.phase = "in";
  if (opts.onApply) opts.onApply();          // prepara a cena antes de exibir
  G.screen = screen;
  resetEnter(screen);
  dust = makeDust(STATE.style);
}

/** Só reinicia a animação de entrada da tela (sem cortina). */
export function resetEnter(screen) {
  enter.screen = screen || G.screen;
  enter.t = 0;
}

function defaultStyle(from, to) {
  if (to === "TREE") return "iris";
  if (to === "RUN") return "swipe";
  if (to === "HELP") return "wipe";
  return "fade";
}

function makeDust(style) {
  if (style === "fade") return null;
  const out = [];
  for (let i = 0; i < 46; i++) {
    out.push({
      x: rand(-40, VIEW_W), y: rand(-20, VIEW_H + 20),
      vx: rand(-170, 170), vy: rand(-50, 50),
      s: rand(1, 3), life: rand(0.3, 0.85), max: 0.85,
    });
  }
  return out;
}

export function transitionBusy() { return STATE.phase !== "idle"; }

/** 0..1 — animação de ENTRADA da tela atual (crua). */
export function enterProgress() { return clamp(enter.t / enter.dur, 0, 1); }
/** 0..1 — animação de entrada com suavização (ease-out cúbica). */
export function enterEased() {
  const t = enterProgress();
  return 1 - Math.pow(1 - t, 3);
}
/** Salta a entrada para o fim (testes de layout e capturas). */
export function finishEnter() { enter.t = enter.dur; }

/** Encerra a cortina na hora (testes de layout não auditam a animação). */
export function finishTransition() {
  STATE.phase = "idle";
  STATE.t = STATE.durIn;
  STATE.flash = 0;
  dust = null;
}

export function updateTransition(dt) {
  // entrada da tela
  if (enter.screen !== G.screen) resetEnter(G.screen);
  enter.t = Math.min(enter.dur, enter.t + dt);

  if (STATE.phase === "idle") return;
  STATE.t += dt;
  STATE.flash = Math.max(0, STATE.flash - dt / STATE.flashDur);
  if (dust) {
    for (const d of dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; }
  }
  if (STATE.t >= STATE.durIn) { STATE.phase = "idle"; dust = null; }
}

/** Opacidade atual da cortina: 1 (tela coberta) a 0 (limpa). */
export function coverAmount() {
  if (STATE.phase === "in") return 1 - clamp(STATE.t / STATE.durIn, 0, 1);
  return 0;
}

/** Desenha a cortina + o flash. Chamado por ÚLTIMO no render. */
export function drawCover(ctx) {
  // flash de cor no instante da troca (dá o "tapa" de impacto)
  if (STATE.flash > 0.001) {
    const accent = STATE.style === "iris" ? PAL.amber
      : STATE.style === "swipe" ? PAL.teal : "#ffffff";
    ctx.fillStyle = withA(accent, 0.4 * STATE.flash);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const k = coverAmount();
  if (k <= 0.001) return;
  const style = STATE.style;

  if (style === "fade") {
    ctx.fillStyle = `rgba(8,5,14,${k})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }

  if (style === "iris") {
    // íris abrindo do centro para a tela nova
    const maxR = Math.hypot(VIEW_W, VIEW_H) * 0.62;
    const r = maxR * k;
    ctx.fillStyle = `rgba(8,5,14,${Math.min(1, k * 1.6)})`;
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.arc(VIEW_W / 2, VIEW_H / 2, Math.max(0, r), 0, Math.PI * 2, true);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,212,121,${0.5 * k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, VIEW_H / 2, Math.max(0, r), 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (style === "swipe") {
    // faixa diagonal saindo para a esquerda (a colônia migrando)
    const w = VIEW_W + VIEW_H;
    const x0 = -VIEW_H + k * w;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 - VIEW_H, 0);
    ctx.lineTo(x0, 0);
    ctx.lineTo(x0 - VIEW_H, VIEW_H);
    ctx.lineTo(x0 - VIEW_H * 2, VIEW_H);
    ctx.closePath();
    ctx.fillStyle = `rgba(8,5,14,${Math.min(1, k * 1.4)})`;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(55,230,200,${0.25 + 0.45 * k})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 - VIEW_H, VIEW_H);
    ctx.stroke();
    return;
  }

  // "wipe" / "swarm": cortina descendo com borda acesa
  const h = VIEW_H * k;
  ctx.fillStyle = `rgba(8,5,14,${Math.min(1, k * 1.4)})`;
  ctx.fillRect(0, 0, VIEW_W, h);
  ctx.fillStyle = STATE.style === "swarm" ? PAL.amber : PAL.teal;
  ctx.globalAlpha = 0.85 * k;
  ctx.fillRect(0, h - 2, VIEW_W, 2);
  ctx.globalAlpha = 1;

  if (style === "swarm") {
    ctx.fillStyle = "#0d0918";
    for (let i = 0; i < 26; i++) {
      const px = ((i * 137 + G.time * 90) % (VIEW_W + 60)) - 30;
      const py = h - 14 + ((i * 37) % 12);
      const dir = i % 2 ? 1 : -1;
      ctx.fillRect(px, py, 5 * dir, 2);
      ctx.fillRect(px - 2 * dir, py - 2, 3, 2);
      ctx.fillRect(px + 3 * dir, py - 2, 3, 2);
    }
  }
}

/** Partículas de pixel que acompanham a cortina. */
export function drawDust(ctx) {
  if (!dust) return;
  for (const d of dust) {
    if (d.life <= 0) continue;
    ctx.globalAlpha = clamp(d.life / d.max, 0, 1) * 0.8;
    ctx.fillStyle = d.s > 2 ? PAL.amber : PAL.teal;
    ctx.fillRect(d.x, d.y, d.s, d.s);
  }
  ctx.globalAlpha = 1;
}

function withA(hex, a) {
  const h = String(hex).replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}
