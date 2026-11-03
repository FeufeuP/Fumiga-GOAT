import { drawPaper, drawPaperBg, drawPaperFrame, paperQuiet, paperAperture, beginPaperHud, endPaperHud, flushPaperFrames, placaQuiet } from "./paper_hud.js";
import { fruitSight } from "./fruit_effects.js";
// DIÁRIO DE PLAYTEST: ganchos de expedição, draft, fim de run e a aba TESTE
// das OPÇÕES (exportar/apagar). Módulo local, sem PII; ver playtest.js.
import { ptEvento, ptPoderes, ptResumo, ptAtivo, ptLigar, ptApagar, ptEntregar } from "./playtest.js";
// FILTRO PS1 (OPÇÕES → VÍDEO): níveis e aplicação do pós-processamento 2D —
// dither Bayer 4x4 + 15 bits num canvas sobre o jogo, sem modelagem 3D.
import { applyPsxFilter } from "./psx_filter.js";
// ============================================================================
// FUMIGA — orquestrador V3: PRETITLE -> TITLE -> MODE -> OPTIONS -> RUN + Planície Viva
// ============================================================================
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL, UNITS, START, MAPS, CHAMBERS, NEST_RULES,
  MUTATIONS, RARITY, HELP_GOAL, HELP_CONTROLS, HELP_CONTROLS_TOUCH, HELP_TIPS, CALM_START, MAX_MUTS, xpForLevel,
  ASC_MAX, ascMods, ascLabel, PROPHECIES, ERA_LINES, META_POWER,
} from "./config.js";
import { fogReset, fogUpdate, fogDraw, fogVisible, fogExplored, fogDrawMini } from "./fog.js";
import {
  G, mods, metaBonus, mutBonus, toggleMute, persistSave, loadSave, checkProphecies,
} from "./state.js";
import { IMG, rotFrame } from "./assets.js";
import { drawText, textWidth, textHeight, wrapText, fitTextBlock, layoutRec, layoutBox, fontScale, setOptionsFontAccent } from "./font.js";
import { keys, pressed, mouse, initInput, touchMode } from "./input.js";
import { cam, camReset, updateCam, panCam, zoomCam, shake, screenToWorld, worldToScreen, visibleWorldRect } from "./camera.js";
import {
  spawnPart, burst, ring, floatText, clearParticles, updateParticles,
  impact, critBurst, healPulse, levelUpBurst, explosion, dustPoof, bloodSplatter, magicOrb,
} from "./particles.js";
import { initAudio, audioReady, SFX, setCombat, applyMix } from "./audio.js";
import { world, genWorld, MINI } from "./world.js";
import {
  allies, spawnQueen, spawnAnt, updateAllies, buyUnit, unitCost, popUsed, popCapTotal,
  unitLimitLeft, selectInRect, selectTypeOnScreen, clearSelection, selectedCount,
  orderSelected, orderAttackSelected, rallyDefenders, recomputeAllies,
  antExitNest, insideCount,
} from "./units.js";
import { foes, boss, clearFoes, updateFoes, updateBoss } from "./enemies.js";
import { projectiles, orbs, updateProjectiles, updateOrbs, clearCombat } from "./combat.js";
import {
  director, resetDirector, updateDirector, skipPeace, skipWave, mapDef, waveDef, isLastMap, nextMapCalm,
  calmFrac, waveProgress,
} from "./waves.js";
import { rollDraft, applyMutation, mutationList } from "./mutations.js";
import {
  drawRun, drawTitleBg, drawSolidMenuBg, drawTitleMotes, drawPreTitle, drawPreTitleBg,
  drawModeSelect, drawModeCards, startTransition, updateTransition, drawTransition, hasTransition,
  transitionFx, notePointer, drawTitleLogo
} from "./render.js";
import { enterTree, updateTree, drawTree, treeClick, treeBack } from "./meta.js";
import { startTitlePreload, pumpPreload } from "./preload.js";
import { colony, foodTrailAt, dangerAt } from "./brain.js";
import { frameShift } from "./pixel_celeste.js";
import { BIOME_HUD, drawBiomeTexture, drawGasterBar, drawPheromoneOverlay, drawPheromoneLegend, drawFoodIcon, drawEssenceCrystal, drawTrailAnt, trailProgress, drawTreeRings, drawScentMinimap, drawWoodBanner, drawKitIcon, hudBiome } from "./lore_hud.js";
import { startCutscene, updateCutscene, drawCutscene, handleCutsceneInput, isCutsceneActive, startLoadingCutscene, getCutsceneDefs } from "./cutscenes.js";
import {
  startLoadingScreen, updateLoadingScreen, drawLoadingScreen, isLoadingActive,
  isLoadingFadingOut, dismissLoadingScreen, handleLoadingInput,
  shouldUseLoadingScreen, runWithLoadingScreen,
} from "./loading_screen.js";
import { uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect, dialogBox, isTouchUI, touchPad, tooltip, lastButton } from "./ui.js";
import { startTutorial, stopTutorial, updateTutorial, drawTutorial, tutEvent, TUT, tutorialCardRect } from "./tutorial.js";
import {
  nest, nestEnter, nestExit, nestUpdate, nestDraw, nestHover,
  nestSendOut, nestCallBack,
} from "./nest.js";
import { rand, clamp, lerp, TAU, fmt } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ------------------------------------------------------------------ loja ----
// As 11 classes da colônia, separadas por grupo — cada uma é uma espécie
// real: ⚔️ combate/defesa · 🍃 coleta/exploração · 🏥 construção/cura/criação
// (e a Dinoponera, o colosso — sem atalho, só no card).
const SHOP = [
  { type: "soldier",  label: "BALA",      group: "combat" },
  { type: "trapjaw",  label: "ARPÃO",     group: "combat" },
  { type: "spitter",  label: "ACROBATA",  group: "combat" },
  { type: "bomber",   label: "FOGO",      group: "combat" },
  { type: "tank",     label: "CEFALOTE",  group: "combat" },
  { type: "worker",   label: "CORTADEIRA", group: "gather" },
  { type: "gatherer", label: "MEL",       group: "gather" },
  { type: "scout",    label: "PRATA",     group: "gather" },
  { type: "healer",   label: "MATABELE", group: "care" },
  { type: "weaver",   label: "TECELÃ",    group: "care" },
  { type: "giant",    label: "DINOPONERA", iconScale: 0.13, accent: "#ffd479", group: "colossus" },
];
const SHOP_GROUPS = { combat: "#ff4d5a", gather: "#7fd6a0", care: "#6db7ff", colossus: "#ffd479" };
// Layout dos cards da loja no rodapé (placas 'cartao' da família v2).
// Cards mais largos (44px, antes 30px) e com respiro maior entre grupos, para
// o desenho da formiga caber legível e sem espremer os botões. Uma única conta
// para o desenho e para o teste headless (uitest), para o clique do teste não
// depender de números repetidos aqui e lá.
export const SHOP_CARD = Object.freeze({ w: 44, h: 64, pitch: 50, groupGap: 10, x0: 10 + 160 + 8 });
export function shopCardX(i) {
  let gx = SHOP_CARD.x0, lastGroup = null;
  for (let k = 0; k < SHOP.length; k++) {
    const sp = SHOP[k];
    if (lastGroup && sp.group !== lastGroup) gx += SHOP_CARD.groupGap;
    lastGroup = sp.group;
    if (k === i) return gx;
    gx += SHOP_CARD.pitch;
  }
  return gx;
}
export function shopCardXByType(type) {
  const i = SHOP.findIndex((s) => s.type === type);
  return i < 0 ? -1 : shopCardX(i);
}
let shopOpen = false;
let rallyCooldown = 0; // FASE 4: cooldown rally F quando infiniteDash desligado

// ------------------------------------------------------------- modos de jogo --
// NOTA: o MODO TESTE é um modo auxiliar de desenvolvimento que será removido
// no lançamento final, restando apenas a Campanha Principal (Modo História).
const GAME_MODES = [
  {
    id: "campanha",
    name: "CAMPANHA",
    icon: "C",
    color: "#37e6c8",
    diff: "MODO HISTÓRIA • 6 MAPAS",
    desc: "A jornada completa\n6 biomas, 6 chefões\nEvolua a colônia eterna",
    stats: ["• 6 mapas progressivos", "• Chefões únicos", "• Tutorial ativo", "• Recompensa: 100%"],
    mapIdx: 0,
    endless: false,
  },
  {
    id: "teste",
    name: "MODO TESTE",
    icon: "T",
    color: "#ffd479",
    diff: "LABORATÓRIO • PODERES ∞",
    desc: "Auxiliar de criação\nDinheiro, formigas e ondas ∞\nPule ondas e mapas livremente",
    stats: ["• Dinheiro infinito (∞)", "• Formigas infinitas (∞)", "• Ondas infinitas (∞)", "• Pular onda e mapa"],
    mapIdx: 0,
    endless: true,
    testMode: true,
  },
];

let modeHover = -1;
let modeRects = [];
let ascRects = [];          // PÓS-FINAL: zonas de clique do seletor de ASCENSÃO
let selectedMode = GAME_MODES[0];

// ------------------------------------------------------------- options -- 5 abas (Áudio/Vídeo/Controles/Acessibilidade/Idioma)
// Layout medido pelo tamanho real do texto (sem sobreposição) + área de
// conteúdo ROLÁVEL: roda do mouse, setas/PgUp/PgDn ou arrastar vertical
// (mouse ou dedo). Botões da área usam toque (soltar sem arrastar), então
// rolar nunca dispara um controle por acidente.
let optionsReturn = "TITLE";
let optionsTab = 0; // 0=audio,1=video,2=controles,3=acess,4=idioma
let optionsTabPrev = -1;
let optionsScroll = 0;      // px rolados dentro da viewport
let optionsContentH = 0;    // altura do conteúdo (medida a cada render)
let optionsSwipeX = null, optionsSwipeY = null;
let optGrab = null;         // gesto em curso: {x,y,mode,slider}
let optSliders = [];        // barras de volume [{id,x,y,w}] em coords de tela
let modeSwipeX = null;
let modeScrollOffset = 0;
const OPTIONS_TABS = [
  { id: "audio", label: "ÁUDIO", color: "#37e6c8" },
  { id: "video", label: "VÍDEO", color: "#6db7ff" },
  { id: "controles", label: "CONTROLES", color: "#ffb347" },
  { id: "acess", label: "ACESSO", color: "#7fd6a0" },
  { id: "idioma", label: "IDIOMA", color: "#ffd479" },
  { id: "teste", label: "TESTE", color: "#ff7ab8" },
];
// Aba TESTE (playtest de campo): mensagem de retorno e confirmação de apagar.
let ptMsg = "", ptMsgT = 0, ptArmed = false;
function ptAviso(texto) { ptMsg = String(texto || ""); ptMsgT = 5; }

/** Janela do conteúdo rolável das OPÇÕES (dentro de paperQuiet do painel). */
function optBox() {
  const PX = 24, PY = 38, PW = VIEW_W - 48, PH = VIEW_H - 92;
  const q = paperQuiet("panel", PX, PY, PW, PH);
  return { PX, PY, PW, PH, q };
}
function optViewport() {
  const { q } = optBox();
  const top = Math.round(q.y + 46);
  const bot = Math.round(q.y + q.h - 2);
  return { x: Math.round(q.x), y: top, w: Math.round(q.w), h: Math.max(80, bot - top) };
}
/** Multiplicador da FONTE GRANDE (igual ao de font.js). */
function optFS() { return G.save.accessibility.bigFont ? 1.3 : 1; }
/** Troca de aba pelo teclado: zera a rolagem como os botões fazem. */
function optSetTab(i) {
  i = clamp(i, 0, OPTIONS_TABS.length - 1);
  if (i !== optionsTab) { optionsTab = i; optionsScroll = 0; optGrab = null; ptArmed = false; SFX.uiClick(); }
}
/** Barra de volume sob o ponto (coords de tela) ou null. */
function optSliderAt(x, y) {
  for (const s of optSliders) {
    if (pointInRect(x, y, s.x, s.y, s.w, s.h)) return s;
  }
  return null;
}
/** Define o volume pela posição horizontal sobre a barra. */
function optSetVolume(sl, x, silent) {
  const v = Math.round(clamp((x - sl.x) / sl.w, 0, 1) * 20) / 20;
  G.save.settings[sl.id === "music" ? "musicVol" : "sfxVol"] = v;
  persistSave();
  applyMix();
  if (!silent) SFX.uiClick();
}

// O "modo mobile" é decidido por QUEM carrega o jogo (o shell de toque) e pelo
// ponteiro do aparelho — NUNCA pela largura da janela. Janela estreita no PC não
// é celular, e o layout de toque não pode inflar botões para fora do canvas.
function isMobileLayout() { return isTouchUI(); }

// ------------------------------------------------------------------ run -----
function newRun(mode = null, seedOverride = null, opts = {}) {
  const mSel = mode || selectedMode;
  // seedOverride: só o modo debug (?seed=) — mesmo mapa gerado toda vez
  const seed = seedOverride != null ? seedOverride >>> 0 : (Math.random() * 0xffffffff) >>> 0;
  resetDirector();
  const startMap = mSel.mapIdx || 0;
  genWorld(seed, startMap);
  director.mapIdx = startMap;
  fogReset();
  clearParticles();
  clearFoes();
  clearCombat();
  allies.length = 0;
  camReset();
  paused = false;
  nestExit();

  const m = metaBonus();
  const isTest = !!mSel.testMode;
  const run = {
    seed,
    mode: mSel.id,
    modeDef: mSel,
    status: "running",
    baseOpen: false,
    endT: 0, payoutDone: false, payout: null,
    food: isTest ? 9999 : START.food + m.startFood + (mSel.fast ? 120 : 0) + (mSel.bossRush ? 200 : 0),
    essencePool: isTest ? 9999 : m.startEssence + (mSel.bossRush ? 100 : 0),
    level: mSel.fast ? 3 : 0,
    xp: 0, xpNext: xpForLevel(mSel.fast ? 4 : 1),
    fungusT: 9,
    kills: 0, wave: 0, bestWaveThisRun: 0, mapsCleared: startMap,
    mutations: new Set(), mutationLog: [],
    queenJustHit: 0,
    banner: { title: "MAPA " + (startMap+1) + "/" + MAPS.length + " — " + MAPS[startMap].name, sub: MAPS[startMap].sub, t: 4.4 },
    draft: null,
    elapsed: 0,
    heartbeatT: 0,
    rebirthUsed: false,
    selectT: 0,
    bossDefeated: false,
    mapIdx: startMap,
    transition: false,
    endless: !!mSel.endless,
    fast: !!mSel.fast,
    bossRush: !!mSel.bossRush,
    testMode: isTest,
    // Poderes do Modo Teste (auxiliar de desenvolvimento; ativos por padrão, alternáveis no HUD)
    testPowers: isTest ? { infMoney: true, infAnts: true, infWaves: true } : null,
    // PÓS-FINAL: ASCENSÃO DA NÉVOA (só campanha, só depois da 1ª vitória)
    ascension: mSel.id === "campanha" && G.save.best.wins > 0
      ? Math.max(0, Math.min(G.pendingAsc | 0, Math.min(G.save.ascension + 1, ASC_MAX))) : 0,
    hatched: new Set(),      // PROFECIAS: espécies nascidas neste run
    queenMinHp: 1,           // PROFECIAS: pior momento da rainha
    deaths: 0,               // PROFECIAS: formigas perdidas
    ascFood: 1,              // ASCENSÃO nv14: COLHEITA MAGRA
    invertT: 0,              // FASE2 grouse inverte controles
    chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  };
  G.run = run;
  // PLAYTEST: retrato do início da expedição — modo, mapa, ascensão, seed e os
  // poderes já comprados (é com isto que o relatório mede adoção/efeito no A3).
  ptEvento("expedicao_inicio", {
    modo: run.mode, mapa: run.mapIdx, ascensao: run.ascension, seed: run.seed,
    era: G.save.era || 0, poderes: ptPoderes(G.save.nodes), essencia: Math.round(run.essencePool),
  });
  if (run.ascension > 0) run.ascFood = ascMods(run.ascension).foodMult;

  spawnQueen(); // allies.queen fica apontando para ela (units.js)

  const A = world.anthill;
  const nW = START.workers + m.startWorkers + (mSel.fast ? 4 : 0) + (mSel.bossRush ? 6 : 0);
  for (let i = 0; i < nW; i++) {
    const a = rand(0, TAU);
    spawnAnt("worker", A.x + Math.cos(a) * (100 + rand(0, 30)), A.y + Math.sin(a) * (100 + rand(0, 30)));
  }
  for (let i = 0; i < START.gatherers + (mSel.fast ? 2 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("gatherer", A.x + Math.cos(a) * (130 + rand(0, 30)), A.y + Math.sin(a) * (130 + rand(0, 30)));
  }
  for (let i = 0; i < START.scouts + (mSel.fast ? 2 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("scout", A.x + Math.cos(a) * 210, A.y + Math.sin(a) * 210);
  }
  for (let i = 0; i < m.startSoldiers + (mSel.fast ? 6 : 0) + (mSel.bossRush ? 10 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("soldier", A.x + Math.cos(a) * 190, A.y + Math.sin(a) * 190);
  }
  if (mSel.fast || mSel.bossRush) {
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU);
      spawnAnt("tank", A.x + Math.cos(a) * 180, A.y + Math.sin(a) * 180);
    }
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU);
      spawnAnt("spitter", A.x + Math.cos(a) * 200, A.y + Math.sin(a) * 200);
    }
    spawnAnt("healer", A.x + rand(-60,60), A.y + rand(-60,60));
  }

  G.screen = "RUN";
  setCombat(0);

  if (!G.save.tutorial) startTutorial(); else stopTutorial(false);

  const startIntro = () => {
    if (!G.save.cutscenes || !G.save.cutscenes.noite_branca) {
      startCutscene("noite_branca");
    } else {
      startCutscene(MAPS[startMap].id);
    }
  };

  if (opts.skipIntroLoad) {
    // Chamado por dentro da task da tela de carregamento (startRunWithLoading):
    // a cutscene é disparada no onFinish quando o jogador confirma o 100%.
  } else if (!shouldUseLoadingScreen()) {
    startIntro();
    startTransition("auto", "MODE", "RUN", 0, null);
  } else {
    startLoadingScreen({
      biome: MAPS[startMap] ? MAPS[startMap].id : "planicie",
      minDuration: 1.8,
      onFinish: () => {
        startIntro();
      },
    });
  }

  return run;
}

/**
 * Regra 14: abre a tela de carregamento ANTES de gerar o mundo da expedição,
 * garantindo que genWorld, formigas e névoa carreguem sem que o jogador veja.
 */
function startRunWithLoading(mSel, seedOverride = null) {
  const modeObj = mSel || selectedMode;
  const startMap = modeObj.mapIdx || 0;
  const mDef = MAPS[startMap] || MAPS[0];
  const bId = mDef.id || "planicie";
  const degraus = ["I", "II", "III", "IV", "V", "VI"];
  mouse.justDown = false; pressed.Space = false; pressed.Enter = false;
  if (!shouldUseLoadingScreen()) {
    return newRun(modeObj, seedOverride);
  }
  runWithLoadingScreen({
    biome: bId,
    degrau: "DEGRAU " + (degraus[startMap] || "I"),
    title: mDef.name,
    subtitle: mDef.sub ? mDef.sub.toUpperCase() : "",
    minDuration: 1.8,
    task: (onProgress) => {
      onProgress(0.35, "GERANDO MUNDO E TÚNEIS...");
      newRun(modeObj, seedOverride, { skipIntroLoad: true });
      onProgress(1.0, "TERRENO PRONTO");
    },
    onFinish: () => {
      if (!G.save.cutscenes || !G.save.cutscenes.noite_branca) {
        startCutscene("noite_branca");
      } else {
        startCutscene(bId);
      }
    },
  });
}

function endRun(won) {
  const run = G.run;
  // O fim não depende de sair manualmente do ninho; mostra o mesmo desfecho.
  if (run.baseOpen) { run.baseOpen = false; nestExit(); }
  paused = false;
  run.status = won ? "won" : "lost";
  // PLAYTEST: desfecho com o contexto do balanceamento (mapa, onda, tempo,
  // mortes, pior momento da rainha, mutações e castas nascidas).
  ptEvento("expedicao_fim", {
    venceu: !!won, modo: run.mode, mapa: run.mapIdx, mapas: run.mapsCleared,
    onda: run.wave, abates: run.kills, t: Math.round(run.elapsed), mortes: run.deaths,
    vidaMin: +(run.queenMinHp || 1).toFixed(2), ascensao: run.ascension || 0,
    mutacoes: run.mutationLog.map(m => m.id), nascidas: run.hatched ? run.hatched.size : 0,
    teste: !!run.testMode,
  });
  run.endT = won ? 2.0 : 1.9;
  G.timeScale = 0.3;
  G.slowMo = run.endT;
  if (won) SFX.win(); else SFX.lose();
  const A = world.anthill;
  shake(0.8);
  ring(A.x, A.y, { r0: 20, r1: 300, life: 0.8, color: won ? "#ffd479" : "#ff4d5a", width: 5 });
  if (won) {
    levelUpBurst(A.x, A.y);
  } else {
    explosion(A.x, A.y, 80, "#ff4d5a");
  }
}

export function settleRun() {
  const run = G.run;
  if (run.payoutDone) return;
  run.payoutDone = true;
  const em = metaBonus().essMult;
  const won = run.status === "won";
  const modeMult = run.modeDef ? (run.modeDef.id === "campanha" ? 1 : 1.5) : 1;
  const mapBonus = run.mapsCleared * 160;
  const waveBonus = run.wave * 8;
  const killBonus = run.kills;
  const relic = Math.round((run.testMode ? Math.min(run.essencePool, 1000) : run.essencePool) * 0.1);
  const winBonus = won ? 200 : 0;
  const base = relic + waveBonus + killBonus + mapBonus + winBonus;
  // PÓS-FINAL: a ASCENSÃO paga essência extra proporcional ao desafio aceito
  const ascMult = run.ascension > 0 ? ascMods(run.ascension).ess : 1;
  const total = Math.round(base * em * modeMult * ascMult);
  run.payout = {
    relic, waveBonus, killBonus, mapBonus, winBonus, mult: em * modeMult * ascMult, total, modeMult,
    ascension: run.ascension || 0, ascMult,
  };

  // PLAYTEST: economia da expedição (quanto o teste realmente rendeu).
  ptEvento("recompensa", {
    total: run.payout.total, vitoria: run.payout.winBonus, onda: run.payout.waveBonus,
    abates: run.payout.killBonus, mapas: run.payout.mapBonus, mult: +run.payout.mult.toFixed(2),
  });
  G.save.essence += total;
  const b = G.save.best;
  b.runs++;
  if (won) b.wins++;
  b.wave = Math.max(b.wave, run.wave);
  b.maps = Math.max(b.maps || 0, run.mapsCleared);
  b.kills += run.kills;
  // PÓS-FINAL: a vitória da campanha (ou modo teste durante o desenvolvimento) avança a ERA e o teto da ASCENSÃO
  if (won && (run.mode === "campanha" || run.mode === "teste")) {
    G.save.era = (G.save.era || 0) + 1;
    if (run.ascension === (G.save.ascension || 0) && G.save.ascension < ASC_MAX) G.save.ascension++;
  }
  // PÓS-FINAL: PROFECIAS cumpridas pagam essência na hora
  const aliveTypes = allies.filter(a => !a.dead && !a.dying).map(a => a.type);
  const earned = checkProphecies(run, won, { alive: aliveTypes, cycle: director.cycle || 0 });
  if (earned.length) run.payout.prophecies = earned;
  persistSave();
}

