// ============================================================================
// FUMIGA-GOAT — Tela de Carregamento Tematica estilo Dead Cells
// Arte panoramica sombria, iluminacao volumetrica, lore da colonia e dicas
// Suporta carregamento assincrono de assets/mecanicas pesadas com cache
// ============================================================================
import { VIEW_W, VIEW_H, PAL, MAPS } from "./config.js";
import { drawText, textWidth } from "./font.js";
import { SFX } from "./audio.js";
import { assetUrl, loadImage, LOAD_CFG } from "./assets.js";

// Cache de imagens de carregamento por bioma
const LOADING_CACHE = new Map();

/**
 * Carrega a arte tematica da tela de carregamento para o bioma solicitado
 */
export function loadLoadingImage(biome = "planicie") {
  const canonical = biome === "topo" ? "palida" : biome;
  if (LOADING_CACHE.has(canonical)) return LOADING_CACHE.get(canonical);

  const loadingPromise = (async () => {
    let img = null;
    const path = `assets/loading/loading_${canonical}.png`;
    for (let a = 0; a < LOAD_CFG.attempts && !img; a++) {
      try {
        img = await loadImage(assetUrl(path) + (a ? `&r=${a}` : ""));
      } catch (e) {
        img = null;
      }
    }
    return img;
  })();

  LOADING_CACHE.set(canonical, loadingPromise);
  loadingPromise.catch(() => {
    if (LOADING_CACHE.get(canonical) === loadingPromise) LOADING_CACHE.delete(canonical);
  });
  return loadingPromise;
}

// Definicoes tematicas por bioma estilo Dead Cells
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
      color: Math.random() > 0.4 ? "#37e6c8" : (Math.random() > 0.5 ? "#c77dff" : "#ffd479"),
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
  title = null,
  subtitle = null,
  task = null,
  minDuration = 2.4,
  onFinish = null,
} = {}) {
  const info = BIOME_LORE[biome] || BIOME_LORE.planicie;
  const loreText = info.lores[Math.floor(Math.random() * info.lores.length)];
  const tipText = info.tips[Math.floor(Math.random() * info.tips.length)];

  resetSpores();

  // Se já estiver em cache, recupera síncrono da promessa já resolvida
  const cachedPromise = LOADING_CACHE.get(biome === "topo" ? "palida" : biome);

  activeLoading = {
    biome,
    info,
    title: title || info.title,
    subtitle: subtitle || info.subtitle,
    lore: loreText,
    tip: tipText,
    progress: 0,
    targetProgress: 0.15,
    statusText: "PREPARANDO TERRENO...",
    timer: 0,
    minDuration: Math.max(1.8, minDuration),
    phase: "fadein", // fadein -> active -> ready -> fadeout -> done
    alpha: 0,
    taskDone: false,
    imageLoaded: false,
    taskError: null,
    image: null,
    onFinish,
    autoAdvanceTimer: 0,
  };

  // Carrega imagem de fundo e garante sincronização
  loadLoadingImage(biome)
    .then((img) => {
      if (activeLoading && activeLoading.biome === biome) {
        activeLoading.image = img;
        activeLoading.imageLoaded = true;
        if (activeLoading.targetProgress < 0.7) {
          activeLoading.targetProgress = 0.7;
          activeLoading.statusText = "DESPERTANDO A COLÔNIA...";
        }
      }
    })
    .catch(() => {
      if (activeLoading && activeLoading.biome === biome) {
        activeLoading.imageLoaded = true; // libera fallback caso falhe
      }
    });

  // Executa a tarefa pesada se fornecida
  if (typeof task === "function") {
    const reportProgress = (p, msg) => {
      if (!activeLoading) return;
      activeLoading.targetProgress = Math.max(0, Math.min(1, p));
      if (msg) activeLoading.statusText = msg;
    };

    Promise.resolve()
      .then(() => task(reportProgress))
      .then(() => {
        if (!activeLoading) return;
        activeLoading.taskDone = true;
        activeLoading.targetProgress = 1;
        activeLoading.statusText = "TERRENO PRONTO";
      })
      .catch((err) => {
        if (!activeLoading) return;
        activeLoading.taskDone = true;
        activeLoading.taskError = err;
        activeLoading.statusText = "AVISO AO CARREGAR";
      });
  } else {
    // Sem tarefa externa pesada: simula preparacao suave dos sistemas
    activeLoading.taskDone = true;
    activeLoading.targetProgress = 1;
  }

  return true;
}

