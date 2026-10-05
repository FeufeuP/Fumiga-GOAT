// Arte das cutscenes HQ (Noite Branca): cada camada listada em `layers` existe,
// já vem no tamanho desenhado (320×180, ampliada 3× sem suavização) e tem
// TRANSPARÊNCIA DE VERDADE — nada de xadrez "de transparência" pintado.
// Uso: node game/test/cutscene-art.mjs
//
// Regressão que motivou este teste (2026-10-02): 8 das 11 camadas eram RGB com
// um xadrez claro/escuro desenhado no lugar do alfa. No jogo, a moldura cobria
// o painel 1 inteiro com xadrez cinza e o céu do painel 2 sumia atrás do xadrez
// branco. Os PNGs tinham 1672×941 (32,6 MB) e eram reduzidos ao carregar.
// O conserto é tools/fix_noite_branca.py (reexecutável a partir dos originais).
// Painel 3 (2026-10-04): arte nova em fundo preto liso; a Pálida, a névoa e as
// partículas são quase todas translúcidas, com poucos brilhos brancos opacos
// (olhos, ciscos) — legítimos. Por isso o xadrez é medido como BLOCO de
// cinza-claro opaco (pixel com 3+ vizinhos iguais): nas camadas boas o máximo
// é 19 px; nas antigas com xadrez pintado eram 24 mil a 44 mil.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { getCutsceneDefs } from "../js/cutscenes.js";

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 320, H = 180, MAX_BYTES = 1024 * 1024;

/** PNG 8 bits sem entrelaçamento -> { w, h, type, rgba? } (só zlib, sem libs). */
function readPng(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString("latin1", 1, 4), "PNG", file + ": não é PNG");
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], type = buf[25];
  assert.equal(depth, 8, file + ": 8 bits por canal");
  assert.equal(buf[28], 0, file + ": sem entrelaçamento");
  const idat = [];
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off);
    if (buf.toString("latin1", off + 4, off + 8) === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = type === 6 ? 4 : 3, stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0;
      const b = y ? px[dst - stride + x] : 0;
      const c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[dst + x] = v & 255;
    }
  }
  return { w, h, type, px, bpp };
}

let checked = 0, totalBytes = 0;
for (const def of Object.values(getCutsceneDefs())) {
  for (const panel of def.panels) {
    if (!panel.layers) continue;
    const dir = path.join(GAME, "assets", "cutscenes", def.id, panel.assetPanel || panel.id);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
    // Exatamente as camadas listadas: nem faltando, nem arquivo órfão baixado à toa.
    assert.deepEqual(files.map((f) => Number(f.split("_")[0])), [...panel.layers].sort((a, b) => a - b),
      `${def.id}/${panel.id}: arquivos = camadas listadas em layers`);
    for (const f of files) {
      const file = path.join(dir, f), tag = `${def.id}/${panel.assetPanel || panel.id}/${f}`;
      totalBytes += fs.statSync(file).size;
      const { w, h, type, px, bpp } = readPng(file);
      assert.deepEqual([w, h], [W, H], tag + ": já no tamanho desenhado (320×180)");
      if (f.startsWith("0_")) { checked++; continue; }   // céu: opaco por definição
      assert.equal(type, 6, tag + ": RGBA (camada sobreposta precisa de alfa)");
      let clear = 0;
      const gray = new Uint8Array(w * h);   // cinza-claro opaco: tom de xadrez de transparência
      for (let i = 0, p = 0; i < px.length; i += bpp, p++) {
        const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
        if (a === 0) { clear++; continue; }
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (a === 255 && mn >= 200 && mx - mn <= 8) gray[p] = 1;
      }
      let block = 0;   // xadrez forma blocos; brilho de olho/cisco fica solto
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!gray[y * w + x]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if ((dx || dy) && yy >= 0 && yy < h && xx >= 0 && xx < w) n += gray[yy * w + xx];
        }
        if (n >= 3) block++;
      }
      assert.ok(clear / (w * h) >= 0.3, `${tag}: transparência real (${(100 * clear / (w * h)).toFixed(1)}% vazado)`);
      assert.ok(block <= 0.005 * w * h, `${tag}: sem xadrez pintado (${block} px cinza-claro em bloco)`);
      checked++;
    }
  }
}
assert.ok(checked >= 12, "camadas da Noite Branca verificadas (4 + 4 + 4 — igualdade, decisão 2026-10-05): " + checked);
assert.ok(totalBytes < MAX_BYTES, `peso total das camadas < 1 MB (${(totalBytes / 1024).toFixed(0)} KB)`);
console.log(`cutscene-art OK — ${checked} camadas 320×180, ${(totalBytes / 1024).toFixed(0)} KB`);
