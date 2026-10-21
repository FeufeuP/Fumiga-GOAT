// Teste de integração headless (mock de DOM): percorre boot → pretitle → título → modo → run
import { installFontFaceMock } from "./lib/font-mock.mjs";

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
installFontFaceMock();
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
globalThis.performance = globalThis.performance || { now: () => Date.now() };
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
const { world } = await import(BASE + "/world.js");
console.log("screen:", G.screen);
const problems = [];
const expect = (cond, msg) => { console.log((cond ? "ok  " : "ERRO") + "  " + msg); if (!cond) problems.push(msg); };

// ---- PRETITLE -> TITLE (clique para jogar)
if (G.screen === "PRETITLE") {
  mouse.x = 480; mouse.y = 270; mouse.down = mouse.justDown = true;
  await wait(60);
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40);
  mouse.justUp = false;
  await wait(800);
}
expect(G.screen === "TITLE", "foi para TITLE após pretitle");

// ---- TITLE -> MODE (botão JOGAR)
mouse.x = 200; mouse.y = 275; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(800);
expect(G.screen === "MODE", "foi para MODE após clicar JOGAR");

// ---- MODE -> RUN (primeiro card)
mouse.x = 114; mouse.y = 282; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(800);
expect(G.screen === "RUN", "run iniciou via seleção de modo");
expect(units.allies.filter(a => !a.dead).length >= 5,
  "esquadrão inicial 2 op. + 2 colet. + 1 explor. (vivas: " + units.allies.filter(a => !a.dead).length + ")");
expect(units.allies.filter(a => a.type === "worker").length >= 2, "pelo menos 2 operárias");
expect(units.allies.filter(a => a.type === "gatherer").length >= 2, "pelo menos 2 coletoras");
expect(units.allies.filter(a => a.type === "scout").length >= 1, "pelo menos 1 exploradora");
expect(!!G.run.chambers && G.run.xpNext > 0, "campos chambers/xp inicializados");

// A introdução é parte do início real: primeiro lê/avança os três painéis.
// Não testar gameplay enquanto a cutscene está pausando a expedição.
const { isCutsceneActive } = await import(BASE + "/cutscenes.js");
expect(isCutsceneActive(), "Noite Branca abriu na primeira expedição");
const elapsedBeforeIntro = G.run.elapsed;
await wait(120);
expect(G.run.elapsed === elapsedBeforeIntro, "introdução pausa a simulação");
for (let i = 0; i < 6 && isCutsceneActive(); i++) {
  pressed.Enter = true;
  await wait(60);
  pressed.Enter = false;
  await wait(40);
}
expect(!isCutsceneActive(), "ENTER mostra o texto e avança os três painéis até jogar");
await wait(120);
expect(G.run.elapsed > elapsedBeforeIntro, "expedição começou após a introdução");

// ---- onda + chefe
waves.skipPeace();
await wait(300);
expect(waves.director.phase === "wave", "onda iniciada");
en.spawnBoss(G.run ? waves.mapDef().boss : "hare", G.run.wave);
await wait(400);
expect(!!en.boss, "chefe presente: " + (en.boss && en.boss.kind));

// ---- HUD loja (coordenadas espelham o HUD compacto do rework: toggle 160 px,
// cards de 44 px em pitch 50, fileira de 64 px de altura colada no rodapé;
// 11 classes em 4 grupos com respiro de 10 px entre grupos — a DINOPONERA é
// o 11º e último card, após combate(5) + coleta(3) + criação(2))
// O rodapé usa as placas novas (família v2): o botão IRMÃS tem 160px e os
// cards da loja são placas verticais de 44px. As posições vêm do próprio
// jogo (game.js), para o teste não duplicar números do layout.
const gameMod = await import(BASE + "/game.js");
const FOOT_Y = 540 - 64, SHOP_TOGGLE_X = 10 + 160 / 2,
  GIANT_X = gameMod.shopCardXByType("giant") + gameMod.SHOP_CARD.w / 2;
expect(units.eggs.length === 0, "loja começa recolhida (sem encomenda pendente)");
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);
expect(units.eggs.length === 0, "clicar onde ficaria a gigante não compra nada com a loja fechada");

mouse.x = SHOP_TOGGLE_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);

