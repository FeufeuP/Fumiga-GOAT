// Testes de navegador: nenhum page.waitForFunction com predicado ASSÍNCRONO.
// Uso: node game/test/browser-waits.mjs   (roda no npm test e no CI)
//
// O Playwright não espera a Promise que um predicado async devolve: a Promise
// já conta como "verdadeira", então a espera termina na primeira checagem e o
// teste segue sem ter esperado nada (waitForFunction(async () => false) volta
// em milissegundos). Até 2026-10-04 era assim em inspect.mjs (boot),
// lorehud-browser.mjs (PRETITLE) e pwa-browser.mjs — este dizia "o jogo bootou
// offline" mesmo com o jogo parado no BOOT.
//
// O jeito certo: importGameModules(page, {...}) de lib/browser.mjs e um
// predicado SÍNCRONO lendo window.MOD. (page.evaluate pode ser async: ele
// espera a Promise.)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), "..", "..");
const DIRS = ["game/test", "game/test/lib", "tools"];

// waitForFunction( seguido de função async (seta ou function), com ou sem
// espaço/quebra de linha antes
const ASYNC_WAIT = /\bwaitForFunction\(\s*async\b/g;

// o detector pega as três formas que existiam e deixa passar as corretas
for (const bad of ["page.waitForFunction(async (dbg) => {", "await page.waitForFunction(async()=> (await import('x')).G)",
  "gp.waitForFunction(\n    async function () { return 1; })"]) {
  assert.ok(new RegExp(ASYNC_WAIT.source).test(bad), "detector pega: " + bad);
}
for (const ok of ["page.waitForFunction(() => MOD.state.G.screen === 'PRETITLE')", "page.evaluate(async () => 1)",
  "page.waitForFunction((id) => MOD.ui.uiButtons().find((b) => b.id === id), id)"]) {
  assert.ok(!new RegExp(ASYNC_WAIT.source).test(ok), "detector deixa passar: " + ok);
}

const found = [];
let scanned = 0;
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs).sort()) {
    const file = path.join(abs, name);
    if (!/\.(m?js|cjs)$/.test(name) || file === SELF || !fs.statSync(file).isFile()) continue;
    const src = fs.readFileSync(file, "utf8");
    scanned++;
    for (const m of src.matchAll(ASYNC_WAIT)) {
      const line = src.slice(0, m.index).split("\n").length;
      found.push(`${path.relative(ROOT, file)}:${line}  ${src.split("\n")[line - 1].trim()}`);
    }
  }
}
assert.ok(scanned >= 10, "varreu os testes de navegador (" + scanned + " arquivos)");
assert.equal(found.length, 0, "waitForFunction com predicado async (não espera nada) — use importGameModules + " +
  "predicado síncrono lendo MOD:\n  " + found.join("\n  "));
console.log(`ESPERAS DE NAVEGADOR OK — ${scanned} arquivos, nenhum waitForFunction com predicado async`);
