// ============================================================================
// FUMIGA-GOAT — Tela de Carregamento Tematica estilo Dead Cells
// Arte panoramica sombria, iluminacao volumetrica, lore da colonia e dicas
// Suporta carregamento assincrono de assets/mecanicas pesadas com cache
// ============================================================================
import { VIEW_W, VIEW_H, PAL, MAPS } from "./config.js";
import { drawText, textWidth, fontScale } from "./font.js";
import { SFX } from "./audio.js";
import { G } from "./state.js";
import { button } from "./ui.js";
import { assetUrl, loadImage, LOAD_CFG } from "./assets.js";
// PLAYTEST: falha de tarefa essencial entra no diário de campo (A8).
import { ptEvento } from "./playtest.js";

// Cache de imagens de carregamento por bioma (apenas arquivos existentes em assets/loading/)
const LOADING_CACHE = new Map();
const LOADING_IMAGE_FILES = {
  planicie: "planicie",
  floresta: "floresta",
  pantano: "floresta",
  deserto: "planicie",
  outono: "floresta",
  gelo: "planicie",
  palida: "floresta",
  topo: "floresta",
};

/**
 * Carrega a arte tematica da tela de carregamento para o bioma solicitado
 * sem gerar requisicoes 404 para biomas que compartilham a base panoramica.
 */
export function loadLoadingImage(biome = "planicie") {
  const fileKey = LOADING_IMAGE_FILES[biome] || "planicie";
  if (LOADING_CACHE.has(fileKey)) return LOADING_CACHE.get(fileKey);

  const loadingPromise = (async () => {
    let img = null;
    const path = `assets/loading/loading_${fileKey}.png`;
    for (let a = 0; a < LOAD_CFG.attempts && !img; a++) {
      try {
        img = await loadImage(assetUrl(path) + (a ? `&r=${a}` : ""));
      } catch (e) {
        img = null;
      }
    }
    return img;
  })();

  LOADING_CACHE.set(fileKey, loadingPromise);
  loadingPromise.catch(() => {
    if (LOADING_CACHE.get(fileKey) === loadingPromise) LOADING_CACHE.delete(fileKey);
  });
  return loadingPromise;
}

