// ============================================================================
// FUMIGA — orquestrador: telas, expedição multi-mapa, HUD, interações
// ============================================================================
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL, UNITS, START, MAPS, CHAMBERS,
  MUTATIONS, RARITY, HELP_GOAL, HELP_CONTROLS, HELP_TIPS, CALM_START, MAX_MUTS, xpForLevel,
  GAME_MODES,
} from "./config.js";
import { fogReset, fogUpdate, fogDraw, fogVisible, fogExplored, fogDrawMini } from "./fog.js";
import {
  G, mods, metaBonus, mutBonus, toggleMute, persistSave, loadSave,
} from "./state.js";
import { IMG, rotFrame } from "./assets.js";
import { drawText, textWidth, wrapText, FONT } from "./font.js";
import { keys, pressed, mouse, initInput } from "./input.js";
import { cam, camReset, updateCam, panCam, zoomCam, shake, screenToWorld, worldToScreen, visibleWorldRect } from "./camera.js";
import {
  spawnPart, burst, ring, floatText, clearParticles, updateParticles,
} from "./particles.js";
import { initAudio, audioReady, SFX, setCombat } from "./audio.js";
import { world, genWorld, MINI } from "./world.js";
import {
  allies, spawnQueen, spawnAnt, updateAllies, buyUnit, unitCost, popUsed, popCapTotal,
  unitLimitLeft, selectInRect, selectTypeOnScreen, clearSelection, selectedCount,
  orderSelected, orderAttackSelected, rallyDefenders, recomputeAllies,
} from "./units.js";
import { foes, boss, clearFoes, updateFoes, updateBoss } from "./enemies.js";
import { projectiles, orbs, updateProjectiles, updateOrbs, clearCombat } from "./combat.js";
import {
  director, resetDirector, updateDirector, skipPeace, mapDef, waveDef, isLastMap, nextMapCalm,
  primeDirector,
} from "./waves.js";
import { rollDraft, applyMutation, mutationList } from "./mutations.js";
import { drawRun } from "./render.js";
import { drawTitleBg, drawTitleMotes } from "./titlebg.js";
import { enterTree, updateTree, drawTree, treeClick, TREE_BACK } from "./meta.js";
import { colony, colonyReset, pheromoneReset, pheromoneTick } from "./ai.js";
import { goTo, updateTransition, drawCover, drawDust, enterEased } from "./transition.js";
import { uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect, chamferPath, withAlpha } from "./ui.js";
import { startTutorial, stopTutorial, updateTutorial, drawTutorial, tutEvent, TUT, tutorialCardRect } from "./tutorial.js";
import { nest, nestEnter, nestExit, nestUpdate, nestDraw, nestClick, nestHover } from "./nest.js";
import { rand, clamp, lerp, TAU, fmt } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ------------------------------------------------------- trocas de tela -----
// Toda troca passa pela cortina (js/transition.js): nada mais de piscar de
// uma cena para outra. `treeReturn` guarda de ONDE se entrou na árvore, para
// o botão VOLTAR levar de volta ao lugar certo (antes ele chumbava TITLE).
let treeReturn = "TITLE";

function gotoTree(from, opts = {}) {
  treeReturn = from || G.screen;
  goTo("TREE", { style: "iris", durOut: 0.28, durIn: 0.42, onApply: enterTree, ...opts });
}
function gotoTitle(opts = {}) {
  goTo("TITLE", { style: "fade", durOut: 0.22, durIn: 0.36, ...opts });
}
function gotoHelp(from) {
  helpReturn = from || G.screen;
  goTo("HELP", { style: "wipe", durOut: 0.2, durIn: 0.3 });
}
function startRun(opts = {}) {
  goTo("RUN", { style: "swipe", durOut: 0.34, durIn: 0.5, onApply: newRun, ...opts });
}

// ------------------------------------------------------- fluxo das telas ----
// SPLASH (só o título) → TITLE (menu) → MODE (escolha de modo) → RUN.
// O splash existe para a abertura ter peso: a arte respira, o título entra
// letra por letra e o convite "CLIQUE PARA JOGAR" pisca até o jogador tocar.
let splashT = 0;
let modeIdx = 0;

function gotoMode() {
  goTo("MODE", { style: "iris", durOut: 0.26, durIn: 0.44 });
}

function gotoTitle2() {
  goTo("TITLE", { style: "fade", durOut: 0.24, durIn: 0.5, flash: 0.16 });
}

/** Consumido pelo loop principal enquanto o jogo está no SPLASH. */
export function updateSplash(dt) {
  splashT += dt;
  const ready = splashT > 0.75;              // evita pular por clique acidental
  const click = ready && (mouse.justDown || pressed.Enter || pressed.Space);
  if (click) {
    initAudio();
    sparkle(mouse.x, mouse.y);
    if (!pressed.Enter && !pressed.Space) SFX.uiClick();
    gotoTitle2();
  }
}

/** Pequeno clarão no ponto tocado (o splash responde ao dedo). */
function sparkle(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + rand(-0.2, 0.2);
    const sp = rand(40, 150);
    sparkPts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5 });
  }
}
const sparkPts = [];

function updateSparkle(dt) {
  for (let i = sparkPts.length - 1; i >= 0; i--) {
    const p = sparkPts[i];
    p.life -= dt;
    if (p.life <= 0) { sparkPts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy = p.vy * 0.94 + 22 * dt;
  }
}

function drawSparkle(ctx2) {
  for (const p of sparkPts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx2.globalAlpha = a;
    ctx2.fillStyle = a > 0.6 ? "#fff6e0" : "#ffd479";
    ctx2.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx2.globalAlpha = 1;
}

function updateMode(dt) {
  const n = GAME_MODES.length;
  if (pressed.ArrowLeft || pressed.KeyA) { modeIdx = (modeIdx + n - 1) % n; SFX.uiClick(); }
  if (pressed.ArrowRight || pressed.KeyD) { modeIdx = (modeIdx + 1) % n; SFX.uiClick(); }
  for (let i = 0; i < n; i++) if (pressed["Digit" + (i + 1)]) modeIdx = i;
  if (pressed.Escape || pressed.Backspace) gotoTitle2();
  if (pressed.Enter || pressed.Space) beginRunWithMode();
}

/** Começa a expedição no modo selecionado (ou no modo pedido pelo id). */
export function beginRunWithMode(id) {
  const cfg = GAME_MODES.find((m) => m.id === (id || GAME_MODES[modeIdx].id)) || GAME_MODES[0];
  initAudio();
  SFX.win();
  G.modeId = cfg.id;
  startRun();
}

// ------------------------------------------------------------------ loja ----
const SHOP = [
  { type: "worker",   label: "OPERÁRIA" },
  { type: "gatherer", label: "COLET." },
  { type: "soldier",  label: "SOLDADO" },
  { type: "spitter",  label: "CUSPID." },
  { type: "tank",     label: "G. ÉBANO" },
  { type: "scout",    label: "BATED." },
  { type: "healer",   label: "CURAND." },
  { type: "bomber",   label: "BOMB." },
  { type: "giant",    label: "GIGANTE", iconScale: 0.13, accent: "#ffd479" },
];

// Geometria da fileira da loja: 9 classes + a câmara interna precisam terminar
// antes do minimapa (x=770). Passo 74 e 70 de largura deixam 10..752.
const SHOP_W = 70, SHOP_PITCH = 76;

// O painel de formigas começa RECOLHIDO: o rodapé só mostra o botão FORMIGAS
// (que abre a fileira das 9 classes) e o botão do FORMIGUEIRO, no canto
// inferior-direito. Um botão, um lugar — nada de nove cartões fixos na tela.
let shopOpen = false;

// ------------------------------------------------------------------ run -----
function newRun() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const modeCfg = GAME_MODES.find((m) => m.id === G.modeId) || GAME_MODES[0];
  primeDirector(modeCfg);
  colonyReset();          // cérebro da colônia do zero (feromônios limpos)
  genWorld(seed, 0);
  fogReset();
  clearParticles();
  clearFoes();
  clearCombat();
  allies.length = 0;
  camReset();
  paused = false;
  nestExit();

  const m = metaBonus();
  const run = {
    seed,
    mode: modeCfg.id, modeName: modeCfg.name, modeCfg,
    status: "running",       // running | won | lost | ended
    endT: 0, payoutDone: false, payout: null,
    // bônus de árvore: estoque inicial de comida/essência
    food: START.food + m.startFood, essencePool: m.startEssence,
    level: 0, xp: 0, xpNext: xpForLevel(1),
    fungusT: 9,
    kills: 0, wave: 0, bestWaveThisRun: 0, mapsCleared: 0,
    mutations: new Set(), mutationLog: [],
    queenJustHit: 0,
    banner: { title: "MAPA 1/" + MAPS.length + " — " + MAPS[0].name, sub: MAPS[0].sub, t: 4.6, total: 4.6, kind: "map" },
    draft: null,
    elapsed: 0,
    heartbeatT: 0,
    rebirthUsed: false,
    selectT: 0,
    bossDefeated: false,
    cycles: 0,
    mapIdx: 0,
    transition: false,       // mostrando tela de mapa limpo
    chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  };
  G.run = run;
  window.__run = run;

  const queen = spawnQueen();
  window.__alliesQueen = queen;

  // esquadrão inicial: 2 operárias, 2 coletoras, 1 exploradora
  const A = world.anthill;
  const nW = START.workers + m.startWorkers;
  for (let i = 0; i < nW; i++) {
    const a = rand(0, TAU);
    spawnAnt("worker", A.x + Math.cos(a) * (100 + rand(0, 30)), A.y + Math.sin(a) * (100 + rand(0, 30)));
  }
  for (let i = 0; i < START.gatherers; i++) {
    const a = rand(0, TAU);
    spawnAnt("gatherer", A.x + Math.cos(a) * (130 + rand(0, 30)), A.y + Math.sin(a) * (130 + rand(0, 30)));
  }
  for (let i = 0; i < START.scouts; i++) {
    const a = rand(0, TAU);
    spawnAnt("scout", A.x + Math.cos(a) * 210, A.y + Math.sin(a) * 210);
  }
  for (let i = 0; i < m.startSoldiers; i++) {
    const a = rand(0, TAU);
    spawnAnt("soldier", A.x + Math.cos(a) * 190, A.y + Math.sin(a) * 190);
  }
  G.screen = "RUN";
  setCombat(0);

  // tutorial dinâmico: só na primeira expedição (ou até o jogador pular)
  if (!G.save.tutorial) startTutorial(); else stopTutorial(false);

  return run;
}

function endRun(won) {
  const run = G.run;
  run.status = won ? "won" : "lost";
  run.endT = won ? 2.0 : 1.9;
  G.timeScale = 0.3;
  G.slowMo = run.endT;
  if (won) SFX.win(); else SFX.lose();
  const A = world.anthill;
  shake(0.8);
  ring(A.x, A.y, { r0: 20, r1: 300, life: 0.8, color: won ? "#ffd479" : "#ff4d5a", width: 5 });
}

function settleRun() {
  const run = G.run;
  if (run.payoutDone) return;
  run.payoutDone = true;
  const em = metaBonus().essMult;
  const won = run.status === "won";
  // A GELÉIA REAL (essência salva) mede o PROGRESSO da expedição, não a
  // gordura do cofre: só 10% da essência coletada na run vira relíquia.
  const mapBonus = run.mapsCleared * 160;
  const waveBonus = run.wave * 8;
  const killBonus = run.kills;
  const relic = Math.round(run.essencePool * 0.1);
  const winBonus = won ? 200 : 0;
  const base = relic + waveBonus + killBonus + mapBonus + winBonus;
  const modeMul = (run.modeCfg && run.modeCfg.essenceMult) || 1;
  const total = Math.round(base * em * modeMul);
  run.payout = {
    relic, waveBonus, killBonus, mapBonus, winBonus, mult: em, mode: run.modeName || "", modeMul, total,
  };

  G.save.essence += total;
  const b = G.save.best;
  b.runs++;
  if (won) b.wins++;
  b.wave = Math.max(b.wave, run.wave);
  b.maps = Math.max(b.maps || 0, run.mapsCleared);
  b.kills += run.kills;
  persistSave();
}

// --------------------------------------------------------- avanço de mapa ---
function advanceMap() {
  const run = G.run;
  director.mapIdx++;
  run.mapIdx = director.mapIdx;
  const m = mapDef();

  // novo mundo, novo bioma
  genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
  fogReset();
  pheromoneReset();       // cheiro do mapa antigo não vale no bioma novo
  clearFoes();
  clearCombat();

  // a colônia inteira migra: reposiciona ao redor do novo formigueiro
  const A = world.anthill;
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

  // a rainha recupera o fôlego após o chefão
  if (q && !q.dead) {
    q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.4);
    burst(A.x, A.y, { n: 30, color: ["#ffd479", "#7fd6a0", "#fff"], spMin: 30, spMax: 160, life: 0.8, glow: true });
  }

  run.banner = { title: "MAPA " + (director.mapIdx + 1) + "/" + MAPS.length + " — " + m.name, sub: m.sub, t: 4.8, total: 4.8, kind: "map" };
  run.transition = false;
  SFX.chime();
  floatText(A.x, A.y - 120, "A COLÔNIA MIGRA PARA NOVAS TERRAS", { color: "#ffd479", life: 2.2, scale: 2 });
}

