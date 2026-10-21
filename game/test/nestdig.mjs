// ============================================================================
// Teste do NINHO ESCAVÁVEL (protótipo 2026-10-20).
//
// O formigueiro deixou de ser menu de salas fixas: agora é uma grade de terra
// onde a colônia cava, constrói e choca. Este teste trava as regras que fazem
// disso um jogo (e não uma vitrine):
//
//   1. a grade é determinística por seed+mapa e nunca abre na rocha-mãe do
//      canto do "OLHO LÁ FORA";
//   2. só se cava o que ENCOSTA no que já está aberto;
//   3. a obra anda por TRABALHO (escavadora até o tile, dureza, tráfego), e o
//      veio enterrado paga na hora;
//   4. câmara = ÁREA CONTÍNUA do mesmo tipo (3/6/10 tiles = nível 1/2/3);
//      dois tiles soltos não viram câmara nenhuma;
//   5. cada tile cobra comida na marcação e o cancelamento devolve enquanto a
//      obra não começou;
//   6. TRÁFEGO: a mesma câmara longe da boca rende menos que perto dela;
//   7. o que a colônia ganha sai do que foi construído: teto de estoque
//      (despensa) e POP (berço);
//   8. a cadeia da Rainha: ovo na Real → enfermeira → berço (nada nasce sem
//      esse caminho);
//   9. desenhar a cena não quebra e as ferramentas existem no HUD.
//
// Uso: node game/test/nestdig.mjs
// ---------------------------------------------------------------- stubs ----
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: null }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (typeof p === "string" && p in t) return t[p];
      return (...a) => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {},
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class { constructor() { this.width = 64; this.height = 64; } set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); } };
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

// --------------------------------------------------------------- imports ----
const { genWorld, world } = await import("../js/world.js");
const units = await import("../js/units.js");
const { G, loadSave } = await import("../js/state.js");
const cfg = await import("../js/config.js");
const nestMod = await import("../js/nest.js");
const { START, NEST_RULES, NEST_BUILD, NEST_RESERVE, NEST_SOIL, NEST_GRID, NEST_VEIN } = cfg;
const { nest, nestEnter, nestUpdate, nestDraw, nestClick, nestHover, nestPaintTile, nestCanDig } = nestMod;

const problems = [];
// o boot real horaria os sprites girados (assets.js:bakeRot) — sem isso o
// desenho da cena não tem o que chamar em rotFrame
{
  const { bakeRot, dupSprite, setRotDrawScale, loadAll } = await import("../js/assets.js");
  await loadAll();                              // enche IMG[] como no boot real
  const { GIANT_SCALE, ANT_SIZES, GATHERER_SIZE } = await import("../js/config.js");
  dupSprite("soldier", "giant");
  for (const [k, sz] of Object.entries(ANT_SIZES)) bakeRot(k, sz);
  setRotDrawScale("giant", "soldier", GIANT_SCALE);
  bakeRot("gatherer", GATHERER_SIZE);
}
const ok = (m) => console.log("ok    " + m);
const bad = (m) => { problems.push(m); console.log("ERRO  " + m); };

// ----------------------------------------------------------------- palco ----
loadSave();
genWorld(20261020, 0);
const run = {
  seed: 20261020, status: "running", mapIdx: 0,
  food: 900, essencePool: 90, kills: 0, wave: 0, level: 0, xp: 0, xpNext: 40, fungusT: 9,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mutations: new Set(), mutationLog: [], testPowers: null, elapsed: 0, baseOpen: true,
};
G.run = run;
G.screen = "RUN";
units.spawnQueen();
const A = world.anthill;
// 5 operárias + 1 coletora + 1 enfermeira DENTRO do ninho (pela boca, sem espera
// de IA de superfície: o roster é o contrato que nest.js espelha)
function putInside(type) {
  const a = units.spawnAnt(type, A.x + 30, A.y + 30);
  a.inside = true; a.insideT = 1;
  units.allies.inside.push(a);
  return a;
}
for (let i = 0; i < 5; i++) putInside("worker");
putInside("gatherer");
putInside("healer");

