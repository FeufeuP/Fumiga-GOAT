// Verificação do PIPELINE DE PIXELIZAÇÃO (fase F0b-2). Node puro, sem
// navegador e sem Python: confere os DERIVADOS que tools/pixelize.py produziu
// contra a paleta normativa e as fichas, para que nenhuma peça entre no jogo
// com cor fora da paleta, alfa semitransparente ou tamanho errado.
//
//   node game/test/pixelize.mjs          (ou: npm run pixelize:check)
//
// O teste NÃO roda o pipeline (isso precisa de Pillow — tools/setup-pixel.sh).
// Ele valida o que está versionado em docs/arte/provas-f0b-2/: se alguém
// editar a paleta, o relatório e o PNG nativo divergem e isto acusa.
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const readJson = (p) => JSON.parse(read(p));
const caminho = (p) => new URL(p, ROOT);

const DIR = "docs/arte/provas-f0b-2/";
const HEX = /^#[0-9a-f]{6}$/;

// ---------------------------------------------------------------- arquivos --
const fichas = readJson(DIR + "fichas.json");
const paleta = readJson("docs/arte/paleta-celeste.json");

assert.equal(fichas.versao, "FUMIGA-PIXEL-CELESTE-v1", "fichas usam o prompt-mestre vigente");
assert.equal(fichas.fase.startsWith("F0b-2"), true, "fichas são da fase F0b-2");
assert.ok(fichas.pecas.length >= 3, "as três provas (casta, prop, painel) estão fichadas");

/** As 19 cores do bioma + o grupo compartilhado, como pixelize.py monta. */
function coresDoBioma(id, compartilhado) {
  const b = paleta.biomas[id];
  assert.ok(b, `bioma ${id} existe na paleta`);
  const cores = [b.infill, b.borda, b.trilha];
  for (const k of ["fundo", "terreno", "musgo", "acento", "vegetacao"]) {
    const v = b[k];
    cores.push(...(Array.isArray(v) ? v : [v]));
  }
  assert.equal(cores.length, 19, `${id}: 16 cores de cena + 3 de fundo`);
  if (compartilhado) {
    for (const v of Object.values(paleta.compartilhado)) {
      cores.push(...(Array.isArray(v) ? v : [v]));
    }
  }
  return cores.map((c) => c.toLowerCase());
}

// ---------------------------------------------------- ferramenta e runtime --
// A métrica de quantização do pipeline tem que ser a MESMA do runtime, senão
// o que a ferramenta aprova não é o que o jogo mostra.
const ferramenta = read("tools/pixelize.py");
const runtime = read("game/js/pixel_celeste.js");
assert.ok(/dr \* dr \* 3 \+ dg \* dg \* 6 \+ db \* db/.test(ferramenta),
  "o pipeline usa a métrica dr²*3 + dg²*6 + db²");
assert.ok(/dr \* dr \* 3 \+ dg \* dg \* 6 \+ db \* db/.test(runtime),
  "o runtime usa a mesma métrica");
assert.ok(/dither.*False|SEM dither|sem dither/i.test(ferramenta),
  "o pipeline quantiza sem dither");
assert.ok(!/Image\.BILINEAR|Image\.BICUBIC|Image\.LANCZOS/.test(ferramenta),
  "o pipeline nunca interpola na redução (sem bilinear/bicubico/lanczos)");
for (const passo of ["inundar_chroma", "despill", "detectar_bloco", "reduzir", "quantizar", "validar"]) {
  assert.ok(ferramenta.includes("def " + passo), `o pipeline implementa ${passo}()`);
}
console.log("ok    tools/pixelize.py — 5 passos presentes, métrica igual à do runtime, sem interpolação");

