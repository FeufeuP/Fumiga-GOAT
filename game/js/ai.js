// ============================================================================
// FUMIGA-GOAT — CÉREBRO DA COLÔNIA (IA das formigas)
//
// Cada formiga tem o SEU cérebro: personalidade (diligência, curiosidade,
// coragem, sociabilidade), memória do que viu e um ciclo de decisão próprio
// (~5x por segundo) que escolhe o que fazer por utilidade. O resultado é um
// formigueiro que parece vivo: ninguém anda em fila indiana igual, umas
// exploram mais longe, outras trabalham sem parar, outras fogem antes.
//
// A ORGANIZAÇÃO vem de fora do indivíduo (é assim que formigas de verdade
// funcionam — estigmergia):
//   • FEROMÔNIOS em grade: trilha de comida, trilha de essência e ALARME.
//     Quem acha um recurso marca o caminho; as irmãs ociosas seguem a trilha
//     mais forte. O alarme faz o inverso: espalha o perigo e chama a guarda.
//   • NECESSIDADES da colônia: comida, essência, defesa e cura viram pesos.
//     A colônia publica uma DIRETRIZ ("COMIDA" / "ESSÊNCIA" / "DEFESA" /
//     "EXPLORAR") e cada formiga decide sozinha se obedece — quem tem
//     curiosidade alta pode ignorar e ir explorar.
//   • FOCO DE ATAQUE: os combatentes combinam um alvo comum, sentinelas
//     marcam o inimigo (revealT) e cada um cerca por um setor diferente.
//
// Nada disso é decorativo: o comportamento é lido de verdade pelo js/units.js
// (workers), pelos lutadores, pelas curandeiras e pela cena do formigueiro.
// ============================================================================
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H } from "./config.js";
import { world } from "./world.js";
import { clamp, dist2, dist, rand, TAU, chance } from "./utils.js";
import { G } from "./state.js";

// ------------------------------------------------------------ grade de cheiro
const CELL = 64;
const GW = Math.ceil(WORLD_W / CELL);
const GH = Math.ceil(WORLD_H / CELL);

function grid() { return new Float32Array(GW * GH); }

// vida útil de cada canal (s): trilha some devagar, alarme apaga rápido
const TAU_FOOD = 16, TAU_ESS = 18, TAU_AMBER = 14, TAU_DANGER = 5.5;
const TAU_RECRUIT = 9;    // "vem cá" de quem achou comida
export const PHE = {
  food: grid(), essence: grid(), amber: grid(), danger: grid(), recruit: grid(),
};

const idx = (x, y) => {
  const cx = clamp((x / CELL) | 0, 0, GW - 1), cy = clamp((y / CELL) | 0, 0, GH - 1);
  return cy * GW + cx;
};

export function pheromoneReset() {
  for (const k in PHE) PHE[k].fill(0);
}

/** Deposita cheiro no ponto (soma, com teto por célula). */
export function pheromoneMark(kind, x, y, amount = 1) {
  const g = PHE[kind];
  if (!g) return;
  const i = idx(x, y);
  g[i] = Math.min(6, g[i] + amount);
}

/** Cheiro no ponto (média da célula e das vizinhas — leitura suave). */
export function pheromoneAt(kind, x, y) {
  const g = PHE[kind];
  if (!g) return 0;
  const cx = clamp((x / CELL) | 0, 0, GW - 1), cy = clamp((y / CELL) | 0, 0, GH - 1);
  let v = 0, n = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const nx = cx + i, ny = cy + j;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      v += g[ny * GW + nx]; n++;
    }
  }
  return n ? v / n : 0;
}

/**
 * Sobe o cheiro: direção para onde o rastro fica mais forte (o "nariz" da
 * formiga seguindo a trilha da irmã). Devolve null quando não há rastro.
 */