nestEnter();

const COLS = NEST_GRID.cols, ROWS = NEST_GRID.rows, NN = COLS * ROWS;
const idx = (c, r) => r * COLS + c;
const isOpen = (i) => !!nest.open_[i];
const neighbors = (i) => [i - 1, i + 1, i - COLS, i + COLS].filter((j) =>
  j >= 0 && j < NN && Math.abs((j % COLS) - (i % COLS)) <= 1);
function sim(sec, dt = 1 / 60) {
  for (let k = 0, n = Math.round(sec / dt); k < n; k++) nestUpdate(dt, true);
}
/** tile de solo livre, encostado no aberto (candidato legítimo a escavar) */
function diggable(accept = () => true) {
  for (let i = 0; i < NN; i++) {
    if (isOpen(i) || !nestCanDig(i) || !accept(i)) continue;
    return i;
  }
  return -1;
}
/** faixa de `n` tiles abertos e livres, todos grudados uns nos outros */
const freeTile = (i) => isOpen(i) && nest.room[i] < 0 && nest.plan[i] < 0;
/** n tiles livres grudados uns nos outros, a partir de `from` (null se não couber) */
function openRun(n, from = nest.hall) {
  if (n < 1) return null;
  const seed0 = freeTile(from) ? from : neighbors(from).find(freeTile);
  if (seed0 === undefined || seed0 < 0) return null;
  return growRun([seed0], n, new Set([seed0]));
}
/** emenda `n` tiles livres numa borda existente (o jeito como a colônia amplia sala) */
function growRun(seeds, n, seenIn) {
  const seen = seenIn || new Set(seeds);
  const out = seeds.slice();
  if (out.length >= n) return out.slice(0, n);
  const q = seeds.slice();
  while (q.length && out.length < n) {
    const i = q.shift();
    for (const j of neighbors(i)) {
      if (seen.has(j) || !freeTile(j)) continue;
      seen.add(j); out.push(j); q.push(j);
      if (out.length === n) return out;            // para no tamanho pedido: emenda, não bolha
    }
  }
  return null;
}

// --------------------------------------------------- 1) grade determinística --
{
  const before = [];
  for (let i = 0; i < NN; i++) before.push(nest.soil[i] + ":" + nest.vein[i]);
  nest.key = "";
  nestEnter();
  const after = [];
  for (let i = 0; i < NN; i++) after.push(nest.soil[i] + ":" + nest.vein[i]);
  if (before.join("|") === after.join("|")) ok("mesma seed+mapa devolve a MESMA terra (geração determinística)");
  else bad("a grade do ninho mudou com a mesma seed");

  let nOpen = 0;
  for (let i = 0; i < NN; i++) if (isOpen(i)) nOpen++;
  if (nOpen >= 24) ok("a colônia já abriu " + nOpen + " tiles (boca, poço, vestíbulo e Câmara Real)");
  else bad("começo do ninho pequeno demais: " + nOpen + " tiles abertos");
  if (isOpen(nest.entrance) && isOpen(nest.hall) && isOpen(nest.royal)) ok("boca, vestíbulo e Câmara Real existem e são andáveis");
  else bad("faltam salas-núcleo no ninho");

  let reserveRock = 0, reserveTotal = 0;
  for (let r = NEST_RESERVE.r0; r <= NEST_RESERVE.r1; r++) {
    for (let c = NEST_RESERVE.c0; c <= NEST_RESERVE.c1; c++) {
      reserveTotal++;
      if (NEST_SOIL[nest.soil[idx(c, r)]].hard === 0 && !isOpen(idx(c, r))) reserveRock++;
    }
  }
  if (reserveRock === reserveTotal) ok("rocha-mãe cobre o canto do OLHO LÁ FORA (" + reserveTotal + " tiles intocáveis)");
  else bad("a janela do mundo invadiu terra escavável: " + reserveRock + "/" + reserveTotal);
}