// Definicoes tematicas para todos os 6 biomas + telas ancestrais estilo Dead Cells
const BIOME_LORE = {
  planicie: {
    degrau: "DEGRAU I",
    title: "PLANÍCIE DO AMANHECER",
    subtitle: "ONDE A COLÔNIA APRENDEU A CORTAR SOB A NÉVOA MATINAL",
    lores: [
      "A COLÔNIA NÃO MIGRA. ELA SE LEMBRA DE OUTRO LUGAR.",
      "CADA FORMIGA CARREGA UM MAPA QUE NUNCA DESENHOU.",
      "A RAINHA SILENCIOSA NÃO FALA. ELA DEIXA RASTRO DE FEROMÔNIO.",
      "NA GRAMA ALTA, O ORVALHO REFLETE SOMBRAS DE PREDADORES ANCESTRAIS.",
    ],
    tips: [
      "DICA: CORTADEIRA CEIFA FOLHAS EM DOBRO PARA ALIMENTAR O NINHO.",
      "DICA: POTE-DE-MEL GUARDA RESERVA VIVA DE AÇÚCAR PARA O INVERNO.",
      "DICA: SEGURE H PARA REVELAR TRILHAS INVISÍVEIS DE FEROMÔNIO.",
      "DICA: BATEDORAS EXPLORAM ALÉM DA BRUMA E EXPANDEM A VISÃO.",
    ],
    accent: "#37e6c8",
    secondary: "#ffd479",
    tint: null,
  },
  floresta: {
    degrau: "DEGRAU II",
    title: "FLORESTA DE MUSGO",
    subtitle: "ÁRVORES ANTIGAS GUARDAM SEGREDOS — E PREDADORES",
    lores: [
      "O MUSGO É CAMA E TETO. A TECELÃ COSTURA ENTRE RAÍZES.",
      "A CAÇADORA ASTUTA APRENDEU O CHEIRO DE RAINHA HÁ CEM GERAÇÕES.",
      "CADA ÁRVORE TEM UM ANEL. CADA ANEL É UMA GUERRA VENCIDA.",
      "QUANDO O VENTO CESSA NA COPA, É PORQUE ELA ESTÁ CHEGANDO.",
    ],
    tips: [
      "DICA: TECELÃ CRIA TÚNEIS DE SEDA QUE ACELERAM SUAS IRMÃS.",
      "DICA: PRATA CORRE MAIS RÁPIDO QUE O VENTO. USE PARA EXPLORAR.",
      "DICA: NA FASE 2, A CAÇADORA SOME NA NÉVOA. OUÇA OS PASSOS.",
      "DICA: SEDA MARCA O RETORNO QUANDO AS TRILHAS SE PERDEM.",
    ],
    accent: "#7fd6a0",
    secondary: "#ffd479",
    tint: null,
  },
  pantano: {
    degrau: "DEGRAU III",
    title: "PÂNTANO PÚTRIDO",
    subtitle: "ÁGUAS PARADAS, INSETOS GORDOS E FOME VELHA",
    lores: [
      "O BREJO É A BOCA DA NÉVOA. ATRAVESSEM DEPRESSA, IRMÃS.",
      "A SOMBRA ALADA MERGULHA SEM AVISO. ATÉ A NÉVOA RECUA DAQUI.",
      "ELA É PROTO-PÁLIDA: ASAS DE BRUMA E OLHOS DE MEMÓRIA.",
      "NAS ÁGUAS TURVAS, APENAS O CHEIRO DA SEDA GUARDA O CAMINHO.",
    ],
    tips: [
      "DICA: MATABELE CURA EM DOBRO QUANDO UMA IRMÃ ESTÁ FERIDA.",
      "DICA: NA FASE 2, O GRITO DA SOMBRA INVERTE OS CONTROLES POR UM INSTANTE.",
      "DICA: MANTENHA AS ATIRADORAS ESPALHADAS CONTRA OS MERGULHOS RASANTES.",
      "DICA: CRISTAIS DO PÂNTANO GUARDAM MEMÓRIA ANTIGA DA COLÔNIA.",
    ],
    accent: "#37e6c8",
    secondary: "#8fd3ff",
    tint: "rgba(18, 46, 44, 0.36)",
  },
  deserto: {
    degrau: "DEGRAU IV",
    title: "DESERTO CALCINADO",
    subtitle: "AREIA, OSSOS E O ZUMBIDO DE UMA COLÔNIA RIVAL",
    lores: [
      "A AREIA GUARDA UM TRATO ANTIGO: FILHAS EM TROCA DE PERDÃO.",
      "A MATRIARCA RIVAL BEIJOU A NÉVOA PARA SOBREVIVER NO CALOR.",
      "A COLÔNIA RIVAL NÃO É INIMIGA — É O ESPELHO DO QUE PODEMOS VIRAR.",
      "SOB O SOL DE ÂMBAR, CADA GRÃO DE SEMENTE VALE UMA VIDA.",
    ],
    tips: [
      "DICA: CEFALOTE BLOQUEIA TÚNEIS COM A CABEÇA E REDUZ O DANO PERTO DO NINHO.",
      "DICA: NA FASE 2, A MATRIARCA COSPE EM CINCO DIREÇÕES. NÃO AGRUPE.",
      "DICA: FORMIGA-PRATA ATRAVESSA AS DUNAS COM ARRANCADAS RELÂMPAGO.",
      "DICA: EVOLUA O VENTRE DE ÂMBAR PARA MULTIPLICAR CADA ENTREGA DE COMIDA.",
    ],
    accent: "#ffb347",
    secondary: "#ffd479",
    tint: "rgba(68, 42, 16, 0.38)",
  },
  outono: {
    degrau: "DEGRAU V",
    title: "BOSQUE DOURADO",
    subtitle: "UM OUTONO ETERNO. AS FOLHAS CAEM; A FOME NÃO",
    lores: [
      "O ÚLTIMO VERDE ANTES DO INVERNO PATRULHA EM FORMAÇÃO.",
      "O GALHADA REAL GUARDA O BOSQUE. A COROA COBRA UM REINO.",
      "ELE NÃO QUER LUTAR — ELE QUER QUE O BOSQUE LEMBRE DELE.",
      "CADA FOLHA DOURADA QUE CAI ALIMENTA AS RAÍZES DA ÁRVORE ANCESTRAL.",
    ],
    tips: [
      "DICA: ACROBATA ERGUE O GASTER E BORRIFA VENENO QUE CORRÓI COM O TEMPO.",
      "DICA: FORMIGA-DE-FOGO INCENDEIA GRUPOS INTEIROS COM BRASA CONTÍNUA.",
      "DICA: AFASTE AS OPERÁRIAS QUANDO O GALHADA REAL PREPARAR A INVESTIDA.",
      "DICA: USE O RALI (F) PARA REAGRUPAR A GUARDA AO REDOR DA RAINHA.",
    ],
    accent: "#ff9a5c",
    secondary: "#ffd479",
    tint: "rgba(64, 32, 14, 0.36)",
  },
  gelo: {
    degrau: "DEGRAU VI",
    title: "PICO CONGELADO",
    subtitle: "O TOPO DO MUNDO, ONDE SÓ A FOME SOBREVIVE",
    lores: [
      "O FRIO É SÓ O HÁLITO DELA. A NÉVOA SUBIU JUNTO ATÉ O CUME.",
      "O DEVASTADOR É O ARAUTO DO INVERNO. ELE ABRE CAMINHO PARA ELA.",
      "SE VENCER AQUI, A COLÔNIA ATRAVESSOU OS SEIS DEGRAUS DO MUNDO.",
      "NO ALTO DO PICO, A NÉVOA NUNCA MORRE — ELA ESPERA POR QUEM LEMBRA.",
    ],
    tips: [
      "DICA: DINOPONERA É O COLOSSO DA COLÔNIA — ATRAI A HORDA E ESMAGA A MATA.",
      "DICA: QUEIXO-DE-ARPÃO EXECUTA INIMIGOS FERIDOS COM GOLPES EM RAJADA.",
      "DICA: O DEVASTADOR ESMAGA OBSTÁCULOS E SALTA SOBRE AGLOMERAÇÕES.",
      "DICA: PROTEJA A RAINHA SILENCIOSA A TODO CUSTO NO CERCO FINAL.",
    ],
    accent: "#e8f4ff",
    secondary: "#7fd6ff",
    tint: "rgba(22, 34, 58, 0.42)",
  },
  palida: {
    degrau: "MEMÓRIA ANCESTRAL",
    title: "ÁRVORE DA EVOLUÇÃO",
    subtitle: "ONDE AS MEMÓRIAS DA COLÔNIA SE TORNAM ETERNAS",
    lores: [
      "ELA NÃO É INIMIGA. É A MEMÓRIA QUE A COLÔNIA ESQUECEU.",
      "A ÁRVORE ANCESTRAL GUARDA EM SUAS RAÍZES CADA GERAÇÃO QUE PASSOU.",
      "QUANDO A COLÔNIA LEMBRAR, A BRUMA SE ABRE E VIRA SEMENTE.",
    ],
    tips: [
      "DICA: DESPERTE OS FRUTOS DA COPA VENCENDO OS CHEFÕES DE CADA BIOMA.",
      "DICA: CADA NÓ EVOLUÍDO RESTAURA A COR VIVA DA ÁRVORE ANCESTRAL.",
      "DICA: CUMPRIR PROFECIAS DA MATRIARCA CONCEDE ESSÊNCIA PERMANENTE.",
    ],
    accent: "#ffb347",
    secondary: "#ffd479",
    tint: "rgba(38, 20, 62, 0.38)",
  },
};