// --------------------------------------------------------- avanço de mapa ---
function advanceMap(targetIdx = null) {
  const run = G.run;
  // PLAYTEST: o mapa ANTERIOR foi vencido (a migração vem logo abaixo).
  ptEvento("mapa_limpo", {
    mapa: director.mapIdx, modo: run.mode, t: Math.round(run.elapsed), onda: run.wave,
    abates: run.kills, mortes: run.deaths, vidaMin: +(run.queenMinHp || 1).toFixed(2), teste: !!run.testMode,
  });
  if (targetIdx !== null && targetIdx !== undefined) {
    director.mapIdx = ((targetIdx | 0) % MAPS.length + MAPS.length) % MAPS.length;
  } else {
    director.mapIdx = (director.mapIdx + 1) % MAPS.length;
  }
  run.mapIdx = director.mapIdx;
  run.bossDefeated = false;
  if (run.testMode) {
    director.cycle = 0;
    run.mapsCleared = Math.max(run.mapsCleared || 0, director.mapIdx);
  }
  const m = mapDef();

  genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
  fogReset();
  clearFoes();
  clearCombat();

  const A = world.anthill;
  // a colônia migra inteira: quem estava dentro do formigueiro sobe pela boca
  // antes de a nova terra ser gerada (senão ficaria presa na cena antiga)
  for (let i = allies.inside.length - 1; i >= 0; i--) antExitNest(allies.inside[i]);
  let k = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const ang = (k * 2.399) + 0.7;
    const d = a.type === "worker" ? 120 : 200;
    a.x = A.x + Math.cos(ang) * (d + (k % 5) * 22);
    a.y = A.y + Math.sin(ang) * (d + (k % 5) * 22);
    a.state = "idle";
    a.target = null; a.forcedTarget = null;
    a.pile = null; a.node = null; a.cmdPos = null;
    if (a.def.role !== "worker") a.guardPos = { x: a.x, y: a.y };
    else a.guardPos = null;
    k++;
  }
  const q = allies.queen;
  if (q) { q.x = A.x; q.y = A.y - 10; }
  cam.x = A.x; cam.y = A.y;

  nextMapCalm();
  recomputeAllies(); // remove/aplica atributos de frutos ao mudar de bioma

  if (q && !q.dead) {
    q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.4 * mods().allHealing);
    healPulse(A.x, A.y);
    burst(A.x, A.y, { n: 30, color: ["#ffd479", "#7fd6a0", "#fff"], spMin: 30, spMax: 160, life: 0.8, glow: true });
  }

  run.banner = { title: "MAPA " + (director.mapIdx + 1) + "/" + MAPS.length + " — " + m.name, sub: (m.sub ? m.sub + " • " : "") + "O VASO MUDA: " + (m.loreName || ""), t: 4.6 };
  run.transition = false;
  SFX.chime();
  floatText(A.x, A.y - 120, "A COLÔNIA MIGRA PARA NOVAS TERRAS", { color: "#ffd479", life: 2.2, scale: 2 });
}

/**
 * Regra 14: realiza a troca de mundo/bioma sob a tela de carregamento,
 * executando advanceMap(nextIdx) nos bastidores sem que o jogador veja.
 */
function triggerMapChange(targetIdx = null) {
  const nextIdx = targetIdx !== null && targetIdx !== undefined
    ? (((targetIdx | 0) % MAPS.length + MAPS.length) % MAPS.length)
    : ((director.mapIdx + 1) % MAPS.length);
  const next = MAPS[nextIdx] || MAPS[0];
  const degraus = ["I", "II", "III", "IV", "V", "VI"];
  mouse.justDown = false; pressed.KeyN = false; pressed.Space = false; pressed.Enter = false;
  runWithLoadingScreen({
    biome: next.id,
    degrau: "DEGRAU " + (degraus[nextIdx] || "I"),
    title: "MAPA " + (nextIdx + 1) + " — " + next.name,
    subtitle: next.sub ? next.sub.toUpperCase() : "",
    minDuration: 1.6,
    task: (onProgress) => {
      onProgress(0.35, "MIGRANDO A COLÔNIA...");
      advanceMap(nextIdx);
      onProgress(1.0, "BIOMA PRONTO");
    },
  });
}

// -------------------------------------------------------------- seleção -----
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, moved: false };
const pan = { active: false, moved: false };
let touchHintT = -99; // MOBILE: relógio da dica "toque numa formiga"
const SIGHT = { worker: 210, fighter: 280, ranged: 320, healer: 260 };
let fogT = 0;

function resourceAt(wx, wy) {
  for (const p of world.piles) {
    if (p.amount > 0 && Math.hypot(p.x - wx, p.y - wy) < 46) return p;
  }
  for (const n of world.nodes) {
    if (n.amount > 0 && Math.hypot(n.x - wx, n.y - wy) < 48) return n;
  }
  return null;
}

function enemyAt(wx, wy) {
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    if (!(f.revealT > 0) && !fogVisible(f.x, f.y)) continue;
    if (Math.hypot(f.x - wx, f.y - wy) < f.bodyR + 14) return f;
  }
  return null;
}

function allyAt(wx, wy) {
  for (const a of allies) {
    if (a.dead || a.dying || a.inside) continue;
    if (Math.hypot(a.x - wx, a.y - wy) < a.bodyR + 10) return a;
  }
  return null;
}

function uiCapture() {
  for (const b of uiButtons()) {
    if (pointInRect(mouse.x, mouse.y, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

// ----------------------------------------------------------------- update ---
export function update(dt) {
  G.time += dt;

  if (isLoadingActive()) {
    // A tela de carga é MODAL: a tecla/toque que ela consome não pode acionar o
    // menu que aparece atrás no mesmo quadro. Sem isto, o ESPAÇO que pulava o
    // carregamento também confirmava o botão "COMEÇAR" do título (a tecla ainda
    // estava em `pressed` quando a tela de trás é desenhada no fadeout).
    if (pressed.Escape) { handleLoadingInput("key", "Escape"); pressed.Escape = false; }
    else if (mouse.justDown) { if (handleLoadingInput("pointer")) mouse.justDown = false; }
    else if (pressed.Space || pressed.Enter) {
      handleLoadingInput("key", pressed.Enter ? "Enter" : "Space");
      pressed.Space = false; pressed.Enter = false; pressed.NumpadEnter = false;
    }
    updateLoadingScreen(dt);
    return;
  }

  if (mouse.justDown) notePointer(mouse.x, mouse.y);

  const transTo = updateTransition(dt);
  if (transTo) {
    G.screen = transTo;
  }

  if (pressed.KeyM) {
    const m = toggleMute();
    const p = screenToWorld(VIEW_W / 2, VIEW_H / 2 - 30);
    floatText(p.x, p.y, m ? "SOM: DESLIGADO" : "SOM: LIGADO", { color: "#efe9ff", life: 1.2 });
  }

  switch (G.screen) {
    case "PRETITLE": updatePreTitle(dt); break;
    case "TITLE": startTitlePreload(); break;
    case "MODE": updateMode(dt); break;
    case "OPTIONS": updateOptions(dt); break;
    case "TREE": updateTreeScreen(dt); break;
    case "PROPHECY": updateProphecyScreen(dt); break;
    case "MEMORY": updateMemoryScreen(dt); break;
    case "HELP": break;
    case "RUN": updateRun(dt); break;
  }

  updateParticles(dt * (G.screen === "RUN" ? G.timeScale : 1));

  if (G.slowMo > 0) {
    G.slowMo -= dt;
    if (G.slowMo <= 0) G.timeScale = 1;
  }

  // Regra 14: o que os botões do TITLE abrem é preparado por trás, em fatias.
  // Na expedição em andamento a CPU é do jogo; no menu de pausa, volta a andar.
  // Árvore aberta antes do fim: fatia maior, para o que falta entrar logo.
  if (G.screen !== "RUN" || paused) pumpPreload(TREE_SCREENS.has(G.screen) ? PRELOAD_BOOST_MS : PRELOAD_SLICE_MS);
}

/** Orçamento do pré-carregamento por quadro: sobra folga para os 60 FPS. */
const PRELOAD_SLICE_MS = 5, PRELOAD_BOOST_MS = 10;
const TREE_SCREENS = new Set(["TREE", "PROPHECY", "MEMORY"]);

function updatePreTitle(dt) {
  if (mouse.justDown || pressed.Enter || pressed.Space) {
    notePointer(mouse.x, mouse.y);
    SFX.uiClick();
    startTransition("auto", "PRETITLE", "TITLE", 0, () => {
      G.screen = "TITLE";
    });
  }
}

function updateMode(dt) {
  modeHover = -1;
  for (let i = 0; i < modeRects.length; i++) {
    const r = modeRects[i];
    if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) {
      modeHover = r.idx;
      break;
    }
  }
  // swipe mobile para cards - FASE 6 FINAL: scroll visual + touch feedback
  const mobile = isMobileLayout();
  if (mobile) {
    if (mouse.justDown) modeSwipeX = mouse.x;
    if (mouse.justUp && modeSwipeX !== null) {
      const dx = mouse.x - modeSwipeX;
      if (Math.abs(dx) > 50) {
        // navega entre modos com swipe - scroll visual
        if (dx < 0) modeScrollOffset = Math.min(modeScrollOffset + 1, GAME_MODES.length - 1);
        if (dx > 0) modeScrollOffset = Math.max(modeScrollOffset - 1, 0);
        modeHover = modeScrollOffset;
        if (navigator.vibrate) navigator.vibrate(15);
        SFX.uiClick();
      }
      modeSwipeX = null;
    }
  }
  // FASE 6 FINAL: se modeScrollOffset mudou, garante hover acompanha
  if (mobile && modeScrollOffset >= 0 && modeHover === -1) {
    // não força hover se mouse não sobre card, mas mantém scroll
  }
  // PÓS-FINAL — seletor de ASCENSÃO DA NÉVOA (campanha; destrava após a 1ª vitória)
  if (mouse.justDown && G.save.best.wins > 0) {
    for (const r of ascRects) {
      if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) {
        const maxSel = Math.min(G.save.ascension + 1, ASC_MAX);
        G.pendingAsc = Math.max(0, Math.min(maxSel, (G.pendingAsc | 0) + r.d));
        SFX.uiClick();
        notePointer(mouse.x, mouse.y);
        return;
      }
    }
  }
  if (mouse.justDown && modeHover >= 0) {
    notePointer(mouse.x, mouse.y);
    selectedMode = GAME_MODES[modeHover];
    if (mobile && navigator.vibrate) navigator.vibrate(20);
    SFX.uiClick();
    startRunWithLoading(selectedMode);
    return;
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    SFX.uiClick();
    startTransition("auto", "MODE", "TITLE", 0, () => { G.screen = "TITLE"; });
  }
}

function updateOptions(dt) {
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    SFX.uiClick();
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  const V = optViewport();
  if (optionsTab !== optionsTabPrev) { optionsTabPrev = optionsTab; optionsScroll = 0; optGrab = null; }
  // rolagem: roda do mouse, setas seguradas e PgUp/PgDn
  if (mouse.wheel) { optionsScroll += mouse.wheel * 40; mouse.wheel = 0; }
  if (keys.ArrowDown) optionsScroll += 300 * dt;
  if (keys.ArrowUp) optionsScroll -= 300 * dt;
  if (pressed.PageDown) optionsScroll += V.h * 0.85;
  if (pressed.PageUp) optionsScroll -= V.h * 0.85;
  if (pressed.ArrowLeft) optSetTab(optionsTab - 1);
  if (pressed.ArrowRight) optSetTab(optionsTab + 1);
  if (ptMsgT > 0) { ptMsgT -= dt; if (ptMsgT <= 0) ptMsg = ""; }
  // gesto: começa no pressionar dentro da viewport; vira "slider" se o
  // primeiro movimento for horizontal sobre uma barra de volume, senão
  // vira rolagem vertical (toque = soltar sem arrastar, tratado no botão)
  if (mouse.justDown) {
    optionsSwipeX = mouse.x; optionsSwipeY = mouse.y;
    optGrab = pointInRect(mouse.x, mouse.y, V.x, V.y, V.w, V.h)
      ? { x: mouse.x, y: mouse.y, mode: null, slider: optSliderAt(mouse.x, mouse.y) }
      : null;
  }
  if (optGrab && mouse.down && !optGrab.mode) {
    const dx = mouse.x - optGrab.x, dy = mouse.y - optGrab.y;
    if (Math.hypot(dx, dy) > 10) {
      optGrab.mode = (optGrab.slider && Math.abs(dx) >= Math.abs(dy)) ? "slider" : "scroll";
    }
  }
  if (optGrab && optGrab.mode === "scroll" && mouse.down) {
    optionsScroll -= (mouse.y - mouse.lastY);
  }
  if (optGrab && optGrab.mode === "slider" && mouse.down && optGrab.slider) {
    optSetVolume(optGrab.slider, mouse.x, true);
  }
  if (mouse.justUp) {
    const wasSlider = optGrab && optGrab.mode === "slider";
    if (optGrab && !optGrab.mode && optGrab.slider) optSetVolume(optGrab.slider, mouse.x, false);
    optGrab = null;
    // swipe horizontal troca de aba (mobile); vertical dominante só rola
    if (isMobileLayout() && optionsSwipeX !== null && !wasSlider) {
      const dx = mouse.x - optionsSwipeX, dy = mouse.y - optionsSwipeY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        optSetTab(optionsTab + (dx < 0 ? 1 : -1));
      }
    }
    optionsSwipeX = optionsSwipeY = null;
  }
  optionsScroll = clamp(optionsScroll, 0, Math.max(0, optionsContentH - V.h));
}

function updateTreeScreen(dt) {
  updateTree(dt);
  if (mouse.justUp && !uiCapture()) treeClick();
  if (pressed.Escape) {
    SFX.uiClick();
    if(treeBack())return;
    backFromTree();
  }
}

// --------------------------------------------------------------- mundo fora --
// Lista reutilizada por frame: TODAS as aliadas menos quem está dentro do
// formigueiro. Inimigos, chefes e projéteis só enxergam esta lista — quem
// desceu pela boca não pode ser alvo de ninguém lá fora.
const _outside = [];
function outsideAllies() {
  _outside.length = 0;
  for (const a of allies) if (!a.inside) _outside.push(a);
  _outside.queen = allies.queen;
  return _outside;
}

/**
 * Um tick do MUNDO (ondas, formigas de fora, inimigos, projéteis, essência,
 * fungário, níveis e névoa). É o mesmo tick para a expedição normal e para o
 * formigueiro aberto — é isso que faz as duas telas rodarem ao mesmo tempo.
 */
function worldTick(simDt, run) {
  if (run.testPowers) {
    if (run.testPowers.infMoney) {
      if (run.food < 9999) run.food = 9999;
      if (run.essencePool < 9999) run.essencePool = 9999;
    }
    run.endless = !!run.testPowers.infWaves;
  }
  // a colônia de DENTRO também trabalha enquanto o jogador está no mundo
  // (visible=false: o turno produz, mas a chocagem grátis espera a visita)
  if (!run.baseOpen) nestUpdate(simDt, false);
  updateDirector(simDt);
  updateAllies(simDt, foes);
  const outside = outsideAllies();
  updateFoes(simDt, outside);
  if (boss) updateBoss(simDt, outside);
  updateProjectiles(simDt, outside, foes);
  const gained = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
  if (gained > 0) {
    // CÂMARA DE MEMÓRIA: o que refina é o tanto de tile construído (nest.js),
    // não um botão de nível — sem refinaria escavada, o multiplicador é 1.
    const refMult = (run.nestStats && run.nestStats.essMult) || 1 + 0.15 * run.chambers.refinery;
    run.essencePool += Math.round(gained * metaBonus().essMult * refMult);
    tutEvent("essence");
  }
  spawnAmbient(simDt);

  run.fungusT -= simDt;
  if (run.fungusT <= 0) {
    run.fungusT = 9;
    const crop = ((run.nestStats && run.nestStats.fungusCrop) || (run.nestStats ? 0 : run.chambers.fungus)) + metaBonus().fungusRate;
    if (crop > 0) run.food += crop;
  }

  // ---- ESTOQUE DA COLÔNIA (ninho escavável): a despensa define o teto e o que
  // passa dele AZEDA. Sem nenhum tile de despensa escavado, o estoque é só o
  // oco da entrada (NEST_RULES.capBase) — por isso cavar despensa é a 1ª obra.
  {
    const cap = (run.nestStats && run.nestStats.foodCap) || NEST_RULES.capBase;
    const infMoney = !!(run.testPowers && run.testPowers.infMoney);
    if (!infMoney && run.food > cap) {
      run.spoilAcc = (run.spoilAcc || 0) + (run.food - cap) * NEST_RULES.spoil * simDt;
      if (run.spoilAcc >= 1) {
        const rot = Math.min(Math.floor(run.spoilAcc), run.food - cap);
        run.food -= rot; run.spoilAcc -= rot;
        run.spoiled = (run.spoiled || 0) + rot;
        run.spoilT = (run.spoilT || 0) - simDt;
        if (run.spoilT <= 0) {
          run.spoilT = 6;
          // só grita no mundo se o formigueiro ESTÁ na tela (o aviso de verdade
          // mora na barra de dentro, em vermelho) — senão o float nasce fora dela
          const vr = visibleWorldRect(0);
          const ax = world.anthill.x, ay = world.anthill.y;
          if (ax > vr.x0 && ax < vr.x1 && ay - 120 > vr.y0 && ay < vr.y1)
          floatText(world.anthill.x, world.anthill.y - 120,
            !!(run.nestStats && run.nestStats.tiles && run.nestStats.tiles.pantry > 0)
              ? "DESPENSA CHEIA: " + rot + " COMIDA APODRECEU"
              : "SEM DESPENSA ESCAVADA: A COMIDA APODRECE",
            { color: "#ff8a96", life: 2.0 });
        }
      }
    } else run.spoilAcc = 0;
  }

  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpForLevel(run.level + 1);
    recomputeAllies();
    SFX.chime();
    const A2 = world.anthill;
    ring(A2.x, A2.y, { r0: 24, r1: 190, life: 0.7, color: "#6db7ff", width: 4 });
    levelUpBurst(A2.x, A2.y - 20);
    floatText(A2.x, A2.y - 150, "NÍVEL " + run.level + "! A COLÔNIA FICOU MAIS FORTE", {
      color: "#6db7ff", life: 2.2, scale: 2,
    });
  }

  fogT += simDt;
  if (fogT >= 0.12) {
    fogT = 0;
    const beings = [];
    const nester = allies.queen;
    if (nester && !nester.dead) beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 360 });
    else beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 240 });
    for (const a of allies) {
      if (a.dead || a.dying || a.type === "queen" || a.inside) continue;
      beings.push({ x: a.x, y: a.y, sight: (a.def.sight || SIGHT[a.def.role] || 240) * fruitSight() * (a.type === "scout" ? 1 + metaBonus().fruitVision : 1) });
    }
    if (boss && !boss.dead && (boss.revealT || 0) > 0) beings.push({ x: boss.x, y: boss.y, sight: 320 });
    fogUpdate(beings);
  }
  checkRunOutcome(run);
}

// Regras comuns da partida: são executadas antes de curas e depois de cada
// tick do mundo, no interior e na superfície. Nenhuma tela pula o desfecho.
function checkRunOutcome(run) {
  if (run.status !== "running") return false;
  const q = allies.queen;
  if (q && q.hp <= 0 && !q.dead) {
    // acessibilidade invencível
    if (G.save.accessibility.invincible) {
      q.hp = q.maxHp * 0.3;
      floatText(world.anthill.x, world.anthill.y - 80, "MODO ACESSÍVEL: RAINHA PROTEGIDA", { color: "#7fd6a0", life: 1.5 });
      return false;
    }
    if (metaBonus().rebirth && !run.rebirthUsed) {
      run.rebirthUsed = true;
      q.hp = q.maxHp * META_POWER.r_ren;
      q.flash = 0.4;
      SFX.rebirth();
      ring(world.anthill.x, world.anthill.y, { r0: 14, r1: 260, life: 0.9, color: "#c77dff", width: 6 });
      burst(world.anthill.x, world.anthill.y, { n: 46, color: ["#c77dff", "#ffd479", "#efe9ff"], spMin: 40, spMax: 220, life: 0.9, glow: true });
      floatText(world.anthill.x, world.anthill.y - 110, "RENASCIMENTO REAL!", { color: "#c77dff", life: 2.2, scale: 2 });
    } else {
      q.dead = true;
      endRun(false);
      return true;
    }
  }
  if (run.status === "running" && run.bossDefeated && isLastMap() && run.bossDefeated === mapDef().boss && !run.endless && !run.bossRush) {
    endRun(true);
    return true;
  }
  if (run.bossRush && run.kills >= 3 && run.status === "running") {
    if (run.mapsCleared >= 3) { endRun(true); return true; }
  }

  return false;
}

