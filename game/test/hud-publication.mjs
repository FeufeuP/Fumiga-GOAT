// Verificação dos HUDs em produção — recomeço ZERO (2026-10-19).
//
// O lote antigo (docs/arte/hud-publicacao.json, hud-sem-fundo.json,
// hud-duas-pecas.json) fica como HISTÓRIA datada: registra o que foi publicado
// em 2026-10-09/16 e não é reapontado para a arte nova. O que roda hoje é o
// conjunto de 15 HUDs de docs/arte/huds-zero.json, em 2 peças.
//
// Além de hash/tamanho, este teste protege o bug que o usuário viu em
// 2026-10-19: "todos ficaram com um quadrado branco atrás".
//   * `bg.border_alpha_max`/`corner_alpha_max` = 0  → o fundo de papel NÃO
//     existe fora da janela da moldura (nada de chapa creme nas bordas).
//   * `bg.center_alpha_min` = 255                   → onde o texto é desenhado
//     o papel é opaco (legibilidade preservada).
//   * `frame.blue_leak` = 0                         → nenhum pixel transparente
//     carrega o azul do chroma #0000FF (halo azul ao reduzir a moldura).
//   * `frame.center_opaque_ratio` baixo             → moldura realmente vazada.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root));
const text = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const zero = JSON.parse(text('docs/arte/huds-zero.json'));
const assetsJs = text('game/js/assets.js');
const paper = text('game/js/paper_hud.js');
const KINDS = ['panel', 'expanded', 'tutorial', 'nest_tip', 'banner', 'boss', 'event',
  'header', 'minimap', 'transition', 'tooltip', 'health', 'card', 'tree_detail', 'pause'];

assert.equal(zero.huds.length, 15, '15 HUDs no recomeço ZERO');
assert.equal(zero.pieces, 15, '15 famílias de 2 peças');

for (const kind of KINDS) {
  const h = zero.huds.find((x) => x.kind === kind);
  assert(h, `${kind}: entrada ausente em huds-zero.json`);
  assert.equal(h.status, 'RECORTADO_OK', `${kind}: status do recorte`);

  // ---- moldura vazada (*_frame.png)
  const fBuf = read(h.frame.path);
  assert.equal(sha(fBuf), h.frame.sha256, `${kind}: hash da moldura`);
  assert.equal(fBuf.readUInt32BE(16), h.frame.size[0], `${kind}: largura da moldura`);
  assert.equal(fBuf.readUInt32BE(20), h.frame.size[1], `${kind}: altura da moldura`);
  assert.equal(fBuf[25], 6, `${kind}_frame: PNG RGBA`);
  assert.equal(h.frame.blue_leak, 0, `${kind}_frame: alfa com resto de azul do chroma`);
  assert(h.frame.center_opaque_ratio < 0.2,
    `${kind}_frame: miolo não está vazado (${h.frame.center_opaque_ratio})`);

  // ---- fundo de papel (*_bg.png) mascarado na janela
  const bBuf = read(h.bg.path);
  assert.equal(sha(bBuf), h.bg.sha256, `${kind}: hash do fundo`);
  assert.equal(bBuf.readUInt32BE(16), h.bg.size[0], `${kind}: largura do fundo`);
  assert.equal(bBuf.readUInt32BE(20), h.bg.size[1], `${kind}: altura do fundo`);
  assert.equal(bBuf[25], 6, `${kind}_bg: PNG RGBA`);
  assert.equal(h.bg.border_alpha_max, 0, `${kind}_bg: papel encostando na borda (quadrado atrás do HUD)`);
  assert.equal(h.bg.corner_alpha_max, 0, `${kind}_bg: canto opaco (quadrado atrás do HUD)`);
  assert.equal(h.bg.center_alpha_min, 255, `${kind}_bg: papel translúcido sob o texto`);

  // ---- reserva combinada (usada só se a moldura faltar)
  const cBuf = read(h.combined.path);
  assert.equal(sha(cBuf), h.combined.sha256, `${kind}: hash do PNG combinado`);

  // ---- janela (aperture) coerente e dentro da imagem
  const [ax0, ay0, ax1, ay1] = h.aperture;
  assert(ax0 > 0 && ay0 > 0 && ax1 < 1 && ay1 < 1, `${kind}: aperture fora da imagem`);
  assert(ax1 - ax0 > 0.45 && ay1 - ay0 > 0.3, `${kind}: janela pequena demais para o conteúdo`);
  const apBlock = paper.slice(paper.indexOf('export const PAPER_APERTURE'), paper.indexOf('// Placas de madeira'));
  const apMatch = apBlock.match(new RegExp(`${kind}:\\s*Object\\.freeze\\(\\[([^\\]]+)\\]\\)`));
  assert(apMatch, `${kind}: PAPER_APERTURE ausente no renderer`);
  assert.deepEqual(apMatch[1].split(',').map(Number), h.aperture,
    `${kind}: PAPER_APERTURE divergente do recorte medido`);

  // ---- fiação de runtime: as 3 entradas no manifesto
  for (const key of [`paper_${kind}`, `paper_${kind}_frame`, `paper_${kind}_bg`]) {
    assert(new RegExp(`\\b${key}:\\s*"ui/paper/${kind}${key.endsWith('_frame') ? '_frame' : key.endsWith('_bg') ? '_bg' : ''}\\.png"`).test(assetsJs),
      `${key}: entrada ausente/trocada em assets.js`);
  }
  assert(fs.existsSync(new URL(`game/assets/ui/paper/${kind}_frame.png`, root)), `${kind}_frame.png no disco`);
  assert(fs.existsSync(new URL(`game/assets/ui/paper/${kind}_bg.png`, root)), `${kind}_bg.png no disco`);
}