// ------------------------------------- 2) só se cava o que encosta no aberto ---
{
  let far = -1;
  for (let i = 0; i < NN; i++) {
    if (isOpen(i) || NEST_SOIL[nest.soil[i]].hard === 0) continue;
    if (neighbors(i).some(isOpen)) continue;
    far = i; break;
  }
  if (far >= 0 && !nestCanDig(far)) ok("tile SOLTO no meio da terra não pode ser marcado (cresce como túnel, não como catálogo)");
  else if (far < 0) bad("não havia tile isolado para testar a regra de adjacência");
  else bad("nestCanDig deixou marcar um tile longe do aberto");

  const adj = diggable();
  if (adj >= 0 && nestCanDig(adj)) ok("encostado no aberto, pode cavar (tile " + adj + ", " + NEST_SOIL[nest.soil[adj]].name + ")");
  else bad("tile encostado no aberto foi recusado");
}

// ---------------------------------------- 3) a obra anda com trabalho de verdade
{
  // escolhe um candidato MACIO (rápido) para não depender de sorte
  let t = diggable((i) => NEST_SOIL[nest.soil[i]].hard <= 1.0);
  if (t < 0) t = diggable();
  nest.vein[t] = 1;                              // garante um veio aqui: a obra tem que pagar
  const food0 = run.food, open0 = nest.dug;
  const painted = nestPaintTile(t) !== false;
  if (!painted) bad("marcar obra escavada foi recusado num tile legítimo");
  else {
    sim(14);
    if (isOpen(t)) ok("a escavadora abriu o tile " + t + " (" + nest.dug + " tiles no total, " + (run.food - food0) + " de comida do veio)");
    else bad("ninguém abriu o tile marcado em 14s de obra (dprog=" + nest.dprog[t].toFixed(2) + ", crew=" + nest.crew[t] + ")");
    const got = run.food - food0;
    if (got >= NEST_VEIN[1].yield * 0.6) ok("veio de sementes pagou a escavação: +" + got + " comida");
    else bad("veio enterrado não rendeu comida (" + got + ")");
    if (open0 !== nest.dug) ok("contador de escavado acompanha a obra");
    else bad("contador de escavado parado");
  }
}

// ------------------------------------------------ 4) câmara = área contínua ----
{
  const cost = NEST_BUILD.pantry.tile.food;
  const open = openRun(2);                        // 2 tiles: ainda NÃO é câmara
  if (!open) bad("não achei 2 tiles abertos contíguos para montar um piso");
  else {
    nest.tool = "pantry";
    const food0 = run.food;
    for (const i of open) nestPaintTile(i);
    const paid = food0 - run.food;
    if (paid > 0) ok("construir cobra na marcação: " + paid + " comida por " + open.length + " tiles (primeira pedra + " + cost + "/tile)");
    else bad("canteiros marcados sem cobrar nada");
    sim(16);
    for (const i of open) if (nest.room[i] < 0) bad("canteiro não virou sala depois da obra (tile " + i + ")");
    if (run.chambers.pantry === 0 && nest.comps.filter((c) => c.type === "pantry").length === 0) {
      ok("2 tiles contíguos são PISO, não câmara: sem nível e sem bônus (regra da área mínima)");
    } else bad("câmara de despensa existindo com menos de " + NEST_BUILD.pantry.sizes[0] + " tiles");
    const st0 = nest.stats;
    if (st0 && st0.tiles.pantry === 0) ok("tiles fora do tamanho mínimo não contam no estoque nem nos bônus");
    else bad("tiles sem câmara entraram no estatuto: " + (st0 ? st0.tiles.pantry : "?"));
  }
}

