// ============================================================================
// FUMIGA-GOAT — primitivos de UI desenhados em canvas (estilo Dead Cells)
//
// Tudo aqui é "chunky": cantos chanfrados, bisel claro no topo, sombra pesada
// embaixo, barra de acento colorida e animação de hover/press. O objetivo é
// que botão pareça botão mesmo sem textura — o jogo é feito só de canvas.
// ============================================================================
import { PAL } from "./config.js";
import { drawText, textWidth, FONT } from "./font.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";
import { G } from "./state.js";
import { clamp } from "./utils.js";

let buttons = [];

export function uiBegin() { buttons = []; }
export function uiButtons() { return buttons; }

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** Cor com alpha aplicado sobre um hex (#rrggbb). */
export function withAlpha(hex, a) {
  const h = String(hex).replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mistura duas cores hex (t=0 -> a, t=1 -> b). */
export function mix(a, b, t) {
  const pa = a.replace("#", ""), pb = b.replace("#", "");
  const ch = (s, i) => parseInt(s.substr(i, 2), 16);
  const r = Math.round(ch(pa, 0) * (1 - t) + ch(pb, 0) * t);
  const g = Math.round(ch(pa, 2) * (1 - t) + ch(pb, 2) * t);
  const bl = Math.round(ch(pa, 4) * (1 - t) + ch(pb, 4) * t);
  return `rgb(${r},${g},${bl})`;
}

export function chamferPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.lineTo(x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.lineTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.lineTo(x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.closePath();
}

/**
 * Painel com corpo em gradiente, bisel claro no topo, sombra projetada e
 * borda dupla. `opt.fill`/`opt.border` continuam valendo (compatível com as
 * chamadas antigas), mas o padrão agora é bem mais rico que um retângulo.
 */
export function panel(ctx, x, y, w, h, opt = {}) {
  const r = opt.r !== undefined ? opt.r : 6;
  const fill = opt.fill || PAL.panel;
  const border = opt.border || PAL.border;
  const flat = !!opt.flat;

  // sombra projetada (semi-transparente: não conta como "painel opaco")
  if (!opt.noShadow) {
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    chamferPath(ctx, x + 2, y + 3, w, h, r);
    ctx.fill();
  }

  // corpo
  if (flat) {
    ctx.fillStyle = fill;
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix(fill, "#ffffff", 0.06));
    g.addColorStop(0.55, fill);
    g.addColorStop(1, mix(fill, "#000000", 0.28));
    ctx.fillStyle = g;
  }
  chamferPath(ctx, x, y, w, h, r);
  ctx.fill();

  // luz interna no topo (volume de chapa de metal)
  if (!opt.flat) {
    ctx.strokeStyle = "rgba(239,233,255,0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + r, y + 1.5);
    ctx.lineTo(x + w - r, y + 1.5);
    ctx.stroke();
    // sombra interna na base
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.moveTo(x + r, y + h - 1.5);
    ctx.lineTo(x + w - r, y + h - 1.5);
    ctx.stroke();
  }

  // borda dupla
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  chamferPath(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(2, r - 1));
  ctx.stroke();
  if (!opt.flat) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    chamferPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.stroke();
  }

  // filete de acento no topo, se pedido
  if (opt.topAccent) {
    ctx.fillStyle = opt.topAccent;
    ctx.fillRect(x + r, y + 2, w - r * 2, 2);
  }
  return { x, y, w, h };
}

/** Barra de "cabeçalho" de painel (atalho visual para telas modais). */
export function panelTitle(ctx, x, y, w, label, color = PAL.amberHot) {
  drawText(ctx, label, x + w / 2, y, { font: "big", scale: 2, color, align: "center" });
}

/**
 * Botão textual completo: hover animado, pressão, acento lateral, atalho de
 * teclado e estado desabilitado. Retorna true quando clicado neste frame.
 */
export function button(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const pressed = hot && mouse.down && !dis;
  const clicked = hot && mouse.justDown && !dis;
  const t = G.time || 0;
  const off = pressed ? 1 : 0;

  const accent = opt.accent || PAL.borderHi;
  const fill = dis ? "#161121" : hot ? PAL.panelHi : PAL.panel;
  const border = dis ? "#2c2440" : hot ? accent : PAL.border;

  panel(ctx, x, y + off, w, h - (pressed ? 1 : 0), {
    fill, border, r: 5, topAccent: hot && !dis ? withAlpha(accent, 0.85) : null,
  });

  if (hot && !dis) {
    // brilho pulsante por dentro (chama o olho sem piscar demais)
    const pulse = 0.06 + 0.05 * Math.sin(t * 6);
    ctx.fillStyle = withAlpha(accent, pulse);
    ctx.fillRect(x + 2, y + 2 + off, w - 4, h - 4);
    // marcas de canto (recorte de HUD)
    ctx.fillStyle = withAlpha(accent, 0.9);
    ctx.fillRect(x + 3, y + 3 + off, 6, 2);
    ctx.fillRect(x + 3, y + 3 + off, 2, 6);
    ctx.fillRect(x + w - 9, y + h - 5 + off, 6, 2);
    ctx.fillRect(x + w - 5, y + h - 9 + off, 2, 6);
  }
  if (opt.accent && !dis) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = hot ? 1 : 0.6;
    ctx.fillRect(x + 2, y + 3 + off, 3, h - 6);
    ctx.globalAlpha = 1;
  }
  if (opt.icon) {
    ctx.imageSmoothingEnabled = false;
    const ic = opt.icon;
    const isz = Math.min(20, h - 12);
    ctx.drawImage(ic, x + 10, y + (h - isz) / 2 + off, isz, isz);
  }

  const col = dis ? "#5a4f78" : opt.color || PAL.text;
  const font = opt.font || "small";
  const scale = opt.scale || 1;
  const labelY = y + h / 2 - (font === "big" ? 15 : 8) - 2 + off;
  const labelX = x + w / 2 + (opt.icon ? 8 : 0);
  // leve elevação do texto no hover (o botão "levanta" para o mouse)
  drawText(ctx, opt.label, labelX, labelY - (hot && !dis ? 1 : 0), {
    font, scale, color: col, align: "center", shadow: true,
  });

  // atalho de teclado no canto direito
  if (opt.hotkey) {
    drawText(ctx, opt.hotkey, x + w - 8, y + h - 15 + off,
      { color: hot && !dis ? accent : PAL.textDim, align: "right" });
  }

  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return clicked;
}

