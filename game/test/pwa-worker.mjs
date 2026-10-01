// Executa o sw.js real em VM; caches persistem entre instâncias do worker.
// Rede/quota controladas, escopo / e /Fumiga-GOAT/, operações do cliente reais.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function environment(path) {
  const base = 'https://fumiga.example' + path;
  const state = { version: 'v1', offline: false, failVersion: null, failPath: null, quota: null, calls: [], windows: new Map() };
  const list = version => ({ version, grupos: [
    { id: 'shell', files: ['index.html', 'game/index.html', 'game/mobile/index.html', 'game/js/main.js', 'app/offline.js'], tamanhos: [1,1,1,1,1], bytes: 5 },
    { id: 'essencial', files: ['game/assets/a.png', 'game/assets/b.png'], tamanhos: [1,1], bytes: 2 },
    { id: 'completo', files: ['game/assets/gallery.png'], tamanhos: [1], bytes: 1 },
  ] });
  const url = input => new URL(typeof input === 'string' ? input : input.url, base).href;
  const plain = input => { const u = new URL(url(input)); u.search = ''; return u.href; };
  class Cache {
    constructor(name) { this.name = name; this.entries = new Map(); }
    async put(key, response) {
      if (state.quota === this.name) throw new Error('quota simulada');
      // Lê o corpo antes de gravar, como Cache.put: não confirma download truncado.
      const clone = response.clone(); await clone.arrayBuffer();
      this.entries.set(url(key), response.clone());
    }
    async match(key, opts = {}) {
      const found = opts.ignoreSearch
        ? [...this.entries].find(([k]) => plain(k) === plain(key))?.[1] : this.entries.get(url(key));
      return found?.clone();
    }
    async keys() { return [...this.entries.keys()].map(k => ({ url: k })); }
    async delete(key) { return this.entries.delete(url(key)); }
  }
  const saved = new Map();
  const caches = {
    async keys() { return [...saved.keys()]; },
    async open(name) { if (!saved.has(name)) saved.set(name, new Cache(name)); return saved.get(name); },
    async delete(name) { return saved.delete(name); },
  };
  async function fetch(input) {
    const u = new URL(url(input)); state.calls.push(u.href);
    if (state.offline || (state.failVersion && u.searchParams.get('v') === state.failVersion)
        || (state.failPath && u.pathname.endsWith(state.failPath))) throw new Error('rede simulada');
    if (u.pathname.endsWith('/app/assets.json')) return new Response(JSON.stringify(list(state.version)), { headers: { 'Content-Type': 'application/json' } });
    return new Response('snapshot:' + state.version + ':' + u.pathname);
  }
  function worker() {
    const handlers = new Map();
    const self = {
      registration: { scope: base }, location: { href: base + 'sw.js', origin: new URL(base).origin },
      addEventListener: (name, fn) => handlers.set(name, fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [...state.windows.values()] },
    };
    vm.runInNewContext(source, { self, caches, fetch, URL, Response, Request, Headers, console, setTimeout, clearTimeout }, { filename: 'sw.js' });
    async function dispatch(name, fields = {}) {
      const waits = [], replies = [];
      const event = { ...fields, waitUntil: p => waits.push(Promise.resolve(p)), respondWith: p => { event.response = Promise.resolve(p); } };
      if (name === 'message') event.source = { postMessage: m => replies.push(m) };
      handlers.get(name)(event);
      const response = event.response && await event.response;
      for (let i = 0; i < waits.length;) { const batch = waits.slice(i); i = waits.length; await Promise.all(batch); }
      return { response, replies };
    }
    return {
      install: () => dispatch('install'), activate: () => dispatch('activate'),
      async message(data) { const r = await dispatch('message', { data: { requestId: 'req-' + state.calls.length, ...data } }); return r.replies; },
      async get(rel, id = 'old', navigate = false) {
        if (navigate) state.windows.set(id, { id, url: base + rel });
        return (await dispatch('fetch', { request: { method: 'GET', url: url(rel), mode: navigate ? 'navigate' : 'cors' }, clientId: navigate ? '' : id, resultingClientId: navigate ? id : '' })).response;
      },
    };
  }
  const urls = (version, complete = false) => list(version).grupos.filter(g => complete || g.id !== 'completo').flatMap(g => g.files.map(f => new URL(f + '?v=' + version, base).href));
  const download = async (w, version, complete = false) => (await w.message({ type: 'baixar', versao: version, lista: list(version), urls: urls(version, complete) })).at(-1);
  const current = async w => (await w.message({ type: 'versao' })).at(-1).versao;
  return { state, base, list, caches, fetch, worker, download, current };
}