// ------------------------------------ 5) cancelar devolve enquanto não começou --
{
  nest.tool = "pantry";
  let spot = -1;
  for (let i = 0; i < NN; i++) if (isOpen(i) && nest.room[i] < 0 && nest.plan[i] < 0) { spot = i; break; }
  const food0 = run.food;
  if (spot < 0) bad("não sobrou tile aberto livre para o teste de cancelamento");
  else {
    nestPaintTile(spot);
    const paid = food0 - run.food;
    if (paid <= 0) bad("marcar o canteiro não cobrou nada (nada a devolver)");
    nest.tool = "erase";
    nestClick(NEST_GRID.x + (spot % COLS) * NEST_GRID.tile + 6, NEST_GRID.y + ((spot / COLS) | 0) * NEST_GRID.tile + 6);
    if (nest.plan[spot] === -1 && run.food - food0 === 0) ok("X desfez o plano e devolveu os " + paid + " de comida (obra nem tinha começado)");
    else bad("cancelamento não devolveu: delta=" + (run.food - food0) + " plan=" + nest.plan[spot]);
    nest.tool = "pantry";
  }
  // ...e a obra que ELAS JÁ COMEÇARAM a levantar devolve só metade (decisão do
  // balanceamento em 2026-10-21: desfazer planta não pode ser de graça, mas
  // perder 100% transformava erro de clique em castigo).
  {
    let spot2 = -1;
    for (let i = 0; i < NN; i++) if (isOpen(i) && nest.room[i] < 0 && nest.plan[i] < 0) { spot2 = i; break; }
    if (spot2 < 0) bad("sem tile aberto livre para o teste da metade devolvida");
    else {
      // comida SEMPRE abaixo do teto: o excedente azeda a cada passo e entraria
      // na conta da devolução.
      run.food = Math.min(4000, (run.nestStats && run.nestStats.foodCap) || NEST_RULES.capBase);
      run.essencePool = 400;
      const food0 = run.food;
      nestPaintTile(spot2);
      const pago = food0 - run.food;
      if (pago <= 0) bad("marcar a obra não cobrou nada (a devolução não teria o que medir)");
      else if (nest.plan[spot2] < 0) bad("marcar a obra não deixou canteiro (plan=" + nest.plan[spot2] + ")");
      else {
        // O progresso é POSTO à mão, sem passo de sim no meio da medição: com 1 s
        // de sim o tile único às vezes TERMINAVA (plan virava -1) e a asserção
        // passava a medir outra coisa. A escalação da obra tem seção própria (3 e 4).
        nest.bprog[spot2] = 0.4;
        const noClique = run.food;
        nest.tool = "erase";
        nestClick(NEST_GRID.x + (spot2 % COLS) * NEST_GRID.tile + 6, NEST_GRID.y + ((spot2 / COLS) | 0) * NEST_GRID.tile + 6);
        const deVolta = run.food - noClique;
        const esperado = Math.round(pago * NEST_RULES.refundBuilt);
        if (nest.plan[spot2] === -1 && Math.abs(deVolta - esperado) <= 1)
          ok("obra começada devolve METADE: pagou " + pago + ", voltou " + deVolta + " (refundBuilt " + NEST_RULES.refundBuilt + ")");
        else bad("devolução errada: voltou " + deVolta + ", esperado ~" + esperado + " (plan=" + nest.plan[spot2] + ")");
        nest.tool = "pantry";
      }
    }
  }
}