export function pheromoneGradient(kind, x, y, radius = 1) {
  const g = PHE[kind];
  if (!g) return null;
  const here = pheromoneAt(kind, x, y);
  let bx = 0, by = 0, best = here * 1.04;
  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      if (!i && !j) continue;
      const sx = x + i * CELL * 0.9, sy = y + j * CELL * 0.9;
      if (sx < 0 || sy < 0 || sx > WORLD_W || sy > WORLD_H) continue;
      const v = pheromoneAt(kind, sx, sy);
      if (v > best) { best = v; bx = i; by = j; }
    }
  }
  if (!bx && !by) return null;
  const d = Math.hypot(bx, by) || 1;
  return { x: bx / d, y: by / d, strength: best };
}

/** Evaporação: tudo decai com o tempo (senão o mapa vira uma sopa de cheiro). */
export function pheromoneTick(dt) {
  const tau = { food: TAU_FOOD, essence: TAU_ESS, amber: TAU_AMBER, danger: TAU_DANGER, recruit: TAU_RECRUIT };
  for (const k in PHE) {
    const g = PHE[k];
    const f = Math.exp(-dt / tau[k]);
    for (let i = 0; i < g.length; i++) {
      const v = g[i] * f;
      g[i] = v < 0.004 ? 0 : v;
    }
  }
}

// ------------------------------------------------------------------- colônia --
export const colony = {
  t: 0,
  think: 0,                       // relógio do pensamento coletivo
  needs: { food: 0, essence: 0, defense: 0, heal: 0 },
  directive: "EXPLORAR",          // COMIDA | ESSÊNCIA | DEFESA | EXPLORAR
  directiveT: 0,
  alarm: { x: 0, y: 0, t: 0, hits: 0 },
  focus: null,                    // alvo combinado dos combatentes
  focusT: 0, focusCalls: 0,
  threats: 0,                     // inimigos perto do formigueiro
  frontline: { x: 0, y: 0, t: 0 },// onde a guerra está agora
  wounded: 0,
  carriers: 0, fighters: 0, idle: 0, scouts: 0, nurses: 0,
  deliveries: 0, gathered: 0, kills: 0,
  scoutMark: null,                // último inimigo marcado por batedora
  events: [],                     // últimas decisões (HUD/inspeção/testes)
  mood: "CALMA",                  // CALMA | TRABALHO | ALERTA | PÂNICO
};

export function colonyReset() {
  colony.t = 0; colony.think = 0;
  colony.needs = { food: 0, essence: 0, defense: 0, heal: 0 };
  colony.directive = "EXPLORAR"; colony.directiveT = 0;
  colony.alarm = { x: 0, y: 0, t: 0, hits: 0 };
  colony.focus = null; colony.focusT = 0;
  colony.threats = 0; colony.wounded = 0;
  colony.carriers = colony.fighters = colony.idle = colony.scouts = colony.nurses = 0;
  colony.deliveries = 0; colony.gathered = 0; colony.kills = 0;
  colony.scoutMark = null; colony.events.length = 0; colony.mood = "CALMA";
  pheromoneReset();
}

function log(msg) {
  colony.events.push({ t: colony.t, msg });
  if (colony.events.length > 24) colony.events.shift();
}

// ------------------------------------------------------------- personalidade --
// Sorteada uma vez por formiga; não muda mais (é o "jeito" dela).
function rollTraits(a) {
  const t = {};
  const role = a.def ? a.def.role : "worker";
  t.diligence = clamp(rand(0.45, 1.15), 0.2, 1.3);
  t.curiosity = clamp(rand(0.15, 1.2), 0.1, 1.3);
  t.courage = clamp(rand(0.25, 1.15), 0.1, 1.25);
  t.social = clamp(rand(0.3, 1.2), 0.2, 1.25);
  if (role === "worker") t.curiosity += 0.15;
  if (a.type === "scout") { t.curiosity = clamp(t.curiosity + 0.6, 0, 1.6); t.courage += 0.25; }
  if (a.type === "tank") { t.courage = 1.3; t.curiosity *= 0.5; }
  if (a.type === "healer") { t.social += 0.5; t.courage *= 0.7; }
  if (a.type === "spitter" || a.type === "bomber") { t.courage *= 0.85; }
  // velocidade individual: duas operárias nunca têm o mesmo passo
  a.speedJitter = 0.93 + Math.random() * 0.15;
  return t;
}

