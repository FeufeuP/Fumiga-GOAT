// Copia a paleta NORMATIVA (docs/arte/paleta-celeste.json) para dentro do
// pacote do jogo (game/assets/), de onde o runtime a lê.
//
// Uso: node tools/sync_paleta.mjs [--check]
//   --check  só confere se estão idênticos (usado pelo teste de assets)
//
// A fonte da verdade é SEMPRE o JSON de docs/: é ele que a direção de arte
// edita. O arquivo dentro de game/assets/ é uma cóbia gerada — editar à mão
// é inútil, porque este script o sobrescreve e o teste aponta a divergência.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = path.join(ROOT, "docs/arte/paleta-celeste.json");
const DESTINO = path.join(ROOT, "game/assets/paleta-celeste.json");

const fonte = readFileSync(FONTE);
const check = process.argv.includes("--check");
if (check) {
  let destino;
  try { destino = readFileSync(DESTINO); } catch (e) {
    console.error("ERRO: falta game/assets/paleta-celeste.json — rode node tools/sync_paleta.mjs");
    process.exit(1);
  }
  if (!fonte.equals(destino)) {
    console.error("ERRO: game/assets/paleta-celeste.json divergiu de docs/arte/paleta-celeste.json");
    console.error("      rode: node tools/sync_paleta.mjs");
    process.exit(1);
  }
  console.log(`ok   paleta copiada e idêntica (${fonte.length} bytes)`);
  process.exit(0);
}
writeFileSync(DESTINO, fonte);
console.log(`escrito game/assets/paleta-celeste.json (${fonte.length} bytes, cópia de docs/arte/paleta-celeste.json)`);
