// Regressões da auditoria 2026-10-01: regras reais do jogo, saves e loader.
// Não reimplementa o fim da partida: chama update()/settleRun()/takeDamage().
import assert from 'node:assert/strict';
import { installFontFaceMock } from './lib/font-mock.mjs';
const gradient = { addColorStop() {} };
function context() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, key) {
      if (key in t) return t[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient;
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(16) });
      return () => {};
    },
    set(t, key, value) { t[key] = value; return true; },
  });
}
const canvas = { width: 960, height: 540, style: {}, getContext: context, addEventListener() {} };
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.addEventListener = () => {};
globalThis.document = {
  getElementById: () => canvas,
  createElement: () => ({ width: 0, height: 0, style: {}, getContext: context }),
  addEventListener() {}, fonts: { load: () => Promise.resolve() },
};
installFontFaceMock();
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
let failImage = false;
globalThis.Image = class {
  width = 64; height = 64;
  set src(value) { queueMicrotask(() => (failImage ? this.onerror : this.onload)?.()); }
};
const S = await import('../js/state.js');
const { G } = S;
const initialSave = structuredClone(G.save);
const U = await import('../js/units.js');
const C = await import('../js/config.js');
const E = await import('../js/enemies.js');
const game = await import('../js/game.js');
const { hasTransition } = await import('../js/render.js');
const { getCutsceneDefs } = await import('../js/cutscenes.js');
const L = await import('../js/loading_screen.js');
const { pressed, mouse, endTick } = await import('../js/input.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

// --- Saves antigos e entradas corrompidas: nenhum preço undefined/NaN ---
const key = 'fumiga_goat_save_v1';
store.set(key, JSON.stringify({ essence: 1000, nodes: { raiz: 1, t_col: -1, g_dan: 999, futuro: 2 }, best: { kills: -3, wins: 'x' } }));
assert.equal(S.loadSave(), true);
assert.equal(S.metaLevel('t_col'), 0);
assert.equal(S.metaLevel('g_dan'), S.metaNode('g_dan').cost.length);
assert.equal(G.save.nodes.futuro, 2);
const chk = S.metaCanBuy('t_col');
assert.equal(chk.ok, true); assert.ok(Number.isSafeInteger(chk.price));
assert.equal(S.metaBuy('t_col'), true);
assert.equal(G.save.essence, 1000 - chk.price);
assert.ok(Number.isFinite(JSON.parse(store.get(key)).essence));
assert.equal(JSON.parse(store.get(key)).schemaVersion, 1);
for (const nodes of [[], null, 'x', { t_col: '2', raiz: null }, { t_col: 1.5 }, { t_col: -100000 }]) {
  store.set(key, JSON.stringify({ essence: 3_000_000_000, nodes }));
  S.loadSave();
  assert.equal(G.save.essence, 3_000_000_000, 'não usar coerção signed 32-bit para o saldo');
  assert.ok(Number.isSafeInteger(S.metaLevel('t_col')) && S.metaLevel('t_col') >= 0);
}
store.set(key, '{"essence":100,"nodes":{"__proto__":{"polluted":true},"raiz":1},"accessibility":{"invincible":"sim"},"settings":{"musicVol":-5,"gameSpeed":99},"best":null}');
G.save = structuredClone(initialSave); S.loadSave();
assert.equal({}.polluted, undefined); assert.equal(G.save.accessibility.invincible, false);
assert.equal(G.save.settings.musicVol, 0); assert.equal(G.save.settings.gameSpeed, 2);
assert.equal(G.save.best.kills, 0);
G.save.essence = NaN;
assert.equal(S.metaCanBuy('t_col').ok, false); assert.equal(S.metaBuy('t_col'), false); assert.equal(S.persistSave(), false);
G.save.essence = 100;
store.set(key, '{JSON quebrado');
assert.equal(S.loadSave(), false); assert.equal(G.save.essence, 100);
const setItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error('quota'); };
assert.equal(S.persistSave(), false);
localStorage.setItem = setItem;
console.log('ok saves: níveis, tipos, limites, chaves antigas, saldo finito e quota');