// Estado da tela de carregamento ativa
let activeLoading = null;

// Particulas atmosfericas visuais da tela de carregamento
const spores = [];
function resetSpores() {
  spores.length = 0;
  for (let i = 0; i < 28; i++) {
    spores.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 16,
      vy: -12 - Math.random() * 26,
      size: 1 + Math.random() * 2.5,
      alpha: 0.2 + Math.random() * 0.6,
      pulse: Math.random() * 6.28,
      color: Math.random() > 0.4 ? "#37e6c8" : (Math.random() > 0.5 ? "#7fd6a0" : "#ffd479"),
    });
  }
}

/**
 * Pré-carrega telas de carregamento em background para que abram instantaneamente
 */
export function preloadLoadingScreens(biomes = ["planicie", "floresta"]) {
  for (const b of biomes) {
    loadLoadingImage(b).catch(() => {});
  }
}

/**
 * Inicia a exibicao da tela de carregamento tematica estilo Dead Cells
 */
export function startLoadingScreen({
  biome = "planicie",
  degrau = null,
  title = null,
  subtitle = null,
  task = null,
  minDuration = 1.6,
  autoAdvance = false,
  onFinish = null,
  onCancel = null,
} = {}) {
  const info = BIOME_LORE[biome] || BIOME_LORE.planicie;
  const loreText = info.lores[Math.floor(Math.random() * info.lores.length)];
  const tipText = info.tips[Math.floor(Math.random() * info.tips.length)];

  resetSpores();

  // Regra 14: a tela de carregamento entra com opacidade 1.0 imediata para ocultar
  // qualquer geracao de mundo, troca de tela ou carga pesada; a tarefa pesada roda
  // apos o primeiro quadro pintado da tela de carregamento.
  activeLoading = {
    biome,
    info,
    degrau: degrau || info.degrau || "DEGRAU I",
    title: title || info.title,
    subtitle: subtitle || info.subtitle,
    lore: loreText,
    tip: tipText,
    progress: 0,
    targetProgress: 0.18,
    statusText: "PREPARANDO TERRENO...",
    timer: 0,
    minDuration: Math.max(0.8, minDuration),
    phase: "active", // active -> ready -> fadeout -> done; error -> retry/cancel
    alpha: 1,
    framesRendered: 0,
    taskFn: typeof task === "function" ? task : null,
    taskStarted: false,
    taskDone: typeof task !== "function",
    imageLoaded: false,
    taskError: null,
    image: null,
    autoAdvance: !!autoAdvance,
    onFinish,
    onCancel,
    attempt: 0,
    finishCalled: false,
    autoAdvanceTimer: 0,
  };

  if (!activeLoading.taskFn) {
    activeLoading.targetProgress = 1;
  }

  // A arte é opcional (fallback), a tarefa de preparação é essencial.
  const currentLoading = activeLoading;
  loadLoadingImage(biome)
    .then((img) => {
      if (activeLoading === currentLoading) {
        activeLoading.image = img;
        activeLoading.imageLoaded = true;
        if (activeLoading.phase === "active" && activeLoading.targetProgress < 0.7) {
          activeLoading.targetProgress = 0.7;
          activeLoading.statusText = "DESPERTANDO A COLÔNIA...";
        }
      }
    })
    .catch(() => {
      if (activeLoading === currentLoading) {
        activeLoading.imageLoaded = true; // libera fallback caso falhe
      }
    });

  return true;
}

