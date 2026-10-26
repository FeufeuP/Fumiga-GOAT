// Verificação do FRAME PIXEL CELESTE (fase F0b) — Node puro, sem navegador.
// Uso: node game/test/pixel-frame.mjs
//
// Confere o que a F0b prometeu e o que o runtime agora faz:
//   • buffer 320x180 ampliado x3, tile 8x8, zoom inteiro 1x/2x/3x;
//   • a paleta de execução é a mesma de docs/arte/paleta-celeste.json;
//   • o chão é assado numa grade de tiles 8x8 e desenhado em escala inteira;
//   • a vinheta borrada saiu do caminho do mundo (virou máscara de 1 px);
//   • o frame NÃO é uma opção de vídeo — é o estilo do jogo (decisão do usuário).
// Não prova nitidez, FPS nem leitura visual: isso é inspeção no navegador.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ------------------------------------------------------------------ stubs ---
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: null }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (typeof p === "string" && p in t) return t[p];
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

const ROOT = new URL("../../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");

// ------------------------------------------------------------------ frame ---
const px = await import("../js/pixel_celeste.js");
assert.deepEqual([px.BUFFER_W, px.BUFFER_H], [320, 180], "buffer de jogo 320x180");
assert.equal(px.SCALE, 3, "ampliação inteira x3");
assert.equal(px.BUFFER_W * px.SCALE, 960, "largura fecha com o canvas");
assert.equal(px.BUFFER_H * px.SCALE, 540, "altura fecha com o canvas");
assert.equal(px.TILE, 8, "tile de 8x8");
assert.equal(px.WORLD_PER_PX, 3, "1 px de buffer = 3 unidades de mundo no zoom 1");
assert.equal(px.TILE_WORLD, px.TILE * px.WORLD_PER_PX, "tile = 8 px x 3 = 24 unidades");
assert.equal(px.TILE_WORLD, 24, "o contrato pede 24 unidades por tile");
assert.deepEqual(px.ZOOM_LEVELS, [1, 2, 3], "só zoom inteiro");
assert.equal(px.ZOOM_DEFAULT, 1, "zoom padrão é o nativo");
for (const z of px.ZOOM_LEVELS) assert(Number.isInteger(z) && z > 0, `zoom ${z} é inteiro`);
assert.equal(px.PIP_SCALE, 2, "a janela OLHO LÁ FORA amplia por inteiro");

// ------------------------------------------------------------------ paleta --
const doc = JSON.parse(read("docs/arte/paleta-celeste.json"));
// Só as cores entram na comparação: o JSON traz também nome/status/avisos, que
// são documentação e não precisam morar no runtime.
const CORES = ["fundo", "infill", "terreno", "borda", "musgo", "trilha", "acento", "vegetacao"];
const soCores = (biomas) => Object.fromEntries(Object.entries(biomas)
  .map(([id, b]) => [id, Object.fromEntries(CORES.map((k) => [k, b[k]]))]));
assert.deepEqual(soCores(px.PALETA_CELESTE), soCores(doc.biomas),
  "a paleta de execução é idêntica à de docs/arte/paleta-celeste.json");
assert.deepEqual(Object.keys(px.PALETA_CELESTE).sort(), Object.keys(doc.biomas).sort(),
  "os mesmos sete biomas nos dois lugares");
for (const [id, b] of Object.entries(px.PALETA_CELESTE)) {
  const cena = [b.infill, ...b.terreno, b.borda, ...b.musgo, b.trilha, ...b.acento, ...b.vegetacao];
  assert.equal(cena.length, 16, `${id}: 16 cores de cena`);
  assert.equal(b.fundo.length, 3, `${id}: 3 cores de fundo`);
  assert.equal(px.paletteColors(id).length, 19, `${id}: 16 de cena + 3 de fundo`);
  assert(!cena.includes("#000000"), `${id}: sem preto puro de cena`);
}
assert.equal(px.paletteFor("inexistente"), px.PALETA_CELESTE.planicie, "bioma desconhecido cai na Planície");