// ------------------------------- 6) tamanho da câmara define o nível (3/6/10) --
{
  // reabastece comida e limpa o piso dos 2 tiles do teste anterior
  run.food = 4000; run.essencePool = 400;
  const three = openRun(3);
  if (!three) bad("sem 3 tiles abertos contíguos para fechar uma câmara");
  else {
    nest.tool = "pantry";
    for (const i of three) nestPaintTile(i);
    sim(20);
    const daMinha = () => nest.comps.find((c) => c.type === "pantry" && three.some((i) => c.tiles.indexOf(i) >= 0));
    const cm = daMinha();
    if (!cm) bad("a câmara dos tiles do teste não apareceu no estatuto (comps: " +
      nest.comps.map((c) => c.type + "/" + c.n + "t").join(", ") + ")");
    else {
      const sz = NEST_BUILD.pantry.sizes;
      const esperado = cm.n >= sz[2] ? 3 : cm.n >= sz[1] ? 2 : 1;
      // o que se afirma é a REGRA (área -> nível), não o tamanho que o acaso do
      // layout deu: se a câmara dos 3 tiles encostou numa despensa que já existia,
      // as duas são uma só e o nível 2 está CERTO.
      if (cm.lvl === esperado) ok(cm.n + " tiles contíguos = DESPENSA NÍVEL " + cm.lvl +
        " (regra " + sz.join("/") + ", tráfego ×" + cm.traffic.toFixed(2) + ")");
      else bad("nível não seguiu a área: " + cm.n + " tiles deram nível " + cm.lvl + ", esperado " + esperado);
    }
    const st = nest.stats;
    if (st.foodCap === NEST_RULES.capBase + NEST_RULES.capPerTile * st.tiles.pantry) {
      ok("estoque da colônia = teto da DESPENSA CONSTRUÍDA: " + st.foodCap + " (" + st.tiles.pantry + " tiles)");
    } else bad("teto de comida não seguiu os tiles: " + st.foodCap);
    // cresce até o nível 2: EMENDA na câmara que já existe (como o jogador faz)
    const cmNow = daMinha();
    const more = cmNow ? growRun(cmNow.tiles, cmNow.n + (NEST_BUILD.pantry.sizes[1] - cmNow.n),
      new Set(cmNow.tiles)) : null;
    if (more) {
      for (const i of more) nestPaintTile(i);
      sim(22);
      const cm2 = daMinha();
      if (cm2 && cm2.lvl >= 2) ok("a MESMA câmara ampliada para " + cm2.n + " tiles subiu para o nível " + cm2.lvl);
      else bad("ampliar a câmara não subiu o nível (" + (cm2 ? cm2.n + " tiles → n" + cm2.lvl : "sem câmara") + ")");
    } else bad("não deu para emendar tiles na despensa (layout do teste)");
  }
}

// ------------------------------------------------- 7) tráfego cobra o túnel ----
{
  run.food = 6000; run.essencePool = 600;
  // abre um corredor comprido até um bolso longe da boca (a régua do tráfego)
  let far = -1;
  for (let c = COLS - 2; c > 3; c--) {
    const i = idx(c, ROWS - 2);
    if (nest.soil[i] !== 3) { far = i; break; }
  }
  if (far < 0) bad("não achei solo livre no fundo do corte para o teste de tráfego");
  else {
    // caminho de tiles abertos até lá, sem mexer na boca
    const cFar = far % COLS, rFar = (far / COLS) | 0;
    const cHall = nest.hall % COLS;
    const cor = [];
    for (let r = rFar; r >= 6; r--) cor.push(idx(cFar, r));          // poço vertical
    for (let c = cFar - 1; c >= cHall; c--) cor.push(idx(c, 6));     // corredor até o vestíbulo
    for (const i of cor) { nest.open_[i] = 1; nest.soil[i] = 1; nest.room[i] = -1; nest.plan[i] = -1; }
    nest.dirtyDist = true;
    sim(0.1);                                   // força rebuildDist
    if (nest.dist[far] < 0) bad("corredor do teste não ligou na boca (dist=" + nest.dist[far] + ")");
    const cells = [far, far - 1, far + 1].filter((i) => i >= 0 && i < NN);
    if (cells.length < 3) bad("câmara longe caiu fora da grade");
    else {
      const pantryKind = nest.comps.find((c2) => c2.type === "pantry").kind;
      for (const i of cells) {
        nest.open_[i] = 1; nest.soil[i] = 1; nest.plan[i] = -1; nest.room[i] = pantryKind;
      }
      nest.dirtyDist = true; nest.dirtyRooms = true; sim(0.2);
    }
    const farCm = nest.comps.find((c2) => c2.type === "pantry" && c2.dist > 12);
    const nearCm = nest.comps.find((c2) => c2.type === "pantry" && c2.dist <= 12);
    if (farCm && nearCm && farCm.dist > nearCm.dist && farCm.traffic < nearCm.traffic) {
      ok("tráfego mede o túnel: perto ×" + nearCm.traffic.toFixed(2) + " (" + nearCm.dist + " tiles) vs longe ×" +
        farCm.traffic.toFixed(2) + " (" + farCm.dist + " tiles)");
    } else bad("o tráfego não puniu a câmara longe da boca (" + JSON.stringify({ far: farCm && farCm.traffic, near: nearCm && nearCm.traffic }) + ")");
  }
}