export function isLoadingActive() {
  return !!activeLoading;
}

export function isLoadingReady() {
  return !!(activeLoading && activeLoading.phase === "ready");
}

export function isLoadingFadingOut() {
  return !!(activeLoading && activeLoading.phase === "fadeout");
}

export function getLoadingProgress() {
  return activeLoading ? activeLoading.progress : 1;
}

function loadingFailed(L, err) {
  L.taskDone = false;
  L.taskError = err;
  L.phase = "error";
  L.progress = Math.min(L.progress, .95);
  L.targetProgress = L.progress;
  L.statusText = "FALHA NO CARREGAMENTO";
  // PLAYTEST: a falha (e a tentativa) viram evento — no aparelho real é o
  // sinal mais direto de que a conexão ou um asset estão ruins.
  ptEvento("loader_erro", {
    msg: String((err && err.message) || err || "").slice(0, 140),
    tentativa: Number.isFinite(L.attempt) ? L.attempt : 1,
    bioma: L.biome ? String(L.biome).slice(0, 20) : "",
  });
}
export function getLoadingError() { return activeLoading?.taskError || null; }
export function retryLoadingScreen() {
  const L = activeLoading;
  if (!L || L.phase !== "error") return false;
  L.attempt++;
  L.taskStarted = false; L.taskDone = !L.taskFn; L.taskError = null;
  L.phase = "active"; L.progress = 0; L.targetProgress = L.taskFn ? .18 : 1;
  L.timer = 0; L.framesRendered = 0; L.alpha = 1; L.finishCalled = false;
  L.statusText = "TENTANDO NOVAMENTE...";
  return true;
}
export function cancelLoadingScreen() {
  const L = activeLoading;
  if (!L || L.phase !== "error") return false;
  activeLoading = null;
  // Não retomar um mundo parcialmente preparado. Metaprogressão fica intacta.
  if (typeof L.onCancel === "function") L.onCancel();
  else { G.screen = "TITLE"; G.run = null; G.timeScale = 1; G.slowMo = 0; }
  return true;
}
function invokeFinishOnce() {
  if (!activeLoading || activeLoading.phase === "error") return false;
  if (activeLoading.finishCalled) return true;
  const L = activeLoading;
  try {
    if (typeof L.onFinish === "function") L.onFinish();
    L.finishCalled = true;
    return true;
  } catch (err) { loadingFailed(L, err); return false; }
}