/** Cria (uma vez) o cérebro da formiga: personalidade + memória. */
export function antBrain(a) {
  if (a.brain) return a.brain;
  a.brain = {
    traits: rollTraits(a),
    task: "ociosa", taskT: 0, decideT: rand(0, 0.22),
    // memória de curto prazo
    lastRes: null, lastResT: 0,
    wander: null, wanderT: 0,
    restT: 0, fatigue: 0,
    panic: 0, lastHit: 0,
    slot: null, slotT: 0,          // setor da formação de combate
    seen: null, seenT: 0,          // último inimigo avistado
    home: { x: a.x, y: a.y },      // posto individual (cada uma escolhe o seu)
    trail: 0,                      // tempo seguindo trilha
  };
  return a.brain;
}

/** Sinal de perigo: quem leva pancada (ou vê inimigo) grita para a colônia. */
export function alarmAt(x, y, strength = 1) {
  pheromoneMark("danger", x, y, strength);
  const A = world.anthill;
  colony.alarm.x = x; colony.alarm.y = y;
  colony.alarm.t = Math.max(colony.alarm.t, 3.2 + strength);
  colony.alarm.hits += strength;
  if (colony.mood === "CALMA") log("ALARME perto de (" + (x | 0) + "," + (y | 0) + ")");
  colony.mood = colony.alarm.t > 4.5 ? "PÂNICO" : "ALERTA";
}

/** Marca a descoberta de um recurso (a formiga "conta" onde achou). */
export function reportResource(a, res) {
  if (!res) return;
  const kind = res.kind === "food" ? "food" : res.kind === "amber" ? "amber" : "essence";
  pheromoneMark(kind, res.x, res.y, 1.6);
  pheromoneMark("recruit", res.x, res.y, 2.2);
  const b = antBrain(a);
  b.lastRes = { x: res.x, y: res.y, kind: res.kind };
  b.lastResT = 26;
  b.task = "coletando";
}

/** Confirma a trilha no caminho de volta (reforço positivo). */
export function reinforceTrail(a, kind) {
  pheromoneMark(kind === "essence" ? "essence" : kind === "amber" ? "amber" : "food", a.x, a.y, 0.35);
  pheromoneMark("recruit", a.x, a.y, 0.25);
}

// ------------------------------------------------------------------ utilidade -
// Cada tarefa vale um número; a formiga escolhe a maior. Os pesos misturam o
// que a COLÔNIA precisa (diretiva) com o que a FORMIGA é (personalidade).
export function pickResource(a, want) {
  const b = antBrain(a);
  const A = world.anthill;
  // Alcance do faro: perto de casa por padrão; a fome e a curiosidade esticam.
  // Com a colônia sob ataque, ninguém se aventura longe (o formigueiro é o
  // abrigo) — a colônia continua comendo, mas sem suicídio coletivo.
  const safe = 1 - Math.max(0, colony.needs.defense - 0.45) * 0.6;
  const maxD = (760 + b.traits.curiosity * 420 + colony.needs.food * 420) * safe
    + (want === "essence" ? 300 : 0);
  let best = null, bestScore = -Infinity;
  const consider = (res, kind) => {
    if (!res || res.amount <= 0 || res.blocked) return;
    const d = dist(a.x, a.y, res.x, res.y);
    if (d > maxD) return;
    // DISTÂNCIA manda (100px = 1 ponto): formiga não atravessa o mapa por
    // migalha. O resto são desempates — riqueza, trilha das irmãs e a
    // ocupação do recurso (ninguém faz fila no mesmo grão).
    let s = -d * 0.011;
    s += Math.min(8, res.amount) * 0.35;
    s += pheromoneAt(kind, res.x, res.y) * 0.8;
    s += b.traits.diligence * 0.6;
    const crew = res.workers | 0;
    if (crew > 0) s -= Math.min(3.5, crew * 0.45);
    if (b.lastRes && dist2(b.lastRes.x, b.lastRes.y, res.x, res.y) < 90 * 90) s += 1.2;
    // recurso dentro da parede do formigueiro: nem tenta (evita a trava antiga)
    if (dist(res.x, res.y, A.x, A.y) < 165) s -= 500;
    if (s > bestScore) { bestScore = s; best = res; }
  };
  if (want !== "essence") for (const p of world.piles) consider(p, "food");
  if (want !== "food") {
    for (const n of world.nodes) {
      if (n.kind === "essence") consider(n, "essence");
      else if (want === "amber" || b.traits.curiosity > 0.7) consider(n, "amber");
    }
  }
  return best;
}