// ------------------------------------------------------------------ peças ---
const categorias = new Set();
for (const ficha of fichas.pecas) {
  const id = ficha.id;
  categorias.add(ficha.categoria.split("—")[0].trim());

  assert.ok(ficha.nativo[0] > 0 && ficha.nativo[1] > 0, `${id}: tamanho nativo positivo`);
  assert.ok(/verde|azul/.test(ficha.chroma), `${id}: chroma declarado`);
  assert.equal(ficha.fundo_derivado, "alfa real", `${id}: derivado com alfa real`);

  const rel = readJson(DIR + id + ".json");
  assert.equal(rel.id, id, `${id}: relatório casa com a ficha`);
  // A fonte em alta resolução NÃO é versionada (art-source/ está no .gitignore,
  // Regra 5) e não é reproduzível no CI — por isso o teste confere o DERIVADO,
  // que é o que entra no jogo. O hash da fonte fica no relatório para o
  // original poder ser reencontrado no Drive (Regra 13).
  assert.ok(/^[0-9a-f]{64}$/.test(rel.fonte.sha256), `${id}: hash da fonte registrado`);
  assert.equal(rel.validacao.ok, true, `${id}: validação do pipeline passou (${rel.validacao.problemas.join("; ") || "sem problemas"})`);

  // dimensões: o nativo saiu exatamente no tamanho da ficha
  assert.deepEqual(rel.nativo.dimensoes, ficha.nativo, `${id}: nativo no tamanho da ficha`);

  // cores: TODA cor usada pertence à paleta do bioma (tolerância 0)
  const permitidas = coresDoBioma(rel.bioma, rel.quantizacao.compartilhado);
  const fora = rel.nativo.cores_usadas.filter((c) => !permitidas.includes(c.toLowerCase()));
  assert.equal(fora.length, 0, `${id}: nenhuma cor fora da paleta (achou ${fora.join(", ")})`);
  assert.equal(rel.nativo.contagem_de_cores, rel.nativo.cores_usadas.length,
    `${id}: contagem de cores confere com a lista`);
  assert.ok(rel.nativo.cores_usadas.every((c) => HEX.test(c)), `${id}: cores em hex`);
  assert.ok(!rel.nativo.cores_usadas.includes("#000000"), `${id}: sem preto puro`);

  // alfa binário e real
  assert.ok(rel.nativo.pixels_opacos > 0, `${id}: tem pixels opacos`);
  assert.ok(rel.nativo.pixels_transparentes > 0, `${id}: alfa real (tem transparentes)`);
  assert.equal(rel.nativo.pixels_opacos + rel.nativo.pixels_transparentes,
    ficha.nativo[0] * ficha.nativo[1], `${id}: alfa binário (só 0 ou 255, nada no meio)`);

  // os arquivos existem e não estão vazios
  for (const arq of [rel.nativo.arquivo, rel.preview_3x]) {
    assert.ok(existsSync(caminho(arq)), `${id}: existe ${arq}`);
    assert.ok(statSync(caminho(arq)).size > 0, `${id}: ${arq} não está vazio`);
  }
  // o preview é exatamente 3x o nativo (escala inteira, Regra 6)
  assert.deepEqual([rel.nativo.dimensoes[0] * 3, rel.nativo.dimensoes[1] * 3],
    tamanhoPng(rel.preview_3x), `${id}: preview-3x na escala inteira`);

  // o chroma da fonte bate com o que a ficha pediu
  assert.equal(rel.chroma.familia, ficha.chroma, `${id}: chroma medido é o da ficha`);

  console.log(`ok    ${id.padEnd(11)} ${rel.nativo.dimensoes.join("x")} px · ` +
    `${rel.nativo.contagem_de_cores} cores da paleta · ` +
    `${rel.nativo.pixels_opacos} opacos / ${rel.nativo.pixels_transparentes} transparentes · ` +
    `${rel.grade.tem_grade ? "bloco " + rel.grade.bloco_px + "px" : "fonte lisa (média de área)"}`);
}

// --------------------------------------------------------- cobertura mínima --
assert.ok(categorias.size >= 3, `as provas cobrem 3 categorias (${[...categorias].join(", ")})`);
assert.ok(existsSync(caminho(DIR + "prova-320x180.png")), "existe a prova visual em 320x180");
assert.ok(existsSync(caminho("docs/arte/diagrama-f0b2-pipeline-2026-10-26.png")),
  "existe o diagrama da mudança (Regra 20)");

console.log(`ok    provas de F0b-2: ${fichas.pecas.length} peças validadas contra docs/arte/paleta-celeste.json`);
console.log("PIXELIZE ÍNTEGRO — derivados nativos conferidos (nenhuma arte entra sem esta checagem)");

/** Lê só o cabeçalho IHDR do PNG — largura/altura sem decodificar nada. */
function tamanhoPng(p) {
  const buf = readFileSync(caminho(p));
  assert.equal(buf.slice(1, 4).toString("ascii"), "PNG", `${p} é um PNG`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