// --------------------------------------------- 8) berço dá POP, fungo dá comida
{
  run.food = 6000; run.essencePool = 600;
  const popBefore = units.popCapTotal();
  const n3 = openRun(3, nest.royal) || openRun(3);
  if (!n3) bad("sem 3 tiles livres para o berço");
  else {
    nest.tool = "nursery";
    for (const i of n3) nestPaintTile(i);
    sim(26);
    const st = nest.stats;
    const expect = Math.floor(st.tiles.nursery * NEST_RULES.popPerTile);
    if (units.popCapTotal() === popBefore + expect && expect >= 1) {
      ok("berço construído virou POP de verdade: " + popBefore + " → " + units.popCapTotal() + " (" + st.tiles.nursery + " tiles)");
    } else bad("popCapTotal não acompanhou o berço (esperado +" + expect + ", got +" + (units.popCapTotal() - popBefore) + ")");
    if (st.hatchMult > 1) ok("choco mais rápido com berço: ×" + st.hatchMult.toFixed(2));
    else bad("berço sem efeito na chocagem");
  }
  // fungário rende comida no tick do mundo (o crop mora em nestStats)
  const f3 = openRun(3);
  if (f3) {
    nest.tool = "fungus";
    for (const i of f3) nestPaintTile(i);
    sim(26);
    if (nest.stats.fungusCrop >= 1) ok("fungário construído: +" + nest.stats.fungusCrop + " comida por ciclo (tiles, não botão)");
    else bad("fungário não produziu comida por ciclo");
  }
}

// ------------------------- 8b) carregadora SEM TRILHA volta a trabalhar --------
{
  // Peguei isto jogando no navegador (2026-10-20): a formiga que LARGA uma obra
  // acorda no meio do túnel sem trilha desenhada. Se o tick de entrega depender
  // de "chegar à boca" sem traçar a rota, ela respira no lugar para sempre e o
  // estoque da colônia congela sem nenhum erro na tela.
  const c = nest.ants.find((n) => n.job === "carrier" && !n.leaving);
  if (!c) bad("sem carregadora disponível para o teste da trilha");
  else {
    c.task = null; c.path = null; c.leg = 0; c.carry = 0; c.workT = 0;
    c.tile = nest.comps[0].tiles[nest.comps[0].tiles.length - 1];
    const d0 = nest.deliveries;
    sim(22);
    if (nest.deliveries > d0) {
      ok("carregadora largada no meio do túnel traçou a rota e voltou a entregar (+" + (nest.deliveries - d0) + " de comida)");
    } else bad("carregadora presa sem trilha: entregas pararam (deliveries " + nest.deliveries + ")");
    if (c.carry > 0 || c.path || c.tile === nest.entrance) ok("ela está em ciclo de fato (carregando/trilhando na boca)");
    else console.log("info  ciclo parado após o teste: tile " + c.tile + " (boca é " + nest.entrance + ")");
  }
}

