// ============================================================================
// FUMIGA-GOAT — partículas, ondas de choque, textos flutuantes (com pooling)
//
// Camadas, na ordem de desenho:
//   stains  — manchas no chão (sangue/essência/fuligem): ficam alguns segundos
//   trails  — cheiro de feromônio
//   parts   — respingos, estilhaços, poeira (com gravidade e rotação)
//   arcs    — golpes: arcos/crescentes de lâmina
//   glows   — camada aditiva (faíscas, brasas, almas)
//   rings   — ondas de choque
//   floats  — textos flutuantes
// ============================================================================
import { rand, TAU, clamp } from "./utils.js";

const MAX_P = 900;
const parts = [];   // partículas
const rings = [];   // ondas de choque
const floats = [];  // textos flutuantes
const trails = [];  // trilhas de feromônio
const stains = [];  // manchas persistentes no chão
const arcs = [];    // golpes (arcos)

export function clearParticles() {
  parts.length = 0; rings.length = 0; floats.length = 0; trails.length = 0;
  stains.length = 0; arcs.length = 0;
}

export function spawnPart(o) {
  if (parts.length >= MAX_P) parts.shift();
  parts.push({
    x: o.x, y: o.y,
    vx: o.vx || 0, vy: o.vy || 0,
    g: o.g || 0,
    life: o.life || 0.6, maxLife: o.life || 0.6,
    size: o.size || 2,
    sizeEnd: o.sizeEnd !== undefined ? o.sizeEnd : o.size || 2,
    color: o.color || "#fff",
    glow: !!o.glow,
    drag: o.drag !== undefined ? o.drag : 0.94,
    rot: o.rot || 0, spin: o.spin || 0,     // estilhaços giram
    shard: !!o.shard,
  });
}

export function burst(x, y, opt) {
  const n = opt.n || 8;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(opt.spMin || 20, opt.spMax || 90);
    spawnPart({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0),
      g: opt.g || 0,
      life: rand((opt.life || 0.55) * 0.6, (opt.life || 0.55) * 1.3),
      size: rand(opt.sizeMin || 1.5, opt.sizeMax || 3.5),
      sizeEnd: 0.5,
      color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || "#fff"),
      glow: opt.glow,
      drag: opt.drag !== undefined ? opt.drag : 0.9,
    });
  }
}

// ---------------------------------------------------------------- golpes ----
/**
 * Sangue/goo: jatos na direção do golpe, com gravidade — e um respingo no chão
 * que sobrevive à poeira da briga (o chão conta a história do combate).
 */
export function blood(x, y, angle, opt = {}) {
  const n = opt.n || 9;
  const power = opt.power || 1;
  const colors = opt.color || ["#ff4d5a", "#a32e46", "#c94f2e"];
  for (let i = 0; i < n; i++) {
    const a = (angle !== undefined ? angle : rand(0, TAU)) + rand(-0.6, 0.6);
    const sp = rand(40, 150) * power;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 50),
      g: 380, life: rand(0.3, 0.75), size: rand(1.5, 3.6), sizeEnd: 0.8,
      color: Array.isArray(colors) ? colors[(Math.random() * colors.length) | 0] : colors,
      drag: 0.985,
    });
  }
  if (opt.stain !== false) stain(x + rand(-8, 8), y + rand(-4, 10), opt.stainR || 13, opt.stainColor || "#5a1524");
}

/** Estilhaços de quitina: giram, quicam e ficam no chão. */
export function shards(x, y, opt = {}) {
  const n = opt.n || 7;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(60, 210) * (opt.power || 1);
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(20, 90),
      g: 460, life: rand(0.45, 1.0), size: rand(2, 4.5), sizeEnd: 1,
      color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || "#c9a06a"),
      drag: 0.99, shard: true, rot: rand(0, TAU), spin: rand(-14, 14),
    });
  }
}

/** Poeira: nuvem baixa que abre devagar (impactos grandes, chegada de chefe). */
export function dust(x, y, opt = {}) {
  const n = opt.n || 10;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(12, 70) * (opt.power || 1);
    spawnPart({
      x: x + rand(-8, 8), y: y + rand(-4, 4),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45 - rand(4, 22),
      g: -14, life: rand(0.5, 1.1), size: rand(4, 11), sizeEnd: rand(12, 22),
      color: opt.color || "#6b5a4a", drag: 0.9,
    });
  }
}