/**
 * Divisão de trabalho: quantas formigas já estão em cima de cada recurso.
 * É o que impede as nove operárias de irem todas para a mesma pilha.
 */
export function countResourceCrews(allies) {
  for (const p of world.piles) p.workers = 0;
  for (const n of world.nodes) n.workers = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const t = a.pile || a.node;
    if (t && t.workers !== undefined) t.workers++;
  }
}

/** A formiga se afastou demais do posto? (evita caçada sem volta) */
function tgtFar(a, post, max) {
  const t = a.forcedTarget || a.target;
  if (!t) return false;
  return dist(t.x, t.y, post.x, post.y) > max;
}

function wanderPoint(a, b, radius) {
  const A = world.anthill;
  // exploração com viés: quem tem curiosidade alta vai longe e para o lado novo
  const ang = rand(0, TAU);
  const d = radius * (0.55 + Math.random() * 0.75);
  return { x: clamp(A.x + Math.cos(ang) * d, 40, WORLD_W - 40),
           y: clamp(A.y + Math.sin(ang) * d, 40, WORLD_H - 40) };
}

// ---------------------------------------------------------------- trabalhadoras
/**
 * Decide o que a trabalhadora faz AGORA. Devolve { kind, x, y, res }.
 * kinds: "return" | "flee" | "gather" | "follow" | "explore" | "refuge" | "rest"
 */
