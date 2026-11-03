// Auditoria documental da continuidade artística (Node puro, sem rede/geração).
// Uso: node tools/check_art_handoff.mjs
// Complementa game/test/docs.mjs; não comprova disponibilidade do Drive,
// qualidade visual, aprovação de assets ou integração no jogo.
//
// Direção vigente desde 2026-10-26: PIXEL CELESTE (FUMIGA-PIXEL-CELESTE-v1).
// O papel recortado v1–v4 continua auditado como histórico: se um bloco antigo
// for apagado ou reescrito, a auditoria falha.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = new URL('../', import.meta.url);
const diskRead = (name) => readFileSync(new URL(name, ROOT), 'utf8');

function oneBlock(text, start, end, label) {
  const a = text.indexOf(start);
  assert(a >= 0, `${label}: início ausente`);
  assert.equal(text.indexOf(start, a + start.length), -1, `${label}: bloco duplicado`);
  const b = text.indexOf(end, a + start.length);
  assert(b >= 0, `${label}: fim ausente`);
  assert.equal(text.indexOf(end, b + end.length), -1, `${label}: fim duplicado`);
  return text.slice(a + start.length, b);
}

const HEX = /^#[0-9a-f]{6}$/;
const nativoDe = (mundo) => Math.round(mundo / 3);