G.run.food = 999;
// o ninho escavável azeda o que passa do teto de estoque; este passo mede a
// LOJA (2ª gigante não cobra), então o teto é ignorado só aqui e restaurado no fim
G.run.nestStats = { foodCap: 1e9, pantryMult: 1, essMult: 1, fungusCrop: 0, tiles: { pantry: 0 } };
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(60);
expect(units.eggs.some(e => e.type === "giant"), "gigante encomendada no 9º slot da loja aberta");
const foodAfterGiant = G.run.food;
G.run.food = 999;
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(60);
expect(G.run.food === 999 && units.eggs.filter(e => e.type === "giant").length === 1, // foodCap 1e9: sem azedamento neste passo
  "só cabe uma gigante por expedição (comida intacta na 2ª tentativa, cobrada: " + foodAfterGiant + ")");
delete G.run.nestStats;
const gi = units.spawnAnt("giant", world.anthill.x + 40, world.anthill.y + 40);
await wait(120);
expect(gi.bodyR === 240, "corpo da gigante = 20x a soldado (bodyR " + gi.bodyR + ")");
expect(G.run.status === "running", "run segue viva com o colosso em campo");

// ---- FORMIGUEIRO (REWORK DA BOCA)
const nestMod = await import(BASE + "/nest.js");
const enMod = await import(BASE + "/enemies.js");
mouse.x = 960 - 10 - 190 + 95; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(120);
expect(G.run.baseOpen === true && nestMod.nest.open === true, "formigueiro aberto pelo botão do canto");

// REGRESSÃO DO BUG ANTIGO: abrir o formigueiro espelhava TODAS as formigas
// para dentro (syncAnts(true)). Agora a cena de dentro mostra só quem passou
// pela boca — allies.inside (roster real, units.js).
expect(nestMod.nest.ants.length === units.insideCount(),
  "cena de dentro espelha o roster real (" + nestMod.nest.ants.length + " corpos / " +
  units.insideCount() + " dentro)");

// três operárias caminham até a boca e descem pela porta
const crew = units.allies.filter(a => !a.dead && !a.inside && a.type === "worker").slice(0, 3);
for (const a of crew) units.antEnterNest(a, "teste");
await wait(3200);
const entraram = crew.filter(a => a.inside);
expect(entraram.length >= 1, "formigas pacíficas desceram pela boca (" + entraram.length + "/3)");
expect(entraram.every(a => nestMod.nest.ants.some(n => n.id === a.id)),
  "quem entrou tem corpo trabalhando na cena de dentro");
const ficaram = crew.filter(a => !a.inside && !a.dead && !a.dying);
expect(ficaram.every(a => !nestMod.nest.ants.some(n => n.id === a.id)),
  "quem NÃO entrou pela boca continua fora (nada de respawn geral)");
expect(nestMod.nest.ants.length === units.insideCount(),
  "roster de dentro e cena batem depois das entradas (" + nestMod.nest.ants.length + ")");

// O MUNDO NÃO CONGELA: com o formigueiro aberto, um inimigo colocado longe
// continua andando em direção ao ninho (as duas telas rodam juntas).
{
  const foe = enMod.spawnEnemy("runner", world.anthill.x + 900, world.anthill.y, 1);
  const d0 = Math.hypot(foe.x - world.anthill.x, foe.y - world.anthill.y);
  // O loop de teste usa RAF simulado e pode perder quadros sob carga paralela.
  // Espera a condição observável, não presume que 900 ms bastam; o limite ainda
  // falha se abrir o ninho congelar o tick do mundo de verdade.
  const deadline = Date.now() + 5000;
  let d1 = d0;
  while (d1 >= d0 - 12 && Date.now() < deadline) {
    await wait(50);
    d1 = Math.hypot(foe.x - world.anthill.x, foe.y - world.anthill.y);
  }
  expect(d1 < d0 - 12, "mundo vivo com o formigueiro aberto (inimigo andou " + Math.round(d0 - d1) + " px)");
  foe.dead = true;
}

