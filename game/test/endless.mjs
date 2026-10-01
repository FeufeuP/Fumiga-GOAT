// Teste do modo SOBREVIVÊNCIA (endless): o chefão é o marco do ciclo.
// Uso: node test/endless.mjs
//
// Regressão que motivou este teste: após derrotar o chefão no modo infinito,
// director.phase ficava preso em "mapClear" para sempre — som de vitória em
// loop, run.transition sempre true (controles bloqueados) e sem diálogo de
// avanço (o guard do render excluía endless). O jogo travava de verdade.
// Este teste atravessa dois ciclos completos pelo fluxo real do game.js.

const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 0, height: 0 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "setLineDash") return () => {};
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return (...a) => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
const fakeCanvas = { width: 960, height: 540, style: {}, getContext: makeCtx, addEventListener() {} };
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return fakeCanvas; },
  addEventListener() {}, fonts: { load: () => Promise.resolve() },
  createElementNS() { return { getContext: makeCtx }; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
process.on("unhandledRejection", (e) => { console.error("UNHANDLED-REJ", e && e.stack || e); process.exit(9); });
process.on("uncaughtException", (e) => { console.error("UNCAUGHT", e && e.stack || e); process.exit(9); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = new URL("../js", import.meta.url).pathname;
await import(BASE + "/main.js");
await wait(2500);
const { mouse, pressed } = await import(BASE + "/input.js");
const { G } = await import(BASE + "/state.js");
const waves = await import(BASE + "/waves.js");
const en = await import(BASE + "/enemies.js");
const units = await import(BASE + "/units.js");
const { SFX } = await import(BASE + "/audio.js");
const { world } = await import(BASE + "/world.js");
const { MAPS } = await import(BASE + "/config.js");

const problems = [];
const expect = (cond, msg) => {
  console.log((cond ? "ok  " : "ERRO") + "  " + msg);
  if (!cond) problems.push(msg);
};

async function click(x, y) {
  mouse.x = x; mouse.y = y; mouse.down = mouse.justDown = true;
  await wait(60);
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40);
  mouse.justUp = false;
  await wait(600);
}

// conta o fanfarra de vitória para provar que não entra em loop
let winCount = 0;
SFX.win = () => { winCount++; };

// ---- boot -> título -> modos -> MODO TESTE (card 2) -------------------------
expect(G.screen === "PRETITLE", "boot em PRETITLE");
await click(480, 270);
await click(200, 275); // botão JOGAR do título
expect(G.screen === "MODE", "chegou na tela de modos");
const { __debug } = await import(BASE + "/game.js");
expect(JSON.stringify(__debug.modes()) === JSON.stringify(["campanha", "teste"]),
  "apenas 2 modos no jogo: campanha e teste (" + __debug.modes().join(", ") + ")");
await click(680, 286); // card MODO TESTE (x 500..860, y 116..456)
expect(G.screen === "RUN", "entrou no RUN via card MODO TESTE");
expect(G.run && G.run.testMode === true && G.run.endless === true, "run.testMode = true e run.endless = true");
expect(G.run.testPowers && G.run.testPowers.infMoney && G.run.testPowers.infAnts && G.run.testPowers.infWaves,
  "poderes do Modo Teste (Dinheiro ∞, Formigas ∞, Ondas ∞) ligados por padrão");

// ESC pula a introdução sem pausar o gameplay que vem depois.
const { isCutsceneActive } = await import(BASE + "/cutscenes.js");
expect(isCutsceneActive(), "introdução presente no primeiro início");
pressed.Escape = true;
await wait(100);
pressed.Escape = false;
expect(!isCutsceneActive(), "ESC libera o gameplay da introdução");

// Testa compra instantânea sem limite de população e múltiplas Dinoponeras no Modo Teste
const g1 = units.buyUnit("giant");
const g2 = units.buyUnit("giant");
expect(g1.ok && g2.ok && units.allies.filter(a => a.type === "giant" && !a.dead).length >= 2,
  "Formigas ∞: múltiplas Dinoponeras nascem instantaneamente sem ovo e sem custo");
expect(G.run.food >= 9999, "Dinheiro ∞ mantém comida >= 9999");

// exército para o chefão cair rápido
for (let i = 0; i < 8; i++) units.spawnAnt("soldier", world.anthill.x + (i - 4) * 30, world.anthill.y + 60);
units.spawnAnt("giant", world.anthill.x, world.anthill.y + 80);

const W = MAPS[0].waves;

/** Pula para a onda do chefão, derruba chefão + lacaios e espera o fim da onda. */
async function killBossCycle() {
  waves.director.phase = "calm";
  waves.director.timer = 0.01;
  waves.director.waveInMap = W.length - 1;
  let bossSeen = false;
  for (let i = 0; i < 300 && !bossSeen; i++) { await wait(50); bossSeen = !!en.boss && !en.boss.dead; }
  expect(bossSeen, "chefão do ciclo nasceu (" + MAPS[0].boss + ")");
  // dano repetido a cada tick: o chefão tem fases de invulnerabilidade
  // (pulos do Tamborilador) e um golpe único pode ser absorvido
  for (let i = 0; i < 900; i++) {
    await wait(50);
    if (en.boss && !en.boss.dead && en.boss.takeDamage) en.boss.takeDamage(999999, "ally");
    for (const f of en.foes) if (!f.dead && f.takeDamage) f.takeDamage(999999, "ally");
    if (waves.director.phase !== "wave") break; // marco de ciclo: volta para calm
  }
}

// ================================ CICLO 1 ====================================
const essBefore = G.run.essencePool;
const killsBefore = G.run.kills;
await killBossCycle();

expect(waves.director.phase === "calm", "após o chefão a phase volta a CALM (não trava em mapClear)");
expect(waves.director.cycle === 1, "ciclo 1 registrado (director.cycle = 1)");
expect(waves.director.waveInMap === 0, "contagem de ondas reiniciada (waveInMap = 0)");
expect(G.run.transition === false, "controles liberados (run.transition = false)");
expect(G.run.mapsCleared === 1, "mapsCleared contou 1 (sem dupla contagem killBoss+endWave)");
expect(G.run.kills > killsBefore, "abate do chefão computado");
expect(G.run.essencePool > essBefore, "bônus de essência do ciclo creditado");
expect(winCount === 1, "fanfarra de vitória tocou 1x (não fica em loop)");

// draft do marco de ciclo abre sozinho na calmaria
let draftSeen = false;
for (let i = 0; i < 100 && !draftSeen; i++) { await wait(50); draftSeen = !!G.run.draft; }
expect(draftSeen, "draft de recompensa do ciclo aberto");
if (draftSeen) { pressed.Digit1 = true; await wait(150); pressed.Digit1 = false; }
expect(!G.run.draft, "draft escolhido (mutações: " + G.run.mutations.size + ")");

// próxima onda do novo ciclo: orçamento escalado em +30%
waves.director.timer = 0.3;
let wave2 = false;
for (let i = 0; i < 200 && !wave2; i++) {
  await wait(50);
  wave2 = waves.director.phase === "wave" && waves.director.waveInMap >= 1;
}
expect(wave2, "novo ciclo começou (onda 1 reiniciou sem exceção)");
expect(waves.director.waveInMap === 1, "waveInMap reiniciou do 1");
const expectedBudget = Math.round(W[0].budget * 1.3);
expect(waves.director.budgetMax === expectedBudget,
  "orçamento do ciclo 2 escalado: " + waves.director.budgetMax + " (base " + W[0].budget + " x1.3)");
expect(G.run.banner && /CICLO 2/.test(G.run.banner.title), "banner da onda anuncia CICLO 2 (o ciclo em andamento)");

// ================================ CICLO 2 ====================================
const essBefore2 = G.run.essencePool;
await killBossCycle();
expect(waves.director.cycle === 2, "ciclo 2 registrado");
expect(waves.director.phase === "calm", "ciclo 2 também volta a CALM");
expect(winCount === 2, "fanfarra 2x no total (1 por ciclo)");

// terceira onda do ciclo 2: orçamento x1.6
let draft2 = false;
for (let i = 0; i < 100 && !draft2; i++) { await wait(50); draft2 = !!G.run.draft; }
if (draft2) { pressed.Digit1 = true; await wait(150); pressed.Digit1 = false; }
waves.director.timer = 0.3;
let wave3 = false;
for (let i = 0; i < 200 && !wave3; i++) {
  await wait(50);
  wave3 = waves.director.phase === "wave" && waves.director.waveInMap >= 1;
}
expect(wave3, "ciclo 2 também reinicia as ondas");
const expectedBudget2 = Math.round(W[0].budget * 1.6);
expect(waves.director.budgetMax === expectedBudget2,
  "orçamento do ciclo 3 escalado: " + waves.director.budgetMax + " (base x1.6)");
expect(G.run.essencePool > essBefore2, "bônus do ciclo 2 creditado");

// Testa o botão novo de passar de mapa (PRÓXIMO MAPA ▶) e o seletor direto (M1..M6)
const { uiButtons } = await import(BASE + "/ui.js");
const nextBtn = uiButtons().find(b => b.id === "testNextMap");
expect(!!nextBtn, "botão PRÓXIMO MAPA presente no HUD do Modo Teste");
await click(nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2);
expect(waves.director.mapIdx === 1 && G.run.mapIdx === 1, "botão PRÓXIMO MAPA avançou para o Mapa 2 (Floresta)");

const map4Btn = uiButtons().find(b => b.id === "testMap4");
expect(!!map4Btn, "botão M4 do seletor direto de biomas presente no HUD");
await click(map4Btn.x + map4Btn.w / 2, map4Btn.y + map4Btn.h / 2);
expect(waves.director.mapIdx === 3 && G.run.mapIdx === 3, "seletor direto M4 pulou imediatamente para o Mapa 4 (Deserto)");

// Testa o botão novo de PULAR ONDA (testSkipWave): conclui a onda atual com recompensas e já inicia a próxima
const skipWaveBtn = uiButtons().find(b => b.id === "testSkipWave");
expect(!!skipWaveBtn, "botão PULAR ONDA presente no HUD do Modo Teste");
const waveBeforeSkip = G.run.wave;
const essBeforeSkip = G.run.essencePool;
await click(skipWaveBtn.x + skipWaveBtn.w / 2, skipWaveBtn.y + skipWaveBtn.h / 2);
expect(G.run.wave >= waveBeforeSkip + 2, "botão PULAR ONDA concluiu a onda 1 e já iniciou a onda 2 (run.wave=" + G.run.wave + ")");
expect(G.run.essencePool > essBeforeSkip, "botão PULAR ONDA concedeu a recompensa de essência da onda concluída");
expect(waves.director.phase === "wave" && waves.director.waveInMap === 2, "próxima onda (2) já em andamento após PULAR ONDA");

// 3s de jogo corrido: nenhuma exceção (o handler de uncaught mata o processo)
await wait(3000);
expect(G.run.status === "running", "run segue viva e jogável ao fim do teste");

console.log("");
if (problems.length) {
  console.log("TESTE DO MODO TESTE FALHOU: " + problems.length + " problema(s)");
  process.exit(1);
}
console.log("===========================================================");
console.log("MODO TESTE OK — poderes ∞, ciclos infinitos e botão de passar mapa funcionando");
process.exit(0);
