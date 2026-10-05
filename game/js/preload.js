// ============================================================================
// FUMIGA — PRÉ-CARREGAMENTO DO TITLE (Regra 14)
//
// No TITLE, prepara por trás tudo o que os botões dele abrem, para nenhum
// precisar de tela de carregamento (nem na ida, nem na volta):
//   1. Árvore da Evolução — pesos de cor por pixel + 1º assado (tree_art.js)
//   2. frutos — maçãs da árvore (cinza nos bloqueados) e do santuário, flores (meta.js)
//   3. os 7 santuários — download (~5,7 MB) + cor do jardim (meta.js)
//   4. camadas pintadas da NOITE BRANCA (10 PNGs 320×180, ~0,6 MB), por último (cutscenes.js)
//
// Como o GDevelop (baixa as cenas seguintes enquanto o jogador está no menu) e
// o Terraria/tModLoader (texturas assíncronas, porque pedir na hora "derruba 2
// ou 3 frames"): downloads em paralelo e CPU em fatias de poucos ms por quadro,
// então o TITLE segue a 60 FPS. Clicou antes do fim? A tela abre na hora: cada
// módulo termina o que faltar ali mesmo e imagens a caminho entram com fade.
//
// Cada tarefa é um gerador: `yield` = "fiz uma fatia"; `yield promessa` =
// "espere a rede/decodificação" (a tarefa fica parada sem gastar quadro e as
// outras seguem). A ordem da fila é a prioridade.
// ============================================================================
import { FRUIT_TREES } from "./config.js";
import { loadSantuario } from "./assets.js";
import { fruitAssetName } from "./tree_layout.js";
import { treeArtSteps } from "./tree_art.js";
import { fruitAppleSteps, fruitFlowerSteps, sanctuarySteps } from "./meta.js";
import { cutsceneLayerSteps } from "./cutscenes.js";

const isNodeTest = typeof process !== "undefined" && !!process.versions && !!process.versions.node;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const queue = [];   // { it, waiting, value }
const stats = { started: false, total: 0, done: 0, workMs: 0, sliceMaxMs: 0, online: true };

/** Começa uma vez por sessão, ao chegar no TITLE. Não roda nos testes de lógica. */
export function startTitlePreload() {
  if (stats.started) return false;
  stats.started = true;
  if (isNodeTest || typeof document === "undefined") return false;
  // Sem rede, prepara só o que já está na memória; santuários e camadas vêm do
  // cache do app instalado quando abertos (sem pedidos falhando à toa).
  stats.online = typeof navigator === "undefined" || navigator.onLine !== false;
  // Ordem = prioridade: primeiro o que a ÁRVORE mostra, depois os santuários.
  const jobs = [treeArtSteps()];
  for (const fruit of FRUIT_TREES) jobs.push(fruitAppleSteps(fruit));
  for (const fruit of FRUIT_TREES) jobs.push(fruitFlowerSteps(fruit));
  if (stats.online) {
    // Os 7 downloads começam já, em paralelo com a CPU da árvore.
    const downloads = FRUIT_TREES.map((fruit) => loadSantuario(fruitAssetName(fruit)).catch(() => null));
    for (const fruit of FRUIT_TREES) jobs.push(sanctuarySteps(fruit));
    jobs.push(noiteBranca(downloads));
  }
  for (const it of jobs) if (it) queue.push({ it, waiting: false, value: undefined });
  stats.total = queue.length;
  return true;
}

// A Noite Branca só entra na rede depois dos santuários (mais usados), para
// não disputar banda com eles.
function* noiteBranca(downloads) {
  yield Promise.all(downloads);
  yield* cutsceneLayerSteps("noite_branca");
}

/** Avança a fila por até `budgetMs` neste quadro. Fila vazia = custo zero. */
export function pumpPreload(budgetMs = 5) {
  if (!queue.length) return;
  const t0 = now(), end = t0 + budgetMs;
  let i = 0;
  while (i < queue.length && now() < end) {
    const job = queue[i];
    if (job.waiting) { i++; continue; }
    let step;
    try { step = job.it.next(job.value); }
    catch (e) { console.error("[pré-carregamento]", e); step = { done: true }; }
    job.value = undefined;
    if (step.done) { queue.splice(i, 1); stats.done++; continue; }
    const v = step.value;
    if (v && typeof v.then === "function") {
      job.waiting = true;
      v.then((r) => { job.value = r; job.waiting = false; }, () => { job.value = null; job.waiting = false; });
      i++;
    }
  }
  const spent = now() - t0;
  stats.workMs += spent;
  if (spent > stats.sliceMaxMs) stats.sliceMaxMs = spent;
}

/** Diagnóstico (testes/debug): quanto já foi preparado e o custo por quadro. */
export function preloadState() {
  return { ...stats, pending: queue.length, finished: stats.started && !queue.length };
}
