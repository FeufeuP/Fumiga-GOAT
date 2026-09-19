// ============================================================================
// FUMIGA-GOAT — FUNDO DO MENU (arte pintada em canvas, inspirada em Dead Cells)
//
// Três camadas assadas uma única vez (céu/sol → mar, ilha do formigueiro e
// castelo → primeiro plano rochoso) e depois desenhadas com paralaxe e
// respiração lenta. Tudo é determinístico (semente fixa): a cena é sempre a
// mesma, não "pisca" ao recarregar.
//
// A composição é a mesma linguagem do jogo: SILHUETAS escuras contra um céu
// incandescente, luz de borda quente, brilhos emissivos (janelas, entradas da
// colônia, cristais) e profundidade em camadas. Em cima disso, drawTitleMotes
// anima brasas, vagalumes e névoa.
// ============================================================================
import { VIEW_W, VIEW_H } from "./config.js";
import { mulberry32 } from "./utils.js";

const PAD = 20;                       // margem para a paralaxe não mostrar borda
const W = VIEW_W + PAD * 2, H = VIEW_H + PAD * 2;
const HORIZON = 384;
const SUNX = 596, SUNY = HORIZON + 4; // meio sol mergulhado no mar

let far = null, mid = null, fore = null;

function bakeLayer() {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  return { cv, c };
}

/** Silhueta de cordilheira: cadeia de picos com luz de borda voltada ao sol. */
function ridge(c, rnd, yBase, amp, color, rim, rimA) {
  const pts = [];
  let x = -40;
  while (x < W + 40) {
    pts.push({ x, y: yBase - rnd() * amp });
    x += 40 + rnd() * 90;
  }
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-40, H);
  for (const p of pts) c.lineTo(p.x, p.y);
  c.lineTo(W + 40, H);
  c.closePath();
  c.fill();
  c.strokeStyle = rim;
  c.globalAlpha = rimA;
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) c.moveTo(pts[i].x, pts[i].y);
    else c.lineTo(pts[i].x, pts[i].y);
  }
  c.stroke();
  c.globalAlpha = 1;
}

/** Torre com telhado em agulha, bandeira e janelas acesas. */
function tower(c, x, yBase, w, h, color, opt = {}) {
  c.fillStyle = color;
  c.fillRect(x - w / 2, yBase - h, w, h);
  const mw = w / 5;
  for (let i = 0; i < 3; i++) c.fillRect(x - w / 2 + i * mw * 2, yBase - h - 6, mw, 6);
  c.beginPath();
  c.moveTo(x - w / 2 - 3, yBase - h - 6);
  c.lineTo(x, yBase - h - 6 - (opt.spire || 26));
  c.lineTo(x + w / 2 + 3, yBase - h - 6);
  c.closePath();
  c.fill();
  if (opt.win !== false) {
    c.fillStyle = opt.winColor || "#ffcf6a";
    for (let ry = 0; ry < Math.floor(h / 24); ry++) {
      for (let rx = 0; rx < 2; rx++) {
        if ((ry + rx) % 3 === 0) continue;
        c.fillRect(x - w / 2 + 5 + rx * (w - 14), yBase - h + 9 + ry * 24, 4, 6);
      }
    }
  }
  if (opt.flag !== false) {
    const top = yBase - h - 6 - (opt.spire || 26);
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, top); c.lineTo(x, top - 14); c.stroke();
    c.fillStyle = opt.flagColor || "#ffd479";
    c.beginPath();
    c.moveTo(x + 1, top - 14); c.lineTo(x + 16, top - 10); c.lineTo(x + 1, top - 6);
    c.closePath(); c.fill();
  }
}