function start(baseOpen = false, map = 0) {
  G.save = structuredClone(initialSave);
  G.save.tutorial = 1;
  G.save.cutscenes = Object.fromEntries(Object.keys(getCutsceneDefs()).map(id => [id, true]));
  G.timeScale = 1; G.slowMo = 0;
  game.__debug.startRun({ map, seed: 42 });
  for (let i = 0; i < 30 && hasTransition(); i++) { game.update(.1); endTick(); }
  assert.equal(hasTransition(), false);
  G.run.food = 0;
  if (baseOpen) game.__debug.openNest();
  assert.equal(G.run.baseOpen, baseOpen);
  return U.allies.queen;
}
function step(dt = .016) { game.update(dt); endTick(); }
for (const inside of [false, true]) {
  let q = start(inside);
  // Até com comida suficiente, o dano fatal não é apagado pela próxima cura.
  G.run.food = 1000;
  q.takeDamage(100000, 'foe'); step();
  assert.equal(G.run.status, 'lost'); assert.equal(q.dead, true); assert.equal(G.run.baseOpen, false);
  for (let i = 0; i < 25; i++) step(.1);
  assert.equal(G.run.status, 'ended'); assert.equal(G.run.payoutDone, true);

  q = start(inside); G.save.nodes.r_ren = 1;
  q.takeDamage(100000, 'foe'); step();
  assert.equal(G.run.status, 'running'); assert.equal(G.run.rebirthUsed, true);
  near(q.hp, q.maxHp * C.META_POWER.r_ren);
  assert.equal(G.run.baseOpen, inside);
  q.takeDamage(100000, 'foe'); step(); assert.equal(G.run.status, 'lost');

  q = start(inside); G.save.accessibility.invincible = true;
  q.takeDamage(100000, 'foe'); step();
  assert.equal(G.run.status, 'running'); assert.equal(q.dead, false); assert.ok(q.hp > 0);
  assert.equal(G.run.baseOpen, inside);

  q = start(inside, 5);
  E.spawnBoss(C.MAPS[5].boss, 1).takeDamage(1e9, 'ally');
  // O chefe confirma a derrota depois de sua animação cinematográfica real.
  for (let i = 0; i < 120 && G.run.status === 'running'; i++) step(.05);
  assert.equal(G.run.status, 'won', 'chefe final dentro/fora do ninho');
  assert.equal(G.run.baseOpen, false);
}
// Ataque do mundo real, ocorrido durante worldTick (não só antes do frame).
let q = start(true); q.hp = 1;
E.spawnEnemy('warrior', q.x, q.y, 1);
for (let i = 0; i < 100 && G.run.status === 'running'; i++) step(.05);
assert.equal(G.run.status, 'lost');
console.log('ok desfecho real: ninho/superfície, cura não ressuscita, Renascimento, assistência, chefe final e ataque');

q = start(); q.takeDamage(q.maxHp * .8, 'foe');
near(G.run.queenMinHp, .2); q.hp = q.maxHp;
G.run.status = 'won'; game.settleRun();
assert.equal(G.save.prophecies.p_rainha, undefined, 'curar depois não torna a vitória elegível');
q = start(); q.takeDamage(q.maxHp * .5, 'foe');
G.run.status = 'won'; game.settleRun();
assert.equal(G.save.prophecies.p_rainha, true, '50% exatos ainda são elegíveis');
q = start(); G.save.nodes.v_o7 = 1;
q.takeDamage(100000, 'foe');
assert.ok(q.hp > 0); assert.equal(G.run.queenMinHp, 0, 'resgate não apaga o vale letal');
G.run.status = 'won'; game.settleRun(); assert.equal(G.save.prophecies.p_rainha, undefined);
console.log('ok SANGUE FRIO: dano da Rainha real, cura, limiar e resgate');

await (await import('../js/font.js')).loadFonts();
async function loadingFrames(n = 200) {
  for (let i = 0; i < n; i++) {
    L.updateLoadingScreen(1 / 60); L.drawLoadingScreen(context(), i / 60);
    await Promise.resolve(); endTick();
  }
}
let calls = 0, finished = 0, lateProgress;
L.startLoadingScreen({ minDuration: .8, autoAdvance: true,
  task: report => { calls++; report(1); lateProgress = report; if (calls === 1) throw new Error('falha essencial'); },
  onFinish: () => finished++,
});
await loadingFrames();
assert.equal(calls, 1); assert.equal(finished, 0);
assert.ok(L.getLoadingError()); assert.equal(L.isLoadingReady(), false); assert.ok(L.getLoadingProgress() < 1);
assert.equal(L.dismissLoadingScreen(), false);
assert.equal(L.handleLoadingInput('pointer'), false);
assert.equal(L.retryLoadingScreen(), true);
lateProgress(1); // callback de tentativa antiga não escreve na nova tentativa
assert.equal(L.getLoadingProgress(), 0);
await loadingFrames(90);
assert.equal(calls, 2); assert.equal(L.isLoadingReady(), true); assert.equal(finished, 0);
assert.equal(L.dismissLoadingScreen(), true); assert.equal(finished, 1);
await loadingFrames(40); assert.equal(L.isLoadingActive(), false); assert.equal(finished, 1);

const savedEssence = G.save.essence;
L.startLoadingScreen({ task: () => { throw new Error('falha'); } });
await loadingFrames(30);
assert.equal(L.handleLoadingInput('key', 'Escape'), true);
assert.equal(L.isLoadingActive(), false); assert.equal(G.screen, 'TITLE'); assert.equal(G.run, null);
assert.equal(G.save.essence, savedEssence);

failImage = true;
L.startLoadingScreen({ biome: 'floresta', minDuration: .8, task: () => {} });
await loadingFrames(200);
assert.equal(L.getLoadingError(), null); assert.equal(L.isLoadingReady(), true, 'arte opcional tem fallback seguro');
L.dismissLoadingScreen(); await loadingFrames(40); failImage = false;
L.startLoadingScreen({ minDuration: .8, task: () => {}, onFinish: () => { throw new Error('falha ao concluir'); } });
await loadingFrames(200);
assert.equal(L.dismissLoadingScreen(), false); assert.ok(L.getLoadingError()); assert.equal(L.isLoadingReady(), false);
assert.equal(L.cancelLoadingScreen(), true);
console.log('ok loader: erro nunca é sucesso, retry, callback obsoleto, voltar, fallback opcional e falha no onFinish');
console.log('REGRESSÕES OK — saves, fim no ninho, SANGUE FRIO e falhas de carregamento');
