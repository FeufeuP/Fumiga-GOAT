// ============================================================================
// FUMIGA — TUTORIAL DINÂMICO V2: cartões refinados estilo Dead Cells
// ============================================================================
import { G, persistSave } from "./state.js";
import { PAL } from "./config.js";
import { drawText, fitTextBlock, fontScale, layoutBox } from "./font.js";
import { drawPaper, paperQuiet, beginPaperHud, endPaperHud } from "./paper_hud.js";
import { clamp, TAU } from "./utils.js";
import { panel, pointInRect } from "./ui.js";
import { uiButtons } from "./ui.js";
import { mouse, touchMode } from "./input.js";
import { SFX } from "./audio.js";

// MOBILE: com a camada de toque ativa, os cartões falam a língua dos gestos
function stepDesc(st) {
  return touchMode.on && st.descTouch ? st.descTouch : st.desc;
}

let events = Object.create(null);

export function tutEvent(name, data) {
  events[name] = (events[name] || 0) + 1;
  if (TUT.active && TUT.steps[TUT.idx] && TUT.steps[TUT.idx].on) {
    TUT.steps[TUT.idx].on(name, data);
  }
}

export const TUT = {
  active: false,
  idx: 0,
  t: 0,
  done: false,
  camAccum: 0,
  steps: [],
};

const STEP_DEFS = [
  {
    id: "cam", title: "EXPLORE O MAPA", icon: "i_bolt",
    desc: "Arraste com o BOTÃO ESQUERDO para mover a câmera. WASD também funciona.",
    descTouch: "ARRASTE com 1 dedo para mover a câmera. Faça PINÇA para dar zoom.",
    on() {},
  },
  {
    id: "select", title: "SELECIONE FORMIGAS", icon: "i_spider",
    desc: "Arraste com o BOTÃO DIREITO ao redor das operárias para selecioná-las.",
    descTouch: "TOQUE numa operária para selecioná-la. Arraste com 2 DEDOS para selecionar várias.",
    on(name) { if (name === "selected") TUT._done = true; },
  },
  {
    id: "gather", title: "ORDENE A COLETA", icon: "i_food",
    desc: "Com unidades selecionadas, clique com o BOTÃO ESQUERDO na comida.",
    descTouch: "Com formigas selecionadas, TOQUE na comida para ordenar a coleta.",
    on(name) { if (name === "gatherOrder" || name === "deposit") TUT._done = true; },
  },
  {
    id: "hatch", title: "CHOQUE NOVAS FORMIGAS", icon: "i_egg",
    desc: "Aperte 6 para chocar uma CORTADEIRA. Ela nasce no formigueiro.",
    descTouch: "Abra a LOJA (botão do carrinho) e TOQUE no card da CORTADEIRA para chocá-la.",
    on(name) { if (name === "buy") TUT._done = true; },
  },
  {
    id: "army", title: "FORME A GUARDA", icon: "i_shield",
    desc: "Choque uma FORMIGA-BALA (tecla 1) e aperte F para convocar a guarda.",
    descTouch: "Choque uma FORMIGA-BALA na loja e toque no botão RALI para convocar a guarda.",
    on(name, data) {
      if (name === "rally") { TUT._done = true; return; }
      if (name === "buy" && data && data !== "worker") TUT._done = true;
    },
  },
  {
    id: "wave", title: "DEFENDA A RAINHA!", icon: "i_fire_sword",
    desc: "A primeira invasão chegou. Sobreviva com sua colônia.",
    on(name) { if (name === "waveStart") TUT._done = true; },
  },
  {
    id: "essence", title: "A MOEDA DA EVOLUÇÃO", icon: "i_essence",
    desc: "Cristais roxos dão ESSÊNCIA. Ela compra melhorias eternas na árvore.",
    on(name) { if (name === "essence" || name === "waveEnd") TUT._done = true; },
  },
];

export function startTutorial() {
  events = Object.create(null);
  TUT.active = true;
  TUT.done = false;
  TUT.idx = 0;
  TUT.t = 0;
  TUT.camAccum = 0;
  TUT._done = false;
  TUT.steps = STEP_DEFS;
}

export function stopTutorial(markDone) {
  TUT.active = false;
  if (markDone !== false) {
    G.save.tutorial = 1;
    persistSave();
  }
}

export function tutorialFinished() { return TUT.done; }

function advance() {
  TUT.idx++;
  TUT.t = 0;
  TUT._done = false;
  if (TUT.idx >= TUT.steps.length) {
    TUT.done = true;
    stopTutorial(true);
  }
}

export function updateTutorial(dt, run) {
  if (!TUT.active || !run || run.mapIdx !== 0) return;
  TUT.t += dt;

  const st = TUT.steps[TUT.idx];
  if (!st) return;

  if (st.id === "cam" && (TUT.camAccum > 420 || TUT.t > 16)) TUT._done = true;
  if (st.id === "select" && TUT.t > 60) TUT._done = true;
  if (st.id === "wave" && run.wave >= 1) TUT._done = true;
  if (st.id === "essence" && run.wave >= 2) TUT._done = true;

  if (TUT._done) {
    if (TUT.t > 0.5) advance();
    else TUT.t = 0.51;
  }
}