// -------------------------------------------------------------- seleção -----
// caixa de seleção com o botão DIREITO
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, moved: false };
// pan de câmera com o botão ESQUERDO
const pan = { active: false, moved: false };
// nevoeiro: alcance de visão por papel da unidade (em px do mundo)
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
    // fog of war: não pode mirar no que a colônia não enxerga
    if (!(f.revealT > 0) && !fogVisible(f.x, f.y)) continue;
    if (Math.hypot(f.x - wx, f.y - wy) < f.bodyR + 14) return f;
  }
  return null;
}

function allyAt(wx, wy) {
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    if (Math.hypot(a.x - wx, a.y - wy) < a.bodyR + 10) return a;
  }
  return null;
}

function uiCapture() {
  // algum botão da frame passada sob o mouse?
  for (const b of uiButtons()) {
    if (pointInRect(mouse.x, mouse.y, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

// ----------------------------------------------------------------- update ---
export function update(dt) {
  G.time += dt;
  updateTransition(dt);

  // alterna mudo sempre (o aviso entra no HUD como texto de MUNDO: converte)
  if (pressed.KeyM) {
    const m = toggleMute();
    const p = screenToWorld(VIEW_W / 2, VIEW_H / 2 - 30);
    floatText(p.x, p.y, m ? "SOM: DESLIGADO" : "SOM: LIGADO", { color: "#efe9ff", life: 1.2 });
  }

  switch (G.screen) {
    // atalhos do menu (os mesmos rótulos dos botões)
    case "SPLASH":
      updateSparkle(dt);
      updateSplash(dt);
      break;
    case "TITLE":
      if (pressed.Enter) { initAudio(); gotoMode(); return; }
      if (pressed.KeyA) { gotoTree("TITLE"); return; }
      if (pressed.KeyH) { gotoHelp("TITLE"); return; }
      break;
    case "MODE": updateMode(dt); break;
    case "TREE": updateTreeScreen(dt); break;
    case "HELP": break; // estático; cliques tratados no draw
    case "RUN": updateRun(dt); break;
  }

  // partículas sempre vivas
  updateParticles(dt * (G.screen === "RUN" ? G.timeScale : 1));

  if (G.slowMo > 0) {
    G.slowMo -= dt;
    if (G.slowMo <= 0) G.timeScale = 1;
  }
}

function leaveTree() {
  const dest = treeReturn;
  treeReturn = "TITLE";
  goTo(dest, { style: "fade", durOut: 0.2, durIn: 0.34 });
}

function updateTreeScreen(dt) {
  updateTree(dt);
  // VOLTAR é tratado no UPDATE, antes de qualquer coisa: não depende do
  // desenho do quadro nem do teste de "arrastando" — era por aí que o clique
  // se perdia e o jogador ficava preso na árvore.
  if (mouse.justDown && pointInRect(mouse.x, mouse.y, TREE_BACK.x, TREE_BACK.y, TREE_BACK.w, TREE_BACK.h)) {
    SFX.uiClick();
    leaveTree();
    return;
  }
  if (mouse.justDown && mouse.y > 70 && !uiCapture()) treeClick();
  if (pressed.Escape) leaveTree();
}

// --------------------------------------------------------------------- RUN --
function updateRun(dt) {
  const run = G.run;
  const simDt = dt * G.timeScale;
  run.elapsed += simDt;

  // ------------------------- FORMIGUEIRO (cena viva, inspiração Ant Colony)
  if (run.baseOpen) {
    if (pressed.Escape || pressed.KeyB) { closeNest(run, true); hudInputless(dt); return; }
    nestUpdate(dt);            // as formigas trabalham enquanto você assiste
    hudInputless(dt);
    return;                    // mundo congelado enquanto você está lá dentro
  }

  // -------------------------------------------------------- pausa (ESC) -----
  if (run.status === "running" && pressed.Escape) {
    paused = !paused;
    SFX.uiClick();
  }
  // sair da ajuda direto para a run em pausa
  if (G.screen !== "RUN") return;

  // fim cinematic
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

  // ------------------------------------------------ transição de mapa -------
  if (run.transition) {
    hudInputless(dt);
    // orbs de essência do chefão seguem voando para o formigueiro
    const g2 = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
    if (g2 > 0) run.essencePool += Math.round(g2 * metaBonus().essMult);
    return; // espera o jogador confirmar (botão na tela)
  }

  // ------------------------------------------------------------ câmera ------
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (mx && my) { mx *= 0.7071; my *= 0.7071; }
  if (mx || my) { TUT.camAccum += 400 * dt; }
  updateCam(dt, mx, my);
  if (mouse.wheel) zoomCam(mouse.wheel, mouse.x, mouse.y);
  if (pressed.Space) { cam.x = world.anthill.x; cam.y = world.anthill.y; }

  // --------------------------------------------------------------- draft ----
  if (!run.draft && director.pendingDrafts > 0 && director.phase === "calm" && !run.transition) {
    director.pendingDrafts--;
    run.draft = { options: rollDraft(), t: 0 };
    SFX.chime();
  }
  if (run.draft) {
    run.draft.t += dt;
    // escolha por teclado
    for (let i = 0; i < run.draft.options.length; i++) {
      if (pressed["Digit" + (i + 1)]) {
        pickDraft(i);
        return;
      }
    }
    hudInputless(dt);
    return; // mundo congela durante a escolha
  }

  // pular tutorial
  if (TUT.active && pressed.KeyT) stopTutorial(true);

  // tutorial: relógio
  if (TUT.active) updateTutorial(dt, run);

  // mapa limpo? abrir transição quando o diretor sinalizar
  if (director.phase === "mapClear" && !run.transition && run.status === "running") {
    run.transition = true;
    SFX.win();
    return;
  }

  // --------------------------------------------------------------- loja -----
  for (let i = 0; i < SHOP.length; i++) {
    if (pressed["Digit" + (i + 1)]) {
      const r = buyUnit(SHOP[i].type);
      if (!r.ok) {
        const wp = screenToWorld(mouse.x, mouse.y - 20);
        floatText(wp.x, wp.y, r.why, { color: "#ff4d5a", life: 1 });
      }
    }
  }
  if (pressed.KeyQ) { shopOpen = !shopOpen; SFX.uiClick(); }
  if (pressed.KeyG && director.phase === "calm") skipPeace();
  if (pressed.KeyB && run.status === "running") { openNest(run); }
  if (pressed.KeyF) {
    const n = rallyDefenders(world.anthill);
    tutEvent("rally", n);
    if (n > 0) floatText(world.anthill.x, world.anthill.y - 110, "GUARDA FORMADA! (" + n + ")", { color: "#37e6c8", life: 1.4 });
    ring(world.anthill.x, world.anthill.y, { r0: 40, r1: 200, life: 0.5, color: "#37e6c8", width: 3 });
  }

  // ------------------------------------------------------------- mundo ------
  updateDirector(simDt);
  updateAllies(simDt, foes);
  updateFoes(simDt, allies);
  if (boss) updateBoss(simDt, allies);
  updateProjectiles(simDt, allies, foes);
  const gained = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
  if (gained > 0) {
    const refMult = 1 + 0.15 * run.chambers.refinery;
    run.essencePool += Math.round(gained * metaBonus().essMult * refMult);
    tutEvent("essence");
  }
  spawnAmbient(simDt);

  // fungário: cultivo passivo de comida
  run.fungusT -= simDt;
  if (run.fungusT <= 0) {
    run.fungusT = 9;
    const crop = run.chambers.fungus + metaBonus().fungusRate;
    if (crop > 0) run.food += crop;
  }

  // XP -> sobe o nível da colônia
  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpForLevel(run.level + 1);
    recomputeAllies();
    SFX.chime();
    const A2 = world.anthill;
    ring(A2.x, A2.y, { r0: 24, r1: 190, life: 0.7, color: "#6db7ff", width: 4 });
    floatText(A2.x, A2.y - 150, "NÍVEL " + run.level + "! A COLÔNIA FICOU MAIS FORTE", {
      color: "#6db7ff", life: 2.2, scale: 2,
    });
  }

  // nevoeiro de guerra (~8 Hz)
  fogT += simDt;
  if (fogT >= 0.12) {
    fogT = 0;
    const beings = [];
    const nester = allies.queen;
    if (nester && !nester.dead) beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 360 });
    else beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 240 });
    for (const a of allies) {
      if (a.dead || a.dying || a.type === "queen") continue;
      beings.push({ x: a.x, y: a.y, sight: a.def.sight || SIGHT[a.def.role] || 240 });
    }
    if (boss && !boss.dead && (boss.revealT || 0) > 0) beings.push({ x: boss.x, y: boss.y, sight: 320 });
    fogUpdate(beings);
  }

  // derrota / rebirth
  const q = allies.queen;
  if (q && q.hp <= 0 && !q.dead) {
    if (metaBonus().rebirth && !run.rebirthUsed) {
      run.rebirthUsed = true;
      q.hp = q.maxHp * 0.5;
      q.flash = 0.4;
      SFX.rebirth();
      ring(world.anthill.x, world.anthill.y, { r0: 14, r1: 260, life: 0.9, color: "#c77dff", width: 6 });
      burst(world.anthill.x, world.anthill.y, { n: 46, color: ["#c77dff", "#ffd479", "#efe9ff"], spMin: 40, spMax: 220, life: 0.9, glow: true });
      floatText(world.anthill.x, world.anthill.y - 110, "RENASCIMENTO REAL!", { color: "#c77dff", life: 2.2, scale: 2 });
    } else {
      q.dead = true;
      endRun(false);
      return;
    }
  }
  // vitória: chefe do ÚLTIMO mapa eliminado
  const endless = !!(run.modeCfg && run.modeCfg.endless);
  if (!endless && run.status === "running" && run.bossDefeated && isLastMap() && run.bossDefeated === mapDef().boss) {
    endRun(true);
    return;
  }

  // batimento da rainha em perigo
  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    run.heartbeatT -= dt;
    if (run.heartbeatT <= 0) { run.heartbeatT = 0.95; SFX.heart(); }
  }

  // ------------------------------------------------------------ interação ---
  if (!uiCapture()) runMouseWorld(dt);

  hudInputless(dt);
}

