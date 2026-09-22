// Fase 2: VFX lore das 11 castas — orçamento de partículas, aura/lore/ícone,
// cristal de memória e robustez do dispatch. Node puro (sem navegador).
// Uso: node test/lorevfx.mjs
import assert from 'node:assert/strict';

// stubs mínimos: lore_vfx -> lore_hud -> font tocam em document/Image
globalThis.document = {
  createElement() {
    return { width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => ({}), set: () => true }) };
  },
};
globalThis.Image = class {
  set src(v) { this._src = v; queueMicrotask(() => this.onerror && this.onerror()); }
};

const { G } = await import('../js/state.js');
const parts = await import('../js/particles.js');
const { ANT_VFX, triggerAntVFX, spawnMemoryCrystal } = await import('../js/lore_vfx.js');

// --- 11 castas, todas com aura hex, lore e ícone -----------------------------
assert.equal(Object.keys(ANT_VFX).length, 11, 'precisa ter as 11 castas');
for (const [k, v] of Object.entries(ANT_VFX)) {
  assert.match(v.aura, /^#[0-9a-f]{6}$/i, `aura da casta ${k}`);
  assert.ok(v.lore && v.lore.length > 8, `lore da casta ${k}`);
  assert.ok(v.icon, `ícone da casta ${k}`);
}

const ant = { x: 100, y: 100, bodyR: 10, angle: 0 };
const target = { x: 120, y: 100 };

// --- orçamento: 10 ataques de DINOPONERA no MESMO frame ≤ 30 partículas -----
parts.clearParticles();
G.time = 10;
for (let i = 0; i < 10; i++) triggerAntVFX('giant', 'attack', ant, target);
const noMesmoFrame = parts.counts();
assert.ok(noMesmoFrame > 0, 'VFX gigante gera partículas');
assert.ok(noMesmoFrame <= 30, `orçamento de 30 partículas por frame (gerou ${noMesmoFrame})`);

// --- orçamento reseta no frame seguinte -------------------------------------
parts.clearParticles();
G.time = 10 + 1 / 60;
triggerAntVFX('healer', 'heal', ant, target);
assert.ok(parts.counts() > 0, 'cura da MATABELE gera partículas');

// --- cada evento dispara sem erro para todas as castas ----------------------
for (const k of Object.keys(ANT_VFX)) {
  G.time += 1; // isola o throttle de som/budget
  parts.clearParticles();
  triggerAntVFX(k, 'gather', ant, target);
  triggerAntVFX(k, 'carry', ant, target);
  triggerAntVFX(k, 'scout', ant, target);
  triggerAntVFX(k, 'attack', ant, target);
  triggerAntVFX(k, 'guard', ant, target);
  triggerAntVFX(k, 'heal', ant, target);
  triggerAntVFX(k, 'weave', ant, target);
  assert.ok(parts.counts() <= 30, `orçamento respeitado para ${k}`);
}

// --- cristal de memória geométrico -------------------------------------------
parts.clearParticles();
G.time += 1;
spawnMemoryCrystal(50, 50, true);
const cristal = parts.counts();
assert.ok(cristal > 0 && cristal <= 30, `cristal de memória dentro do orçamento (gerou ${cristal})`);

// --- despachos desconhecidos não quebram -------------------------------------
triggerAntVFX('giant', 'evento-que-nao-existe', ant);
triggerAntVFX('casta-que-nao-existe', 'attack', ant);
triggerAntVFX(null, null, null);

console.log('lorevfx OK — 11 castas, aura+partícula+som, orçamento ≤30 partículas/frame');