for (const path of ['/', '/Fumiga-GOAT/']) {
  const env = environment(path), { state, caches, base } = env;
  let w = env.worker();
  await w.install(); await w.activate();
  assert.equal(await env.current(w), 'v1');
  let r = await env.download(w, 'v1');
  assert.equal(r.type, 'fim'); assert.equal(r.feitos, 7); assert.equal(r.falhas, 0);
  assert.ok(r.requestId); assert.equal(r.protocol, 2);
  assert.match(await (await w.get('', 'old', true)).text(), /snapshot:v1:/);
  state.offline = true;
  w = env.worker(); // encerra/reinicia: nenhuma variável global é reaproveitada
  for (const rel of ['', 'game/', 'game/mobile/']) {
    assert.equal((await w.get(rel, 'offline-' + rel, true)).status, 200);
  }
  assert.equal(await env.current(w), 'v1');
  // Migra cache legado: não havia controle nem marcador de versão pronta.
  await caches.delete('fumiga-controle');
  await (await caches.open('fumiga-v1')).delete(base + '__fumiga__/pronta');
  w = env.worker(); assert.equal(await env.current(w), 'v1'); await w.activate();

  state.offline = false; state.version = 'v2'; state.failVersion = 'v2';
  r = await env.download(w, 'v2');
  assert.equal(r.type, 'fim'); assert.equal(r.feitos, 0); assert.equal(r.falhas, 7);
  assert.equal(await env.current(w), 'v1');
  assert.ok((await caches.keys()).includes('fumiga-v1'));
  state.failVersion = null; state.failPath = '/game/assets/b.png';
  r = await env.download(w, 'v2'); assert.equal(r.falhas, 1);
  // Mesmo com o shell da v2 inteiro, staging não pode virar fallback após
  // perder o registro de controle; a cópia anterior continua preferida.
  await caches.delete('fumiga-controle'); state.offline = true;
  w = env.worker(); assert.equal(await env.current(w), 'v1');
  assert.match(await (await w.get('game/js/main.js', 'old')).text(), /snapshot:v1:/);

  state.offline = false; state.failPath = null; state.version = 'v3'; state.quota = 'fumiga-v3';
  r = await env.download(w, 'v3'); assert.equal(r.type, 'erro');
  assert.equal(await env.current(w), 'v1');
  assert.ok(await (await caches.open('fumiga-v1')).match(base + 'game/js/main.js', { ignoreSearch: true }));
  state.quota = null; state.version = 'v2';
  r = await env.download(w, 'v2'); assert.equal(r.feitos, 7); assert.equal(r.falhas, 0);
  assert.ok(r.novos < 7, 'retoma arquivos da tentativa interrompida');
  assert.equal(await env.current(w), 'v2');
  assert.ok((await caches.keys()).includes('fumiga-v1'));
  assert.match(await (await w.get('game/js/main.js', 'old')).text(), /snapshot:v1:/, 'aba antiga não mistura módulos novos');
  assert.match(await (await w.get('', 'new', true)).text(), /snapshot:v2:/);
  const bad = (await w.message({ type: 'baixar', versao: 'v2', lista: env.list('v2'), urls: ['https://evil.example/file'] })).at(-1);
  assert.equal(bad.type, 'erro');

  // Atualização automática só promove com os pacotes anteriores verificados.
  state.version = 'v3'; state.failPath = '/game/assets/b.png';
  await w.get('', 'refresh', true);
  assert.equal(await env.current(w), 'v2');
  state.failPath = null;
  await w.get('', 'refresh2', true); assert.equal(await env.current(w), 'v3');
  assert.ok(await (await caches.open('fumiga-v3')).match(base + 'game/assets/b.png', { ignoreSearch: true }));
  await env.download(w, 'v3', true);
  state.version = 'v4'; await w.get('', 'refresh3', true);
  assert.equal(await env.current(w), 'v4');
  assert.ok(await (await caches.open('fumiga-v4')).match(base + 'game/assets/gallery.png', { ignoreSearch: true }), 'preserva pacote completo na atualização automática');
  // Afinidade por cliente persiste também quando o worker é retomado offline.
  state.offline = true; w = env.worker();
  assert.match(await (await w.get('game/js/main.js', 'old')).text(), /snapshot:v1:/);
  assert.equal(await env.current(w), 'v4');
  assert.equal((await env.download(w, 'v1')).falhas, 0);
  assert.equal(await env.current(w), 'v4', 'download de aba antiga não faz downgrade da versão ativa');
  await caches.open('outro-app');
  const cleared = (await w.message({ type: 'limpar' })).at(-1);
  assert.equal(cleared.type, 'limpo'); assert.deepEqual(await caches.keys(), ['outro-app']);
  console.log('ok worker ' + path + ': restart offline, legado, staging, rede, quota, retomada, snapshots, pacotes e limpeza');
}

