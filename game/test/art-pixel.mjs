// Verificação da direção artística PIXEL CELESTE (Node puro, sem navegador).
// Uso: node game/test/art-pixel.mjs
//
// Garante que a documentação vigente continua coerente:
//   • direção/prompt/paleta/contratos existem e fecham as contas do estilo;
//   • todas as fases F0a–F9 estão listadas e têm porta de aprovação;
//   • o papel recortado ficou no histórico, sem sumir;
//   • nenhum texto ativo volta a declarar papel como estilo oficial.
// Não prova qualidade visual, disponibilidade no Drive nem integração no jogo.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { auditArtHandoff } from "../../tools/check_art_handoff.mjs";

const ROOT = new URL("../../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const readJson = (p) => JSON.parse(read(p));
const HEX = /^#[0-9a-f]{6}$/;

// ---------------------------------------------------------------- arquivos --
const FILES = [
  "docs/arte/ESTILO_OFICIAL.md",
  "docs/arte/FASES_PIXEL_CELESTE.md",
  "docs/arte/paleta-celeste.json",
  "docs/arte/contratos-pixel.json",
  "docs/arte/direcao-vigente.json",
  "docs/arte/historico/ESTILO_OFICIAL-v4-PAPEL.md",
];
for (const f of FILES) assert(existsSync(new URL(f, ROOT)), `arquivo da direção existe: ${f}`);

const guide = read("docs/arte/ESTILO_OFICIAL.md");
const phases = read("docs/arte/FASES_PIXEL_CELESTE.md");
const direction = readJson("docs/arte/direcao-vigente.json");
const palette = readJson("docs/arte/paleta-celeste.json");
const contracts = readJson("docs/arte/contratos-pixel.json");

// ---------------------------------------------------------------- direção ---
assert.equal(direction.estilo, "pixel-celeste", "estilo oficial é pixel Celeste");
assert.equal(direction.prompt_mestre, "FUMIGA-PIXEL-CELESTE-v1", "prompt vigente");
assert.equal(direction.direcao_aprovada, true, "decisão do usuário registrada");
assert.equal(direction.refinamento_implementado_no_jogo, true, "o frame F0b está no jogo");
assert(direction.escopo_implementacao.startsWith("F0b implementada em 2026-10-26"), "escopo da F0b registrado");
assert(!/VÍDEO → PIXEL CELESTE/.test(direction.escopo_implementacao), "o frame não é opção de vídeo");
assert(direction.decisao_usuario.includes("idêntico ao pixel de celeste"), "pedido literal preservado");
assert.equal(direction.decisoes.estilo.split(" —")[0], "full", "estilo aplicado ao jogo inteiro");
assert.equal(direction.decisoes.paleta.split(" —")[0], "hibrida", "paleta híbrida escolhida");
assert(direction.decisoes.tecnica.includes("320x180"), "frame escolhido");
assert(direction.decisoes.escopo_rodada.startsWith("docs"), "escopo documental desta rodada");

// ---------------------------------------------------------------- paleta ----
const P = palette.frame;
assert.deepEqual([P.buffer_w, P.buffer_h, P.escala_inteira], [320, 180, 3], "frame 320×180 ×3");
assert.equal(P.buffer_w * P.escala_inteira, 960, "largura fecha com o canvas");
assert.equal(P.buffer_h * P.escala_inteira, 540, "altura fecha com o canvas");
assert.equal(P.tile_px, 8, "tile de 8×8");
assert.equal(P.tile_unidades_mundo, P.tile_px * P.escala_inteira, "tile = 8 px × 3 = 24 unidades");
assert.deepEqual(P.zoom_permitido, [1, 2, 3], "só zoom inteiro");
for (const proibido of ["anti_aliasing", "gradiente_suave"]) {
  assert(palette.regras[proibido].startsWith("proibido"), `${proibido} proibido`);
}

const biomas = Object.keys(palette.biomas);
assert.equal(biomas.length, 7, "seis biomas jogáveis + Pálida reservada");
for (const id of biomas) {
  const b = palette.biomas[id];
  const cena = { infill: [b.infill], terreno: b.terreno, borda: [b.borda], musgo: b.musgo,
    trilha: [b.trilha], acento: b.acento, vegetacao: b.vegetacao };
  const total = Object.values(cena).reduce((n, arr) => n + arr.length, 0);
  assert.equal(total, 16, `${id}: 16 cores de cena`);
  assert.equal(b.terreno.length, 4, `${id}: rampa de terreno com 4 passos`);
  assert.equal(b.musgo.length, 3, `${id}: musgo em 3 passos`);
  assert.equal(b.acento.length, 3, `${id}: acento em 3 passos`);
  assert.equal(b.vegetacao.length, 3, `${id}: vegetação em 3 passos`);
  assert.equal(b.fundo.length, 3, `${id}: 3 cores de fundo`);
  for (const hex of [...Object.values(cena).flat(), ...b.fundo]) {
    assert(HEX.test(hex), `${id}: hex válido ${hex}`);
  }
  assert(!Object.values(cena).flat().includes("#000000"), `${id}: sem preto puro de cena`);
}
assert.equal(palette.biomas.palida.status, "nao_autorizado", "Pálida selada até F8");
for (const papel of ["tinta", "papel_claro"]) assert(HEX.test(palette.compartilhado[papel]), `cor compartilhada ${papel}`);
for (const rampa of ["nevoa", "perigo", "aliado", "ambar", "essencia", "texto"]) {
  assert(Array.isArray(palette.compartilhado[rampa]), `rampa compartilhada: ${rampa}`);
}

// ------------------------------------------------------------- contratos ----
const native = (mundo) => Math.round(mundo / 3);
const castas = Object.entries(contracts.castas);
assert.equal(castas.length, 12, "12 castas com contrato nativo");
for (const [id, c] of castas) {
  assert.equal(c.nativo, native(c.mundo), `${id}: nativo = round(mundo/3)`);
  assert(Number.isInteger(c.nativo) && c.nativo >= 13, `${id}: nativo inteiro e legível`);
}
for (const [id, c] of Object.entries(contracts.inimigos)) {
  assert.equal(c.nativo, native(c.mundo), `${id}: nativo = round(mundo/3)`);
}
assert.equal(contracts.castas.queen.nativo, 63, "rainha em 63 px nativos");
assert.equal(contracts.castas.worker.nativo, 15, "Cortadeira em 15 px nativos");
assert.equal(contracts.castas.giant.nativo, 109, "Dinoponera em 109 px nativos (escala 20× preservada)");

const boss = contracts.chefes;
assert.equal(boss.celula_nativa, 22, "célula nativa dos chefes");
assert.equal(boss.celula_mundo_nova, 66, "célula 22 px × 3 = 66 unidades");
assert.equal(boss.linhas.length, 4, "quatro direções");
assert.equal(Object.keys(boss.quadros).length, 5, "cinco folhas de animais");
let celulas = 0;
for (const [sp, q] of Object.entries(boss.quadros)) {
  for (const estado of boss.estados) {
    assert(q[estado] > 0, `${sp}.${estado}: quadros definidos`);
    celulas += q[estado] * boss.linhas.length;
  }
}
assert.equal(celulas, 516, "as 516 células dos chefes continuam contabilizadas");
assert(boss.boar_attack.includes("não produzir"), "boar_attack sem consumidor não é produzido");

assert.equal(contracts.ui.icones.nativo[0], 16, "ícones em 16×16 nativos");
assert.equal(contracts.ui.painel_hud.nativo[0], 90, "painel do HUD em 90 px nativos");
assert(contracts.ui.fonte.includes("KiwiSoda"), "fonte mantida até decisão própria");
assert.equal(contracts.ilustracoes.noite_branca.nativo[0], 320, "Noite Branca já é 320×180");
assert.equal(contracts.flores.folha_regular.celula_nativa, 64, "flores em célula de 64 px");
assert(contracts.mundo.chao_buffer[0] === 1067 && contracts.mundo.chao_buffer[1] === 800,
  "chão assado no buffer 1067×800");
assert(contracts.orcamento.memoria_buffer.includes("230.400"), "buffer = 230.400 bytes");
assert(contracts.orcamento.proibido.includes("por pixel"), "sem pós-processamento por pixel por quadro");

// ----------------------------------------------------------------- fases ----
const FASES = ["F0a", "F0b", "F0b-2", "F0c", "F1", "F2", "F3a", "F3b", "F3c", "F4",
  "F5a", "F5b", "F5c", "F5d", "F6", "F7", "F8", "F9"];
for (const fase of FASES) {
  assert(phases.includes(`**${fase}**`), `fase listada: ${fase}`);
}
const linhaResumo = phases.split("\n").filter((l) => l.startsWith("| **"));
assert.equal(linhaResumo.length, FASES.length, "tabela-resumo tem uma linha por fase");
for (const linha of linhaResumo) {
  assert(linha.split("|").length >= 6, "cada fase declara entrega, dependência, porta e status");
  assert(/✅|⏳|🔁|🔒/.test(linha), "cada fase tem status explícito");
}
assert(phases.includes("F0a") && phases.includes("✅ 2026-10-26"), "F0a concluída nesta data");
assert(phases.includes("Próxima ação real:** F0b-2"), "próxima ação é o pipeline de pixelização F0b-2");
assert(phases.includes("F0b — Frame pixel (a base técnica) ✅"), "F0b concluída com data");
assert(phases.includes("🔒"), "fases bloqueadas visíveis");
for (const etiqueta of ["Porta", "Aceite", "Regras transversais", "Caminho crítico"]) {
  assert(phases.includes(etiqueta), `plano traz ${etiqueta}`);
}
assert(phases.includes("substitui") && phases.includes("ORDEM_IMPLEMENTACAO.md"),
  "plano marca o documento de papel como histórico");

// ----------------------------- guia, regras e pontos de entrada coerentes ---
for (const texto of ["320×180", "8×8", "16", "hue-shift", "anti-aliasing", "PIXEL CELESTE"]) {
  assert(guide.includes(texto), `guia descreve: ${texto}`);
}
assert(guide.includes("FUMIGA-PIXEL-CELESTE-v1"), "guia aponta o prompt vigente");
assert(guide.includes("contratos-pixel.json") && guide.includes("paleta-celeste.json"),
  "guia aponta contratos e paleta");
assert(guide.includes("historico/ESTILO_OFICIAL-v4-PAPEL.md"), "guia preserva o papel no histórico");

const rules = read("REGRAS_DE_TRABALHO.md");
assert(rules.includes("FUMIGA-PIXEL-CELESTE-v1"), "Regra 6 aponta o prompt vigente");
assert(rules.includes("320×180") && rules.includes("8×8"), "Regra 6 descreve o frame");
assert(!rules.includes("Estilo obrigatório para novas artes: papel recortado"),
  "Regra 6 não exige mais papel recortado");
assert(rules.includes("chroma key em TODA imagem gerada/editada"), "chroma continua obrigatório");

const agents = read("AGENTS.md");
const pending = read("PENDENCIAS.md");
for (const [nome, texto] of [["AGENTS.md", agents], ["PENDENCIAS.md", pending], ["GUIA.md", read("GUIA.md")]]) {
  assert(/PIXEL CELESTE|FUMIGA-PIXEL-CELESTE-v1/.test(texto), `${nome} aponta a direção vigente`);
  assert(!/estilo\s*0?6\s*[—-]\s*papel recortado detalhado[,.]?\s*confirmado/i.test(texto),
    `${nome} não declara mais o papel como estilo vigente`);
}

// auditoria de continuidade (prompt, histórico, manifestos, âncoras)
const audit = auditArtHandoff();
assert.equal(audit.prompt, "FUMIGA-PIXEL-CELESTE-v1", "auditoria confirma o prompt");
assert.equal(audit.fases, FASES.length, "auditoria confirma as fases");

console.log(`ok    direção pixel Celeste — ${biomas.length - 1} biomas, ${castas.length} castas, ${celulas} células de chefe`);
console.log(`ok    ${FASES.length} fases documentadas (F0a→F9), F0a e F0b concluídas, próxima F0b-2`);
console.log("ART-PIXEL ÍNTEGRO — documentação coerente com a decisão de 2026-10-26");