/**
 * Avanco manual pelo jogador (toque ou tecla) quando a carga terminar (100%)
 */
export function dismissLoadingScreen() {
  if (!activeLoading) return false;
  if (activeLoading.phase === "error" || activeLoading.taskError) return false;
  if (activeLoading.phase === "ready" || (activeLoading.taskDone && activeLoading.imageLoaded && activeLoading.timer >= activeLoading.minDuration)) {
    if (!invokeFinishOnce()) return false;
    activeLoading.phase = "fadeout";
    SFX.uiClick();
    return true;
  }
  return false;
}

/**
 * Atualiza os estados e animacoes da tela de carregamento
 */
export function updateLoadingScreen(dt) {
  if (!activeLoading) return false;

  activeLoading.timer += dt;

  // Dispara a tarefa pesada somente depois que a cortina da tela de carregamento
  // ja cobriu a tela (pelo menos 1 frame desenhado ou >25ms), para que o jogador
  // nunca veja travamento, geracao de terreno ou montagem de cena.
  if (!activeLoading.taskStarted && activeLoading.taskFn && (activeLoading.framesRendered >= 1 || activeLoading.timer >= 0.025)) {
    activeLoading.taskStarted = true;
    const currentLoading = activeLoading;
    const attempt = currentLoading.attempt;
    const reportProgress = (p, msg) => {
      if (activeLoading !== currentLoading || currentLoading.attempt !== attempt || currentLoading.phase === "error") return;
      if (!Number.isFinite(p)) return;
      activeLoading.targetProgress = Math.max(0, Math.min(1, p));
      if (msg) activeLoading.statusText = msg;
    };

    Promise.resolve()
      .then(() => currentLoading.taskFn(reportProgress))
      .then(() => {
        if (activeLoading !== currentLoading || currentLoading.attempt !== attempt) return;
        activeLoading.taskDone = true;
        activeLoading.targetProgress = 1;
        activeLoading.statusText = "TERRENO PRONTO";
      })
      .catch((err) => {
        if (activeLoading !== currentLoading || currentLoading.attempt !== attempt) return;
        loadingFailed(currentLoading, err);
      });
  }

  // Interpola progresso suavemente
  const speed = activeLoading.taskDone ? 3.2 : 1.1;
  activeLoading.progress += (activeLoading.targetProgress - activeLoading.progress) * Math.min(1, dt * speed);
  if (activeLoading.progress > 0.99) activeLoading.progress = 1;

  // Atualiza particulas
  for (const s of spores) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.pulse += dt * 3;
    if (s.y < -10) {
      s.y = VIEW_H + 10;
      s.x = Math.random() * VIEW_W;
    }
  }

  // Fases de transicao
  if (activeLoading.phase === "fadein") {
    activeLoading.alpha += dt * 4.5;
    if (activeLoading.alpha >= 1) {
      activeLoading.alpha = 1;
      activeLoading.phase = "active";
    }
  } else if (activeLoading.phase === "active") {
    // Verifica se completou a tarefa pesada, imagem carregada e o tempo minimo de leitura
    if (activeLoading.taskDone && activeLoading.imageLoaded && activeLoading.timer >= activeLoading.minDuration && activeLoading.progress >= 0.98) {
      activeLoading.progress = 1;
      activeLoading.phase = "ready";
      activeLoading.autoAdvanceTimer = 0;
    }
  } else if (activeLoading.phase === "ready") {
    // Regra 14 (escolha C): aguarda o jogador clicar/tocar ou pressionar Espaco ao chegar em 100%
    if (activeLoading.autoAdvance) {
      activeLoading.autoAdvanceTimer += dt;
      if (activeLoading.autoAdvanceTimer >= 2.0) {
        if (invokeFinishOnce()) activeLoading.phase = "fadeout";
      }
    }
  } else if (activeLoading.phase === "fadeout") {
    activeLoading.alpha -= dt * 3.5;
    if (activeLoading.alpha <= 0) {
      activeLoading.alpha = 0;
      if (!invokeFinishOnce()) { activeLoading.alpha = 1; return true; }
      activeLoading = null;
      return "done";
    }
  }

  return true;
}

