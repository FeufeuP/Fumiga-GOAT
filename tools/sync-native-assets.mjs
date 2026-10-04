// Copia apenas os arquivos de runtime necessários para os shells Android/Electron.
// Os dois destinos são gerados no build e permanecem fora do Git.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
  path.join(ROOT, "installers/android/app/src/main/assets/www"),
  path.join(ROOT, "installers/windows/web"),
];
const FILES = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "app/assets.json",
  "app/app.css",
  "app/offline.js",
  "app/online.html",
  "game/index.html",
  "game/manifest.webmanifest",
  "game/mobile/index.html",
  "game/mobile/manifest.webmanifest",
  "game/mobile/mobile.css",
  "game/mobile/touch.js",
];
const TREES = ["game/assets", "game/css", "game/js", "app/icons"];
const EXTRA_FILES = [
  ["installers/THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ["LICENSE", "licenses/MIT-FUMIGA.txt"],
  ["installers/android/app/src/main/assets/licenses/MPL-2.0.txt", "licenses/MPL-2.0.txt"],
];

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else if (entry.isFile()) fs.copyFileSync(src, dest);
  }
}

let copied = 0;
for (const target of TARGETS) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const rel of FILES) {
    const to = path.join(target, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), to);
    copied++;
  }
  for (const rel of TREES) {
    copyTree(path.join(ROOT, rel), path.join(target, rel));
  }
  for (const [source, destination] of EXTRA_FILES) {
    const to = path.join(target, destination);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(ROOT, source), to);
  }
  const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, entry) =>
    n + (entry.isDirectory() ? files(path.join(dir, entry.name)) : 1), 0);
  const count = files(target);
  console.log(`${path.relative(ROOT, target)}: ${count} arquivos runtime`);
}
console.log("Assets nativos sincronizados (" + copied + " páginas copiadas em cada destino).");