// --------------------------------------------------------------------- RUN --
function updateRun(dt) {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  // cutscene HQ update
  if (isCutsceneActive()) {
    const res = updateCutscene(dt);
    if (res === "close") {
      // loading closed, continue
    }
    // input handled in separate?
    if (handleCutsceneInput(pressed, mouse)) {
      // handled
    }
    return;
  }
  if (!paused && checkRunOutcome(run)) { hudInputless(dt); return; }
  // FASE 2: gameSpeed + acessibilidade slowMo combinados
  const baseSpeed = G.save.settings.gameSpeed || 1;
  const slowMult = G.save.accessibility.slowMo ? 0.5 : 1;
  const totalSpeed = baseSpeed * slowMult;
  const simDt = dt * G.timeScale * totalSpeed;
  run.elapsed += simDt;

  // ------------------------------------------------ FORMIGUEIRO (duas telas) --
  // REWORK: abrir o formigueiro NÃO congela mais o mundo. Enquanto o jogador
  // olha o lado de dentro, a colônia continua trabalhando, as ondas continuam
  // vindo e quem está lá fora vive a própria vida — o "OLHO LÁ FORA" mostra
  // exatamente esse mundo rodando (ver drawOutsideEye em render.js).
  if (run.baseOpen) {
    if (pressed.Escape || pressed.KeyB) { closeNest(run, true); hudInputless(dt); return; }
    nestUpdate(dt, true);
    if (run.status === "running" && !paused) worldTick(simDt, run);
    // A BOCA: L solta uma formiga para fora, P chama uma de volta para dentro
    // (o mesmo vale pela camada de toque — ver game/mobile/touch.js)
    if (pressed.KeyL || pressed.PageUp) nestSendOut(1);
    if (pressed.KeyP || pressed.PageDown) nestCallBack(1);
    hudInputless(dt);
    return;
  }

  if (run.status === "running" && pressed.Escape) {
    paused = !paused;
    SFX.uiClick();
  }
  if (G.screen !== "RUN") return;

  if (run.status === "won" || run.status === "lost") {
    run.endT -= dt;
    updateAllies(simDt, foes);
    updateFoes(simDt, allies);
    if (boss) updateBoss(simDt, allies);
    updateProjectiles(simDt, allies, foes);
    if (run.endT <= 0 && run.status !== "ended") {
      settleRun();
      run.status = "ended";
    }
    hudInputless(dt);
    return;
  }

  if (run.status === "ended") { hudInputless(dt); return; }
  if (paused) { hudInputless(dt); return; }

  if (run.transition) {
    hudInputless(dt);
    const g2 = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
    if (g2 > 0) run.essencePool += Math.round(g2 * metaBonus().essMult);
    return;
  }

  // FASE2 SOMBRA ALADA: inverte controles
  if (G.run && G.run.invertT > 0) {
    G.run.invertT -= dt;
  }
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (G.run && G.run.invertT > 0) { mx = -mx; my = -my; }
  if (mx && my) { mx *= 0.7071; my *= 0.7071; }
  if (mx || my) { TUT.camAccum += 400 * dt; }
  updateCam(dt, mx, my);
  if (mouse.wheel) zoomCam(mouse.wheel, mouse.x, mouse.y);
  if (pressed.Space) { cam.x = world.anthill.x; cam.y = world.anthill.y; }

  if (!run.draft && director.pendingDrafts > 0 && director.phase === "calm" && !run.transition) {
    director.pendingDrafts--;
    run.draft = { options: rollDraft(), t: 0 };
    SFX.chime();
    const A = world.anthill;
    magicOrb(A.x, A.y - 40, "#c77dff");
  }
  if (run.draft) {
    run.draft.t += dt;
    for (let i = 0; i < run.draft.options.length; i++) {
      if (pressed["Digit" + (i + 1)]) {
        pickDraft(i);
        return;
      }
    }
    hudInputless(dt);
    return;
  }

  if (TUT.active && pressed.KeyT) stopTutorial(true);
  if (TUT.active) updateTutorial(dt, run);

  if (director.phase === "mapClear" && !run.transition && run.status === "running") {
    // (só CAMPANHA/CAÇADA chegam aqui: no modo SOBREVIVÊNCIA o chefão é marco
    // de ciclo e o fluxo volta direto para a calmaria em waves.js)
    run.transition = true;
    SFX.win();
    return;
  }

  for (let i = 0; i < SHOP.length; i++) {
    // teclas 1-9 nas nove primeiras classes, 0 na décima (Tecelã); a
    // Dinoponera é a 11ª e nasce só pelo card da fileira
    const hot = i < 9 ? "Digit" + (i + 1) : i === 9 ? "Digit0" : null;
    if (hot && pressed[hot]) {
      const r = buyUnit(SHOP[i].type);
      if (!r.ok) {
        const wp = screenToWorld(mouse.x, mouse.y - 20);
        floatText(wp.x, wp.y, r.why, { color: "#ff4d5a", life: 1 });
      }
    }
  }
  if (pressed.KeyQ) { shopOpen = !shopOpen; SFX.uiClick(); }
  if (pressed.KeyG && director.phase === "calm") skipPeace();
  if (pressed.KeyB && run.status === "running") { openNest(run); return; }
  if (run.testMode && pressed.KeyN && run.status === "running") {
    triggerMapChange((director.mapIdx + 1) % MAPS.length);
    return;
  }
  if (run.testMode && pressed.KeyK && run.status === "running") {
    skipWave();
    return;
  }
  // FASE 4 FINAL: infiniteDash - sem cooldown quando ligado, 3s cooldown quando desligado
  if (rallyCooldown > 0) rallyCooldown -= simDt;
  if (pressed.KeyF) {
    const infinite = G.save.accessibility.infiniteDash;
    if (!infinite && rallyCooldown > 0) {
      floatText(world.anthill.x, world.anthill.y - 90, "RALI EM RECARGA " + rallyCooldown.toFixed(1) + "s", { color: "#ff4d5a", life: 1.0 });
      SFX.deny && SFX.deny();
    } else {
      const n = rallyDefenders(world.anthill);
      tutEvent("rally", n);
      if (n > 0) floatText(world.anthill.x, world.anthill.y - 110, "GUARDA FORMADA! (" + n + ")" + (infinite ? " ∞" : ""), { color: "#37e6c8", life: 1.4 });
      ring(world.anthill.x, world.anthill.y, { r0: 40, r1: 200, life: 0.5, color: "#37e6c8", width: 3 });
      if (!infinite) rallyCooldown = 3.0;
    }
  }

  worldTick(simDt, run);

  if (run.status !== "running") { hudInputless(dt); return; }
  const q = allies.queen;

  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    run.heartbeatT -= dt;
    if (run.heartbeatT <= 0) { run.heartbeatT = 0.95; SFX.heart(); }
  }

  if (!uiCapture()) runMouseWorld(dt);

  hudInputless(dt);
}

function spawnAmbient(simDt) {
  const def = world.def;
  if (!def) return;
  // reduz partículas se acessibilidade
  if (G.save.accessibility.reducedParticles && Math.random() < 0.6) return;
  if (!G.save.settings.particles && Math.random() < 0.7) return;
  const style = def.ambient.style;
  const cols = def.ambient.colors;
  const rate = style === "snow" || style === "sand" ? 14 : 9;
  if (Math.random() > simDt * rate) return;
  const vis = visibleWorldRect(0);
  const x = rand(vis.x0, vis.x1), y = rand(vis.y0, vis.y1);
  let vx = rand(-6, 6), vy = rand(-18, -7), life = rand(2.5, 6), size = rand(1.2, 2.4);
  const col = cols[(Math.random() * cols.length) | 0];
  let glow = true;
  switch (style) {
    case "sand":  vx = rand(60, 130); vy = rand(-4, 10); life = rand(0.9, 1.8); size = rand(1, 2); glow = false; break;
    case "snow":  vx = rand(-14, 4); vy = rand(16, 30); life = rand(3, 6); size = rand(1.2, 2.6); break;
    case "leaves":vx = rand(-24, 10); vy = rand(10, 26); life = rand(2.5, 5); size = rand(1.6, 2.8); glow = false; break;
    case "wisps": vx = rand(-8, 8); vy = rand(-22, -10); life = rand(3, 6.5); break;
    case "spores":vx = rand(-10, 10); vy = rand(-12, -4); life = rand(2.5, 5.5); break;
    case "pollen":vx = rand(-10, 10); vy = rand(-14, -5); life = rand(2.2, 5); break;
  }
  spawnPart({ x, y, vx, vy, life, size, sizeEnd: 0.6, color: col, glow, drag: 1 });
}

function hudInputless(dt) {
  const run = G.run;
  if (run && run.banner && run.banner.t > 0) run.banner.t -= dt;
}

function runMouseWorld(dt) {
  const w = screenToWorld(mouse.x, mouse.y);

  if (mouse.justDown) {
    pan.active = true;
    pan.moved = false;
  }
  if (pan.active && mouse.down) {
    const dx = mouse.x - mouse.lastX, dy = mouse.y - mouse.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      panCam(-dx / cam.zoom, -dy / cam.zoom);
      if (dx * dx + dy * dy > 9) pan.moved = true;
      TUT.camAccum += Math.abs(dx) + Math.abs(dy);
    }
  }
  if (pan.active && mouse.justUp) {
    pan.active = false;
    if (!pan.moved) {
      let consumed = false;
      // MOBILE (gesto inteligente): toque em cima de uma formiga a seleciona;
      // toque longe com nada selecionado dá uma dica rápida. Fora do modo
      // toque (touchMode.smart = false) nada disso roda — PC intacto.
      if (touchMode.smart) {
        const ally = allyAt(w.x, w.y);
        if (ally) {
          clearSelection();
          ally.selected = true;
          SFX.select();
          tutEvent("selected", 1);
          consumed = true;
        } else if (selectedCount() === 0 && G.time - touchHintT > 6) {
          touchHintT = G.time;
          floatText(w.x, w.y - 16, "TOQUE NUMA FORMIGA PARA SELECIONAR", { color: "#9a8fc0", life: 1.4 });
        }
      }
      if (!consumed && selectedCount() > 0) {
        const foe = enemyAt(w.x, w.y);
        if (foe) {
          if (orderAttackSelected(foe) > 0) {
            ring(foe.x, foe.y, { r0: 6, r1: 40, life: 0.4, color: "#ff4d5a", width: 3 });
            impact(foe.x, foe.y, { color: "#ff4d5a", power: 1.2 });
          }
        } else {
          const res = resourceAt(w.x, w.y);
          const n = orderSelected(w.x, w.y, { resourceAt });
          if (n > 0) {
            ring(w.x, w.y, { r0: 4, r1: 28, life: 0.35, color: res ? "#ffd479" : "#37e6c8", width: 2 });
            if (res) tutEvent("gatherOrder", res);
          }
        }
      }
    }
  }

  if (mouse.justRightDown) {
    sel.active = true;
    sel.moved = false;
    sel.x0 = w.x; sel.y0 = w.y; sel.x1 = w.x; sel.y1 = w.y;
  }
  if (sel.active && mouse.right) {
    sel.x1 = w.x; sel.y1 = w.y;
    if (Math.hypot(sel.x1 - sel.x0, sel.y1 - sel.y0) > 8 / cam.zoom) sel.moved = true;
  }
  if (sel.active && mouse.justRightUp) {
    sel.active = false;
    if (sel.moved) {
      const n = selectInRect(sel.x0, sel.y0, sel.x1, sel.y1, keys.ShiftLeft || keys.ShiftRight);
      if (n > 0) tutEvent("selected", n);
      else if (!(keys.ShiftLeft || keys.ShiftRight) && selectedCount() === 0) clearSelection();
    } else {
      const a = allyAt(sel.x0, sel.y0);
      if (a) {
        if (!(keys.ShiftLeft || keys.ShiftRight)) clearSelection();
        a.selected = true;
        SFX.select();
        tutEvent("selected", 1);
      } else {
        clearSelection();
      }
    }
  }
  if (mouse.rdbl) {
    const a = allyAt(w.x, w.y);
    if (a) {
      const vis = visibleWorldRect(0);
      const n = selectTypeOnScreen(a.type, vis);
      if (n > 0) tutEvent("selected", n);
    }
  }
}

function pickDraft(i) {
  const run = G.run;
  const m = run.draft.options[i];
  if (!m) return;
  applyMutation(m);
  ptEvento("draft", { id: m.id, raridade: m.rar, nivel: run.level, t: Math.round(run.elapsed) });
  run.draft = null;
  SFX.buy();
  const A = world.anthill;
  magicOrb(A.x, A.y - 30, RARITY[m.rar].color);
}

// ------------------------------------------------------------------ render --
let paused = false;

export function render(dt) {
  if (isLoadingActive() && !isLoadingFadingOut()) {
    drawLoadingScreen(ctx, G.time);
    cursorCustom();
    return;
  }

  ctx.imageSmoothingEnabled = false;
  uiBegin();
  const fx = transitionFx();
  ctx.save();
  if (fx.alpha < 1) ctx.globalAlpha = fx.alpha;
  if (fx.scale !== 1 || fx.ox || fx.oy) {
    ctx.translate(VIEW_W / 2 + fx.ox, VIEW_H / 2 + fx.oy);
    ctx.scale(fx.scale, fx.scale);
    ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
  }
  switch (G.screen) {
    case "BOOT": break;
    case "PRETITLE": renderPreTitleScreen(); break;
    case "TITLE": renderTitle(); break;
    case "MODE": renderModeScreen(); break;
    case "OPTIONS": renderOptions(); break;
    case "HELP": renderHelp(); break;
    case "TREE": {
      const hud = drawTree(ctx, dt);
      if (hud === "back") backFromTree();
      else if (hud === "prophecies") openProphecies();
      else if (hud === "memories") openMemories();
      break;
    }
    case "PROPHECY": renderProphecyScreen(); break;
    case "MEMORY": renderMemoryScreen(); break;
    case "RUN": renderRun(); break;
  }
  flushPaperFrames(ctx);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (hasTransition()) drawTransition(ctx);
  if (isLoadingActive()) drawLoadingScreen(ctx, G.time);
  cursorCustom();
}

function cursorCustom() {
  if (G.screen !== "RUN") { canvas.style.cursor = "default"; return; }
  canvas.style.cursor = "none";
  ctx.strokeStyle = "rgba(239,233,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mouse.x - 8, mouse.y); ctx.lineTo(mouse.x - 2, mouse.y);
  ctx.moveTo(mouse.x + 2, mouse.y); ctx.lineTo(mouse.x + 8, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 8); ctx.lineTo(mouse.x, mouse.y - 2);
  ctx.moveTo(mouse.x, mouse.y + 2); ctx.lineTo(mouse.x, mouse.y + 8);
  ctx.stroke();
  ctx.fillStyle = "#ffd479";
  ctx.fillRect(mouse.x - 1, mouse.y - 1, 2, 2);
}

// --------------------------------------------------------------- PRE-TITLE --
function renderPreTitleScreen() {
  drawPreTitle(ctx, G.time);
}

// ------------------------------------------------------------------ título ---
function renderTitle() {
  drawTitleBg(ctx);
  drawTitleMotes(ctx, G.time);

  const mobile = isMobileLayout();
  const tY = 54 + Math.sin(G.time * 0.7) * 2.5;
  drawTitleLogo(ctx, G.time, 56, tY, 4.1);

  ctx.fillStyle = "rgba(8,6,14,0.58)";
  // A faixa acompanha a altura REAL da tinta: com FONTE GRANDE o "COLÔNIA
  // ETERNA" (escala 2) cresce 30% e o antigo retângulo de 24px ficava curto.
  const tFS = fontScale();
  const bandY = tY + 128;
  const bandH = tFS > 1 ? Math.ceil(28 * tFS) + 12 : 44;
  ctx.fillRect(56, bandY, 500, bandH);
  drawText(ctx, "COLÔNIA ETERNA", 60, bandY + (tFS > 1 ? 0 : 4),
    { font: "small", scale: 2, color: "#ffd479", shadow: false, maxWidth: 490 });
  // subtítulo: linha própria entre a faixa e o 1º botão. Com FONTE GRANDE a
  // tinta do nome cresce 30% e o subtítulo desce só até onde há folga — no
  // mobile o 1º botão não pode descer (o rodapé está logo abaixo do último).
  drawText(ctx, "A Névoa levou o velho mundo. A colônia segue em frente.", 60,
    tY + (tFS > 1 ? (mobile ? 172 : 178) : 174),
    { color: "#8f7bb5", maxWidth: VIEW_W - 120, scale: tFS > 1 ? 0.9 : 1 });

  // A hitbox acompanha toda a escrita, inclusive o item longo com FONTE GRANDE.
  const bx = 56, bw = tFS > 1 ? 460 : 350;
  // Mobile: o DESENHO é o do PC (46/42/40/38). O que muda é só o espaçamento,
  // que precisa de folga >= 2*HIT_PAD para as hitboxes vizinhas não se tocarem.
  const btnH = 46;
  const btns = [
    { label: "JOGAR", id: "start", accent: "#37e6c8", h: btnH, font: "big" },
    { label: "ÁRVORE DA EVOLUÇÃO", id: "tree", accent: "#c77dff", h: 42, font: "big" },
    { label: "OPÇÕES", id: "options", accent: "#ffb347", h: 40, font: "big" },
    { label: "COMO JOGAR", id: "help", accent: "#6db7ff", h: 38 },
  ];
  // Navegação estilo Dead Cells (pedido 2026-10-10): ↑↓/W-S circulam a seleção
  // com wrap, Enter/Espaço confirma; o hover do ponteiro sincroniza a seleção
  // (hover = seleção). No toque não há seleção persistente — o dedo aciona direto.
  const keyboardUI = !isTouchUI();
  if (pressed["ArrowDown"] || pressed["KeyS"]) titleSel = (titleSel + 1) % btns.length;
  else if (pressed["ArrowUp"] || pressed["KeyW"]) titleSel = (titleSel - 1 + btns.length) % btns.length;
  if (titleSel < 0 || titleSel >= btns.length) titleSel = 0;
  const titleConfirm = keyboardUI && (pressed["Enter"] || pressed["NumpadEnter"] || pressed["Space"]);

  // FONTE GRANDE no PC: 6px a mais de respiro entre o subtítulo e o 1º botão
  let by = mobile ? 252 : (tFS > 1 ? 258 : 252);
  if (keyboardUI) {
    for (let i = 0; i < btns.length; i++) {
      if (pointInRect(mouse.x, mouse.y, bx, by, bw, btns[i].h)) titleSel = i;
      by += btns[i].h + (mobile ? 22 : 10);
    }
    by = mobile ? 252 : (tFS > 1 ? 258 : 252);
  }
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    const sel = keyboardUI && i === titleSel;
    // TITLE volta a ser só escrita (2026-10-14); placas ficam nas outras telas.
    const clicked = button(ctx, { x: bx, y: by, w: bw, h: b.h, label: b.label, font: b.font || "small", scale: b.id === "options" ? 0.9 : 1, id: b.id, accent: b.accent, selected: sel, style: "text" });
    if (sel && titleConfirm && !clicked) SFX.uiClick();
    if (clicked || (sel && titleConfirm)) {
      if (b.id === "start") {
        notePointer(mouse.x, mouse.y);
        initAudio();
        startTransition("auto", "TITLE", "MODE", 0, () => { G.screen = "MODE"; });
        return;
      } else if (b.id === "tree") {
        notePointer(mouse.x, mouse.y);
        openTreeScreen("TITLE");
        return;
      } else if (b.id === "options") {
        notePointer(mouse.x, mouse.y);
        optionsReturn = "TITLE";
        optionsTab = 0; optionsScroll = 0; optGrab = null;
        startTransition("auto", "TITLE", "OPTIONS", 0, () => { G.screen = "OPTIONS"; });
        return;
      } else if (b.id === "help") {
        notePointer(mouse.x, mouse.y);
        helpReturn = "TITLE";
        startTransition("auto", "TITLE", "HELP", 0, () => { G.screen = "HELP"; });
        return;
      }
    }
    by += b.h + (mobile ? 22 : 10);
  }

  // Rodapé de versão (linha com "v2.4" e "PLANICIE VIVA") retirado da TITLE a pedido
  // (2026-10-14). A barra permanece só quando o aviso de acessibilidade está
  // ativo: ele é estado do save, não texto informativo, e precisa de fundo.
  // FASE 6 FINAL: área toque maior rodapé 28px -> 44px + touch feedback vibrate + 104px
  if (G.save.accessibility && (G.save.accessibility.invincible || G.save.accessibility.slowMo || G.save.accessibility.infiniteDash)) {
    const footerH = mobile ? 44 : 32;
    const footerY = VIEW_H - footerH - 10;
    panel(ctx, 12, footerY, VIEW_W - 24, footerH, { paperKind: "header", fill: "rgba(10,8,16,0.75)", border: "rgba(74,58,110,0.45)", r: 4 });
    drawText(ctx, "MODO ACESSÍVEL ATIVO" + (G.save.accessibility.infiniteDash ? " ∞" : ""), VIEW_W - 20, footerY + (mobile ? 14 : 8), { color: "#7fd6a0", align: "right", scale: mobile ? 0.8 : 1 });
    flushPaperFrames(ctx);
  }
}

// -------------------------------------------------------------- MODO SELEÇÃO -- FASE 3 + 6 FINAL: lift 6px + 104px mobile + notePointer + scroll visual offset + touch feedback
function renderModeScreen() {
  drawModeSelect(ctx, G.time);
  // FASE 6 FINAL: passa scrollOffset para render com offset visual
  modeRects = drawModeCards(ctx, GAME_MODES, modeHover, G.time, modeScrollOffset);

  // PÓS-FINAL — barra da ASCENSÃO DA NÉVOA (embaixo dos cards, só campanha).
  // Proporção original de banner (960×192 = 5:1): 360×72 centrada, sem sobrepor VOLTAR nem o rodapé.
  const ascUnlocked = G.save.best.wins > 0;
  const ascW = 360, ascH = 72, ascX = Math.round((VIEW_W - ascW) / 2), ascY = 434;
  ascRects = [];
  panel(ctx, ascX, ascY, ascW, ascH, { paperKind: "banner", border: ascUnlocked ? "#ffd479" : "#3a3054", fill: "rgba(10,8,16,0.8)" });
  const qAsc = paperQuiet("banner", ascX, ascY, ascW, ascH);
  const ascCx = qAsc.x + qAsc.w / 2;
  if (ascUnlocked) {
    const maxSel = Math.min(G.save.ascension + 1, ASC_MAX);
    G.pendingAsc = Math.max(0, Math.min(G.pendingAsc | 0, maxSel));
    const lv = G.pendingAsc;
    drawText(ctx, "<", qAsc.x + 2, qAsc.y + 8, { color: lv > 0 ? "#ffd479" : "#5a4f78", scale: 0.72 / fontScale() });
    drawText(ctx, ">", qAsc.x + qAsc.w - 10, qAsc.y + 8, { color: lv < maxSel ? "#ffd479" : "#5a4f78", scale: 0.72 / fontScale() });
    const innerAscW = Math.max(40, qAsc.w - 28);
    drawText(ctx, "ASCENSÃO DA NÉVOA " + lv + "/" + ASC_MAX, ascCx, qAsc.y + 2, { color: "#ffd479", align: "center", scale: 0.62, maxWidth: innerAscW });
    drawText(ctx, ascLabel(lv) + " • ESSÊNCIA x" + ascMods(lv).ess.toFixed(2), ascCx, qAsc.y + 17, { color: PAL.textDim, align: "center", scale: 0.56, maxWidth: innerAscW });
    ascRects = [
      { x: ascX, y: ascY, w: 48, h: ascH, d: -1 },
      { x: ascX + ascW - 48, y: ascY, w: 48, h: ascH, d: 1 },
    ];
  } else {
    const lockX = qAsc.x + 12, lockW = Math.max(40, qAsc.w - 24);
    const lockB = fitTextBlock("VENÇA A CAMPANHA PARA DESPERTAR A ASCENSÃO DA NÉVOA", lockW, qAsc.h, { scale: 0.56, minScale: 0.40, lineStep: 13 });
    const ly0 = qAsc.y + Math.max(0, (qAsc.h - lockB.lines.length * lockB.step) / 2);
    lockB.lines.forEach((L, i) => drawText(ctx, L, lockX + lockW / 2, ly0 + i * lockB.step, { color: "#5a4f78", align: "center", scale: lockB.scale, maxWidth: lockW }));
  }
  flushPaperFrames(ctx);

  const mobile = isMobileLayout();
  // VOLTAR na mesma faixa da barra de ascensão (à esquerda dela: nada sobreposto)
  if (button(ctx, { x: 20, y: 448, w: 190, h: 44, label: "VOLTAR", id: "modeBack", accent: "#ff4d5a" })) {
    notePointer(mouse.x, mouse.y);
    if (mobile && navigator.vibrate) navigator.vibrate(20);
    startTransition("auto", "MODE", "TITLE", 0, () => { G.screen = "TITLE"; });
  }
  // rodapé limpo sem tábua encolhida: texto legível direto sobre o fundo
  const footerY = VIEW_H - 22;
  drawText(ctx, mobile ? "TOQUE NO CARD PARA JOGAR • CAMPANHA OU MODO TESTE" : "ESC: VOLTAR • CLIQUE NO CARD PARA JOGAR • CAMPANHA OU MODO TESTE",
    VIEW_W / 2, footerY, { color: "#9a8fc0", align: "center", scale: mobile ? 0.78 : 0.85, maxWidth: VIEW_W - 60 });
}