export function decideWorker(a, foes) {
  const b = antBrain(a);
  const A = world.anthill;
  const n = colony.needs;

  // 1) carregando: entregar é sempre prioridade (menos se o perigo é em cima)
  if (a.carry >= a.st.carry || (a.carry > 0 && a.st.carry > 0 && a.carry >= a.st.carry * 0.9)) {
    b.task = "levando comida";
    return { kind: "return" };
  }

  // 2) perigo imediato: foge para o ninho (as corajosas demoram mais a fugir)
  let threat = null, td = Infinity;
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    const d2 = dist2(a.x, a.y, f.x, f.y);
    const safe = 58 + 74 * b.traits.courage;
    if (d2 < safe * safe && d2 < td) { td = d2; threat = f; }
  }
  if (threat) {
    b.panic = 1;
    if (b.traits.courage < 0.9 || td < 70 * 70) {
      b.task = "fugindo!";
      return { kind: "flee", x: A.x, y: A.y };
    }
  } else {
    b.panic = Math.max(0, b.panic - 0.5);
  }

  // 3) DEFESA: com a colônia ameaçada, as operárias se recolhem (o ninho é seguro)
  if (colony.needs.defense > 0.88 && dist(a.x, a.y, A.x, A.y) > 380 && b.traits.courage < 0.9) {
    b.task = "recolhendo";
    return { kind: "refuge", x: A.x, y: A.y };
  }

  // 4) recurso à vista/memória: é o caminho direto, nada de rodeio
  const want = colony.directive === "ESSÊNCIA" ? "essence" : "food";
  if (a.pile && a.pile.amount > 0) { b.task = "coletando"; return { kind: "gather", res: a.pile }; }
  if (a.node && a.node.amount > 0) { b.task = "coletando"; return { kind: "gather", res: a.node }; }
  const res = pickResource(a, want);
  if (res) {
    b.task = "indo colher";
    return { kind: "gather", res };
  }

  // 5) nada no faro: segue a TRILHA deixada pelas irmãs (estigmergia)
  const trailKind = want === "essence" ? "essence" : "food";
  const g = pheromoneGradient(trailKind, a.x, a.y, 2);
  if (b.trail <= 0) b.trail = 0;      // (tempo seguindo; abaixo)
  if (g && g.strength > 0.12 && b.traits.social > 0.35 && Math.random() < 0.6 + b.traits.social * 0.3) {
    b.trail = (b.trail || 0) + 1;     // conta as tentativas seguidas
    if (b.trail < 8) {                // trilha que não leva a nada é abandonada
      b.task = "seguindo trilha";
      const step = 90 + b.traits.diligence * 40;
      return { kind: "follow", x: a.x + g.x * step, y: a.y + g.y * step };
    }
  } else {
    b.trail = 0;
  }

  // 6) nada por perto: explora (cada uma para um lado, sem colar no ninho)
  if (!b.wander || b.wanderT <= 0 || dist2(a.x, a.y, b.wander.x, b.wander.y) < 60 * 60) {
    b.wander = wanderPoint(a, b, 260 + b.traits.curiosity * 520);
    b.wanderT = 6 + Math.random() * 6;
  }
  if (b.fatigue > 14 && colony.needs.food < 0.5 && b.traits.diligence < 0.8
      && dist2(a.x, a.y, A.x, A.y) < 320 * 320 && Math.random() < 0.4) {
    b.task = "descansando";
    return { kind: "rest", x: A.x + rand(-90, 90), y: A.y + rand(-90, 90) };
  }
  b.task = "explorando";
  return { kind: "explore", x: b.wander.x, y: b.wander.y };
}