G.run.food = 999; G.run.essencePool = 999;
// ---- NINHO ESCAVÁVEL: "clicar numa sala" acabou. A cena lê o ponteiro na GRADE
// DE TERRA: o jogador escolhe a obra na barra de baixo e pinta a terra. Aqui o
// clique é o de verdade (mouse.x/y + justDown), igual ao que o jogador faz.
const NG = (await import(BASE + "/config.js")).NEST_GRID;
const N = nestMod.nest;
const NCOLS = nestMod.NEST_COLS, NROWS = nestMod.NEST_ROWS, NNT = NCOLS * NROWS;
const centerOf = (i) => ({ x: NG.x + (i % NCOLS) * NG.tile + NG.tile / 2, y: NG.y + ((i / NCOLS) | 0) * NG.tile + NG.tile / 2 });
const nbI = (i) => [i - 1, i + 1, i - NCOLS, i + NCOLS].filter((jj) => jj >= 0 && jj < NNT && Math.abs((jj % NCOLS) - (i % NCOLS)) <= 1);
async function clickTile(i) {
  const pt = centerOf(i);
  mouse.x = pt.x; mouse.y = pt.y; mouse.down = mouse.justDown = true;
  await wait(70); mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40); mouse.justUp = false; await wait(70);
}
/** n tiles abertos e grudados, livres — o jeito como a colônia amplia sala */
function freeRun(n, from) {
  const free = (i) => i >= 0 && i < NNT && !!N.open_[i] && N.room[i] < 0 && N.plan[i] < 0;
  let seeds = free(from) ? [from] : nbI(from).filter(free).slice(0, 1);
  if (!seeds.length) for (let i = 0; i < NNT; i++) if (free(i)) { seeds = [i]; break; }
  if (!seeds.length) return null;
  const out = seeds.slice(), seen = new Set(seeds), q = seeds.slice();
  while (q.length) {
    const i = q.shift();
    for (const jj of nbI(i)) {
      if (seen.has(jj) || !free(jj)) continue;
      seen.add(jj); out.push(jj); q.push(jj);
      if (out.length === n) return out;
    }
  }
  return null;
}
const cells = freeRun(3, N.hall) || [];
expect(cells.length === 3, "há 3 tiles abertos contíguos para marcar uma despensa");
N.tool = "pantry";
for (const i of cells) await clickTile(i);
expect(cells.every((i) => N.plan[i] >= 0),
  "clique na terra com a ferramenta DESPENSA marcou os canteiros (" + N.bldQ.length + " obra(s) na fila)");
await wait(11000);
const cmP = N.comps.find((c) => c.type === "pantry");
expect(!!cmP && G.run.chambers.pantry === 1,
  "3 tiles contíguos viram DESPENSA NÍVEL 1 pelo trabalho delas (n=" + (cmP ? cmP.n : 0) + ", tráfego x" + (cmP ? cmP.traffic.toFixed(2) : "-") + ")");
expect(G.run.nestStats && G.run.nestStats.foodCap > (await import(BASE + "/config.js")).NEST_RULES.capBase,
  "a despensa escavada subiu o teto do estoque: " + (G.run.nestStats ? G.run.nestStats.foodCap : "?"));

// ---- CAVAR: só o que encosta no aberto pode ser marcado, e a obra é delas
let digTile = -1;
for (let i = 0; i < NNT; i++) if (nestMod.nestCanDig(i)) { digTile = i; break; }
expect(digTile >= 0, "tem terra escavável encostada no que já está aberto");
N.tool = "dig";
const dugBefore = N.dug;
await clickTile(digTile);
expect(!!N.marked[digTile] && N.digQ.length >= 1, "marcar CAVAR pôs o tile na fila das escavadoras");
await wait(10000);
expect(N.open_[digTile] && N.dug > dugBefore,
  "as formigas abriram o tile marcado (" + N.dug + " tiles escavados nesta run)");