// -------------------------------------------------------------- OPÇÕES -- 5 abas, fundo sólido (parallax só no TITLE)
// Toda posição horizontal nasce da largura MEDIDA do texto (textWidth) e
// todo texto tem maxWidth: nada vaza, nada sobrepõe. O conteúdo vive numa
// viewport com recorte + rolagem; a troca de aba zera a rolagem.
function renderOptions() {
  setOptionsFontAccent(OPTIONS_TABS[optionsTab]?.color || "#37e6c8");
  drawSolidMenuBg(ctx, "#0e0c1e");
  drawTitleMotes(ctx, G.time);
  ctx.fillStyle = "rgba(10,8,18,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const { PX, PY, PW, PH, q: qOpt } = optBox();
  // Chrome fixo: com FONTE GRANDE só o CONTEÚDO cresce (e rola); título,
  // subtítulo, abas e rodapé mantêm o tamanho — senão o cabeçalho engole a
  // tela e colide com o subtítulo. O 1/FS cancela os +30% do drawText.
  const chrome = 1 / optFS();
  drawText(ctx, "OPÇÕES", VIEW_W / 2, 4, { font: "big", scale: 1.5 * chrome, color: "#ffd479", align: "center" });

  dialogBox(ctx, PX, PY, PW, PH, { border: "#ffb347", accent: "#37e6c8" });

  const V = optViewport();
  const FS = optFS();
  if (optionsTab !== optionsTabPrev) { optionsTabPrev = optionsTab; optionsScroll = 0; optGrab = null; }

  // abas: 6 botões de largura igual preenchendo a área limpa (qOpt), livres das folhas
  const NT = OPTIONS_TABS.length, tabGap = 6, tabW = Math.floor((qOpt.w - tabGap * (NT - 1)) / NT), tabH = 26, tabY = Math.round(qOpt.y);
  const tabX0 = Math.round(qOpt.x + (qOpt.w - (tabW * NT + tabGap * (NT - 1))) / 2);
  for (let i = 0; i < OPTIONS_TABS.length; i++) {
    const tab = OPTIONS_TABS[i];
    const x = tabX0 + i * (tabW + tabGap);
    const sel = optionsTab === i;
    if (button(ctx, { x, y: tabY, w: tabW, h: tabH, compact: true, label: tab.label, id: "tab" + i, accent: tab.color, selected: sel, color: sel ? "#000" : undefined, scale: 0.72 * chrome })) {
      optionsTab = i; optionsScroll = 0; optGrab = null;
    }
    if (sel) {
      ctx.fillStyle = tab.color;
      ctx.fillRect(x + 8, tabY + tabH + 1, tabW - 16, 2);
    }
  }

  // subtítulo curto da aba ativa (dentro de qOpt, abaixo das abas)
  const SUBS = [
    "VOLUME DA MÚSICA E DOS EFEITOS",
    "GRÁFICOS, TELA E DESEMPENHO",
    touchMode.on ? "TOQUES E GESTOS" : "TECLADO E MOUSE",
    "JOGUE DO SEU JEITO",
    "MENUS E TUTORIAIS",
    "DIÁRIO DE PLAYTEST — NADA SAI DESTE APARELHO",
  ];
  drawText(ctx, SUBS[optionsTab], qOpt.x + qOpt.w / 2, tabY + tabH + 5, { color: "#9a8fc0", align: "center", scale: 0.65 * chrome, maxWidth: qOpt.w - 16 });

  // conteúdo rolável com recorte (o que passa da janela não desenha nem clica)
  optionsScroll = clamp(optionsScroll, 0, Math.max(0, optionsContentH - V.h));
  const oy = V.y - optionsScroll;
  const TX = V.x + 6;        // margem esquerda do conteúdo (já dentro de qOpt)
  const RR = V.x + V.w - 18; // margem direita (antes da barra de rolagem)
  optSliders = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(V.x, V.y, V.w, V.h);
  ctx.clip();
  layoutRec.clip = { x: V.x, y: V.y, w: V.w, h: V.h };
  if (optionsTab === 0) optionsContentH = optContentAudio(TX, RR, oy, V, FS);
  else if (optionsTab === 1) optionsContentH = optContentVideo(TX, RR, oy, V, FS);
  else if (optionsTab === 2) optionsContentH = optContentControls(TX, RR, oy, V, FS);
  else if (optionsTab === 3) optionsContentH = optContentAccess(TX, RR, oy, V, FS);
  else if (optionsTab === 4) optionsContentH = optContentLang(TX, RR, oy, V, FS);
  else optionsContentH = optContentTeste(TX, RR, oy, V, FS);
  layoutRec.clip = null;
  ctx.restore();

  // barra de rolagem (só quando o conteúdo passa da janela, com tons de madeira/papel)
  const maxScroll = Math.max(0, optionsContentH - V.h);
  if (maxScroll > 0) {
    const sbX = V.x + V.w - 10;
    ctx.fillStyle = "rgba(107,71,30,0.28)";
    ctx.fillRect(sbX, V.y, 7, V.h);
    const hh = Math.max(26, V.h * V.h / optionsContentH);
    const hy = V.y + (V.h - hh) * (optionsScroll / maxScroll);
    ctx.fillStyle = "#8b5e2b";
    ctx.fillRect(sbX, hy, 7, hh);
    ctx.fillStyle = "#e4ba70";
    ctx.fillRect(sbX + 2, hy + 2, 3, hh - 4);
  }
  flushPaperFrames(ctx);

  // rodapé fixo (fora da área rolável e abaixo do painel: nunca some nem colide com a moldura)
  if (button(ctx, { x: VIEW_W / 2 - 250, y: VIEW_H - 48, w: 220, h: 36, label: "VOLTAR", id: "optionsBack", accent: "#8f6fd6", scale: chrome })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  // troca entre as duas versões paralelas (PC ↔ mobile), mesma engine
  if (button(ctx, { x: VIEW_W / 2 + 30, y: VIEW_H - 48, w: 220, h: 36, label: touchMode.on ? "VERSÃO PC" : "VERSÃO MOBILE", id: "switchVersion", accent: "#37e6c8", scale: 0.85 * chrome })) {
    notePointer(mouse.x, mouse.y);
    location.href = touchMode.on ? "../" : "mobile/";
  }
  if (!touchMode.on) {
    drawText(ctx, "ESC VOLTA", VIEW_W - 40, VIEW_H - 40, { color: "#9a8fc0", scale: 0.75 * chrome, align: "right", maxWidth: 120 });
  }
}

// Linha LIGADO/DESLIGADO das OPÇÕES: ícone + rótulo à esquerda, botão à
// direita, descrição curta embaixo. Retorna a altura ocupada.
function optToggle(y, TX, RR, oy, V, FS, o) {
  const btnW = 120, btnH = 28, bx = RR - btnW;
  const txX = TX + 24, txW = bx - 14 - txX;
  const kit = drawKitIcon(ctx, o.on ? 0 : 1, TX, y + oy + 2, 16);
  if (!kit) {
    ctx.fillStyle = o.on ? o.color : "#5a4f78";
    ctx.fillRect(TX, y + oy + 3, 12, 12);
  }
  drawText(ctx, o.label + ": " + (o.on ? "LIGADO" : "DESLIGADO"), txX, y + oy,
    { color: o.on ? o.color : "#5a4f78", scale: 0.95, maxWidth: txW });
  if (button(ctx, { x: bx, y: y + oy - 4, w: btnW, h: btnH, label: o.on ? "DESLIGAR" : "LIGAR", id: o.id, accent: o.color, tap: true, clip: V, scale: 0.85 })) {
    o.flip();
  }
  let dy = y + 21 * FS;
  if (o.desc) {
    for (const ln of wrapText(o.desc, txW, { scale: 0.8 * FS })) {
      drawText(ctx, ln, txX, dy + oy, { color: "#6b5a8a", scale: 0.8, maxWidth: txW });
      dy += 16 * FS;
    }
  }
  return dy + 11 * FS;
}

// Painel de aviso com quebra de linha medida. Retorna a altura ocupada.
function optNote(y, TX, RR, oy, FS, lines, border, color) {
  const pad = 8, maxW = RR - TX - pad * 2;
  const wrapped = [];
  for (const ln of lines) for (const w of wrapText(ln, maxW, { scale: 0.8 * FS })) wrapped.push(w);
  const lh = 18 * FS, h = wrapped.length * lh + pad * 2;
  panel(ctx, TX, y + oy, RR - TX, h, { paper: false, fill: "rgba(255,179,71,0.07)", border: border || "#ffb347", r: 4 });
  let ly = y + pad + 2;
  for (const w of wrapped) {
    drawText(ctx, w, TX + pad, ly + oy, { color: color || "#ffd479", scale: 0.8, maxWidth: maxW });
    ly += lh;
  }
  return y + h + 10 * FS;
}

// Linha de volume: rótulo + % em cima, [-] barra [+] embaixo.
function optVolRow(y, TX, RR, oy, V, FS, id, label, color) {
  const key = id === "music" ? "musicVol" : "sfxVol";
  const v = G.save.settings[key];
  drawText(ctx, label, TX, y + oy, { color: "#efe9ff", scale: 0.95, maxWidth: 340 });
  drawText(ctx, Math.round(v * 100) + "%", RR, y + oy, { color, align: "right", scale: 0.95 });
  const by = y + 22 * FS, bw = 52, bh = 30;
  if (button(ctx, { x: TX, y: by + oy, w: bw, h: bh, label: "-", id: id + "Down", tap: true, clip: V, scale: 1.1 })) {
    G.save.settings[key] = Math.round(clamp(v - 0.1, 0, 1) * 10) / 10;
    persistSave(); applyMix();
  }
  if (button(ctx, { x: RR - bw, y: by + oy, w: bw, h: bh, label: "+", id: id + "Up", accent: color, tap: true, clip: V, scale: 1.1 })) {
    G.save.settings[key] = Math.round(clamp(v + 0.1, 0, 1) * 10) / 10;
    persistSave(); applyMix();
  }
  // barra (toque/arraste ajustam: updateOptions traduz o gesto em volume)
  const tx0 = TX + bw + 10, tw = (RR - bw - 10) - tx0, th = 14, ty = by + oy + (bh - th) / 2;
  ctx.fillStyle = "#dfcba7";
  ctx.fillRect(tx0, ty, tw, th);
  ctx.strokeStyle = "#a18150"; ctx.lineWidth = 1;
  ctx.strokeRect(tx0 + 0.5, ty + 0.5, tw - 1, th - 1);
  const grad = ctx.createLinearGradient(tx0, ty, tx0, ty + th);
  grad.addColorStop(0, "#e4ba70");
  grad.addColorStop(1, "#aa7438");
  ctx.fillStyle = grad;
  ctx.fillRect(tx0 + 2, ty + 2, (tw - 4) * v, th - 4);
  const hx = tx0 + 2 + (tw - 4) * v;
  ctx.fillStyle = "#fff";
  ctx.fillRect(hx - 2, ty - 3, 4, th + 6);
  optSliders.push({ id, x: tx0, y: ty - 6, w: tw, h: th + 12 });
  return by + bh + 18 * FS;
}

function optContentAudio(TX, RR, oy, V, FS) {
  let cy = 8;
  cy = optVolRow(cy, TX, RR, oy, V, FS, "music", "MÚSICA", "#c77dff");
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "SOM", on: !G.muted, id: "muteBtn", color: "#ff4d5a",
    desc: touchMode.on ? "USE ESTE BOTÃO PARA SILENCIAR TUDO" : "A TECLA M TAMBÉM LIGA E DESLIGA",
    flip() { toggleMute(); applyMix(); persistSave(); },
  });
  cy = optVolRow(cy, TX, RR, oy, V, FS, "sfx", "EFEITOS", "#37e6c8");
  for (const ln of wrapText("TOQUE OU ARRASTE A BARRA • - / + AJUSTAM DE 10 EM 10", RR - TX, { scale: 0.8 * FS })) {
    drawText(ctx, ln, TX, cy + oy, { color: "#6b5a8a", scale: 0.8, maxWidth: RR - TX });
    cy += 17 * FS;
  }
  return cy + 8;
}

function optContentVideo(TX, RR, oy, V, FS) {
  const s = G.save.settings;
  let cy = 8;
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "PARTÍCULAS", on: s.particles, id: "vid_particles", color: "#7fd6a0",
    desc: "POEIRA, PÓLEN E BRILHOS — DESLIGAR GANHA DESEMPENHO",
    flip() { s.particles = !s.particles; persistSave(); },
  });
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "TREMOR DE TELA", on: s.screenshake, id: "vid_screenshake", color: "#ffb347",
    desc: "A CÂMERA BALANÇA NOS GOLPES FORTES",
    flip() { s.screenshake = !s.screenshake; persistSave(); },
  });
  // FILTRO PS1 (decisão do usuário, 2026-10-14): só LIGADO / DESLIGADO, e o
  // LIGADO é a intensidade MÁXIMA — dither Bayer 4x4 + cores de 15 bits, em TUDO
  // (mundo, HUD e menus). É só filtro 2D — nenhuma arte foi remodelada em 3D
  // (ver js/psx_filter.js).
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "FILTRO PS1", on: (s.psx | 0) > 0, id: "vid_psx", color: "#c77dff",
    desc: "QUADRICULADO (DITHER 4x4) + CORES DE 15 BITS, COMO NO PLAYSTATION 1",
    flip() { s.psx = (s.psx | 0) > 0 ? 0 : 1; persistSave(); applyPsxFilter(); },
  });
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "SCANLINES RETRÔ", on: s.scanline, id: "vid_scanline", color: "#6db7ff",
    desc: "LISTRAS DE CRT SOBRE A IMAGEM",
    flip() { s.scanline = !s.scanline; persistSave(); applyScanlines(); },
  });
  const isFull = typeof document !== "undefined" && !!document.fullscreenElement;
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "TELA CHEIA", on: isFull, id: "fullscreen", color: "#c77dff",
    desc: "F11 TAMBÉM ALTERNA NO NAVEGADOR",
    flip() {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      } catch (e) { /* DOM simulado nos testes */ }
    },
  });
  return cy + 8;
}

function optContentControls(TX, RR, oy, V, FS) {
  const rows = touchMode.on ? HELP_CONTROLS_TOUCH : HELP_CONTROLS;
  // coluna da descrição começa depois da TECLA mais larga (medida de verdade)
  let keyW = 0;
  for (const [k] of rows) keyW = Math.max(keyW, textWidth(k, { scale: 0.9 }));
  const dx = TX + keyW + 18, dw = RR - dx;
  let cy = 8;
  for (const [k, d] of rows) {
    drawText(ctx, k, TX, cy + oy, { color: "#37e6c8", scale: 0.9, maxWidth: keyW + 2 });
    drawText(ctx, d, dx, cy + oy, { color: PAL.text, scale: 0.85, maxWidth: dw });
    cy += 19 * FS;
  }
  cy += 10 * FS;
  if (touchMode.on) {
    const s = G.save.settings;
    cy = optToggle(cy, TX, RR, oy, V, FS, {
      label: "MODO ORDENAR / SELECIONAR", on: !!s.touchSelect, id: "ctl_touchSelect", color: "#ffd479",
      desc: s.touchSelect
        ? "BOTÃO NA EXPEDIÇÃO ALTERNANDO ORDEM E SELEÇÃO"
        : "GESTOS INTELIGENTES: TOQUE NA FORMIGA SELECIONA",
      flip() { s.touchSelect = !s.touchSelect; persistSave(); touchMode.smart = !s.touchSelect; touchMode.mode = "ordenar"; },
    });
  }
  cy = optNote(cy, TX, RR, oy, FS, touchMode.on ? [
    "TOQUE ORDENA • ARRASTAR MOVE A CÂMERA • PINÇA DÁ ZOOM",
    "2 DEDOS FAZEM CAIXA • DUPLO SELECIONA O TIPO • SAVE PRÓPRIO",
  ] : [
    "A VERSÃO MOBILE (/GAME/MOBILE/) TEM SAVE PRÓPRIO",
    "SETAS ESQ/DIR TROCAM DE ABA • RODA DO MOUSE ROLA A TELA",
  ], "#ffb347");
  return cy + 8;
}

function optContentAccess(TX, RR, oy, V, FS) {
  const a = G.save.accessibility, s = G.save.settings;
  let cy = 8;
  const rows = [
    { key: "invincible", label: "RAINHA INVENCÍVEL", desc: "A RAINHA NÃO MORRE: VOLTA COM 30% DA VIDA", color: "#7fd6a0" },
    { key: "infiniteDash", label: "AÇÕES SEM RECARGA", desc: "RALI (F) E ATAQUES SEM TEMPO DE ESPERA", color: "#37e6c8" },
    { key: "slowMo", label: "CÂMERA LENTA", desc: "TUDO RODA NA METADE DA VELOCIDADE", color: "#6db7ff" },
    { key: "bigFont", label: "FONTE GRANDE", desc: "TEXTOS 30% MAIORES EM TODO O JOGO", color: "#ffd479" },
    { key: "reducedParticles", label: "POUCAS PARTÍCULAS", desc: "MENOS EFEITOS E DISTRAÇÕES VISUAIS", color: "#c77dff" },
    { key: "highContrast", label: "ALTO CONTRASTE", desc: "CONTORNOS FORTES NOS TEXTOS", color: "#ff4d5a" },
  ];
  for (const o of rows) {
    cy = optToggle(cy, TX, RR, oy, V, FS, {
      label: o.label, desc: o.desc, on: !!a[o.key], id: "acc_" + o.key, color: o.color,
      flip() { a[o.key] = !a[o.key]; persistSave(); },
    });
  }
  // velocidade: rótulo + 4 botões na mesma linha (medidos para caber)
  drawText(ctx, "VELOCIDADE", TX, cy + oy + 6, { color: "#ff7a6a", scale: 0.95, maxWidth: 150 });
  const speeds = [
    { v: 0.5, label: "0.5X LENTO", color: "#7fd6a0" },
    { v: 1, label: "1X NORMAL", color: "#37e6c8" },
    { v: 1.5, label: "1.5X RÁPIDO", color: "#ffb347" },
    { v: 2, label: "2X TURBO", color: "#ff4d5a" },
  ];
  let bw = 0;
  for (const sp of speeds) bw = Math.max(bw, textWidth(sp.label, { scale: 0.72 }));
  let sx = TX + 148;
  bw = Math.min(130, Math.floor((RR - sx - 6 * 3) / 4));
  for (const sp of speeds) {
    const sel = s.gameSpeed === sp.v;
    if (button(ctx, { x: sx, y: cy + oy, w: bw, h: 28, compact: true, label: sp.label, id: "speed_" + sp.v, accent: sp.color, selected: sel, color: sel ? "#000" : undefined, tap: true, clip: V, scale: 0.72 })) {
      s.gameSpeed = sp.v; persistSave();
    }
    sx += bw + 6;
  }
  cy += 30 + 12 * FS;
  if (a.invincible || a.slowMo || s.gameSpeed !== 1) {
    cy = optNote(cy, TX, RR, oy, FS, [
      "MODO ASSIST ATIVO • VELOCIDADE " + s.gameSpeed + "X • CONQUISTAS CONTINUAM VALENDO",
    ], "#7fd6a0", "#7fd6a0");
  }
  return cy + 8;
}

function optContentLang(TX, RR, oy, V, FS) {
  const s = G.save.settings;
  const langs = [
    { id: "pt-BR", tag: "[BR]", label: "PORTUGUÊS", desc: "TRADUÇÃO COMPLETA E REVISADA", color: "#7fd6a0", ready: true },
    { id: "en-US", tag: "[US]", label: "ENGLISH", desc: "ENGLISH TRANSLATION", color: "#6db7ff", ready: false },
    { id: "es", tag: "[ES]", label: "ESPAÑOL", desc: "TRADUCCIÓN AL ESPAÑOL", color: "#ffb347", ready: false },
  ];
  let cy = 8;
  for (const lg of langs) {
    const sel = s.language === lg.id;
    const btnW = 120, bx = RR - btnW, txW = bx - 14 - TX;
    drawText(ctx, lg.tag + "  " + lg.label, TX, cy + oy,
      { color: sel ? lg.color : "#efe9ff", scale: 0.95, maxWidth: txW });
    if (button(ctx, {
      x: bx, y: cy + oy - 4, w: btnW, h: 28,
      label: sel ? "ATIVO" : (lg.ready ? "USAR" : "EM BREVE"), id: "lang_" + lg.id,
      accent: lg.color, color: sel ? lg.color : undefined,
      disabled: sel || !lg.ready, tap: true, clip: V, scale: 0.85,
    })) {
      s.language = lg.id; persistSave();
    }
    drawText(ctx, lg.desc, TX, cy + oy + 21 * FS, { color: "#6b5a8a", scale: 0.8, maxWidth: txW });
    cy += 21 * FS + 16 * FS + 11 * FS;
  }
  cy = optNote(cy, TX, RR, oy, FS, [
    "O IDIOMA VALE PARA MENUS, TUTORIAIS E DESCRIÇÕES",
  ], "#ffd479");
  return cy + 8;
}

// ------------------------------------------------------------- playtest -----
// Aba TESTE: resumo do diário local + EXPORTAR/APAGAR. Serve ao playtest de
// campo (PWA em aparelho real e balanceamento); nada é enviado sozinho.
function ptKb(bytes) {
  return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}
function ptDataCurta(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = n => String(n).padStart(2, "0");
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}
const PT_MODO_NOME = { campanha: "CAMPANHA", sobrevivencia: "SOBREVIVÊNCIA", enxame: "ENXAME", cacada: "CAÇADA", teste: "MODO TESTE" };

function optContentTeste(TX, RR, oy, V, FS) {
  const r = ptResumo();
  let cy = 8;
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "DIÁRIO DE TESTE", on: r.ativo, id: "ptToggle", color: "#7fd6a0",
    desc: "REGISTRA EXPEDIÇÕES, PODERES E FALHAS PARA O PLAYTEST",
    flip() { const on = ptLigar(!r.ativo); ptAviso(on ? "DIÁRIO LIGADO" : "DIÁRIO DESLIGADO"); },
  });
  const t = r.tot;
  // Estado em linhas curtas (a mensagem nunca cresce o layout: ver abaixo).
  const linhas = r.ativo ? [] : ["DIÁRIO DESLIGADO — NADA NOVO SERÁ GRAVADO"];
  linhas.push(
    "SESSÕES " + t.sessoes + " • EXPEDIÇÕES " + t.expedicoes + " • VITÓRIAS " + t.vitorias + " • DERROTAS " + t.derrotas,
    "EVENTOS " + r.eventos + " • " + ptKb(r.bytes) + " • ERROS " + t.erros + " • PACOTES " + t.pacotes,
  );
  if (r.ultima) linhas.push("ÚLTIMA: " + (PT_MODO_NOME[r.ultima.modo] || "?") + " • MAPA " + ((r.ultima.mapa | 0) + 1) + " • " + (r.ultima.venceu ? "VITÓRIA" : "DERROTA"));
  for (const ln of linhas) {
    drawText(ctx, ln, TX, cy + oy, { color: r.ativo ? "#c9b8f5" : "#ff9ecb", scale: 0.85, maxWidth: RR - TX });
    cy += 17 * FS;
  }
  cy += 2;

  // Ações PRIMEIRO: com rolagem ou FONTE GRANDE os botões continuam à mão.
  const bw = RR - TX;
  if (button(ctx, { x: TX, y: cy + oy, w: bw, h: 40, label: "EXPORTAR DADOS", id: "ptExport", accent: "#37e6c8", tap: true, clip: V })) {
    ptArmed = false;
    ptAviso("PREPARANDO O ARQUIVO...");
    // ptEntregar abre a folha de compartilhamento ainda no gesto do toque
    // (iOS/Android exigem isso); o retorno só atualiza a mensagenzinha.
    ptEntregar().then(res => ptAviso(res.ok ? ("PRONTO: " + String(res.via).toUpperCase()) : ("FALHOU: " + (res.erro || "?"))))
      .catch(() => ptAviso("FALHOU AO EXPORTAR"));
  }
  cy += 58; // a hitbox cresce com a FONTE GRANDE: 8px de folga sobrepunham os botões
  if (button(ctx, { x: TX, y: cy + oy, w: bw, h: 34, label: ptArmed ? "CONFIRMAR APAGAR" : "APAGAR DADOS", id: "ptClear", accent: "#ff4d5a", color: ptArmed ? "#ff8a94" : undefined, tap: true, clip: V, scale: ptArmed ? 1 : 0.9 })) {
    if (!ptArmed) { ptArmed = true; ptAviso("APERTE DE NOVO PARA APAGAR TUDO"); }
    else { ptArmed = false; ptApagar(); ptAviso("DIÁRIO APAGADO"); }
  }
  cy += 40;
  // A mensagem SUBSTITUI a linha do ID: aparecer/sumir não muda a altura.
  drawText(ctx, ptMsg || ("ID: " + r.id + " • DESDE " + ptDataCurta(r.criadoEm)), TX, cy + oy,
    { color: ptMsg ? "#7fd6a0" : "#6b5a8a", scale: 0.8, maxWidth: RR - TX });
  cy += 20 * FS;
  cy = optNote(cy, TX, RR, oy, FS, [
    "OS DADOS FICAM SÓ NESTE APARELHO: EXPORTE E ENVIE NO FIM DO TESTE.",
  ], "#8f6fd6", "#c9b8f5");
  return cy + 8;
}