/** Botão de ícone (loja / hotbar). */
export function iconButton(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const pressed = hot && mouse.down && !dis;
  const clicked = hot && mouse.justDown && !dis;
  const frame = opt.frame || PAL.amber;
  const off = pressed ? 1 : 0;

  panel(ctx, x, y + off, w, h - (pressed ? 1 : 0), {
    fill: dis ? "#161121" : hot ? PAL.panelHi : PAL.panel,
    border: dis ? "#2c2440" : hot || opt.selected ? frame : PAL.border,
    r: 4,
    topAccent: opt.selected || (hot && !dis) ? withAlpha(frame, 0.9) : null,
  });

  if (opt.selected) {
    ctx.strokeStyle = frame;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2.5, y + 2.5 + off, w - 5, h - 5);
    ctx.globalAlpha = 1;
  }
  if (hot && !dis) {
    const pulse = 0.07 + 0.05 * Math.sin((G.time || 0) * 6);
    ctx.fillStyle = withAlpha(frame, pulse);
    ctx.fillRect(x + 2, y + 2 + off, w - 4, h - 4);
  }
  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return { clicked, hot };
}

/**
 * Barra de vida / progresso com gradiente, brilho de topo e marcações.
 * (compatível com as chamadas antigas: c1, c2, segments, bg, border)
 */
export function bar(ctx, x, y, w, h, frac, opt = {}) {
  frac = clamp(frac, 0, 1);
  ctx.fillStyle = opt.bg || "#0f0b18";
  ctx.fillRect(x, y, w, h);
  const innerX = x + 1, innerW = w - 2, innerY = y + 1, innerH = h - 2;
  const grad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
  grad.addColorStop(0, opt.c1 || "#ffd479");
  grad.addColorStop(1, opt.c2 || "#ff7a3d");
  ctx.fillStyle = grad;
  ctx.fillRect(innerX, innerY, Math.round(innerW * frac), innerH);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(innerX, innerY, Math.round(innerW * frac), 1);
  // ponta acesa (leitura rápida de quanto resta)
  if (frac > 0.02 && frac < 0.99) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(innerX + Math.round(innerW * frac) - 1, innerY, 2, innerH);
  }
  const n = opt.segments || 0;
  if (n > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let i = 1; i < n; i++) {
      const sx = innerX + (innerW / n) * i;
      ctx.fillRect(sx, innerY, 1, innerH);
    }
  }
  ctx.strokeStyle = opt.border || "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Etiqueta pequena (chip) — usada em legendas e status. */
export function chip(ctx, x, y, label, color = PAL.teal, opt = {}) {
  const tw = textWidth(label, {}) + (opt.icon ? 20 : 12);
  panel(ctx, x, y, tw, 18, { r: 3, fill: "#141020", border: withAlpha(color, 0.7), flat: true, noShadow: true });
  if (opt.icon) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(opt.icon, x + 4, y + 2, 14, 14);
  }
  drawText(ctx, label, x + tw / 2 + (opt.icon ? 7 : 0), y + 3, { color, align: "center" });
  return tw;
}

/** Texto com brilho suave (títulos de destaque nas telas). */
export function glowText(ctx, text, x, y, opt = {}) {
  const color = opt.color || "#ffd479";
  ctx.save();
  ctx.globalAlpha = (opt.glowAlpha || 0.25) * (0.75 + 0.25 * Math.sin((G.time || 0) * 2.4));
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    drawText(ctx, text, x + dx, y + dy, { ...opt, color, shadow: false });
  }
  ctx.restore();
  drawText(ctx, text, x, y, { ...opt, color, shadow: true });
}

/** Linha divisória com degrade (pontas apagadas). */
export function divider(ctx, x, y, w, color = PAL.border) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.5, withAlpha(color, 0.9));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, 1);
}

/** Metadados da fonte (usado por telas que precisam medir rótulos maiores). */
export function labelMetrics(font = "small", scale = 1) {
  const F = FONT[font];
  return { h: F.ch * scale, adv: F.adv * scale };
}

/** Texto com ícone à esquerda. */
export function labelIcon(ctx, img, x, y, scale = 2) {
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
}