export function auditArtHandoff(read = diskRead) {
  const mega = read('MEGA_ARQUIVO.md');
  const guide = read('docs/arte/ESTILO_OFICIAL.md');
  const direction = JSON.parse(read('docs/arte/direcao-vigente.json'));
  const palette = JSON.parse(read('docs/arte/paleta-celeste.json'));
  const contracts = JSON.parse(read('docs/arte/contratos-pixel.json'));
  const phases = read('docs/arte/FASES_PIXEL_CELESTE.md');

  // ------------------------------------------------------- direção vigente -
  assert.equal(direction.estilo, 'pixel-celeste', 'direção oficial: pixel Celeste');
  assert.equal(direction.prompt_mestre, 'FUMIGA-PIXEL-CELESTE-v1', 'prompt-mestre vigente');
  assert.equal(direction.anterior, 'papel-recortado-06', 'estilo anterior registrado');
  assert.equal(direction.prompt_anterior, 'FUMIGA-PAPEL-v4-CHROMA', 'prompt anterior preservado');
  assert.equal(direction.direcao_aprovada, true, 'direção explicitamente aprovada');
  // F0b (2026-10-26) levou o frame pixel ao jogo. O que continua proibido é declarar
  // rework de ASSET (F1 em diante): nenhum PNG foi trocado, só o frame técnico entrou.
  assert.equal(direction.refinamento_implementado_no_jogo, true,
    'o frame F0b está implementado no jogo');
  assert(direction.escopo_implementacao.startsWith('F0b implementada em 2026-10-26'),
    'escopo implementado declara a F0b e nada além do frame');
  assert(/não é opção/i.test(direction.escopo_implementacao),
    'o frame é obrigatório — nunca um botão de liga/desliga em VÍDEO');
  assert(direction.decisao_usuario.includes('idêntico ao pixel de celeste'),
    'decisão do usuário registrada com as palavras dele');
  assert(direction.decisoes.tecnica.includes('320x180'), 'técnica do frame registrada');

  // ------------------------------------------- prompt canônico vigente -----
  const key = direction.prompt_mestre;
  const prompt = oneBlock(mega, `<!-- INICIO PROMPT ${key} -->`, `<!-- FIM PROMPT ${key} -->`, 'prompt no MEGA');
  assert.equal(prompt, oneBlock(guide, `<!-- INICIO PROMPT ${key} -->`, `<!-- FIM PROMPT ${key} -->`,
    'prompt no guia'), 'prompt canônico idêntico no guia e no MEGA');
  for (const phrase of ['320×180', '8×8', 'anti-aliasing', 'hue-shift', '12 a 18 cores',
    '1 pixel', 'infill', 'TODA imagem gerada ou editada', 'verde puro #00FF00',
    'azul puro #0000FF', 'traços verdes, escolha fundo AZUL', 'traços azuis, escolha fundo VERDE',
    'remover o chroma', 'compor sobre o fundo final', 'bipedia humana']) {
    assert(prompt.includes(phrase), `prompt vigente sem a regra: ${phrase}`);
  }
  assert(!prompt.includes('papel recortado'), 'o prompt vigente não pode mandar desenhar papel');
  assert(!guide.includes('INICIO PROMPT FUMIGA-PAPEL-v4-CHROMA'),
    'o guia ativo não pode manter o prompt de papel como bloco vigente');

  // ------------------------------------- histórico do papel preservado -----
  const paper = [
    ['FUMIGA-PAPEL-v4-CHROMA', 'docs/arte/historico/ESTILO_OFICIAL-v4-PAPEL.md'],
    ['FUMIGA-PAPEL-v3-PASTEL-ORGANICO', 'docs/arte/historico/ESTILO_OFICIAL-v3.md'],
    ['FUMIGA-PAPEL-v2-DETALHADO', 'docs/arte/historico/ESTILO_OFICIAL-v2.md'],
    ['FUMIGA-PAPEL-v1', 'docs/arte/historico/ESTILO_OFICIAL-v1.md'],
  ];
  for (const [oldKey, file] of paper) {
    const a = `<!-- INICIO PROMPT ${oldKey} -->`;
    const b = `<!-- FIM PROMPT ${oldKey} -->`;
    assert.equal(oneBlock(mega, a, b, `${oldKey} no MEGA`), oneBlock(read(file), a, b, `${oldKey} em ${file}`),
      `${oldKey} preservado integralmente no histórico`);
  }

  // ------------------------------------------------------------- paleta ----
  assert.equal(palette.frame.buffer_w, 320, 'buffer 320 de largura');
  assert.equal(palette.frame.buffer_h, 180, 'buffer 180 de altura');
  assert.equal(palette.frame.escala_inteira, 3, 'escala inteira ×3');
  assert.equal(palette.frame.escala_inteira * palette.frame.buffer_w, 960, '×3 fecha o canvas 960');
  assert.equal(palette.frame.tile_px, 8, 'tile de 8×8');
  const biomes = Object.keys(palette.biomas);
  assert.equal(biomes.length, 7, 'seis biomas + Pálida reservada');
  for (const id of biomes) {
    const b = palette.biomas[id];
    const cena = [b.infill, ...b.terreno, b.borda, ...b.musgo, b.trilha, ...b.acento, ...b.vegetacao];
    assert.equal(cena.length, 16, `${id}: 16 cores de cena`);
    assert.equal(b.fundo.length, 3, `${id}: 3 cores de fundo`);
    for (const hex of [...cena, ...b.fundo, ...Object.values(palette.compartilhado).flat()]) {
      assert(HEX.test(hex), `${id}: cor hexadecimal válida — ${hex}`);
    }
    assert(!cena.includes('#000000'), `${id}: sem preto puro de cena`);
  }
  assert.equal(palette.biomas.palida.status, 'nao_autorizado', 'Pálida continua selada');
  for (const [nome, ramp] of Object.entries(palette.compartilhado)) {
    if (Array.isArray(ramp) && ramp.length > 1) assert(ramp.every(HEX.test.bind(HEX)), `rampa válida: ${nome}`);
  }

  // ---------------------------------------------------------- contratos ----
  assert.equal(contracts.frame.buffer_w, 320, 'contratos: buffer 320');
  assert.deepEqual(contracts.frame.zoom_buffer_permitido, [1, 2, 3], 'zoom inteiro permitido');
  for (const [id, c] of Object.entries(contracts.castas)) {
    assert.equal(c.nativo, nativoDe(c.mundo), `${id}: nativo = round(mundo/3)`);
  }
  for (const [id, c] of Object.entries(contracts.inimigos)) {
    assert.equal(c.nativo, nativoDe(c.mundo), `${id}: nativo = round(mundo/3)`);
  }
  assert.equal(contracts.chefes.celula_nativa, 22, 'célula nativa dos chefes');
  assert.equal(contracts.chefes.celula_mundo_nova, contracts.chefes.celula_nativa * 3, 'célula 22×3 = 66 no mundo');
  assert(Object.keys(contracts.castas).length === 12, '12 castas contratadas');
  assert(contracts.flores.folha_regular.celula_nativa === 64, 'flores em célula nativa de 64');
  assert(contracts.orcamento.memoria_buffer.includes('230.400'), 'buffer custa 230.400 bytes');

  // -------------------------------------------------------------- fases ----
  const faseIds = ['F0a', 'F0b', 'F0b-2', 'F0c', 'F1', 'F2', 'F3a', 'F3b', 'F3c', 'F4',
    'F5a', 'F5b', 'F5c', 'F5d', 'F6', 'F7', 'F8', 'F9'];
  for (const f of faseIds) {
    const hits = phases.match(new RegExp(`\\*\\*${f.replace('-', '\\-')}\\*\\*`, 'g')) || [];
    assert(hits.length >= 1, `fase documentada: ${f}`);
  }
  assert(phases.includes('F8') && phases.includes('🔒'), 'fases bloqueadas marcadas');
  assert(phases.includes('documentação'), 'plano declara o escopo desta rodada');

  // ------------------------------------------------ continuidade no MEGA ---
  const handoff = oneBlock(mega, '<!-- INICIO CONTINUIDADE ARTISTICA -->',
    '<!-- FIM CONTINUIDADE ARTISTICA -->', 'guia de continuidade');
  assert(mega.indexOf('id="continuidade-artistica"') < mega.indexOf('id="prompt-mestre-vigente"'),
    'entrada de continuidade deve aparecer antes do registro do prompt');
  const anchors = [...mega.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]);
  for (const id of [
    'continuidade-artistica', 'arte-estado-vigente', 'arte-acabamento', 'arte-camadas',
    'prompt-mestre-vigente', 'arte-fichas-exemplos', 'arte-acervo-drive', 'arte-producao',
    'arte-aceite', 'arte-proximo-passo', 'acervo-estilos-v2', 'flores-v3', 'registro-de-integridade',
  ]) {
    assert.equal(anchors.filter((a) => a === id).length, 1, `âncora única: ${id}`);
  }
  for (const [, id] of handoff.matchAll(/\]\(#([^\s)]+)\)/g)) {
    assert(anchors.includes(id), `link interno válido: #${id}`);
  }
  for (const section of [
    'Decisão vigente', 'sem vazio', 'Passada A', 'Passada B', 'Passada C',
    'Complemento A', 'Complemento B', 'Complemento C', 'Complemento D',
    'Procedimento de recuperação', 'PARADA 1', 'PARADA 2',
    'Checklist de excelência', 'Próxima etapa real',
  ]) assert(handoff.includes(section), `conteúdo de continuidade: ${section}`);
  assert(handoff.includes('PIXEL CELESTE'), 'continuidade declara a direção vigente');

  // ------------------------------------- manifestos históricos preservados -
  const v2 = JSON.parse(read('docs/arte/amostras-estilos-v2.json'));
  const scenes = JSON.parse(read('docs/arte/cenarios-06-08.json'));
  const packages = JSON.parse(read('docs/arte/pacotes-estilos-v2.json'));
  assert.equal(v2.imagens.length, 10, 'dez conceitos v2 preservados');
  assert.equal(scenes.imagens.length, 2, 'dois estudos de cenário preservados');
  assert(v2.prompt_06.includes('FUMIGA-PAPEL-v1'), 'rodada v2 continua ligada ao prompt usado na geração');
  assert(scenes.metodo.includes('FUMIGA-PAPEL-v1'), 'cenários continuam ligados ao prompt usado na geração');
  for (const item of [...v2.imagens, ...scenes.imagens, ...packages]) {
    assert(mega.includes(item.drive_id), `ID documentado no MEGA: ${item.arquivo}`);
    assert(/^[a-f0-9]{64}$/.test(item.sha256), `SHA-256 válido: ${item.arquivo}`);
    assert(mega.includes(item.sha256), `checksum documentado no MEGA: ${item.arquivo}`);
  }
  for (const item of [
    v2.imagens.find((i) => i.numero === 6),
    v2.imagens.find((i) => i.numero === 8),
    scenes.imagens.find((i) => i.arquivo.startsWith('06-')),
    ...packages.filter((i) => i.arquivo.endsWith('.zip')),
  ]) {
    assert(item && handoff.includes(item.drive_id), 'referência principal deve estar na entrada de continuidade');
    assert(handoff.includes(item.sha256), `hash na entrada de continuidade: ${item.arquivo}`);
    const formattedBytes = String(item.bytes).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    assert(handoff.includes(formattedBytes), `tamanho na entrada de continuidade: ${item.arquivo}`);
  }
  assert(handoff.includes(v2.drive_pasta_id), 'pasta principal documentada');
  assert(handoff.includes(scenes.pasta_drive_id), 'subpasta de cenários documentada');

  // ---------------------------------------------- pontos de entrada -------
  const agents = read('AGENTS.md');
  const pending = read('PENDENCIAS.md');
  for (const [name, text] of [['AGENTS.md', agents], ['PENDENCIAS.md', pending]]) {
    assert(text.includes('MEGA_ARQUIVO.md#continuidade-artistica'), `${name}: entrada de continuidade`);
    assert(!/Não leia\s+(?:o )?MEGA(?:_ARQUIVO)? inteiro/i.test(text), `${name}: remover proibição obsoleta de leitura integral`);
  }
  assert(agents.includes('PARADA 1') && agents.includes('PARADA 2'), 'AGENTS alinhado à cadência das flores');
  assert(agents.includes(key), 'AGENTS aponta o prompt vigente');
  assert(pending.includes(key), 'PENDENCIAS aponta o prompt vigente');
  const rules = read('REGRAS_DE_TRABALHO.md');
  assert(rules.includes(key), 'Regra 6 aponta o prompt vigente');
  assert(rules.includes('chroma key em TODA imagem gerada/editada'), 'Regra 6 exige chroma em toda fonte');
  assert(!rules.includes('Estilo obrigatório para novas artes: papel recortado'),
    'Regra 6 não pode continuar exigindo papel recortado');
  assert(guide.includes('Fundo da FONTE: verde #00FF00 ou azul #0000FF'), 'ficha não pode pedir alfa diretamente');
  assert(read('DOCUMENTO_REESTILIZACAO_VISUAL.md').includes(key), 'plano aponta o prompt vigente');
  assert(read('GUIA.md').includes('PIXEL CELESTE'), 'GUIA encaminha para a direção vigente');

  return {
    prompt: key,
    referencias: v2.imagens.length + scenes.imagens.length + packages.length,
    fases: faseIds.length,
    biomas: biomes.length - 1,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = auditArtHandoff();
    console.log(`CONTINUIDADE ARTÍSTICA ÍNTEGRA — ${result.prompt}; papel v1–v4 preservado; ` +
      `${result.referencias} registros de arquivos, ${result.fases} fases e ${result.biomas} biomas coerentes.`);
    console.log('Auditoria documental local; não é teste de disponibilidade remota nem aprovação visual.');
  } catch (error) {
    console.error(`FALHA DE CONTINUIDADE ARTÍSTICA: ${error.message}`);
    process.exitCode = 1;
  }
}