// ------------------------------------------------------------------ ajuda ----
// HELP - fundo sólido gótico, SEM parallax (parallax exclusivo TITLE)
function renderHelp() {
  drawSolidMenuBg(ctx, "#0a0812");
  ctx.fillStyle = "rgba(10,8,16,0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const helpFS = fontScale();
  const chrome = 1 / helpFS;
  drawText(ctx, "COMO JOGAR", VIEW_W / 2, 4, { font: "big", scale: 1.5 * chrome, color: "#ffd479", align: "center", maxWidth: VIEW_W - 60 });

  const PX = 32, PY = 38, PW = VIEW_W - 64, PH = VIEW_H - 88;
  dialogBox(ctx, PX, PY, PW, PH, { border: "#8f6fd6", accent: "#ffd479" });
  const qH = paperQuiet("panel", PX, PY, PW, PH);

  const colGap = 18;
  const colW = Math.floor((qH.w - colGap) / 2);
  const colX = [Math.round(qH.x), Math.round(qH.x + colW + colGap)];
  const contentY = Math.round(qH.y + 2);
  const maxColH = Math.round(qH.h - 4);
  const headH = 24;
  const controlsTable = touchMode.on ? HELP_CONTROLS_TOUCH : HELP_CONTROLS;

  // Coluna esquerda: OBJETIVO + DICAS ajustados dentro de qH.h (mesmo com FONTE GRANDE)
  drawText(ctx, "OBJETIVO", colX[0], contentY, { font: "big", scale: 0.72 * chrome, color: "#c77dff", maxWidth: colW });
  const goalTop = contentY + headH;
  const goalBudget = Math.floor((maxColH - headH * 2 - 10) * 0.34);
  const gBlock = fitTextBlock(HELP_GOAL, colW, goalBudget, { scale: 0.72, minScale: 0.46, lineStep: 14 });
  let yl = goalTop;
  for (const L of gBlock.lines) {
    drawText(ctx, L, colX[0], yl, { color: PAL.text, scale: gBlock.scale, maxWidth: colW });
    yl += gBlock.step;
  }
  yl += 8;
  drawText(ctx, "DICAS", colX[0], yl, { font: "big", scale: 0.72 * chrome, color: "#c77dff", maxWidth: colW });
  yl += headH;
  const tipsBudget = Math.max(40, contentY + maxColH - yl);
  const tBlock = fitTextBlock(HELP_TIPS, colW, tipsBudget, { scale: 0.68, minScale: 0.44, lineStep: 13.5 });
  for (const L of tBlock.lines) {
    drawText(ctx, L, colX[0], yl, { color: PAL.text, scale: tBlock.scale, maxWidth: colW });
    yl += tBlock.step;
  }

  // Coluna direita: CONTROLES dentro de qH (sem invadir folhas/moldura da direita)
  drawText(ctx, touchMode.on ? "CONTROLES (TOQUE)" : "CONTROLES", colX[1], contentY, { font: "big", scale: 0.72 * chrome, color: "#c77dff", maxWidth: colW });
  const ctlTop = contentY + headH;
  const ctlAvailH = Math.max(60, contentY + maxColH - ctlTop);
  let chosenScale = 0.66, chosenStep = 14, chosenDescX = 96, chosenWrapped = [];
  for (let sc = 0.66; sc >= 0.36; sc -= 0.025) {
    let dX = 68;
    for (const [k] of controlsTable) dX = Math.max(dX, Math.ceil(textWidth(k, { scale: sc })) + 7);
    dX = Math.min(Math.floor(colW * 0.42), dX);
    const dStep = Math.ceil(19.5 * sc * helpFS);
    const wrapped = controlsTable.map(([k, d]) => [k, wrapText(d, colW - dX, { scale: sc })]);
    const totalH = wrapped.reduce((acc, [, ls]) => acc + Math.max(dStep, ls.length * dStep + 1), 0);
    chosenScale = sc; chosenStep = dStep; chosenDescX = dX; chosenWrapped = wrapped;
    if (totalH <= ctlAvailH) break;
  }
  let yr = ctlTop;
  for (const [k, lines] of chosenWrapped) {
    if (yr + chosenStep > contentY + maxColH + 4) break;
    drawText(ctx, k, colX[1], yr, { color: "#37e6c8", scale: chosenScale, maxWidth: chosenDescX - 4 });
    lines.forEach((L, li) => {
      if (yr + (li + 1) * chosenStep <= contentY + maxColH + 4) {
        drawText(ctx, L, colX[1] + chosenDescX, yr + li * chosenStep, { color: PAL.text, scale: chosenScale, maxWidth: colW - chosenDescX });
      }
    });
    yr += Math.max(chosenStep, lines.length * chosenStep + 1);
  }
  flushPaperFrames(ctx);

  const helpMobile = isMobileLayout();
  if (button(ctx, { x: VIEW_W / 2 - (helpMobile ? 120 : 100), y: VIEW_H - 44, w: helpMobile ? 240 : 200, h: 36, label: "VOLTAR", id: "helpBack", accent: "#8f6fd6" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "HELP", helpReturn, 0, () => { G.screen = helpReturn; helpReturn = "TITLE"; });
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    startTransition("auto", "HELP", helpReturn, 0, () => { G.screen = helpReturn; helpReturn = "TITLE"; });
  }
}

// -------------------------------------------------------------------- run ---
let shopTooltip = null;

function renderRun() {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  // cutscene HQ tem prioridade
  if (isCutsceneActive()) {
    drawCutscene(ctx, G.time);
    return;
  }
  // No formigueiro a cena de dentro cobre a tela inteira: desenhar o mundo por
  // baixo seria trabalho jogado fora (e são duas telas vivas no mesmo quadro).
  // O mundo continua visível e simulado pela janela "OLHO LÁ FORA" (drawNest).
  // auditoria de layout: o mundo pode se sobrepor à vontade; a interface não
  layoutRec.layer = "world";
  if (!run.baseOpen) drawRun(ctx, dtClampForAnim());
  layoutRec.layer = "ui";

  const modal = paused || !!run.draft || !!run.transition || !!run.baseOpen || run.status !== "running";

  if (!modal) {
    drawHUD();
    if (run.banner && run.banner.t > 0) drawBanner(run.banner);
    if (TUT.active) drawTutorial(ctx, VIEW_W);
  }
  if (run.draft && !paused) drawDraft(run.draft);
  if (run.transition && !paused) drawMapTransition(run);
  if (run.baseOpen) drawNestScreen(run);
  if (paused) drawPause();
  if (run.status === "ended") drawEnd(run);
}

let lastDt = 1 / 60;
export function setLastDt(v) { lastDt = v; }
function dtClampForAnim() { return lastDt; }

// Regra 14: o Formigueiro é leve (reinicia a cena e sincroniza as formigas) —
// entrar e sair é instantâneo, sem tela de carregamento no meio do combate.
function openNest(run) {
  run.baseOpen = true;
  nestEnter();
  SFX.uiClick();
}

function closeNest(run, click) {
  run.baseOpen = false;
  nestExit();
  if (click) SFX.uiClick();
}

function drawNestScreen(run) {
  if (!nest.open) nestEnter();
  nestHover(mouse.x, mouse.y);
  const action = nestDraw(ctx);
  if (action === "back") { closeNest(run, true); return; }
  // a BOCA: os botões do rodapé mexem na porta. MARCAR OBRA não é clique único:
  // a cena lê o ponteiro em nestUpdate (nest.js:nestInput), porque "pintar a
  // terra" precisa do arraste inteiro — no PC e no toque pelo mesmo caminho.
  if (action === "out") nestSendOut(1);
  else if (action === "in") nestCallBack(1);
}

function hudTopSlot() {
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  return tut ? tut.y + tut.h + 4 : 68;
}

// Opacidade contextual dinâmica (2026-10-16): quando formigas/inimigos passam
// por baixo de um HUD e o cursor não está sobre ele, suaviza a opacidade para
// não bloquear a visão do campo de batalha.
function hudContextAlpha(x, y, w, h) {
  if (pointInRect(mouse.x, mouse.y, x, y, w, h)) return 1;
  for (let i = 0; i < foes.length; i++) {
    const f = foes[i];
    if (f.dead) continue;
    const s = worldToScreen(f.x, f.y);
    if (pointInRect(s.x, s.y, x - 12, y - 12, w + 24, h + 24)) return 0.82;
  }
  for (let i = 0; i < allies.length; i++) {
    const a = allies[i];
    if (a.dead || a.selected) continue;
    const s = worldToScreen(a.x, a.y);
    if (pointInRect(s.x, s.y, x - 8, y - 8, w + 16, h + 16)) return 0.86;
  }
  return 1;
}


function drawHUD() {
  const run = G.run;
  const m = mapDef();
  const q = allies.queen;
  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;
  const biomeId = m ? m.id : "planicie";
  const bh = BIOME_HUD[biomeId] || BIOME_HUD.planicie;
  const era = G.save.era || 0;

  // --- FEROMÔNIO OVERLAY H ---
  if (keys.KeyH && live) {
    drawPheromoneOverlay(ctx, cam, VIEW_W, VIEW_H, worldToScreen, foodTrailAt, dangerAt, G.time);
  }

  // --------------------------------------- painel orgânico compacto da colônia ----
  // HUD com bordas finas e folhas grandes (2026-10-16): 270×144 = 960×512 em
  // escala uniforme (-44% de área ocupada na tela mantendo qCol amplo de 176×86px).
  // Camadas: 1º Fundo (panel_bg) -> 2º Texto/Conteúdo (clipado) -> 3º Moldura (panel_frame)
  const pw = 270;
  const ph = 144;
  ctx.save();
  ctx.globalAlpha = hudContextAlpha(8, 6, pw, ph);
  layoutBox(ctx, "painel", 8, 6, pw, ph);
  const colClipped = beginPaperHud(ctx, "panel", 8, 6, pw, ph);
  if (!colClipped) panel(ctx, 8, 6, pw, ph, { deferFrame: false, border: bh.border, accentLine: bh.accent, fill: "rgba(0,0,0,0)" });
  const qCol = paperQuiet("panel", 8, 6, pw, ph);
  const qCx = qCol.x + qCol.w / 2;

  // Botão "+"/"-" em placa de madeira DENTRO de qCol (decisão do usuário 2026-10-16).
  // A hitbox também cobre (313, 20) para manter compatibilidade com testes de clique.
  const mbW = 22, mbH = 15;
  const mbX = Math.round(qCol.x + qCol.w - mbW), mbY = Math.round(qCol.y);
  const moreR = touchPad(mbX, mbY, mbW, mbH);
  const moreHot = pointInRect(mouse.x, mouse.y, moreR.x, moreR.y, moreR.w, moreR.h) ||
    pointInRect(mouse.x, mouse.y, 300, 10, 32, 24);
  drawPaper(ctx, "wood_icon", mbX, mbY, mbW, mbH, { hot: moreHot, selected: hudExpanded });
  drawText(ctx, hudExpanded ? "-" : "+", mbX + mbW / 2, mbY + 1, { color: "#f6ecd4", align: "center", scale: 0.70, maxWidth: mbW - 4 });
  uiButtons().push({ x: moreR.x, y: moreR.y, w: moreR.w, h: moreR.h, id: "hudMore" });
  if (live && moreHot && mouse.justDown) { hudExpanded = !hudExpanded; SFX.uiClick(); }

  // Linhas do painel: 100% contidas em qCol (inclusive com FONTE GRANDE e modeDef).
  const hasMode = !!run.modeDef;
  const nRows = hasMode ? 5 : 4;
  const rowStep = Math.floor((qCol.h - 2) / nRows);
  const rowScale = Math.min(0.70, (rowStep - 2) / (16 * fontScale()));
  let yy = Math.round(qCol.y + 1);
  const tp = run.testPowers;
  const infMoney = !!(tp && tp.infMoney);
  const infAnts = !!(tp && tp.infAnts);
  const popTxt = "IRMÃS " + popUsed() + "/" + (infAnts ? "∞" : popCapTotal());
  const row1W = qCol.w - mbW - 6;
  const row1Cx = qCol.x + row1W / 2;
  if (hasMode) {
    const m1 = fitTextBlock(run.modeDef.name + (era ? " • ERA " + era : ""), row1W, rowStep, { font: "small", scale: rowScale, minScale: 0.44, lineStep: rowStep });
    drawText(ctx, m1.lines[0] || "", row1Cx, yy, { color: run.modeDef.color, font: "small", scale: m1.scale, align: "center", maxWidth: row1W });
    yy += rowStep;
    const m2 = fitTextBlock(bh.loreName + " • " + popTxt, qCol.w, rowStep, { scale: rowScale, minScale: 0.44, lineStep: rowStep });
    drawText(ctx, m2.lines[0] || "", qCx, yy, { color: bh.border, scale: m2.scale, align: "center", maxWidth: qCol.w });
    yy += rowStep;
  } else {
    const m1 = fitTextBlock(bh.loreName + " • " + popTxt, row1W, rowStep, { scale: rowScale, minScale: 0.44, lineStep: rowStep });
    drawText(ctx, m1.lines[0] || "", row1Cx, yy, { color: bh.border, scale: m1.scale, align: "center", maxWidth: row1W });
    yy += rowStep;
  }
  const hpFrac = q && q.maxHp ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  const low = hpFrac < 0.30;
  // linha da rainha: rótulo + gaster + vida, 100% dentro de qCol.w
  {
    const lbl = low ? "FERIDA!" : "RAINHA";
    const hpTxt = q && q.maxHp ? Math.ceil(q.hp) + "/" + q.maxHp : "";
    const lw = Math.min(50, textWidth(lbl, { font: "small", scale: rowScale }));
    const hw = Math.min(48, textWidth(hpTxt, { scale: rowScale }));
    const gap = 5;
    const barW = Math.max(46, Math.min(72, qCol.w - lw - hw - gap * 2));
    const total = lw + gap + barW + gap + hw;
    const x0 = Math.max(qCol.x, qCx - total / 2);
    drawText(ctx, lbl, x0, yy + 1, { color: low ? "#ff4d5a" : "#ffd479", font: "small", scale: rowScale, maxWidth: lw });
    drawGasterBar(ctx, x0 + lw + gap, yy, barW, Math.min(12, rowStep - 2), hpFrac, biomeId, low, G.time);
    drawText(ctx, hpTxt, x0 + lw + gap + barW + gap, yy + 1, { color: low ? "#ff8a94" : PAL.textDim, scale: rowScale, maxWidth: hw });
  }
  yy += rowStep;
  // ANEL + árvore + comida, 100% dentro de qCol.w
  {
    const anel = "ANEL " + run.level;
    const foodStr = bh.foodLabel + " " + (infMoney ? "∞" : fmt(run.food));
    const aw = Math.min(48, textWidth(anel, { scale: rowScale }));
    const fw = Math.min(74, textWidth(foodStr, { scale: rowScale }));
    const total = Math.min(qCol.w, aw + 5 + 18 + 5 + 13 + 4 + fw);
    const x0 = Math.max(qCol.x, qCx - total / 2);
    drawText(ctx, anel, x0, yy + 1, { color: "#ffd479", scale: rowScale, maxWidth: aw });
    drawTreeRings(ctx, x0 + aw + 14, yy + 6, run.xpNext > 0 ? clamp(run.xp / run.xpNext, 0, 1) : 0, biomeId);
    drawFoodIcon(ctx, biomeId, x0 + aw + 26, yy - 1);
    drawText(ctx, foodStr, x0 + aw + 42, yy + 1, { color: bh.foodColor, scale: rowScale, maxWidth: Math.max(28, qCol.x + qCol.w - (x0 + aw + 42)) });
  }
  yy += rowStep;
  // essência cristal geométrico, grupo centralizado dentro de qCol
  {
    const essStr = bh.essenceLabel + " " + (infMoney ? "∞" : fmt(run.essencePool));
    const ew = Math.min(qCol.w - 20, textWidth(essStr, { scale: rowScale }));
    const total = 13 + 5 + ew;
    const x0 = Math.max(qCol.x, qCx - total / 2);
    drawEssenceCrystal(ctx, x0, yy + 1, 10, bh.essenceColor, G.time);
    drawText(ctx, essStr, x0 + 16, yy + 1, { color: bh.essenceColor, scale: rowScale, maxWidth: qCol.w - 18 });
  }
  if (colClipped) endPaperHud(ctx);
  ctx.restore();

  // ---- fileira de mutações como SEIVA Dourada (Vampire Survivors) ----
  const mutY = 6 + ph + 4;
  let mutTip = null;
  const mutLog = run.mutationLog;
  if (mutLog.length > 0) {
    let ix = 10;
    for (const mm of mutLog.slice(0, 10)) {
      const icon = IMG["i_" + mm.icon];
      drawPaper(ctx, "button", ix, mutY, 20, 20);
      ctx.fillStyle = "rgba(20,14,32,0.55)";
      ctx.fillRect(ix, mutY, 20, 20);
      ctx.strokeStyle = RARITY[mm.rar].color; ctx.lineWidth = 1;
      ctx.strokeRect(ix + 0.5, mutY + 0.5, 19, 19);
      if (icon) ctx.drawImage(icon, ix + 2, mutY + 2, 16, 16);
      ctx.fillStyle = RARITY[mm.rar].color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(ix, mutY+14, 20, 6);
      ctx.globalAlpha = 1;
      if (pointInRect(mouse.x, mouse.y, ix, mutY, 20, 20)) mutTip = mm;
      ix += 24;
    }
    if (mutLog.length > 10) drawText(ctx, "+" + (mutLog.length - 10), ix + 2, mutY + 4, { color: PAL.textDim });
  }
  let leftStackBottom = mutLog.length > 0 ? mutY + 24 : 0;

  // ---- detalhes da colônia expandidos compactos (HUD exclusivo "expanded", 270×144) ----
  if (hudExpanded) {
    const eph = 144;
    const ey = mutY + (mutLog.length > 0 ? 24 : 4);
    ctx.save();
    ctx.globalAlpha = hudContextAlpha(8, ey, pw, eph);
    layoutBox(ctx, "painel", 8, ey, pw, eph);
    const expClipped = beginPaperHud(ctx, "expanded", 8, ey, pw, eph);
    if (!expClipped) panel(ctx, 8, ey, pw, eph, { paperKind: "expanded", deferFrame: false, border: bh.border, fill: "rgba(0,0,0,0)" });
    const qE = paperQuiet("expanded", 8, ey, pw, eph);
    const eCx = qE.x + qE.w / 2;
    const n = colony.needs, hc = colony.headcount;
    const touch = isTouchUI();
    const btnH = touch ? 19 : 0;
    const availH = qE.h - btnH;
    const eStep = Math.floor(availH / (touch ? 4.3 : 5.2));
    const eScale = Math.min(0.66, (eStep - 1) / (16 * fontScale()));
    let ty = Math.round(qE.y);
    drawText(ctx, "COLÔNIA PENSA EM FEROMÔNIO", eCx, ty, { color: bh.border, scale: eScale, align: "center", maxWidth: qE.w });
    ty += eStep;
    drawText(ctx, "ABATES " + run.kills + " • " + bh.waveLabel, eCx, ty, { color: PAL.textDim, scale: eScale, align: "center", maxWidth: qE.w });
    ty += eStep;
    {
      const barW = Math.min(44, Math.floor(qE.w * 0.22)), gap = 8;
      const labels = [["FOME", n.food, "#b77728"], ["GUERRA", n.defense, "#b34b38"], ["CURA", n.medical, "#647d43"]];
      const total = labels.length * barW + (labels.length - 1) * gap;
      let bx = eCx - total / 2;
      for (const [label, v, col] of labels) {
        drawText(ctx, label, bx + barW / 2, ty, { color: col, scale: eScale * 0.88, align: "center", maxWidth: barW });
        ctx.fillStyle = "#c9b28b"; ctx.fillRect(bx, ty + Math.round(eStep * 0.72), barW, 3);
        ctx.fillStyle = col; ctx.fillRect(bx, ty + Math.round(eStep * 0.72), Math.round(barW * clamp(v, 0, 1)), 3);
        bx += barW + gap;
      }
    }
    ty += Math.round(eStep * 1.3);
    drawText(ctx, "COLETA " + hc.gather + " • EXPLORAÇÃO " + hc.explore, eCx, ty, { color: bh.border, scale: eScale, align: "center", maxWidth: qE.w });
    ty += eStep;
    if (touch) {
      const bw = Math.floor(qE.w - 4);
      const by = Math.round(qE.y + qE.h - btnH);
      if (button(ctx, { x: Math.round(eCx - bw / 2), y: by, w: bw, h: btnH, compact: true, label: keys.KeyH ? "OLFATO: LIGADO" : "OLFATO: DESLIGADO", id: "touchScent", scale: 0.60 / fontScale(), accent: bh.accent })) keys.KeyH = !keys.KeyH;
    } else {
      drawText(ctx, "[H] SEGURE PARA VER FEROMÔNIOS", eCx, ty, { color: PAL.textDim, scale: eScale * 0.9, align: "center", maxWidth: qE.w });
    }
    if (expClipped) endPaperHud(ctx);
    ctx.restore();
    leftStackBottom = ey + eph + 6;
  }

  // ------------------------------------ status da invasão compacto (320×64 = 5:1, -29% de área) ----
  const cw = 320, ch = 64, cx0 = Math.round(VIEW_W / 2 - cw / 2);
  ctx.save();
  ctx.globalAlpha = hudContextAlpha(cx0, 4, cw, ch);
  const banClipped = beginPaperHud(ctx, "banner", cx0, 4, cw, ch);
  if (!banClipped) drawPaper(ctx, "banner", cx0, 4, cw, ch);
  const qBan = paperQuiet("banner", cx0, 4, cw, ch);
  const bCx = qBan.x + 20 + (qBan.w - 20) / 2;
  const bMax = qBan.w - 22;
  const bScale1 = Math.min(0.68, 10.5 / (16 * fontScale()));
  const bScale2 = Math.min(0.60, 9.5 / (16 * fontScale()));
  if (run.status === "running") {
    if (director.phase === "calm") {
      const rest = calmFrac();
      const frac = 1 - rest;
      const trailY = Math.round(qBan.y + qBan.h - 10);
      for (let i = 0; i < 5; i++) {
        const prog = trailProgress(G.time, i, 5);
        const tx = qBan.x + 24 + prog * (qBan.w - 36);
        ctx.globalAlpha = 0.28 + prog * 0.55;
        drawTrailAnt(ctx, tx, trailY, G.time + i * 0.1);
      }
      ctx.globalAlpha = hudContextAlpha(cx0, 4, cw, ch);
      const rcx = qBan.x + 10, rcy = qBan.y + qBan.h / 2, rr = 9;
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgba(73,53,33,0.45)";
      ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, Math.PI*2); ctx.stroke();
      if (frac > 0.004) {
        ctx.strokeStyle = rest < 0.25 ? "#b3392b" : bh.foodColor;
        ctx.beginPath(); ctx.arc(rcx, rcy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI*2 * frac); ctx.stroke();
      }
      if (!run.draft) drawText(ctx, Math.max(0, Math.ceil(director.timer)), rcx, rcy - 5, { color: rest < 0.25 ? "#b3392b" : PAL.text, align: "center", scale: Math.min(0.58, 9.5 / (16 * fontScale())) });
      drawText(ctx, run.testMode ? "MODO TESTE • " + bh.waveLabel : (run.endless ? "SOBREVIVÊNCIA • " + bh.waveLabel : bh.waveLabel), bCx, qBan.y - 1, { font: "small", color: bh.border, scale: bScale1, align: "center", maxWidth: bMax });
      const cycTag = run.endless ? (director.cycle ? " • CICLO " + (director.cycle + 1) : " • INF") : "";
      drawText(ctx, run.draft ? "ESCOLHA UMA MEMÓRIA" : ("ONDA " + (director.waveInMap + 1) + "/" + m.waves.length + cycTag), bCx, qBan.y + 13, { color: PAL.textDim, scale: bScale2, align: "center", maxWidth: bMax });
    } else if (director.phase === "mapClear") {
      drawText(ctx, "MAPA LIMPO! " + bh.loreName, qBan.x + qBan.w / 2, qBan.y + 2, { font: "small", color: bh.accent, align: "center", scale: bScale1, maxWidth: qBan.w });
      drawText(ctx, m.name, qBan.x + qBan.w / 2, qBan.y + 14, { color: PAL.textDim, align: "center", scale: bScale2, maxWidth: qBan.w });
    } else {
      const invasionLabel = "INVASÃO " + director.waveInMap + "/" + m.waves.length + (run.endless ? (director.cycle ? " • CICLO " + (director.cycle + 1) : " • INF") : "");
      let aliveF = 0;
      for (const f of foes) if (!f.dead) aliveF++;
      const remainingLabel = "RESTAM " + aliveF + (director.budget > 0 ? "+" : "");
      const wCenterCx = qBan.x + qBan.w / 2;
      drawText(ctx, invasionLabel, wCenterCx, qBan.y, { font: "big", color: "#b3392b", scale: Math.min(0.62, 10 / (18 * fontScale())), align: "center", maxWidth: qBan.w });
      const barY = Math.round(qBan.y + 11), barH = 4;
      ctx.fillStyle = "rgba(73,53,33,0.35)";
      ctx.fillRect(qBan.x + 4, barY, qBan.w - 8, barH);
      const grad = ctx.createLinearGradient(qBan.x + 4, barY, qBan.x + qBan.w - 4, barY);
      grad.addColorStop(0, "#d4533b");
      grad.addColorStop(1, "#9e2b25");
      ctx.fillStyle = grad;
      ctx.fillRect(qBan.x + 4, barY, (qBan.w - 8) * waveProgress(), barH);
      const wDef2 = waveDef();
      drawText(ctx, (wDef2 && wDef2.title ? wDef2.title : m.name) + " • " + remainingLabel, wCenterCx, qBan.y + 17, { color: PAL.textDim, scale: bScale2, align: "center", maxWidth: qBan.w });
    }
  } else {
    drawText(ctx, run.status === "won" || (run.payout && run.payout.winBonus > 0) ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU • " + bh.loreName,
      qBan.x + qBan.w / 2, qBan.y + 6, { font: "small", color: bh.accent, align: "center", scale: bScale1, maxWidth: qBan.w });
  }
  if (banClipped) endPaperHud(ctx);
  ctx.restore();

  const bossUp = !!(boss && !boss.dead && run.status === "running" && (boss.revealT > 0 || fogVisible(boss.x, boss.y)));
  if (live && director.phase === "calm") {
    const by = hudTopSlot() + (bossUp ? 42 : 0);
    const skipW = 240, skipX = Math.round(VIEW_W / 2 - skipW / 2);
    if (button(ctx, { x: skipX, y: by, w: skipW, h: 26, label: isTouchUI() ? "▶ INVOCAR +ESSÊNCIA" : "▶ INVOCAR (G) +ESSÊNCIA", id: "skip", compact: true, accent: bh.essenceColor })) {
      skipPeace();
    }
  }

  // ----------------------------------------- barra de formigas orgânica (rodapé) ----
  // Ícone pequeno (sprite de 58px reduzido para ~20px): com o nearest-neighbor
  // do jogo (pixel art) o desenho vira um borrão — aqui a redução é suave.
  const drawIcon = (img, x, y, w, h) => {
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
    ctx.imageSmoothingEnabled = prev;
  };
  // Botão IRMÃS + cards da loja: placas NOVAS (família 2026-10-19), desenhadas
  // INTEIRAS (escala uniforme) e com o texto dentro da madeira calma medida.
  // A placa antiga (quadrada) esmagava em 92×64 e o texto saía da placa.
  shopTooltip = null;
  let hotCardX = 0, hotCardW = SHOP_CARD.w;  // card em hover p/ ancorar o tooltip
  const footY = VIEW_H - (isMobileLayout() ? 84 : 64);
  const footH = 64;                                   // altura da fileira
  const shopW = 160, shopH = 44;                      // placa 'media' (3,62:1)
  const shopY = footY + Math.round((footH - shopH) / 2);
  button(ctx, {
    x: 10, y: shopY, w: shopW, h: shopH, plate: "media", compact: true,
    label: "", id: "shopToggle",
  });
  const rShop = lastButton();
  {
    const q = placaQuiet("placa_media", 10, shopY, shopW, shopH);
    const shopSprite = rotFrame("worker", Math.PI / 2);
    const sw2 = 20, sh2 = shopSprite.height * (sw2 / shopSprite.width);
    drawIcon(shopSprite, q.x + 1, q.y + (q.h - sh2) / 2, sw2, sh2);
    // O /FS cancela o +30% do FONTE GRANDE: o chrome do rodapé não cresce, e
    // as duas linhas cabem na faixa calma sem se cruzar.
    const FS = fontScale();
    const tx = q.x + 24, tw = Math.max(20, q.x + q.w - tx);
    // Tinta marrom com halo creme: a madeira calma da placa é clara, e tinta
    // creme puro sumia entre os veios (contraste ~1,3:1).
    drawText(ctx, "IRMÃS", tx, q.y, { color: "#4a3116", scale: .85 / FS, maxWidth: tw, paper: true });
    const sub = isTouchUI() ? (shopOpen ? "FECHAR" : "ABRIR") : (shopOpen ? "FECHAR (Q)" : "ABRIR (Q)");
    drawText(ctx, sub, tx, q.y + 20, { color: shopOpen ? "#7a3d12" : "#5a3d1c", scale: .58 / FS, maxWidth: tw, paper: true });
  }

  if (live && rShop.clicked) { shopOpen = !shopOpen; }

  if (shopOpen) {
    const CARD_W = SHOP_CARD.w, CARD_H = SHOP_CARD.h;  // placa 'cartao' (0,43:1)
    const CARD_PITCH = SHOP_CARD.pitch;
    let gx = SHOP_CARD.x0, lastGroup = null;
    for (let i = 0; i < SHOP.length; i++) {
      const sp = SHOP[i];
      if (lastGroup && sp.group !== lastGroup) gx += SHOP_CARD.groupGap;
      lastGroup = sp.group;
      const x = gx;
      const cost = infMoney ? 0 : unitCost(sp.type);
      const canBuy = (infMoney || run.food >= cost) && (infAnts || (popUsed() < popCapTotal() && unitLimitLeft(sp.type)));
      // a placa de madeira do card é o card — pintura atrás dobrava a moldura
      button(ctx, { x, y: footY, w: CARD_W, h: CARD_H, plate: "cartao", compact: true, label: "", id: "shop" + sp.type, disabled: !canBuy });
      const r = lastButton();
      const q = placaQuiet("placa_cartao", x, footY, CARD_W, CARD_H);
      ctx.fillStyle = SHOP_GROUPS[sp.group] || "#4a3a6e";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), Math.round(q.w), 3);
      ctx.globalAlpha = 1;
      const frame = rotFrame(UNITS[sp.type].sprite, Math.PI / 2);
      // Formiga GRANDE e legível: cabe numa caixa que respeita a largura do card.
      // Tira o teto de 10px que esmagava o desenho (a DINOPONERA virava um
      // pontinho de ~4px). drawIcon já suaviza a redução, então não borra.
      const boxW = q.w - 10, boxH = 36;
      let iw2 = frame.width, ih2 = frame.height;
      const is2 = Math.min(boxW / iw2, boxH / ih2);
      iw2 *= is2; ih2 *= is2;
      ctx.globalAlpha = canBuy ? 1 : 0.4;
      drawIcon(frame, q.x + q.w / 2 - iw2 / 2, q.y + 6, iw2, ih2);
      ctx.globalAlpha = 1;
      // Preço na faixa calma inferior (abaixo da formiga), maior e com contraste.
      drawText(ctx, infMoney ? "∞" : cost, q.x + q.w / 2, q.y + q.h - 14, { color: canBuy ? "#4a3116" : "#8d3b2c", align: "center", scale: .82 / fontScale(), maxWidth: q.w, paper: true });
      const hot = i < 9 ? String(i + 1) : i === 9 ? "0" : "";
      // tecla quente no canto superior direito (fora da área da formiga/preço)
      if (hot) drawText(ctx, hot, x + CARD_W - 3, footY + 2, { color: "#4a3116", align: "right", scale: 0.55, paper: true });
      if (r.hot) { shopTooltip = sp; hotCardX = x; hotCardW = CARD_W; }
      if (live && r.clicked) {
        const res = buyUnit(sp.type);
        if (!res.ok) {
          const wp = screenToWorld(x + CARD_W / 2, footY - 14);
          floatText(wp.x, wp.y, res.why, { color: "#ff4d5a", life: 1 });
        }
      }
      gx += CARD_PITCH;
    }
  }

  if (shopTooltip) {
    const uDef = UNITS[shopTooltip.type];
    // Tooltip SEGUE o card em hover (não fica preso no canto) e é maior/legível:
    // Camadas: 1º Fundo (tooltip_bg) -> 2º Texto (clipado) -> 3º Moldura (tooltip_frame)
    const TW = 264, TH = 134;
    const cx = (hotCardX || (SHOP_CARD.x0 + 10)) + hotCardW / 2;
    const tx = clamp(cx - TW / 2, 8, VIEW_W - TW - 8);
    const ty0 = footY - 8 - TH;
    layoutBox(ctx, "painel", tx, ty0, TW, TH);
    const tipClipped = beginPaperHud(ctx, "tooltip", tx, ty0, TW, TH);
    if (!tipClipped) panel(ctx, tx, ty0, TW, TH, { paperKind: "tooltip", deferFrame: false, border: bh.border, fill: "rgba(0,0,0,0)" });
    const qTip = paperQuiet("tooltip", tx, ty0, TW, TH);
    const tCx = qTip.x + qTip.w / 2;
    const FS = fontScale();
    const hScale = Math.min(0.72, 12 / (18 * FS));
    const nScale = Math.min(0.86, 14 / (16 * FS));
    let ty = Math.round(qTip.y) + 3;
    drawText(ctx, "▶ " + (uDef.fn || ""), tCx, ty,
      { font: "big", scale: hScale, color: SHOP_GROUPS[shopTooltip.group] || bh.accent, align: "center", maxWidth: qTip.w });
    ty += 14;
    drawText(ctx, uDef.name, tCx, ty, { color: bh.accent, scale: nScale, align: "center", maxWidth: qTip.w });
    ty += 15;
    const avail = Math.max(14, qTip.y + qTip.h - ty - 2);
    const tip = fitTextBlock(uDef.tip, qTip.w - 14, avail, { scale: 0.82, minScale: 0.55, lineStep: 13 });
    tip.lines.forEach((L, li) => drawText(ctx, L, tCx, ty + li * tip.step, { color: PAL.text, scale: tip.scale, align: "center", maxWidth: qTip.w }));
    if (tipClipped) endPaperHud(ctx);
  }

  // Uma única entrada do ninho no canvas, compartilhada por PC e toque.
  // A duplicata DOM foi removida da camada mobile.
  {
    // Formigueiro: placa NOVA 'pequena' (3,12:1) — antes era um quadrado
    // esmagado em 142x64 e o nome do bioma vazava para fora da placa.
    const nw = 190, nh = 60, nx2 = VIEW_W - 10 - nw;
    const ny2 = footY + Math.round((64 - nh) / 2);
    button(ctx, { x: nx2, y: ny2, w: nw, h: nh, plate: "pequena", compact: true, label: "", id: "nestBtn" });
    const rNest = lastButton();
    const qN = placaQuiet("placa_pequena", nx2, ny2, nw, nh);
    const nestImg = IMG.nest || IMG.i_essence;
    if (nestImg) drawIcon(nestImg, qN.x + 1, qN.y + (qN.h - 20) / 2, 20, 20);
    {
      const t = G.time * 2.2;
      for (let i = 0; i < 3; i++) {
        const tp = (t + i * 0.33) % 1;
        const ax = qN.x + 26 + tp * 46;
        const ay = qN.y + 3 - Math.sin(tp * Math.PI) * 4;
        ctx.fillStyle = bh.accent;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(Math.round(ax), Math.round(ay), 3, 2);
        ctx.globalAlpha = 1;
      }
    }
    // nomes lore formigueiro por bioma (o nome curto cabe na madeira calma;
    // o nome completo aparece no HUD do bioma e na tela do formigueiro)
    const nestNames = {
      planicie: ["VENTRE ÂMBAR", "VENTRE"],
      floresta: ["JARDIM ETERNO", "JARDIM"],
      pantano: ["CÂMARA SILENCIOSA", "CÂMARA"],
      deserto: ["FORNALHA REAL", "FORNALHA"],
      outono: ["BERÇO DOURADO", "BERÇO"],
      gelo: ["GASTER DE GELO", "GASTER"]
    };
    const ntx = qN.x + 24, ntw = Math.max(24, qN.x + qN.w - ntx);
    const pair = nestNames[biomeId] || ["FORMIGUEIRO", "FORMIGUEIRO"];
    const nestName = textWidth(pair[0], { scale: .8 }) <= ntw ? pair[0] : pair[1];
    const nFS = fontScale();
    drawText(ctx, nestName, ntx, qN.y + 1, { color: "#4a3116", scale: .85 / nFS, maxWidth: ntw, paper: true });
    drawText(ctx, isTouchUI() ? "ENTRAR" : "ENTRAR (B)", ntx, qN.y + qN.h - 13, { color: "#5a3d1c", scale: .6 / nFS, maxWidth: ntw, paper: true });
    if (live && rNest.clicked) {
      openNest(run);
      return;
    }
  }

  drawMinimap();

  // Painel de poderes e salto de mapa do MODO TESTE (auxiliar de desenvolvimento):
  // fica abaixo do minimapa compacto (x: 786..952, y: 134..320), fora de banners/chefes/rodapé.
  if (run.testMode && run.testPowers) {
    const tChrome = 1 / fontScale();
    const tx = 786, tw = 166;
    let ty = 134;
    if (button(ctx, {
      x: tx, y: ty, w: tw, h: 26, compact: true,
      label: isTouchUI() ? "PRÓXIMO MAPA ▶" : "PRÓXIMO MAPA (N)",
      id: "testNextMap", accent: "#ffd479", scale: 0.75 * tChrome,
    }) && live) {
      triggerMapChange((director.mapIdx + 1) % MAPS.length);
      return;
    }
    ty += 29;
    const mw2 = 52, mh2 = 22, mgap = 5;
    for (let mi = 0; mi < MAPS.length; mi++) {
      const col = mi % 3, row = (mi / 3) | 0;
      const mx2 = tx + col * (mw2 + mgap);
      const my2 = ty + row * (mh2 + 3);
      const cur = director.mapIdx === mi;
      if (button(ctx, {
        x: mx2, y: my2, w: mw2, h: mh2, compact: true,
        label: "M" + (mi + 1),
        id: "testMap" + (mi + 1),
        accent: cur ? "#37e6c8" : "#6b5a8a",
        color: cur ? "#37e6c8" : PAL.text,
        scale: 0.78 * tChrome,
      }) && live) {
        triggerMapChange(mi);
        return;
      }
    }
    ty += 2 * (mh2 + 3);
    if (button(ctx, {
      x: tx, y: ty, w: tw, h: 26, compact: true,
      label: isTouchUI() ? "PULAR ONDA ▶" : "PULAR ONDA (K)",
      id: "testSkipWave", accent: "#ffb347", scale: 0.75 * tChrome,
    }) && live) {
      skipWave();
      return;
    }
    ty += 29;
    if (button(ctx, {
      x: tx, y: ty, w: tw, h: 24, compact: true,
      label: "DINHEIRO ∞: " + (tp.infMoney ? "SIM" : "NÃO"),
      id: "testInfMoney",
      accent: tp.infMoney ? "#7fd6a0" : "#5a4f78",
      color: tp.infMoney ? "#7fd6a0" : PAL.textDim,
      scale: 0.72 * tChrome,
    }) && live) {
      tp.infMoney = !tp.infMoney;
      if (tp.infMoney) {
        run.food = Math.max(run.food, 9999);
        run.essencePool = Math.max(run.essencePool, 9999);
      }
    }
    ty += 27;
    if (button(ctx, {
      x: tx, y: ty, w: tw, h: 24, compact: true,
      label: "FORMIGAS ∞: " + (tp.infAnts ? "SIM" : "NÃO"),
      id: "testInfAnts",
      accent: tp.infAnts ? "#37e6c8" : "#5a4f78",
      color: tp.infAnts ? "#37e6c8" : PAL.textDim,
      scale: 0.72 * tChrome,
    }) && live) {
      tp.infAnts = !tp.infAnts;
    }
    ty += 27;
    if (button(ctx, {
      x: tx, y: ty, w: tw, h: 24, compact: true,
      label: "ONDAS ∞: " + (tp.infWaves ? "SIM" : "NÃO"),
      id: "testInfWaves",
      accent: tp.infWaves ? "#c77dff" : "#5a4f78",
      color: tp.infWaves ? "#c77dff" : PAL.textDim,
      scale: 0.72 * tChrome,
    }) && live) {
      tp.infWaves = !tp.infWaves;
      run.endless = tp.infWaves;
    }
  }

  let bossBottom = 0;
  if (bossUp) {
    // HUD exclusivo "boss" do chefe em 3 camadas (2026-10-16): 340×68 (5:1, -28% área),
    // 1º Fundo (boss_bg) -> 2º Nome + Barra (clipado) -> 3º Moldura (boss_frame) por cima.
    const bw = 340, bh2 = 68, bx0 = Math.round(VIEW_W / 2 - bw / 2);
    const by = Math.max(hudTopSlot(), 72);
    ctx.save();
    ctx.globalAlpha = hudContextAlpha(bx0, by, bw, bh2);
    const bossClipped = beginPaperHud(ctx, "boss", bx0, by, bw, bh2);
    if (!bossClipped) drawPaper(ctx, "boss", bx0, by, bw, bh2);
    const qBoss = paperQuiet("boss", bx0, by, bw, bh2);
    const bossCx = qBoss.x + qBoss.w / 2;
    const bossLine = boss.def.name + " • FILHO DA NÉVOA" + (boss.hp / boss.maxHp < 0.5 ? " • FASE 2" : "");
    const bScale = Math.min(0.64, 10.5 / (16 * fontScale()));
    drawText(ctx, bossLine, bossCx, qBoss.y, { font: "small", color: boss.hp / boss.maxHp < 0.5 ? "#ffd479" : "#b3392b", align: "center", scale: bScale, maxWidth: qBoss.w });
    drawGasterBar(ctx, bossCx - 66, qBoss.y + 13, 132, 14, boss.hp / boss.maxHp, biomeId, boss.hp / boss.maxHp < 0.5, G.time);
    if (bossClipped) endPaperHud(ctx);
    ctx.restore();
    bossBottom = by + bh2 + 4;
  }
  hudFloorY = Math.max(leftStackBottom, bossBottom);

  if (mutTip && !shopTooltip) {
    tooltip(ctx,12,mutY+24,[mutTip.desc],{title:mutTip.name,w:240});
  }

  const sc = selectedCount();
  if (sc > 0 && !run.draft) {
    const lbl = sc + " IRMÃS NA TRILHA";
    const tw = textWidth(lbl, {});
    drawText(ctx, lbl, clamp(mouse.x + 16, 6, VIEW_W - tw - 6), clamp(mouse.y + 10, 6, VIEW_H - 22), { color: bh.foodColor });
  }

  if (sel.active && sel.moved) {
    // PIXEL CELESTE: o retângulo de seleção é desenhado em resolução cheia, POR
    // CIMA do buffer — tem de acompanhar o deslocamento que a sangria devolveu
    // na composição, senão a caixa sai até 3 px fora das formigas que ela marca.
    const turnoSel = frameShift();
    const a = worldToScreen(sel.x0, sel.y0), b = worldToScreen(sel.x1, sel.y1);
    a.x += turnoSel.x; a.y += turnoSel.y; b.x += turnoSel.x; b.y += turnoSel.y;
    ctx.strokeStyle = bh.border;
    ctx.fillStyle = bh.foodColor;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    ctx.fillStyle = bh.border;
    ctx.globalAlpha = 0.9;
    const cs = 6;
    ctx.fillRect(a.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(a.x - cs/2, b.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, b.y - cs/2, cs, cs);
    ctx.globalAlpha = 1;
  }

  // Dicas de controle: no PC falam de teclado, no celular de gestos (Regra 9);
  // as duas ficam com largura limitada para não sair do canvas nos 960px.
  if (run.elapsed < 14 && run.status === "running" && !keys.KeyH) {
    const dicaTip = isTouchUI()
      ? "ARRASTE PARA MOVER • TOQUE NA FORMIGA PARA SELECIONAR • 2 DEDOS = CAIXA"
      : "ESQ: CÂMERA/ORDEM • DIR: SELECIONAR • Q: IRMÃS • B: " + ({"planicie":"VENTRE","floresta":"JARDIM","pantano":"CÂMARA","deserto":"FORNALHA","outono":"BERÇO","gelo":"GASTER"}[biomeId]||"NINHO") + " • H: FEROMÔNIO • ESC: PAUSA";
    ctx.fillStyle = "rgba(10,8,16,0.65)";
    ctx.fillRect(VIEW_W/2 - 320, VIEW_H - 124, 640, 18);
    drawText(ctx, dicaTip, VIEW_W / 2, VIEW_H - 120, { color: PAL.textDim, align: "center", alpha: clamp(14 - run.elapsed, 0, 4) / 4, scale: 0.85, maxWidth: 620 });
  }
  // Dica H no rodapé (só no PC: H é tecla) — sem encobrir os preços da fileira.
  if (!isTouchUI() && !keys.KeyH && live && !shopOpen) {
    drawText(ctx, "[H] VISÃO FEROMÔNIO • A COLÔNIA VÊ COM CHEIRO", VIEW_W/2, VIEW_H - 20, { color: PAL.text, align: "center", scale: 0.85, maxWidth: 600 });
  }
  if (keys.KeyH && live) drawPheromoneLegend(ctx, VIEW_W, VIEW_H - 122);
}


