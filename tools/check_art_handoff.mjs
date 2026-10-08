// Auditoria documental da continuidade artística (Node puro, sem rede/geração).
// Uso: node tools/check_art_handoff.mjs
// Complementa game/test/docs.mjs; não comprova disponibilidade atual do Drive,
// qualidade visual, aprovação de assets ou integração no jogo.
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

export function auditArtHandoff(read = diskRead) {
  const mega = read('MEGA_ARQUIVO.md');
  const guide = read('docs/arte/ESTILO_OFICIAL.md');
  const direction = JSON.parse(read('docs/arte/direcao-vigente.json'));
  assert.equal(direction.estilo, 6, 'direção oficial: estilo 06');
  assert.equal(direction.direcao_aprovada, true, 'direção explicitamente aprovada');
  assert.equal(direction.refinamento_implementado_no_jogo, false,
    'estado mudou: revisar o handoff antes de declarar refinamento integrado');
  const key = direction.prompt_mestre;
  assert.equal(key, 'FUMIGA-PAPEL-v2-DETALHADO', 'mudança de prompt exige revisar este contrato de continuidade');
  const start = `<!-- INICIO PROMPT ${key} -->`;
  const end = `<!-- FIM PROMPT ${key} -->`;
  const prompt = oneBlock(mega, start, end, 'prompt no MEGA');
  assert.equal(prompt, oneBlock(guide, start, end, 'prompt no guia'),
    'prompt canônico deve ser idêntico no guia e MEGA');
  assert(prompt.trim().length > 0, 'prompt integral não pode estar vazio');

  const oldKey = 'FUMIGA-PAPEL-v1';
  const oldStart = `<!-- INICIO PROMPT ${oldKey} -->`;
  const oldEnd = `<!-- FIM PROMPT ${oldKey} -->`;
  const oldGuide = read('docs/arte/historico/ESTILO_OFICIAL-v1.md');
  assert.equal(oneBlock(mega, oldStart, oldEnd, 'prompt histórico no MEGA'),
    oneBlock(oldGuide, oldStart, oldEnd, 'prompt histórico no guia'),
    'texto do prompt anterior preservado');

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

  // Estes manifestos são históricos: a atualização do guia não deve reatribuir
  // retroativamente a versão do prompt usada para gerar os PNGs.
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

  const agents = read('AGENTS.md');
  const pending = read('PENDENCIAS.md');
  for (const [name, text] of [['AGENTS.md', agents], ['PENDENCIAS.md', pending]]) {
    assert(text.includes('MEGA_ARQUIVO.md#continuidade-artistica'), `${name}: entrada de continuidade`);
    assert(!/Não leia\s+(?:o )?MEGA(?:_ARQUIVO)? inteiro/i.test(text), `${name}: remover proibição obsoleta de leitura integral`);
  }
  assert(agents.includes('PARADA 1') && agents.includes('PARADA 2'), 'AGENTS alinhado à cadência v3');
  assert(!agents.includes('confirmação do usuário entre cada variação'), 'cadência antiga não pode continuar ativa');
  assert(agents.includes(key), 'AGENTS aponta o prompt vigente');
  assert(read('REGRAS_DE_TRABALHO.md').includes(key), 'Regra 6 aponta o prompt vigente');
  assert(read('DOCUMENTO_REESTILIZACAO_VISUAL.md').includes(key), 'plano aponta o prompt vigente');

  return { prompt: key, referencias: v2.imagens.length + scenes.imagens.length + packages.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = auditArtHandoff();
    console.log(`CONTINUIDADE ARTÍSTICA ÍNTEGRA — ${result.prompt}; prompt anterior preservado; ` +
      `${result.referencias} registros de arquivos, âncoras e pontos de entrada coerentes.`);
    console.log('Auditoria documental local; não é teste de disponibilidade remota nem aprovação visual.');
  } catch (error) {
    console.error(`FALHA DE CONTINUIDADE ARTÍSTICA: ${error.message}`);
    process.exitCode = 1;
  }
}