/**
 * Renderiza a tela de carregamento estilo Dead Cells
 */
export function drawLoadingScreen(ctx, time) {
  if (!activeLoading) return false;

  const L = activeLoading;
  L.framesRendered = (L.framesRendered || 0) + 1;
  const alpha = Math.max(0, Math.min(1, L.alpha));
  const chrome = 1 / fontScale();

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Fundo base escuro
  ctx.fillStyle = "#07050d";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 2. Arte Panoramica Cinematografica (com pan e respiracao lenta)
  if (L.image) {
    const driftX = Math.sin(time * 0.25) * 16;
    const zoom = 1.02 + Math.sin(time * 0.18) * 0.015;
    const dw = VIEW_W * zoom;
    const dh = VIEW_H * zoom;
    const dx = (VIEW_W - dw) / 2 + driftX;
    const dy = (VIEW_H - dh) / 2;

    ctx.drawImage(L.image, dx, dy, dw, dh);
    if (L.info && L.info.tint) {
      ctx.fillStyle = L.info.tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  } else {
    // Fallback de degradê atmosférico enquanto a imagem carrega
    const rad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 520);
    rad.addColorStop(0, "#191228");
    rad.addColorStop(0.6, "#0f0b1a");
    rad.addColorStop(1, "#050308");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // 3. Vinheta profunda estilo Dead Cells (Bordas escuras e sombras volumetricas)
  const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 180, VIEW_W / 2, VIEW_H / 2, 540);
  vignette.addColorStop(0, "rgba(7,5,13,0.15)");
  vignette.addColorStop(0.65, "rgba(7,5,13,0.65)");
  vignette.addColorStop(1, "rgba(5,3,9,0.96)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Degradê superior e inferior de cinema
  const gradTop = ctx.createLinearGradient(0, 0, 0, 110);
  gradTop.addColorStop(0, "rgba(5,3,9,0.95)");
  gradTop.addColorStop(1, "rgba(5,3,9,0.0)");
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, VIEW_W, 110);

  const gradBottom = ctx.createLinearGradient(0, VIEW_H - 140, 0, VIEW_H);
  gradBottom.addColorStop(0, "rgba(5,3,9,0.0)");
  gradBottom.addColorStop(0.5, "rgba(5,3,9,0.85)");
  gradBottom.addColorStop(1, "rgba(4,2,7,0.98)");
  ctx.fillStyle = gradBottom;
  ctx.fillRect(0, VIEW_H - 140, VIEW_W, 140);

  // 4. Particulas de esporos brilhantes flutuando
  for (const s of spores) {
    const pAlpha = s.alpha * (0.6 + Math.sin(s.pulse) * 0.4) * alpha;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = pAlpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, 6.28);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // 5. Placa de Bioma Superior (Estilo Dead Cells - Moldura e Tipografia)
  const topY = 44;
  const degrauText = L.degrau || L.info.degrau || "DEGRAU I";
  const titleText = L.title;
  const subText = L.subtitle;

  // Moldura sutil de acento
  const titleW = Math.max(340, Math.min(760, textWidth(titleText, { font: "big", scale: 1.4 * chrome }) + 50));
  const badgeX = VIEW_W / 2 - titleW / 2;

  // Linhas ornamentais laterais com losango estilo Dead Cells
  ctx.strokeStyle = "rgba(55, 230, 200, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(badgeX - 60, topY + 22);
  ctx.lineTo(badgeX - 10, topY + 22);
  ctx.moveTo(badgeX + titleW + 10, topY + 22);
  ctx.lineTo(badgeX + titleW + 60, topY + 22);
  ctx.stroke();

  // Losangos nas pontas
  ctx.fillStyle = L.info.accent;
  for (const lx of [badgeX - 35, badgeX + titleW + 35]) {
    ctx.beginPath();
    ctx.moveTo(lx, topY + 18);
    ctx.lineTo(lx + 4, topY + 22);
    ctx.lineTo(lx, topY + 26);
    ctx.lineTo(lx - 4, topY + 22);
    ctx.closePath();
    ctx.fill();
  }

  // Degrau em destaque dourado/ciano
  drawText(ctx, degrauText, VIEW_W / 2, topY - 18, {
    font: "small",
    scale: 1.05 * chrome,
    color: L.info.secondary,
    align: "center",
    maxWidth: 720,
  });

  // Nome do Bioma imponente
  drawText(ctx, titleText, VIEW_W / 2, topY + 4, {
    font: "big",
    scale: 1.45 * chrome,
    color: "#ffffff",
    align: "center",
    maxWidth: 760,
  });

  // Subtitulo evocativo
  drawText(ctx, subText, VIEW_W / 2, topY + 46, {
    font: "small",
    scale: 0.95 * chrome,
    color: "rgba(220, 215, 240, 0.75)",
    align: "center",
    maxWidth: 820,
  });

  if (L.phase === "error") {
    drawText(ctx, "FALHA NO CARREGAMENTO", VIEW_W / 2, 304,
      { align: "center", color: "#ff8a96", scale: 1.1 * chrome, maxWidth: 740 });
    drawText(ctx, "A PREPARAÇÃO NÃO TERMINOU. TENTE NOVAMENTE OU VOLTE AO MENU.", VIEW_W / 2, 338,
      { align: "center", color: PAL.text, scale: .8 * chrome, maxWidth: 780 });
    if (button(ctx, { x: 282, y: 386, w: 220, h: 48, label: "TENTAR NOVAMENTE", id: "loadingRetry", scale: .8, accent: "#37e6c8" })) retryLoadingScreen();
    else if (button(ctx, { x: 522, y: 386, w: 160, h: 48, label: "VOLTAR AO MENU", id: "loadingCancel", scale: .75 })) cancelLoadingScreen();
    drawText(ctx, "ENTER OU ESPAÇO: TENTAR NOVAMENTE • ESC: VOLTAR AO MENU", VIEW_W / 2, 452,
      { align: "center", color: PAL.textDim, scale: .7 * chrome, maxWidth: 780 });
    ctx.restore();
    return true;
  }

  // 6. Painel Inferior de Lore e Dica (Caixa de vidro translúcido com borda mística)
  const panelW = 760;
  const panelH = 58;
  const panelX = (VIEW_W - panelW) / 2;
  const panelY = VIEW_H - 114;

  // Fundo do painel com gradiente escuro
  ctx.fillStyle = "rgba(10, 7, 18, 0.78)";
  ctx.fillRect(panelX, panelY, panelW, panelH);

  // Borda suave com brilho
  ctx.strokeStyle = "rgba(143, 111, 214, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  // Cantoneiras esteticas estilo Dead Cells
  ctx.fillStyle = L.info.accent;
  const cSize = 4;
  ctx.fillRect(panelX, panelY, cSize, 1);
  ctx.fillRect(panelX, panelY, 1, cSize);
  ctx.fillRect(panelX + panelW - cSize, panelY, cSize, 1);
  ctx.fillRect(panelX + panelW - 1, panelY, 1, cSize);
  ctx.fillRect(panelX, panelY + panelH - 1, cSize, 1);
  ctx.fillRect(panelX, panelY + panelH - cSize, 1, cSize);
  ctx.fillRect(panelX + panelW - cSize, panelY + panelH - 1, cSize, 1);
  ctx.fillRect(panelX + panelW - 1, panelY + panelH - cSize, 1, cSize);

  // Texto de Lore misterioso (sem aspas proibidas)
  drawText(ctx, `— ${L.lore}`, VIEW_W / 2, panelY + 10, {
    font: "small",
    scale: 1.0 * chrome,
    color: "#ffd479",
    align: "center",
    maxWidth: panelW - 24,
  });

  // Dica pratica de jogo
  drawText(ctx, L.tip, VIEW_W / 2, panelY + 34, {
    font: "small",
    scale: 0.9 * chrome,
    color: "rgba(180, 235, 225, 0.9)",
    align: "center",
    maxWidth: panelW - 24,
  });

  // 7. Barra de Carregamento Estilo Dead Cells (Base + brilho + cabeca de luz)
  const barW = 440;
  const barH = 5;
  const barX = (VIEW_W - barW) / 2;
  const barY = VIEW_H - 20;

  // Trilho da barra
  ctx.fillStyle = "rgba(15, 11, 26, 0.9)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = "rgba(80, 60, 120, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

  // Preenchimento gradiente ciano -> ametista
  const fillW = Math.max(0, Math.min(barW, barW * L.progress));
  if (fillW > 0) {
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, "#37e6c8");
    barGrad.addColorStop(0.6, "#8f6fd6");
    barGrad.addColorStop(1, "#ffb347");
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, fillW, barH);

    // Cabeca luminosa pulsante
    const glowAlpha = 0.5 + Math.sin(time * 6) * 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
    ctx.fillRect(barX + fillW - 3, barY - 1, 4, barH + 2);
  }

  // 8. Runa / Gaster Bioluminescente Pulsante e Status
  const runeX = barX + barW + 24;
  const runeY = barY + 2;
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;

  // Anel giratorio
  ctx.save();
  ctx.translate(runeX, runeY);
  ctx.rotate(time * 1.5);
  ctx.strokeStyle = "rgba(55, 230, 200, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 8 + pulse * 2, 0, 4.5);
  ctx.stroke();
  ctx.restore();

  // Nucleo brilhante
  ctx.fillStyle = L.info.accent;
  ctx.beginPath();
  ctx.arc(runeX, runeY, 3 * pulse, 0, 6.28);
  ctx.fill();

  // Mensagem de Status ou Botao de Prosseguir
  const statusY = barY - 18;
  if (L.phase === "ready") {
    const blink = Math.sin(time * 6) > 0;
    const promptColor = blink ? "#ffffff" : "#ffd479";
    drawText(ctx, "▶ CLIQUE, TOQUE OU PRESSIONE ESPAÇO PARA CONTINUAR", VIEW_W / 2, statusY, {
      font: "small",
      scale: 0.92 * chrome,
      color: promptColor,
      align: "center",
      maxWidth: 680,
    });
  } else {
    const pct = Math.floor(L.progress * 100);
    drawText(ctx, `${L.statusText} (${pct}%)`, VIEW_W / 2, statusY, {
      font: "small",
      scale: 0.85 * chrome,
      color: "rgba(180, 170, 215, 0.85)",
      align: "center",
      maxWidth: 640,
    });
  }

  ctx.restore();
  return true;
}