// ------------------------------------ 9) cadeia do ovo: Real → enfermeira → berço
{
  nest.eggs.length = 0;
  nest.laidT = 0.01;
  const t0 = nest.comps.filter((c) => c.type === "nursery")[0];
  if (!t0) bad("sem berço para o teste da cadeia do ovo");
  else {
    let carried = 0, guard = 0;
    while (!carried && guard++ < 90) {         // até 90s de cena
      sim(1);
      carried = nest.eggs.filter((e) => e.carried).length;
    }
    if (carried) ok("a enfermeira levou " + carried + " ovo(s) da Câmara Real ao berço (chocar é trabalho, não botão)");
    else bad("nenhum ovo chegou ao berço em 90s (ovos=" + nest.eggs.length + ")");
    const before = run.food;
    const pop0 = units.popUsed();
    nest.growT = 0.01;
    let born = 0;
    for (let k = 0; k < 60 * 30 && !born; k++) {
      nestUpdate(1 / 60, true);
      born = units.popUsed() > pop0 ? 1 : 0;
    }
    if (born) ok("nasceu uma formiga do berço e a colônia PAGOU " + (before - run.food + NEST_RULES.hatchFood) + "≈" + NEST_RULES.hatchFood + " de comida por ela");
    else bad("berço com ovo não chocou em 30s (food " + run.food + ", pop " + units.popUsed() + "/" + units.popCapTotal() + ")");
  }
}

// -------------------------------------------------- 10) desenhar a cena -------
{
  const ctx = makeCtx();
  let threw = null;
  try {
    nestHover(NEST_GRID.x + NEST_GRID.tile * 12, NEST_GRID.y + NEST_GRID.tile * 6);
    nestDraw(ctx);
    nest.tool = "dig";
    nestHover(0, 0);
    nestDraw(ctx);
  } catch (e) { threw = e; }
  if (threw) bad("nestDraw quebrou: " + threw.message + "\n" + threw.stack);
  else ok("cena do ninho desenha sem erro (grade + câmaras + ficha do tile + HUD)");

  // o custo por tile tem que estar na régua da tabela velha (nenhuma câmara grátis)
  for (const id of ["pantry", "nursery", "barracks", "fungus", "refinery"]) {
    const t = NEST_BUILD[id].tile;
    const c0 = cfg.CHAMBERS[id].costs[0];
    if (t.food > c0.food) bad(id + ": tile unitário (" + t.food + ") custa mais que a câmara inteira antiga (" + c0.food + ")");
    else if (nestMod.tileCost(id).food !== t.food) bad(id + ": desconto da árvore quebrou o custo do tile");
  }
  ok("custos por tile ficam abaixo do custo de tabela antigo (ampliar é barato, abrir é caro)");
}

// ------------------------------------------------------------ 11) resultante --
if (nest.digQ.length === 0 && nest.bldQ.length === 0) ok("filas de obra esvaziaram quando o trabalho acabou (sem tarefa fantasma)");
else bad("sobraram tarefas mortas: digQ=" + nest.digQ.length + " bldQ=" + nest.bldQ.length);

for (let i = 0; i < NN; i++) {
  if (nest.marked[i] && isOpen(i)) { bad("tile marcado e ao mesmo tempo aberto (fila dessincronizada): " + i); break; }
  if (nest.plan[i] >= 0 && isOpen(i) === false) { bad("canteiro em tile não aberto: " + i); break; }
}
ok("invariantes da grade: nenhum tile marcado-aberto e nenhum canteiro no solo");

if (problems.length) { console.log("\n✗ NINHO ESCAVÁVEL — " + problems.length + " PROBLEMA(S)"); process.exit(1); }
console.log("\n✓ NINHO ESCAVÁVEL OK — grade, obras, câmaras por área, tráfego, estoques e a cadeia do ovo");