// ------------------------------------------------------------------ zoom ----
const { cam, camReset, zoomCam, quantizeZoom } = await import("../js/camera.js");
camReset();
assert.equal(cam.zoom, px.ZOOM_DEFAULT, "a câmera começa no zoom nativo");
assert.deepEqual([cam.minZoom, cam.maxZoom], [1, 3], "faixa de zoom é a escada inteira");
assert(px.ZOOM_LEVELS.includes(cam.zoom), "zoom inicial é permitido");
assert.equal(quantizeZoom(0.7), 1, "zoom abaixo de 1 prende em 1");
assert.equal(quantizeZoom(1.6), 2, "meio do caminho prende no mais próximo");
assert.equal(quantizeZoom(99), 3, "zoom acima do teto prende em 3");
assert.equal(quantizeZoom(2.4), 2, "2,4 prende em 2");
// a roda só anda por degraus inteiros, e nunca sai da escada
let passos = 0;
for (let i = 0; i < 8; i++) { zoomCam(-1, 480, 270); passos++; assert(px.ZOOM_LEVELS.includes(cam.zoom), "degrau inteiro"); }
assert.equal(cam.zoom, 3, "oitava aproximada chega ao topo da escada");
for (let i = 0; i < 8; i++) { zoomCam(1, 480, 270); assert(px.ZOOM_LEVELS.includes(cam.zoom), "degrau inteiro"); }
assert.equal(cam.zoom, 1, "oitava afastada volta à base da escada");
assert(passos === 8, "cada giro da roda é um degrau");

// ------------------------------------------------------------- castas -------
// nativo = round(mundo/3) e o desenho usa nativo x 3 x zoom_inteiro: no zoom 1
// o sprite aparece exatamente no tamanho nativo do contrato.
const { ANT_SIZES } = await import("../js/config.js");
const contratos = JSON.parse(read("docs/arte/contratos-pixel.json"));
// A POTE-DE-MEL (gatherer) reusa o assado da operária — mesma conta, outra chave.
const ASSADO = { ...ANT_SIZES, gatherer: ANT_SIZES.worker };
for (const [id, c] of Object.entries(contratos.castas)) {
  assert.equal(c.nativo, Math.round(ASSADO[id] / px.SCALE), `${id}: nativo = round(mundo/3)`);
  // No zoom 1 o sprite é desenhado com o tamanho do mundo em px de tela, o que
  // dá o tamanho nativo em px de buffer — a diferença é só o arredondamento.
  assert(Math.abs(c.nativo * px.SCALE - ASSADO[id]) <= 1,
    `${id}: nativo x 3 fecha com o tamanho assado (${c.nativo * px.SCALE} ~ ${ANT_SIZES[id]})`);
}

// ----------------------------------------------------------------- chão -----
const { genWorld, world } = await import("../js/world.js");
const { MAPS } = await import("../js/config.js");
for (let m = 0; m < 6; m++) {
  genWorld(20261026 + m, m);
  const g = world.ground;
  assert(g, `mapa ${m}: chão assado`);
  assert.equal(g.width % px.TILE, 0, `mapa ${m}: largura do chão é múltipla do tile`);
  assert.equal(g.height % px.TILE, 0, `mapa ${m}: altura do chão é múltipla do tile`);
  assert(Math.abs(g.width - 1067) <= px.TILE, `mapa ${m}: largura perto dos 1067 px do contrato`);
  assert(Math.abs(g.height - 800) <= px.TILE, `mapa ${m}: altura perto dos 800 px do contrato`);
  const cols = g.width / px.TILE, rows = g.height / px.TILE;
  assert(cols * px.TILE_WORLD >= 3200, `mapa ${m}: a grade cobre o mundo na largura`);
  assert(rows * px.TILE_WORLD >= 2400, `mapa ${m}: a grade cobre o mundo na altura`);
  assert.equal(MAPS[m].id, world.def.id, `mapa ${m}: bioma ativo`);
}
genWorld(20261026, 0);

// --------------------------------------------------------------- fontes -----
const render = read("game/js/render.js");
assert(render.includes("beginRunView(") && render.includes("endRunView("),
  "o mundo da expedição passa pelo buffer");
assert(!render.includes("createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.36"),
  "a vinheta borrada saiu do caminho do mundo");
assert(render.includes("vignetteMask()"), "a vinheta agora é a máscara de 1 px com dither");
assert(render.includes("world.ground.width * WORLD_PER_PX * zoom"),
  "o chão é desenhado na largura nativa x ampliação inteira");