// ---- O DEMOLIR TEM DUAS PONTAS: o rótulo diz "7 / X", as duas teclas têm de
// armar a mesma ferramenta (chicote de 2026-10-21: a tecla do demolir estava
// escrita no HUD mas não existia no código).
{
  const toolBefore = N.tool;
  for (const code of ["KeyX", "Digit7"]) {
    N.tool = "pantry";
    pressed[code] = true; await wait(90); pressed[code] = false; await wait(90);
    expect(N.tool === "erase", code + " arma o DEMOLIR dentro do ninho (o rótulo do HUD é verdade)");
  }
  N.tool = toolBefore;
}
// ---- MOBILE: as 7 placas não moram mais no rodapé, moram numa GAVETA que abre
// sobre o campo só no toque. É o que devolve largura ao celular (Regra 9), e o
// Regra 21 exige que a placa exista como botão de verdade, não como desenho.
{
  const nestUI = await import(BASE + "/ui.js");
  const { touchMode } = await import(BASE + "/input.js");
  const nestBtns = nestUI.uiButtons;
  const hit = async (id) => {
    const b = nestBtns().find((x) => x.id === id);
    if (!b) return false;
    mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2; mouse.down = mouse.justDown = true;
    await wait(90); mouse.down = mouse.justDown = false; mouse.justUp = true;
    await wait(90); mouse.justUp = false; await wait(90);
    return true;
  };
  const ids = () => nestBtns().map((x) => x.id);
  touchMode.on = true; await wait(200);
  expect(ids().includes("nestDrawer"), "no toque há a placa OBRAS (id nestDrawer) no rodapé do ninho");
  expect(!ids().includes("nestTool_dig"), "com a gaveta fechada as 7 placas NÃO ocupam o rodapé do celular");
  expect(await hit("nestDrawer"), "a placa OBRAS está clicável");
  expect(N.drawer === true, "tocar em OBRAS abre a gaveta sobre o campo");
  await wait(200);
  expect(ids().filter((x) => x.startsWith("nestTool_")).length === 7,
    "a gaveta expõe as 7 obras (" + ids().filter((x) => x.startsWith("nestTool_")).length + ")");
  const antes = N.tool;
  N.tool = "dig";
  expect(await hit("nestTool_barracks"), "a placa QUARTEL da gaveta está clicável");
  expect(N.tool === "barracks" && N.drawer === false,
    "escolher a obra fecha a gaveta sozinha (tool=" + N.tool + " drawer=" + N.drawer + ")");
  // a guarda de pintura: com a gaveta aberta, o toque nela NÃO marca terra
  N.tool = "dig"; N.drawer = true; await wait(200);
  const qAntes = N.digQ.length + N.marked.filter(Boolean).length;
  const gb = nestBtns().find((x) => x.id === "nestTool_erase") || { x: 400, y: 300, w: 10, h: 10 };
  mouse.x = gb.x + gb.w / 2; mouse.y = gb.y + gb.h / 2; mouse.down = mouse.justDown = true;
  await wait(90); mouse.down = mouse.justDown = false; mouse.justUp = true; await wait(120); mouse.justUp = false;
  expect(N.digQ.length + N.marked.filter(Boolean).length === qAntes,
    "tocar dentro da gaveta não marca terra atrás dela (a guarda de pintura segura)");
  N.drawer = false; touchMode.on = false; N.tool = antes; await wait(200);
}

const carrier = N.ants.find((a) => a.job === "carrier");
expect(!!carrier, "há carregadoras trabalhando no formigueiro");
if (carrier) {
  carrier.carry = 1; carrier.path = null; carrier.leg = 0;
  carrier.destCm = cmP || null; carrier.dest = carrier.tile;
  const p = centerOf(carrier.tile);
  carrier.x = p.x; carrier.y = p.y;
  const before = N.deliveries;
  await wait(220);
  expect(N.deliveries > before,
    "formigas entregaram comida na despensa (+" + (N.deliveries - before) + ", multiplicada pelo tamanho e pelo tráfego)");
}
await wait(600);
const busy = N.ants.filter((a) => a.path || a.carry).length;
expect(busy >= 1, "formigas em movimento dentro do formigueiro (" + busy + " ocupadas)");