/** Faíscas: brilho aditivo curto (aço, magia, impacto de pedra). */
export function sparks(x, y, opt = {}) {
  const n = opt.n || 8;
  for (let i = 0; i < n; i++) {
    const a = opt.angle !== undefined ? opt.angle + rand(-0.9, 0.9) : rand(0, TAU);
    const sp = rand(80, 260);
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: 120, life: rand(0.15, 0.4), size: rand(1.5, 3), sizeEnd: 0.6,
      color: opt.color || "#ffe9a8", glow: true, drag: 0.88,
    });
  }
}

/** Essência/alma: sobe em espiral, some em brilho. */
export function soul(x, y, opt = {}) {
  const n = opt.n || 3;
  for (let i = 0; i < n; i++) {
    spawnPart({
      x: x + rand(-10, 10), y: y + rand(-8, 4),
      vx: rand(-22, 22), vy: rand(-58, -26),
      g: -8, life: rand(0.6, 1.2), size: rand(1.5, 3.2), sizeEnd: 0.4,
      color: opt.color || "#c77dff", glow: true, drag: 0.96,
    });
  }
}

/** Arco de golpe: lâmina/garra varrendo o alvo. */
export function slash(x, y, angle, opt = {}) {
  arcs.push({
    x, y,
    ang: angle !== undefined ? angle : rand(0, TAU),
    len: opt.len || 34,
    spread: opt.spread || 1.9,
    life: opt.life || 0.22, maxLife: opt.life || 0.22,
    color: opt.color || "#fff3d0",
    width: opt.width || 4,
    back: !!opt.back,
  });
  if (arcs.length > 40) arcs.shift();
}

/** Mancha no chão (sangue, seiva, fuligem): demora a sumir. */
export function stain(x, y, r, color, life) {
  if (stains.length > 90) stains.shift();
  stains.push({
    x, y, r: r || 12, life: life || rand(5, 9), maxLife: life || 9,
    color: color || "#5a1524",
    seed: Math.random() * 1000,
  });
}

export function ring(x, y, opt) {
  rings.push({
    x, y,
    r: opt.r0 || 6, r1: opt.r1 || 80,
    life: opt.life || 0.5, maxLife: opt.life || 0.5,
    color: opt.color || "#fff", width: opt.width || 3,
  });
  if (rings.length > 40) rings.shift();
}

export function floatText(x, y, text, opt = {}) {
  if (floats.length > 46) floats.shift();
  floats.push({
    x, y: y - 8, vy: -34,
    text: String(text),
    life: opt.life || 1.1, maxLife: opt.life || 1.1,
    color: opt.color || "#fff",
    scale: opt.scale || 1,
    font: opt.font || "small",
  });
}

/** trilha de feromônio (operárias/inimigos) */
export function scent(x, y, color) {
  if (trails.length > 260) trails.shift();
  trails.push({ x, y, life: 1.6, maxLife: 1.6, color });
}

// -------------------------------------------------------------- compostos ---
/** Impacto genérico: faísca + respingo + poeira (tamanho pela força do golpe). */
export function hitFx(x, y, angle, opt = {}) {
  const power = clamp((opt.dmg || 8) / 16, 0.6, 2.2);
  slash(x, y, angle, { len: 22 + power * 12, color: opt.crit ? "#ffd479" : "#fff3d0", width: opt.crit ? 6 : 4 });
  sparks(x, y, { n: opt.crit ? 10 : 5, angle, color: opt.crit ? "#ffd479" : "#ffe9a8" });
  blood(x, y, angle, { n: opt.crit ? 12 : 6, power, color: opt.color, stain: !!opt.crit, stainR: 10 + power * 4, stainColor: opt.stainColor });
  dust(x, y, { n: 3, power: 0.6, color: opt.dust || "#5b4a44" });
}

/** Morte: o corpo se desfaz em respingo, estilhaço, poeira e uma mancha. */
export function deathFx(x, y, opt = {}) {
  const big = !!opt.big;
  blood(x, y, undefined, { n: big ? 26 : 14, power: big ? 1.9 : 1.1, color: opt.color, stain: false });
  shards(x, y, { n: big ? 18 : 9, color: opt.shard || "#c9a06a", power: big ? 1.5 : 1 });
  dust(x, y, { n: big ? 16 : 8, power: big ? 1.4 : 0.9, color: opt.dust || "#5b4a44" });
  stain(x, y, big ? 30 : 16, opt.stain || "#5a1524", big ? 11 : 8);
  ring(x, y, { r0: 4, r1: big ? 74 : 40, life: 0.4, color: opt.ringColor || "#ff4d5a", width: big ? 4 : 2 });
  if (opt.soulColor || opt.soul) soul(x, y - 6, { n: big ? 8 : 4, color: opt.soulColor || "#c77dff" });
}