export function isLoadingActive() {
  return !!activeLoading;
}

export function getLoadingProgress() {
  return activeLoading ? activeLoading.progress : 1;
}

/**
 * Avanco manual pelo jogador (toque ou tecla) quando a carga terminar
 */
export function dismissLoadingScreen() {
  if (!activeLoading) return false;
  if (activeLoading.phase === "ready" || (activeLoading.taskDone && activeLoading.imageLoaded && activeLoading.timer >= activeLoading.minDuration)) {
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

  // Interpola progresso suavemente
  const speed = activeLoading.taskDone ? 2.5 : 0.8;
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

  // Fases de transicao (fade in / out)
  if (activeLoading.phase === "fadein") {
    activeLoading.alpha += dt * 3.5;
    if (activeLoading.alpha >= 1) {
      activeLoading.alpha = 1;
      activeLoading.phase = "active";
    }
  } else if (activeLoading.phase === "active") {
    // Verifica se completou a tarefa pesada, imagem carregada e o tempo minimo de leitura
    if (activeLoading.taskDone && activeLoading.imageLoaded && activeLoading.timer >= activeLoading.minDuration && activeLoading.progress >= 0.98) {
      activeLoading.phase = "ready";
      activeLoading.autoAdvanceTimer = 0;
    }
  } else if (activeLoading.phase === "ready") {
    // Se o jogador nao tocar, avanca automaticamente apos 2.0s
    activeLoading.autoAdvanceTimer += dt;
    if (activeLoading.autoAdvanceTimer >= 2.0) {
      activeLoading.phase = "fadeout";
    }
  } else if (activeLoading.phase === "fadeout") {
    activeLoading.alpha -= dt * 3.0;
    if (activeLoading.alpha <= 0) {
      activeLoading.alpha = 0;
      const cb = activeLoading.onFinish;
      activeLoading = null;
      if (typeof cb === "function") cb();
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
  const alpha = Math.max(0, Math.min(1, L.alpha));

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
  const degrauText = L.info.degrau || "DEGRAU I";
  const titleText = L.title;
  const subText = L.subtitle;

  // Moldura sutil de acento
  const titleW = Math.max(340, textWidth(titleText, { font: "big", scale: 1.4 }) + 50);
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
  drawText(ctx, degrauText, VIEW_W / 2, topY - 14, {
    font: "small",
    scale: 1.1,
    color: L.info.secondary,
    align: "center",
  });

  // Nome do Bioma imponente
  drawText(ctx, titleText, VIEW_W / 2, topY + 8, {
    font: "big",
    scale: 1.5,
    color: "#ffffff",
    align: "center",
  });

  // Subtitulo evocativo
  drawText(ctx, subText, VIEW_W / 2, topY + 44, {
    font: "small",
    scale: 1,
    color: "rgba(220, 215, 240, 0.75)",
    align: "center",
  });

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
  drawText(ctx, `— ${L.lore}`, VIEW_W / 2, panelY + 12, {
    font: "small",
    scale: 1.1,
    color: "#ffd479",
    align: "center",
  });

  // Dica pratica de jogo
  drawText(ctx, L.tip, VIEW_W / 2, panelY + 34, {
    font: "small",
    scale: 0.95,
    color: "rgba(180, 235, 225, 0.9)",
    align: "center",
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
    barGrad.addColorStop(1, "#c77dff");
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
  const statusY = barY - 16;
  if (L.phase === "ready") {
    const blink = Math.sin(time * 6) > 0;
    const promptColor = blink ? "#ffffff" : "#ffd479";
    drawText(ctx, "▶ TOQUE OU PRESSIONE ESPAÇO PARA ENTRAR", VIEW_W / 2, statusY, {
      font: "small",
      scale: 1,
      color: promptColor,
      align: "center",
    });
  } else {
    const pct = Math.floor(L.progress * 100);
    drawText(ctx, `${L.statusText} (${pct}%)`, VIEW_W / 2, statusY, {
      font: "small",
      scale: 0.9,
      color: "rgba(180, 170, 215, 0.85)",
      align: "center",
    });
  }

  ctx.restore();
  return true;
}

/**
 * Trata entradas de usuario (teclado, toque, clique)
 */
export function handleLoadingInput(type = "key", key = "") {
  if (!activeLoading) return false;
  if (activeLoading.phase === "ready") {
    dismissLoadingScreen();
    return true;
  }
  return false;
}