let hudExpanded = false;
let hudFloorY = 0;


function drawMinimap() {
  const run = G.run;
  const m = mapDef();
  const biomeId = m ? m.id : "planicie";
  const bh = BIOME_HUD[biomeId] || BIOME_HUD.planicie;
  // Minimapa compacto em 2 peças (2026-10-16): 168×125 (proporção 960:717, -35% de área)
  // 1) Fundo de papel (minimap_bg) -> 2) Mapa clipado na abertura interna (paperAperture)
  // -> 3) Moldura vazada de madeira e folhas (minimap_frame) POR CIMA -> 4) Rótulo em qMini.
  const fW = 168, fH = 125;
  const fX = VIEW_W - fW - 6, fY = 4;
  ctx.save();
  ctx.globalAlpha = hudContextAlpha(fX, fY, fW, fH);
  const ap = paperAperture("minimap", fX, fY, fW, fH);
  const qMini = paperQuiet("minimap", fX, fY, fW, fH);
  const mx = Math.round(ap.x), my = Math.round(ap.y);
  const mw = Math.round(ap.w), mh = Math.round(ap.h);
  uiButtons().push({ x: mx, y: my, w: mw, h: mh, id: "minimap" });

  // Camada 1: Fundo de papel recortado
  drawPaperBg(ctx, "minimap", fX, fY, fW, fH);

  // Camada 2: Conteúdo do minimapa estritamente clipado à janela interna da moldura
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  if (world.mini) {
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(world.mini, 0, 0, world.mini.width, world.mini.height, mx, my, mw, mh); ctx.restore();
  }
  drawScentMinimap(ctx, mx, my, mw, mh, world.mini, WORLD_W, WORLD_H, foodTrailAt, dangerAt, G.time);
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  for (const a of allies) {
    if (a.dead) continue;
    ctx.fillStyle = a.def.role === "worker" ? "#37e6c8" : "#8fd3ff";
    ctx.fillRect(mx + a.x * sx - 1, my + a.y * sy - 1, 2, 2);
  }
  for (const f of foes) {
    if (f.dead) continue;
    if (!f.revealT && !fogVisible(f.x, f.y) && !(f.isBoss && f.revealT > 0)) continue;
    ctx.fillStyle = f.isBoss ? "#ffd479" : "#ff4d5a";
    const s2 = f.isBoss ? 3 : 2;
    ctx.fillRect(mx + f.x * sx - s2 / 2, my + f.y * sy - s2 / 2, s2, s2);
  }
  const A = world.anthill;
  const pulse = 2 + Math.sin(G.time * 4) * 0.8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ffd479";
  ctx.globalAlpha = 0.6 + Math.sin(G.time*4)*0.2;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 1.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 3, 0, TAU); ctx.stroke();
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.65)";
  ctx.strokeRect(mx + (cam.x - vx / 2) * sx, my + (cam.y - vy / 2) * sy, vx * sx, vy * sy);
  fogDrawMini(ctx, mx, my, mw, mh);
  // Camada 2 (Texto): Nome do bioma dentro de qMini, ANTES da moldura (Fundo > Texto > Moldura)
  const mScale = Math.min(0.60, 11 / (16 * fontScale()));
  drawText(ctx, bh.loreName, qMini.x + qMini.w / 2, qMini.y, { color: "#fff3d6", shadow: "#1b120c", align: "center", scale: mScale, maxWidth: qMini.w });
  ctx.restore();

  // Camada 3: Moldura vazada de madeira e folhas POR CIMA de todo o conteúdo e texto
  drawPaperFrame(ctx, "minimap", fX, fY, fW, fH);
  ctx.restore();

  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;
  if (live && mouse.justDown && pointInRect(mouse.x, mouse.y, mx, my, mw, mh)) {
    cam.x = (mouse.x - mx) / sx;
    cam.y = (mouse.y - my) / sy;
    SFX.uiClick();
  }
}