/** Árvore retorcida em silhueta com copa em camadas. */
function tree(c, x, y, s, color, rim) {
  c.fillStyle = color;
  // tronco afinando para cima (com leve curva)
  c.beginPath();
  c.moveTo(x - 2.6 * s, y);
  c.quadraticCurveTo(x - 1.4 * s, y - 18 * s, x - 1.1 * s, y - 30 * s);
  c.lineTo(x + 1.1 * s, y - 30 * s);
  c.quadraticCurveTo(x + 1.6 * s, y - 16 * s, x + 2.6 * s, y);
  c.closePath();
  c.fill();
  // galhos
  c.lineWidth = 1.6 * s;
  c.strokeStyle = color;
  c.beginPath();
  c.moveTo(x - 1 * s, y - 22 * s); c.lineTo(x - 8 * s, y - 30 * s);
  c.moveTo(x + 1 * s, y - 25 * s); c.lineTo(x + 8 * s, y - 31 * s);
  c.stroke();
  // copa: massa larga, em 3 camadas de bolhas
  const blob = (bx, by, rx, ry) => {
    c.fillStyle = color;
    c.beginPath(); c.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); c.fill();
  };
  blob(x - 12 * s, y - 34 * s, 11 * s, 7 * s);
  blob(x + 12 * s, y - 33 * s, 10 * s, 6.5 * s);
  blob(x, y - 40 * s, 15 * s, 9 * s);
  blob(x - 6 * s, y - 48 * s, 9 * s, 6 * s);
  blob(x + 7 * s, y - 47 * s, 8 * s, 5.5 * s);
  blob(x, y - 54 * s, 7 * s, 5 * s);
  // luz de borda na copa (lado do sol)
  c.strokeStyle = rim;
  c.globalAlpha = 0.5;
  c.lineWidth = 1.4;
  c.beginPath(); c.arc(x, y - 42 * s, 15 * s, -2.35, 0.45); c.stroke();
  c.beginPath(); c.arc(x + 7 * s, y - 47 * s, 8 * s, -2.2, 0.5); c.stroke();
  c.globalAlpha = 1;
}

/** Ponte de madeira com correntes penduradas (marca registrada do gênero). */
function bridge(c, x0, y0, x1, y1, sag, color) {
  c.strokeStyle = color;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  c.stroke();
  c.lineWidth = 1.5;
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const mx = x0 + (x1 - x0) * t;
    const my = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    c.beginPath(); c.moveTo(mx, my); c.lineTo(mx, my + 10 + (i % 3) * 4); c.stroke();
  }
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x0, y0 - 8);
  c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag * 0.6, x1, y1 - 8);
  c.stroke();
}