// ------------------------------------------------------------------ lutadores
/** Escolhe o alvo do combatente: foco coletivo > ameaça perto > patrulha. */
export function decideFighter(a, foes) {
  const b = antBrain(a);
  const A = world.anthill;
  const st = a.st || {};
  // faro de combate: mesma base do jogo (aggro da classe ou 260), temperado
  // pela curiosidade individual — a variação é pequena de propósito
  const sight = (st.aggro > 0 ? st.aggro : 260) * (0.9 + b.traits.curiosity * 0.22);

  // o foco da colônia vale mais para quem é sociável (lobo solitário caça sozinho)
  const focusAlive = colony.focus && !colony.focus.dead && !colony.focus.dying;
  const focusD = focusAlive ? dist(a.x, a.y, colony.focus.x, colony.focus.y) : Infinity;

  let near = null, nd = Infinity;
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    const d2 = dist2(a.x, a.y, f.x, f.y);
    if (d2 < nd) { nd = d2; near = f; }
  }
  const nearD = Math.sqrt(nd);

  // ameaça colada: ninguém ignora um inimigo no colo
  const contact = st.range + (near ? (near.bodyR || 14) : 0) + 22;
  if (near && nearD < contact) {
    b.task = "defendendo";
    return { kind: "attack", target: near };
  }

  // ---------------------------------------------------------------- CERCO ---
  // A guarda NÃO corre atrás da horda pelo mapa: ela segura o anel do
  // formigueiro e só avança quando o inimigo encosta (é assim que a colônia
  // sobrevive — sair em fila indiana uma de cada vez é morrer uma de cada vez).
  const post = a.guardPos || A;
  const postD = dist(a.x, a.y, post.x, post.y);
  const guardRing = 300 + b.traits.courage * 140;
  const socialPull = 200 + b.traits.social * 380;
  const focusFromPost = focusAlive ? dist(post.x, post.y, colony.focus.x, colony.focus.y) : Infinity;
  const focusSeen = focusAlive && focusD < sight;
  const focusHome = focusAlive && focusFromPost < guardRing;
  const nearSeen = near && nearD < sight;
  const nearHome = near && dist(post.x, post.y, near.x, near.y) < guardRing && postD < guardRing * 1.6;

  if (focusAlive && (focusSeen || focusHome) && b.traits.social > 0.3) {
    b.task = "atacando em grupo";
    return { kind: focusD > sight * 1.6 ? "march" : "attack", target: colony.focus };
  }
  if (nearSeen || nearHome) {
    b.task = "caçando";
    b.seen = near; b.seenT = 5;
    return { kind: "attack", target: near };
  }
  // perseguição longa demais: volta para o posto (a colônia fica em primeiro)
  if (a.state === "chase" && tgtFar(a, post, 620)) {
    b.task = "voltando ao posto";
    return { kind: "home", x: post.x, y: post.y };
  }

  // batedoras: patrulham longe e MARCAVAM o inimigo para a colônia
  if (a.type === "scout") {
    if (near) {
      b.task = "marcando alvo";
      colony.scoutMark = near;
      return { kind: "attack", target: near };
    }
    b.task = "patrulhando";
    if (!b.wander || b.wanderT <= 0 || dist2(a.x, a.y, b.wander.x, b.wander.y) < 90 * 90) {
      b.wander = wanderPoint(a, b, 480 + b.traits.curiosity * 420);
      b.wanderT = 5 + Math.random() * 5;
    }
    return { kind: "patrol", x: b.wander.x, y: b.wander.y };
  }

  // guarda: sentinela no anel do formigueiro, com setores próprios (ninguém empilha)
  const gp = a.guardPos || A;
  const homeDist = dist(a.x, a.y, gp.x, gp.y);
  if (homeDist > 46) {
    b.task = "voltando ao posto";
    // posto individual: cada uma ocupa um ângulo próprio do anel da guarda
    const ang = (a.id * 2.399) + colony.t * 0.05;
    const r = 190 + (a.id % 5) * 46;
    return { kind: "home", x: gp.x + Math.cos(ang) * r * 0.35, y: gp.y + Math.sin(ang) * r * 0.35 };
  }
  b.task = "de guarda";
  if (chance(0.25)) {
    b.home.x += rand(-26, 26); b.home.y += rand(-26, 26);
  }
  return { kind: "idle" };
}

/** Setor de cerco: cada combatente cerca o alvo por um ângulo diferente. */
export function squadSlot(a, target) {
  const b = antBrain(a);
  if (!b.slot || b.slotT <= 0 || b.slotTarget !== target) {
    // O setor é escolhido como o SETOR MAIS PERTO de onde a formiga já está
    // (medido do alvo). Assim ela cerca o bicho em vez de dar a volta nele —
    // rodear custava segundos de mordida e era o que matava a linha de frente.
    const bearing = Math.atan2(a.y - target.y, a.x - target.x);
    const sector = Math.round(bearing / (TAU / 12)) * (TAU / 12);
    b.slot = sector + rand(-0.1, 0.1);
    b.slotT = 3.2;
    b.slotTarget = target;
  }
  const melee = !(a.def.projSpeed);
  // O raio do setor fica DENTRO do alcance de ataque: fora dele a formiga
  // ficaria orbitando a presa sem nunca morder (era o que acontecia).
  const r = melee
    ? (target.bodyR || 16) + clamp((a.st.range || 17) * 0.5, 5, 26)
    : (a.st.range || 100) * 0.8;
  return { x: target.x + Math.cos(b.slot) * r, y: target.y + Math.sin(b.slot) * r };
}