// ----------------------------------------------------------------- banner ---
function drawBanner(b) {
  const a = clamp(b.t < 0.6 ? b.t / 0.6 : b.t > 3.2 - 0.5 ? (3.2 + 0.6 - b.t) / 0.5 + 0.2 : 1, 0, 1);
  ctx.globalAlpha = clamp(a, 0, 1);
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  let y = tut ? tut.y + tut.h + 12 : 98;
  y = Math.max(y, hudFloorY + 6);

  // Banner de evento exclusivo "event" (400×80 = 5:1, -49% de área) em 3 camadas:
  // 1º Fundo (event_bg) -> 2º Texto (clipado) -> 3º Moldura (event_frame)
  const bw = 400, bh = 80, bx = VIEW_W / 2 - bw / 2;
  const byy = Math.max(148, Math.min(Math.max(y, 148), VIEW_H - 132 - bh));
  layoutBox(ctx, "caixa", bx, byy, bw, bh, "banner");
  const evClipped = beginPaperHud(ctx, "event", bx, byy, bw, bh);
  if (!evClipped && !drawWoodBanner(ctx, bx, byy, bw, bh, hudBiome())) {
    dialogBox(ctx, bx, byy, bw, bh, { paperKind: "event", deferFrame: false, border: "#ffd479", accent: "#ffd479" });
  }
  // Texto 100% contido em qEv (mesmo com FONTE GRANDE).
  const qEv = paperQuiet("event", bx, byy, bw, bh);
  const evCx = qEv.x + qEv.w / 2;
  const titleH = b.sub ? Math.floor(qEv.h * 0.46) : qEv.h;
  const tBlock = fitTextBlock(b.title, qEv.w, titleH, { font: "small", scale: 0.72, minScale: 0.42, lineStep: 13 });
  tBlock.lines.forEach((L, li) => drawText(ctx, L, evCx, qEv.y + li * tBlock.step, { font: "small", scale: tBlock.scale, color: "#6b471e", align: "center", maxWidth: qEv.w }));
  if (b.sub) {
    const subY = qEv.y + tBlock.lines.length * tBlock.step + 2;
    const sub = fitTextBlock(b.sub, qEv.w, Math.max(12, qEv.y + qEv.h - subY), { scale: 0.60, minScale: 0.40, lineStep: 11 });
    sub.lines.forEach((L, li) => drawText(ctx, L, evCx, subY + li * sub.step, { color: PAL.text, align: "center", scale: sub.scale, maxWidth: qEv.w }));
  }
  if (evClipped) endPaperHud(ctx);
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ draft ---
function drawDraft(draft) {
  ctx.fillStyle = "rgba(10,8,16,0.84)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.15;
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 34, { font: "big", scale: 2.1, color: "#c77dff", align: "center" });
  ctx.restore();
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 34, { font: "big", scale: 2, color: "#c77dff", align: "center", maxWidth: 640 });
  drawKitIcon(ctx, 2, VIEW_W / 2 - 220, 30, 22); drawKitIcon(ctx, 2, VIEW_W / 2 + 198, 30, 22);
  // o subtítulo desce para fora da tinta do título (que com FONTE GRANDE chega
  // a 100px de altura) — antes as duas linhas ficavam na mesma faixa
  drawText(ctx, "A colônia evolui. Escolha 1 de 3 — vale só nesta expedição.", VIEW_W / 2, 104, { color: PAL.textDim, align: "center", maxWidth: 700 });

  // Cartões nas proporções ORIGINAIS do sprite card.png (848×1264 = 0,671):
  // 260×387 em escala uniforme; 1º Fundo -> 2º Texto (clipado) -> 3º Moldura.
  const cw = 260, ch = 387, gap = 24;
  const x0 = VIEW_W / 2 - (cw * 3 + gap * 2) / 2;
  const y = 136;
  for (let i = 0; i < draft.options.length; i++) {
    const mm = draft.options[i];
    const x = x0 + i * (cw + gap);
    const hot = pointInRect(mouse.x, mouse.y, x, y, cw, ch);
    const lift = hot ? 10 : 0;
    const rare = RARITY[mm.rar];

    layoutBox(ctx, "painel", x, y - lift, cw, ch);
    const cardClipped = beginPaperHud(ctx, "card", x, y - lift, cw, ch, { hot, pressed: hot && mouse.down });
    if (!cardClipped) panel(ctx, x, y - lift, cw, ch, { paperKind: "card", deferFrame: false, hot, pressed: hot && mouse.down });

    // área permitida da pintura: o texto se centraliza no papel liso (à
    // direita das vinhas) — nada é desenhado sobre os ornamentos.
    const qD = paperQuiet("card", x, y - lift, cw, ch);
    const dCx = qD.x + qD.w / 2;
    let dy = qD.y + 2;

    const icon = IMG["i_" + mm.icon];
    if (icon) {
      const isz = Math.min(52, qD.w * 0.56);
      drawPaper(ctx, "wood_icon", dCx - isz / 2, dy, isz, isz, { hot });
      ctx.drawImage(icon, dCx - isz / 2 + 6, dy + 6, isz - 12, isz - 12);
      dy += isz + 6;
    }
    drawText(ctx, rare.name, dCx, dy, { color: rare.color, align: "center", scale: 0.7, maxWidth: qD.w });
    dy += Math.ceil(15 * fontScale());
    // nome e descrição adaptados ao cartão: quebram/encolhem na área permitida
    const nm = fitTextBlock(mm.name, qD.w, Math.ceil(22 * fontScale()) * 2, { font: "big", scale: 0.62, minScale: 0.45, lineStep: 22 });
    nm.lines.forEach((L, li) => drawText(ctx, L, dCx, dy + li * nm.step, { font: "big", scale: nm.scale, color: "#493521", align: "center", maxWidth: qD.w }));
    dy += nm.lines.length * nm.step + 4;
    const desc = fitTextBlock(mm.desc, qD.w, qD.y + qD.h - 28 - dy, { scale: 0.6, minScale: 0.45, lineStep: 20 });
    desc.lines.forEach((L, li) => drawText(ctx, L, dCx, dy + li * desc.step, { color: PAL.text, align: "center", scale: desc.scale, maxWidth: qD.w }));
    // tecla quente em placa de madeira dentro da área permitida
    const kw = Math.min(44, Math.floor(qD.w * 0.46)), kh = 20;
    const kx = Math.round(dCx - kw / 2), ky = Math.round(qD.y + qD.h - kh - 2);
    drawPaper(ctx, "wood_icon", kx, ky, kw, kh, { hot });
    drawText(ctx, String(i + 1), dCx, ky + 3, { color: "#f6ecd4", align: "center", scale: 0.75, maxWidth: kw - 6 });
    if (cardClipped) endPaperHud(ctx);

    if (hot && mouse.justDown && !paused) { pickDraft(i); return; }
  }
}

// -------------------------------------------------------------- transição mapa --
function drawMapTransition(run) {
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const nextIdx = director.mapIdx + 1;
  const next = nextIdx < MAPS.length ? MAPS[nextIdx] : null;

  if (Math.random() < 0.3) {
    spawnPart({ x: rand(0,VIEW_W), y: VIEW_H + 10, vx: rand(-10,10), vy: rand(-60,-20), life: rand(1,2), size: rand(1,3), color: "#ffd479", glow: true, drag: 1 });
  }

  // HUD exclusivo "transition" (560×386) em 3 camadas: 1º Fundo -> 2º Texto -> 3º Moldura
  const txBox = VIEW_W / 2 - 280, tyBox = 84, twBox = 560, thBox = 386;
  layoutBox(ctx, "caixa", txBox, tyBox, twBox, thBox);
  const trClipped = beginPaperHud(ctx, "transition", txBox, tyBox, twBox, thBox);
  if (!trClipped) dialogBox(ctx, txBox, tyBox, twBox, thBox, { paperKind: "transition", deferFrame: false, border: "#ffd479", accent: "#37e6c8" });
  const qTr = paperQuiet("transition", txBox, tyBox, twBox, thBox);
  const innerW = Math.round(qTr.w);
  const trCx = qTr.x + qTr.w / 2;
  const FS = fontScale();
  const transitionTitle = "MAPA LIMPO!";
  const tScale = Math.min(1.5, 28 / (18 * FS));
  const transitionTitleH = textHeight(transitionTitle, { font: "big", scale: tScale });
  let ty = Math.round(qTr.y + 4);
  drawText(ctx, transitionTitle, trCx, ty, { font: "big", scale: tScale, color: "#ffd479", align: "center", maxWidth: innerW });
  ty += transitionTitleH + 8;
  const intro = fitTextBlock("O chefão caiu. A colônia respira — e a Rainha se recupera.", innerW, 44, { scale: 0.85, minScale: 0.55, lineStep: 18 });
  intro.lines.forEach((L, li) => drawText(ctx, L, trCx, ty + li * intro.step, { color: PAL.text, scale: intro.scale, align: "center", maxWidth: innerW }));
  ty += intro.lines.length * intro.step + 10;
  if (next) {
    drawText(ctx, "PRÓXIMO DESTINO:", trCx, ty, { color: PAL.textDim, scale: Math.min(0.82, 13 / (16 * FS)), align: "center", maxWidth: innerW });
    ty += Math.round(18 * Math.min(1, FS));
    const mapTitle = fitTextBlock("MAPA " + (nextIdx + 1) + "/" + MAPS.length + " — " + next.name, innerW, 32, { font: "big", scale: 0.88, minScale: 0.55, lineStep: 22, maxLines: 1 });
    drawText(ctx, mapTitle.lines[0] || "", trCx, ty, { font: "big", scale: mapTitle.scale, color: "#37e6c8", align: "center", maxWidth: innerW });
    ty += mapTitle.step + 4;
    const subBudget = Math.max(24, qTr.y + qTr.h - 52 - ty);
    const subB = fitTextBlock(next.sub, innerW, subBudget, { scale: 0.80, minScale: 0.52, lineStep: 16 });
    subB.lines.forEach((L, li) => drawText(ctx, L, trCx, ty + li * subB.step, { color: PAL.textDim, scale: subB.scale, align: "center", maxWidth: innerW }));
    ty += subB.lines.length * subB.step;
  }
  // botão sempre DENTRO de qTr (Camada 2, antes da Moldura)
  const advH = 42;
  const advW = Math.min(280, innerW - 8);
  const advY = Math.round(Math.min(qTr.y + qTr.h - advH - 2, Math.max(ty + 8, qTr.y + qTr.h - advH - 6)));

  const triggerAdvance = () => {
    triggerMapChange(nextIdx);
  };

  const clickedAdv = button(ctx, { x: Math.round(trCx - advW / 2), y: advY, w: advW, h: advH, label: "AVANÇAR A EXPEDIÇÃO", id: "goNext", accent: "#37e6c8" });
  if (trClipped) endPaperHud(ctx);
  if (clickedAdv) {
    triggerAdvance();
    return;
  }
  if (pressed.Enter || pressed.Space) {
    triggerAdvance();
    return;
  }
}

// ------------------------------------------------------------------ pausa ---
// FASE 5: Pausa com Mapa - 2 colunas esquerda 6 botões + direita mini-mapa + stats + btnH 104px mobile
function drawPause() {
  const mobile = isMobileLayout();
  ctx.fillStyle = "rgba(10,8,16,0.86)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // layout 2 colunas: esquerda botões, direita mapa+stats. No mobile as mesmas
  // larguras do PC deixam ~118px livres à direita — é ali que vive o HUD de
  // toque (botão ⏸/▶), sem cobrir texto nenhum.
  const leftW = mobile ? 355 : 355, rightW = mobile ? 355 : 355;
  const totalW = leftW + rightW + 24;
  const startX = VIEW_W/2 - totalW/2;
  const py = mobile ? 20 : 48;
  // o painel cabendo no canvas é o que impede "REINICIAR/SAIR" de sumir no celular
  const panelH = Math.min(mobile ? 500 : 440, VIEW_H - py - 16);

  // painel esquerda - botões (dentro de paperQuiet da moldura pause)
  dialogBox(ctx, startX, py, leftW, panelH, { paperKind:"pause", border: "#8f6fd6", accent: "#37e6c8" });
  const qPL = paperQuiet("pause", startX, py, leftW, panelH);
  const plCx = qPL.x + qPL.w / 2;
  drawText(ctx, "PAUSA", plCx, qPL.y, { font: "big", scale: 1.05 / fontScale(), color: "#ffd479", align: "center", maxWidth: qPL.w });

  const run = G.run;
  const pauseBtns = [
    { label: "CONTINUAR", id: "resume", accent: "#37e6c8" },
    { label: "OPÇÕES", id: "pauseOptions", accent: "#ffb347" },
    { label: "ÁRVORE DA EVOLUÇÃO", id: "pauseTree", accent: "#c77dff" },
    { label: "COMO JOGAR", id: "pauseHelp", accent: "#6db7ff" },
    { label: "REINICIAR EXPEDIÇÃO", id: "restart", accent: "#ffb347" },
    { label: "SAIR PARA O MENU", id: "quit", accent: "#ff4d5a" },
  ];
  let by = Math.round(qPL.y + 30);
  const availBtnsH = Math.max(180, qPL.y + qPL.h - by);
  const gap = 6;
  const btnH = Math.max(28, Math.floor((availBtnsH - gap * (pauseBtns.length - 1)) / pauseBtns.length));
  const btnW = Math.round(qPL.w);
  const btnX = Math.round(qPL.x);

  for (const b of pauseBtns) {
    if (button(ctx, { x: btnX, y: by, w: btnW, h: btnH, compact: true, label: b.label, id: b.id, accent: b.accent, scale: 0.78 / fontScale() })) {
      if (b.id === "resume") { paused = false; return; }
      if (b.id === "pauseOptions") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        optionsReturn = "RUN";
        optionsTab = 0; optionsScroll = 0; optGrab = null;
        startTransition("auto", "RUN", "OPTIONS", 0, () => { G.screen = "OPTIONS"; });
        return;
      }
      if (b.id === "pauseTree") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        openTreeScreen("RUN");
        return;
      }
      if (b.id === "pauseHelp") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        helpReturn = "RUN";
        startTransition("auto", "RUN", "HELP", 0, () => { G.screen = "HELP"; });
        return;
      }
      if (b.id === "restart") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        settleAbandon();
        startRunWithLoading(G.run.modeDef);
        return;
      }
      if (b.id === "quit") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        settleAbandon();
        startTransition("auto", "RUN", "TITLE", 0, () => { G.screen = "TITLE"; });
        return;
      }
    }
    by += btnH + gap;
  }

  // painel direita - mapa + stats (dentro de paperQuiet da moldura pause)
  const rx = startX + leftW + 24;
  dialogBox(ctx, rx, py, rightW, panelH, { paperKind:"pause", border: "#4a3a6e", accent: "#ffd479" });
  const qPR = paperQuiet("pause", rx, py, rightW, panelH);
  const prCx = qPR.x + qPR.w / 2;
  drawText(ctx, "MAPA E STATUS", prCx, qPR.y, { font: "big", scale: 0.78 / fontScale(), color: "#ffd479", align: "center", maxWidth: qPR.w });

  // mini-mapa maior na pausa - interativo clique move câmera + hover + stats expandidos
  const miniX = Math.round(qPR.x + 2), miniY = Math.round(qPR.y + 24), miniW = Math.round(qPR.w - 4), miniH = 104;
  panel(ctx, miniX - 2, miniY - 2, miniW + 4, miniH + 4, { paper: false, fill: "rgba(10,8,16,0.9)", border: "#4a3a6e", r: 3 });
  if (world.mini) {
    ctx.drawImage(world.mini, miniX, miniY, miniW, miniH);
  }
  // desenha posição câmera e formigas no mini-mapa da pausa
  const sx = miniW / WORLD_W, sy = miniH / WORLD_H;
  for (const a of allies) {
    if (a.dead) continue;
    ctx.fillStyle = a.def.role === "worker" ? "#37e6c8" : a.type === "healer" ? "#7fd6a0" : "#8fd3ff";
    ctx.fillRect(miniX + a.x * sx - 1, miniY + a.y * sy - 1, 2, 2);
  }
  for (const f of foes) {
    if (f.dead) continue;
    if (!f.revealT && !fogVisible(f.x, f.y) && !(f.isBoss && f.revealT > 0)) continue;
    ctx.fillStyle = f.isBoss ? "#ffd479" : "#ff4d5a";
    const s2 = f.isBoss ? 3 : 2;
    ctx.fillRect(miniX + f.x * sx - s2/2, miniY + f.y * sy - s2/2, s2, s2);
  }
  const A = world.anthill;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath(); ctx.arc(miniX + A.x * sx, miniY + A.y * sy, 4, 0, TAU); ctx.fill();
  // viewport da câmera
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(miniX + (cam.x - vx/2)*sx, miniY + (cam.y - vy/2)*sy, vx*sx, vy*sy);
  // interatividade: clique no mini-mapa move câmera
  if (pointInRect(mouse.x, mouse.y, miniX, miniY, miniW, miniH)) {
    ctx.strokeStyle = "#37e6c8"; ctx.lineWidth = 2;
    ctx.strokeRect(miniX-1, miniY-1, miniW+2, miniH+2);
    if (mouse.justDown) {
      cam.x = (mouse.x - miniX) / sx;
      cam.y = (mouse.y - miniY) / sy;
      SFX.uiClick();
    }
  }
  // fog no mini pausa
  fogDrawMini(ctx, miniX, miniY, miniW, miniH);

  // Estatísticas dentro de qPR
  let sy2 = miniY + miniH + 8;
  if (run) {
    const statW = Math.round(qPR.w - 4);
    const pFS = fontScale();
    const lines = [];
    lines.push(["MODO: " + (run.modeDef ? run.modeDef.name : "CAMPANHA"), run.modeDef ? run.modeDef.color : "#37e6c8", 0.72]);
    if (run.ascension) lines.push(["ASCENSÃO DA NÉVOA: " + run.ascension, "#ff8a96", 0.68]);
    lines.push(["MAPA: " + (run.mapIdx + 1) + "/" + MAPS.length + " - " + MAPS[run.mapIdx].name, PAL.text, 0.68]);
    lines.push(["ONDA: " + run.wave + " • ABATES: " + run.kills, PAL.textDim, 0.68]);
    lines.push(["NÍVEL: " + run.level + " • COMIDA: " + fmt(run.food), PAL.textDim, 0.68]);
    lines.push(["ESSÊNCIA: " + fmt(run.essencePool) + " • MUTAÇÕES: " + run.mutationLog.length, "#c77dff", 0.65]);
    lines.push(["POP: " + popUsed() + "/" + popCapTotal() + " • TEMPO: " + Math.floor(run.elapsed) + "s", PAL.textDim, 0.65]);
    const n = colony.needs, hc = colony.headcount;
    lines.push(["COLÔNIA: FOME " + Math.round(n.food*100) + "% • GUERRA " + Math.round(n.defense*100) + "% • CURA " + Math.round(n.medical*100) + "%", "#8f7bb5", 0.58]);
    lines.push(["COLETANDO " + hc.gather + " • EXPLORANDO " + hc.explore + " • DEFENDENDO " + (hc.defend||0), "#9a8fc0", 0.58]);
    if (G.save.accessibility.invincible) lines.push(["INVENCÍVEL ATIVO", "#7fd6a0", 0.68]);
    if (G.save.accessibility.infiniteDash) lines.push(["∞ DASHES INFINITOS ATIVO", "#37e6c8", 0.65]);
    if (rallyCooldown > 0) lines.push(["RALI RECARGA: " + rallyCooldown.toFixed(1) + "s", "#ff4d5a", 0.62]);

    const footTop = qPR.y + qPR.h - 14;
    const pitch = Math.max(9, Math.min(13.5, (footTop - sy2) / Math.max(1, lines.length)));
    lines.forEach(([txt, col, sc], i) => {
      const effSc = Math.min(sc / pFS, (pitch - 1) / (18 * pFS));
      drawText(ctx, txt, qPR.x + 2, sy2 + i * pitch, { color: col, scale: effSc, maxWidth: statW });
    });
  }

  // rodapé dentro de qPR
  drawText(ctx, isTouchUI() ? "TOQUE NO MAPA • ▶ VOLTAR RETOMA" : "ESC: VOLTAR • M: SOM • CLIQUE NO MAPA",
    prCx, qPR.y + qPR.h - 11, { color: PAL.textDim, align: "center", scale: 0.56 / fontScale(), maxWidth: qPR.w });
  flushPaperFrames(ctx);
}