/**
 * Regra 14: indica se a tela de carregamento deve ser exibida no ambiente atual
 * (ativa em toda sessao real de navegador; pulada apenas nos testes headless do Node
 * ou no modo ?debug automatizado sem &cutscene/&loading).
 */
export function shouldUseLoadingScreen() {
  const isNodeTest = typeof process !== "undefined" && !!process.versions && !!process.versions.node;
  if (isNodeTest) return false;
  if (typeof window !== "undefined" && window.FUMIGA && typeof location !== "undefined") {
    return location.search.includes("cutscene") || location.search.includes("loading");
  }
  return true;
}

/**
 * Executa uma transicao de tela/mundo/carga pesada sob a tela de carregamento
 * quando no jogo real, ou sincrona nos testes automatizados headless/?debug.
 */
export function runWithLoadingScreen(opts = {}) {
  if (!shouldUseLoadingScreen()) {
    if (typeof opts.task === "function") opts.task(() => {});
    if (typeof opts.onFinish === "function") opts.onFinish();
    return false;
  }
  return startLoadingScreen(opts);
}

/**
 * Trata entradas de usuario (teclado, toque, clique)
 */
export function handleLoadingInput(type = "key", key = "") {
  if (!activeLoading) return false;
  if (activeLoading.phase === "error") {
    if (type === "key" && key === "Escape") return cancelLoadingScreen();
    if (type === "key" && ["Enter", "Space", " "].includes(key)) return retryLoadingScreen();
    return false; // no erro, clique/toque só funciona nos dois botões
  }
  if (activeLoading.phase === "ready") {
    dismissLoadingScreen();
    return true;
  }
  return false;
}