// O renderer não pode voltar a pintar uma chapa opaca por baixo da arte.
assert(!/fillStyle='#f5edd8'/.test(paper), 'tile de papel voltou a preencher matte opaca');
assert(/source-atop/.test(paper), 'tratamento de estado deve ser clipado na arte pintada');
assert(/drawPaperBg/.test(paper) && /drawPaperFrame/.test(paper), 'helpers de 2 peças ausentes');
// O sprite antigo de papel do botão continua proibido.
assert(!fs.existsSync(new URL('game/assets/ui/paper/button.png', root)), 'sprite antigo de botão voltou ao disco');
assert(!/paper_button|ui\/paper\/button\.png/.test(assetsJs), 'sprite antigo de botão voltou ao manifesto');

// Registros históricos: continuam no repositório como história, sem hashes
// reapontados para a arte nova.
for (const legacy of ['docs/arte/hud-publicacao.json', 'docs/arte/hud-sem-fundo.json', 'docs/arte/hud-duas-pecas.json']) {
  assert(fs.existsSync(new URL(legacy, root)), `${legacy}: registro histórico removido`);
}

console.log('HUD ZERO OK — 15 HUDs em 2 peças: moldura vazada sem azul, fundo mascarado na janela, zero quadrado atrás do HUD');

// ---------------------------------------------------------------------------
// Geometria de encaixe (headless): o texto nunca sai da janela de papel e a
// viga central só estica quando o alvo é mais largo que a arte — e nunca as
// pontas. Regressão do "quadrado branco" + do HUD espremido (2026-10-19).
globalThis.document = globalThis.document || { createElement: () => ({ getContext: () => ({}) }) };
const { IMG } = await import('../js/assets.js');
const PH = await import('../js/paper_hud.js');
for (const h of zero.huds) {
  IMG[`paper_${h.kind}_frame`] = { width: h.frame.size[0], height: h.frame.size[1] };
  IMG[`paper_${h.kind}`] = { width: h.frame.size[0], height: h.frame.size[1] };
}
const BOXES = {
  panel: [270, 144], expanded: [270, 150], tutorial: [300, 120], nest_tip: [300, 110],
  banner: [320, 64], boss: [340, 68], event: [280, 70], header: [320, 40],
  minimap: [170, 130], transition: [320, 160], tooltip: [240, 119], health: [270, 64],
  card: [260, 387], tree_detail: [300, 386], pause: [355, 440],
};
for (const [kind, [w, h]] of Object.entries(BOXES)) {
  const lay = PH.paperLayout(kind, w, h);
  const q = PH.paperQuiet(kind, 0, 0, w, h);
  const ap = PH.paperAperture(kind, 0, 0, w, h);
  // A janela é a referência: nada de texto fora do papel.
  assert(ap.w > 8 && ap.h > 6, `${kind}: janela vazia`);
  assert(q.x >= ap.x - 1 && q.y >= ap.y - 1, `${kind}: texto começa fora da janela`);
  assert(q.x + q.w <= ap.x + ap.w + 1 && q.y + q.h <= ap.y + ap.h + 1, `${kind}: texto passa da janela`);
  assert(q.w > 20 && q.h > 8, `${kind}: área de texto pequena demais`);
  // A área de texto tem de caber na caixa pedida.
  assert(q.x >= 0 && q.y >= 0 && q.x + q.w <= w + 1 && q.y + q.h <= h + 1, `${kind}: texto fora da caixa`);
  if (kind === 'health' || kind === 'header') {
    assert(lay.sliced, `${kind}: barra larga deveria usar a viga central elástica`);
    assert(lay.mw > lay.lw + lay.rw, `${kind}: pontas dominam a fatia`);
  }
  if (kind === 'pause' || kind === 'tree_detail') {
    assert.equal(lay.source, 'card', `${kind}: caixa alta deve usar a moldura alta (resgate)`);
    assert(lay.fit.fh >= h * 0.9, `${kind}: moldura alta não preenche a caixa`);
  }
}
// Caixa QUADRADA/baixa continua usando a arte própria (sem resgate).
assert.equal(PH.paperLayout('pause', 330, 230).source, 'pause', 'pausa larga perdeu a arte própria');
assert.equal(PH.paperLayout('panel', 270, 144).source, 'panel', 'painel largo trocou de arte');
console.log('HUD GEOMETRIA OK — texto dentro da janela em 15 telas, viga elástica só nas barras, resgate alto na pausa/árvore');