const CARD_W = 285;
// Geometria FIXA compacta (2026-10-16, HUDs bordas finas): 285×152 = proporção
// ORIGINAL da pintura panel (960×512 = 1,875) com redução de ~41% de área na tela.
const CARD_H = 152;
const CARD_Y = 68;
// Com FONTE GRANDE (acessibilidade) a tinta do título e das linhas cresce 30%:
// as alturas saem de medidas reais, senão o título invade a 1ª linha e as
// linhas se encostam dentro do cartão.
function cardSteps() {
  const FS = fontScale();
  return {
    FS,
    titleAdv: Math.ceil(20 * FS),          // tinta do título (big escala 1)
    descStep: Math.ceil(14 * FS) + 5,      // passo entre as linhas da descrição
    bottom: Math.ceil(24 * FS),            // rodapé PASSO n/n + botão PULAR
  };
}
function cardMetrics(st) {
  return { w: CARD_W, h: CARD_H };
}

export function tutorialCardRect(VIEW_W) {
  if (!TUT.active) return null;
  const st = TUT.steps[TUT.idx];
  if (!st) return null;
  const m = cardMetrics(st);
  // Centralizado entre o painel compacto da colônia (8..278) e o minimapa (786..954).
  const x = Math.max(Math.round((VIEW_W - m.w) / 2), 286);
  return { x, y: CARD_Y, w: m.w, h: m.h };
}

export function drawTutorial(ctx, VIEW_W) {
  const st = TUT.steps[TUT.idx];
  if (!TUT.active || !st) return;
  const { x, w, h, y: yRest } = tutorialCardRect(VIEW_W);
  const yIn = clamp((TUT.t) / 0.5, 0, 1);
  const yStart = -h - 12;
  const y = yStart + (yRest - yStart) * (1 - Math.pow(1 - yIn, 3));

  ctx.globalAlpha = clamp(TUT.t / 0.25, 0, 1);

  // HUD exclusivo "tutorial" em 3 camadas: 1º Fundo -> 2º Texto (clipado) -> 3º Moldura
  layoutBox(ctx, "painel", x, y, w, h);
  const clipped = beginPaperHud(ctx, "tutorial", x, y, w, h);
  if (!clipped) {
    panel(ctx, x, y, w, h, {
      paperKind: "tutorial",
      deferFrame: false,
      fill: "rgba(0,0,0,0)",
      border: TUT._done ? "#647d43" : "#6b471e",
      r: 6,
    });
  }

  // 100% dos textos e do botão PULAR ficam dentro da ÁREA PERMITIDA (qT),
  // usando placa de madeira para o botão (decisão do usuário 2026-10-16).
  const qT = paperQuiet("tutorial", x, y, w, h);
  const tCx = qT.x + qT.w / 2;
  const footH = 19;
  const titleTxt = (TUT._done ? "✓ " : "") + st.title;
  const titleBlock = fitTextBlock(titleTxt, qT.w, 20, { font: "small", scale: 0.78, minScale: 0.48, lineStep: 14, maxLines: 1 });
  const descY0 = Math.round(qT.y + 16 * fontScale());
  const descBlock = fitTextBlock(stepDesc(st), qT.w, Math.max(16, qT.y + qT.h - footH - 2 - descY0), { scale: 0.68, minScale: 0.44, lineStep: 14 });
  titleBlock.lines.forEach((L, li) => drawText(ctx, L, tCx, qT.y + li * titleBlock.step,
    { font: "small", scale: titleBlock.scale, color: TUT._done ? "#456032" : "#6b471e", align: "center", maxWidth: qT.w }));
  descBlock.lines.forEach((L, li) => drawText(ctx, L, tCx, descY0 + li * descBlock.step,
    { color: PAL.text, scale: descBlock.scale, align: "center", maxWidth: qT.w }));

  const bw = 88, bh = 18;
  const bx = Math.round(qT.x + qT.w - bw), by = Math.round(qT.y + qT.h - bh);
  drawText(ctx, "PASSO " + (TUT.idx + 1) + "/" + TUT.steps.length, qT.x, by + 3,
    { color: PAL.textDim, scale: Math.min(0.65, 11 / (16 * fontScale())), align: "left", maxWidth: qT.w - bw - 6 });

  const hot = pointInRect(mouse.x, mouse.y, bx, by, bw, bh);
  drawPaper(ctx, "button", bx, by, bw, bh, { hot, pressed: hot && mouse.down });
  drawText(ctx, "PULAR (T)", bx + bw / 2, by + 3, { color: "#f6ecd4", align: "center", scale: Math.min(0.62, 10 / (16 * fontScale())), maxWidth: bw - 14 });
  if (clipped) endPaperHud(ctx);
  uiButtons().push({ x: bx, y: by, w: bw, h: bh, id: "tutSkip" });
  if (hot && mouse.justDown) {
    SFX.uiClick();
    stopTutorial(true);
  }
  ctx.globalAlpha = 1;
}