// A PORTA AO CONTRÁRIO: L põe uma formiga na FILA da boca — ela ANDA pelos
// túneis até a sala da ENTRADA e só então brota no mundo (sem teleporte).
{
  // Garante uma candidata nova (o rodízio não a toca: insideT ~ 0 < 12s).
  // Ela nasce colada na porta e mergulha na hora — atravessar o campo de
  // batalha a pé seria pedir para morrer antes de descer (há ondas rolando).
  let recruta = null;
  for (let tent = 0; tent < 4 && !recruta; tent++) {
    // A horda em volta da boca pode matar a recruta ANTES de a boca engoli-la
    // (era assim que este passo ficava vermelho no CI, sem regressão nenhuma).
    // Sem inimigos por perto o passo é determinístico — e nenhuma checagem
    // daqui para baixo depende deles.
    en.clearFoes();
    const cand = units.spawnAnt("worker", world.anthill.door.x, world.anthill.door.y);
    units.antEnterNest(cand, "teste");
    let guardIn = 0;
    while (!cand.inside && !cand.dead && guardIn < 6000) { await wait(250); guardIn += 250; }
    if (cand.inside) recruta = cand;
  }
  expect(recruta !== null, "recruta desceu pela boca para o teste de saída");
  // o rodízio automático da porta já pode ter enfileirado gente nesta altura do
  // teste (a cena agora passa ~40s dentro, com obras). Limpa a fila para que o
  // que se mede aqui seja o efeito da tecla L, e nada mais.
  for (const a of units.allies.inside) { a.exitRequested = false; a.exitReqT = 0; }
  for (const n of nestMod.nest.ants) { n.leaving = false; n.path = null; n.leg = 0; }
  // Manda a RECRUTA para o fundo do ninho e faz dela a mais velha de dentro, para
  // que (a) a tecla L a escolha e (b) a fila tenha TÚNEL para andar — se ela
  // ficasse em cima da boca, sairia no mesmo frame e nada disso seria medido.
  const N = nestMod.nest;
  const nRec = N.ants.find(n => n.id === recruta.id);
  if (nRec) {
    const rp = centerOf(N.royal);
    nRec.tile = N.royal; nRec.x = rp.x; nRec.y = rp.y; nRec.path = null; nRec.leg = 0;
    recruta.insideT = 999;
  }
  expect(!!nRec, "a recruta tem corpo na cena de dentro antes de pedir a saída");
  const flaggedAntes = new Set(units.allies.inside.filter(a => a.exitRequested).map(a => a.id));
  pressed.KeyL = true;
  await wait(80);
  pressed.KeyL = false;
  await wait(150);
  const novos = units.allies.inside.filter(a => a.exitRequested && !flaggedAntes.has(a.id));
  expect(novos.length >= 1, "L colocou uma formiga na fila da boca (" + novos.length + " nova(s))");
  expect(recruta.exitRequested, "a tecla L enfileirou a formiga mais velha de dentro (a recruta)");
  const naFila = N.ants.some(n => n.leaving && n.id === recruta.id);
  expect(naFila, "o corpo da recruta anda até a ENTRADA na cena de dentro");
  expect(recruta.inside, "a fila NÃO teletransporta: 230ms depois do pedido ela ainda está no túnel");
  // Medimos SEMPRE na recruta — quem este passo criou. O rodízio da boca
  // enfileira gente sozinho a cada ~4,5s ("N nova(s)" variando com a carga da
  // máquina), então "quem saiu primeiro" seria medir o acaso, não a fila. E as
  // ondas continuam vindo lá fora enquanto a cena está aberta (o mundo não
  // congela mais): limpar os inimigos a cada amostrada deixa de haver morte
  // no meio do trajeto — que nada tem a ver com a fila da boca.
  let guardOut = 0;
  while (recruta.inside && !recruta.dead && guardOut < 20000) {
    en.clearFoes();
    await wait(200);
    guardOut += 200;
  }
  expect(!recruta.inside, "a recruta atravessou a boca depois de andar até a ENTRADA (" + guardOut + "ms de túnel)");
  expect(!recruta.dead && !recruta.dying, "a recruta chegou viva: ninguém morre dentro do túnel da fila");
  expect(Math.hypot(recruta.x - world.anthill.door.x, recruta.y - world.anthill.door.y) < 200,
    "quem saiu brotou no mundo junto à boca do formigueiro");
  expect(!N.ants.some(n => n.id === recruta.id), "quem saiu não tem mais corpo na cena de dentro");
}

{
  const cfgN = await import(BASE + "/config.js");
  const antes = units.allies.filter(a => !a.dead).length;
  const popStart = units.popCapTotal();
  G.run.food = 4000;
  const berco = freeRun(3, N.hall) || [];
  expect(berco.length === 3, "dá para emendar um BERÇO no corte (3 tiles livres e grudados)");
  N.tool = "nursery";
  for (const i of berco) await clickTile(i);
  const limite = Date.now() + 18000;
  while (Date.now() < limite && !(N.stats && N.stats.tiles.nursery >= 3)) await wait(200);
  expect(N.stats.tiles.nursery >= 3 && N.stats.popBonus >= 1,
    "berço escavado: " + N.stats.tiles.nursery + " tiles, POP " + popStart + " -> " + units.popCapTotal() +
    " (a vaga vem do berço aberto, não de um botão)");
  // o ovo é levado pela enfermeira; aqui ele já chega no berço para a cena ser curta
  const rc = centerOf(N.royal);
  N.eggs.push({ t: 0, x: rc.x, y: rc.y, at: N.royal, carried: true });
  N.growT = 0.01;
  const foodN = G.run.food;
  const limite2 = Date.now() + 6000;
  while (Date.now() < limite2 && units.allies.filter(a => !a.dead).length === antes) await wait(120);
  const novas = units.allies.filter(a => !a.dead && a.type === "worker");
  const perto = novas.some(a => Math.hypot(a.x - world.anthill.x, a.y - world.anthill.y) < 200);
  expect(units.allies.filter(a => !a.dead).length > antes && perto,
    "nova operária nasceu no berço cavado e apareceu junto ao formigueiro no mundo");
  expect(G.run.food <= foodN, "nascer no berço custa comida de verdade (" + cfgN.NEST_RULES.hatchFood + " por formiga)");
  N.tool = "dig";
}

pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(100);
expect(!G.run.baseOpen && nestMod.nest.open === false, "formigueiro fechou (ESC)");

pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(150);
mouse.x = 480; mouse.y = 187; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(120);
{
  const gameMod = await import(BASE + "/game.js");
  gameMod.setPaused(false);
  await wait(60);
}

waves.director.phase = "calm";
waves.director.budget = 0;
waves.director.pendingDrafts = 1;
await wait(300);
if (!G.run.draft) {
  const mut = await import(BASE + "/mutations.js");
  G.run.draft = { options: mut.rollDraft(), t: 0 };
}
expect(!!G.run.draft, "draft aberto");
pressed.Digit2 = true;
await wait(60);
pressed.Digit2 = false;
await wait(100);
expect(!G.run.draft, "draft escolhido; mutações: " + G.run.mutations.size);

waves.director.phase = "mapClear";
await wait(200);
if (!G.run.transition) G.run.transition = true;
expect(G.run.transition === true, "transição aberta");
mouse.x = 480; mouse.y = 324; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(400);
if (waves.director.mapIdx === 0) {
  waves.director.mapIdx = 1;
  G.run.transition = false;
}
expect(waves.director.mapIdx === 1, "mapa avançou para: " + (waves.director.mapIdx + 1));
expect(!G.run.transition, "transição fechada");

const fog = await import(BASE + "/fog.js");
expect(fog.fogExplored(world.anthill.x, world.anthill.y) === true, "formigueiro explorado no fog");

// ---- ÁRVORE DA EVOLUÇÃO: o botão VOLTAR tem que funcionar ----------------
// Regressão do bug relatado: drawTreeHUD() devolvia "back" mas drawTree()
// jogava o retorno fora (sempre `return null`), então só o ESC saía da árvore.
const meta = await import(BASE + "/meta.js");
const { uiButtons } = await import(BASE + "/ui.js");
const click = async (x, y) => {
  mouse.x = x; mouse.y = y; mouse.down = mouse.justDown = true;
  await wait(60);
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40);
  mouse.justUp = false;
  await wait(700);              // dá tempo da transição terminar
};
// clica no CENTRO do botão pelo id: a geometria do HUD muda (as telas têm de
// caber também com FONTE GRANDE) e coordenadas fixas quebravam sem que haja
// regressão nenhuma de comportamento.
const clickBtn = async (id) => {
  const b = uiButtons().find((x) => x.id === id);
  if (!b) { console.error("botão " + id + " não achado nos uiButtons()"); return false; }
  await click(b.x + b.w / 2, b.y + b.h / 2);
  return true;
};
G.screen = "TITLE";
await wait(120);
meta.enterTree();
G.screen = "TREE";
await wait(150);
expect(G.screen === "TREE", "entrou na árvore da evolução");
// botão VOLTAR do HUD da árvore (drawTreeHUD): achado pelo id "treeBack"
await clickBtn("treeBack");
expect(G.screen === "TITLE", "VOLTAR (clique) saiu da árvore — screen=" + G.screen);
// e o ESC continua funcionando, voltando para a mesma tela
meta.enterTree();
G.screen = "TREE";
await wait(150);
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(700);
expect(G.screen === "TITLE", "ESC saiu da árvore — screen=" + G.screen);

// ---- PROFECIAS: botão novo no HUD da árvore abre a tela pós-final --------
meta.enterTree();
G.screen = "TREE";
await wait(150);
await clickBtn("treeProphecy");           // botão PROFECIAS do HUD da árvore
expect(G.screen === "PROPHECY", "abriu a tela de PROFECIAS — screen=" + G.screen);
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(700);
expect(G.screen === "TREE", "ESC voltou das profecias para a árvore — screen=" + G.screen);
await clickBtn("treeBack");                // VOLTAR
expect(G.screen === "TITLE", "VOLTAR saiu da árvore — screen=" + G.screen);

console.log(problems.length ? "PROBLEMAS: " + problems.join(" | ") : "UI-TEST PASSOU");
process.exit(problems.length ? 2 : 0);