// partículas de ambiente por bioma (pólen, esporos, fuligem, neve...)
function spawnAmbient(simDt) {
  const def = world.def;
  if (!def) return;
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

  // ================================== BOTÃO ESQUERDO: câmera (arrastar) / ordem (clique)
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
      // ---- CLIQUE ESQUERDO: ordenar às selecionadas (ataque / coleta / mover)
      if (selectedCount() > 0) {
        const foe = enemyAt(w.x, w.y);
        if (foe) {
          if (orderAttackSelected(foe) > 0) {
            ring(foe.x, foe.y, { r0: 6, r1: 40, life: 0.4, color: "#ff4d5a", width: 3 });
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

  // ================================== BOTÃO DIREITO: SELEÇÃO
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
      // clique simples com direito: seleciona 1 aliada próxima (ou limpa no vazio)
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
  // duplo clique DIREITO: todas do tipo na tela
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
  run.draft = null;
  SFX.buy();
}


// ----------------------------------------------------------------- splash ----
// Pré-menu: SÓ o título, grande, letra por letra, sobre a arte do pôr do sol.
// Abaixo dele, "CLIQUE PARA JOGAR" pulsando. Qualquer clique/tecla avançada.
// Cada letra do título é assada UMA vez num canvas com halo + contorno + corpo.
// A animação (entrada, flutuação, brilho) então só posiciona esses canvases —
// antes eram ~15 drawText por letra por quadro.
const titleLetters = new Map();
function titleLetterCanvas(ch) {
  let cv = titleLetters.get(ch);
  if (cv) return cv;
  const S = 6, pad = 30;
  const cw = FONT.big.cw * S, chh = FONT.big.ch * S;
  cv = document.createElement("canvas");
  cv.width = cw + pad * 2;
  cv.height = chh + pad * 2;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const put = (dx, dy, color, al) => {
    c.globalAlpha = al;
    drawText(c, ch, cv.width / 2 + dx, pad + dy, { font: "big", scale: S, color, align: "center", shadow: false });
  };
  // halo ciano (identidade da casa)
  put(-7, 0, "#35e8ff", 0.32); put(7, 0, "#35e8ff", 0.32);
  put(0, -7, "#35e8ff", 0.32); put(0, 7, "#35e8ff", 0.32);
  put(-5, -5, "#2fd2ff", 0.2); put(5, 5, "#2fd2ff", 0.2);
  // contorno escuro
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    put(dx, dy, "#07111a", 1);
  }
  // corpo + brilho do topo
  put(0, 0, "#f4fffd", 1);
  put(0, -2, "#dfffff", 0.45);
  titleLetters.set(ch, cv);
  return cv;
}

function renderSplash() {
  const t = G.time;
  const e = enterEased();
  drawTitleBg(ctx, t);
  drawTitleMotes(ctx, t);

  // escurecimento em vinheta: o olho vai para o título
  const vg = ctx.createRadialGradient(VIEW_W / 2, 250, 60, VIEW_W / 2, 250, 620);
  vg.addColorStop(0, "rgba(9,5,18,0.18)");
  vg.addColorStop(0.65, "rgba(9,5,18,0.45)");
  vg.addColorStop(1, "rgba(9,5,18,0.74)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // faixa escura horizontal atrás do título (dá contraste ao texto)
  const band = ctx.createLinearGradient(0, 96, 0, 360);
  band.addColorStop(0, "rgba(10,6,20,0)");
  band.addColorStop(0.4, "rgba(10,6,20,0.6)");
  band.addColorStop(0.66, "rgba(10,6,20,0.6)");
  band.addColorStop(1, "rgba(10,6,20,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 90, VIEW_W, 276);

  // ---- título letra por letra -------------------------------------------------
  // A fonte é um atlas: cada glifo tem célula (cw) maior que o avanço (adv).
  // Para escalonar letra por letra o passo tem de ser adv*S; usar a largura da
  // linha (que devolve a CÉLULA do último glifo) espalhava demais as letras.
  const title = "FUMIGA";
  const S = 6;
  const AD = FONT.big.adv * S;                 // passo entre letras
  const CWd = FONT.big.cw * S;                 // largura da célula
  const CHg = FONT.big.ch * S;                 // altura da célula
  const ink = (title.length - 1) * AD + CWd;   // largura ocupada (com a célula final)
  const x0 = (VIEW_W - ink) / 2;
  const yTop = 116 + Math.sin(t * 0.9) * 3;    // topo da célula (o desenho é por topo)

  // respiro escuro atrás da palavra (radial: sem borda reta visível)
  const cxp = VIEW_W / 2, cyp = yTop + CHg / 2;
  const plate = ctx.createRadialGradient(cxp, cyp, 40, cxp, cyp, ink * 0.62);
  plate.addColorStop(0, "rgba(9,5,18,0.58)");
  plate.addColorStop(0.6, "rgba(9,5,18,0.34)");
  plate.addColorStop(1, "rgba(9,5,18,0)");
  ctx.save();
  ctx.translate(cxp, cyp);
  ctx.scale(1, 0.5);
  ctx.translate(-cxp, -cyp);
  ctx.fillStyle = plate;
  ctx.fillRect(cxp - ink * 0.7, cyp - ink * 0.7, ink * 1.4, ink * 1.4);
  ctx.restore();

  ctx.save();
  for (let i = 0; i < title.length; i++) {
    const lcv = titleLetterCanvas(title[i]);
    const pad = 30;
    const a = clamp((e - i * 0.075) / 0.45, 0, 1);
    const ea = 1 - Math.pow(1 - a, 3);
    const cxg = x0 + i * AD + CWd / 2;
    const cyg = yTop + CHg / 2 + (1 - ea) * 46 + Math.sin(t * 1.15 + i * 0.7) * 2.6;
    const rot = Math.sin(t * 0.85 + i * 0.55) * 0.016 * ea;
    const bounce = 1 + Math.sin(t * 1.6 + i) * 0.012;

    ctx.save();
    ctx.globalAlpha = ea;
    ctx.translate(cxg, cyg);
    ctx.rotate(rot);
    ctx.scale(bounce, bounce);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lcv, -CWd / 2 - pad, -CHg / 2 - pad);
    ctx.restore();
  }
  ctx.restore();

  // varredura de brilho atravessando as letras (a cada ~5 s)
  const sw = (t % 5.2) / 5.2;
  if (sw < 0.24) {
    const sx = x0 - 80 + (sw / 0.24) * (ink + 160);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 20, yTop, ink + 40, CHg);
    ctx.clip();
    const g2 = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
    g2.addColorStop(0, "rgba(255,255,255,0)");
    g2.addColorStop(0.5, "rgba(226,252,255,0.34)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(sx - 70, yTop - 10, 140, CHg + 20);
    ctx.restore();
  }

  // subtítulo com filetes (logo abaixo da tinta do título)
  const subA = clamp((e - 0.45) / 0.55, 0, 1);
  const subTxt = "COLÔNIA ETERNA";
  const subW = textWidth(subTxt, { font: "small", scale: 2 });
  const subY = yTop + CHg - 4;
  ctx.globalAlpha = subA;
  drawText(ctx, subTxt, VIEW_W / 2, subY, { font: "small", scale: 2, color: "#ffd479", align: "center" });
  ctx.fillStyle = "rgba(255,212,121,0.5)";
  ctx.fillRect(VIEW_W / 2 - subW / 2 - 78, subY + 12, 58, 1);
  ctx.fillRect(VIEW_W / 2 + subW / 2 + 20, subY + 12, 58, 1);
  ctx.globalAlpha = 1;

  // ---- "CLIQUE PARA JOGAR"
  const pa = clamp((t - 1.1) / 0.6, 0, 1) * e;
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.6);
  const ty = VIEW_H - 146 + Math.sin(t * 1.4) * 2;
  ctx.globalAlpha = pa * (0.55 + pulse * 0.45);
  const msg = "CLIQUE PARA JOGAR";
  const mw = textWidth(msg, { font: "big", scale: 2 });
  // placa fina atrás da mensagem
  ctx.fillStyle = "rgba(10,6,20,0.55)";
  chamferPath(ctx, VIEW_W / 2 - mw / 2 - 26, ty - 12, mw + 52, 40, 6);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,212,121,${0.25 + pulse * 0.35})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (const [dx2, dy2] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    drawText(ctx, msg, VIEW_W / 2 + dx2, ty + dy2, { font: "big", scale: 2, color: "#08131c", align: "center" });
  }
  drawText(ctx, msg, VIEW_W / 2, ty, { font: "big", scale: 2, color: pulse > 0.5 ? "#fff6e0" : "#ffd479", align: "center" });
  // cursor piscando
  ctx.globalAlpha = pa * (Math.sin(t * 6) > 0 ? 1 : 0.15);
  ctx.fillStyle = "#ffd479";
  ctx.fillRect(VIEW_W / 2 + mw / 2 + 12, ty - 2, 7, 18);
  ctx.globalAlpha = 1;

  // dica discreta de teclado
  ctx.globalAlpha = pa * 0.55;
  drawText(ctx, "ENTER  •  ESPAÇO", VIEW_W / 2, ty + 58, { color: "#c9b6d8", align: "center" });
  ctx.globalAlpha = 1;

  drawSparkle(ctx);
}

// ------------------------------------------------------------------ modos ----
// Tela de escolha do modo de jogo (entre o menu e a gameplay). Três cartões
// grandes com ícone, texto e etiquetas; o cartão escolhido ganha moldura e
// brilho na cor do modo.
function renderMode() {
  const e = enterEased();
  const t = G.time;
  drawTitleBg(ctx, t);
  ctx.fillStyle = "rgba(9,6,18,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawTitleMotes(ctx, t);
  ctx.fillStyle = "rgba(9,6,18,0.42)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const n = GAME_MODES.length;
  const cw = 254, ch = 268, gap = 22;
  const totalW = n * cw + (n - 1) * gap;
  const x0 = (VIEW_W - totalW) / 2;
  const cy = 120 + (1 - e) * 18;

  // cabeçalho
  ctx.globalAlpha = 0.2 + e * 0.8;
  const hTxt = "ESCOLHA O MODO DE JOGO";
  const hw = textWidth(hTxt, { font: "big", scale: 2 });
  drawText(ctx, hTxt, VIEW_W / 2, 34, { font: "big", scale: 2, color: "#ffd479", align: "center" });
  ctx.fillStyle = "rgba(255,212,121,0.35)";
  ctx.fillRect(VIEW_W / 2 - hw / 2 - 110, 72, 74, 1);
  ctx.fillRect(VIEW_W / 2 + hw / 2 + 36, 72, 74, 1);
  drawText(ctx, "COMO A COLÔNIA ENFRENTA A EXPEDIÇÃO", VIEW_W / 2, 100, { color: "#c9b6d8", align: "center" });
  ctx.globalAlpha = 1;

  for (let i = 0; i < n; i++) {
    const cfg = GAME_MODES[i];
    const x = x0 + i * (cw + gap);
    const y = cy;
    const sel = i === modeIdx;
    const hot = pointInRect(mouse.x, mouse.y, x, y, cw, ch);

    // cartão
    panel(ctx, x, y, cw, ch, {
      fill: sel ? "#211838" : "#171129",
      border: sel ? cfg.accent : hot ? "#4a3a6e" : "#33284e",
      r: 8,
      topAccent: withAlpha(cfg.accent, sel ? 1 : 0.4),
    });
    if (sel) {
      const pulse = 0.4 + 0.22 * Math.sin(t * 4);
      ctx.strokeStyle = withAlpha(cfg.accent, pulse);
      ctx.lineWidth = 2;
      chamferPath(ctx, x - 5, y - 5, cw + 10, ch + 10, 11);
      ctx.stroke();
    }

    // ícone sobre um disco de luz
    const icon = IMG[cfg.icon];
    if (icon) {
      const cxi = x + cw / 2, cyi = y + 50;
      const g = ctx.createRadialGradient(cxi, cyi, 4, cxi, cyi, 46);
      g.addColorStop(0, withAlpha(cfg.accent, sel ? 0.38 : 0.2));
      g.addColorStop(1, withAlpha(cfg.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cxi, cyi, 46, 0, TAU); ctx.fill();
      const isc = 3;
      const iw = icon.width * isc, ih = icon.height * isc;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = sel ? 1 : 0.8;
      ctx.drawImage(icon, cxi - iw / 2, cyi - ih / 2, iw, ih);
      ctx.globalAlpha = 1;
    }

    drawText(ctx, cfg.name, x + cw / 2, y + 84, { font: "big", scale: 1, color: sel ? "#fff6e0" : "#d8cfe8", align: "center" });
    ctx.fillStyle = withAlpha(cfg.accent, sel ? 0.55 : 0.22);
    ctx.fillRect(x + 14, y + 114, cw - 28, 1);
    drawText(ctx, cfg.sub, x + cw / 2, y + 120, { color: sel ? cfg.accent : PAL.textDim, align: "center" });

    const lines = wrapText(cfg.desc, cw - 30, {});
    lines.forEach((L, li) => drawText(ctx, L, x + 15, y + 142 + li * 15, { color: "#c9b6d8" }));

    // etiquetas em linhas (nunca vazam do cartão)
    const chips = cfg.chips;
    const cwid = chips.map((c2) => textWidth(c2, {}) + 16);
    const rows = [];
    let row = [], rowW = 0;
    for (let ci = 0; ci < chips.length; ci++) {
      const need = cwid[ci] + (row.length ? 6 : 0);
      if (rowW + need > cw - 24 && row.length) { rows.push({ row, rowW }); row = []; rowW = 0; }
      row.push(ci);
      rowW += cwid[ci] + (row.length > 1 ? 6 : 0);
    }
    if (row.length) rows.push({ row, rowW });
    let chy = y + ch - 20 - (rows.length - 1) * 22;
    for (const rr of rows) {
      let chx = x + cw / 2 - rr.rowW / 2;
      for (const ci of rr.row) {
        ctx.fillStyle = withAlpha(cfg.accent, sel ? 0.2 : 0.09);
        chamferPath(ctx, chx, chy - 3, cwid[ci], 18, 3);
        ctx.fill();
        ctx.strokeStyle = withAlpha(cfg.accent, sel ? 0.6 : 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        drawText(ctx, chips[ci], chx + cwid[ci] / 2, chy + 2, { color: sel ? "#fff6e0" : "#b9aece", align: "center" });
        chx += cwid[ci] + 6;
      }
      chy += 22;
    }

    // passagem do mouse já seleciona; clique começa a expedição
    uiButtons().push({ x, y, w: cw, h: ch, id: "mode_" + cfg.id });
    if (hot) {
      modeIdx = i;
      if (mouse.justDown) { beginRunWithMode(cfg.id); return; }
    }
  }

  // ---- botões
  const by = cy + ch + 20;
  const selCfg = GAME_MODES[modeIdx];
  if (button(ctx, {
    x: VIEW_W / 2 - 160, y: by, w: 320, h: 46, label: "JOGAR", font: "big", scale: 1,
    id: "modePlay", accent: selCfg.accent, hotkey: "ENTER",
  })) {
    beginRunWithMode(selCfg.id);
    return;
  }
  if (button(ctx, { x: 60, y: by, w: 150, h: 46, label: "VOLTAR", id: "modeBack", font: "small", hotkey: "ESC" })) {
    gotoTitle2();
    return;
  }
  drawText(ctx, "SETAS: ESCOLHER  •  1-3: ATALHO  •  ENTER: JOGAR  •  ESC: VOLTAR",
    VIEW_W / 2, VIEW_H - 24, { color: PAL.textDim, align: "center" });
}

// ------------------------------------------------------------------ render --
let paused = false;

export function render(dt) {
  ctx.imageSmoothingEnabled = false;
  uiBegin();
  switch (G.screen) {
    case "BOOT": break;
    case "SPLASH": renderSplash(); break;
    case "TITLE": renderTitle(); break;
    case "MODE": renderMode(); break;
    case "HELP": renderHelp(); break;
    case "TREE": {
      const r = drawTree(ctx, dt);
      if (r === "back") { leaveTree(); break; }   // clique no botão desenhado
      break;
    }
    case "RUN": renderRun(); break;
  }
  cursorCustom();
  // cortina por último: cobre o quadro inteiro durante a troca de tela
  drawCover(ctx);
  drawDust(ctx);
}

function cursorCustom() {
  // cursor de mira
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

// ------------------------------------------------------------------ título ---
function renderTitle() {
  const e = enterEased();                    // 0..1 — animação de entrada
  drawTitleBg(ctx, G.time);
  drawTitleMotes(ctx, G.time);

  // ====================================================== inspiração2 ------
  // A cena é o pôr-do-sol; o título fica numa PLACA escura própria, com bisel
  // quente e filete ciano. Antes as letras ficavam direto sobre a colina
  // roxa, e o contraste sumia (reclamação do menu). A placa resolve na
  // origem: o texto nunca mais depende do que está pintado atrás.
  const tY = 62 + Math.sin(G.time * 0.8) * 3;
  const logoW = textWidth("FUMIGA", { font: "big", scale: 4 });
  const px = 44;
  const py = tY - 20;                        // posição final (a placa desliza)
  const pyAnim = py - (1 - e) * 30;          // ...mas os cliques não se movem
  const pw = logoW + 56, ph = 200;
  const bob = Math.sin(G.time * 0.9) * 2;

  // ---- placa do título
  ctx.save();
  ctx.globalAlpha = 0.25 + e * 0.75;
  ctx.translate(0, bob);
  const plateG = ctx.createLinearGradient(0, pyAnim, 0, pyAnim + ph);
  plateG.addColorStop(0, "rgba(16,9,26,0.95)");
  plateG.addColorStop(0.55, "rgba(12,7,22,0.92)");
  plateG.addColorStop(1, "rgba(8,5,16,0.86)");
  chamferPath(ctx, px, pyAnim, pw, ph, 10);
  ctx.fillStyle = plateG;
  ctx.fill();
  // bisel claro + contorno escuro (chapa de metal)
  ctx.strokeStyle = "rgba(255,212,121,0.5)";
  ctx.lineWidth = 2;
  chamferPath(ctx, px + 1, pyAnim + 1, pw - 2, ph - 2, 9);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1;
  chamferPath(ctx, px + 0.5, pyAnim + 0.5, pw - 1, ph - 1, 10);
  ctx.stroke();
  // filetes de acento: ciano em cima, brasa embaixo
  ctx.fillStyle = "rgba(55,230,200,0.85)";
  ctx.fillRect(px + 12, pyAnim + 3, pw - 24, 2);
  ctx.fillStyle = "rgba(255,146,61,0.6)";
  ctx.fillRect(px + 12, pyAnim + ph - 5, pw - 24, 2);
  // coluna de formigas marchando pela borda de cima da placa
  const march = pyAnim + 1;
  for (let i = 0; i < 9; i++) {
    const ax = px + 20 + ((G.time * 26 + i * 44) % (pw - 40));
    drawPixelAnt(ctx, ax, march, 1, (i % 2 ? 1 : -1), "#1a0c20");
  }

  // ---- varredura de luz ocasional sobre o título
  const sweep = (G.time % 5.4) / 5.4;
  if (sweep < 0.16) {
    const k = sweep / 0.16;
    const sx = px - 60 + k * (pw + 120);
    ctx.save();
    chamferPath(ctx, px + 2, pyAnim + 2, pw - 4, ph - 4, 8);
    ctx.clip();
    const g2 = ctx.createLinearGradient(sx - 46, 0, sx + 46, 0);
    g2.addColorStop(0, "rgba(255,255,255,0)");
    g2.addColorStop(0.5, "rgba(210,245,255,0.16)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(px, pyAnim, pw, ph);
    ctx.restore();
  }

  // ---- LOGO: letras claras, contorno escuro e halo ciano curto
  const logo = (x, y, str, font, scale) => {
    const halo = [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]];
    ctx.globalAlpha = 0.14;
    for (const [dx, dy] of halo) drawText(ctx, str, x + dx, y + dy, { font, scale, color: "#35e8ff" });
    ctx.globalAlpha = 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      drawText(ctx, str, x + dx, y + dy, { font, scale, color: "#08131c" });
    }
    drawText(ctx, str, x, y, { font, scale, color: "#f2fffd" });
  };
  logo(px + 22, pyAnim + 20, "FUMIGA", "big", 4);
  // subtítulo com filete à direita (leitura firme sobre a placa)
  const subY = pyAnim + 146;
  drawText(ctx, "COLÔNIA ETERNA", px + 22, subY, { font: "small", scale: 2, color: "#ffd479" });
  const subW = textWidth("COLÔNIA ETERNA", { font: "small", scale: 2 });
  ctx.fillStyle = "rgba(255,212,121,0.45)";
  ctx.fillRect(px + 26 + subW + 10, subY + 15, 56, 1);
  drawText(ctx, "um roguelite de colônia de formigas", px + 24, subY + 34,
    { color: "#c9b6d8" });
  ctx.restore();

  // menu: coluna esquerda, alinhada com a placa
  const bx = px + 22, bw = 268;
  const pulse = 0.55 + 0.45 * Math.sin(G.time * 3.2);
  const promptY = py + ph + 12;   // (final: o menu não se move)
  ctx.globalAlpha = 0.35 + e * 0.65;
  drawText(ctx, "PRESSIONE PARA COMEÇAR", bx, promptY, { color: "#ffe9c9" });
  ctx.globalAlpha = (0.35 + pulse * 0.5) * (0.35 + e * 0.65);
  ctx.fillStyle = "#eafffb";
  ctx.fillRect(bx + 214, promptY + 3, 8, 11);
  ctx.globalAlpha = 1;

  // botões entram em cascata (cada um com um atraso próprio)
  // a cascata mexe só na transparência (e 4px de deslize): os retângulos de
  // clique ficam estáveis desde o primeiro quadro — nada de botão que foge
  const stag = (i) => Math.max(0, Math.min(1, (e - i * 0.12) / 0.7));
  const slide = (i) => (1 - stag(i)) * 4;
  ctx.save();
  ctx.globalAlpha = 0.15 + 0.85 * e;
  if (button(ctx, { x: bx, y: promptY + 18 + slide(0), w: bw, h: 44, label: "JOGAR", font: "big", scale: 1, id: "start", accent: "#37e6c8", hotkey: "ENTER" })) {
    initAudio();
    gotoMode();
    return;
  }
  if (button(ctx, { x: bx, y: promptY + 70 + slide(1), w: bw, h: 40, label: "ÁRVORE DA EVOLUÇÃO", font: "big", scale: 1, id: "tree", accent: "#c77dff", hotkey: "A" })) {
    gotoTree("TITLE");
    return;
  }
  if (button(ctx, { x: bx, y: promptY + 118 + slide(2), w: bw, h: 36, label: "COMO JOGAR", id: "help", accent: "#6db7ff", hotkey: "H" })) {
    gotoHelp("TITLE");
    return;
  }
  ctx.restore();

  // rodapé minimalista à esquerda (versão + progresso)
  drawText(ctx, "v2.3", 24, VIEW_H - 20, { color: "#ffd9a0" });
  drawText(ctx, "GELÉIA REAL: " + G.save.essence +
    "   •   VITÓRIAS " + G.save.best.wins + "/" + G.save.best.runs +
    "   •   MELHOR: MAPA " + (G.save.best.maps || 0) +
    "   •   M: SOM",
    62, VIEW_H - 20, { color: "#ffd9a0" });
}

/** Formiguinha de pixel (silhueta) usada como enfeite animado das telas. */
function drawPixelAnt(ctx, x, y, s, d, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 6 * s, y - 3 * s, 5 * s, 4 * s);       // gáster
  ctx.fillRect(x - 1 * s, y - 3 * s, 4 * s, 4 * s);       // tórax
  ctx.fillRect(x + 4 * s * d, y - 4 * s, 4 * s, 5 * s);   // cabeça
  ctx.fillRect(x + 8 * s * d, y - 6 * s, 3 * s, 2 * s);   // antena
  ctx.fillRect(x - 4 * s, y + 1 * s, 2 * s, 2 * s);       // pernas
  ctx.fillRect(x + 1 * s, y + 1 * s, 2 * s, 2 * s);
}

// ------------------------------------------------------------------ ajuda ----
// Duas colunas: o texto é longo demais para uma só (a lista de controles
// terminava fora do painel e fora do canvas). Tudo é quebrado por wrapText.
function renderHelp() {
  drawTitleBg(ctx);
  ctx.fillStyle = "rgba(10,8,16,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PX = 40, PY = 26, PW = VIEW_W - 80, PH = VIEW_H - 68; // 40..920 x 26..498
  panel(ctx, PX, PY, PW, PH);
  drawText(ctx, "COMO JOGAR", VIEW_W / 2, PY + 16,
    { font: "big", scale: 2, color: "#ffd479", align: "center" });

  const colW = (PW - 96) / 2;                 // ~392
  const colX = [PX + 30, PX + 66 + colW];
  const descX = 134;                          // deslocamento da descrição

  // ---- OBJETIVO: faixa de largura total ----
  let y = PY + 76;
  drawText(ctx, "OBJETIVO", colX[0], y, { font: "big", color: "#c77dff" });
  y += 28;
  for (const t of HELP_GOAL) {
    for (const L of wrapText(t, PW - 60, {})) {
      drawText(ctx, L, colX[0], y, { color: PAL.text });
      y += 18;
    }
  }
  y += 18;

  // ---- coluna esquerda: CONTROLES ----
  let yl = y;
  drawText(ctx, "CONTROLES", colX[0], yl, { font: "big", color: "#c77dff" });
  yl += 28;
  for (const [k, d] of HELP_CONTROLS) {
    drawText(ctx, k, colX[0], yl, { color: "#37e6c8" });
    const lines = wrapText(d, colW - descX, {});
    lines.forEach((L, li) => drawText(ctx, L, colX[0] + descX, yl + li * 16, { color: PAL.text }));
    yl += Math.max(20, lines.length * 16 + 4);
  }

  // ---- coluna direita: DICAS ----
  let yr = y;
  drawText(ctx, "DICAS", colX[1], yr, { font: "big", color: "#c77dff" });
  yr += 28;
  for (const t of HELP_TIPS) {
    for (const L of wrapText(t, colW, {})) {
      drawText(ctx, L, colX[1], yr, { color: PAL.text });
      yr += 17;
    }
    yr += 6;
  }

  if (button(ctx, { x: VIEW_W / 2 - 100, y: VIEW_H - 56, w: 200, h: 38, label: "VOLTAR", id: "helpBack", hotkey: "ESC" })) {
    const dest = helpReturn; helpReturn = "TITLE";
    goTo(dest, { style: "wipe", durOut: 0.18, durIn: 0.28 });
  }
  if (pressed.Escape) {
    const dest = helpReturn; helpReturn = "TITLE";
    goTo(dest, { style: "wipe", durOut: 0.18, durIn: 0.28 });
  }
}

// -------------------------------------------------------------------- run ---
let shopTooltip = null;

function renderRun() {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  drawRun(ctx, dtClampForAnim());

  // Telas modais (câmara, draft, pausa, transição, fim) cobrem o campo: o HUD
  // não é desenhado por baixo. Antes ele continuava ali — os botões da loja
  // seguiam clicáveis sob o painel do fim de expedição (clicar em "NOVA
  // EXPEDIÇÃO" também comprava uma formiga) e os textos do HUD ficavam
  // encobertos por painéis opacos.
  const modal = paused || !!run.draft || !!run.transition || !!run.baseOpen || run.status !== "running";

  if (!modal) {
    drawHUD();
    if (run.banner && run.banner.t > 0) drawBanner(run.banner);
    if (TUT.active) drawTutorial(ctx, VIEW_W);
  }
  if (run.draft && !paused) drawDraft(run.draft);
  if (run.transition && !paused) drawTransition(run);
  if (run.baseOpen) drawNestScreen(run);
  if (paused) drawPause();
  if (run.status === "ended") drawEnd(run);
}

let lastDt = 1 / 60;
export function setLastDt(v) { lastDt = v; }
function dtClampForAnim() { return lastDt; }

// ------------------------------------------------------- formigueiro (cena) --
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

// A cena do formigueiro trata os próprios cliques (câmaras + botão de sair)
function drawNestScreen(run) {
  if (!nest.open) nestEnter();
  nestHover(mouse.x, mouse.y);
  const action = nestDraw(ctx);
  if (mouse.justDown && action !== "back") nestClick(mouse.x, mouse.y);
  if (action === "back") closeNest(run, true);
}

// Faixa vertical logo abaixo do contador de onda, já descontando o cartão do
// tutorial quando ele está na tela: é onde entram a barra do chefe e o botão
// de invocar onda (o cartão cobria a barra do chefe na primeira expedição).
function hudTopSlot() {
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  return tut ? tut.y + tut.h + 6 : 66;
}

function drawHUD() {
  const run = G.run;
  const m = mapDef();
  const q = allies.queen;
  // HUD só reage a cliques com a expedição em andamento e SEM tela modal na
  // frente (câmara, draft, pausa, transição, fim) — o desenho já é pulado
  // nesses casos, mas a trava fica explícita contra reordenações futuras.
  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;

  // ============ PAINEL DO JOGADOR (topo-esquerdo) ============
  // Sempre visíveis: vida do formigueiro, nível+XP, recursos. "VER MAIS"
  // desdobra população/abates/mutações sem poluir a tela.
  const pw = 262;
  const baseH = 78;
  const extraH = hudExpanded ? 74 : 0;
  const ph = baseH + 22 + extraH;
  panel(ctx, 10, 8, pw, ph);

  let yy = 16;
  // 1) VIDA DO FORMIGUEIRO (a rainha lá dentro)
  // rótulo tem ~93px de largura: a barra começa depois dele para não cobrir o texto
  drawText(ctx, "FORMIGUEIRO", 22, yy, { color: "#ffd479" });
  const hpFrac = q && q.maxHp ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  bar(ctx, 120, yy + 4, 138, 10, hpFrac, { c1: hpFrac < 0.3 ? "#ff4d5a" : "#ffd479", c2: "#a32e3a", segments: 10 });
  yy += 21;
  // 2) NÍVEL + BARRA DE EXPERIÊNCIA
  drawText(ctx, "NÍVEL " + run.level, 22, yy, { color: "#6db7ff" });
  const xpFrac = run.xpNext > 0 ? clamp(run.xp / run.xpNext, 0, 1) : 0;
  bar(ctx, 94, yy + 4, 164, 10, xpFrac, { c1: "#8fd3ff", c2: "#4060a8", segments: 0 });
  yy += 21;
  // 3) RECURSOS ATUAIS
  if (IMG.i_food) ctx.drawImage(IMG.i_food, 22, yy - 2, 16, 16);
  drawText(ctx, fmt(run.food), 42, yy + 1, { color: "#ffd479" });
  if (IMG.i_essence) ctx.drawImage(IMG.i_essence, 104, yy - 2, 16, 16);
  drawText(ctx, fmt(run.essencePool), 124, yy + 1, { color: "#c77dff" });
  yy += 22;
  // botão "VER MAIS / VER MENOS"
  const moreHot = pointInRect(mouse.x, mouse.y, 22, yy - 2, 72, 17);
  ctx.fillStyle = moreHot ? "#3a3054" : "#241c38";
  ctx.fillRect(22, yy - 2, 72, 17);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(22.5, yy - 1.5, 71, 16);
  drawText(ctx, hudExpanded ? "VER MENOS" : "VER MAIS", 58, yy + 2, { color: moreHot ? "#efe9ff" : PAL.textDim, align: "center" });
  uiButtons().push({ x: 22, y: yy - 2, w: 72, h: 17, id: "hudMore" });
  if (live && moreHot && mouse.justDown) { hudExpanded = !hudExpanded; SFX.uiClick(); }

  if (hudExpanded) {
    yy += 22;
    const used = popUsed(), cap = popCapTotal();
    drawText(ctx, "POPULAÇÃO " + used + "/" + cap, 22, yy, { color: used >= cap ? "#ff4d5a" : PAL.textDim });
    drawText(ctx, "ABATES " + run.kills, 160, yy, { color: PAL.textDim });
    yy += 18;
    // mutações ativas dobradinhas aqui
    if (run.mutationLog.length > 0) {
      let ix = 22;
      for (const mm of run.mutationLog.slice(0, 7)) {
        const icon = IMG["i_" + mm.icon];
        ctx.fillStyle = PAL.panel;
        ctx.fillRect(ix, yy - 2, 20, 20);
        ctx.strokeStyle = RARITY[mm.rar].color; ctx.lineWidth = 1;
        ctx.strokeRect(ix + 0.5, yy - 1.5, 19, 19);
        if (icon) ctx.drawImage(icon, ix + 2, yy, 16, 16);
        if (pointInRect(mouse.x, mouse.y, ix, yy - 2, 20, 20) && !shopTooltip) {
          const lines = wrapText(mm.name + " — " + mm.desc, 220, {});
          const th = 22 + lines.length * 15;
          panel(ctx, ix, yy + 20, 236, th);
          lines.forEach((L, li) => drawText(ctx, L, ix + 8, yy + 26 + li * 15, { color: PAL.text }));
        }
        ix += 25;
      }
      if (run.mutationLog.length > 7) drawText(ctx, "+" + (run.mutationLog.length - 7), ix + 2, yy + 2, { color: PAL.textDim });
      yy += 24;
    }
  }

  // ============ CONTADOR DE ONDA (topo, centralizado) ============
  const cw = 272;
  panel(ctx, VIEW_W / 2 - cw / 2, 8, cw, 52);
  if (run.status === "running") {
    if (director.phase === "calm") {
      const t = Math.max(0, Math.ceil(director.timer));
      drawText(ctx, "CALMARIA", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#37e6c8", align: "center" });
      drawText(ctx, run.draft ? "ESCOLHA UMA MUTAÇÃO" : "INVASÃO EM " + t + "s", VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else if (director.phase === "mapClear") {
      drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
      drawText(ctx, m.name, VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else {
      drawText(ctx, "ONDA " + director.waveInMap + "/" + m.waves.length, VIEW_W / 2, 10, { font: "big", scale: 1, color: "#ff4d5a", align: "center" });
      const wDef2 = waveDef();
      drawText(ctx, wDef2 && wDef2.title ? wDef2.title : m.name, VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    }
  } else {
    drawText(ctx, run.status === "won" || (run.payout && run.payout.winBonus > 0) ? "VITÓRIA!" : "A COLÔNIA CAIU",
      VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
  }

  // botão invocar onda — desliza sob o contador na calmaria; se o cartão do
  // tutorial estiver aberto, desce para logo abaixo dele (sem sobreposição)
  if (live && director.phase === "calm") {
    const by = hudTopSlot();
    if (button(ctx, { x: VIEW_W / 2 - cw / 2, y: by, w: cw, h: 26, label: "▶ INVOCAR (G)  +ESS", id: "skip", accent: "#c77dff" })) {
      skipPeace();
    }
  }

  // ============ RODAPÉ: FORMIGAS (recolhido) + FORMIGUEIRO ============
  // À esquerda, um botão abre a fileira das 9 classes de formigas (tecla Q) —
  // antes os nove cartões ficavam fixos na tela. À direita, no canto, fica o
  // botão que entra no formigueiro (a cena viva, tecla B).
  shopTooltip = null;
  const footY = VIEW_H - 100;
  const shopSprite = rotFrame("worker", Math.PI / 2);
  const rShop = iconButton(ctx, { x: 10, y: footY, w: 104, h: 88, id: "shopToggle",
    frame: shopOpen ? "#ffd479" : "#37e6c8", selected: shopOpen });
  ctx.drawImage(shopSprite, 10 + 52 - shopSprite.width * 0.5 / 2, footY + 4,
    shopSprite.width * 0.5, shopSprite.height * 0.5);
  drawText(ctx, "FORMIGAS", 10 + 52, footY + 50, { color: PAL.text, align: "center" });
  drawText(ctx, shopOpen ? "FECHAR (Q)" : "ABRIR (Q)", 10 + 52, footY + 66,
    { color: shopOpen ? "#ffd479" : "#37e6c8", align: "center" });
  if (live && rShop.clicked) { shopOpen = !shopOpen; }

  if (shopOpen) {
    const x0 = 10 + 104 + 6;
    for (let i = 0; i < SHOP.length; i++) {
      const sp = SHOP[i];
      const x = x0 + i * SHOP_PITCH;
      const cost = unitCost(sp.type);
      const canBuy = run.food >= cost && popUsed() < popCapTotal() && unitLimitLeft(sp.type);
      const r = iconButton(ctx, { x, y: footY, w: SHOP_W, h: 88, id: "shop" + sp.type, disabled: !canBuy, frame: sp.accent });
      const frame = rotFrame(UNITS[sp.type].sprite, Math.PI / 2);
      const sc2 = sp.iconScale !== undefined ? sp.iconScale
        : sp.type === "worker" || sp.type === "scout" || sp.type === "gatherer" ? 0.5 : 0.42;
      ctx.globalAlpha = canBuy ? 1 : 0.35;
      ctx.drawImage(frame, x + SHOP_W / 2 - frame.width * sc2 / 2, footY + 6, frame.width * sc2, frame.height * sc2);
      ctx.globalAlpha = 1;
      drawText(ctx, sp.label, x + SHOP_W / 2, footY + 50, { color: canBuy ? PAL.text : "#5a4f78", align: "center" });
      if (IMG.i_food) { ctx.globalAlpha = canBuy ? 1 : 0.5; ctx.drawImage(IMG.i_food, x + 4, footY + 66, 13, 13); ctx.globalAlpha = 1; }
      drawText(ctx, cost, x + 20, footY + 68, { color: canBuy ? "#ffd479" : "#a32e46" });
      drawText(ctx, String(i + 1), x + SHOP_W - 7, footY + 66, { color: PAL.textDim, align: "center" });
      if (r.hot) shopTooltip = sp;
      if (live && r.clicked) {
        const res = buyUnit(sp.type);
        if (!res.ok) {
          const wp = screenToWorld(x + SHOP_W / 2, footY - 14);
          floatText(wp.x, wp.y, res.why, { color: "#ff4d5a", life: 1 });
        }
      }
    }
  }

  if (shopTooltip) {
    const tipLines = wrapText(UNITS[shopTooltip.type].tip, 248, {});
    const th = 26 + tipLines.length * 16 + 8;
    panel(ctx, 10, footY - 12 - th, 268, th);
    drawText(ctx, UNITS[shopTooltip.type].name, 20, footY - 12 - th + 10, { color: "#ffd479" });
    tipLines.forEach((L, li) => drawText(ctx, L, 20, footY - 12 - th + 28 + li * 16, { color: PAL.text }));
  }

  // ---- FORMIGUEIRO: canto inferior-direito ----
  const nw = 132, nx2 = VIEW_W - 10 - nw;
  const rNest = iconButton(ctx, { x: nx2, y: footY, w: nw, h: 88, id: "nestBtn", frame: "#ffd479" });
  const nestImg = IMG.nest || IMG.i_essence;
  if (nestImg) ctx.drawImage(nestImg, nx2 + nw / 2 - 20, footY + 6, 40, 40);
  // formiguinhas entrando na boca do formigueiro (chama a atenção)
  {
    const t = G.time * 2.2;
    for (let i = 0; i < 3; i++) {
      const ph = (t + i * 0.33) % 1;
      const ax = nx2 + nw / 2 - 26 + ph * 52;
      const ay = footY + 44 - Math.sin(ph * Math.PI) * 7;
      ctx.fillStyle = "#ffd479";
      ctx.fillRect(ax, ay, 3, 2);
    }
  }
  drawText(ctx, "FORMIGUEIRO", nx2 + nw / 2, footY + 50, { color: PAL.text, align: "center" });
  drawText(ctx, "ENTRAR (B)", nx2 + nw / 2, footY + 66, { color: "#ffd479", align: "center" });
  if (live && rNest.clicked) {
    openNest(run);
    return;
  }

  // minimapa (canto SUPERIOR-direito)
  drawMinimap();

  // barra do chefão (sob o contador central)
  if (boss && !boss.dead && run.status === "running" && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) {
    const bw = 420, by = hudTopSlot();
    panel(ctx, VIEW_W / 2 - bw / 2 - 8, by, bw + 16, 42);
    drawText(ctx, boss.def.name, VIEW_W / 2, by + 6, { font: "small", scale: 1, color: "#ff4d5a", align: "center" });
    bar(ctx, VIEW_W / 2 - bw / 2, by + 24, bw, 12, boss.hp / boss.maxHp, { c1: "#ff7a6a", c2: "#a32e46", segments: 8 });
  }

  // contagem de selecionadas
  const sc = selectedCount();
  if (sc > 0 && !run.draft) {
    const lbl = sc + " SELECIONADAS";
    const tw = textWidth(lbl, {});
    drawText(ctx, lbl,
      clamp(mouse.x + 16, 6, VIEW_W - tw - 6),
      clamp(mouse.y + 10, 6, VIEW_H - 22),
      { color: "#37e6c8" });
  }

  // caixa de seleção (botão direito)
  if (sel.active && sel.moved) {
    const a = worldToScreen(sel.x0, sel.y0), b = worldToScreen(sel.x1, sel.y1);
    ctx.strokeStyle = "rgba(55,230,200,0.9)";
    ctx.fillStyle = "rgba(55,230,200,0.12)";
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
  }

  // dica de controles rodapé central
  if (run.elapsed < 14 && run.status === "running") {
    drawText(ctx, "ESQ: CÂMERA/ORDEM  •  DIR: SELECIONAR  •  Q: FORMIGAS  •  B: FORMIGUEIRO  •  ESC: PAUSA",
      VIEW_W / 2, VIEW_H - 118, { color: PAL.textDim, align: "center", alpha: clamp(14 - run.elapsed, 0, 4) / 4 });
  }
}

let hudExpanded = false;

function drawMinimap() {
  const run = G.run;
  const mw = MINI.w, mh = MINI.h;
  const mx = VIEW_W - mw - 10, my = 10;      // canto superior-direito
  uiButtons().push({ x: mx - 3, y: my - 3, w: mw + 6, h: mh + 6, id: "minimap" });
  ctx.fillStyle = "rgba(10,8,16,0.75)";
  ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
  if (world.mini) ctx.drawImage(world.mini, mx, my);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);

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
  // formigueiro pulsante
  const A = world.anthill;
  const pulse = 2 + Math.sin(G.time * 4) * 0.8;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 1.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 3, 0, TAU); ctx.stroke();
  // retângulo da câmera
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.65)";
  ctx.strokeRect(mx + (cam.x - vx / 2) * sx, my + (cam.y - vy / 2) * sy, vx * sx, vy * sy);
  // névoa de guerra por cima do minimapa
  fogDrawMini(ctx, mx, my, mw, mh);

  // clique no minimapa: pula a câmera (só com o jogo em andamento)
  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;
  if (live && mouse.justDown && pointInRect(mouse.x, mouse.y, mx, my, mw, mh)) {
    cam.x = (mouse.x - mx) / sx;
    cam.y = (mouse.y - my) / sy;
    SFX.uiClick();
  }
}

// ----------------------------------------------------------------- banner ---
function drawBanner(b) {
  // Anúncio de batalha: painel chanfrado com filete de acento + letterbox
  // cinematográfico que abre e fecha. A curva é suave (ease-out na entrada,
  // ease-in na saída) para a leitura não "piscar" no meio da briga.
  const total = b.total || (b.kind === "boss" ? 4.2 : 3.4);
  const IN = 0.45, OUT = 0.55;
  const raw = clamp(Math.min((total - b.t) / IN, b.t / OUT), 0, 1);
  const a = 1 - Math.pow(1 - raw, 3);

  // clarão subliminar: só no comecinho da entrada, na cor do anúncio — o
  // quadro "pisca" por um instante e a onda parece entrar com impacto
  const flash = b.t < IN ? Math.max(0, 1 - (IN - b.t) / (IN * 0.22)) : 0;
  if (flash > 0) {
    const col = b.kind === "boss" ? "255,77,90" : b.kind === "clear" ? "127,214,160" : "255,212,121";
    ctx.fillStyle = `rgba(${col},${(0.16 * flash).toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // ---- letterbox (barras que abrem/fecham): profundidade cinematográfica
  const barH = 20 * a;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#08050e";
  ctx.fillRect(0, 0, VIEW_W, barH);
  ctx.fillRect(0, VIEW_H - barH, VIEW_W, barH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = b.kind === "boss" ? "rgba(255,77,90,0.85)" : "rgba(55,230,200,0.8)";
  ctx.fillRect(0, barH, VIEW_W, 1);
  ctx.fillRect(0, VIEW_H - barH - 1, VIEW_W, 1);

  // ---- painel do anúncio
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  const y = (tut ? tut.y + tut.h + 34 : 116) - (1 - a) * 16;
  const lines = b.sub ? wrapText(b.sub, 560, {}) : [];
  const h = 78 + lines.length * 18;   // título (big x2 = 60px) + folga + sub
  const w = 660;
  const x = VIEW_W / 2 - w / 2;
  const accent = b.kind === "boss" ? "#ff4d5a" : b.kind === "clear" ? "#7fd6a0" : "#ffd479";

  ctx.globalAlpha = a;
  panel(ctx, x, y - 10, w, h, { border: accent, topAccent: accent, r: 8 });
  // faixas diagonais discretas (textura de HUD)
  ctx.globalAlpha = a * 0.16;
  ctx.fillStyle = accent;
  for (let i = -1; i < w / 26 + 1; i++) ctx.fillRect(x + i * 26, y - 10, 9, h);
  ctx.globalAlpha = a;
  drawText(ctx, b.title, VIEW_W / 2, y + 4, { font: "big", scale: 2, color: accent, align: "center" });
  lines.forEach((L, li) => drawText(ctx, L, VIEW_W / 2, y + 68 + li * 18, { color: PAL.text, align: "center" }));
  if (b.kind === "boss") {
    // aviso pulsante embaixo do painel
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(G.time * 8));
    drawText(ctx, "CUIDADO", VIEW_W / 2, y + h - 24, { color: `rgba(255,77,90,${0.5 + 0.5 * pulse})`, align: "center" });
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ draft ---
function drawDraft(draft) {
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 66, { font: "big", scale: 2, color: "#c77dff", align: "center" });
  drawText(ctx, "A colônia evolui. Escolha 1 de 3 — vale só nesta expedição.", VIEW_W / 2, 112, { color: PAL.textDim, align: "center" });

  const cw = 210, ch = 282, gap = 26;
  const x0 = VIEW_W / 2 - (cw * 3 + gap * 2) / 2;
  const y = 156;
  for (let i = 0; i < draft.options.length; i++) {
    const mm = draft.options[i];
    const x = x0 + i * (cw + gap);
    const hot = pointInRect(mouse.x, mouse.y, x, y, cw, ch);
    const lift = hot ? 8 : 0;
    const rare = RARITY[mm.rar];
    panel(ctx, x, y - lift, cw, ch, { border: rare.color });
    ctx.fillStyle = rare.color;
    ctx.fillRect(x, y - lift, cw, 4);
    // ícone grande
    const icon = IMG["i_" + mm.icon];
    if (icon) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + cw / 2 - 32, y + 22 - lift, 64, 64);
      ctx.strokeStyle = rare.color; ctx.lineWidth = 2;
      ctx.strokeRect(x + cw / 2 - 32, y + 22 - lift, 64, 64);
      ctx.drawImage(icon, x + cw / 2 - 26, y + 28 - lift, 52, 52);
    }
    drawText(ctx, rare.name, x + cw / 2, y + 106 - lift, { color: rare.color, align: "center" });
    drawText(ctx, mm.name, x + cw / 2, y + 128 - lift, { font: "big", scale: 1, color: "#efe9ff", align: "center" });
    const lines = wrapText(mm.desc, cw - 28, {});
    lines.slice(0, 4).forEach((L, li) => drawText(ctx, L, x + cw / 2, y + 166 + li * 19 - lift, { color: PAL.text, align: "center" }));
    drawText(ctx, "[ " + (i + 1) + " ]", x + cw / 2, y + ch - 30 - lift, { color: PAL.textDim, align: "center" });

    if (hot && mouse.justDown && !paused) { pickDraft(i); return; }
  }
}

// -------------------------------------------------------------- transição ---
function drawTransition(run) {
  ctx.fillStyle = "rgba(10,8,16,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const nextIdx = director.mapIdx + 1;
  const next = nextIdx < MAPS.length ? MAPS[nextIdx] : null;

  drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 120, { font: "big", scale: 3, color: "#ffd479", align: "center" });
  drawText(ctx, "O chefão caiu. A colônia respira — e a Rainha se recupera.",
    VIEW_W / 2, 196, { color: PAL.text, align: "center" });
  if (next) {
    drawText(ctx, "PRÓXIMO DESTINO:", VIEW_W / 2, 250, { color: PAL.textDim, align: "center" });
    drawText(ctx, "MAPA " + (nextIdx + 1) + "/" + MAPS.length + " — " + next.name, VIEW_W / 2, 282, { font: "big", scale: 1, color: "#37e6c8", align: "center" });
    drawText(ctx, next.sub, VIEW_W / 2, 312, { color: PAL.textDim, align: "center" });
  }

  if (button(ctx, { x: VIEW_W / 2 - 150, y: 368, w: 300, h: 48, label: "AVANÇAR A EXPEDIÇÃO", id: "goNext", accent: "#37e6c8" })) {
    advanceMap();
    return;
  }
  if (pressed.Enter || pressed.Space) advanceMap();
}

// ------------------------------------------------------------------ pausa ---
function drawPause() {
  ctx.fillStyle = "rgba(10,8,16,0.75)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 170, 96, 340, 352);
  drawText(ctx, "PAUSA", VIEW_W / 2, 122, { font: "big", scale: 2, color: "#ffd479", align: "center" });

  if (button(ctx, { x: VIEW_W / 2 - 130, y: 188, w: 260, h: 42, label: "CONTINUAR", id: "resume", accent: "#37e6c8" })) {
    paused = false; return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 240, w: 260, h: 42, label: "COMO JOGAR", id: "pauseHelp", accent: "#6db7ff" })) {
    paused = false;
    gotoHelp("RUN");
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 292, w: 260, h: 42, label: "REINICIAR EXPEDIÇÃO", id: "restart", accent: "#ffb347" })) {
    paused = false;
    settleAbandon();
    newRun();
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 344, w: 260, h: 42, label: "SAIR PARA O MENU", id: "quit", accent: "#ff4d5a" })) {
    paused = false;
    settleAbandon();
    gotoTitle({ durOut: 0.3, durIn: 0.5 });
    return;
  }
  drawText(ctx, "ESC: VOLTAR AO JOGO", VIEW_W / 2, 416, { color: PAL.textDim, align: "center" });
}

function settleAbandon() {
  const run = G.run;
  run.status = "lost";
  settleRun();
  run.status = "ended";
}

let helpReturn = "TITLE";

// ------------------------------------------------------------------- fim ----
// Painel de resultados: cabe TUDO dentro do painel (500x436) mesmo com a run
// mais longa. Antes a lista era de uma coluna só e, com muitas mutações, os
// botões "NOVA EXPEDIÇÃO"/"MENU PRINCIPAL" saíam do canvas (y=535 num canvas
// de 540) e ficavam sob a loja do HUD.
function drawEnd(run) {
  ctx.fillStyle = "rgba(10,8,16,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const p = run.payout;
  if (!p) return;
  const won = p.winBonus > 0;
  const PX = VIEW_W / 2 - 250, PY = 54, PW = 500, PH = 436;
  panel(ctx, PX, PY, PW, PH, { border: won ? "#ffd479" : "#ff4d5a" });

  drawText(ctx, won ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU",
    VIEW_W / 2, PY + 22, { font: "big", scale: 2, color: won ? "#ffd479" : "#ff4d5a", align: "center" });
  const subLock = won
    ? "O DEVASTADOR caiu no Pico Congelado. O formigueiro é eterno."
    : "A rainha tombou. Mas a essência alimenta a próxima geração.";
  const subLines = wrapText(subLock, PW - 60, {});
  subLines.forEach((L, li) =>
    drawText(ctx, L, VIEW_W / 2, PY + 78 + li * 18, { color: PAL.text, align: "center" }));

  // ---- números em DUAS colunas. A faixa de baixo é RESERVADA para a linha do
  // total e para os botões: com muitas mutações a lista antiga empurrava
  // "NOVA EXPEDIÇÃO" para fora do canvas (y=535 num canvas de 540).
  const rows = [
    ["ONDAS REPELIDAS", String(run.wave), PAL.text],
    ["MAPAS LIMPOS", run.mapsCleared + "/" + MAPS.length, PAL.text],
    ["INIMIGOS ABATIDOS", String(run.kills), PAL.text],
    ["NÍVEL DA COLÔNIA", String(run.level), PAL.text],
    ["MUTAÇÕES ADOTADAS", String(run.mutationLog.length), PAL.text],
    ["RELÍQUIA (10%)", String(p.relic), "#c77dff"],
    ["BÔNUS DE ONDAS", "+" + p.waveBonus, "#c77dff"],
    ["BÔNUS DE MAPAS", "+" + p.mapBonus, "#c77dff"],
    ["BÔNUS DE ABATES", "+" + p.killBonus, "#c77dff"],
  ];
  if (p.winBonus) rows.push(["VITÓRIA ÉPICA", "+" + p.winBonus, "#c77dff"]);
  if (p.mult > 1) rows.push(["ALMA DA COLÔNIA", "x" + p.mult.toFixed(2), "#c77dff"]);

  const btnTop = PY + PH - 100;                       // topo da faixa dos botões
  const totalY = btnTop - 72;                         // separador + TOTAL (2x)
  const iconsH = run.mutationLog.length ? 26 : 0;
  const rowsBottom = totalY - 8 - iconsH - 14;        // última linha ainda com tinta

  const y0 = PY + 78 + subLines.length * 18 + 14;
  const half = Math.ceil(rows.length / 2);
  const maxRows = Math.max(half, rows.length - half);
  let step = 21;
  if (y0 + (maxRows - 1) * step > rowsBottom) {
    step = Math.max(15, Math.floor((rowsBottom - y0) / Math.max(1, maxRows - 1)));
  }
  const colX = [PX + 24, PX + 258], colW = 212;
  rows.forEach(([label, val, col], i) => {
    const cx = colX[i < half ? 0 : 1];
    const ry = y0 + (i % half) * step;
    drawText(ctx, label, cx, ry, { color: PAL.textDim });
    drawText(ctx, val, cx + colW, ry, { color: col, align: "right" });
  });
  let y = y0 + (maxRows - 1) * step + 22;

  // ---- ícones das mutações: uma linha só, com "+N" no fim ----
  if (run.mutationLog.length) {
    const maxIcons = 14;
    let ix = PX + 24;
    for (const mm of run.mutationLog.slice(0, maxIcons)) {
      const icon = IMG["i_" + mm.icon];
      if (icon) ctx.drawImage(icon, ix, y, 20, 20);
      ix += 26;
    }
    if (run.mutationLog.length > maxIcons) {
      drawText(ctx, "+" + (run.mutationLog.length - maxIcons), ix, y + 4, { color: PAL.textDim });
    }
    y += iconsH;
  }

  // ---- separador + total, ancorados logo acima dos botões ----
  ctx.fillStyle = "#3a3054";
  ctx.fillRect(PX + 24, totalY, PW - 48, 2);
  drawText(ctx, "TOTAL DE GELÉIA REAL", PX + 24, totalY + 22, { font: "big", scale: 1, color: "#c77dff" });
  drawText(ctx, "+" + p.total, PX + PW - 24, totalY + 14, { font: "big", scale: 2, color: "#ffd479", align: "right" });

  // ---- botões: ancorados à faixa reservada (nunca saem do painel) ----
  const by = btnTop;
  if (button(ctx, { x: VIEW_W / 2 - 230, y: by, w: 220, h: 40, label: "NOVA EXPEDIÇÃO", id: "again", accent: "#37e6c8" })) {
    paused = false;
    newRun();
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 + 10, y: by, w: 220, h: 40, label: "ÁRVORE DA EVOLUÇÃO", id: "goTree", accent: "#c77dff" })) {
    gotoTree("TITLE");
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 110, y: by + 48, w: 220, h: 32, label: "MENU PRINCIPAL", id: "menu" })) {
    gotoTitle({ durOut: 0.24, durIn: 0.4 });
    return;
  }
}

// ---------------------------------------------------------------- exports ---
export function gameHelpReturn() { return helpReturn; }
export function setPaused(v) { paused = v; }
export function boot() {
  initInput(canvas);
}