// --------------------------------------------------------------- camada 1 ---
// Céu incandescente + meio sol mergulhado no horizonte + nuvens finas.
function bakeFar() {
  const rnd = mulberry32(1077);
  const { cv, c } = bakeLayer();

  const sky = c.createLinearGradient(0, 0, 0, HORIZON + PAD);
  sky.addColorStop(0, "#150a28");
  sky.addColorStop(0.24, "#3b1440");
  sky.addColorStop(0.46, "#7c2049");
  sky.addColorStop(0.62, "#c33b41");
  sky.addColorStop(0.78, "#f4682f");
  sky.addColorStop(0.92, "#ffab4e");
  sky.addColorStop(1, "#ffd98a");
  c.fillStyle = sky;
  c.fillRect(0, 0, W, HORIZON + PAD);

  // estrelas (só na parte alta, onde o céu ainda é noite)
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * (HORIZON * 0.5);
    c.globalAlpha = (0.12 + rnd() * 0.5) * (1 - y / (HORIZON * 0.55));
    c.fillStyle = i % 7 === 0 ? "#cfe6ff" : "#fff6e8";
    const s = rnd() < 0.12 ? 2 : 1;
    c.fillRect(x, y, s, s);
  }
  c.globalAlpha = 1;

  // coroa do sol (o disco em si fica meio submerso: o mar o cobre depois)
  const halo = c.createRadialGradient(SUNX, SUNY, 10, SUNX, SUNY, 470);
  halo.addColorStop(0, "rgba(255,252,226,0.95)");
  halo.addColorStop(0.1, "rgba(255,238,172,0.82)");
  halo.addColorStop(0.24, "rgba(255,190,102,0.42)");
  halo.addColorStop(0.55, "rgba(255,134,72,0.16)");
  halo.addColorStop(1, "rgba(255,110,60,0)");
  c.fillStyle = halo;
  c.fillRect(0, 0, W, HORIZON + 40);

  c.fillStyle = "rgba(255,214,140,0.95)";
  c.beginPath(); c.arc(SUNX, SUNY, 74, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff8e0";
  c.beginPath(); c.arc(SUNX, SUNY, 60, 0, Math.PI * 2); c.fill();
  // faixas horizontais cruzando o sol (textura de pintura)
  c.fillStyle = "rgba(255,150,90,0.4)";
  for (let i = 0; i < 5; i++) {
    const yy = SUNY - 52 + i * 21 + rnd() * 5;
    c.fillRect(SUNX - 210 + rnd() * 40, yy, 420, 3 + rnd() * 5);
  }

  // nuvens: poucas, finas e alongadas (nada de \"cogumelos\" empilhados)
  for (let i = 0; i < 7; i++) {
    const cy = 34 + rnd() * (HORIZON - 210);
    const cx = rnd() * W;
    if (Math.abs(cx - SUNX) < 190 && cy > 200) continue;   // não cobrir o sol
    const s0 = 0.8 + rnd() * 1.05;
    const t = cy / HORIZON;
    const dark = t > 0.5 ? "#63203e" : "#2a1038";
    const lit = t > 0.42 ? "rgba(255,222,168,0.85)" : "rgba(255,158,130,0.4)";
    const puffs = [[-64, 3, 62, 6], [-16, -2, 70, 8], [40, 2, 54, 6], [84, 5, 34, 4], [4, 6, 88, 7]];
    for (const [dx, dy, rx, ry] of puffs) {
      c.fillStyle = dark;
      c.beginPath(); c.ellipse(cx + dx * s0, cy + dy * s0, rx * s0, ry * s0, 0, 0, Math.PI * 2); c.fill();
    }
    for (const [dx, dy, rx, ry] of puffs) {
      c.fillStyle = lit;
      c.beginPath();
      c.ellipse(cx + dx * s0, cy + (dy - ry * 0.62) * s0, rx * s0 * 0.85, ry * s0 * 0.3, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // pássaros: três bandos pequenos, longe do sol
  c.strokeStyle = "rgba(26,8,24,0.8)";
  c.lineWidth = 1.4;
  for (let i = 0; i < 11; i++) {
    const bx = 90 + rnd() * 700, by = 108 + rnd() * 150, s = 3 + rnd() * 5;
    c.beginPath();
    c.moveTo(bx - s, by);
    c.quadraticCurveTo(bx - s * 0.5, by - s * 0.8, bx, by);
    c.quadraticCurveTo(bx + s * 0.5, by - s * 0.8, bx + s, by);
    c.stroke();
  }

  // cordilheiras distantes, coladas no horizonte
  ridge(c, rnd, HORIZON - 8, 96, "#3d1740", "#ff9a52", 0.5);
  ridge(c, rnd, HORIZON - 2, 46, "#2a1030", "#ffb066", 0.35);

  return cv;
}

// --------------------------------------------------------------- camada 2 ---
// Mar, ilha da colônia (formigueiro em silhueta contra o sol) e castelo.
function bakeMid() {
  const rnd = mulberry32(2024);
  const { cv, c } = bakeLayer();

  // ---- mar incandescente
  const sea = c.createLinearGradient(0, HORIZON, 0, H + PAD);
  sea.addColorStop(0, "#ffa54c");
  sea.addColorStop(0.16, "#e8603c");
  sea.addColorStop(0.45, "#9c2a48");
  sea.addColorStop(1, "#33102f");
  c.fillStyle = sea;
  c.fillRect(0, HORIZON - 2, W, H - HORIZON + PAD);
  c.fillStyle = "rgba(255,250,222,0.9)";
  c.fillRect(0, HORIZON - 3, W, 3);

  // coluna de reflexo do sol (só na vertical do disco, sumindo com a distância)
  for (let i = 0; i < 120; i++) {
    const t = rnd() * rnd();                       // mais densa perto do horizonte
    const y = HORIZON + 3 + t * (H - HORIZON - 8);
    const len = (34 + rnd() * 210) * (1 - t * 0.5);
    const x = SUNX - len / 2 + (rnd() - 0.5) * (70 + t * 150);
    c.globalAlpha = (0.26 + rnd() * 0.5) * (1 - t * 0.65);
    c.fillStyle = rnd() < 0.45 ? "#fff0c0" : "#ffbe72";
    c.fillRect(x, y, len, 1 + rnd() * 2.4);
  }
  c.globalAlpha = 1;
  // ondulação discreta longe do reflexo
  for (let i = 0; i < 16; i++) {
    const y = HORIZON + 24 + rnd() * (H - HORIZON - 30);
    const cx = rnd() * W;
    if (Math.abs(cx - SUNX) < 190) continue;
    c.globalAlpha = 0.04 + rnd() * 0.05;
    c.fillStyle = "#2a0f2a";
    c.fillRect(cx - 70, y, 90 + rnd() * 150, 1.4);
  }
  c.globalAlpha = 1;

  // ---- montanhas/pontas distantes atrás da ilha (profundidade)
  c.fillStyle = "#4a1338";
  c.beginPath();
  c.moveTo(-40, HORIZON + 6);
  c.quadraticCurveTo(120, HORIZON - 54, 268, HORIZON + 2);
  c.quadraticCurveTo(330, HORIZON + 26, 300, HORIZON + 70);
  c.lineTo(-40, HORIZON + 70);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(255,180,110,0.5)";
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-40, HORIZON + 6);
  c.quadraticCurveTo(120, HORIZON - 54, 268, HORIZON + 2);
  c.stroke();

  // ---- ILHA DA COLÔNIA: rocha + formigueiro em silhueta
  const IX = 520;                     // centro da ilha
  const ITOP = HORIZON + 6;
  // rocha base (aterrissando no mar, com reflejo escuro)
  c.fillStyle = "#2c0c28";
  c.beginPath();
  c.moveTo(IX - 210, ITOP + 46);
  c.quadraticCurveTo(IX - 140, ITOP - 6, IX - 30, ITOP - 14);
  c.quadraticCurveTo(IX + 120, ITOP - 8, IX + 232, ITOP + 52);
  c.quadraticCurveTo(IX + 140, ITOP + 86, IX, ITOP + 92);
  c.quadraticCurveTo(IX - 130, ITOP + 88, IX - 210, ITOP + 46);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(255,170,100,0.5)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(IX - 206, ITOP + 42);
  c.quadraticCurveTo(IX - 140, ITOP - 8, IX - 30, ITOP - 16);
  c.stroke();

  // o FORMIGUEIRO: domo largo com cúpula, torre da rainha e entradas acesas
  const AY = ITOP - 12;               // linha de base do domo
  c.fillStyle = "#1d0819";
  c.beginPath();
  c.moveTo(IX - 152, AY + 30);
  c.quadraticCurveTo(IX - 132, AY - 74, IX - 34, AY - 118);
  c.quadraticCurveTo(IX + 66, AY - 152, IX + 132, AY - 62);
  c.quadraticCurveTo(IX + 168, AY - 20, IX + 156, AY + 30);
  c.closePath();
  c.fill();
  // terraços concêntricos: leem como camadas de terra empilhadas
  const terrace = (ox, oy, rx, ry, fat, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(IX - rx, AY + 26);
    c.quadraticCurveTo(IX - rx * 0.9, AY + oy - ry, IX + ox, AY + oy - ry * 1.35);
    c.quadraticCurveTo(IX + rx * 0.92, AY + oy - ry * 0.6, IX + rx * 0.95, AY + 26);
    c.closePath();
    c.fill();
    // borda superior do terraço pega luz
    c.strokeStyle = "rgba(255,196,124,0.28)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(IX - rx * 0.9, AY + oy - ry);
    c.quadraticCurveTo(IX + rx * 0.1, AY + oy - ry * 1.28, IX + rx * 0.92, AY + oy - ry * 0.6);
    c.stroke();
  };
  terrace(0, -18, 118, 62, 1, "#2a0c24");
  terrace(6, -46, 84, 42, 1, "#300e28");
  terrace(12, -70, 52, 26, 1, "#361029");
  // cúpula de cima
  c.fillStyle = "#3b122c";
  c.beginPath();
  c.moveTo(IX - 34, AY - 78);
  c.quadraticCurveTo(IX + 14, AY - 116, IX + 44, AY - 82);
  c.quadraticCurveTo(IX + 14, AY - 62, IX - 30, AY - 62);
  c.closePath();
  c.fill();
  // crista pegando a luz do sol (o topo direito, virado para o disco)
  c.strokeStyle = "rgba(255,206,132,0.95)";
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(IX - 34, AY - 118);
  c.quadraticCurveTo(IX + 66, AY - 152, IX + 132, AY - 62);
  c.quadraticCurveTo(IX + 166, AY - 18, IX + 156, AY + 30);
  c.stroke();
  // grãos de terra (textura pontilhada, sem virar ruído)
  c.fillStyle = "rgba(255,166,104,0.13)";
  for (let i = 0; i < 120; i++) {
    const ax = IX + (rnd() - 0.5) * 300;
    const t2 = (ax - (IX - 150)) / 300;
    const domeTop = AY - 118 + Math.abs(ax - IX) * 0.52;
    const py = domeTop + rnd() * (AY + 30 - domeTop);
    if (py > AY + 30) continue;
    c.fillRect(ax, py, 1 + (i % 2), 1);
  }

  // torre da rainha (deslocada do centro, mais orgânica)
  tower(c, IX - 44, AY - 96, 30, 78, "#1a0716", { spire: 32, flagColor: "#ffd479" });

  // entradas dos túneis: arco em pedra + brasa interna
  const gate = (gx, gy, r) => {
    // halo curto (luz escapando do túnel)
    const g = c.createRadialGradient(gx, gy, 1, gx, gy, r * 1.5);
    g.addColorStop(0, "rgba(255,186,110,0.5)");
    g.addColorStop(0.5, "rgba(255,132,64,0.16)");
    g.addColorStop(1, "rgba(255,120,60,0)");
    c.fillStyle = g;
    c.beginPath(); c.ellipse(gx, gy, r * 1.5, r * 1.3, 0, 0, Math.PI * 2); c.fill();
    // arco de pedra
    c.fillStyle = "#1a0716";
    c.beginPath();
    c.moveTo(gx - r * 1.35, gy + r * 0.95);
    c.lineTo(gx - r * 1.35, gy - r * 0.1);
    c.quadraticCurveTo(gx, gy - r * 1.5, gx + r * 1.35, gy - r * 0.1);
    c.lineTo(gx + r * 1.35, gy + r * 0.95);
    c.closePath();
    c.fill();
    // boca do túnel (escura) com brasa no fundo
    c.fillStyle = "#0a020a";
    c.beginPath();
    c.moveTo(gx - r, gy + r * 0.8);
    c.lineTo(gx - r, gy - r * 0.2);
    c.quadraticCurveTo(gx, gy - r * 1.15, gx + r, gy - r * 0.2);
    c.lineTo(gx + r, gy + r * 0.8);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,196,110,0.85)";
    c.beginPath();
    c.ellipse(gx, gy + r * 0.3, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
    c.fill();
  };
  gate(IX + 64, AY + 10, 13);
  gate(IX - 116, AY + 20, 9);
  gate(IX + 2, AY + 34, 7);

  // ---- agulhas de rocha saindo do mar (marco do litoral)
  const needle = (nx, nbase, nh, nw) => {
    c.fillStyle = "#170513";
    c.beginPath();
    c.moveTo(nx - nw, nbase);
    c.quadraticCurveTo(nx - nw * 0.35, nbase - nh * 0.7, nx, nbase - nh);
    c.quadraticCurveTo(nx + nw * 0.4, nbase - nh * 0.6, nx + nw, nbase);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(255,176,100,0.4)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(nx - nw * 0.5, nbase - nh * 0.55);
    c.quadraticCurveTo(nx - nw * 0.1, nbase - nh * 0.95, nx, nbase - nh);
    c.stroke();
    c.globalAlpha = 0.28;
    c.fillStyle = "#ffb070";
    c.fillRect(nx - nw * 1.5, nbase + 1, nw * 3, 2);
    c.globalAlpha = 1;
  };
  needle(268, HORIZON + 52, 46, 12);
  needle(296, HORIZON + 62, 26, 8);
  needle(818, HORIZON + 78, 34, 10);

  // ---- CASTELO-FORMIGUEIRO na ponta direita (silhueta + janelas acesas)
  const base = HORIZON + 34;
  c.fillStyle = "#200a1c";
  c.beginPath();
  c.moveTo(760, base + 26);
  c.quadraticCurveTo(812, base - 44, 872, base - 52);
  c.quadraticCurveTo(950, base - 40, 1000, base + 34);
  c.lineTo(1000, H + 40);
  c.lineTo(760, H + 40);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(255,170,100,0.42)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(762, base + 22);
  c.quadraticCurveTo(812, base - 46, 872, base - 54);
  c.stroke();
  tower(c, 800, base - 44, 20, 68, "#160614", { spire: 22, flagColor: "#ff7a3d" });
  tower(c, 848, base - 58, 15, 104, "#120512", { spire: 30, flagColor: "#ffd479" });
  tower(c, 900, base - 40, 24, 58, "#160614", { spire: 18, flagColor: "#37e6c8" });
  bridge(c, 812, base - 96, 842, base - 128, 10, "#0d0310");
  c.fillStyle = "#120512";
  c.fillRect(792, base - 40, 130, 40);
  for (let x = 794; x < 922; x += 14) c.fillRect(x, base - 47, 8, 8);

  // ---- árvores retorcidas nas duas pontas
  tree(c, 116, HORIZON + 40, 1.7, "#1b0617", "rgba(255,176,96,0.75)");
  tree(c, 196, HORIZON + 58, 1.15, "#160513", "rgba(255,170,90,0.55)");
  tree(c, 690, HORIZON + 44, 1.35, "#1b0617", "rgba(255,176,96,0.65)");
  tree(c, 944, HORIZON + 62, 1.55, "#160513", "rgba(255,150,80,0.45)");

  // ---- pontes penduradas sobre o mar
  bridge(c, 176, HORIZON + 6, 300, HORIZON + 24, 18, "#12040f");
  bridge(c, 702, HORIZON + 2, 764, HORIZON + 26, 16, "#12040f");
  const lamp = (lx, ly) => {
    c.fillStyle = "#12040f";
    c.fillRect(lx - 2, ly - 16, 4, 16);
    const g = c.createRadialGradient(lx, ly, 1, lx, ly, 30);
    g.addColorStop(0, "rgba(255,206,120,0.85)");
    g.addColorStop(1, "rgba(255,150,60,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(lx, ly, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe3a8";
    c.fillRect(lx - 3, ly - 6, 6, 8);
  };
  lamp(196, HORIZON + 4); lamp(286, HORIZON + 22); lamp(712, HORIZON); lamp(758, HORIZON + 24);

  // ---- barquinho + pedras no mar
  c.fillStyle = "#160511";
  c.beginPath();
  c.moveTo(880, HORIZON + 106); c.lineTo(928, HORIZON + 106);
  c.lineTo(916, HORIZON + 120); c.lineTo(890, HORIZON + 120);
  c.closePath(); c.fill();
  c.fillRect(902, HORIZON + 62, 2, 44);
  c.beginPath();
  c.moveTo(904, HORIZON + 64); c.lineTo(932, HORIZON + 98); c.lineTo(904, HORIZON + 98);
  c.closePath(); c.fill();
  c.globalAlpha = 0.3;
  c.fillStyle = "#ffbe72";
  c.fillRect(882, HORIZON + 124, 46, 2);
  c.globalAlpha = 1;
  c.fillStyle = "#1d0818";
  for (let i = 0; i < 11; i++) {
    const rx = rnd() * W, ry = HORIZON + 74 + rnd() * 118, r = 3 + rnd() * 11;
    if (Math.abs(rx - 520) < 235 && ry < HORIZON + 128) continue;   // fora da ilha
    if (Math.abs(rx - 268) < 70 || Math.abs(rx - 818) < 60) continue;
    c.beginPath(); c.ellipse(rx, ry, r, r * 0.42, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,200,140,0.22)";
    c.fillRect(rx - r * 0.7, ry - r * 0.35, r * 1.4, 1.4);
    c.fillStyle = "#1d0818";
  }

  // ---- névoa baixa em faixas (une as camadas)
  for (let i = 0; i < 7; i++) {
    const y = HORIZON - 26 + i * 30;
    const g = c.createLinearGradient(0, y, 0, y + 30);
    g.addColorStop(0, "rgba(255,176,126,0)");
    g.addColorStop(0.5, `rgba(255,186,136,${0.1 - i * 0.009})`);
    g.addColorStop(1, "rgba(255,176,126,0)");
    c.fillStyle = g;
    c.fillRect(0, y, W, 30);
  }
  return cv;
}

// --------------------------------------------------------------- camada 3 ---
// Primeiro plano: chão em silhueta, capim, rochas, cristais e vinhas.
function bakeFore() {
  const rnd = mulberry32(7);
  const { cv, c } = bakeLayer();

  const groundY = (x) => H - 76 + Math.sin(x * 0.006) * 15 + Math.sin(x * 0.017 + 2) * 7;
  c.fillStyle = "#11040f";
  c.beginPath();
  c.moveTo(-40, H + 40);
  c.lineTo(-40, groundY(-40));
  for (let x = -40; x <= W + 40; x += 24) c.lineTo(x, groundY(x));
  c.lineTo(W + 40, H + 40);
  c.closePath();
  c.fill();
  // luz rasante na borda do chão
  c.strokeStyle = "rgba(255,150,80,0.32)";
  c.lineWidth = 2;
  c.beginPath();
  for (let x = -40; x <= W + 40; x += 24) {
    if (x === -40) c.moveTo(x, groundY(x)); else c.lineTo(x, groundY(x));
  }
  c.stroke();

  // tufos de capim agrupados
  for (let i = 0; i < 86; i++) {
    const x = -30 + rnd() * (W + 60);
    const gy = groundY(x) + 4 + rnd() * 10;
    const n = 2 + ((rnd() * 3.99) | 0);
    for (let b = 0; b < n; b++) {
      const bx = x + (b - n / 2) * 4 + rnd() * 2;
      const h = 6 + rnd() * 22;
      const lean = (rnd() - 0.5) * 5;
      c.strokeStyle = "#0b020c";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx, gy);
      c.quadraticCurveTo(bx + lean * 0.5, gy - h * 0.6, bx + lean, gy - h);
      c.stroke();
      if (h > 18) {
        c.strokeStyle = "rgba(255,178,96,0.45)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(bx + lean * 0.6, gy - h * 0.72);
        c.lineTo(bx + lean, gy - h);
        c.stroke();
      }
    }
  }

  // rochas/arbustos de primeiro plano
  for (let i = 0; i < 18; i++) {
    const bx = -20 + rnd() * (W + 40);
    const gy = groundY(bx) + 8 + rnd() * 14;
    const r = 8 + rnd() * 24;
    c.fillStyle = "#0a010b";
    c.beginPath(); c.ellipse(bx, gy, r, r * 0.5, 0, 0, Math.PI * 2); c.fill();
    if (r > 19) {
      c.fillStyle = "rgba(255,170,90,0.16)";
      c.beginPath(); c.ellipse(bx + r * 0.25, gy - r * 0.3, r * 0.5, r * 0.15, 0, 0, Math.PI * 2); c.fill();
    }
  }

  // cristais com luz interna (assinatura Fumiga)
  const spike = (sx, sy, s, glow) => {
    c.fillStyle = "#150515";
    c.beginPath();
    c.moveTo(sx - 8 * s, sy);
    c.lineTo(sx, sy - 48 * s);
    c.lineTo(sx + 8 * s, sy);
    c.closePath();
    c.fill();
    c.fillStyle = glow;
    c.beginPath();
    c.moveTo(sx - 3 * s, sy - 3 * s);
    c.lineTo(sx, sy - 36 * s);
    c.lineTo(sx + 1.5 * s, sy - 3 * s);
    c.closePath();
    c.fill();
  };
  spike(96, groundY(96) + 6, 1.5, "rgba(199,125,255,0.55)");
  spike(132, groundY(132) + 10, 0.95, "rgba(199,125,255,0.35)");
  spike(846, groundY(846) + 4, 1.8, "rgba(55,230,200,0.5)");
  spike(896, groundY(896) + 10, 1.1, "rgba(55,230,200,0.32)");
  spike(760, groundY(760) + 14, 0.8, "rgba(255,180,90,0.4)");

  // vinhas penduradas nos cantos (enquadramento)
  const vine = (vx, len, s2) => {
    c.strokeStyle = "#09020c";
    c.lineWidth = 4 * s2;
    c.beginPath();
    c.moveTo(vx, -20);
    c.quadraticCurveTo(vx + 26 * s2, len * 0.45, vx - 10 * s2, len);
    c.stroke();
    c.lineWidth = 2 * s2;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const px = vx + 26 * s2 * (t - t * t) - 10 * s2 * t * t;
      const py = -20 + len * t;
      c.fillStyle = "#0d0310";
      c.beginPath(); c.ellipse(px, py, 9 * s2, 4 * s2, 0.5 - t, 0, Math.PI * 2); c.fill();
      if (i % 2 === 0) {
        c.strokeStyle = "#09020c";
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + 6 * s2, py + 14 * s2); c.stroke();
      }
    }
  };
  vine(36, 216, 1.15);
  vine(922, 172, 1.0);
  return cv;
}