// --- Cliente real: timeout/rejeição, IDs, concorrência e sucesso verificado ---
const env = environment('/');
globalThis.caches = env.caches;
globalThis.document = { baseURI: env.base };
const listeners = new Set();
let behavior = () => {};
const target = { postMessage: m => behavior(m) };
const sw = { controller: target, ready: Promise.resolve({ active: target }),
  addEventListener: (type, fn) => listeners.add(fn), removeEventListener: (type, fn) => listeners.delete(fn) };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: sw } });
const O = await import('../../app/offline.js');
const emit = (m, id, protocol = 2) => { for (const fn of [...listeners]) fn({ data: { ...m, requestId: id, protocol }, source: target }); };
await assert.rejects(O.mensagemSW({ type: 'baixar' }, { timeout: 15 }), /tempo/);
assert.equal(listeners.size, 0, 'timeout remove listeners');
behavior = m => queueMicrotask(() => {
  emit({ type: 'versao', versao: 'consulta' }, m.requestId);
  emit({ type: 'progresso', feitos: 999 }, 'id-de-outra-operação');
  emit({ type: m.type === 'baixar' ? 'fim' : 'versao', feitos: 7, falhas: 0, total: 7, versao: 'v1' }, m.requestId);
});
let progresses = 0;
const [dl, info] = await Promise.all([
  O.mensagemSW({ type: 'baixar' }, { timeout: 100, aoProgresso: () => progresses++ }),
  O.mensagemSW({ type: 'versao' }, { timeout: 100 }),
]);
assert.equal(dl.type, 'fim'); assert.equal(info.type, 'versao'); assert.equal(progresses, 0);
assert.equal(listeners.size, 0);
// Worker mentiroso não transforma cache vazio em "pronto".
const real = await O.baixarPacote({ lista: env.list('v1'), timeout: 100 });
assert.equal(real.feitos, 0); assert.equal(real.falhas, 7);
behavior = m => queueMicrotask(() => emit({ type: 'erro', message: 'quota' }, m.requestId));
await assert.rejects(O.baixarPacote({ lista: env.list('v1'), timeout: 100 }), /quota/);
behavior = m => queueMicrotask(() => emit({ type: 'fim', feitos: 8, falhas: -1, total: 7 }, m.requestId));
await assert.rejects(O.baixarPacote({ lista: env.list('v1'), timeout: 100 }), /inválida/);
behavior = () => {};
await assert.rejects(O.baixarPacote({ lista: env.list('v1'), timeout: 15 }), /tempo/);
assert.equal(listeners.size, 0);
console.log('PWA WORKER OK — restart, rollback, quota, afinidade, timeout, correlação e confirmação pelo cache');