function settleAbandon() {
  const run = G.run;
  run.status = "lost";
  settleRun();
  run.status = "ended";
}

let helpReturn = "TITLE";
let treeReturn = "TITLE";
// Seleção de menu do TITLE por teclado (↑↓/Enter, estilo Dead Cells). O hover
// do ponteiro sincroniza; no toque a seleção não é usada.
let titleSel = 0;

// Regra 14: árvore, santuários, profecias e memórias foram preparados no TITLE
// (preload.js). Entrar e voltar dessas telas é só a transição rápida.
function openTreeScreen(fromScreen = "TITLE") {
  treeReturn = fromScreen;
  enterTree();
  startTransition("auto", fromScreen, "TREE", 0, () => { G.screen = "TREE"; });
}

function backFromTree() {
  notePointer(mouse.x, mouse.y);
  const to = treeReturn;
  startTransition("auto", "TREE", to, 0, () => { G.screen = to; });
}

// ------------------------------------------- PÓS-FINAL: tela de PROFECIAS ----
let prophecyPage = 0;
function openProphecies() {
  prophecyPage = 0;
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  checkProphecies(null, false, null);   // concede as de estado acumulado
  persistSave();
  startTransition("auto", "TREE", "PROPHECY", 0, () => { G.screen = "PROPHECY"; });
}

function backFromProphecies() {
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  startTransition("auto", "PROPHECY", "TREE", 0, () => { G.screen = "TREE"; });
}

function updateProphecyScreen(dt) {
  if (pressed.Escape) backFromProphecies();
}

function renderProphecyScreen() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "#0e0a18");
  g.addColorStop(1, "#1a1430");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const FS = fontScale();
  const chrome = 1 / FS;
  // Cabeçalho na proporção original de banner (425×85 = 5:1) e texto dentro de paperQuiet
  const hBox = { x: 12, y: 6, w: 425, h: 85 };
  panel(ctx, hBox.x, hBox.y, hBox.w, hBox.h, { paperKind: "banner", border: "#6ee7ff", accentLine: "#6ee7ff" });
  const qH = paperQuiet("banner", hBox.x, hBox.y, hBox.w, hBox.h);
  const hX = qH.x + 12, hW = Math.max(40, qH.w - 24), hCx = hX + hW / 2;
  drawText(ctx, "PROFECIAS DA COLÔNIA", hCx, qH.y + 1, { font: "big", scale: 0.56 * chrome, color: "#6ee7ff", align: "center", maxWidth: hW });
  const subB = fitTextBlock("Vaticínios da Matriarca — cumpra-os pela essência", hW, Math.max(14, qH.h - 18), { scale: 0.52, minScale: 0.38, lineStep: 11 });
  subB.lines.forEach((L, li) => drawText(ctx, L, hCx, qH.y + 17 + li * subB.step,
    { color: PAL.textDim, scale: subB.scale, align: "center", maxWidth: hW }));
  const done = Object.keys(G.save.prophecies || {}).length;

  // Painel de essência na proporção original de panel (160×85)
  const eBox = { x: 452, y: 6, w: 160, h: 85 };
  panel(ctx, eBox.x, eBox.y, eBox.w, eBox.h, { border: "#c77dff" });
  const qE = paperQuiet("panel", eBox.x, eBox.y, eBox.w, eBox.h);
  const ic = IMG.i_essence;
  if (ic) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, qE.x + 2, qE.y + (qE.h - 24) / 2, 24, 24); }
  drawText(ctx, G.save.essence, qE.x + 30 + (qE.w - 30) / 2, qE.y + (qE.h - 24) / 2, { font: "big", scale: 0.78 * chrome, color: "#c77dff", align: "center", maxWidth: qE.w - 32 });
  flushPaperFrames(ctx);

  if (button(ctx, { x: VIEW_W - 180, y: 18, w: 156, h: 44, label: "VOLTAR", id: "prophecyBack", font: "small", accent: "#ff4d5a" })) {
    backFromProphecies();
  }

  // Quatro cartões por página (345×184 = proporção original de panel, centrados na tela)
  const pages = Math.ceil(PROPHECIES.length / 4);
  prophecyPage = clamp(prophecyPage, 0, pages - 1);
  PROPHECIES.slice(prophecyPage * 4, prophecyPage * 4 + 4).forEach((p, i) => {
    const x = 110 + (i % 2) * 395, y = 94 + Math.floor(i / 2) * 186;
    const w = 345, h = 184, ok = !!(G.save.prophecies || {})[p.id];
    panel(ctx, x, y, w, h, { border: ok ? "#7fd6a0" : "#3a3054" });
    const qP = paperQuiet("panel", x, y, w, h);
    const pCx = qP.x + qP.w / 2;
    drawKitIcon(ctx, ok ? 0 : 1, pCx - 6, qP.y, 13);
    const nm = fitTextBlock(p.name, qP.w, 34, { scale: 0.68, minScale: 0.44, lineStep: 14 });
    let py2 = qP.y + 15;
    nm.lines.forEach((line, j) => drawText(ctx, line, pCx, py2 + j * nm.step, { scale: nm.scale, color: ok ? "#7fd6a0" : "#6ee7ff", align: "center", maxWidth: qP.w }));
    py2 += nm.lines.length * nm.step + 3;
    const ds = fitTextBlock(p.desc, qP.w, Math.max(18, qP.y + qP.h - 15 - py2), { scale: 0.60, minScale: 0.42, lineStep: 13 });
    ds.lines.forEach((line, j) => drawText(ctx, line, pCx, py2 + j * ds.step, { scale: ds.scale, color: PAL.text, align: "center", maxWidth: qP.w }));
    drawText(ctx, "+" + p.reward + " ESSÊNCIA", pCx, qP.y + qP.h - 13, { color: "#c77dff", scale: 0.56 * chrome, align: "center", maxWidth: qP.w });
  });
  flushPaperFrames(ctx);
  prophecyPage = drawPageControls("prophecy", prophecyPage, pages, 470);

  const foot = (isTouchUI() ? "TOQUE EM VOLTAR" : "ESC: VOLTAR") + " • " + done + "/" + PROPHECIES.length + " CUMPRIDAS • A ESSÊNCIA LEMBRA";
  drawText(ctx, foot, VIEW_W / 2, VIEW_H - 22, { color: PAL.textDim, align: "center", scale: 0.78 * chrome, maxWidth: VIEW_W - 60 });
}

// ------------------------------------------------------------------- fim ----
function drawEnd(run) {
  ctx.fillStyle = "rgba(10,8,16,0.88)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const p = run.payout;
  if (!p) return;
  const won = p.winBonus > 0;
  const FS = fontScale();
  const chrome = 1 / FS;
  const mobile = isMobileLayout();

  // Título na faixa superior (acima da moldura, nunca cortado pela madeira)
  drawText(ctx, won ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU", VIEW_W / 2, 4,
    { font: "big", scale: 1.45 * chrome, color: won ? "#ffd479" : "#ff4d5a", align: "center", maxWidth: VIEW_W - 60 });

  // Painel central na proporção de panel (780×416) com todo conteúdo dentro de qEnd
  const PX = 90, PY = 42, PW = 780, PH = 416;
  dialogBox(ctx, PX, PY, PW, PH, { border: won ? "#ffd479" : "#ff4d5a", accent: won ? "#ffd479" : "#ff4d5a" });
  const qEnd = paperQuiet("panel", PX, PY, PW, PH);
  const eCx = qEnd.x + qEnd.w / 2;

  const subLock = won ? "O arauto do inverno caiu. A colônia atravessou os seis degraus — e no alto do mundo a Névoa ainda espera." : "A rainha tombou. Mas a essência alimenta a próxima geração.";
  const subB = fitTextBlock(subLock, qEnd.w, 34, { scale: 0.72, minScale: 0.48, lineStep: 14 });
  let ty = Math.round(qEnd.y);
  subB.lines.forEach((L) => { drawText(ctx, L, eCx, ty, { color: PAL.text, scale: subB.scale, align: "center", maxWidth: qEnd.w }); ty += subB.step; });
  // PÓS-FINAL: a Era do Formigueiro Eterno avança a cada vitória de campanha
  if (won && run.mode === "campanha") {
    const e = Math.max(1, G.save.era || 1);
    const eraLine = "ERA " + e + " — " + ERA_LINES[(e - 1) % ERA_LINES.length];
    drawText(ctx, eraLine, eCx, ty + 2, { color: "#ffd479", scale: 0.65 * chrome, align: "center", maxWidth: qEnd.w });
    ty += 16;
  }

  const rows = [
    ["MODO", run.modeDef ? run.modeDef.name : "CAMPANHA", run.modeDef ? run.modeDef.color : PAL.text],
    ["ONDAS REPELIDAS", String(run.wave), PAL.text],
    ["MAPAS LIMPOS", run.mapsCleared + "/" + MAPS.length, PAL.text],
    ["INIMIGOS ABATIDOS", String(run.kills), PAL.text],
    ["NÍVEL DA COLÔNIA", String(run.level), PAL.text],
    ["MUTAÇÕES", String(run.mutationLog.length), PAL.text],
    ["RELÍQUIA (10%)", String(p.relic), "#c77dff"],
    ["BÔNUS DE ONDAS", "+" + p.waveBonus, "#c77dff"],
    ["BÔNUS DE MAPAS", "+" + p.mapBonus, "#c77dff"],
    ["BÔNUS DE ABATES", "+" + p.killBonus, "#c77dff"],
  ];
  if (p.winBonus) rows.push(["VITÓRIA ÉPICA", "+" + p.winBonus, "#c77dff"]);
  if (p.ascension) rows.push(["ASCENSÃO DA NÉVOA", "NV " + p.ascension + " (x" + p.ascMult.toFixed(2) + ")", "#ff8a96"]);
  if (p.prophecies) for (const pr of p.prophecies) rows.push(["PROFECIA: " + pr.name, "+" + pr.reward, "#6ee7ff"]);
  if (p.mult > 1) rows.push(["MULTIPLICADOR", "x" + p.mult.toFixed(2), "#ffd479"]);

  // dentro de qEnd: linhas -> ícones -> separador + total
  const sepY = Math.round(qEnd.y + qEnd.h - 46);
  const iconsH = run.mutationLog.length ? 24 : 0;
  const rowsBottom = sepY - 8 - iconsH;

  const maxRows = Math.ceil(rows.length / 3);
  const rowsTop = ty + 6;
  const step = Math.max(12, Math.min(18, (rowsBottom - rowsTop) / Math.max(1, maxRows)));
  const colGap = 14;
  const colW = Math.floor((qEnd.w - colGap * 2) / 3);
  rows.forEach(([label, val, col], i) => {
    const ci = Math.floor(i / maxRows), ri = i % maxRows;
    const cx = Math.round(qEnd.x + ci * (colW + colGap));
    const ry = Math.round(rowsTop + ri * step);
    const fit = Math.min(0.76 * chrome, (colW - 6) / Math.max(1, textWidth(label, {}) + 8 + textWidth(val, {})));
    drawText(ctx, label, cx, ry, { color: PAL.textDim, scale: fit, maxWidth: colW - 4 });
    drawText(ctx, val, cx + colW, ry, { color: col, align: "right", scale: fit, maxWidth: colW - 4 });
  });

  if (run.mutationLog.length) {
    const maxIcons = 14;
    const iy = rowsBottom + 2;
    let ix = Math.round(qEnd.x);
    for (const mm of run.mutationLog.slice(0, maxIcons)) {
      const icon = IMG["i_" + mm.icon];
      if (icon) ctx.drawImage(icon, ix, iy, 18, 18);
      ix += 22;
    }
    if (run.mutationLog.length > maxIcons) {
      drawText(ctx, "+" + (run.mutationLog.length - maxIcons), ix, iy + 2, { color: PAL.textDim, scale: 0.7 * chrome, maxWidth: 60 });
    }
  }

  ctx.fillStyle = "#bea779";
  ctx.fillRect(qEnd.x, sepY, qEnd.w, 1.5);
  drawText(ctx, "TOTAL DE GELÉIA REAL", qEnd.x, sepY + 12, { font: "big", scale: 0.85 * chrome, color: "#c77dff", maxWidth: qEnd.w * 0.62 });
  drawText(ctx, "+" + p.total, qEnd.x + qEnd.w, sepY + 6, { font: "big", scale: 1.45 * chrome, color: "#ffd479", align: "right", maxWidth: qEnd.w * 0.36 });
  flushPaperFrames(ctx);

  // Rodapé de 3 botões lado a lado (abaixo do painel, nunca sobrepostos à moldura)
  const btnY = VIEW_H - (mobile ? 46 : 42), btnH = mobile ? 40 : 36;
  const bW = 216, bGap = 14;
  const bx0 = Math.round(VIEW_W / 2 - (bW * 3 + bGap * 2) / 2);
  if (button(ctx, { x: bx0, y: btnY, w: bW, h: btnH, compact: true, label: "NOVA EXPEDIÇÃO", id: "again", accent: "#37e6c8", scale: 0.82 * chrome })) {
    notePointer(mouse.x, mouse.y);
    paused = false;
    startRunWithLoading(run.modeDef);
    return;
  }
  if (button(ctx, { x: bx0 + bW + bGap, y: btnY, w: bW, h: btnH, compact: true, label: "ÁRVORE DA EVOLUÇÃO", id: "goTree", accent: "#c77dff", scale: 0.78 * chrome })) {
    notePointer(mouse.x, mouse.y);
    openTreeScreen("TITLE");
    return;
  }
  if (button(ctx, { x: bx0 + (bW + bGap) * 2, y: btnY, w: bW, h: btnH, compact: true, label: "MENU PRINCIPAL", id: "menu", scale: 0.82 * chrome })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "RUN", "TITLE", 0, () => { G.screen = "TITLE"; });
    return;
  }
}


// ------------------------------------------- MEGA LORE: Biblioteca Memórias da Colônia ----
let memoryPage = 0;
let memoryHover = -1;
let memoryRects = [];

function openMemories() {
  memoryPage = 0;
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  memoryHover = -1;
  startTransition("auto", "TREE", "MEMORY", 0, () => { G.screen = "MEMORY"; });
}

function backFromMemories() {
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  startTransition("auto", "MEMORY", "TREE", 0, () => { G.screen = "TREE"; });
}

function updateMemoryScreen(dt) {
  // A memória toca DENTRO da biblioteca: sem expedição por trás (antes ia para
  // RUN e, sem G.run, voltava ao TITLE com a cutscene invisível) e, ao fim, o
  // jogador continua em MEMÓRIAS. Camadas pré-carregadas no TITLE (Regra 14).
  if (isCutsceneActive()) {
    updateCutscene(dt);
    handleCutsceneInput(pressed, mouse);
    return;
  }
  memoryHover = -1;
  for (let i=0;i<memoryRects.length;i++) {
    const r = memoryRects[i];
    if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) { memoryHover = i; break; }
  }
  if (mouse.justDown && memoryHover >= 0 && !hasTransition()) {
    const id = memoryRects[memoryHover].id;
    SFX.uiClick();
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "MEMORY", "MEMORY", 0, () => startCutscene(id, { fromLibrary: true, force: true }));
    return;
  }
  if (pressed.Escape) {
    backFromMemories();
  }
}

function drawPageControls(id, page, pages, y) {
  if (page > 0 && button(ctx, { x: 40, y, w: 164, h: 38, compact: true, label: "ANTERIOR", id: id + "Prev", scale: 0.8 })) page--;
  if (page < pages - 1 && button(ctx, { x: 756, y, w: 164, h: 38, compact: true, label: "PRÓXIMA", id: id + "Next", scale: 0.8 })) page++;
  drawText(ctx, (page + 1) + "/" + pages, 224, y + 10, { color: PAL.textDim, scale: 0.8 });
  return page;
}

function renderMemoryScreen() {
  if (isCutsceneActive()) { drawCutscene(ctx, G.time); return; }
  drawSolidMenuBg(ctx, "#0a0812");
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const FS = fontScale();
  const chrome = 1 / FS;
  drawText(ctx, "MEMÓRIAS DA COLÔNIA", VIEW_W/2, 8, { font:"big", scale:1.5 * chrome, color:"#ffd479", align:"center", maxWidth: VIEW_W-60 });
  drawText(ctx, "REVEJA AS MEMÓRIAS DESCOBERTAS PELA COLÔNIA", VIEW_W/2, 54,
    { color: PAL.textDim, align: "center", scale: 0.78 * chrome });
  const defs = getCutsceneDefs();
  const ids = Object.keys(defs).filter((id) => !id.startsWith("loading_"));
  const pages = Math.ceil(ids.length / 4);
  memoryPage = clamp(memoryPage, 0, pages - 1);
  memoryRects = [];
  ids.slice(memoryPage * 4, memoryPage * 4 + 4).forEach((id, i) => {
    const def = defs[id], seen = G.save.cutscenes && G.save.cutscenes[id];
    // Cartões nas proporções ORIGINAIS do sprite panel (345×184 = 960×512 uniformes);
    // título e subtítulo centralizados na área permitida (2026-10-16).
    const x = 110 + (i % 2) * 395, y = 80 + Math.floor(i / 2) * 188;
    const w = 345, h = 184;
    const hot = memoryHover === i;
    panel(ctx, x, y, w, h, { border: hot ? "#ffd479" : "#4a3a6e" });
    const qM = paperQuiet("panel", x, y, w, h);
    const mCx = qM.x + qM.w / 2;
    drawKitIcon(ctx, seen ? 0 : 1, mCx - 6, qM.y, 13);
    const tl = fitTextBlock(def.title, qM.w, 34, { scale: 0.68, minScale: 0.44, lineStep: 14 });
    let my2 = qM.y + 15;
    tl.lines.forEach((line, j) => drawText(ctx, line, mCx, my2 + j * tl.step, { scale: tl.scale, color: seen ? "#ffd479" : PAL.textDim, align: "center", maxWidth: qM.w }));
    my2 += tl.lines.length * tl.step + 3;
    const ds = fitTextBlock(def.subtitle, qM.w, Math.max(18, qM.y + qM.h - 15 - my2), { scale: 0.60, minScale: 0.42, lineStep: 13 });
    ds.lines.forEach((line, j) => drawText(ctx, line, mCx, my2 + j * ds.step, { scale: ds.scale, color: PAL.textDim, align: "center", maxWidth: qM.w }));
    drawText(ctx, def.panels.length + " PAINÉIS • " + (seen ? "REVER" : "NÃO DESCOBERTA"), mCx, qM.y + qM.h - 13,
      { scale: 0.56 / FS, color: seen ? "#ffd479" : PAL.textDim, align: "center", maxWidth: qM.w });
    memoryRects.push({ x, y, w, h, id });
  });
  flushPaperFrames(ctx);
  memoryPage = drawPageControls("memory", memoryPage, pages, 464);

  if (button(ctx, { x: VIEW_W/2-110, y: 464, w: 220, h: 38, compact: true, label:"VOLTAR ÁRVORE", id:"memBack", accent:"#8f6fd6", scale: 0.85 * chrome })) {
    backFromMemories();
  }
  drawText(ctx, (isTouchUI() ? "TOQUE NO CARTÃO PARA REVER • " : "ESC: VOLTAR • CLIQUE PARA REVER CUTSCENE • ") + "320x180 8 LAYERS",
    VIEW_W/2, VIEW_H-24, { color:"#9a8fc0", align:"center", scale:0.74 * chrome, maxWidth: VIEW_W-60 });
}

// ---------------------------------------------------------------- exports ---
export function gameHelpReturn() { return helpReturn; }
export function setPaused(v) { paused = v; }
// MOBILE: a camada de toque usa para rotular o botão de pausa (⏸/▶)
export function isPaused() { return paused; }
// Cobertura de scanlines retrô (#scan, fora do canvas): ligada/desligada
// conforme o save. Segura nos testes headless (DOM simulado).
let scanApplied = null;
function applyScanlines() {
  const on = !!(G.save && G.save.settings && G.save.settings.scanline);
  if (on === scanApplied) return;
  scanApplied = on;
  try {
    if (typeof document === "undefined") return;
    const el = document.getElementById("scan");
    if (el) el.hidden = !on;
  } catch (e) { /* DOM simulado nos testes */ }
}

// Gancho de teste/captura: rola a aba atual até o fim.
export function __optScrollToEnd() {
  optionsScroll = Math.max(0, optionsContentH - optViewport().h);
}

// Gancho de teste: a confirmação do APAGAR é em dois toques (arma/confirma);
// o teste de regressão usa isto para saber que o 1º toque foi processado antes
// do 2º (dois toques no MESMO quadro viram um só).
export function __ptArmed() { return ptArmed; }

export function boot() {
  initInput(canvas);
  applyScanlines();
}

// ---------------------------------------------------- gancho do MODO DEBUG ---
// Usado só por js/debug.js (carregado apenas com ?debug na URL): pula os menus
// e cai direto numa tela ou expedição, pelos MESMOS caminhos dos botões.
export const __debug = {
  modes: () => GAME_MODES.map((m) => m.id),
  startRun({ mode = "campanha", map = 0, seed = null } = {}) {
    const base = GAME_MODES.find((m) => m.id === mode) || GAME_MODES[0];
    const idx = Math.max(0, Math.min(MAPS.length - 1, map | 0));
    return newRun(Object.assign({}, base, { mapIdx: idx }), seed);
  },
  openScreen(name, opts = {}) {
    if (name === "LOADING") {
      const mIdx = opts.mapa != null ? Math.max(0, Math.min(MAPS.length - 1, (opts.mapa | 0) - 1)) : 0;
      const biome = opts.bioma || (opts.mapa != null ? MAPS[mIdx].id : "planicie");
      startLoadingScreen({ biome, minDuration: opts.minDuration != null ? opts.minDuration : 1.5 });
      return;
    }
    if (name === "TREE") { enterTree(); treeReturn = "TITLE"; }
    else if (name === "OPTIONS") { optionsReturn = "TITLE"; optionsTab = 0; optionsScroll = 0; optGrab = null; }
    else if (name === "HELP") helpReturn = "TITLE";
    else if (name === "MEMORY") memoryHover = -1;
    else if (name === "PROPHECY") checkProphecies(null, false, null);
    G.screen = name;
  },
  openNest() { if (G.run && G.screen === "RUN") openNest(G.run); },
  skipWave() { if (G.run && G.screen === "RUN") return skipWave(); return false; },
  // FILTRO PS1 (OPÇÕES → VÍDEO): liga/desliga pelas MESMAS vias do menu —
  // usado pelas capturas comparativas e pelo teste de regressão do filtro.
  psxLevel(n) {
    const i = clamp(n | 0, 0, 1);
    G.save.settings.psx = i;
    persistSave();
    applyPsxFilter();
    return i;
  },
};