export function bakeTitleBg() {
  far = bakeFar();
  mid = bakeMid();
  fore = bakeFore();
}

/** Desenha as três camadas com paralaxe + respiração lenta. */
export function drawTitleBg(ctx, time = 0) {
  if (!far) bakeTitleBg();
  const kx = Math.sin(time * 0.09) * 7, ky = Math.sin(time * 0.13) * 3;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(far, -PAD + kx * 0.35, -PAD + ky * 0.3, W, H);
  ctx.drawImage(mid, -PAD + kx, -PAD + ky * 0.75, W, H);
  ctx.drawImage(fore, -PAD + kx * 1.7, -PAD + ky * 1.2, W, H);
}

/** Brasas, vagalumes, névoa em movimento e brilho do sol (por cima da arte). */
export function drawTitleMotes(ctx, time) {
  // brasas subindo
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const seed = i * 37.7;
    const x = (seed * 61 + time * (10 + (i % 5) * 6)) % VIEW_W;
    const y = 540 - ((seed * 29 + time * (16 + (i % 3) * 9)) % 560);
    const a = 0.12 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.9 + i));
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 3 ? "#ffb84a" : "#ffe6b0";
    const r = 1 + (i % 3) * 0.8;
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();

  // vagalumes ao redor do formigueiro
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 12; i++) {
    const px = 520 + Math.sin(time * (0.22 + i * 0.013) + i) * (80 + (i % 4) * 34);
    const py = 306 + Math.cos(time * (0.31 + i * 0.011) + i * 2) * (44 + (i % 3) * 22);
    const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 2.4 + i * 1.7));
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 4 === 0 ? "#8ff2d8" : "#d8ff9a";
    ctx.fillRect(px, py, 2, 2);
    ctx.globalAlpha = a * 0.35;
    ctx.fillRect(px - 2, py - 2, 6, 6);
  }
  ctx.restore();

  // névoa em movimento na base
  for (let band = 0; band < 2; band++) {
    const off = ((time * (band ? -11 : 17)) % (VIEW_W + 300)) - 150;
    const y = 366 + band * 46;
    const g = ctx.createLinearGradient(0, y, 0, y + 60);
    g.addColorStop(0, "rgba(255,190,140,0)");
    g.addColorStop(0.5, `rgba(255,196,150,${band ? 0.05 : 0.075})`);
    g.addColorStop(1, "rgba(255,190,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(off - 200, y, VIEW_W + 400, 60);
  }
}