// ----------------------------------------------------------------- curandeiras
/** Triagem: a irmã mais machucada que ela consegue alcançar. */
export function decideHealTarget(a, allies) {
  const b = antBrain(a);
  const range = (a.st.healRange || 220) * (0.9 + b.traits.curiosity * 0.35);
  let best = null, score = 0;
  for (const o of allies) {
    if (o === a || o.dead || o.dying) continue;
    const d = dist(a.x, a.y, o.x, o.y);
    if (d > range) continue;
    const frac = o.maxHp > 0 ? o.hp / o.maxHp : 1;
    if (frac > 0.985) continue;
    // urgência: quem está pior primeiro; a rainha e os tanques valem mais
    let s = (1 - frac) * 100;
    if (o.type === "queen") s += 55;
    if (o.def && o.def.taunt) s += 12;
    if (o.selected) s += 6;
    s -= d * 0.05;
    if (s > score) { score = s; best = o; }
  }
  b.task = best ? "curando " + (best.type || "") : "sem feridos";
  return best;
}

// ------------------------------------------------------------- pensamento chão
/**
 * Um tique do cérebro coletivo: mede necessidades, publica a diretriz, decide
 * o foco de ataque e deixa o cheiro decair. Chamado 1x por frame (units.js).
 */
export function colonyTick(dt, ctx) {
  colony.t += dt * 1;
  pheromoneTick(dt);
  colony.alarm.t = Math.max(0, colony.alarm.t - dt);
  colony.focusT = Math.max(0, colony.focusT - dt);

  // foco morreu? zera
  if (colony.focus && (colony.focus.dead || colony.focus.dying)) {
    colony.focus = null; colony.focusT = 0;
  }

  // ------------------------------------------------ censo (a cada 0.4s dá)
  colony.think -= dt;
  if (colony.think > 0) return;
  const step = 0.4 - colony.think;
  colony.think = 0.4;

  const run = ctx.run || G.run || {};
  const allies = ctx.allies || [];
  const foes = ctx.foes || [];
  const A = world.anthill;
  const queen = ctx.queen;

  let workers = 0, fighters = 0, carriers = 0, idle = 0, scouts = 0, nurses = 0;
  let wounded = 0, hpSum = 0, hpMax = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const role = a.def ? a.def.role : "worker";
    hpSum += a.hp; hpMax += a.maxHp;
    if (a.hp < a.maxHp * 0.75) wounded++;
    if (role === "worker") { workers++; if (a.carry > 0) carriers++; if (a.state === "idle") idle++; }
    else if (role === "healer") nurses++;
    else { fighters++; if (a.type === "scout") scouts++; }
    antBrain(a).wanderT = Math.max(0, antBrain(a).wanderT - step);
    if (antBrain(a).lastResT > 0) antBrain(a).lastResT -= step;
    const b = antBrain(a);
    b.slotT = Math.max(0, b.slotT - step);
    if (b.fatigue > 0) b.fatigue = Math.max(0, b.fatigue - step * (0.4 + b.traits.diligence * 0.5));
  }
  countResourceCrews(allies);
  colony.carriers = carriers; colony.fighters = fighters;
  colony.idle = idle; colony.scouts = scouts; colony.nurses = nurses;
  colony.wounded = wounded;

  // ---------------------------------------------------------------- ameaças --
  let threats = 0, tx = 0, ty = 0, nearNest = 0;
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    const dNest = dist(f.x, f.y, A.x, A.y);
    const dColony = (() => {
      let bd = Infinity;
      for (const a of allies) {
        if (a.dead || a.dying) continue;
        const d = dist2(f.x, f.y, a.x, a.y);
        if (d < bd) bd = d;
      }
      return Math.sqrt(bd);
    })();
    if (dNest < 900 || dColony < 420) {
      threats += dNest < 420 ? 2.2 : 1;
      tx += f.x; ty += f.y;
      if (dNest < 520) nearNest++;
      // o cheiro do bicho aterroriza a vizinhança (as operárias sentem de longe)
      if (chance(0.2)) pheromoneMark("danger", f.x + rand(-40, 40), f.y + rand(-40, 40), 0.5);
    }
  }
  colony.threats = threats;
  if (threats > 0) {
    colony.frontline.x = tx / Math.max(1, threats); colony.frontline.y = ty / Math.max(1, threats);
    colony.frontline.t = 3;
  } else if (colony.frontline.t > 0) colony.frontline.t -= step;

  // foco de ataque: o inimigo mais perigoso perto do ninho, ou o que a
  // batedora marcou, ou o que mais inimigos tem em volta (aglomeração)
  if (!colony.focus || colony.focusT <= 0) {
    let best = null, bs = -Infinity;
    for (const f of foes) {
      if (f.dead || f.dying) continue;
      const dNest = dist(f.x, f.y, A.x, A.y);
      if (dNest > 1200 && f !== colony.scoutMark) continue;
      let s = 900 - dNest * 0.5 - (f.hp / Math.max(1, f.maxHp || 1)) * 120;
      if (f === colony.scoutMark) s += 220;
      if (f.isBoss) s += 90;
      let crowd = 0;
      for (const o of foes) if (o !== f && !o.dead && dist2(f.x, f.y, o.x, o.y) < 190 * 190) crowd++;
      s += Math.min(6, crowd) * 26;                 // área: bombardeia onde tem mais
      if (s > bs) { bs = s; best = f; }
    }
    if (best) {
      const first = !colony.focus;
      colony.focus = best;
      colony.focusT = 6.5;
      colony.focusCalls++;
      if (first || colony.focusCalls % 4 === 0) log("foco de ataque: " + (best.kind || best.type || "inimigo"));
    }
  }

  // ------------------------------------------------------------- necessidades -
  const food = run.food || 0;
  const costFloor = 90 + (run.wave || 0) * 6 + workers * 18;
  const foodNeed = clamp(1 - food / Math.max(60, costFloor), 0, 1);
  const essenceNeed = clamp((160 - (run.essencePool || 0)) / 160, 0, 1) * (foodNeed < 0.75 ? 1 : 0.25);
  const defenseNeed = clamp(threats * 0.22 + colony.alarm.t * 0.14 + (nearNest > 0 ? 0.35 : 0), 0, 1);
  const healNeed = clamp(wounded / Math.max(3, allies.length * 0.5), 0, 1);
  const queenLow = queen && !queen.dead && queen.hp < queen.maxHp * 0.45;

  colony.needs.food = foodNeed;
  colony.needs.essence = essenceNeed;
  colony.needs.defense = defenseNeed;
  colony.needs.heal = healNeed;

  // --------------------------------------------------------------- diretriz --
  let dir = "EXPLORAR";
  if (defenseNeed > 0.6 || (queenLow && threats > 0)) dir = "DEFESA";
  else if (healNeed > 0.55) dir = "CURA";
  else if (foodNeed > 0.35) dir = "COMIDA";
  else if (essenceNeed > 0.55) dir = "ESSÊNCIA";
  else if (idle > workers * 0.5 && workers > 0) dir = "COMIDA";

  if (dir !== colony.directive) {
    colony.directive = dir;
    colony.directiveT = 0;
    log("diretriz: " + dir);
  } else colony.directiveT += step;

  colony.mood = colony.alarm.t > 4.5 || nearNest > 1 ? "PÂNICO"
    : defenseNeed > 0.5 ? "ALERTA"
    : workers > 0 && idle < workers * 0.5 ? "TRABALHO" : "CALMA";

  // ------------------------------------- a rainha pede: "mais operárias no ninho"
  // (o formigueiro usa isso para escalar carregadoras em época de aperto)
  colony.wantCarriers = foodNeed > 0.5 ? 6 : foodNeed > 0.25 ? 4 : 3;
}

/** Resumo para o HUD (uma linha de status da colônia). */
export function colonyStatus() {
  return {
    directive: colony.directive,
    mood: colony.mood,
    focus: colony.focus ? (colony.focus.kind || colony.focus.type || "inimigo") : null,
    threats: Math.round(colony.threats),
    idle: colony.idle,
    workers: colony.carriers,
  };
}