assert(/const b = beginWorld\(z, cxV - A\.x \* z/.test(render),
  "a janela OLHO LÁ FORA reaproveita o mesmo buffer");

const fog = read("game/js/fog.js");
assert(fog.includes("pixelWorldPass()"), "a névoa respeita a passada de mundo (sem suavização)");

const worldSrc = read("game/js/world.js");
assert(worldSrc.includes("quantizeToPalette("), "o chão termina preso na paleta do bioma");
assert(worldSrc.includes("paletteColors(biome.id)"), "a paleta do chão é a do bioma");
assert(worldSrc.includes("MAT_RAISE"), "o autotile conhece o relevo de cada material");

// o frame NÃO é chave de opção: decisão do usuário em 2026-10-26.
// Procura o item de menu em si (label/id), não a menção ao estilo — comentário
// que cita PIXEL CELESTE é documentação, botão que oferece ligar/desligar não.
for (const [nome, src] of [["game.js", read("game/js/game.js")], ["ui.js", read("game/js/ui.js")]]) {
  assert(!/label:\s*["\[]?\s*PIXEL CELESTE/i.test(src), `${nome}: o frame não virou item de menu`);
  assert(!/id:\s*"vid_(pixel|celeste)/i.test(src), `${nome}: sem chave de vídeo para o frame`);
}
assert(!read("game/js/state.js").includes("pixelCeleste"), "nenhuma chave de save liga/desliga o frame");
const videoItems = read("game/js/game.js").match(/id: "vid_[a-z]+"/g) || [];
assert.deepEqual([...new Set(videoItems)].sort(),
  ['id: "vid_particles"', 'id: "vid_psx"', 'id: "vid_scanline"', 'id: "vid_screenshake"'].sort(),
  "o menu VÍDEO continua com as quatro opções de sempre (sem PIXEL CELESTE)");

// ------------------------------------------------------- paleta normativa ----
// A fonte da verdade é docs/arte/paleta-celeste.json. O pacote do jogo carrega
// uma cópia gerada por tools/sync_paleta.mjs e o runtime a lê no boot. Se a
// cópia divergir, ou se o JSON vier corrompido, o boot não pode quebrar: a
// paleta de segurança de pixel_celeste.js continua valendo.
const paletaDocs = JSON.parse(read("docs/arte/paleta-celeste.json"));
const paletaJogo = JSON.parse(read("game/assets/paleta-celeste.json"));
assert.deepEqual(paletaJogo, paletaDocs, "a cópia do pacote é idêntica à paleta normativa");
// A comparação acima é a mesma que a ferramenta faz — e a ferramenta é quem
// regenera a cópia. Conferir as duas coisas: se alguém mudar o sync e ele
// parar de copiar, a igualdade acima continua valendo por acidente.
execFileSync(process.execPath, ["tools/sync_paleta.mjs", "--check"],
  { cwd: fileURLToPath(new URL("../../", import.meta.url)), stdio: "pipe" });
console.log("ok    paleta normativa — docs/arte/paleta-celeste.json é a fonte e tools/sync_paleta.mjs --check passa");
assert.deepEqual(soCores(px.PALETA_CELESTE), soCores(paletaDocs.biomas),
  "a paleta de segurança do runtime é igual à normativa");
assert.equal(px.paletaFonte, "seguranca", "antes de ler, vale a paleta de segurança");
assert.equal(px.loadPalette(paletaJogo), true, "o JSON do pacote é aceito pelo runtime");
assert.equal(px.paletaFonte, "json", "depois de lido, a origem é o JSON");
assert.deepEqual(soCores(px.PALETA_CELESTE), soCores(paletaJogo.biomas),
  "depois de lido, o runtime usa o JSON, não o literal");
const planicieOk = paletaJogo.biomas.planicie;
for (const ruim of [
  null, undefined, 42, {},
  { biomas: null }, { biomas: {} },                                  // sem a Planície
  { biomas: { planicie: null } },
  { biomas: { planicie: { ...planicieOk, borda: "azul" } } },        // cor inválida
  { biomas: { planicie: { ...planicieOk, acento: ["#ffffff"] } } },  // 17 em vez de 19
]) {
  assert.equal(px.loadPalette(ruim), false, `JSON inválido é recusado: ${JSON.stringify(ruim)?.slice(0, 40)}`);
}
assert.deepEqual(soCores(px.PALETA_CELESTE), soCores(paletaJogo.biomas),
  "a paleta válida continua no lugar depois das recusas");

// ------------------------------------- formigas: um frame, tamanho nativo ----
// Decisão do usuário (2026-10-26): "as formigas por enquanto só precisam de um
// frame cada". Assadas no tamanho NATIVO (o do buffer) e ampliadas por um passo
// INTEIRO — é o que faz 1 px do assado cair em 1 px do buffer.
const { ANT_NATIVE, PIXEL_SCALE } = await import("../js/config.js");
const { ANT_ANGLES } = await import("../js/assets.js");
assert.equal(ANT_ANGLES, 1, "as formigas assam um frame cada (não 24 rotações)");
assert.equal(PIXEL_SCALE, px.SCALE, "a ampliação do frame é a mesma em config.js e no módulo");
for (const [k, mundo] of Object.entries(ANT_SIZES)) {
  assert.equal(ANT_NATIVE[k], Math.round(mundo / PIXEL_SCALE), `${k}: assado nativo = round(${mundo}/${PIXEL_SCALE})`);
}
const mainSrc = read("game/js/main.js");
assert(mainSrc.includes("Object.entries(ANT_NATIVE)"), "o boot assa as formigas no tamanho nativo");
assert(mainSrc.includes("ANT_ANGLES"), "o boot assa um frame por formiga");
assert(mainSrc.includes("setRotScale(k, 1)"), "1 px de assado = 1 px de buffer na ampliação");
assert(mainSrc.includes('loadPaletteUrl(assetUrl("paleta-celeste.json"))'), "o boot lê a paleta do pacote");

// -------------------------------------------- o frame nasce visível (VÍDEO) --
// Decisão do usuário (2026-10-26): o filtro PS1 e as scanlines são pintados POR
// CIMA do canvas e desfazem o frame pixel — os blocos 3x3 do mundo caem de 100%
// de uniformidade (no canvas) para 1% (na tela). Os dois nascem DESLIGADOS; as
// opções continuam vivas em OPÇÕES → VÍDEO, e quem religar não é incomodado.
const slot = new Map();
const localStorageAntigo = globalThis.localStorage;
globalThis.localStorage = {
  getItem: (k) => (slot.has(k) ? slot.get(k) : null),
  setItem: (k, v) => slot.set(k, String(v)),
  removeItem: (k) => slot.delete(k),
};
const st = await import("../js/state.js");
assert.equal(st.G.save.settings.psx, 0, "o filtro PS1 nasce desligado");
assert.equal(st.G.save.settings.scanline, false, "as scanlines nascem desligadas");
assert.equal(st.G.save.pixelFrame, 1, "save novo já nasce com a marca do frame pixel");

// migração única: save gravado antes do frame pixel recebe o novo padrão
slot.set("fumiga_goat_save_v1", JSON.stringify({ settings: { psx: 1, scanline: true } }));
assert.equal(st.loadSave(), true, "save antigo carrega sem erro");
assert.equal(st.G.save.settings.psx, 0, "save antigo migra o PS1 para desligado");
assert.equal(st.G.save.settings.scanline, false, "save antigo migra as scanlines para desligadas");
assert.equal(st.G.save.pixelFrame, 1, "a migração marca o save (acontece uma vez só)");

// depois de marcado, a escolha do jogador é soberana
slot.set("fumiga_goat_save_v1", JSON.stringify({ pixelFrame: 1, settings: { psx: 1, scanline: true } }));
st.loadSave();
assert.equal(st.G.save.settings.psx, 1, "quem religou o PS1 não é mais incomodado");
assert.equal(st.G.save.settings.scanline, true, "quem religou as scanlines não é mais incomodado");
globalThis.localStorage = localStorageAntigo;

// ------------------------------- quem desenha por cima do buffer (HUD) -------
// A sangria devolve o resto da câmera como deslocamento INTEIRO de tela: o
// mundo composto não cai exatamente onde a matemática de tela diz. Quem desenha
// em resolução cheia POR CIMA do buffer tem de saber disso, senão sai até 3 px
// fora do mundo (o overlay de feromônio era o único caso).
const vazio = px.frameShift();
assert.deepEqual({ x: vazio.x, y: vazio.y }, { x: 0, y: 0 }, "sem composição, o deslocamento é zero");
const lore = read("game/js/lore_hud.js");
assert(lore.includes("frameShift()"), "o overlay de feromônio lê o deslocamento do frame");
assert(/turno\.x!==fogTX/.test(lore), "a chave de cache do overlay inclui o deslocamento");
assert(/sx-turno\.x/.test(lore), "o overlay amostra o mundo na posição já deslocada");

// ------------------------------------------------------------ composição ----
// A matemática da sangria: a translação do buffer é inteira e o resto volta
// como deslocamento INTEIRO de tela (nunca fracionário).
for (const ax of [0, 480, -520, 137.4, -91.9, 959.7]) {
  const k = Math.round(ax / px.SCALE);
  const sub = Math.round(ax - px.SCALE * k);
  assert(Number.isInteger(sub) && Math.abs(sub) <= 2, `deslocamento de tela inteiro para ax=${ax}`);
  assert(Math.abs(sub) <= px.SCALE, `o deslocamento cabe na sangria (ax=${ax})`);
  const r = k - ax / px.SCALE;
  assert(Math.abs(r) <= 0.5, `resto fracionário dentro de meio pixel (ax=${ax})`);
}

console.log("ok    frame 320x180 x3, tile 8x8, zoom 1x/2x/3x e paleta idêntica ao contrato");
console.log("ok    chão assado em grade de tiles 8x8 nos 6 biomas, preso na paleta");
console.log("ok    vinheta em máscara de 1 px, névoa sem suavização e PiP no mesmo buffer");
console.log("ok    PS1 e scanlines nascem desligados e saves antigos migram uma vez");
console.log("ok    paleta lida de paleta-celeste.json (com rede de segurança) e formigas em 1 frame nativo");
console.log("FRAME PIXEL CELESTE OK — F0b (buffer, zoom inteiro e autotile 8x8) no runtime");