export function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.spin) p.rot += p.spin * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt;
    if (r.life <= 0) rings.splice(i, 1);
  }
  for (let i = arcs.length - 1; i >= 0; i--) {
    const a = arcs[i];
    a.life -= dt;
    if (a.life <= 0) arcs.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    if (f.life <= 0) { floats.splice(i, 1); continue; }
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.92, dt * 60);
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= dt;
    if (t.life <= 0) trails.splice(i, 1);
  }
  for (let i = stains.length - 1; i >= 0; i--) {
    const s = stains[i];
    s.life -= dt;
    if (s.life <= 0) stains.splice(i, 1);
  }
}

// ------------------------------------------------------------------- draw ---
/** Manchas no chão — desenhadas ANTES das unidades (fazem parte do terreno). */
export function drawStains(ctx, w2s, zoom = 1) {
  for (const s of stains) {
    const t = clamp(s.life / s.maxLife, 0, 1);
    const p = w2s(s.x, s.y);
    ctx.globalAlpha = 0.22 + 0.35 * t;
    ctx.fillStyle = s.color;
    const r = s.r * zoom;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * zoom, r * (0.9 + 0.12 * Math.sin(s.seed)), r * 0.52, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.45, p.y - 1 * zoom, r * 0.4, r * 0.24, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTrails(ctx, w2s) {
  for (const t of trails) {
    const a = 0.32 * (t.life / t.maxLife);
    const s = w2s(t.x, t.y);
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    const sz = 2.2;
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

export function drawParts(ctx, w2s, zoom = 1) {
  for (const p of parts) {
    if (p.glow) continue;
    const t = p.life / p.maxLife;
    const s = w2s(p.x, p.y);
    ctx.globalAlpha = clamp(t * 1.4, 0, 1);
    ctx.fillStyle = p.color;
    const sz = Math.max(1, (p.size + (p.sizeEnd - p.size) * (1 - t)) * zoom);
    if (p.shard) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-sz * 0.9, -sz * 0.35, sz * 1.8, sz * 0.7);
      ctx.restore();
    } else {
      ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

/** Arcos de golpe (giram com a câmera? não: são efeitos de tela do mundo). */
export function drawArcs(ctx, w2s, zoom = 1) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const a of arcs) {
    const t = a.life / a.maxLife;
    const p = w2s(a.x, a.y);
    const swing = a.back ? 1 - t : t;
    const ang = a.ang - a.spread / 2 + a.spread * swing;
    ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(1, a.width * t * zoom);
    ctx.beginPath();
    ctx.arc(p.x, p.y, a.len * zoom * (0.85 + 0.15 * (1 - t)), ang - 0.8, ang + 0.8);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawGlows(ctx, w2s) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of parts) {
    if (!p.glow) continue;
    const t = p.life / p.maxLife;
    const s = w2s(p.x, p.y);
    ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
    ctx.fillStyle = p.color;
    const sz = Math.max(1, (p.size + (p.sizeEnd - p.size) * (1 - t)) * 1.6);
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRings(ctx, w2s, zoom) {
  for (const r of rings) {
    const t = 1 - r.life / r.maxLife;
    const s = w2s(r.x, r.y);
    ctx.globalAlpha = (1 - t) * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1, r.width * zoom * (1 - t * 0.6));
    ctx.beginPath();
    ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * t) * zoom, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Textos flutuantes vivem em coordenadas de MUNDO (como as partículas).
 * w2s = worldToScreen da câmera: sem converter, "+5" de uma coleta perto do
 * formigueiro era desenhado em (1600, 1180) num canvas de 960x540 — fora da
 * tela, ou seja, TODO texto flutuante era invisível.
 */
export function drawFloats(ctx, font_drawText, w2s) {
  for (const f of floats) {
    const t = f.life / f.maxLife;
    const s = w2s ? w2s(f.x, f.y) : { x: f.x, y: f.y };
    font_drawText(ctx, f.text, s.x, s.y, {
      font: f.font, scale: f.scale, color: f.color,
      align: "center", alpha: clamp(t * 1.8, 0, 1),
    });
  }
  ctx.globalAlpha = 1;
}

export function counts() { return parts.length; }
export function stainCount() { return stains.length; }
